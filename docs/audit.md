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

---

# G0 — B2C application audit (Grafí application tier)

**2026-08-30 · compliance reader + design systems lead.** Every §2 finding of the B2C brief was
verified twice: against the tree at `abb1d46f` (file:line) and rendered on the worktree's own dev
server (`:3100`, served from `/private/tmp/pw-cutover/grafi-app` — `:3000` belongs to a parallel
session, A-22) with the provisioned heavy policyholder session (30 policies). Before-screenshots
at 393 and 1440 are in `docs/screens/before/`. Verdict legend: CONFIRMED · PARTLY · STALE/WRONG.

## §2 findings — confirmed vs corrected

| # | Brief says | Verdict | Evidence (tree) | Rendered on :3100 |
|---|---|---|---|---|
| 1 | Dashboard opens with an inventory, not a verdict | **CONFIRMED** | `components/dashboard/home/ProtectionStatusHero.tsx:106-119`; `lib/dashboard/portfolio-summary.ts:76-116`; `el.ts:1856-1874`. The verdict was removed by H-001; only `empty` and `facts` states exist | h1 «Η ασφαλιστική σας εικόνα», h2 «30 ασφαλιστήρια · 5 έχουν λήξει · 5 λήγουν μέσα σε 30 ημέρες · 2 δεν διαβάστηκαν» — the brief's string minus the 30-day window |
| 2 | Four severity vocabularies + a fifth on /wallet | **CONFIRMED — it is six**, plus a seventh on the wallet tiles | V1 `describeSeverity` «Κρίσιμη/Υψηλή…» (`lib/gaps/severity-display.ts:61-66`); V2 bare adjectives «13 υψηλά» (`CoverageGapsWidget.tsx:58-78`); V3 «Εντάξει/Προσοχή/Απαιτείται ενέργεια» (`ProtectionMonitorCard.tsx:20-36`); V4 «N σημεία για έλεγχο» (`el.ts:1897`); V5 ALL-CAPS lifecycle stored uppercase in the catalogue (`el.ts:1604-1618`); V6 `components/coverage/InsightCard.tsx:47-76` hand-rolled map; `components/wallet/StatusSummary.tsx:106-144` mixes cases | «Υψηλή προτεραιότητα», «13 υψηλά», «ΛΗΓΕΙ ΣΥΝΤΟΜΑ», «ΛΗΓΜΕΝΟ», «N από N» all on screen |
| 3 | Template finding cards | **CONFIRMED, stronger** | `components/coverage/CoverageInsightsClient.tsx:226-242` — `title`/`whyItMatters` are `||` fallbacks, but `checkedItems` («Όρια κάλυψης, Νομικές απαιτήσεις, Σενάρια αυξημένου κινδύνου») is a hard-coded literal on **every** card; `:240` treats only `critical` as urgent, so `high` gets «ΥΨΗΛΗ ΠΡΟΤΕΡΑΙΟΤΗΤΑ» (`InsightCard.tsx:108`) and «Δεν απαιτείται άμεση ενέργεια» (`:186-193`) together | both strings present on `/protection` |
| 4 | «Προτάσεις κάλυψης» heads /protection | **PARTLY** — an inline-hardcoded `h2` (`RecommendationCards.tsx:273-275`); the `h1` is «Η προστασία μου» (`ProtectionSurface.tsx:104`) | first h2 is «Προτάσεις κάλυψης» |
| 5a | Wallet card body is not a tap target; three tiny icons | **STALE/WRONG** | body is a full-width `<button aria-label>` (`PolicyCard.tsx:134-192`, commit `0da78011`); icons are 44×44 (`:72`) | card body is a button |
| 5b | No grouping; expired first; «Το πορτοφόλι μου» vs «Ο φάκελός μου» | **CONFIRMED** — flat grid (`PolicyWallet.tsx:273-295`); `endDate asc` (`wallet/page.tsx:50-52`); three names («Το πορτοφόλι μου» `el.ts:228`, «Ο φάκελός μου» `:92`, «Φάκελος» `:93`) and a greeting replaces the h1 for named users (`PolicyWalletClient.tsx:300`) | h1 «Το πορτοφόλι μου», sidebar «Ο φάκελός μου» |
| 6 | Notifications mix telemetry with protection events; failures twice; badge 22 | **CONFIRMED** | one flat list, `event_category` hard-coded (`notifications/actions.ts:35-39,126`); `policy_analyzed`/`policy_analysis_failed` emit no `dedupeKey` so delivery arms never merge (`lib/notifications/event-grouping.ts:22-26,78-80`, `registry.ts:484-524`); badge counts all-time unread `in_app` (`layout.tsx:52-54`) while the page renders 24 (`NotificationsClient.tsx:155,179-193`) — **the badge can be unclearable** | badge **22**; «Η ανάλυση ολοκληρώθηκε» on the list |
| 7 | «πρόκειται να μείνει ανασφάλιστο» | **CONFIRMED** | `lib/services/gap-engine/portfolio-rules.ts:132-137`, rule `motor_expiring_soon` | on `/dashboard` and `/protection` |
| 8 | €8.224 beside status counts | **PARTLY** — true on **/wallet** (`StatusSummary.tsx:146-163`, label «Ασφαλιστικό αποτύπωμα»); on /dashboard it has its own section, label and exclusion note (`PortfolioSummaryCard.tsx:65-91`, `el.ts:1883,2639-2645`). What is missing everywhere is *why the number is there* | € figures on both |
| 9 | Household absent despite Family | **CONFIRMED** — no model, no UI; `family_portfolio` deleted (`feature-gates.ts:53-62`); only `PolicyholderProfile.{maritalStatus,dependentsCount,childrenCount}` (`schema.prisma:219-251`) | — |
| 10 | No quiet state | **PARTLY** — no page-level quiet state (`ProtectionStatusHero.tsx:69,98`); five per-card «nothing here» strings exist (`el.ts:1917-1930`); a healthy wallet still renders ~11 cards led by a count | — |
| 11 | No proof of value | **CONFIRMED** — only change-logs (`/account/history`, `RecentChangesWidget`) | — |
| 12a | Checklist «3 από 5» regardless of policy count | **CONFIRMED** — unconditional (`PolicyholderHome.tsx:648-666,800-823`); stuck at 4/5 while any gap is open (`lib/services/protection-plan.ts:53-67`) | «N από N» on a 30-policy wallet |
| 12b | AI disclaimer three times in 11px | **WRONG for /dashboard** (≤1: `ProtectionStatusHero.tsx:143`; `AttentionList.tsx:133-138` deliberately omits a second); **CONFIRMED for /protection** (2× `AiDisclaimer` + `SeverityCaveat` per card + the priority note twice) | 2 disclosure blocks on each |
| 12c | Ten uppercase Greek labels per screen | **CONFIRMED** — `.pw-kicker` (`app/globals.css:936-948`) | 14 on `/dashboard`, **27** on `/protection`, 11 on `/wallet` |
| 12d | Yellow note leaking insurer names | **CONFIRMED** — `CoverageInsightsClient.tsx:366-376`; labels built at `protection/page.tsx:270-276` | «Εκτός:» present |
| 13 | Survivors: three actions, «Από τα στοιχεία σας», adviser consent + revocation, account structure, theme toggle | **ALL CONFIRMED** — `RecommendationCards.tsx:308-668`; `agent/page.tsx:87-113` + `AgentClient.tsx:82-93,488-492` + `wallet/actions.ts:1185-1197`; `lib/settings/sections.ts`; `components/ThemeToggle.tsx`. Two defects beside them: `revokeShare` revalidates `/wallet` twice and never `/agent`; `InsightCard` carries a *different* action trio | «Κοινή πρόσβαση» on `/agent`; two `<h1>` on `/account` |
| 14 | Skeletons do not match | **CONFIRMED** — `components/ui/LoadingSkeleton.tsx:96-281`: `/wallet` skeleton centred with a dead strip and an 8/4 split; `/protection` borrows the dashboard skeleton; `/dashboard` skeleton still draws a ring; a correct `PolicyCardSkeleton` (`PolicyCard.tsx:216-231`) exists unused | — |

Also found while rendering: `/protection` has **no `section[id]` landmarks** (the measure harness's exact-query arm sees nothing there); `/dashboard` has six (`overview, attention, plan, coverage, portfolio, activity`).

## Route inventory (policyholder)

`docs/transformation/SURFACES.md` §1 is the load-bearing list (25 routes, 18 landing surfaces, 2 redirects; a guard parses it). The rebuild's route table and its 301 map:

| today | new | via |
|---|---|---|
| `/dashboard` | `/` | proxy rewrite for signed-in policyholders (A-16) + 301 |
| `/protection`, `/protection?lens=risk` | `/see` | 301 |
| `/wallet`, `/wallet/[id]` | `/policies`, `/policies/[id]` | 301 |
| `/wallet/add` | `/add` | 301 |
| `/notifications` | `/updates` | 301 |
| `/agent` (exact) | `/adviser` (+ `/adviser/help/[findingId]`) | 301; `/agent/settings`, `/agent/pricing` stay agent-owned |
| `/account/*` | `/me/*` (+ `/me/household`, `/me/household/[personId]`) | 301; `LEGACY_TAB_REDIRECTS` kept |
| — | `/money`, `/life-event/[type]`, `/welcome` | new |
| `/home`, `/coverage` | `/`, `/see` | existing proxy redirects re-pointed |

Old route directories stay as `redirect()` stubs as well (the `no-dead-internal-links` guard resolves link targets on the filesystem; `proxy.ts` redirects alone satisfy nothing).

## Data-model inventory (what exists, what the rebuild adds)

| concept | today | rebuild |
|---|---|---|
| Policy / documents | `Policy` (+ `acordData` JSON holding coverages/exclusions/conditions), `PolicyDocument` (kind, versions) | unchanged |
| Findings | none — `GapInstance` (rule provenance `ruleId/ruleInputs/engineVersion`, status string) + `RecommendationInstance` (`dismissReason`, `urgency` string) | `Finding` (hash, kind, tier, object, **source pointer**, dismissal memory) |
| Severity | free `String`, `SEVERITY_UNDERWRITER_VALIDATED=false` | internal only; never rendered |
| Household | none (`PolicyholderProfile.dependentsCount/childrenCount` scalars) | `HouseholdPerson` |
| Life events | `LifeEventInstance` + 22-entry registry | reused; `job_change`, `relocation`, `other` added |
| Ledger | `BusinessEvent` (append-only, `subjectUserId`) + `getTimeline` read-side | projection; new catalogue names |
| Adviser sharing | `AccessGrant.revokedAt`; audit rows only on the API DELETE path | `AdviserShareAudit` on every grant/revoke/help |
| AI consent | `User.aiProcessingConsentVersion` (per account); `ConsentAudit` without `revokedAt`; the copy promises a withdrawal no code implements | `DocumentAiConsent` (per document, revocable) |
| Score | portfolio score removed (H-001); per-policy «healthScore» donut still renders (`SummaryCard.tsx:157-162`) | donut removed (D-B2C-01) |
| Prevention | `RiskStatus`/`Mitigation` vocabularies in code; `Opportunity` is B2B sales | types only (`lib/app/prevention.ts`); no table, no UI |
