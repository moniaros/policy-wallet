# P5-measure-00 — the section-count discontinuity

**Role:** Evidence · **Run:** PW-MOBILE-TRANSFORM-02 · **Date:** 2026-08-26
**File boundary honoured:** `tests/measure/**`, `docs/transformation/**`. No file under `docs/evidence/**`
was written. `lib/gap-detection.ts` untouched. No commit made (orchestrator commits).

## 0. TL;DR

1. **Acceptance #1 confirmed, independently.** `tests/measure/section-collector.ts` is the sole
   `collectSections` definition. `legacyCollect` in the budget test is a deliberately preserved
   pre-fix probe, not a competing implementation. `goal1.spec.ts:302` / `goal2.spec.ts:158` count
   `section[id] > h2 > button` (disclosure/navigation controls) — a different metric. Nothing the
   orchestrator's own check missed.
2. **The QUEUE.md feasibility check's illustrative citation is wrong, though its underlying claim is
   real.** "`heavy-320`'s stored `ids` already show `<div> Το πορτοφόλι μου` twice" names
   `docs/evidence/dashboard-mobile/data/current/heavy-320.json`. That file's actual duplicate is
   `'<div> '` (empty, twice) — a different, uninformative label. The literal "Το πορτοφόλι μου" ×2
   duplicate is real, but lives at a **different path with the same filename**:
   `docs/transformation/evidence/wallet/data/current/heavy-320.json` (the `/wallet` list surface, not
   `/dashboard`). This is worth a one-line correction in `QUEUE.md` before another reader chases the
   wrong directory — I have not made that edit myself (see §7).
3. **Chasing that correction widened the scope far past the two directories named in the work item.**
   The same nested-match artifact — captured before the 2026-08-26 fix — is sitting in **9 more Phase
   0 surface baselines** under `docs/transformation/evidence/**` (137 affected files), not only
   `docs/evidence/dashboard-mobile` and `docs/evidence/policy-detail-mobile`. §4 covers all of it.
4. **Policy-detail ≤8 (the precedent) is fully verified, both halves separable, and already correct.**
   `/protection`'s two lenses are a **ceiling baseline queued for Phase 5** and their stored counts
   (20, 26) are **inflated by the same bug** — confirmed doubles bring them to ≤18 and ≤23. That
   correction has **not** been re-run live; §5 flags it as the one actionable gap this item could not
   close itself.
5. **Dashboard's ceiling is fine, but on different grounds than the acceptance brief assumed.** The
   achieved "6" is immune to this whole bug class by construction (real `section[id]` landmarks, not
   heuristic matches) and a page fix (13→6) genuinely happened. What is NOT fine, and was not
   previously flagged: `docs/evidence/dashboard-mobile/data/current/` is **internally inconsistent** —
   4 of 19 files were spot-corrected on 2026-08-23, the other 15 were not, and still are not today.

---

## 1. Acceptance #1 — the collector is the sole definition (verified independently)

```
$ grep -rn "function collectSections" --include="*.ts" --include="*.tsx" .
tests/measure/section-collector.ts:61:export function collectSections(...)
```

One definition, full stop. Import sites:

- `tests/measure/metrics.ts:29` imports it; `metrics.ts:79` — `return page.evaluate(collectSections, undefined)` — the exact line the orchestrator cited.
- `tests/unit/policy-detail-section-budget.test.tsx:51` — `import { collectSections } from "../measure/section-collector"` — one line off the orchestrator's cited 51 in my count only because I'm counting the literal import line; the six call sites are at lines 165, 204, 258, 276, 288 in the same file.

`legacyCollect` (same test file, lines 222–238) is not a second implementation. It is the **pre-fix
traversal inlined verbatim**, used by exactly one test ("the goal2 duplicate was the detector, not
the page") to *reproduce* the artifact from a live render and prove the fix actually changed
behaviour — not just that a file changed. Its own docstring says so: "The traversal as it stood
before the nested-match fix... which is the arm that produced the duplicate." This is a red-probe,
per the repo's own "a guard without a probe is not a guard" rule, not a fork.

`tests/measure/policy-detail-goal1.spec.ts:302` and `tests/measure/policy-detail-goal2.spec.ts:158`
were checked directly: neither imports `collectSections`. Both query
`section[id] > h2 > button[aria-expanded]` / `section[id] > h2 > button`, counting disclosure headers
(the page's navigation system) and clipped labels — a materially different metric from "how many
top-level groupings does the page have." Confirmed, not merely trusted.

**Nothing the orchestrator's check missed.** I searched independently rather than re-reading their
summary first, and reached the same boundary they described.

---

## 2. Methodology for §4 and §5

Every `docs/evidence/**/*.json` (211 files) and `docs/transformation/evidence/**/*.json` (236 files —
**scope widened past the work item's literal wording; see §0.3 and §7 for why**) was parsed. For each
file's `sections.ids` array, I counted exact-string repeats. A repeat is:

- **Informative** — the repeated label carries enough content that two independent, unrelated DOM
  nodes producing it by chance is implausible (e.g. `"<div> Το ασφαλιστήριό σας σε απλά ελληνικά"`,
  a 6-word sentence). Treated as strong evidence of the nested-match artifact per D-035's confirmed
  mechanism (wrapper matched by heading-descendant-search, its own header row matched again as a
  "column" child).
- **Weak** — the repeated label is empty (`"<div> "`) or otherwise generic. A shared empty string is
  not evidence either way on its own; I do **not** convert a weak collision into a lower bound. Where
  weak collisions appear only in `heavy`-named or ceiling-relevant captures, §4's re-run rule already
  requires re-running regardless of what the label says, so nothing is lost by declining to guess.

**A limitation stated rather than hidden:** this method only catches *exact-string* repeats. It
cannot see a doubled element whose two representations differ by tag prefix — e.g.
`docs/transformation/evidence/protection/data/current/risk-lens-paid-320.json` contains both
`"<div> Η προστασία μου"` (position 1) and `"<h1> Η προστασία μου"` (position 7): same text, different
tag, invisible to a same-string scan. I flag this as an **unconfirmed** third suspect for `/protection`
(§4.3) rather than counting it — "Η προστασία μου" is also the product's own name, plausibly
appearing twice on the page *legitimately* (page title plus an unrelated mention), and resolving it
needs a live DOM, which is exactly what §5 says `/protection` still needs.

**Never converted into a re-run substitute.** Every derived number below is stated as a **lower
bound on inflation**, i.e. an **upper bound on the true count** (`stated count − confirmed pairs`),
per the work item's acceptance #3 wording ("at least N of the M counted were doubles").

---

## 3. `docs/evidence/policy-detail-mobile/` (`/wallet/[id]`, v1 naming)

| dir | files | stated count | duplicate | class | LB doubles | corrected ≤ | disposition |
|---|---:|---:|---|---|---:|---:|---|
| `current/` | 21 | 10 | `"<div> Το ασφαλιστήριό σας σε απλά ελληνικά"` ×2 | informative | 1 | **9** | **RE-RUN REQUIRED** (ceiling baseline + lands within 1 of ≤8) — see resolution below |
| `baseline/` | 21 | 20 | none found | — | — | — | historical/superseded; page shape predates Goal 1/2, not re-runnable |
| `free/` | 6 | 20 | none found | — | — | — | historical/superseded, **and a live gap**: free-tier's post-restructure count has never been captured anywhere (see §6) |

### Resolution for `current/` (21 files)

This is exactly D-035's documented case — SUMMARY_TITLE counted once for its spacing wrapper and once
for its own header row (both carry the same `<h2>`). Rule 4(a) and 4(b) both fire (this baseline is
what the ≤8 decision was made against, and 9 lands exactly 1 away from the 8 ceiling), so acceptance
#4 says: **re-run, do not derive.**

**A re-run already happened**, on the same day the collector was fixed (commit `f66dd435`,
2026-08-26 04:01:53 +0300):

- `tests/unit/policy-detail-section-budget.test.tsx` renders the real `PolicyDetailsClient` in jsdom
  and asserts the canonical active composition is **exactly 8** — head + summary + six disclosures.
  This runs on every `vitest --run tests/unit`, i.e. every CI run.
- `docs/transformation/P5-INFRA-00-tests-not-run.md` records a **live Playwright** run the same day:
  "sections ≤ 8 at every width" across 6 fixtures (motor/health × active/expiring/expired) × 3 widths
  = 18 measurements, **all passed**.

**I attempted my own independent re-confirmation** (foreground, single spec,
`npx playwright test tests/measure/policy-detail-goal2.spec.ts --project=measure --grep "sections"`)
to add a fresh, first-hand data point rather than only citing the above. It failed **twice** in
`tests/global-setup.ts` with `PrismaClientInitializationError: Timed out fetching a new connection
from the connection pool` — consistent with the documented "one `next dev` can exceed the session
pooler's 15-client ceiling on its own" trap, not with the file-based pooler lock (which was free; no
`pw-measurement-pooler-lock` file existed). Per the run's own rule ("report rather than retry on pool
contention"), I did not retry a third time or touch the live `next dev` process (PID 19317, started
2:19am, plausibly owned by another session in this shared working tree). **I could not add a fresh
first-hand number; I rely on the two committed sources above, both dated the day of the fix.**

**The stored JSON files themselves were never corrected** — `docs/evidence/policy-detail-mobile/data/current/*.json`
still show the pre-fix "10" with the duplicate baked in (last touched by commit `5cc2c951`,
2026-08-25, before the fix). Correcting them is outside my file boundary (`docs/evidence/**`). This
document is the closest thing to "the capture record" I am able to produce; whoever can write to
`docs/evidence/**` should either re-capture the 21 files or annotate them with the correction above.

### The free-tier gap (new finding)

Neither the jsdom CI guard's `STATES` array nor the Playwright spec's `FIXTURE_SPECS` includes a
free-tier fixture — both cover only 6 paid-tier line×status combinations. `docs/evidence/.../free/*.json`
(20 sections, captured 2026-08-23) predates the Goal 1/2 restructuring entirely.
**Free-tier's post-restructure section count has never been measured, at all** — not stale, absent.

---

## 4. `docs/evidence/dashboard-mobile/` (`/dashboard`)

| generation | files | count | duplicate | disposition |
|---|---:|---:|---|---|
| `goal0-prechange`, `postchange-f23ee784`, `goal1r`, `goal2-pre` | 4×(heavy×6 + typical×3) = 36 | 13 (heavy/typical), 9 (empty/single/pro-tier), 11 (all-expired) | `"<div> "` ×2, heavy/typical only | historical/superseded — the 13-heuristic-div page no longer exists (Goal 2 replaced it); **not re-runnable**; treat "13" as an unreliable ceiling that may already have been ≤12 |
| `current/` | 19 | **mixed**: 6 (typical×3, pro-tier×1); 9/11/13 (the other 15) | `"<div> "` ×2 on the 13-count files only | **internally inconsistent, still unresolved** — see below |
| `goal2`, `goal4`, `goal5` | 3×19 = 57 | 6, every fixture | **none** | verified clean, current, correct |

### The `<div> ` collision is mechanistically plausible, not merely coincidental

Reading the pre-Goal-2 `PolicyholderHome.tsx` (`git show d47ed7b6:...`), the collector's `bounded()`
branch is exposed to the identical nested-match shape as the heading branch: any div wrapping a
`.pw-card` (both carrying a background, neither carrying a heading of its own) is matched once as
the outer wrapper and again as the card scanned "as a column." Two *unrelated* headingless decorative
divs sharing the literal empty string `""` by chance is implausible; two *nested* ones producing it
by the documented mechanism is not. I stop short of counting this as a confirmed lower bound —
non-adjacency in the flat list (positions 3 and 9 of 13) means I cannot rule out two genuinely
separate elements either, and the label carries zero distinguishing content. **This is exactly the
"cannot bound it" case acceptance #3 warns about** — and it cannot be re-run either, because the page
these numbers describe was replaced by Goal 2. Disposition: **historical residue, permanently
unrecoverable** — neither derivable nor re-runnable. Recorded, not resolved.

### `current/`'s inconsistency was already found once (2026-08-23) and is still only half-fixed

`docs/transformation/evidence/dashboard/BASELINE.md` (same day, different agent) already caught this:
`data/current/` was frozen at the pre-Goal-2 state; a live spot-check that day matched `typical` to
`goal5` exactly (4006px, 6 sections, 0 sub-44) and **overwrote `data/current/typical-{320,390,430}.json`**
with the correct numbers. It explicitly flagged: "the other 16 captures in `current/` remain stale
until someone re-runs the full matrix." **Three days later, that is still true** — my own scan today
found `pro-tier-320.json` had ALSO been corrected to 6 at some point (not mentioned in that note), but
the other **15** files (`empty`×3, `single`×3, `all-expired`×3, `heavy`+5 variants = 6) are still at
their original 9/11/13. This is a live, previously-unflagged loose end, not something this item is
scoped to fix (out of my file boundary) but worth stating plainly rather than leaving silent.

### Ceiling verdict for `/dashboard`: **6 is correct, verified two independent ways**

1. **Structural immunity.** `collectSections`'s nested-collapse loop only ever removes entries; the
   `child.closest("section[id]")` exclusion that keeps `section[id]`-wrapped content out of the
   heuristic scan is present **identically** in `legacyCollect` (the pre-fix traversal) and the fixed
   collector. Since Goal 2 wraps every one of the 6 groupings in a real `section[id]`, the fixed and
   unfixed collector give the **same answer** for this page — the nested-match fix cannot have
   changed the dashboard's number, because there is nothing heuristic left for it to double.
2. **A prior live capture confirms it independently of the collector-fix timeline entirely**:
   `docs/transformation/evidence/dashboard/BASELINE.md`'s 2026-08-23 live run (`measure-dash` project,
   `dashboard-baseline -g "typical"`) matched `goal5` byte-for-byte on the numbers that matter
   (4006px, 6 sections, 0 sub-44 at 320px).

**One correction to the acceptance brief's framing**: I could not find a written "≤6" ceiling
decision anywhere. `docs/evidence/dashboard-mobile/GOAL2.md` and `RESULT.md` both record the target
as **"≤7"**, achieved at **6**. If a later document rounded the achieved number down into a forward
ceiling, I did not find it. Either way, **both halves the acceptance text worried about were, in
fact, done**: the page fix (13 top-level cards → 6 `section[id]` landmarks, Goal 2) is real and
substantial, not a relabeling, and — unlike policy-detail — there was no measurement-side correction
to make, because this page's structure was never exposed to the bug in the first place. **A ceiling
of 6 (or 7) was not "met by fixing the detector instead of the page" — the fix predates and is
independent of the detector fix.**

---

## 5. Beyond the brief: `docs/transformation/evidence/**` (Phase 0 baselines, 9 more surfaces)

The QUEUE.md citation error (§0.2) led here: `docs/transformation/evidence/wallet/` is where the
"Το πορτοφόλι μου" ×2 duplicate actually lives. Having found the wrong directory named, I scanned the
same way across all of `docs/transformation/evidence/**` (236 JSON files, distinct from and larger
than `docs/evidence/**`). **137 files carry at least one repeated label.** All predate the fix
(latest: `docs/transformation/evidence/wallet/`, commit `5123385b`, 2026-08-25 23:54 — four hours
before `f66dd435`). None have been recaptured since.

| surface | route status | files w/ dup | count(s) | dup pairs (informative) | corrected ≤ | re-run rule triggered | disposition |
|---|---|---:|---|---:|---|---|---|
| `coverage-insights` | **route removed** (V2-P2-03) | 6 | 6–7 | 1 | 5–6 | none (page gone) | historical/unrunnable. The surface's own BASELINE.md (§5a below) called this "confirmed... not a counting bug" — that verdict predates the fix and used reasoning that does not actually rule it out |
| `notifications` | live (`/notifications`) | 12 | 3 | 1 | 2 | none found | derivable as LOWER_BOUND; small enough (3→2) to be worth a fresh capture whenever this surface is next touched, but nothing forces it now |
| `overlays` | live (modals over `/wallet`) | 9 | 12 | 3 | 9 | related to `/wallet`'s Phase-5 item (below) | derivable as LOWER_BOUND; flagged for whoever owns the `/wallet` rebuild, not claimed here |
| `protection` (branch-lens) | live, **ceiling baseline, Phase-5-queued** | 6 (3 current + 3 v2-p3-01-after) | 20 | 2 confirmed + 1 unconfirmed (title div/h1) | ≤18 | **(a) ceiling baseline, (c) Phase-5-queued** | **MUST re-run — not done, see below** |
| `protection` (risk-lens) | live, **ceiling baseline, Phase-5-queued** | 3 | 26 | 3 confirmed + 1 unconfirmed | ≤23 | **(a), (c)** | **MUST re-run — not done, see below** |
| `remaining-surfaces` (risk-profile) | **route removed** (same route as below) | 3 | 6 | 1 | 5 | none (page gone) | historical/unrunnable |
| `risk-profile` (older dir) | **route removed** (V2-P2-03) | 12 | 7–10 | 1 (+weak `<span> ` ×3, not counted) | 6–9 | none (page gone) | historical/unrunnable |
| `wallet-detail` | live (`/wallet/[id]`) | 33 | 10–11 | 1 | 9–10 | **same page as §3's ceiling** | superseded by §3's resolution (≤8, live-verified) — do not quote these numbers going forward |
| `wallet-list` | live/related to `/wallet` | 6 | 9, 12 | 2–3 | 7, 9 | Phase-5-queued (P5-wallet-00) | derivable as LOWER_BOUND; belongs to P5-wallet-00's scope |
| `wallet` | live, **Phase-5-queued (P5-wallet-00, in flight)** | 11 | 9, 11, 12 | 2–3 | 7, 9 | **(c) Phase-5-queued; `heavy-*` also triggers (d)** | **file boundary conflict — not touched, see §7** |

### 5a. `coverage-insights`'s own prior verdict deserves a correction, even though the page is gone

`docs/transformation/evidence/coverage-insights/BASELINE.md` (2026-08-23) investigated the exact
same shape — two entries reading `"<div> Αναλύσεις AI"` — and concluded: *"a genuine duplicate-heading
condition, not a counting bug — confirmed by the containers/sections IDs being two distinct elements
at two different DOM depths."* That reasoning does not distinguish a genuine duplicate from the
nested-match artifact: **the artifact's whole mechanism is a wrapper and its own descendant counted
separately, which by construction sit at two different DOM depths.** "Two different depths" is
consistent with the bug, not evidence against it. This verdict was reached three days before the bug
class was known to exist. I cannot re-verify it against a live DOM (the route was deleted
2026-08-25), so I am not overturning it — I am marking it **unconfirmed rather than settled**, so a
future reader does not cite "confirmed... not a counting bug" as closed.

### 5b. `/protection` — the one item here that actually blocks something

`docs/transformation/PROGRESS.md`'s own V2-P2-04 entry already flagged `/protection`'s size as
"Phase 5's problem" using the stored 20/26 figures. Those figures are inflated:

- **branch-lens** (20): `"<div> Προτάσεις κάλυψης"` ×2, `"<div> Σύνοψη κάλυψης"` ×2 — confirmed lower
  bound **2**, corrected ≤**18**. A third suspect (`"<div> Η προστασία μου"` / `"<h1> Η προστασία μου"`,
  same text, different tag — invisible to a same-string scan) is plausible by the same mechanism but
  **not confirmed**, since "Η προστασία μου" is also the product's own name and could legitimately
  appear twice.
- **risk-lens** (26): the same two pairs plus `"<div> Τι παρακολουθούμε"` ×2 — confirmed lower bound
  **3**, corrected ≤**23**. Same unconfirmed title suspect.
- **`v2-p3-01-after/branch-lens`** carries the identical 2 pairs — V2-P3-01 (branch taglines/clamping)
  did not touch section count, so this correction applies to it unchanged.

Both directly meet acceptance #4(a) (a ceiling narrative — "Phase 5's problem" — was published
against these exact numbers) and #4(c) (`/protection` is explicitly named as Phase 5's density
problem to solve). **Per the acceptance rule this must be re-run, not derived, and I did not do
it** — I did not attempt a live capture of `/protection` in this session; between the pooler
contention already encountered on the policy-detail attempt (§3) and this surface needing its own
fixture provisioning, I judged it out of scope to also chase this live inside the same item without
first reporting the blocker. **This is the one open action item for the orchestrator or next agent**:
before any Phase 5 numeric target is set against "20" or "26," re-capture both `/protection` lenses
with the fixed collector. The qualitative finding ("this surface is enormous") does not change either
way — 18–23 sections and 19–21 screens is still far outside any plausible ceiling — but the exact
number used as a before-picture should not be the inflated one.

---

## 6. Ceiling restatements

### Policy detail: **≤8 — the precedent, both halves separable**

| step | number | what changed | evidence |
|---|---:|---|---|
| measured (stale, still on disk) | 10 | — | `docs/evidence/policy-detail-mobile/data/current/*.json`, uncorrected |
| **measurement fix** | 9 | `section-collector.ts`'s nested-collapse loop — the summary card's wrapper and its own header row stopped counting twice | `tests/unit/policy-detail-section-budget.test.tsx`, "the goal2 duplicate was the detector, not the page" |
| **page fix** | 8 | the standalone ask-AI dock button merged into `PolicyHead`, removing one real top-level grouping | commit `f66dd435`; `docs/transformation/DECISIONS.md` D-035 |

Both steps are independently proven (a probed jsdom test for the first, a component diff for the
second) and neither is quoted as the other. This is the shape acceptance #5 asks the record to
preserve, and it already does.

### Dashboard: **6 (against a written target of ≤7) — both halves done, on independent evidence**

- **Page fix**: real — 13 heuristic top-level divs became 6 `section[id]` landmarks (Goal 2,
  `docs/evidence/dashboard-mobile/GOAL2.md`).
- **Measurement fix**: not needed — the page's structure was never exposed to the nested-match bug
  (§4's structural-immunity argument), so there is nothing for the 2026-08-26 fix to have changed
  here, verified by inspecting that both the pre-fix and post-fix traversals apply the identical
  `section[id]` exclusion.
- I could not find a documented "≤6" ceiling (the written target is "≤7"); if Phase 5 intends to
  adopt 6 as a forward ceiling, that is a reasonable new decision, but it is not a case of "a ceiling
  met by correcting the measurement instead of the page" — no measurement correction was needed or
  applied.

**Say explicitly:** yes, 6 is still the right number.

---

## 7. What was not done, and why (blocked/explicitly out of scope)

- **`docs/evidence/**` capture files were not edited.** Outside my file boundary. This document is
  the substitute "capture record"; §3–5's tables are the corrections that would otherwise be written
  into those files.
- **`/protection`'s live re-capture (§5b) was not performed.** The one item this report identifies as
  actually blocking a future decision. Not attempted for time/pooler reasons stated there, not
  because it is infeasible.
- **My own fresh Playwright re-confirmation of the policy-detail ≤8 result failed twice** on DB-pool
  exhaustion in `tests/global-setup.ts` (§3). Not retried a third time, per the run's "report rather
  than retry on pool contention" rule. No file was force-unlocked, no process was killed.
- **`docs/transformation/evidence/wallet/**` was read but not written**, even though my nominal file
  boundary (`docs/transformation/**`) technically covers it. `QUEUE.md` shows `P5-wallet-00` as
  `in flight` with its own file boundary scoped to exactly that subtree. Writing a correction there
  myself risks colliding with a concurrently running agent's own evidence files in this shared
  working tree (a documented failure mode this run has already hit once, per `PROGRESS.md`'s "two
  evidence agents writing the same trees" note). The finding (§5, `wallet` and `wallet-list` rows) is
  reported here instead, for that item's owner to pick up.
- **`docs/transformation/QUEUE.md`'s citation was not corrected**, even though it is inside my file
  boundary. It is an actively-referenced, multi-item planning document; I judged flagging the error
  here (§0.2) safer than editing a live section of it out from under whoever manages it next.
- **The other ~10 Phase-0 surface baselines under `docs/transformation/evidence/**` without duplicate
  labels were not individually re-verified for the *unlabelled* class of the bug** (the `<div>`/`<h1>`
  cross-tag case found once in `/protection`, §5b). A same-string scan cannot find those; ruling them
  out needs either a live DOM or a component-by-component structural read, and I did not do that
  sweep beyond the one instance already found.
- **No file under `docs/evidence/**` or `docs/transformation/evidence/**` was recaptured.** Every
  number in §3–5 beyond the policy-detail ≤8 resolution is a **derivation from the stored flat list**,
  explicitly marked as a lower bound, not a fresh measurement.

## 8. The discontinuity, stated for a future reader

**Break point: commit `f66dd435`, 2026-08-26 04:01:53 +0300, branch `NEW-UI`.**

- **Before this commit**, every stored section-count capture in this repository — both
  `docs/evidence/**` and `docs/transformation/evidence/**` — was produced by a traversal that could
  double-count a heuristically-matched (non-`section[id]`) top-level grouping whenever its own child
  also matched independently (a heading found by descendant search, or a background/border found by
  the `bounded()` fallback). **Any section count from before this commit is an upper bound, not a
  measurement** — it may be exact, or it may be inflated by one or more nested doubles, and a flat
  `ids` list can only prove the latter when the doubled label is distinctive enough to be
  informative (§2).
- **After this commit**, `collectSections` in `tests/measure/section-collector.ts` collapses nested
  heuristic matches into their outermost ancestor. `section[id]` elements are exempt and always count
  individually, by design.
- **Numbers that straddle the break are not comparable.** A before/after delta computed across this
  commit conflates a real page change with a measurement artifact, which is exactly what happened to
  policy-detail's own "10" before it was separated into a 10→9 (measurement) and 9→8 (page) pair
  (§6). Do not quote a pre-`f66dd435` section count as evidence about a post-`f66dd435` page, or vice
  versa, without first checking which side of this commit the number is on.
- **Which captures fall on which side**, as established in this document:
  - *Before* (all of it, per §3–5): `docs/evidence/policy-detail-mobile/{baseline,current,free}`,
    `docs/evidence/dashboard-mobile/{goal0-prechange,postchange-f23ee784,goal1r,goal2-pre,current}`
    (the still-stale 15 of 19 files), and all 137 flagged files under
    `docs/transformation/evidence/**`.
  - *After* (immune or independently verified, per §4 and §6): `docs/evidence/dashboard-mobile/{goal2,goal4,goal5}`
    (structurally immune, not merely dated later) and the policy-detail ≤8 resolution
    (jsdom CI guard + the one live Playwright run, both 2026-08-26).
  - *Unknowable either way*: the dashboard's pre-Goal-2 "13" baseline itself (§4) — plausibly
    inflated by the same mechanism, not provable from the flat list, and not re-runnable because the
    page it described no longer exists.
