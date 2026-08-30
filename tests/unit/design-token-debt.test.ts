import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * design-token-debt — the guard on hardcoded colour literals.
 *
 * `app/globals.css` is the design system's runtime source of truth: `:root`
 * holds the semantic values, `@theme { --color-* }` maps them into Tailwind's
 * colour namespace, and components consume the generated utilities
 * (`bg-primary`, `text-foreground` — ~1,186 references). A hex literal in a
 * component bypasses all of it: it cannot flip in dark mode, cannot be
 * rethemed, and is invisible to every audit that reads the token table.
 *
 * This guard makes the bypass a build failure. It fails when:
 *
 *   1. a NEW hex colour literal appears in the guarded surfaces;
 *   2. an existing literal is removed WITHOUT delisting it below — so the
 *      debt list can only shrink, and can never silently drift from the code.
 *
 * UNIVERSE. Enumerated from the filesystem — every `.tsx` under the scope
 * roots, recursively — never from a hand-written file list. A guard scoped to
 * known locations guards those locations, not the invariant; that failure
 * mode has shipped in this repo before. Each scope root is also asserted to
 * EXIST, so a renamed directory fails loudly instead of silently shrinking
 * the universe to nothing.
 *
 * WHAT COUNTS. `#rgb`, `#rrggbb` — and deliberately also the alpha forms
 * `#rgba` / `#rrggbbaa`: an alpha-suffixed hex is still a hardcoded colour,
 * and excluding it would make `#29685B80` a one-character bypass of this
 * guard. (Zero alpha forms exist in scope today, so counting them costs
 * nothing and closes the hole.) Literals are lowercased in the key so a
 * case-only reformat (`#FFF` → `#fff`) does not churn the list, and keys are
 * `path::literal` with an occurrence count — never line numbers, which churn
 * on every reformat and would make the list useless.
 *
 * WHAT THIS GUARD DOES NOT SEE — stated rather than implied:
 *   - `rgb()` / `hsl()` / `oklch()` / named colours (`'red'`) in TSX;
 *   - colour literals in `.css` files (`app/globals.css` is where literals
 *     BELONG; other stylesheets are simply not scanned);
 *   - hex in `.ts` files (chart configs, email templates) — the universe is
 *     `.tsx` only;
 *   - surfaces outside the six roots (components/ui, components/agent,
 *     app/auth, emails, marketing pages outside `(protected)`);
 *   - URL-encoded colours inside data: URIs (`%23ff0000`) — none exist in
 *     scope today, but the scanner would not see one;
 *   - Tailwind arbitrary values that reference a token indirectly
 *     (`bg-[var(--pw-primary)]`) — a legacy-path reference, not a literal;
 *     that is the `--pw-*` / `--brand-*` convergence item, tracked elsewhere.
 *
 * KNOWN NOISE SOURCE. A 3/4/6/8-char hex-valid run after `#` counts even in
 * prose — a comment saying `PR #164` would register as `#164`. Verified at
 * authoring time: zero such matches exist in scope. If one ever trips the
 * guard, reword the comment or extend the scanner deliberately; do not add
 * prose to the debt list.
 *
 * PROBE. `tests/unit/fixtures/design-token-guard-probe.tsx` carries one
 * planted instance of every counted form and every near-miss, and the PROBE
 * block below asserts the scanner sees exactly the planted multiset — plus
 * that the debt-diff reports both failure directions. Without it this file
 * would be a guard nobody has seen fail.
 */

const REPO_ROOT = process.cwd()
const PROBE_PATH = join(REPO_ROOT, 'tests/unit/fixtures/design-token-guard-probe.tsx')

/** The guarded surfaces. Phase 5 rebuild targets plus components/landing. */
const SCOPE_ROOTS = [
    'app/(protected)',
    'components/branches',
    'components/dashboard',
    'components/gaps',
    'components/landing',
    'components/wallet',
]

/** Every .tsx under the given roots, enumerated from disk. */
function walkTsxFiles(roots: string[]): string[] {
    const out: string[] = []
    const visit = (dir: string) => {
        let entries: string[]
        try {
            entries = readdirSync(dir)
        } catch {
            return
        }
        for (const entry of entries) {
            if (entry === 'node_modules' || entry.startsWith('.')) continue
            const full = join(dir, entry)
            let s: ReturnType<typeof statSync>
            try {
                s = statSync(full)
            } catch {
                continue
            }
            if (s.isDirectory()) visit(full)
            else if (entry.endsWith('.tsx')) out.push(full)
        }
    }
    for (const root of roots) visit(join(REPO_ROOT, root))
    return out.sort()
}

/** CSS hex colour forms: #rgb, #rgba, #rrggbb, #rrggbbaa. */
const HEX_COLOUR_LENGTHS = new Set([3, 4, 6, 8])

/**
 * Every hex colour literal in the text, lowercased, in order of appearance.
 * Pure: takes source text, returns literals — which is what lets the probe
 * fixture exercise the same code path as the real scan.
 */
function findHexLiterals(text: string): string[] {
    const found: string[] = []
    const candidate = /#[0-9a-fA-F]+/g
    let match: RegExpExecArray | null
    while ((match = candidate.exec(text)) !== null) {
        const digits = match[0].length - 1
        if (!HEX_COLOUR_LENGTHS.has(digits)) continue
        // Bounds: reject mid-token runs (`x#fff`, `#deadbeefs`), doubled
        // hashes, and HTML character references (`&#8211;`).
        const before = match.index > 0 ? text[match.index - 1] : ''
        if (/[0-9a-zA-Z_#&]/.test(before)) continue
        const after = text[match.index + match[0].length] ?? ''
        if (/[0-9a-zA-Z_]/.test(after)) continue
        found.push(match[0].toLowerCase())
    }
    return found
}

/** `path::literal` → occurrence count, for every .tsx under the scope roots. */
function scanScope(): Map<string, number> {
    const counts = new Map<string, number>()
    for (const file of walkTsxFiles(SCOPE_ROOTS)) {
        const rel = relative(REPO_ROOT, file)
        for (const literal of findHexLiterals(readFileSync(file, 'utf8'))) {
            const key = `${rel}::${literal}`
            counts.set(key, (counts.get(key) ?? 0) + 1)
        }
    }
    return counts
}

type DebtDiff = {
    /** In the code beyond what the debt list allows — a NEW literal. */
    added: string[]
    /** In the debt list beyond what the code holds — fixed but not delisted. */
    fixedButStillListed: string[]
}

/**
 * Exact multiset comparison between what the scan found and what the debt
 * list carries. Any count mismatch fails in one of the two directions; there
 * is no tolerance in either, which is what makes the list shrink-only.
 */
function diffAgainstDebt(found: Map<string, number>, debt: Record<string, number>): DebtDiff {
    const added: string[] = []
    const fixedButStillListed: string[] = []
    const keys = new Set([...found.keys(), ...Object.keys(debt)])
    for (const key of [...keys].sort()) {
        const actual = found.get(key) ?? 0
        const allowed = debt[key] ?? 0
        if (actual > allowed) added.push(`${key} — found x${actual}, debt list allows x${allowed}`)
        else if (actual < allowed) {
            fixedButStillListed.push(`${key} — debt list carries x${allowed}, code holds x${actual}`)
        }
    }
    return { added, fixedButStillListed }
}

/**
 * THE DEBT. Every hardcoded colour literal the guarded surfaces carried when
 * this guard was written (2026-08-27): 754 occurrences over 321 path::literal
 * keys. Enumerated EXACTLY so the set can only shrink — a new literal fails,
 * and fixing one without delisting it also fails. This is debt, not an
 * exemption: Phase 5 rebuilds retire the app/(protected), wallet, dashboard,
 * gaps and branches entries; the landing entries are the opportunistic
 * migration recorded in docs/transformation/PHASE4-ASSESSMENT.md.
 */
const HARDCODED_COLOUR_DEBT: Record<string, number> = {
    'app/(protected)/admin/users/UsersClient.tsx::#22c55e': 1,
    'app/(protected)/agent/AgentClient.tsx::#0f172a': 1,
    'app/(protected)/agent/AgentClient.tsx::#29685b': 5,
    'app/(protected)/agent/AgentClient.tsx::#5b6a7a': 1,
    'app/(protected)/agent/page.tsx::#10b981': 1,
    'app/(protected)/customers/invite/page.tsx::#1a2420': 1,
    'app/(protected)/dashboard/PolicyholderHome.tsx::#0f172a': 1,
    'app/(protected)/insights/InsightsClient.tsx::#29685b': 3,
    'app/(protected)/insights/InsightsClient.tsx::#3b82f6': 2,
    'app/(protected)/insights/InsightsClient.tsx::#64748b': 2,
    'app/(protected)/insights/InsightsClient.tsx::#89d9b2': 1,
    'app/(protected)/insights/InsightsClient.tsx::#8b5cf6': 2,
    'app/(protected)/insights/InsightsClient.tsx::#94a3b8': 1,
    'app/(protected)/insights/InsightsClient.tsx::#ec4899': 1,
    'app/(protected)/insights/InsightsClient.tsx::#ef4444': 1,
    'app/(protected)/insights/InsightsClient.tsx::#f59e0b': 3,
    'app/(protected)/wallet/[id]/AIUsageWidget.tsx::#111111': 4,
    'app/(protected)/wallet/[id]/AnalysisCard.tsx::#f1f5f9': 1,
    'app/(protected)/wallet/[id]/loading.tsx::#111111': 1,
    'components/gaps/SeverityCaveat.tsx::#64748b': 1,
    'components/landing/AgentWidgets.tsx::#1c4e44': 1,
    'components/landing/AgentWidgets.tsx::#22c55e': 1,
    'components/landing/AgentWidgets.tsx::#28ca41': 1,
    'components/landing/AgentWidgets.tsx::#29685b': 4,
    'components/landing/AgentWidgets.tsx::#374151': 1,
    'components/landing/AgentWidgets.tsx::#a7f3d0': 8,
    'components/landing/AgentWidgets.tsx::#bfdbfe': 1,
    'components/landing/AgentWidgets.tsx::#ff5f57': 1,
    'components/landing/AgentWidgets.tsx::#ffbd2e': 1,
    'components/landing/AgentWidgets.tsx::#fffbeb': 1,
    'components/landing/HomeContact.tsx::#94a3b8': 1,
    'components/landing/HomeContact.tsx::#a7f3d0': 1,
    'components/landing/HomeFaq.tsx::#a7f3d0': 2,
    'components/landing/LifeChangeDiscovery.tsx::#a7f3d0': 5,
    'components/landing/PolicyWalletWidget.tsx::#28ca41': 1,
    'components/landing/PolicyWalletWidget.tsx::#a7f3d0': 5,
    'components/landing/PolicyWalletWidget.tsx::#ff5f57': 1,
    'components/landing/PolicyWalletWidget.tsx::#ffbd2e': 1,
    'components/landing/PolicyWalletWidget.tsx::#fffbeb': 1,
    'components/landing/PricingPreview.tsx::#a7f3d0': 2,
    'components/landing/ProductCategoryExplorer.tsx::#29685b': 1,
    'components/landing/ProductCategoryExplorer.tsx::#475569': 2,
    'components/landing/ProductCategoryExplorer.tsx::#d5dee8': 1,
    'components/landing/PublicMegaFooter.tsx::#1c4e44': 1,
    'components/landing/PublicMegaFooter.tsx::#a7f3d0': 1,
    'components/landing/ServicesGrid.tsx::#a7f3d0': 4,
    'components/landing/SolutionsDropdown.tsx::#a7f3d0': 5,
    'components/landing/TrustBadges.tsx::#a7f3d0': 1,
    'components/landing/TrustRow.tsx::#a7f3d0': 2,
    'components/landing/WhyNow.tsx::#a7f3d0': 2,
    'components/landing/WorldClassLanding.tsx::#0f172a': 1,
    'components/wallet/ImportantNotices.tsx::#7f1d1d': 2,
    'components/wallet/ImportantNotices.tsx::#b91c1c': 2,
    'components/wallet/PolicyQA.tsx::#111111': 1,
    'components/wallet/coverage-details/HomeCoverageDetails.tsx::#22c55e': 3,
    'components/wallet/policy-detail/PolicyHead.tsx::#111111': 1,
}

describe('design-token debt guard', () => {
    it('every scope root exists (a renamed root must fail, not silently shrink the universe)', () => {
        const missing = SCOPE_ROOTS.filter((root) => {
            try {
                return !statSync(join(REPO_ROOT, root)).isDirectory()
            } catch {
                return true
            }
        })
        expect(
            missing,
            `scope roots missing from disk — if a surface moved, update SCOPE_ROOTS and re-key its debt entries:\n${missing.join('\n')}`
        ).toEqual([])
    })

    it('enumerates a non-trivial universe from the filesystem', () => {
        expect(walkTsxFiles(SCOPE_ROOTS).length).toBeGreaterThan(50)
    })

    it('introduces no hardcoded colour literal beyond the enumerated debt, and the debt only shrinks', () => {
        const { added, fixedButStillListed } = diffAgainstDebt(scanScope(), HARDCODED_COLOUR_DEBT)

        expect(
            added,
            `NEW hardcoded colour literal(s). A hex value bypasses the design system — use the ` +
                `semantic utilities generated from app/globals.css (bg-primary, text-foreground, ` +
                `border-border, …) or add a token there first:\n${added.join('\n')}`
        ).toEqual([])

        expect(
            fixedButStillListed,
            `debt entries that no longer match the code — the literal was removed or reduced. ` +
                `Delete or decrement these in HARDCODED_COLOUR_DEBT so the debt keeps shrinking:\n${fixedButStillListed.join('\n')}`
        ).toEqual([])
    })
})

/**
 * The probe. Each assertion proves one detector actually fires; if any of
 * these ever passes silently, the guard above has stopped working.
 */
describe('PROBE: the guard turns red on planted literals', () => {
    it('sees exactly the planted multiset — every counted form, none of the near-misses', () => {
        const found = findHexLiterals(readFileSync(PROBE_PATH, 'utf8'))
        expect(found.sort()).toEqual(['#abcdef', '#f00', '#f008', '#ff0000', '#ff000080'])
    })

    it('reports a literal in a file the debt list has never seen', () => {
        const found = new Map([['components/landing/Probe.tsx::#ff0000', 1]])
        const diff = diffAgainstDebt(found, {})
        expect(diff.added).toEqual([
            'components/landing/Probe.tsx::#ff0000 — found x1, debt list allows x0',
        ])
        expect(diff.fixedButStillListed).toEqual([])
    })

    it('reports a new occurrence of an already-listed literal', () => {
        const found = new Map([['components/landing/Probe.tsx::#ff0000', 3]])
        const diff = diffAgainstDebt(found, { 'components/landing/Probe.tsx::#ff0000': 2 })
        expect(diff.added).toHaveLength(1)
    })

    it('reports a fully fixed literal that was not delisted', () => {
        const diff = diffAgainstDebt(new Map(), { 'components/landing/Probe.tsx::#ff0000': 1 })
        expect(diff.fixedButStillListed).toEqual([
            'components/landing/Probe.tsx::#ff0000 — debt list carries x1, code holds x0',
        ])
        expect(diff.added).toEqual([])
    })

    it('reports a partially fixed literal that was not decremented', () => {
        const found = new Map([['components/landing/Probe.tsx::#ff0000', 1]])
        const diff = diffAgainstDebt(found, { 'components/landing/Probe.tsx::#ff0000': 4 })
        expect(diff.fixedButStillListed).toHaveLength(1)
    })

    it('an exactly matching debt list is clean in both directions', () => {
        const found = new Map([['components/landing/Probe.tsx::#ff0000', 2]])
        const diff = diffAgainstDebt(found, { 'components/landing/Probe.tsx::#ff0000': 2 })
        expect(diff.added).toEqual([])
        expect(diff.fixedButStillListed).toEqual([])
    })
})
