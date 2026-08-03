import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
    CANONICAL_RISK_QUESTIONS,
    mapAnswersToProfile,
    resolveProfileField,
    type MappableQuestion,
} from "@/lib/services/questionnaire/profile-mapping"

/**
 * Audit finding F-01. The advisor's questionnaire recorded answers that reached
 * nothing, so the Protection Score — computed from PolicyholderProfile — could
 * not be moved by any advisor action.
 */

const q = (id: string, profileField?: string): MappableQuestion => ({ id, profileField })

describe("resolveProfileField", () => {
    it("maps canonical risk.* ids without any template authoring", () => {
        expect(resolveProfileField(q("risk.dependentsCount"))).toBe("dependentsCount")
        expect(resolveProfileField(q("risk.ownsHome"))).toBe("ownsHome")
    })

    it("lets an explicit profileField override the id", () => {
        expect(resolveProfileField(q("q1", "vehiclesCount"))).toBe("vehiclesCount")
    })

    it("returns null for unmapped questions", () => {
        expect(resolveProfileField(q("free-text-notes"))).toBeNull()
    })

    it("refuses a profileField that is not mappable", () => {
        // Health special-category fields are deliberately not writable here.
        expect(resolveProfileField(q("q1", "chronicConditions"))).toBeNull()
        expect(resolveProfileField(q("q1", "id"))).toBeNull()
        expect(resolveProfileField(q("q1", "userId"))).toBeNull()
    })
})

describe("mapAnswersToProfile — answer shapes", () => {
    const questions = [q("risk.dependentsCount"), q("risk.ownsHome")]

    it("reads the RAW SCALAR shape QuestionnaireForm actually posts", () => {
        const { updates, applied } = mapAnswersToProfile(questions, {
            "risk.dependentsCount": 3,
            "risk.ownsHome": true,
        } as any)

        expect(updates).toEqual({ dependentsCount: 3, ownsHome: true })
        expect(applied).toHaveLength(2)
    })

    it("reads the declared { value } wrapper shape", () => {
        const { updates } = mapAnswersToProfile(questions, {
            "risk.dependentsCount": {
                questionId: "risk.dependentsCount",
                questionText: "Dependants",
                value: 2,
                type: "number",
            },
        } as any)

        expect(updates).toEqual({ dependentsCount: 2 })
    })

    it("falls back to scanning by questionId when keys do not match", () => {
        const { updates } = mapAnswersToProfile(questions, {
            "0": { questionId: "risk.ownsHome", value: true, type: "boolean" },
        } as any)

        expect(updates).toEqual({ ownsHome: true })
    })

    it("ignores unmapped questions entirely", () => {
        const { updates, applied, rejected } = mapAnswersToProfile(
            [q("notes")],
            { notes: "client prefers email" } as any
        )
        expect(updates).toEqual({})
        expect(applied).toEqual([])
        expect(rejected).toEqual([])
    })

    it("skips blank answers rather than writing empty values", () => {
        const { updates, applied } = mapAnswersToProfile(questions, {
            "risk.dependentsCount": "",
            "risk.ownsHome": null,
        } as any)
        expect(updates).toEqual({})
        expect(applied).toEqual([])
    })

    it("tolerates a null/garbage answers payload", () => {
        expect(mapAnswersToProfile(questions, null).applied).toEqual([])
        expect(mapAnswersToProfile(questions, undefined).applied).toEqual([])
        expect(mapAnswersToProfile([], {} as any).applied).toEqual([])
    })
})

describe("mapAnswersToProfile — coercion and validation", () => {
    it("coerces Greek yes/no to booleans", () => {
        const { updates } = mapAnswersToProfile([q("risk.ownsHome")], {
            "risk.ownsHome": "Ναι",
        } as any)
        expect(updates).toEqual({ ownsHome: true })

        const no = mapAnswersToProfile([q("risk.hasPets")], {
            "risk.hasPets": "όχι",
        } as any)
        expect(no.updates).toEqual({ hasPets: false })
    })

    it("parses Greek-formatted currency", () => {
        const { updates } = mapAnswersToProfile([q("risk.mortgageAmount")], {
            "risk.mortgageAmount": "150.000,50",
        } as any)
        expect(updates).toEqual({ mortgageAmount: 150000.5 })
    })

    it("parses English-formatted currency", () => {
        const { updates } = mapAnswersToProfile([q("risk.mortgageAmount")], {
            "risk.mortgageAmount": "150,000.50",
        } as any)
        expect(updates).toEqual({ mortgageAmount: 150000.5 })
    })

    it.each([
        // [written by the client, expected value]
        ["180.000", 180000],   // Greek thousands, no decimals — the case that
        ["180000", 180000],    //   silently became 180 and suppressed the
        ["180.000,50", 180000.5], //   life-cover gap the mortgage should trigger
        ["180,000", 180000],   // English thousands
        ["180,000.50", 180000.5],
        ["1.500", 1500],
        ["1500,75", 1500.75],  // Greek decimal comma
        ["1500.75", 1500.75],  // English decimal point
        ["€ 250.000", 250000],
        ["0", 0],
    ])("parses %s as %d", (input, expected) => {
        const { updates } = mapAnswersToProfile([q("risk.mortgageAmount")], {
            "risk.mortgageAmount": input,
        } as any)
        expect(updates.mortgageAmount).toBe(expected)
    })

    it.each(["abc", "1.2.3.4", "", "--5", "1,2,3"])(
        "rejects unparseable %s rather than guessing",
        (input) => {
            const { updates } = mapAnswersToProfile([q("risk.mortgageAmount")], {
                "risk.mortgageAmount": input,
            } as any)
            expect(updates.mortgageAmount).toBeUndefined()
        }
    )

    it("normalises enum casing and separators", () => {
        const { updates } = mapAnswersToProfile([q("risk.employmentStatus")], {
            "risk.employmentStatus": "Self-Employed",
        } as any)
        expect(updates).toEqual({ employmentStatus: "self_employed" })
    })

    it("REJECTS an out-of-range value instead of clamping it", () => {
        // A clamped value would read as a real declaration by the client.
        const { updates, rejected } = mapAnswersToProfile([q("risk.dependentsCount")], {
            "risk.dependentsCount": 999,
        } as any)
        expect(updates).toEqual({})
        expect(rejected).toEqual([
            { questionId: "risk.dependentsCount", field: "dependentsCount", reason: "out_of_range" },
        ])
    })

    it("rejects a negative amount", () => {
        const { updates, rejected } = mapAnswersToProfile([q("risk.mortgageAmount")], {
            "risk.mortgageAmount": -5,
        } as any)
        expect(updates).toEqual({})
        expect(rejected[0].reason).toBe("out_of_range")
    })

    it("rejects a non-integer count", () => {
        const { rejected } = mapAnswersToProfile([q("risk.vehiclesCount")], {
            "risk.vehiclesCount": 1.5,
        } as any)
        expect(rejected[0].reason).toBe("not_an_integer")
    })

    it("rejects an unrecognised enum value", () => {
        const { updates, rejected } = mapAnswersToProfile([q("risk.employmentStatus")], {
            "risk.employmentStatus": "astronaut",
        } as any)
        expect(updates).toEqual({})
        expect(rejected[0].reason).toBe("not_an_allowed_value")
    })

    it("rejects free text where a number is expected", () => {
        const { rejected } = mapAnswersToProfile([q("risk.dependentsCount")], {
            "risk.dependentsCount": "quite a few",
        } as any)
        expect(rejected[0].reason).toBe("not_a_number")
    })

    it("keeps the last answer when two questions target the same field", () => {
        const { updates, applied } = mapAnswersToProfile(
            [q("a", "vehiclesCount"), q("b", "vehiclesCount")],
            { a: 1, b: 2 } as any
        )
        expect(updates).toEqual({ vehiclesCount: 2 })
        expect(applied).toEqual(["vehiclesCount"])
    })
})

describe("CANONICAL_RISK_QUESTIONS", () => {
    it("every canonical question resolves to a real profile field", () => {
        for (const question of CANONICAL_RISK_QUESTIONS) {
            expect(resolveProfileField(question), question.id).not.toBeNull()
        }
    })

    it("covers the fields that decide score-category applicability", () => {
        const fields = CANONICAL_RISK_QUESTIONS.map((question) => resolveProfileField(question))
        // These four are what appliesWhen() reads for Life, Property, Income
        // and Liability — without them the score cannot leave its default.
        expect(fields).toContain("dependentsCount")
        expect(fields).toContain("mortgageAmount")
        expect(fields).toContain("ownsHome")
        expect(fields).toContain("employmentStatus")
    })

    it("matches the shipped Household Risk Profile system template", () => {
        // The template is data shipped by migration (system templates are not
        // seeded). If its question ids or profileFields drift from the mapper,
        // the advisor's one score-moving questionnaire silently stops mapping —
        // exactly the failure mode F-01 exists to end.
        const sql = readFileSync(
            join(
                process.cwd(),
                "prisma/migrations/20260803120000_risk_profile_system_questionnaire/migration.sql"
            ),
            "utf8"
        )
        const payload = sql.match(/'(\[[\s\S]*?\])'::jsonb/)
        expect(payload, "jsonb question payload not found in migration").not.toBeNull()

        const questions = JSON.parse(payload![1]) as Array<
            MappableQuestion & { type: string; label: string; labelEl: string; required: boolean }
        >
        expect(questions.length).toBeGreaterThanOrEqual(10)

        for (const question of questions) {
            expect(resolveProfileField(question), `${question.id} maps to nothing`).not.toBeNull()
            // QuestionnaireForm only renders these four types.
            expect(["text", "number", "boolean", "select"]).toContain(question.type)
            // The UI is Greek-default; a missing labelEl renders English to a
            // Greek advisor's client.
            expect(question.labelEl, `${question.id} has no Greek label`).toBeTruthy()
        }

        // The four fields that decide category applicability must be collected,
        // or the template cannot lift a score off its default.
        const fields = questions.map((question) => resolveProfileField(question))
        for (const required of [
            "dependentsCount",
            "mortgageAmount",
            "ownsHome",
            "employmentStatus",
        ]) {
            expect(fields, `template does not collect ${required}`).toContain(required)
        }
    })

    it("moves a profile from all-defaults to one that activates categories", () => {
        const answers = {
            "risk.dependentsCount": 2,
            "risk.employmentStatus": "self_employed",
            "risk.ownsHome": true,
            "risk.mortgageAmount": "180.000",
            "risk.vehiclesCount": 1,
        }
        const { updates } = mapAnswersToProfile(CANONICAL_RISK_QUESTIONS, answers as any)

        expect(updates).toMatchObject({
            dependentsCount: 2,
            employmentStatus: "self_employed",
            ownsHome: true,
            mortgageAmount: 180000,
            vehiclesCount: 1,
        })
    })
})
