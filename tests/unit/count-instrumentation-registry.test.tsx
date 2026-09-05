/**
 * COUNT-CONSISTENCY INSTRUMENTATION — §6.7 (V2-P1-11).
 *
 * Two invariants, guarded together because each is worthless without the other:
 *
 *  1. **The vocabulary cannot fork.** Every `data-count` / `data-fact` key used
 *     anywhere in the product is registered in lib/instrumentation/count-keys.ts
 *     (the machine mirror of docs/transformation/INSTRUMENTATION-PLAN.md). A key
 *     coined at a render site is invisible to the plan and un-comparable across
 *     surfaces — which is how «5 έχουν λήξει» and «1 έχει ήδη λήξει» coexisted.
 *
 *  2. **One key, one value.** For one portfolio, surfaces that render the same
 *     key render the same number — asserted on RENDERED DOM, with the real
 *     derivations (derivePortfolioCounts, getPolicyStatusView via PolicyWallet,
 *     assembleWatch, gapsOnActiveCoverage), never on re-implemented arithmetic.
 *     Where two numbers legitimately differ they carry DIFFERENT keys and their
 *     labels state the difference (30-day vs 45-day window; «Ενεργά» vs «Σε
 *     ισχύ σήμερα»).
 *
 * THE UNIVERSE (D-005 — a guard states what it walks and what it claims):
 *
 *   files — every .ts/.tsx file under app/, components/ and lib/, enumerated
 *   recursively from the filesystem at test time (the three roots that render
 *   UI or compose UI strings; tests/, scripts/, prisma/, docs/ are not shipped
 *   to users). lib/instrumentation/count-keys.ts itself is excluded — it IS
 *   the registry.
 *
 *   extraction — three shapes, matching how keys reach the DOM in this repo:
 *     (a) literal attributes:            data-count="ns.key" / data-fact="ns.key"
 *     (b) key props / part fields:       countKey|factKey|usedCountKey|
 *         limitCountKey followed by a string literal (JSX or object form)
 *     (c) key maps: quoted ns.key values within 600 chars of an identifier
 *         containing COUNT_KEY / FACT_KEY (e.g. the hero's KIND_COUNT_KEY map)
 *   A DYNAMIC data-count expression whose keys come from anywhere else is
 *   invisible to (a)–(c) — route new dynamic keys through a *_COUNT_KEY map or
 *   a countKey prop, which is also what keeps them greppable for humans.
 *
 *   probe — tests/fixtures/guard-probes/count-key-unregistered.tsx.txt carries
 *   all three shapes with unregistered keys; the extractor must find all four
 *   or the guard has gone blind.
 *
 * WHAT THIS DELIBERATELY DOES NOT CLAIM: page-level completeness (that every
 * rendered numeral carries an attribute) is measured by the Playwright value
 * scan (tests/measure/dashboard.ts countConsistency), which walks real pages;
 * a jsdom test cannot enumerate a Next.js page tree.
 */

import { afterAll, beforeAll, describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import fs from "node:fs"
import path from "node:path"
import { CalendarClock } from "lucide-react"

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import {
    COUNT_KEYS,
    FACT_KEYS,
    SUBJECT_SCOPED_KEYS,
} from "@/lib/instrumentation/count-keys"
import { derivePortfolioCounts, portfolioFacts } from "@/lib/dashboard/portfolio-summary"
import { gapsOnActiveCoverage } from "@/lib/gaps/gap-universe"
import { assembleWatch } from "@/lib/services/risk-dna/service"
import { ProtectionStatusHero } from "@/components/dashboard/home/ProtectionStatusHero"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"
import { RenewalsTimelineCard } from "@/components/dashboard/home/RenewalsTimelineCard"
import { RiskIntelligenceView } from "@/components/risk-dna/RiskIntelligenceView"
import { PolicyWallet } from "@/components/wallet/PolicyWallet"
import type { Policy } from "@/components/wallet/types"
import { partitionByProvenance } from "@/lib/gaps/provenance"

const REPO_ROOT = path.resolve(__dirname, "../..")
const SCAN_ROOTS = ["app", "components", "lib"]
const REGISTRY_FILE = path.join("lib", "instrumentation", "count-keys.ts")

// ── Extraction ────────────────────────────────────────────────────────

interface FoundKey {
    key: string
    kind: "count" | "fact"
    where: string
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full, out)
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
    }
    return out
}

/** The three extraction shapes the universe declares. */
export function extractInstrumentationKeys(content: string, where: string): FoundKey[] {
    const found: FoundKey[] = []

    // (a) literal attributes
    for (const m of content.matchAll(/data-(count|fact)="([^"]+)"/g)) {
        found.push({ key: m[2], kind: m[1] === "count" ? "count" : "fact", where })
    }

    // (b) key props / part fields — JSX (countKey="…") and object ({ countKey: "…" })
    for (const m of content.matchAll(
        /\b(countKey|factKey|usedCountKey|limitCountKey)\s*[:=]\s*\{?\s*["'`]([^"'`]+)["'`]/g
    )) {
        found.push({ key: m[2], kind: m[1].toLowerCase().includes("fact") ? "fact" : "count", where })
    }

    // (c) key maps: ns.key literals near a *_COUNT_KEY / *_FACT_KEY identifier
    for (const m of content.matchAll(/\b\w*(?:COUNT_KEY|FACT_KEY)\w*\b/g)) {
        const windowText = content.slice(m.index ?? 0, (m.index ?? 0) + 600)
        for (const inner of windowText.matchAll(/["'`]([a-z][a-zA-Z]+\.[a-zA-Z][a-zA-Z0-9]+)["'`]/g)) {
            const kind = m[0].includes("FACT_KEY") ? "fact" : "count"
            found.push({ key: inner[1], kind, where })
        }
    }

    return found
}

const isRegistered = (found: FoundKey): boolean =>
    found.kind === "count"
        ? Object.prototype.hasOwnProperty.call(COUNT_KEYS, found.key)
        : Object.prototype.hasOwnProperty.call(FACT_KEYS, found.key)

// ── Shared render helpers ─────────────────────────────────────────────

function withProviders(ui: React.ReactElement) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>{ui}</TranslationsProvider>
        </LanguageProvider>
    )
}

/** Group every [data-count] in a container by key(+subject) → distinct values. */
function scanRenderedCounts(container: HTMLElement): Map<string, Set<number>> {
    const byKey = new Map<string, Set<number>>()
    container.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const key = el.getAttribute("data-count") || ""
        const subject = el.getAttribute("data-count-subject")
        const groupKey = subject ? `${key}#${subject}` : key
        const first = (el.textContent || "").match(/\d+/)
        if (!first) return
        const set = byKey.get(groupKey) ?? new Set<number>()
        set.add(Number(first[0]))
        byKey.set(groupKey, set)
    })
    return byKey
}

// ── The §2.8 portfolio, rebuilt as a fixture ─────────────────────────
//
// 29 held policies: 5 expired, 5 expiring within 30 days, 1 with an
// unreadable term, 18 strictly active — and, on the ANALYSIS axis, 2 never
// analysed. The portfolio the audit described: dashboard «29 / 5 / 5 / 2»,
// wallet «18 ενεργά». The reviewer's 29−5−5−2 = 17 subtracted an analysis
// fact from a lifecycle partition; the real residual was the 1
// unknown-duration policy, which no surface stated.

const NOW = new Date("2026-08-25T10:00:00Z")

/**
 * Pin the system clock to NOW for every render in this file. The hero is
 * HANDED NOW (derivePortfolioCounts(rows, NOW)), but PolicyWallet derives
 * status from the real clock inside getPolicyStatusView — so with fixture
 * expiries fixed relative to NOW, the file decayed: soon-0 expires NOW+5d
 * (2026-08-30), and from 2026-08-31 the wallet counted it expired while the
 * hero still said expiring (5 vs 4 — first went red the night the calendar
 * rolled, with no code change). One portfolio, ONE INSTANT, is the §6.7
 * invariant's own premise. Only Date is faked; timers stay real.
 */
beforeAll(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
})
afterAll(() => {
    vi.useRealTimers()
})
const iso = (daysFromNow: number) => {
    const d = new Date(NOW.getTime() + daysFromNow * 86_400_000)
    return d.toISOString().slice(0, 10)
}

interface FixtureRow {
    id: string
    status: string
    policyNumber: string | null
    insurerName: string | null
    lineOfBusiness: string
    endDate: Date
    acordData: unknown
    lastAnalyzedAt: Date | null
    premiumAmount: number | null
}

function buildFixturePortfolio(): FixtureRow[] {
    const rows: FixtureRow[] = []
    const push = (id: string, expiryDays: number | null, overrides: Partial<FixtureRow> = {}) =>
        rows.push({
            id,
            status: "active",
            policyNumber: `PN-${id}`,
            insurerName: "Ethniki",
            lineOfBusiness: "motor",
            // The COLUMN is deliberately wrong (upload-day placeholder, far
            // future) — resolvePolicyLifecycle must read the envelope instead.
            endDate: new Date("2030-01-01"),
            acordData:
                expiryDays === null
                    ? { policy: { expirationDate: "not-a-date" } }
                    : { policy: { expirationDate: iso(expiryDays) } },
            lastAnalyzedAt: new Date("2026-08-01"),
            premiumAmount: 300,
            ...overrides,
        })

    for (let i = 0; i < 5; i++) push(`exp-${i}`, -30 - i) // expired
    for (let i = 0; i < 5; i++) push(`soon-${i}`, 5 + i) // expiring_soon (≤30)
    push("unknown-0", null) // unknown_duration
    for (let i = 0; i < 18; i++) push(`act-${i}`, 200 + i) // active
    // The ANALYSIS axis overlaps the lifecycle axis freely: one never-analysed
    // policy is active, one is expired.
    rows.find((r) => r.id === "act-0")!.lastAnalyzedAt = null
    rows.find((r) => r.id === "exp-0")!.lastAnalyzedAt = null
    return rows
}

const toWalletPolicy = (row: FixtureRow): Policy => ({
    id: row.id,
    policyNumber: row.policyNumber ?? "",
    insurerName: row.insurerName ?? "",
    insurerLogo: null,
    lineOfBusiness: "motor",
    status: row.status as Policy["status"],
    startDate: "2025-09-01",
    endDate: row.endDate.toISOString(),
    lastUpdated: "2026-08-01",
    sharedWithAgents: [],
    coverageHighlights: [],
    documents: [],
    acordData: row.acordData,
    premiumAmount: row.premiumAmount ?? undefined,
    premiumCurrency: "EUR",
})

// ── 1. Registry discipline ────────────────────────────────────────────

describe("every instrumentation key in the product is registered (D-005 universe: app/, components/, lib/)", () => {
    const files = SCAN_ROOTS.flatMap((root) => walk(path.join(REPO_ROOT, root))).filter(
        (file) => !file.endsWith(REGISTRY_FILE)
    )

    it("walks a real universe (the roots exist and hold files)", () => {
        expect(files.length).toBeGreaterThan(300)
    })

    it("finds no unregistered data-count / data-fact / countKey key anywhere", () => {
        const offenders: FoundKey[] = []
        for (const file of files) {
            const content = fs.readFileSync(file, "utf8")
            if (!/data-count|data-fact|countKey|factKey|COUNT_KEY|FACT_KEY/.test(content)) continue
            for (const found of extractInstrumentationKeys(content, path.relative(REPO_ROOT, file))) {
                if (!isRegistered(found)) offenders.push(found)
            }
        }
        expect(
            offenders,
            `Unregistered instrumentation key(s). Register them in lib/instrumentation/count-keys.ts ` +
                `AND docs/transformation/INSTRUMENTATION-PLAN.md (same change), or use a registered key:\n` +
                offenders.map((o) => `  ${o.kind}:${o.key} — ${o.where}`).join("\n")
        ).toEqual([])
    })

    it("PROBE: the extractor finds all four coined keys in the committed probe fixture", () => {
        const probe = fs.readFileSync(
            path.join(REPO_ROOT, "tests/fixtures/guard-probes/count-key-unregistered.tsx.txt"),
            "utf8"
        )
        const found = extractInstrumentationKeys(probe, "probe")
        const unregistered = found.filter((f) => !isRegistered(f)).map((f) => f.key)
        expect(new Set(unregistered)).toEqual(
            new Set([
                "portfolio.bogusCount",
                "policy.inventedFact",
                "entitlement.fabricatedLimit",
                "gap.mintedSeverityCount",
            ])
        )
    })

    it("every count key is documented (a registry entry is a definition, not a name)", () => {
        for (const [key, definition] of Object.entries(COUNT_KEYS)) {
            expect(definition.length, `${key} has no definition`).toBeGreaterThan(10)
        }
        for (const key of SUBJECT_SCOPED_KEYS) {
            expect(
                key in COUNT_KEYS || key in FACT_KEYS,
                `${key} is subject-scoped but not registered`
            ).toBe(true)
        }
    })
})

// ── 2. One portfolio, every surface, rendered ─────────────────────────

describe("§2.8: one portfolio renders one set of numbers across surfaces", () => {
    const rows = buildFixturePortfolio()
    const counts = derivePortfolioCounts(rows, NOW)

    it("the shared derivation reproduces the audited shape (29 / 5 / 5 / 2)", () => {
        expect(counts).toEqual({
            total: 29,
            expired: 5,
            expiringSoon: 5,
            neverAnalysed: 2,
            analysisFailed: 0,
            // B1.5: the fixture's branches are all authored, so nothing is
            // unassessed and the 27 analysed rows are the assessed denominator.
            unassessed: 0,
            assessed: 27,
        })
    })

    it("a soft-deleted row neither counts nor shifts any bucket", () => {
        const withDeleted = [
            ...rows,
            {
                ...rows[0],
                id: "deleted-0",
                status: "deleted",
            },
        ]
        expect(derivePortfolioCounts(withDeleted, NOW)).toEqual(counts)
    })

    it("hero and wallet render portfolio.* keys that agree — and the wallet's 18 is the real residual, not 29−5−5−2", () => {
        // Dashboard hero — the real fact pipeline (derivePortfolioCounts →
        // portfolioFacts), rendered.
        const facts = portfolioFacts(counts).map(({ kind, count }) => ({
            kind,
            count,
            label: `${count} ${kind}`,
        }))
        const hero = withProviders(
            <ProtectionStatusHero
                hasPolicies
                facts={facts}
                areasLine={null}
                openRecommendationCount={0}
                language="el"
                labels={{ kicker: "k", cta: "c", emptyTitle: "", emptyBody: "", emptyCta: "" }}
            />
        )
        // Wallet — the real client derivation (getPolicyStatusView inside
        // PolicyWallet), rendered from the same fixture.
        const wallet = withProviders(
            <PolicyWallet policies={rows.map(toWalletPolicy)} onViewPolicy={() => {}} />
        )

        const heroCounts = scanRenderedCounts(hero.container)
        const walletCounts = scanRenderedCounts(wallet.container)

        expect(heroCounts.get("portfolio.policyCount")).toEqual(new Set([29]))
        expect(walletCounts.get("portfolio.policyCount")).toEqual(new Set([29]))
        expect(heroCounts.get("portfolio.expiredCount")).toEqual(new Set([5]))
        expect(heroCounts.get("portfolio.expiringCount")).toEqual(new Set([5]))
        expect(walletCounts.get("portfolio.expiringCount")).toEqual(new Set([5]))
        expect(heroCounts.get("portfolio.neverAnalysedCount")).toEqual(new Set([2]))

        // THE 18-vs-17 VERDICT. «Ενεργά 18» is lifecycle arithmetic that adds
        // up inside its own dimension: 29 total − 5 expired − 5 expiring − 1
        // unknown-duration = 18, and attention (5+5+1=11) + active = 29. The
        // reviewer's 17 subtracted «2 δεν έχουν αναλυθεί» — an ANALYSIS fact —
        // from a lifecycle partition; never-analysed overlaps active/expired
        // freely, so 17 is not a count of anything.
        expect(walletCounts.get("portfolio.activeCount")).toEqual(new Set([18]))
        expect(walletCounts.get("portfolio.attentionCount")).toEqual(new Set([11]))

        // No shared key disagrees between the two surfaces.
        for (const [key, heroValues] of heroCounts) {
            const walletValues = walletCounts.get(key)
            if (!walletValues) continue
            expect([...heroValues], `key ${key} disagrees between hero and wallet`).toEqual([
                ...walletValues,
            ])
        }
    })

    it("the risk watch renders the SAME expiredCount as the dashboard — from the lifecycle, not the raw column", () => {
        // Raw endDate columns in the fixture all read 2030 (the placeholder
        // trap): a watch reading the column sees nothing expired. §2.8's
        // «1 έχει ήδη λήξει» beside «5 έχουν λήξει» was exactly this.
        const watch = assembleWatch({
            profile: null,
            policies: rows.map((row) => ({
                id: row.id,
                lineOfBusiness: row.lineOfBusiness,
                status: row.status,
                insurerName: row.insurerName,
                endDate: row.endDate,
                acordData: row.acordData,
            })),
            latestVersion: null,
            lastAssessedAt: null,
            now: NOW,
        })

        const view = withProviders(
            <RiskIntelligenceView
                language="el"
                health={{
                    index: null,
                    band: "unknown",
                    components: [],
                    whatChanged: null,
                    whyItMatters: { en: "why", el: "γιατί" },
                    nextAction: null,
                    confidence: "low",
                }}
                household={{
                    memberCount: 1,
                    dependantCount: 0,
                    assetCount: 0,
                    obligationCount: 0,
                    sharedExposures: [],
                    whyItMatters: { en: "why", el: "γιατί" },
                    nextAction: null,
                }}
                dimensions={[]}
                trends={[]}
                watch={watch}
                predictions={[]}
            />
        )

        const rendered = scanRenderedCounts(view.container)
        expect(
            rendered.get("portfolio.expiredCount"),
            "the watch must state the lifecycle's expired count"
        ).toEqual(new Set([counts.expired]))
        // The 45-day window is its OWN key — the fixture's 5 expiring-soon
        // policies (5–9 days out) all fall inside 45 days too.
        expect(rendered.get("portfolio.expiringWithin45Count")).toEqual(new Set([5]))
        // And the copy states the window, so the difference from the 30-day
        // count is readable, not just machine-checkable.
        expect(view.container.textContent).toContain("45")
    })

    it("the gap tally counts only gaps on active coverage — the same universe /coverage-insights states", () => {
        const gaps = [
            { id: "g1", policyId: "act-0", severity: "critical" },
            { id: "g2", policyId: "act-1", severity: "high" },
            { id: "g3", policyId: "soon-0", severity: "medium" },
            // On an EXPIRED policy: stays on that policy's own page, never in
            // the portfolio tally (the dashboard's 43 vs the page's 33).
            { id: "g4", policyId: "exp-0", severity: "critical" },
            // Profile-level: no policy can lapse it away.
            { id: "g5", policyId: null, severity: "low" },
        ]
        const live = gapsOnActiveCoverage(gaps, rows, NOW)
        expect(live.map((g) => g.id).sort()).toEqual(["g1", "g2", "g3", "g5"])

        // Provenance (B3): the tile counts CLASSIFIED findings only. With every
        // authored check still under review, no chip renders and the tile states
        // that findings under review are not counted — a fact, never a number.
        const groups = partitionByProvenance(live, (g) => (g as { definition?: { slug?: string | null } | null }).definition?.slug ?? null)
        const counts = { legislative: 0, contractual: 0, market: groups.market.length, underReview: groups.underReview.length }
        const widget = withProviders(
            <CoverageGapsWidget
                counts={counts}
                labels={{
                    kicker: "Κενά κάλυψης",
                    noGaps: "—",
                    provenance: { legislative: "νομοθετικά", contractual: "συμβατικά", market: "πρακτική αγοράς" },
                    underReviewOmitted: "Ευρήματα υπό αξιολόγηση δεν μετρούν εδώ.",
                    underReviewLink: "Δείτε τα",
                    note: null,
                    groupLabel: "Ανοιχτά ευρήματα",
                }}
            />
        )
        const rendered = scanRenderedCounts(widget.container)
        expect([...rendered.keys()].filter((k) => k.startsWith("gap.provenanceCount"))).toEqual([])
        expect(widget.container.querySelector('[data-fact="gap.underReviewOmitted"]')).not.toBeNull()
        // The expired policy's gap did NOT enter the universe.
        expect(counts.underReview).toBe(live.length)
        expect(live.length).toBe(4)
    })

    it("the renewals header states the window's count, not the capped list length", () => {
        const items = Array.from({ length: 6 }, (_, i) => ({
            id: `soon-${i}`,
            insurerName: "Ethniki",
            icon: CalendarClock,
            titleLabel: `Ανανέωση σε ${5 + i} ημέρες`,
            endDateLabel: iso(5 + i),
            days: 5 + i,
            premiumLabel: "300 €",
            checkpointCount: 0,
            checkpointLabel: null,
        }))
        const labels = {
            kicker: "Χρονοδιάγραμμα",
            policiesSuffixOne: "ασφαλιστήριο με ανανέωση εντός 6 μηνών",
            policiesSuffix: "ασφαλιστήρια με ανανέωση εντός 6 μηνών",
            trackExpirationsTitle: "",
            trackExpirationsBody: "",
            addPolicy: "",
            noExpirationsTitle: "",
            noExpirationsBody: "",
        }

        // FAILING SHAPE, kept visible: without totalCount the header can only
        // count the rows it was handed — 8 upcoming renewals read as «6».
        const legacy = withProviders(
            <RenewalsTimelineCard items={items} hasPolicies showUpgradeTeaser={false} labels={labels} />
        )
        expect(
            scanRenderedCounts(legacy.container).get("portfolio.renewalsNext180Count")
        ).toEqual(new Set([6]))

        const fixed = withProviders(
            <RenewalsTimelineCard
                items={items}
                totalCount={8}
                hasPolicies
                showUpgradeTeaser={false}
                labels={labels}
            />
        )
        expect(
            scanRenderedCounts(fixed.container).get("portfolio.renewalsNext180Count")
        ).toEqual(new Set([8]))
        // And PolicyholderHome actually passes the uncapped count — the prop
        // exists precisely so the server can, so its absence there would
        // silently restore the defect.
        const home = fs.readFileSync(
            path.join(REPO_ROOT, "app/(protected)/dashboard/PolicyholderHome.tsx"),
            "utf8"
        )
        expect(home).toMatch(/totalCount=\{upcomingRenewals\.length\}/)
    })

    it("NO data-count key renders two values across the composed surfaces (the §6.7 invariant itself)", () => {
        // Render the fixture's surfaces into one document and apply the same
        // grouping the Playwright metric applies: one key(+subject), one value.
        const facts = portfolioFacts(counts).map(({ kind, count }) => ({
            kind,
            count,
            label: `${count} ${kind}`,
        }))
        const composed = withProviders(
            <>
                <ProtectionStatusHero
                    hasPolicies
                    facts={facts}
                    areasLine={null}
                    openRecommendationCount={0}
                    language="el"
                    labels={{ kicker: "k", cta: "c", emptyTitle: "", emptyBody: "", emptyCta: "" }}
                />
                <PolicyWallet policies={rows.map(toWalletPolicy)} onViewPolicy={() => {}} />
            </>
        )
        const grouped = scanRenderedCounts(composed.container)
        const disagreements = [...grouped.entries()].filter(([, values]) => values.size > 1)
        expect(
            disagreements,
            "a data-count key rendered two different values for one portfolio:\n" +
                disagreements.map(([k, v]) => `  ${k}: ${[...v].join(" vs ")}`).join("\n")
        ).toEqual([])
    })
})
