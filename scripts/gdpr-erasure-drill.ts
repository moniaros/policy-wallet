/**
 * GDPR first-erasure drill (runbook §8, docs/compliance/DSR_OPERATOR_RUNBOOK_*).
 * Provisions a throwaway user with the full PII footprint (auth identity,
 * health profile, policy + storage PDF, B2B relationship, form submission,
 * export snapshot, consent row), runs the REAL erasure engine against it, and
 * verifies every surface. Cleans up after itself. REFUSES to run against prod.
 *
 * Run: set -a; source .env.local; set +a; \
 *      export DATABASE_URL=... DIRECT_URL=...   # pooler override if direct host is unreachable
 *      npx tsx scripts/gdpr-erasure-drill.ts
 */

import { db } from "../lib/db"
import { createAdminClient } from "../lib/supabase/admin"
import { eraseUserData } from "../lib/services/gdpr-erasure.service"

const PROD_REF = "cquudefwfwrmvpftuhyl"

const checks: Array<{ name: string; ok: boolean; detail?: string }> = []
function check(name: string, ok: boolean, detail?: string) {
    checks.push({ name, ok, detail })
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`)
}

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    if (supabaseUrl.includes(PROD_REF)) {
        throw new Error("Refusing to run the erasure drill against PRODUCTION Supabase.")
    }
    console.log(`Drill target: ${supabaseUrl}`)

    const stamp = Date.now()
    const email = `gdpr-drill-${stamp}@example.com`
    const admin = createAdminClient()

    // ── Provision ────────────────────────────────────────────────────────────
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: `Drill-${stamp}!x`,
        email_confirm: true,
    })
    if (authErr || !authUser?.user) throw new Error(`auth createUser failed: ${authErr?.message}`)

    const user = await db.user.create({
        data: {
            email,
            name: "Drill Subject",
            phoneNumber: "+30 690 000 0000",
            taxId: "123456783",
            roles: "policyholder",
            policyholderProfile: {
                create: {
                    gender: "female",
                    dateOfBirth: new Date("1980-01-01"),
                    chronicConditions: ["diabetes"],
                    smokingStatus: "non_smoker",
                    annualIncome: 30000,
                },
            },
        },
    })
    const agent = await db.user.create({
        data: { email: `gdpr-drill-agent-${stamp}@example.com`, name: "Drill Agent", roles: "agent" },
    })
    const relationship = await db.customerRelationship.create({
        data: { agentUserId: agent.id, policyholderUserId: user.id, status: "active" },
    })

    const objectKey = `${user.id}/drill-${stamp}.pdf`
    const pdf = Buffer.from("%PDF-1.4\n%…drill…\n%%EOF\n")
    const { error: upErr } = await admin.storage.from("policies").upload(objectKey, pdf, {
        contentType: "application/pdf",
    })
    if (upErr) throw new Error(`storage upload failed: ${upErr.message}`)
    const { data: pub } = admin.storage.from("policies").getPublicUrl(objectKey)

    const policy = await db.policy.create({
        data: {
            ownerUserId: user.id,
            createdByUserId: user.id,
            policyNumber: `DRILL-${stamp}`,
            insurerName: "Drill Insurer",
            lineOfBusiness: "motor",
            status: "active",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2027-01-01"),
            documents: {
                create: {
                    uploadedByUserId: user.id,
                    fileName: "drill.pdf",
                    fileUrl: pub.publicUrl,
                    fileSize: pdf.length,
                    source: "drill",
                },
            },
        },
    })
    await db.formSubmission.create({
        data: { formType: "contact", email, name: "Drill Subject", message: "hello", ipAddress: "203.0.113.7" },
    })
    await db.dataExportRequest.create({
        data: { userId: user.id, status: "completed", payloadJson: { email }, downloadToken: `tok${stamp}`, expiresAt: new Date() },
    })
    await db.consentAudit.create({
        data: { userId: user.id, consentType: "terms", policyVersion: "drill", locale: "el", source: "drill", ipAddress: "203.0.113.7" },
    })
    const request = await db.deletionRequest.create({
        data: { userId: user.id, status: "approved", legalBasis: "DRILL" },
    })
    console.log(`Provisioned drill user ${user.id} (${email}), request ${request.id}`)

    // ── Execute the real engine ──────────────────────────────────────────────
    const summary = await eraseUserData(user.id)
    console.log("Erasure summary:", JSON.stringify(summary))

    // ── Verify ───────────────────────────────────────────────────────────────
    const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    check("Supabase auth identity deleted", !authList?.users.some((u) => u.email === email))

    const { data: files } = await admin.storage.from("policies").list(user.id)
    check("Storage PDF deleted", !files?.some((f) => objectKey.endsWith(f.name)))

    const erased = await db.user.findUnique({ where: { id: user.id }, include: { policyholderProfile: true } })
    check("User email anonymized", !!erased && erased.email.endsWith("@deleted.policywallet.local"))
    check("taxId cleared", erased?.taxId === null)
    check("phone cleared", erased?.phoneNumber === null)
    check("health profile scrubbed", erased?.policyholderProfile?.chronicConditions === null && erased?.policyholderProfile?.gender === null)

    check("policy deleted", (await db.policy.findUnique({ where: { id: policy.id } })) === null)
    const rel = await db.customerRelationship.findUnique({ where: { id: relationship.id } })
    check("relationship terminated", rel?.status === "terminated")
    check("form submission deleted", (await db.formSubmission.count({ where: { email } })) === 0)
    const exp = await db.dataExportRequest.findFirst({ where: { userId: user.id } })
    check("export payload purged", exp != null && exp.payloadJson === null && exp.downloadToken === null)
    const consent = await db.consentAudit.findFirst({ where: { userId: user.id } })
    check("consent row kept, ip scrubbed", consent != null && consent.ipAddress === null)
    check("brevo/stripe no-ops reported", summary.brevoContactDeleted === false && summary.stripeSubscriptionsCancelled === 0)

    // Idempotency: run it again.
    const rerun = await eraseUserData(user.id)
    check("re-run is safe (idempotent)", rerun.deletedPolicies === 0 && rerun.authUserDeleted === false)

    // ── Cleanup ──────────────────────────────────────────────────────────────
    await db.deletionRequest.deleteMany({ where: { userId: user.id } })
    await db.dataExportRequest.deleteMany({ where: { userId: user.id } })
    await db.consentAudit.deleteMany({ where: { userId: user.id } })
    await db.customerRelationship.deleteMany({ where: { policyholderUserId: user.id } })
    await db.user.delete({ where: { id: user.id } })
    await db.user.delete({ where: { id: agent.id } })
    console.log("Cleanup complete.")

    const failed = checks.filter((c) => !c.ok)
    console.log(`\nDRILL ${failed.length === 0 ? "PASSED" : "FAILED"} — ${checks.length - failed.length}/${checks.length} checks green`)
    if (failed.length > 0) process.exit(1)
}

main()
    .catch((error) => {
        console.error("Drill failed:", error)
        process.exit(1)
    })
    .finally(() => db.$disconnect())
