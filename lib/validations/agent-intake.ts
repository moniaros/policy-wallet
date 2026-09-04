/**
 * Input contracts for the agent intake actions (add customer, add / commit a
 * policy, invite). Parsed at the TOP of every action in
 * app/(protected)/agent/actions.ts that writes a Policy or a User —
 * `tests/unit/agent-action-input-validation.test.ts` enumerates those actions
 * from the source and fails one that skips the parse.
 *
 * Before this module the actions trusted their arguments: `new Date('')`
 * became an Invalid Date column, a NaN premium was stored as NaN, the line of
 * business was free text the taxonomy could not resolve, and an email with
 * no `@` created a phantom user nobody could ever sign up as.
 */
import { z } from "zod"

import { normalizeEmail } from "@/lib/identity/normalize-email"
import { isGreekMobile } from "@/lib/identity/phone"
import { isSyntheticNoEmailAddress, syntheticNoEmailAddress } from "@/lib/identity/synthetic-email"
import { isValidGreekAfm, normalizeTaxId } from "@/lib/identity/tax-id"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"

/** The shape every action returns when its input fails the contract. */
export const VALIDATION_ERROR = "VALIDATION_ERROR" as const

export type ValidationIssue = { path: string; code: string; message: string }

export type ValidationFailure = {
    success: false
    error: typeof VALIDATION_ERROR
    details: ValidationIssue[]
}

export function validationFailure(error: z.ZodError): ValidationFailure {
    return {
        success: false,
        error: VALIDATION_ERROR,
        details: error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            code: issue.code,
            message: issue.message,
        })),
    }
}

// ── Scalars ──────────────────────────────────────────────────────────

/**
 * Trimmed, lowercased, NFC — and it has to look like an address. The
 * synthetic no-email domain is refused here: it is minted by
 * `customerEmailIdentity` only, never typed by an agent.
 */
export const agentEmailSchema = z
    .string()
    .transform((value) => normalizeEmail(value))
    .pipe(
        z
            .string()
            .min(1)
            .max(254)
            .email()
            .refine((value) => !isSyntheticNoEmailAddress(value), "reserved_email"),
    )

/** The same address contract, with '' / whitespace / undefined meaning "not given". */
export const optionalAgentEmailSchema = z
    .string()
    .optional()
    .transform((value) => normalizeEmail(value) || undefined)
    .pipe(agentEmailSchema.optional())

/**
 * Greek ΑΦΜ, or a foreign VAT the existing normaliser tolerates.
 *
 * `normalizeTaxId` accepts 8–12 digits so a non-Greek customer's VAT is not
 * refused; a 9-digit value is a Greek ΑΦΜ by construction and must pass the
 * official mod-11 checksum (`isValidGreekAfm`) — a 9-digit string that fails
 * it is a typo, not a foreign number. Empty / whitespace means "not given".
 */
export const agentTaxIdSchema = z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
        if (!value) return undefined
        const normalized = normalizeTaxId(value)
        if (!normalized) {
            ctx.addIssue({ code: "custom", message: "invalid_tax_id" })
            return z.NEVER
        }
        if (normalized.length === 9 && !isValidGreekAfm(normalized)) {
            ctx.addIssue({ code: "custom", message: "invalid_afm_checksum" })
            return z.NEVER
        }
        return normalized
    })

const optionalTrimmed = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .transform((value) => (value ? value : undefined))

/**
 * `YYYY-MM-DD` (what a date input submits) or a full ISO datetime. Anything
 * `Date` cannot parse is refused here instead of becoming an Invalid Date
 * column that renders as "NaN days".
 */
export const isoDateSchema = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/, "invalid_date")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "invalid_date")

/** Premium in the policy's currency; zero is a legitimate value (free cover). */
export const premiumSchema = z.number().finite().min(0).max(10_000_000).optional()

export const lineOfBusinessSchema = z.enum(WRITE_BRANCH_IDS)

// ── Composite inputs ─────────────────────────────────────────────────

/**
 * A customer without an email (owner decision D3) is identified by a VALID
 * Greek ΑΦΜ (nine digits, mod-11 checksum — a foreign VAT is not enough)
 * plus a Greek mobile. Anything less is refused on the `email` path, so the
 * form marks the field the agent can actually fix.
 */
export function customerContactRule(
    value: { email?: string; phone?: string; taxId?: string },
    ctx: z.RefinementCtx,
): void {
    if (value.email) return
    const afmOk = Boolean(value.taxId && value.taxId.length === 9 && isValidGreekAfm(value.taxId))
    if (!afmOk || !isGreekMobile(value.phone)) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "contact_required" })
    }
}

/**
 * The email the User row is keyed on. A customer with no address gets the
 * synthetic, non-deliverable one and the flag every sender checks; the
 * ΑΦΜ is guaranteed valid here by `customerContactRule`.
 */
export function customerEmailIdentity(input: { email?: string; taxId?: string }): {
    email: string
    contactEmailMissing: boolean
} {
    if (input.email) return { email: input.email, contactEmailMissing: false }
    if (!input.taxId) throw new Error("customerEmailIdentity: no email and no ΑΦΜ — the input was not parsed")
    return { email: syntheticNoEmailAddress(input.taxId), contactEmailMissing: true }
}

/** The bare fields; the contact rule is applied on every composite that uses them. */
const AgentCustomerFields = z.object({
    name: z.string().trim().min(1).max(120),
    /** zod 4 rejects '' under min(1); a surname is genuinely optional. */
    surname: z.string().trim().max(120).optional().default(""),
    email: optionalAgentEmailSchema,
    phone: optionalTrimmed(32),
    taxId: agentTaxIdSchema,
})

export const AgentCustomerInput = AgentCustomerFields.superRefine(customerContactRule)
export type AgentCustomerInputData = z.infer<typeof AgentCustomerInput>

export const AgentPolicyInput = z
    .object({
        insurerName: z.string().trim().min(1).max(200),
        policyNumber: z.string().trim().min(1).max(100),
        lineOfBusiness: lineOfBusinessSchema,
        startDate: isoDateSchema,
        endDate: isoDateSchema,
        premiumAmount: premiumSchema,
        premiumCurrency: z
            .string()
            .trim()
            .regex(/^[A-Za-z]{3}$/)
            .transform((value) => value.toUpperCase())
            .optional(),
        carPlate: optionalTrimmed(20),
    })
    .refine((policy) => new Date(policy.endDate).getTime() > new Date(policy.startDate).getTime(), {
        path: ["endDate"],
        message: "end_before_start",
    })
export type AgentPolicyInputData = z.infer<typeof AgentPolicyInput>

/** addCustomerManually — a customer, optionally with their first policy. */
export const AddCustomerManuallyInput = AgentCustomerFields.extend({
    policy: AgentPolicyInput.optional(),
}).superRefine(customerContactRule)
export type AddCustomerManuallyInputData = z.infer<typeof AddCustomerManuallyInput>

/**
 * updateCustomerContact — a real address for a customer who had none. The
 * synthetic domain is refused by `agentEmailSchema` itself.
 */
export const UpdateCustomerContactInput = z.object({
    customerId: z.string().trim().min(1).max(64),
    email: agentEmailSchema,
})
export type UpdateCustomerContactInputData = z.infer<typeof UpdateCustomerContactInput>

/** addPolicyForCustomer — a policy for a customer the agent already has. */
export const AddPolicyForCustomerInput = z.object({
    customerId: z.string().trim().min(1).max(64),
    policy: AgentPolicyInput,
    attestedAiConsent: z.boolean().optional(),
    confirmDuplicate: z.boolean().optional(),
    /** The agent resolved the document gate's «confirm the type» hold on these same bytes. */
    branchConfirmed: z.boolean().optional(),
})
export type AddPolicyForCustomerInputData = z.infer<typeof AddPolicyForCustomerInput>

/** commitScannedPolicy — the resolution decision the agent made. */
export const CommitDecisionInput = z.discriminatedUnion("mode", [
    z.object({
        mode: z.literal("attach"),
        customerId: z.string().trim().min(1).max(64),
        taxId: agentTaxIdSchema,
    }),
    z.object({
        mode: z.literal("create_new"),
        customer: AgentCustomerInput,
    }),
])
export type CommitDecisionInputData = z.infer<typeof CommitDecisionInput>

/** createAgentInvite — an address and the scope the invite grants. */
export const AgentInviteInput = z.object({
    email: agentEmailSchema,
    scope: z.enum(["portfolio", "upload_only"]),
})
export type AgentInviteInputData = z.infer<typeof AgentInviteInput>
