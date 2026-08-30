# G0 — Current-state audit (:3000 + repo)

**2026-08-30 · design systems lead.** Every §1 finding was verified against the running page at
1440×720 and the file on disk before being accepted. **Five of eleven are wrong or stale.** This
matters because three of them (fold, Free card, dead space) would have driven layout work at
problems that do not exist.

## §1 findings — confirmed vs corrected

| # | Brief says | Verdict | Evidence |
|---|---|---|---|
| 1 | H1 sells the feature | **CONFIRMED** | Live `<h1>`: «Όλα τα ασφαλιστήρια…». The promise H1 was already *drafted* this cycle (`docs/marketing/03-COPY-pass1-home-trust.md` §1.2, wired to the dead `PROMISE` constant in `lib/marketing/positioning.ts:178`) — G6 ships it. |
| 2 | Primary CTA below the fold at 1440×720 | **WRONG** | Measured on the raw viewport: CTA bottom = **623px** of 720. Above the fold, with 97px margin. (A browser with chrome eats ~80–120px, which may explain the observation — but the buildable fact is 623px, and G6 still tightens the hero.) |
| 3 | No product visible above the fold | **CONFIRMED** (sharpened) | No device/dashboard visual in the hero; the first app visual is `PolicyWalletWidget`, several screens down. (A naive selector finds an SVG at y=504 — that is the CTA's arrow icon, not product.) |
| 4 | 300–400px dead gaps between sections | **NOT MEASURABLE AS CLAIMED** | Programmatic scan of all 13 top-level sections: **zero inter-section gaps > 150px**. Rhythm is *inconsistent* (per-section `py-*` varies), which G2's `--space-section` fixes — but there is no dead-space epidemic to purge. |
| 5 | Hero carousel is a liability | **CONFIRMED** | `HeroSlides.tsx` live; the active slide renders as the `<h1>`, so the page's H1 changes every 7s. Kill-and-replace already specced (pass-1 §1.4); note the carousel carries deliberate a11y work (`use-rotation.ts`) that G5's `DeviceFrame`/ticker must reuse, not re-solve. |
| 6 | Pricing shows Plus and Family but not Free | **WRONG** | `lib/pricing/public-pricing-content.ts:100-113` defines the Free card; it renders on `/pricing` («3 ασφαλιστήρια» present live). Free's bullets were *corrected* this cycle (gap→duplicates, `c176ba39`). |
| 7 | No proof layer | **CONFIRMED, with a constraint** | True — and the claims register (`docs/marketing/05-LAUNCH-CHECKLIST.md` §A.1) governs what may fill it: **sourced today** are ΕΔΑ 2024 (ΕΛΣΤΑΤ DKT58, figures with scopes) and ENFIA 20% (ν.5162/2024, ΦΕΚ Α΄198). V1 (7–10%), V4 (7-in-10), V5 (1-in-5) are **CUT/unused — they may not enter the proof layer** until sourced. |
| 8 | No broker audience on the homepage | **CONFIRMED** (one link only) | `WorldClassLanding.tsx:388-391` — a single «Είμαι ασφαλιστής» link in the final CTA block. No broker band. |
| 9 | Logo is a wordmark only | **PARTIALLY WRONG** | `app/{favicon.ico,icon.svg,apple-icon.png}` and `public/icons/{192,512}` **exist** — but `icon.svg` is a letter-P placeholder, not a designed mark. So: assets exist, mark does not. G3 replaces the placeholder set. |
| 10 | Motion near-absent | **CONFIRMED** | Transitions on hovers and the two rotators; no entrance choreography, no scroll reveals. |
| 11 | Dev-only floating badge | **CONFIRMED DEV-ONLY** | The bottom-left disc is Next.js's dev indicator (verified earlier this cycle: absent from production builds). The one fixed bottom element found is a `pointer-events-none` overlay, not it. No action. |

## Route inventory

**81 public marketing pages** (41 EL + 40 EN mirrors; `/invite/[token]` unmirrored), enumerated
from `app/(public)/**` on 2026-08-29 — full table in the Phase-A survey. Key routes: `/`,
`/product` + 16 line pages, `/solutions/agents`, `/needs`, `/guides` (**15** guides live, not 12),
`/lexiko`, `/pricing`, `/compare`, `/trust`, `/platform`, `/company`, `/contact`, legal ×4.
Protected app surfaces exist under `app/(protected)/**` and are out of this brief's scope except
where marketing claims must match them. **`proxy.ts` allowlist** gates public reachability —
`/solutions` and `/guides` are public prefixes already; any new top-level route needs an entry.

## Factual-claim inventory — by authority, with the live registries

The repo already runs claim-truth as *tested code*, which this build must extend, not bypass:

| Claim class | Single source | Guard |
|---|---|---|
| Plan entitlements & pricing | `lib/pricing/plan-defaults.ts` (+ DB `plans` rows for €) | `tests/unit/plan-gating-parity.test.ts` (card ceilings, gap=Family, duplicates ungated), `monetization-config.test.ts` |
| Upgrade-tier naming | `lib/monetization/feature-gates.ts` | `upgrade-copy-names-the-enforced-tier.test.ts` (never name a cheaper tier) |
| Marketing positioning strings | `lib/marketing/positioning.ts` (CATEGORY/STORY/PROMISE/TRUST_FACTS/COMPARISON_ROWS) | greek copy freeze; `token-contrast-contract` for colour claims |
| Statutory claims in guides | `lib/guides/content.ts` sources + `docs/growth/SOURCES.md` | `sources-freshness.test.ts` (28 legacy bare origins remain, shrink-only) |
| 16 line names | `lib/insurance/taxonomy.ts` (`WRITE_BRANCH_IDS`) | type-level |
| Legal strings | `lib/legal/legal-content.ts` | **untouchable per §2** |
| Colour literals | `app/globals.css` `@theme`/`:root`/`.dark` | `design-token-debt.test.ts` (**124 literals across 29 files remain**), `token-contrast-contract.test.ts` (`@on/@min` machine-read contrast contracts) |

Claims **known wrong on disk today**: none open — the plan-gating contradiction, the tier
mislabels, the false «μένουν στην Ευρώπη» chip *drafts*, and the uninsured-fines figures were all
resolved this cycle (`c6f6ca7b`, `c176ba39`, `67ca9d0b`; the data-location chip fix is drafted in
pass-1 and ships with G6).

## Styling architecture today

Tailwind 4 with `@theme` in `app/globals.css` as the runtime token source; `:root`/`.dark` blocks;
semantic layers already partially exist (`--brand-accent-on-light/dark`, `--status-*` roles with
measured contrast annotations; `--dot-track`). **Two guards make tokens load-bearing:** the
raw-hex debt ratchet and the contrast contract. `lib/utils.ts cn()` + CVA for variants. Fonts:
Inter via `next/font`. **G2's JSON token layer must generate INTO this architecture** — the
`@on/@min` contract and the debt ratchet are assets Grafí inherits, not obstacles.

## Standing constraints this brief inherits (from the live decision record)

1. **The three-state system already has a codebase ancestor**: `state/covered|gap|review` maps to
   the shipped `--status-*` roles and the «needs review» honesty invariant («Δεν σας βαθμολογούμε
   στα τυφλά»). Grafí formalises it; it does not invent it.
2. **Plan facts**: gap detection = Family (enforced); duplicate detection = every plan, ceiling-
   bounded, **never cross-person** — no household-wide detection claim anywhere (verified in
   `policyAssetSubjectKey`; test-pinned).
3. **Guides**: G-07 citation debt (28 bare origins). New guides ship **only citation-clean** to the
   `SOURCES.md` standard — see A-03.
4. **ENFIA guide EXISTS** (`ekptosi-enfia-asfalisi-katoikias`) — §6's "create
   `/guides/enfia-ekptosi-asfalisi-katoikias`" would be a second URL on one statutory claim (a
   halt condition, hit and corrected twice already this cycle). G7 = EXTEND.
5. **`/solutions/partners` is copy-blocked** on Terms §3 (D2) and the IDD opinion (in flight).
   G8 builds the page **unpublished/noindex** until those land — recorded in the ledger, not
   worked around.
6. Session hygiene: `AGENTS.md`, `CLAUDE.md`, `docs/growth/PREAPPROVALS.md` carry a parallel
   session's/superseded edits — **never swept into Grafí commits**.
