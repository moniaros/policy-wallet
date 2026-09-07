import { hasPasswordCredential, passwordPresence } from "@/lib/services/credential-signals"
import { requireApiUser } from '@/lib/api-auth'
import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'
import { emailDomain, emailFingerprint } from '@/lib/observability/pii'
import { z } from 'zod'
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"
import { normalizeEmail } from "@/lib/identity/normalize-email"
import {
    agentTaxIdSchema,
    customerContactRule,
    customerEmailIdentity,
    optionalAgentEmailSchema,
} from "@/lib/validations/agent-intake"
import { ENDED_RELATIONSHIP_STATUSES } from "@/lib/agent-visibility"
import { isPhantomCustomer } from "@/lib/agent-consent"

const customerImportSchema = z
    .object({
        // Trim + lowercase + NFC through the ONE normaliser auth uses, then the
        // format check — `John@X.gr` and `john@x.gr` must be the same person.
        // Optional under decision D3: a row with no email imports on a valid
        // ΑΦΜ + Greek mobile (customerContactRule), the same rule as the
        // single-customer doors.
        email: optionalAgentEmailSchema,
        name: z.string().trim().min(1).max(120),
        // zod 4 rejects '' under min(1): a CSV without a surname column used to
        // fail every row with VALIDATION_ERROR.
        surname: z.string().trim().max(120).optional().default(''),
        phone: z.string().trim().max(32).optional(),
        // Same normaliser + Greek ΑΦΜ checksum as the single-customer schemas.
        // The CSV parser already carried the column; the schema silently dropped it.
        taxId: agentTaxIdSchema,
    })
    .superRefine(customerContactRule)

const bulkImportSchema = z.object({
    customers: z.array(customerImportSchema).min(1),
})

/** Writes go to the database in batches of this many rows. */
const CHUNK_SIZE = 50

type RowOutcome = {
    /** 1-based position in the submitted file. */
    row: number
    email: string
    status: 'imported' | 'skipped' | 'failed'
    code: 'CREATED' | 'LINKED' | 'ALREADY_LINKED' | 'RELATIONSHIP_ENDED' | 'DUPLICATE_IN_FILE' | 'WRITE_FAILED'
}

export async function POST(req: Request) {
    const authCheck = await requireApiUser({ roles: ["agent", "admin"] })
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth
    const agentId = authResult.dbUser.id

    // Throttle mass-attach per agent — without this an agent could enumerate/
    // attach the whole user base by email. Independent of the global /api limit.
    const limitCheck = await rateLimit(
        agentId,
        5,
        60_000,
        `bulk-import:${agentId}`
    )
    if (!limitCheck.success && limitCheck.error) return limitCheck.error

    try {
        const { customers } = bulkImportSchema.parse(await req.json())

        // Check bulk import limit
        const { resolveAgentEntitlements } = await import("@/lib/subscription-entitlements")
        const agentEntitlements = await resolveAgentEntitlements(agentId)
        const bulkLimit = agentEntitlements.limits.bulkImportLimit
        if (bulkLimit !== null && customers.length > bulkLimit) {
            // Distinct code, and the numbers in `details` — the client cannot
            // localize "limited to 25 rows" from a prose string.
            return createApiError(
                "BULK_IMPORT_ROW_LIMIT",
                `Bulk import limited to ${bulkLimit} rows on your plan.`,
                403,
                { limit: bulkLimit, submitted: customers.length }
            )
        }

        // Check customer limit — accounting for the WHOLE batch, not just the
        // current count. Without this, an agent at 95/100 could import 50 rows
        // (the up-front check only saw 95 < 100) and end up at 145.
        const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
        const customerCheck = await canAgentAddCustomer(agentId)
        if (!customerCheck.allowed) {
            return createApiError(
                "CUSTOMER_LIMIT_REACHED",
                `Customer limit reached (${customerCheck.current}/${customerCheck.limit}).`,
                403,
                { current: customerCheck.current, limit: customerCheck.limit }
            )
        }

        // ── Resolve the whole file up front: one lookup per table, not per row ──
        // The same normaliser the schema applied, restated on the key the
        // lookups and writes actually use.
        const rows = customers.map((customer, index) => {
            // A row with no email is keyed on the synthetic address its ΑΦΜ
            // derives (customerContactRule guaranteed the ΑΦΜ + mobile).
            const contact = customerEmailIdentity(customer)
            return {
                row: index + 1,
                email: normalizeEmail(contact.email),
                contactEmailMissing: contact.contactEmailMissing,
                name: `${customer.name} ${customer.surname}`.trim(),
                phone: customer.phone || null,
                taxId: customer.taxId ?? null,
            }
        })
        const emails = [...new Set(rows.map((r) => r.email))]

        // password / emailVerified / taxId decide whether an ΑΦΜ in the file
        // may be written onto an EXISTING account — same rule as
        // customer.service createCustomer: only onto a phantom (no password,
        // never verified) that has none. An activated account's tax id is the
        // customer's to set.
        const existingUsers = await db.user.findMany({
            where: { email: { in: emails } },
            select: { id: true, email: true, emailVerified: true, taxId: true },
        })
        const userIdByEmail = new Map(existingUsers.map((u) => [normalizeEmail(u.email), u.id]))
        const credentialPresence = await passwordPresence(db, existingUsers.map((u) => u.id))
        const taxIdBackfillable = new Set(
            existingUsers
                .filter((u) => !u.taxId && isPhantomCustomer({ hasPassword: credentialPresence.has(u.id), emailVerified: u.emailVerified ?? null }))
                .map((u) => u.id)
        )

        const existingRelationships = existingUsers.length
            ? await db.customerRelationship.findMany({
                where: { agentUserId: agentId, policyholderUserId: { in: existingUsers.map((u) => u.id) } },
                select: { policyholderUserId: true, status: true },
            })
            : []
        const relationshipStatusByUserId = new Map(
            existingRelationships.map((r) => [r.policyholderUserId, r.status])
        )

        // Only rows that aren't already this agent's customers consume headroom.
        if (customerCheck.limit != null && customerCheck.current != null) {
            const newCount = emails.filter((email) => {
                const userId = userIdByEmail.get(email)
                return !userId || !relationshipStatusByUserId.has(userId)
            }).length
            const headroom = customerCheck.limit - customerCheck.current
            if (newCount > headroom) {
                return createApiError(
                    "CUSTOMER_HEADROOM_EXCEEDED",
                    `This import adds ${newCount} new customers but only ${Math.max(0, headroom)} slots remain on your plan.`,
                    403,
                    { adding: newCount, headroom: Math.max(0, headroom), current: customerCheck.current, limit: customerCheck.limit }
                )
            }
        }

        // ── Classify every row, then write the writable ones in chunks ──
        const outcomes: RowOutcome[] = []
        const seenInFile = new Set<string>()
        type Pending = {
            row: number
            email: string
            contactEmailMissing: boolean
            name: string
            phone: string | null
            taxId: string | null
            userId: string | null
        }
        const pending: Pending[] = []

        for (const r of rows) {
            if (seenInFile.has(r.email)) {
                outcomes.push({ row: r.row, email: r.email, status: 'skipped', code: 'DUPLICATE_IN_FILE' })
                continue
            }
            seenInFile.add(r.email)

            const userId = userIdByEmail.get(r.email) ?? null
            const relStatus = userId ? relationshipStatusByUserId.get(userId) : undefined
            if (relStatus !== undefined) {
                // NEVER touch an existing relationship — a re-imported CSV row
                // used to downgrade an already active/invited customer. An
                // ended one is not re-opened either: only the customer can.
                const ended = (ENDED_RELATIONSHIP_STATUSES as readonly string[]).includes(relStatus)
                outcomes.push({ row: r.row, email: r.email, status: 'skipped', code: ended ? 'RELATIONSHIP_ENDED' : 'ALREADY_LINKED' })
                continue
            }
            pending.push({ ...r, userId })
        }

        for (let start = 0; start < pending.length; start += CHUNK_SIZE) {
            const chunk = pending.slice(start, start + CHUNK_SIZE)
            try {
                await db.$transaction(async (tx) => {
                    const toCreate = chunk.filter((p) => !p.userId)
                    if (toCreate.length > 0) {
                        const created = await tx.user.createManyAndReturn({
                            data: toCreate.map((p) => ({
                                email: p.email,
                                contactEmailMissing: p.contactEmailMissing,
                                name: p.name,
                                phoneNumber: p.phone,
                                taxId: p.taxId,
                                roles: 'policyholder',
                            })),
                            select: { id: true, email: true },
                        })
                        // The same shape createCustomer gives a phantom
                        // (customer.service: `policyholderProfile: { create: {} }`).
                        // createMany cannot nest a relation, so the profiles land
                        // as a second write in the SAME transaction — an imported
                        // customer used to have no profile row at all, and every
                        // read that joins on it (risk wizard, exports) saw nothing.
                        await tx.policyholderProfile.createMany({
                            data: created.map((u) => ({ userId: u.id })),
                            skipDuplicates: true,
                        })
                        for (const u of created) {
                            const p = chunk.find((c) => c.email === normalizeEmail(u.email))
                            if (p) p.userId = u.id
                        }
                    }
                    // ΑΦΜ backfill onto EXISTING phantoms only (see the select
                    // above); an activated account keeps whatever it has.
                    for (const p of chunk) {
                        if (!p.taxId || !p.userId || !taxIdBackfillable.has(p.userId)) continue
                        await tx.user.update({ where: { id: p.userId }, data: { taxId: p.taxId } })
                    }
                    // Imported customers start where every agent-added customer
                    // starts: PENDING, not yet invited. 'inactive' is an ENDED
                    // status (lib/agent-visibility.ts) — rows created with it
                    // were invisible and nobody could upload for them.
                    await tx.customerRelationship.createMany({
                        data: chunk
                            .filter((p) => p.userId)
                            .map((p) => ({
                                agentUserId: agentId,
                                policyholderUserId: p.userId as string,
                                status: 'pending_activation',
                                activationStatus: 'not_invited',
                                lastInteractionAt: new Date(),
                            })),
                        skipDuplicates: true,
                    })
                })
                for (const p of chunk) {
                    outcomes.push({
                        row: p.row,
                        email: p.email,
                        status: 'imported',
                        code: userIdByEmail.has(p.email) ? 'LINKED' : 'CREATED',
                    })
                }
            } catch (error) {
                for (const p of chunk) {
                    Sentry.captureException(error, {
                        tags: {
                            endpoint: '/api/v1/customers/bulk-import',
                            // Fingerprint, not the address: a Sentry tag is indexed
                            // and searchable, and an imported customer never agreed
                            // to appear in our error tracker.
                            recipient: emailFingerprint(p.email),
                            recipient_domain: emailDomain(p.email)
                        }
                    })
                    outcomes.push({ row: p.row, email: p.email, status: 'failed', code: 'WRITE_FAILED' })
                }
            }
        }

        outcomes.sort((a, b) => a.row - b.row)
        const imported = outcomes.filter((o) => o.status === 'imported').length
        const failed = outcomes.filter((o) => o.status === 'failed')

        return createApiResponse({
            imported,
            skipped: outcomes.filter((o) => o.status === 'skipped').length,
            failed: failed.length,
            total: customers.length,
            outcomes,
            // Legacy shape the modal already reads.
            errors: failed.length > 0 ? failed.map((o) => `Failed to import ${o.email}`) : undefined
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid data", 400, error.issues)
        }
        Sentry.captureException(error, {
            tags: {
                endpoint: '/api/v1/customers/bulk-import',
                method: 'POST'
            }
        })

        return createApiError("INTERNAL_ERROR", "Failed to import customers", 500)
    }
}
