import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { evaluateGapLogic, hasEvaluableRule } from "@/lib/gap-detection"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"

/**
 * Every rule in the live catalogue, traced against fixtures.
 *
 * A gap definition is a claim the product makes about someone's insurance. This
 * file is where that claim is checked BEFORE it reaches anyone: each rule gets a
 * case that must fire, a case that must not, and — the one that matters most — a
 * case where the field was never extracted at all.
 *
 * That last case is the whole discipline. The extractor is silent about most
 * fields, so a rule that treats silence as evidence reports "your dog is not
 * covered for leishmaniasis" when what happened is that nobody read the page.
 * `is_false` rules must stay quiet on silence. `missing` rules fire on it BY
 * DESIGN — they ask whether a value was recorded — and their findings say "not
 * recorded", never "not covered".
 *
 * The catalogue is imported, not restated, so a rule cannot be added without a
 * case here: EVERY_SLUG_TRACED at the bottom fails on an untraced slug.
 */

type Case = {
    /** What the fixture represents, in the words a reader would use. */
    name: string
    acord: Record<string, unknown>
    /** true = this rule should produce a finding for this document. */
    fires: boolean
}

function policyFor(lineOfBusiness: string, acordData: unknown) {
    const now = new Date()
    return {
        id: "trace-policy",
        lineOfBusiness,
        insurerName: "Trace Insurer",
        startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        acordData,
    } as any
}

/** An ISO date `days` from now — for the green-card expiry window. */
function inDays(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString()
}

/** The three fixtures a boolean cover rule needs: absent, present, unread. */
function booleanCoverCases(path: string, label: string): Case[] {
    const set = (value: unknown) => {
        const [section, field] = path.split(".")
        return { [section]: { [field]: value } }
    }
    return [
        { name: `${label}: the document says it is NOT covered`, acord: set(false), fires: true },
        { name: `${label}: the document says it IS covered`, acord: set(true), fires: false },
        // The case that has been wrong before, twice.
        { name: `${label}: never extracted — silence, not absence`, acord: { policy: {} }, fires: false },
    ]
}

/** The three a `missing` rule needs — where silence is the point. */
function recordedFieldCases(path: string, label: string, present: unknown): Case[] {
    const set = (value: unknown) => {
        const parts = path.split(".")
        if (parts.length === 2) return { [parts[0]]: { [parts[1]]: value } }
        return { [parts[0]]: { [parts[1]]: { [parts[2]]: value } } }
    }
    return [
        { name: `${label}: nothing recorded`, acord: { policy: {} }, fires: true },
        { name: `${label}: recorded`, acord: set(present), fires: false },
        { name: `${label}: recorded but empty string`, acord: set(""), fires: true },
    ]
}

const TRACE: Record<string, Case[]> = {
    // ── Existing four ────────────────────────────────────────────────────
    missing_enfia_components: [
        {
            name: "one of the three perils explicitly absent",
            acord: { property: { fireCoverageIncluded: true, earthquakeCoverageIncluded: false, floodCoverageIncluded: true } },
            fires: true,
        },
        {
            name: "all three present — qualifies for the discount",
            acord: { property: { fireCoverageIncluded: true, earthquakeCoverageIncluded: true, floodCoverageIncluded: true } },
            fires: false,
        },
        {
            name: "one peril never extracted — cannot tell, so say nothing",
            acord: { property: { fireCoverageIncluded: true, earthquakeCoverageIncluded: true } },
            fires: false,
        },
    ],
    missing_coordination_centre: recordedFieldCases(
        "health.coordinationCentre.phone",
        "coordination centre",
        "+30 210 1234567"
    ),
    missing_leishmaniasis: booleanCoverCases("pet.leishmaniaCovered", "leishmaniasis"),
    green_card_expiring: [
        { name: "expires in 10 days", acord: { vehicle: { greenCardExpiryDate: inDays(10) } }, fires: true },
        { name: "expires today — still inside the window", acord: { vehicle: { greenCardExpiryDate: inDays(0) } }, fires: true },
        { name: "expires in 90 days", acord: { vehicle: { greenCardExpiryDate: inDays(90) } }, fires: false },
        { name: "already expired — not a warning, a different fact", acord: { vehicle: { greenCardExpiryDate: inDays(-5) } }, fires: false },
        { name: "no green card date recorded", acord: { vehicle: {} }, fires: false },
    ],

    // ── Motor ────────────────────────────────────────────────────────────
    no_own_damage_cover: booleanCoverCases("vehicle.ownVehicleDamage", "own damage"),
    no_glass_breakage_cover: booleanCoverCases("vehicle.glassBreakage", "glass breakage"),
    no_roadside_assistance: booleanCoverCases("vehicle.hasRoadsideAssistance", "roadside assistance"),
    missing_accident_declaration_phone: recordedFieldCases(
        "vehicle.accidentDeclarationPhone",
        "accident declaration number",
        "+30 210 7654321"
    ),

    // ── Home ─────────────────────────────────────────────────────────────
    no_earthquake_cover: booleanCoverCases("property.earthquakeCoverageIncluded", "earthquake"),
    no_flood_cover: booleanCoverCases("property.floodCoverageIncluded", "flood"),
    no_fire_cover: booleanCoverCases("property.fireCoverageIncluded", "fire"),

    // ── Health ───────────────────────────────────────────────────────────
    no_direct_billing: booleanCoverCases("health.directBillingAvailable", "direct settlement"),
    no_annual_checkup: booleanCoverCases("health.annualCheckupIncluded", "annual check-up"),
    missing_hospital_class: recordedFieldCases("health.hospitalClass", "hospital class", "A"),

    // ── Pet ──────────────────────────────────────────────────────────────
    no_direct_vet_payment: booleanCoverCases("pet.directVetPayment", "direct vet payment"),
    missing_microchip_number: recordedFieldCases("pet.microchipNumber", "microchip", "941000012345678"),

    // ── Travel ───────────────────────────────────────────────────────────
    no_repatriation_cover: booleanCoverCases("travel.repatriationCovered", "repatriation"),
    no_trip_cancellation_cover: booleanCoverCases("travel.cancellationCovered", "cancellation"),
    missing_emergency_assistance_phone: recordedFieldCases(
        "travel.emergencyAssistancePhone",
        "24h assistance number",
        "+30 210 9999999"
    ),

    // ── Group health ─────────────────────────────────────────────────────
    // Same field paths as the individual-health rules: group health reuses
    // AcordDataSchema.health. Traced separately because they are separate
    // definitions with independently reviewable severities.
    group_missing_coordination_centre: recordedFieldCases(
        "health.coordinationCentre.phone",
        "coordination centre (group)",
        "+30 210 1234567"
    ),
    group_missing_hospital_class: recordedFieldCases(
        "health.hospitalClass",
        "hospital class (group)",
        "A"
    ),
    group_no_direct_billing: booleanCoverCases("health.directBillingAvailable", "direct settlement (group)"),

    // ── Motorbike ────────────────────────────────────────────────────────
    // Same vehicle.* paths as motor; separate definitions, separately traced.
    // No glass-breakage rule exists here on purpose — see the catalogue comment.
    moto_no_own_damage_cover: booleanCoverCases("vehicle.ownVehicleDamage", "own damage (moto)"),
    moto_no_roadside_assistance: booleanCoverCases("vehicle.hasRoadsideAssistance", "roadside (moto)"),
    moto_missing_accident_declaration_phone: recordedFieldCases(
        "vehicle.accidentDeclarationPhone",
        "accident declaration number (moto)",
        "+30 210 7654321"
    ),
    moto_green_card_expiring: [
        { name: "expires in 10 days", acord: { vehicle: { greenCardExpiryDate: inDays(10) } }, fires: true },
        { name: "expires in 90 days", acord: { vehicle: { greenCardExpiryDate: inDays(90) } }, fires: false },
        { name: "no green card date recorded", acord: { vehicle: {} }, fires: false },
    ],

    // ── Life ─────────────────────────────────────────────────────────────
    no_beneficiaries_recorded: [
        { name: "neither path records a beneficiary", acord: { policy: {} }, fires: true },
        {
            name: "recorded on the canonical path",
            acord: { beneficiaries: [{ name: "Μαρία Παπαδοπούλου", percentage: 100 }] },
            fires: false,
        },
        {
            // The reason this rule uses all_missing rather than missing.
            name: "recorded on the lifeAndInvestment path only",
            acord: { lifeAndInvestment: { beneficiaries: ["Μαρία Παπαδοπούλου"] } },
            fires: false,
        },
        {
            name: "an EMPTY list names nobody",
            acord: { beneficiaries: [], lifeAndInvestment: { beneficiaries: [] } },
            fires: true,
        },
    ],
}

const bySlug = new Map(AUTHORED_GAP_DEFINITIONS.map((d) => [d.slug, d]))

describe("the authored gap catalogue", () => {
    it("is all rule-bearing — nothing that can never fire", () => {
        const unevaluable = AUTHORED_GAP_DEFINITIONS.filter((d) => !hasEvaluableRule(d as any)).map(
            (d) => d.slug
        )
        expect(
            unevaluable,
            "These carry no evaluable rule, so they would sit in the catalogue as " +
                "active definitions producing nothing — a capability claimed and not " +
                "delivered:\n  " + unevaluable.join("\n  ")
        ).toEqual([])
    })

    it("is entirely active — an inactive entry belongs in seed.ts, not here", () => {
        expect(AUTHORED_GAP_DEFINITIONS.filter((d) => !d.isActive).map((d) => d.slug)).toEqual([])
    })

    it("is the only source of these slugs — seed.ts does not shadow them", () => {
        // seed.ts spreads this module and then lists the deactivated AI-authored
        // definitions. If one of those ever reused a catalogue slug, the seed's
        // copy would win on upsert and silently replace a traced rule with a
        // prompt that can never fire — the Phase 3 regression, re-entering by the
        // back door.
        const seed = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf-8")
        const seedSlugs = [...seed.matchAll(/slug: '([^']+)'/g)].map((m) => m[1])
        const shadowed = AUTHORED_GAP_DEFINITIONS.map((d) => d.slug)
            .filter((slug) => seedSlugs.includes(slug))
            .sort()

        expect(
            shadowed,
            "These slugs exist BOTH in the catalogue and inline in seed.ts. The " +
                "seed's copy would overwrite the traced one:\n  " + shadowed.join("\n  ")
        ).toEqual([])
    })

    it("seed.ts activates nothing that cannot fire", () => {
        // Four ai_check definitions were still isActive: true here after Phase 3
        // deactivated them in production. The next `db seed` would have switched
        // them back on: active definitions shaped { check: \"does the policy...?\" },
        // which hasEvaluableRule() rejects, so they produce nothing while making
        // the catalogue look broader than it is.
        // Comments stripped FIRST. The comment in seed.ts that explains this very
        // bug contains the literal string `isActive: true`, so the guard matched
        // my own prose and accused a definition that is correctly inactive. This
        // is the fourth time in this programme a checker has confused a mention
        // with a use; it is apparently the default failure mode of grepping source.
        const seedRaw = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf-8")
        const seedSource = seedRaw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
        const start = seedSource.indexOf("const gaps = [")
        const block = seedSource.slice(start, seedSource.indexOf("\n    ]", start))
        // Scan slug-to-slug rather than splitting on brace lines. The first
        // version of this guard split on `\n        {\n`, chunks merged where a
        // definition was preceded by a comment, and it reported a LATER item's
        // isActive against an EARLIER item's slug — accusing home-earthquake,
        // which is correctly inactive. A guard that misattributes is worse than
        // none: it sends you to fix the wrong line.
        const marks = [...block.matchAll(/slug: '([^']+)'/g)]
        const offenders = marks
            .filter((mark, i) => {
                const start = mark.index!
                const end = i + 1 < marks.length ? marks[i + 1].index! : block.length
                const item = block.slice(start, end)
                return /ruleId: 'ai_check'/.test(item) && /isActive: true/.test(item)
            })
            .map((mark) => mark[1])
            .sort()

        expect(
            offenders,
            "These are prompts, not rules, and seed.ts marks them active:\n  " +
                offenders.join("\n  ")
        ).toEqual([])
    })

    it("has a unique slug per definition", () => {
        const slugs = AUTHORED_GAP_DEFINITIONS.map((d) => d.slug)
        expect(new Set(slugs).size).toBe(slugs.length)
    })

    it("never says 'not covered' about a rule that fires on silence", () => {
        // A `missing` rule asks whether a value was RECORDED. Wording its finding
        // as absence of cover is the specific mistake CLAUDE.md forbids.
        const offenders: string[] = []
        for (const def of AUTHORED_GAP_DEFINITIONS) {
            const logic = def.detectionLogic as any
            const rules: any[] = Array.isArray(logic?.rules) ? logic.rules : [logic]
            const firesOnSilence = rules.some(
                (r) => r?.operator === "missing" || r?.operator === "all_missing"
            )
            if (!firesOnSilence) continue
            const text = `${def.title} ${def.description}`.toLowerCase()
            if (/not covered|is not included|does not cover/.test(text)) offenders.push(def.slug)
        }
        expect(
            offenders,
            "These fire when a field was not extracted, but word the finding as " +
                "absence of COVER. Say 'not recorded':\n  " + offenders.join("\n  ")
        ).toEqual([])
    })
})

describe("every rule, traced against a document", () => {
    for (const [slug, cases] of Object.entries(TRACE)) {
        describe(slug, () => {
            const def = bySlug.get(slug)

            it("exists in the catalogue", () => {
                expect(def, `${slug} is traced here but not in the catalogue`).toBeDefined()
            })

            for (const testCase of cases) {
                it(`${testCase.fires ? "FIRES" : "stays quiet"} — ${testCase.name}`, () => {
                    const policy = policyFor(def!.lineOfBusiness, testCase.acord)
                    expect(evaluateGapLogic(policy, def as any)).toBe(testCase.fires)
                })
            }
        })
    }

    it("EVERY_SLUG_TRACED — no rule reaches production untraced", () => {
        const untraced = AUTHORED_GAP_DEFINITIONS.map((d) => d.slug)
            .filter((slug) => !TRACE[slug])
            .sort()

        expect(
            untraced,
            "These are in the live catalogue with no fixture proving what they do. " +
                "A rule nobody has traced is a claim nobody has checked:\n  " +
                untraced.join("\n  ")
        ).toEqual([])
    })
})
