/**
 * A finding, as the product may show it.
 *
 * Composed from TYPED fields — the sentence is a catalogue key plus parameters,
 * never model prose. The specificity gate (§9): a finding is renderable only
 * when it names a concrete object (a policy, an asset, a person) AND its
 * source names a document. Anything else is logged and not shown.
 *
 * The source pointer is honest about its resolution (A-12): the document is
 * always known; a page/snippet is attached only when an `ExtractionSource`
 * exists for the field; otherwise the pointer names the document SECTION the
 * rule read and whether the cover was found there. Never an invented locator.
 */
import { z } from "zod"
import { logger } from "@/lib/logger"
import { FINDING_KINDS, TIERS, type FindingKind, type Tier } from "./state"

export const FindingObjectSchema = z.object({
    policyId: z.string().min(1).nullable(),
    /** «Toyota Yaris · ΙΚΖ-4821», «το σπίτι σας στην Κηφισιά» — from policyLabel/asset identity, never a sentinel. */
    assetLabel: z.string().min(1),
    /** A household person this finding is about, when one is named. */
    personId: z.string().min(1).nullable().optional(),
})
export type FindingObject = z.infer<typeof FindingObjectSchema>

export const SOURCE_SECTIONS = ["coverages", "exclusions", "schedule", "conditions", "profile"] as const
export type SourceSection = (typeof SOURCE_SECTIONS)[number]

/** Where the analyst read it. */
export const FindingSourceSchema = z.object({
    documentId: z.string().min(1),
    /** The generated document label (lib/wallet/document-label) — never a user file name. */
    documentLabel: z.string().min(1),
    locator: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("page"), page: z.number().int().min(1), snippet: z.string().max(240).optional() }),
        z.object({ kind: z.literal("section"), section: z.enum(SOURCE_SECTIONS), found: z.boolean() }),
    ]),
    /** The profile field the rule used, when one did (only user-entered facts). */
    profileField: z.string().min(1).nullable().optional(),
    /** How many OTHER documents were searched for a negative finding («Έψαξα και στα άλλα 29»). */
    othersSearched: z.number().int().min(0).optional(),
})
export type FindingSource = z.infer<typeof FindingSourceSchema>

export const MessageRefSchema = z.object({
    key: z.string().min(1),
    params: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
})
export type MessageRef = z.infer<typeof MessageRefSchema>

export const DISMISS_REASONS = ["chosen", "renewed", "not_relevant"] as const
export type DismissReason = (typeof DISMISS_REASONS)[number]

export const FindingSchema = z.object({
    id: z.string().min(1),
    hash: z.string().min(1),
    kind: z.enum(FINDING_KINDS),
    tier: z.enum(TIERS),
    object: FindingObjectSchema,
    sentence: MessageRefSchema,
    source: FindingSourceSchema,
    /** Present only when a user-ENTERED profile fact supports it; never generic. */
    whyYou: MessageRefSchema.extend({ profileField: z.string().min(1) }).nullable().optional(),
    /** Days until the relevant expiry, for the trailing figure; null when none. */
    daysUntilExpiry: z.number().int().nullable().optional(),
    ruleId: z.string().min(1),
    engineVersion: z.string().min(1).nullable().optional(),
    dismissedReason: z.enum(DISMISS_REASONS).nullable().optional(),
})
export type Finding = z.infer<typeof FindingSchema>

/** A finding that passed the gate. Same shape; the brand makes the gate a type. */
export type RenderableFinding = Finding & { readonly __renderable: true }

/**
 * THE specificity gate. Returns null — and says why in the log — rather than a
 * card with generic text. A component cannot construct a FindingCard without a
 * value of this type.
 */
export function toRenderableFinding(input: unknown): RenderableFinding | null {
    const parsed = FindingSchema.safeParse(input)
    if (!parsed.success) {
        logger("warn", "finding rejected by the specificity gate (schema)", {
            issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
        })
        return null
    }
    const f = parsed.data
    if (!f.object.assetLabel.trim() || (!f.object.policyId && !f.object.personId)) {
        logger("warn", "finding rejected by the specificity gate (no concrete object)", { id: f.id, ruleId: f.ruleId })
        return null
    }
    if (!f.source.documentId || !f.source.documentLabel.trim()) {
        logger("warn", "finding rejected by the specificity gate (no document)", { id: f.id, ruleId: f.ruleId })
        return null
    }
    return f as RenderableFinding
}

/** Every finding that passes; the rest are logged by the gate. */
export function renderableFindings(inputs: ReadonlyArray<unknown>): RenderableFinding[] {
    const out: RenderableFinding[] = []
    for (const i of inputs) {
        const f = toRenderableFinding(i)
        if (f) out.push(f)
    }
    return out
}

/**
 * Dismissal memory key: policy + cover type + rule. Deterministic and
 * inspectable — a composite key, not a digest, so a support engineer can read
 * it in a row. `profile` stands in for a profile-level finding.
 */
export function findingHash(policyId: string | null, coverType: string, ruleId: string): string {
    const clean = (s: string) => s.trim().toLowerCase().replace(/[|\s]+/g, "_")
    return `${policyId ? clean(policyId) : "profile"}|${clean(coverType)}|${clean(ruleId)}`
}

/** A finding's state colour comes from its kind, never from severity. */
export function findingKindOf(f: Pick<Finding, "kind">): FindingKind {
    return f.kind
}

export type { FindingKind, Tier }
