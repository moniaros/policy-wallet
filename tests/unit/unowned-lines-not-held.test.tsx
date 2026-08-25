import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { assembleRiskGraph } from "@/lib/services/risk-graph/service"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { calculateScoreFromAssessments } from "@/lib/services/gap-engine/protection-score"
import { buildBranchOverview } from "@/lib/insurance/branch-page"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { el } from "@/lib/i18n/translations/el"
import { RiskGraphPanel } from "@/components/coverage/RiskGraphPanel"
import { ProductBranchCard } from "@/components/branches/ProductBranchCard"
import { BranchCoverageMap } from "@/components/branches/BranchCoverageMap"

/**
 * §2.2 — the product must not claim exposure for products the customer does
 * not own. "Not owning a product is not a gap. Unowned lines render as *not
 * held*, in a neutral register, never in the visual language of a finding,
 * and never with a red chip."
 *
 * The customer must still LEARN they hold no pet cover — this is a change of
 * register, not a deletion (§2.14). So the guard asserts three things about
 * every surface that renders an ownership-derived state:
 *
 *   1. an unowned line never renders in the finding register (red/rose
 *      palette, or the finding vocabulary «Απροστάτευτο» / «Πιθανό κενό»);
 *   2. the *not held* statement is present in plain text — colour is never
 *      the sole carrier (WCAG 1.4.1);
 *   3. the distinction comes from whether a policy EXISTS in the wallet for
 *      that line — a held-but-lapsed line stays a red finding. The engine
 *      exposes the fact (`GraphRiskView.heldInLine`, `policyCount` /
 *      `hasAnyPolicy` on the branch side); presentation never guesses.
 *
 * THE UNIVERSE (D-005 — a guard states what it walks and what it claims):
 * every .ts/.tsx file under app/, components/ and lib/, enumerated from the
 * filesystem at test time, whose comment-stripped source references an
 * ownership-state symbol (BranchTileState, buildBranchOverview,
 * deriveBranchState, GraphRiskView, RiskGraphPanel, assembleRiskGraph). The
 * enumeration test fails when a NEW consumer appears, so it must be brought
 * under this guard (or exempted here, with a reason) before it ships.
 * Deliberately NOT covered: tests/, scripts/, docs/, and surfaces that do not
 * consume these types (the landing page's demo wallet renders findings about
 * a fictional HELD policy — §2.2 is about ownership, not vocabulary).
 *
 * PROBES: tests/fixtures/guard-probes/unowned-*-finding-register.html.txt are
 * the pre-fix rendered markup of both surfaces, captured from the real
 * components before the change (2026-08-24). The probe tests feed them to the
 * same detector the live assertions use — rendered behaviour in, verdict out
 * — proving the guard still turns red on the exact defect it was built for.
 */

// ── The finding register, defined ────────────────────────────────────

const FINDING_TEXT = /Απροστάτευτο|Unprotected|Πιθανό κενό|Possible gap/
const FINDING_PALETTE = /(?:^|\s)(?:bg|text|border)-(?:red|rose)-\d{2,3}(?:\/\d+)?\b/

/** Every way this DOM subtree speaks the finding register. */
function findingRegisterViolations(root: Element): string[] {
    const violations: string[] = []
    const text = root.textContent ?? ""
    const textHit = text.match(FINDING_TEXT)
    if (textHit) violations.push(`finding vocabulary in text: "${textHit[0]}"`)
    for (const node of [root, ...Array.from(root.querySelectorAll("*"))]) {
        const cls = node.getAttribute("class") ?? ""
        const paletteHit = ` ${cls}`.match(FINDING_PALETTE)
        if (paletteHit) violations.push(`finding palette: "${paletteHit[0].trim()}" on <${node.tagName.toLowerCase()}>`)
        for (const attr of ["title", "aria-label"]) {
            const val = node.getAttribute(attr)
            const attrHit = val?.match(FINDING_TEXT)
            if (attrHit) violations.push(`finding vocabulary in ${attr}: "${attrHit[0]}"`)
        }
    }
    return violations
}

// ── The §2.2 reproduction shape (mirrors applyUnownedLinesProfileFixture) ──

const UNOWNED_PROFILE = {
    dependentsCount: 2,
    childrenCount: 0,
    employmentStatus: "employed",
    hasPets: true,
    petsCount: 2,
    cyberExposure: "moderate",
    vehiclesCount: 1,
    annualIncome: 32000,
    // The run's verification saw FOUR unowned rows — tenant-contents needs a
    // declared rented residence to bind, which the DB fixture's account
    // carries from earlier provisioning.
    residenceType: "rented",
    answeredFields: [
        "dependentsCount",
        "childrenCount",
        "employmentStatus",
        "hasPets",
        "petsCount",
        "cyberExposure",
        "vehiclesCount",
        "annualIncome",
        "residenceType",
    ],
}

const FUTURE = new Date(Date.now() + 200 * 24 * 3600 * 1000)
const PAST = new Date(Date.now() - 45 * 24 * 3600 * 1000)

const ACTIVE_WALLET = [
    { id: "pol-motor", lineOfBusiness: "motor", status: "active", insurerName: "Test Insurer", endDate: FUTURE, acordData: null },
    { id: "pol-health", lineOfBusiness: "health", status: "active", insurerName: "Test Insurer", endDate: FUTURE, acordData: null },
]

/** Same profile, but the ONLY motor policy has lapsed: held, not covered. */
const LAPSED_WALLET = [
    { id: "pol-motor", lineOfBusiness: "motor", status: "active", insurerName: "Test Insurer", endDate: PAST, acordData: null },
]

function renderPanel(wallet: typeof ACTIVE_WALLET) {
    const result = assembleRiskGraph(UNOWNED_PROFILE, wallet)
    const rendered = render(
        <RiskGraphPanel
            risks={result.views}
            summary={{
                nodeCount: result.summary.nodeCount,
                assets: result.summary.assets,
                obligations: result.summary.obligations,
                dependants: result.summary.dependants,
            }}
            language="el"
        />
    )
    return { result, ...rendered }
}

const NOT_HELD_LABEL = "Χωρίς ασφαλιστήριο"

// ── 1. The risk graph panel ──────────────────────────────────────────

describe("§2.2 — the risk graph renders unowned lines as not held, never as findings", () => {
    it("exposes ownership as a fact on every view — not a heuristic", () => {
        const { result } = renderPanel(ACTIVE_WALLET)
        const unowned = result.views.filter((v) => v.heldInLine === 0 && v.state === "unprotected")
        // The §2.2 reproduction, all four rows: declared exposures with no
        // policy of ANY status in the wallet for the line.
        expect(
            unowned.map((v) => v.riskId).sort(),
            "the engine must expose heldInLine so presentation can distinguish 'nothing covers this' from 'you do not hold this product'"
        ).toEqual(["cyber_fraud", "home_contents_tenant", "life_dependents", "pet_costs"])
        // The held lines carry their wallet count, whatever their state.
        expect(result.views.find((v) => v.riskId === "motor_liability")?.heldInLine).toBe(1)
    })

    it("an all-unowned wallet renders zero finding-register markers", () => {
        const { container } = renderPanel(ACTIVE_WALLET)
        expect(findingRegisterViolations(container)).toEqual([])
    })

    it("the not-held statement is plain text on every unowned row (WCAG 1.4.1)", () => {
        const { result, container } = renderPanel(ACTIVE_WALLET)
        const unowned = result.views.filter((v) => v.heldInLine === 0 && v.state === "unprotected")
        expect(unowned.length).toBeGreaterThanOrEqual(3)
        const rows = Array.from(container.querySelectorAll("li"))
        for (const view of unowned) {
            const row = rows.find((r) => r.textContent?.includes(view.name.el))
            expect(row, `no rendered row for unowned risk ${view.riskId}`).toBeTruthy()
            expect(
                row!.textContent,
                `${view.riskId} is unowned and must say so in words`
            ).toContain(NOT_HELD_LABEL)
        }
    })

    it("unowned lines are counted as not held, never among the findings", () => {
        const { container } = renderPanel(ACTIVE_WALLET)
        const chips = Array.from(container.querySelectorAll("button"))
        // No finding chip exists at all for this wallet…
        for (const chip of chips) {
            expect(chip.textContent ?? "").not.toMatch(FINDING_TEXT)
        }
        // …and the four unowned lines are counted under their own register.
        const notHeldChip = chips.find((c) => c.textContent?.includes(NOT_HELD_LABEL))
        expect(notHeldChip, "a not-held filter chip must exist").toBeTruthy()
        expect(notHeldChip!.textContent).toContain("4")
    })

    it("a held-but-lapsed line STAYS a red finding — ownership, not copy, decides", () => {
        const { result, container } = renderPanel(LAPSED_WALLET)
        const motor = result.views.find((v) => v.riskId === "motor_liability")
        expect(motor?.state).toBe("unprotected")
        expect(motor?.heldInLine).toBe(1)
        const rows = Array.from(container.querySelectorAll("li"))
        const motorRow = rows.find((r) => r.textContent?.includes(motor!.name.el))
        expect(motorRow).toBeTruthy()
        expect(
            motorRow!.textContent,
            "an expired policy is a held product — its exposure is a finding, not a not-held"
        ).toMatch(/Απροστάτευτο/)
        // And the unowned lines beside it still render neutrally.
        const pet = result.views.find((v) => v.riskId === "pet_costs")!
        const petRow = rows.find((r) => r.textContent?.includes(pet.name.el))!
        expect(petRow.textContent).toContain(NOT_HELD_LABEL)
        expect(petRow.textContent).not.toMatch(FINDING_TEXT)
    })
})

// ── 2. The /branches tiles and the dashboard coverage map ────────────

function overviewFor(wallet: Array<{ id: string; lineOfBusiness: string; status: string; endDate: Date | null }>) {
    const ctx = toLifeContext(UNOWNED_PROFILE as any)
    const assessments = assessRisks(
        ctx,
        wallet.map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: p.status }))
    )
    const activeLobs = [...new Set(wallet.filter((p) => p.status === "active").map((p) => p.lineOfBusiness))]
    const score = calculateScoreFromAssessments(assessments, activeLobs, [])
    return buildBranchOverview(wallet, score.expectedLines)
}

const branchLabels = el.branches as Record<string, string>
const stateLabel = (state: string): string =>
    ({
        covered: branchLabels.statusCovered,
        attention: branchLabels.statusAttention,
        neutral: branchLabels.statusNeutral,
        // statusGap is the pre-fix key; the fallback keeps this guard's red
        // demonstration reproducible against the committed probes.
        not_held: branchLabels.statusNotHeld ?? branchLabels.statusGap,
    })[state] ??
    branchLabels.statusGap ??
    ""

describe("§2.2 — /branches renders unowned lines as not held, never as findings", () => {
    const wallet = [
        { id: "pol-motor", lineOfBusiness: "motor", status: "active", endDate: FUTURE },
        { id: "pol-health", lineOfBusiness: "health", status: "active", endDate: FUTURE },
    ]

    it("expected-but-unowned branches exist for this profile (the reproduction is live)", () => {
        const overview = overviewFor(wallet)
        const unowned = overview.filter(
            (e) => e.policyCount === 0 && !["covered", "attention", "neutral"].includes(e.state)
        )
        expect(unowned.map((e) => e.branch.id).sort()).toEqual(["cyber", "life", "pet"])
    })

    it("an unowned branch tile carries no finding register, and says not-held in words", () => {
        const overview = overviewFor(wallet)
        const unowned = overview.filter(
            (e) => e.policyCount === 0 && !["covered", "attention", "neutral"].includes(e.state)
        )
        expect(unowned.length).toBeGreaterThanOrEqual(3)
        expect(
            branchLabels.statusNotHeld,
            "unowned branches need a neutral not-held label (branches.statusNotHeld)"
        ).toBeTruthy()
        for (const entry of unowned) {
            const { container, unmount } = render(
                <ProductBranchCard
                    icon={getBranchIcon(entry.branch.id)}
                    href={`/branches/${entry.branch.id}`}
                    title={entry.branch.label.el}
                    tagline={entry.branch.label.el}
                    state={entry.state}
                    stateLabel={stateLabel(entry.state)}
                    policyCount={entry.policyCount}
                    policyCountLabel=""
                />
            )
            expect(
                findingRegisterViolations(container),
                `${entry.branch.id}: unowned, must not render as a finding`
            ).toEqual([])
            expect(container.textContent).toContain(branchLabels.statusNotHeld)
            unmount()
        }
    })

    it("the dashboard coverage map paints no finding dot for an unowned branch", () => {
        const overview = overviewFor(wallet)
        const entries = overview.map((entry) => ({
            id: entry.branch.id,
            icon: getBranchIcon(entry.branch.id),
            label: entry.branch.label.el,
            state: entry.state,
            stateLabel: stateLabel(entry.state),
        }))
        const { container } = render(
            <BranchCoverageMap entries={entries} labels={{ kicker: "Κλάδοι", viewAll: "Όλοι" }} />
        )
        expect(findingRegisterViolations(container)).toEqual([])
    })

    it("a lapsed policy's branch is attention — held products keep their finding register", () => {
        const overview = overviewFor([
            { id: "pol-motor", lineOfBusiness: "motor", status: "expired", endDate: PAST },
        ])
        expect(overview.find((e) => e.branch.id === "motor")?.state).toBe("attention")
    })
})

// ── 3. The committed probes — proof this guard can turn red ──────────

describe("§2.2 guard probes — the pre-fix markup still trips the detector", () => {
    const PROBE_DIR = "tests/fixtures/guard-probes"
    const PROBES = [
        "unowned-riskgraph-row-finding-register.html.txt",
        "unowned-branch-tile-finding-register.html.txt",
        "unowned-coverage-map-tile-finding-register.html.txt",
    ] as const

    it.each([...PROBES])("%s renders as a finding and is caught", (name) => {
        const html = readFileSync(join(PROBE_DIR, name), "utf-8")
        const host = document.createElement("div")
        host.innerHTML = html
        const violations = findingRegisterViolations(host)
        expect(violations.length, "the detector must flag the pre-fix rendering").toBeGreaterThan(0)
    })

    it("the probes exercise both carriers — vocabulary and palette", () => {
        const all = PROBES.flatMap((name) => {
            const host = document.createElement("div")
            host.innerHTML = readFileSync(join(PROBE_DIR, name), "utf-8")
            return findingRegisterViolations(host)
        })
        expect(all.some((v) => v.startsWith("finding vocabulary"))).toBe(true)
        expect(all.some((v) => v.startsWith("finding palette"))).toBe(true)
    })
})

// ── 4. The universe, enumerated from the filesystem (D-005) ──────────

describe("§2.2 — every ownership-state surface is known to this guard", () => {
    const ROOTS = ["app", "components", "lib"]
    const MARKERS = /\b(?:BranchTileState|buildBranchOverview|deriveBranchState|GraphRiskView|RiskGraphPanel|assembleRiskGraph)\b/

    // The authorization guard once matched a mention inside a comment —
    // enumerate on comment-stripped source only.
    const stripComments = (src: string) =>
        src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1")

    function walk(dir: string): string[] {
        return readdirSync(dir).flatMap((name) => {
            const full = join(dir, name)
            if (statSync(full).isDirectory()) return walk(full)
            return /\.(ts|tsx)$/.test(name) ? [full] : []
        })
    }

    it("the set of consumers matches the set this guard covers", () => {
        const found = ROOTS.flatMap(walk)
            .filter((file) => MARKERS.test(stripComments(readFileSync(file, "utf-8"))))
            .sort()
        expect(found).toEqual(
            [
                // Renders GraphRiskView rows — asserted above (§1).
                "components/coverage/RiskGraphPanel.tsx",
                // Renders BranchTileState — asserted above (§2).
                "components/branches/ProductBranchCard.tsx",
                "components/branches/BranchCoverageMap.tsx",
                // Pass data/labels into the components asserted above; they
                // render no ownership state of their own.
                "app/(protected)/dashboard/PolicyholderHome.tsx",
                "app/(protected)/protection/page.tsx",
                // /protection lenses (V2-P2-01): render THROUGH ProductBranchCard
                // and RiskGraphPanel (both asserted above); their own §2.2
                // behaviour — not-held vs never-assessed registers, no finding
                // vocabulary — is asserted on rendered output by
                // protection-surface-ledger.test.tsx (B-05, R-03).
                "components/protection/ProtectionBranchLens.tsx",
                "components/protection/ProtectionRiskLens.tsx",
                // Definitions and plumbing — no rendering.
                "lib/insurance/branch-page.ts",
                "lib/services/gap-engine/index.ts",
                "lib/services/risk-dna/service.ts",
                "lib/services/risk-graph/present.ts",
                "lib/services/risk-graph/service.ts",
            ].sort()
        )
    })
})
