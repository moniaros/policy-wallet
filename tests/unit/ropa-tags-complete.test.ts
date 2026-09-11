import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

import {
    collectRopaTags,
    modelsRequiringTags,
    parseRopaTag,
    modelBlocks,
} from "@/lib/compliance/ropa-tags"

const SCHEMA = readFileSync("prisma/schema.prisma", "utf-8")

/**
 * The trap this file exists for.
 *
 * The compliance pack records that no Art. 30 record of processing exists
 * (docs/compliance/DATA_PROTECTION_REVIEW_PACK.md §14.2). A record written as
 * prose beside the schema goes stale on the next migration — which is precisely
 * how the gap arose. So the record is generated FROM the schema, and this guard
 * makes going stale impossible: add a table that holds personal data and the
 * build fails until someone says what it is for and on what basis.
 *
 * The universe is derived from the schema, never from a hand-kept list — the
 * same detector `erasure-covers-personal-data.test.ts` uses, deliberately, so
 * the two guards cannot disagree about what counts as personal data. A guard
 * that enumerates known locations guards those locations, not the invariant.
 *
 * What this guard does NOT do: force a lawful basis to exist. `basis=unclear`
 * and `purpose=unclear` are valid values and pass. A guard that only went green
 * once all 57 models claimed a settled basis would manufacture confident answers
 * to open legal questions and emit them into a document a regulator may read.
 * Unknown is not absence; the generated record prints those as open questions.
 */

const EXEMPT: Record<string, string> = {
    // Reference data and configuration: no natural person is identifiable from
    // a row. Each of these is checked by hand here rather than inferred, because
    // "holds no personal data" is a claim, not an absence.
    Insurer: "reference data — insurance companies, not people",
    InsuranceType: "reference data — branch taxonomy",
    GapDefinition: "authored rule catalogue; reference data per CLAUDE.md",
    Plan: "product catalogue — the public pricing publication channel",
    PlanRevision: "audit of catalogue edits; actor is an admin, recorded in ActivityLog",
    Tenant: "organisation, not a natural person",
    VerificationToken: "opaque token keyed by identifier; expires, holds no profile",
    ProcessedWebhookEvent: "provider event ids for idempotency",
    TranslationCache: "cached strings keyed by hash",
    QuestionnaireTemplate: "authored template, not an answer",
    NotificationTemplate: "admin-authored copy",
    NotificationTemplateRevision: "admin-authored copy history",
    NotificationSetting: "system configuration",
    NotificationRuleOverride: "admin-authored configuration",
    NotificationRuleRevision: "admin-authored configuration history",
    BusinessEventOverride: "admin-authored configuration",
    BusinessEventDelivery: "delivery attempt of a BusinessEvent, which carries the tag",
    AiRuntimeConfig: "model routing configuration",
    AiRuntimeConfigRevision: "model routing configuration history",
    AiPromptOverride: "prompt text, authored by an admin",
    AiPromptOverrideRevision: "prompt text history",
    FeatureFlag: "system configuration",
    FeatureFlagRevision: "system configuration history",
    JobSchedule: "cron configuration",
    JobRun: "job execution record; no subject column",
    InsuranceProduct: "product catalogue",
    PartnerVendor: "partner organisation, not a natural person",
    PartnerOffer: "partner catalogue",
    FormSubmission: "public contact/newsletter form; retention handled by the privacy sweep, no user FK",
    PolicyAnalysisStep: "child of PolicyAnalysisRun, which carries the tag",
}

describe("every personal-data model carries an Art. 30 tag", () => {
    const required = modelsRequiringTags(SCHEMA)

    it("finds a meaningful number of models to check", () => {
        // A broken detector that finds nothing would make this file pass
        // vacuously — the failure mode of guards like this one.
        expect(required.length).toBeGreaterThan(40)
    })

    it("every model holding personal data is tagged or explicitly exempt", () => {
        const { tags } = collectRopaTags(SCHEMA)
        const tagged = new Set(tags.map((t) => t.model))
        const missing = required.filter((m) => !tagged.has(m) && !EXEMPT[m])
        expect(missing).toEqual([])
    })

    it("no tag is malformed", () => {
        const { errors } = collectRopaTags(SCHEMA)
        expect(errors).toEqual([])
    })

    it("no exemption is stale — every exempt model still exists in the schema", () => {
        const present = new Set(modelBlocks(SCHEMA).map((m) => m.name))
        const vanished = Object.keys(EXEMPT).filter((m) => !present.has(m))
        expect(vanished).toEqual([])
    })

    it("Art. 9 columns named by a tag actually exist on that model", () => {
        const blocks = new Map(modelBlocks(SCHEMA).map((m) => [m.name, m.body]))
        const { tags } = collectRopaTags(SCHEMA)
        const phantom: string[] = []
        for (const tag of tags) {
            const body = blocks.get(tag.model) ?? ""
            for (const field of tag.art9) {
                if (!new RegExp(`^\\s{2}${field}\\s`, "m").test(body)) {
                    phantom.push(`${tag.model}.${field}`)
                }
            }
        }
        expect(phantom).toEqual([])
    })

    it("the model holding the known Art. 9 columns declares them", () => {
        // PolicyholderProfile is the one model the compliance pack names as
        // holding special-category data directly (§3.2a). If a refactor moved
        // those columns, this fails and the record stops being a claim nobody
        // checked.
        const { tags } = collectRopaTags(SCHEMA)
        const profile = tags.find((t) => t.model === "PolicyholderProfile")
        expect(profile?.art9).toContain("chronicConditions")
        expect(profile?.art9).toContain("familyMedicalHistory")
        expect(profile?.basis).toBe("consent")
    })
})

/**
 * The probe. A guard without a probe is not a guard — these fixtures are the
 * proof that the machinery above actually goes red, exercised against the same
 * functions the real run uses rather than a re-implementation.
 */
describe("probe — the guard turns red on the shapes it exists to catch", () => {
    const UNTAGGED = `
model Thing {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
`
    const BAD_BASIS = `
/// @ropa purpose=analysis basis=contract subjects=policyholder retention=account_life erasure=delete art9=chronicConditions
model Thing {
  id                String @id
  userId            String
  chronicConditions Json?
  user              User   @relation(fields: [userId], references: [id])
}
`
    const BAD_VALUE = `
/// @ropa purpose=vibes basis=contract subjects=policyholder retention=account_life erasure=delete art9=none
model Thing {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
`
    const INCOMPLETE = `
/// @ropa purpose=service basis=contract subjects=policyholder
model Thing {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
`

    it("a new personal-data table with no tag is reported as untagged", () => {
        const { untagged } = collectRopaTags(UNTAGGED)
        expect(untagged).toContain("Thing")
        expect(modelsRequiringTags(UNTAGGED)).toContain("Thing")
    })

    it("Art. 9 columns under a non-consent basis are refused", () => {
        const result = parseRopaTag("Thing", BAD_BASIS.split("model")[0])
        expect(result && "errors" in result).toBe(true)
        expect(JSON.stringify(result)).toContain("Art. 9 requires explicit consent")
    })

    it("a value outside the vocabulary is refused", () => {
        const { errors } = collectRopaTags(BAD_VALUE)
        expect(errors.length).toBeGreaterThan(0)
        expect(JSON.stringify(errors)).toContain("purpose=vibes")
    })

    it("a tag missing required keys is refused", () => {
        const { errors } = collectRopaTags(INCOMPLETE)
        expect(JSON.stringify(errors)).toContain("missing retention=")
        expect(JSON.stringify(errors)).toContain("missing art9=")
    })

    it("'unclear' is accepted — the guard never forces an invented basis", () => {
        const HONEST = `
/// @ropa purpose=unclear basis=unclear subjects=policyholder retention=unclear erasure=delete art9=none
model Thing {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
`
        const { tags, errors } = collectRopaTags(HONEST)
        expect(errors).toEqual([])
        expect(tags[0].basis).toBe("unclear")
    })
})
