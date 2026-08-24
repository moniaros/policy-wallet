# BASELINE — Κλάδοι ασφάλισης `/branches` — V2-P0-BASE(a), PW-MOBILE-TRANSFORM-02

**Date:** 2026-08-24 · **Branch:** NEW-UI · **Surface:** `/branches` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/branches-baseline.spec.ts` (paid) + `tests/measure/branches-free.spec.ts` (free).
Fixtures: `provisionMatrixFixtures` (paid: 15-policy matrix, 6 healthy + 9 `defect-*` — motor/health
only; free: `FREE_SPECS`, 2 policies) + `applyUnownedLinesProfileFixture` (paid only — new in this
run, read not modified) + a force-refresh of `GET /api/v1/protection-score?fresh=true` on both tiers,
added by this spec because the page reads a CACHED score row that nothing on a GET render recomputes.
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure branches-baseline` /
`--project=measure-free branches-free`

## Status: BOTH tiers complete, 3/3 widths each

`/branches` was unmeasured in v1. It renders nine top-level branch tiles (every branch with
`contentTier: 'rich'` in `lib/insurance/taxonomy.ts` — motor, home, health, life, pension, travel,
pet, cyber, **and `business`**, which is `contentTier: 'rich'` too even though it is a B2B branch;
`buildBranchOverview` does not filter by segment) plus any branch the account holds a policy in or
the cached score expects. Confirmed both runs: **exactly nine tiles**, same nine, both tiers.

A page-render-time subtlety this run had to work around: `/branches` reads
`db.protectionScore.findUnique(...)`, a row nothing on a GET recomputes —
`PolicyholderHome.tsx`'s own comment states the policy plainly ("a GET render must not write,
freshness is the cron / upload pipeline's job"). Without a force-refresh, `expectedLines` is
whatever the last write left it at (or empty), and the `gap` tile state (§2.2) is unreachable from a
bare page load. Both specs call `GET /api/v1/protection-score?fresh=true` (the one endpoint that
runs `runGapEngine` on demand) through the page's own authenticated request context before
capturing.

## PAID tier — captured, 3/3 widths

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| branches-unowned-lines-paid | 320 | 1981 | 2.8 | 0 | 31/2 | 0 | 0 | 4 | 9 | 0 |
| branches-unowned-lines-paid | 390 | 1959 | 2.3 | 0 | 31/2 | 0 | 0 | 5 | 5 | 0 |
| branches-unowned-lines-paid | 430 | 1959 | 2.1 | 0 | 31/2 | 0 | 0 | 4 | 3 | 0 |

`sections: 0` at every width is `sectionCount()`'s known structural miss, not an empty page: this
route has no `.pw-page-shell` (a plain `mx-auto max-w-7xl` div) and no `section[id]` — the two
conventions the metric matches. Captured with `minSections: 0`, the harness's documented
deliberate opt-out for exactly this shape (see `/agent` in `surface-harness.ts`).

## FREE tier — captured, 3/3 widths

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| branches-natural-free | 320 | 1981 | 2.8 | 0 | 31/2 | 0 | 0 | 7 | 9 | 0 |
| branches-natural-free | 390 | 1959 | 2.3 | 0 | 31/2 | 0 | 0 | 7 | 5 | 0 |
| branches-natural-free | 430 | 1959 | 2.1 | 0 | 31/2 | 0 | 0 | 7 | 3 | 0 |

Both tiers render byte-identical layout metrics at every width (same scrollHeight, same container
count, same truncation shape) — tier changes zero structure on this page, confirmed by grep before
writing the spec (no `isPro`/`plan`/`tier` check anywhere in `app/(protected)/branches/page.tsx`,
`lib/insurance/branch-page.ts`, or `components/branches/ProductBranchCard.tsx`). What tier changes
is which policies and which cached score exist — see the §2.2 section below for what that produces.

## Candidates

### §2.2 — «Πιθανό κενό» on lines the customer holds zero policies for: CONFIRMED, exactly as described

Against `applyUnownedLinesProfileFixture` (declares pets, moderate cyber exposure, two dependants —
exposures the paid account holds **no matching policy** for), the force-refreshed score's
`expectedLines` came back `["life","cyber","renters","pet","motor","health"]` and the rendered page
showed, in order, all nine tiles with these exact states (read from `probes.fullText`, 320px):

| tile | state pill |
|---|---|
| Αυτοκίνητο (motor) | Χρειάζεται προσοχή (attention — 22 policies, some expired/expiring) |
| Κατοικία (home) | Δεν έχει αξιολογηθεί (neutral) |
| Υγεία (health) | Χρειάζεται προσοχή (attention — 7 policies) |
| **Ζωή (life)** | **Πιθανό κενό (gap)** |
| Σύνταξη & Αποταμίευση (pension) | Δεν έχει αξιολογηθεί (neutral) |
| Ταξιδιωτική (travel) | Δεν έχει αξιολογηθεί (neutral) |
| **Κατοικίδιο (pet)** | **Πιθανό κενό (gap)** |
| **Cyber** | **Πιθανό κενό (gap)** |
| Επιχείρηση (business) | Δεν έχει αξιολογηθεί (neutral) |

Exactly the three lines the brief names — life, pet, cyber — render «Πιθανό κενό» over **zero**
policies, driven entirely by the declared-exposure profile. `"renters"` is also in `expectedLines`
but does **not** promote `Κατοικία` to `gap`: `buildBranchOverview`'s `expectedTopLevel` set is built
by `normalizeBranch(line).filter(branch => !branch.parentId)` — a line that normalizes to a CHILD
branch (`renters`, parent `home`) is dropped, not walked up to its parent — so only a line that is
*itself* top-level can gap a tile. Worth recording: this is a narrower rule than "the profile expects
`home` cover," and it is the reason `home` reads `neutral` here despite `renters` being in the list.

Contrast against the FREE account's natural state (no declared-exposure profile applied): **zero**
`Πιθανό κενό` tiles — every unheld line reads `Δεν έχει αξιολογηθεί` (neutral), motor/health (both
held) read `Χρειάζεται προσοχή`. This is the CLAUDE.md "absence of a detected problem is not
evidence of no problem" pattern's mirror image: without a declared exposure, the page correctly
does **not** assert a gap it cannot support — the honest behavior — but it also means the vast
majority of accounts (nobody has manually declared pets/cyber/dependants) will see an all-neutral
`/branches` and never see this surface's own headline feature. Not a defect; a scope note for
whatever comes next on this surface.

### Floating avatar over the «Ζωή» card: REFUTED — no avatar renders below 1024px at all

`components/shell/AppShell.tsx:347` — the shell's only initials-avatar block is
`className="hidden lg:block ..."` — confirmed by direct grep before writing this spec. It has no box
at 320/390/430px; there is nothing that COULD float over anything.

Screenshot inspection (`branches-unowned-lines-paid-320.png`, cropped) found exactly one element
overlapping a card anywhere in the full-page capture: the shell's own **fixed bottom navigation
bar** (`fixed bottom-0 ... lg:hidden`, five icons — Αρχική/Πορτοφόλι/Αναλύσεις/Σύμβουλος/Ρυθμίσεις),
appearing once at a scroll-stitch boundary over the **Υγεία (health)** card — not the Ζωή card. This
is the documented full-page-screenshot artifact for `position: fixed` elements: Playwright paints the
fixed bar at its viewport position at each internal scroll step during the stitch, so it appears to
"overlap" whatever content happened to be in the last ~76px of that scroll increment. It is not what
a real user sees while scrolling — `AppShell.tsx:369`'s `main` element carries
`pw-bottom-nav-reserve` specifically to reserve that space (per its own comment, "the reservation has
to include..."), so the bar does not permanently cover any content in normal use. Re-cropping the
capture at the Ζωή card's actual position (~y900-1150 of the 1981px document) shows it clean: icon,
pill, title, and tagline render with no overlap of any kind.

**Verdict: refuted on both counts** — no avatar exists at this viewport, and the one thing that DOES
appear over a card in the screenshot is a capture artifact of a different, correctly space-reserved,
fixed element, and it lands on a different card entirely.

### Truncated descriptions: CONFIRMED — 8 of 9 taglines clip at 320px

Every branch tagline is `<p class="mt-1 line-clamp-2 ...">` (`ProductBranchCard.tsx`). At 320px,
**8 of the 9** clip vertically (`scrollHeight > clientHeight`, mid-word/mid-clause): every tile
except Σύνταξη & Αποταμίευση (pension — short enough to fit in two lines). Identical set on both
tiers (tier does not affect this — it is pure copy length vs. box width). The clip count shrinks as
width grows: **4 of 9** at 390px (home, life, pet, business), **2 of 9** at 430px (home, life) — a
genuine viewport-driven wrap problem, not a fixed-width CSS bug like `wallet-list`'s W2. Sample
clipped text (320px, motor): *"Καταλάβετε τι πραγματικά καλύπτει το συμβόλαιο του αυτοκινήτου σας —
πριν το χρε…"* — cut mid-word inside «χρειαστείτε».

### Nine line cards: CONFIRMED

Both tiers, all three widths: exactly nine `ProductBranchCard` tiles, in the fixed order motor →
home → health → life → pension → travel → pet → cyber → business. `business` is present because
`contentTier: 'rich'` is set for it in the taxonomy with no B2C/B2B segment filter in
`buildBranchOverview` — worth flagging as possibly unintended (a B2C policyholder page advertising a
business-insurance tile), but out of scope to judge here; recorded as observed fact.

### Notification badge overflow — shell chrome, not page-specific

`div.relative` "9+" (paid) / "2"→"3" (free, see below) at `scrollWidth=30 / clientWidth=24` on every
capture, every width, both tiers: the header bell + bottom-nav settings-icon notification-count
badge (`AppShell.tsx:245,432`, `notificationCount > 9 ? '9+' : notificationCount`) overflows its own
24px circle by 6px. Present on every authenticated page this run has captured, not specific to
`/branches` — noted for completeness, not attributed to this surface.

## Not captured in this pass
- A `/branches` state with the profile fixture applied but the score NOT force-refreshed (the
  pre-invariant baseline v1's audit would have hit) — superseded by capturing the post-refresh state
  directly, since that is the state the brief asked for.
- `/branches/[branch]` (the per-branch detail page) — out of scope; this task measured the overview
  only.
