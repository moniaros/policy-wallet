/**
 * Pure Zod validation for the /admin/insurers forms — no server imports so it
 * unit-tests without mocking (tests/unit/insurer-validation.test.ts). The
 * server actions stay thin wrappers.
 *
 * Deliberate deviations from the partners precedent, forced by the imported
 * reference data (see the dataset-conformance test):
 *  - URLs allow http:// — two dataset records publish http-only sites.
 *  - Phone fields are free text (3–160 chars), not phone-shaped: Greek short
 *    codes ("18189") and dual-number strings ("1158 (from Greece) / +30 210
 *    946 1333 (from abroad)") are real values.
 * Tightening either bricks re-saving imported rows from the admin form.
 */

import { z } from "zod"
import {
    INSURER_LOB_VALUES,
    INSURER_STATUS_VALUES,
} from "@/lib/insurers/constants"

const shortText = z.string().trim().min(1).max(200)
const anyUrl = z.string().trim().url().max(300)
const phoneText = z.string().trim().min(3).max(160)

export const InsurerAddressSchema = z.object({
    street: shortText.nullable(),
    city: shortText.nullable(),
    postalCode: z.string().trim().min(1).max(20).nullable(),
    country: z.string().trim().min(2).max(60).nullable(),
})
export type InsurerAddress = z.infer<typeof InsurerAddressSchema>

export const InsurerInputSchema = z.object({
    name: z.string().trim().min(2).max(120),
    nameEn: shortText.nullable(),
    legalNameEl: shortText.nullable(),
    status: z.enum(INSURER_STATUS_VALUES),
    groupParent: shortText.nullable(),
    logoUrl: anyUrl.nullable(),
    website: anyUrl.nullable(),
    callCenter: phoneText.nullable(),
    claimsPhone: phoneText.nullable(),
    roadsidePhone: phoneText.nullable(),
    paymentGatewayUrl: anyUrl.nullable(),
    contactEmail: z.string().trim().email().max(200).nullable(),
    hqAddress: InsurerAddressSchema.nullable(),
    roadsideAssistanceProvider: shortText.nullable(),
    linesOfBusiness: z.array(z.enum(INSURER_LOB_VALUES)),
    notes: z.string().trim().min(1).max(2000).nullable(),
    isActive: z.boolean(),
})
export type InsurerInput = z.infer<typeof InsurerInputSchema>

export const InsurerCreateSchema = z.object({
    name: z.string().trim().min(2).max(120),
    nameEn: shortText.nullable(),
    isActive: z.boolean(),
})
export type InsurerCreateInput = z.infer<typeof InsurerCreateSchema>

/** Minimal FormData surface so tests can pass a plain Map. */
export interface FormValues {
    get(name: string): unknown
    getAll(name: string): unknown[]
}

function text(raw: unknown): string {
    return typeof raw === "string" ? raw.trim() : ""
}
function optional(raw: unknown): string | null {
    const value = text(raw)
    return value === "" ? null : value
}
function bool(raw: unknown): boolean {
    return raw != null && raw !== "false"
}

function firstIssueError(error: z.ZodError): Error {
    const issue = error.issues[0]
    return new Error(`Invalid ${issue.path.join(".")}: ${issue.message}`)
}

function addressFromForm(form: FormValues): InsurerAddress | null {
    const street = optional(form.get("hqStreet"))
    const city = optional(form.get("hqCity"))
    const postalCode = optional(form.get("hqPostalCode"))
    const country = optional(form.get("hqCountry"))
    if (!street && !city && !postalCode && !country) return null
    return { street, city, postalCode, country }
}

export function parseInsurerForm(form: FormValues): InsurerInput {
    const result = InsurerInputSchema.safeParse({
        name: text(form.get("name")),
        nameEn: optional(form.get("nameEn")),
        legalNameEl: optional(form.get("legalNameEl")),
        status: text(form.get("status")),
        groupParent: optional(form.get("groupParent")),
        logoUrl: optional(form.get("logoUrl")),
        website: optional(form.get("website")),
        callCenter: optional(form.get("callCenter")),
        claimsPhone: optional(form.get("claimsPhone")),
        roadsidePhone: optional(form.get("roadsidePhone")),
        paymentGatewayUrl: optional(form.get("paymentGatewayUrl")),
        contactEmail: optional(form.get("contactEmail")),
        hqAddress: addressFromForm(form),
        roadsideAssistanceProvider: optional(form.get("roadsideAssistanceProvider")),
        linesOfBusiness: form.getAll("linesOfBusiness").map(text).filter(Boolean),
        notes: optional(form.get("notes")),
        isActive: bool(form.get("isActive")),
    })
    if (!result.success) throw firstIssueError(result.error)
    return result.data
}

export function parseInsurerCreateForm(form: FormValues): InsurerCreateInput {
    const result = InsurerCreateSchema.safeParse({
        name: text(form.get("name")),
        nameEn: optional(form.get("nameEn")),
        isActive: bool(form.get("isActive")),
    })
    if (!result.success) throw firstIssueError(result.error)
    return result.data
}

/**
 * Fields whose provenance the confidence map tracks. isActive is excluded —
 * it is an admin-owned visibility toggle, not a data assertion.
 */
export const CONFIDENCE_TRACKED_FIELDS = [
    "name",
    "nameEn",
    "legalNameEl",
    "status",
    "groupParent",
    "logoUrl",
    "website",
    "callCenter",
    "claimsPhone",
    "roadsidePhone",
    "paymentGatewayUrl",
    "contactEmail",
    "hqAddress",
    "roadsideAssistanceProvider",
    "linesOfBusiness",
    "notes",
] as const
export type ConfidenceTrackedField = (typeof CONFIDENCE_TRACKED_FIELDS)[number]

type FieldSnapshot = Partial<Record<ConfidenceTrackedField, unknown>>

/** Canonical comparison string: null/"" collapse, arrays compare as sets. */
function fingerprint(field: ConfidenceTrackedField, value: unknown): string {
    if (value == null) return ""
    if (field === "linesOfBusiness" && Array.isArray(value)) {
        return [...value].map(String).sort().join("|")
    }
    if (field === "hqAddress" && typeof value === "object") {
        const addr = value as Record<string, unknown>
        return ["street", "city", "postalCode", "country"]
            .map((k) => (addr[k] == null ? "" : String(addr[k]).trim()))
            .join("|")
    }
    return String(value).trim()
}

/**
 * Stamp admin_edited onto every tracked field whose value actually changed,
 * preserving dataset confidence on untouched fields. Rows without a
 * confidence map (admin-created) stay without one — there is no dataset
 * provenance to correct.
 */
export function applyAdminEditsToConfidence(
    existingConfidence: unknown,
    before: FieldSnapshot,
    after: FieldSnapshot
): Record<string, string> | null {
    if (
        existingConfidence == null ||
        typeof existingConfidence !== "object" ||
        Array.isArray(existingConfidence)
    ) {
        return null
    }
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(existingConfidence as Record<string, unknown>)) {
        if (typeof value === "string") next[key] = value
    }
    for (const field of CONFIDENCE_TRACKED_FIELDS) {
        if (fingerprint(field, before[field]) !== fingerprint(field, after[field])) {
            next[field] = "admin_edited"
        }
    }
    return next
}
