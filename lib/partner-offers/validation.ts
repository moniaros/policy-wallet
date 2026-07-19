/**
 * Pure Zod validation for the /admin/partners forms — no server imports so it
 * unit-tests without mocking (tests/unit/partner-offers.test.ts). The server
 * actions stay thin wrappers.
 *
 * Domain note: "partner offers" are third-party benefits bundled into paid
 * tiers — deliberately NOT named "perks", which in this codebase means a
 * policy's own embedded perksAndBenefits (PerksCard, perk-reminder cron).
 */

import { z } from "zod"
import { TIER_KEYS } from "@/lib/pricing/plan-defaults"
import { PROFILE_TAG_VALUES } from "@/lib/services/gap-engine/recommendation-generator"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"

export const VENDOR_CATEGORIES = [
    "health",
    "motor",
    "home",
    "pet",
    "travel",
    "digital",
    "lifestyle",
] as const

const localized = z.object({ el: z.string().trim().min(1), en: z.string().trim().min(1) })
const slug = z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase letters, digits and dashes only")
const httpsUrl = z.string().trim().url().startsWith("https://", "must be https")

export const PartnerVendorInputSchema = z.object({
    slug,
    name: z.string().trim().min(2).max(80),
    description: localized,
    logoUrl: httpsUrl.nullable(),
    websiteUrl: httpsUrl.nullable(),
    category: z.enum(VENDOR_CATEGORIES),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(99),
})
export type PartnerVendorInput = z.infer<typeof PartnerVendorInputSchema>

export const PartnerOfferInputSchema = z
    .object({
        slug,
        title: localized,
        description: localized,
        offerType: z.enum(["free_service", "discount", "gift"]),
        redemptionMethod: z.enum(["link", "code", "phone"]),
        redemptionUrl: httpsUrl.nullable(),
        redemptionCode: z.string().trim().min(1).max(60).nullable(),
        redemptionPhone: z
            .string()
            .trim()
            .regex(/^\+?[0-9 ]{7,20}$/, "digits (and an optional leading +) only")
            .nullable(),
        includedInTiers: z
            .array(z.enum(TIER_KEYS as unknown as [string, ...string[]]))
            .min(1, "an offer must be included in at least one tier"),
        profileTags: z.array(z.enum(PROFILE_TAG_VALUES)),
        linesOfBusiness: z.array(z.enum(WRITE_BRANCH_IDS as unknown as [string, ...string[]])),
        validFrom: z.date().nullable(),
        validUntil: z.date().nullable(),
        termsUrl: httpsUrl.nullable(),
        isActive: z.boolean(),
        sortOrder: z.number().int().min(0).max(99),
    })
    // Redemption-method consistency: the field matching the method is required.
    .superRefine((offer, ctx) => {
        if (offer.redemptionMethod === "link" && !offer.redemptionUrl) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["redemptionUrl"],
                message: "redemption method 'link' requires a https redemption URL",
            })
        }
        if (offer.redemptionMethod === "code" && !offer.redemptionCode) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["redemptionCode"],
                message: "redemption method 'code' requires a code",
            })
        }
        if (offer.redemptionMethod === "phone" && !offer.redemptionPhone) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["redemptionPhone"],
                message: "redemption method 'phone' requires a phone number",
            })
        }
        if (offer.validFrom && offer.validUntil && offer.validUntil <= offer.validFrom) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["validUntil"],
                message: "validUntil must be after validFrom",
            })
        }
    })
export type PartnerOfferInput = z.infer<typeof PartnerOfferInputSchema>

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
function num(raw: unknown): number {
    const value = text(raw)
    return value === "" ? NaN : Number(value)
}
function dateOrNull(raw: unknown): Date | null {
    const value = text(raw)
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function firstIssueError(error: z.ZodError): Error {
    const issue = error.issues[0]
    return new Error(`Invalid ${issue.path.join(".")}: ${issue.message}`)
}

export function parseVendorForm(form: FormValues): PartnerVendorInput {
    const result = PartnerVendorInputSchema.safeParse({
        slug: text(form.get("slug")),
        name: text(form.get("name")),
        description: { el: text(form.get("descriptionEl")), en: text(form.get("descriptionEn")) },
        logoUrl: optional(form.get("logoUrl")),
        websiteUrl: optional(form.get("websiteUrl")),
        category: text(form.get("category")),
        isActive: bool(form.get("isActive")),
        sortOrder: num(form.get("sortOrder")),
    })
    if (!result.success) throw firstIssueError(result.error)
    return result.data
}

export function parseOfferForm(form: FormValues): PartnerOfferInput {
    const result = PartnerOfferInputSchema.safeParse({
        slug: text(form.get("slug")),
        title: { el: text(form.get("titleEl")), en: text(form.get("titleEn")) },
        description: { el: text(form.get("descriptionEl")), en: text(form.get("descriptionEn")) },
        offerType: text(form.get("offerType")),
        redemptionMethod: text(form.get("redemptionMethod")),
        redemptionUrl: optional(form.get("redemptionUrl")),
        redemptionCode: optional(form.get("redemptionCode")),
        redemptionPhone: optional(form.get("redemptionPhone")),
        includedInTiers: form.getAll("includedInTiers").map(text).filter(Boolean),
        profileTags: form.getAll("profileTags").map(text).filter(Boolean),
        linesOfBusiness: form.getAll("linesOfBusiness").map(text).filter(Boolean),
        validFrom: dateOrNull(form.get("validFrom")),
        validUntil: dateOrNull(form.get("validUntil")),
        termsUrl: optional(form.get("termsUrl")),
        isActive: bool(form.get("isActive")),
        sortOrder: num(form.get("sortOrder")),
    })
    if (!result.success) throw firstIssueError(result.error)
    return result.data
}
