# PROGRESS — PW-MOBILE-TRANSFORM-01

Cold-start document. Written for a reader with **no history**. On restart read this, then
`QUEUE.md`, `DECISIONS.md`, `HALTS.md`, then re-enter the loop at step 2. Do not re-derive
anything recorded here. Do not re-run completed work.

---

## What this run is

Mobile transformation of PolicyWallet's authenticated **B2C** surface at 320/390/430 CSS px in
Greek. Branch `NEW-UI`. Seven phases (−1, 0, 1, 2, 3, 4, 5, 6). Full contract is in the
originating instruction; the operative invariants are §2 and the halt conditions are §12.

**Working rule that matters most:** absence of a detected problem is never reassurance.

## Execution architecture

Orchestrator / Product-Truth / Adversarial Reviewer are held in-session at **Opus 5**.
Implementation, Design-System and Guard authoring dispatch as **Fable 5** subagents; measurement
and fixtures as **Sonnet 5**; mechanical sweeps as **Haiku 4.5**. This is what makes "never review
your own implementation" structural. Approved by the human at run start, along with an
accept-edits escalation scoped to `app/(protected)/**` (B2C only), `components/**`,
`lib/i18n/translations/**`, `lib/notifications/**`, `lib/email/templates/**`, `tests/**`,
`docs/**`, `app/globals.css`.

**Node 20.20.2 is required** — `nvm use` before any vitest invocation, or every run dies at
`failed to load config from vitest.config.ts` with `ERR_REQUIRE_ESM`, which looks like a broken
config and is a wrong Node version. This bit once already this run.

---

## Checkpoint 1 — Phase −1 complete

**Phase status:** −1 done. Phase 0 open, nothing started.
**Halts open:** 0. **Ledger delta:** none (no capability touched).

### Run-start verification (§0.10)

| Check | Result |
|---|---|
| `lib/gap-detection.ts` | sha256 `69d2c946aaefc309a1c09f0a72b13baebddc173811e33f4de0b592ca1259b859`, commit `7f6990b7`. Untouched. |
| AI schemas accept `isDetected` / `severity` | **No.** Removed from `ai-service.interface.ts:67,180` and `prompts.ts:158`. The survivor at `gap-analysis.service.ts:58` is dead legacy — see D-001. |
| Dispatch stub | **Was broken. Now holds.** See T-001 below. |

### Four premises in the contract corrected before acting on them (D-001…D-004)

1. **The harness already exists** — `tests/measure/`, 4,171 lines, and already honours §5.1's
   one-definition rule (`dashboard.ts` imports from `policy-detail.ts`). Reuse and rename; do not
   build a second one.
2. **The fixture matrix already exists** — 19 captures incl. three degraded states.
3. **Αρχική's stated evidence is stale.** The contract describes 12 sections / nine-plus CTAs;
   the dashboard mobile series shipped on `dd815b3d` and `docs/STATUS.md` records 6 sections,
   1 primary CTA, 0 sub-44px, 0 count-consistency failures. Every candidate defect is therefore
   re-verified against HEAD rather than trusted (T-014).
4. **Notification dedup needs no schema change** — `orchestrator.ts:354` appends the channel to a
   channel-independent base `dedupeKey`. §6.1 item 6's halt does not fire.

---

### T-001 — Outbound dispatch stub · DONE

role: Orchestrator → implementation held in-session (safety precondition, not delegated)
model: Opus 5 · mode: default → accept-edits

**This was a live §12.3 run-blocker, found at run start, not in Phase 0.**

`BREVO_API_KEY` is set and non-empty in `.env.local`. `lib/email/email-service.ts` short-circuited
only when that key was **absent**, so on this machine `sendEmail` fell through to
`fetch(api.brevo.com/v3/smtp/email)` and mailed real people — from a dev process, and from any
test that walked a send path. The Phase 0 outbound-copy inventory renders every template, which
would have dispatched every one of them.

The rule is now: **environment decides, credential presence is irrelevant.**
production → send · test → **throw** · anything else → skip and log, no socket.

Files touched:
- `lib/outbound/dispatch-guard.ts` (new) — one decision, shared by every transport
- `lib/email/email-service.ts` — guard before the credential check; dev log now redacts the address
- `lib/push/web-push.ts` — same guard
- `lib/services/push.service.ts` — same guard
- `tests/unit/outbound-dispatch-stub.test.ts` (new) — behaviour + enumeration halves

**What the enumeration half caught:** a **third** transport, `lib/services/push.service.ts` (FCM
HTTP v1), which I had not wired and which the behaviour tests alone would have passed straight
over. It carried the identical defect — "Dev mode: log instead of sending" gated on
`FCM_PROJECT_ID` being unset, i.e. credential presence again. This is the "fixed here, broke
there" class caught inside the item that created it, and it is the argument for the
enumerate-don't-assume rule in one example.

**Failure proofs (§1.7 — a guard that has never failed is not a guard):**

| probe | result |
|---|---|
| Enumeration half, unpatched FCM transport | **RED** — `lib/services/push.service.ts (FCM push)` listed as unguarded |
| After wiring FCM | GREEN, 5/5 |
| Behaviour half, guard swapped back to credential-presence in `email-service.ts` | **RED** — "throws rather than dispatching email from a test run" failed |
| Probe reverted | GREEN, 5/5 |

`tsc --noEmit` clean.

**The guard broke five existing tests, and the fix was not to weaken it.**
`tests/unit/web-push-crypto.test.ts` exercises the transport's own internals — RFC 8291
encryption, VAPID JWT shape, 410-Gone pruning — against a replaced `globalThis.fetch`. Those are
legitimate and nothing leaves the process, but the guard cannot see that a mock is installed.

Resolved with `withStubbedOutboundTransport(fn)`: a callback-scoped opt-in that always unwinds in
`finally`, wrapped around the six transport call sites in that file. Deliberately awkward, because
the failure mode to avoid is someone reaching for it to silence a feature test that happens to
send mail. A sixth assertion in the guard enforces that: the helper may appear nowhere under
`lib/` or `app/`, so product code cannot reach the escape hatch at all.

| probe | result |
|---|---|
| Escape hatch imported into `lib/notifications/dispatch.ts` | **RED** — named as an offender |
| Probe reverted | GREEN, 6/6 |

Full suite after the item: **5054 passed / 461 files**, lint clean, `tsc --noEmit` clean,
`audit:api-auth` 0 findings, i18n and UTF-8 checks pass.

Reviewer (Adversarial, Opus 5): **PASS** — defect removed at all three chokepoints, not relocated;
no capability lost; guard proven red before green in all three halves.

---

---

## Checkpoint 2 — Phase 0 partial

**Phase status:** Phase 0 open. T-010 done, T-011 in flight (Sonnet 5), T-014 substantially
advanced. T-012/T-013/T-015/T-016 not started.
**Halts open:** 0. **Ledger delta:** none.

### T-010 — B2C surface enumeration · DONE (Haiku 4.5)
`docs/transformation/SURFACES.md`, 430 lines. **24 B2C routes · 7 overlays · 19 agent · 43 admin
· 86 protected total. Zero broken navigation destinations.** Three routes unreachable from default
nav, all intentionally gated.

Three classifications spot-checked against source rather than trusted, all correct:
`/wallet/[id]/review` is agent-only (`isAgentRole` → `notFound()` at line 24);
`/insights/risk-profile` is B2C (reads the caller's own `policyholderProfile`); dashboard hrefs all
resolve.

### T-014 — candidate verification · 15 of the brief's candidates closed
Full detail in `docs/transformation/evidence/CANDIDATE-VERIFICATION.md`.
**CONFIRMED 7 · REFUTED 4 · DIFFERENT 4 · PENDING 2.**

The single most important number in this run so far: **the protection score reaches customers
through 5 outbound sites, not 1.** The brief named one symptom; grep found four templates; reading
`lib/notifications/risk-events.ts:176-190` found the **emitter** that produces the exact string the
brief quotes. Any fix that stops at the templates leaves the emitter running.

Four candidates were refuted and would have caused wrong work if taken at face value:
«ΑΣΦΑΛΙΣΤΙΚΟ ΑΠΟΤΥΠΩΜΑ» is already renamed to «Συνολικό ετήσιο ασφάλιστρο»; the dashboard verdict
label is already gone; gap notifications carry no severity; and `NotificationPriority` is delivery
ranking, not gap severity — migrating it would have been a large, wrong change across ~15 registry
entries.

Two more were reclassified in ways that move the fix: «Καλώς ήρθατε πίσω, E2E!» is a clean Greek
string with a fixture display-name leaking through it (identity scrubbing, not i18n), and the
English notification bodies are already intercepted — but only for `policy_analyzed`, by name,
falling back to raw stored text for every other event type.

### D-005 — the finding that generalises
`tests/unit/score-containment.test.ts` enumerates its universe from the filesystem exactly as
`CLAUDE.md` demands, and still cannot see the worst violation in the product, because its universe
is `components/` + `app/` and every outbound template is in `lib/`. A second guard scans the
templates but asserts only that no score *trend* is claimed. Right invariant, wrong universe;
right universe, narrower invariant. **A guard's universe is part of the guard.** Fix is to extend
the existing guard (§11.1 forbids a second), not to add one.

### Instrumentation reality check
`data-fact` appears 8 times in the entire product, all on policy-detail; `data-count` 3 times;
`data-action` zero. An attribute scan today returns a vacuous zero on 22 of 24 surfaces.
`docs/transformation/INSTRUMENTATION-PLAN.md` now specifies the full key set; baselines must record
attribute scan AND value scan until coverage lands, with the value scan authoritative meanwhile.

---

## Checkpoint 3 — Phase 0, five items complete

**Phase status:** Phase 0 open. Done: T-000, T-001, T-010, T-011, T-016 (string inventory half).
In flight: chrome audit (Sonnet), T-012 degraded fixtures (Sonnet). Advanced: T-013 enumeration
half, T-014 at 16 candidates. Not started: T-015 baselines (blocked on T-012), LEDGER (3 of 20
surfaces).
**Halts open: 1** — H-001, blocking only the score's final disposition, not Phase 1's removals.
**Ledger delta:** Ειδοποιήσεις enumerated, 10 rows, 2 removals both of delivery metadata.
**Guards added: 2** — outbound dispatch stub (3 failure proofs), metrics equivalence (36
assertions). Suite 5054 → **5090**, all green.

### The three findings that changed the plan

1. **The score reaches customers through five outbound sites, not one.** The fifth is the emitter,
   `lib/notifications/risk-events.ts:176-190`, which produces the exact string the brief quotes. A
   fix confined to templates leaves it running.
2. **Three of the four broken portfolio states email a perfect score.** `provisionalProtectionScore`
   implements "nothing to score" as `policyCount === 0`, so never-analysed, all-expired and
   analysis-failed all return **100** with a green zero-gaps tile. H-001 raised with all four states.
3. **Guards pass while their invariant is violated, because their UNIVERSE is too small.** Three
   separate instances now: `score-containment` scans `components/`+`app/` and cannot see `lib/`
   (D-005); the equivalence guard was written into a directory CI never runs (D-009); and
   `NON_LIVE_POLICY_STATUSES` was adopted by three of five call sites (D-007). Every §11.2 guard
   must state and justify its universe against `SURFACES.md`.

### Two subagent results were wrong and were caught

- **809 missing Greek keys — refuted (D-008).** Key parity is compiler-enforced: `en` is typed
  `typeof el`, deleting a key yields TS2741, and type-check is green. Believing it would have
  queued a fabricated 800-key translation project. **A mechanical sweep's findings are evidence;
  its totals are a claim about its own parser.**
- **A guard outside the CI path (D-009)** — flagged by the agent that wrote it, fixed by moving it.

### One process failure of mine (D-010)

Commit `61dd4297` contains a zero-byte rename its message never mentions. A subagent's `git mv`
stages into the shared index and `git commit` takes the index, not the paths I `git add`ed. All
seven run commits audited; that is the only stray and no parallel session's work was captured.
Standing practice now: print `git diff --cached --name-only` before every commit. This matters
because several other sessions are live in this same working tree.

### What a cold start should do next

1. Wait for / re-dispatch **T-012** (degraded fixtures) — it is the critical path; T-015 baselines
   and every Phase 1 verification depend on it.
2. **T-013 metric half** — now unblocked by T-011's pure predicates
   (`findInternalTokens`, `findLatinSentences` in `tests/measure/metrics.ts`). Run them against
   rendered template TEXT, not the DOM.
3. **Finish the LEDGER** — 17 of 20 surfaces remain; format and worked example are in `LEDGER.md`.

Phase 1 is queued with seven evidence-backed items (P1-01…P1-07) but is **gated** on Phase 0
(§5.6), which is not yet met: baselines are missing for every surface.

---

## Checkpoint 4 — Phase 0 substantially complete except baselines

**Done:** T-000, T-001, T-010, T-011, T-013, T-016 (string inventory · instrumentation plan ·
chrome audit · LEDGER 7 of 20). **T-014: 26 candidates verified.**
**In flight:** T-012 degraded fixtures (Sonnet).
**Blocked:** T-015 baselines — needs T-012. This is the only thing standing between here and the
Phase 0 gate.
**Halts open: 1** (H-001). **Guards: 2 added**, suite 5054 → **5090**, all green.
**A dev server is live on :3000 and `playwright.config.ts` has a `measure` project, so T-015 is
runnable the moment fixtures land.**

### Verification scoreboard — a third of the brief is wrong

**CONFIRMED 13 · REFUTED 8 · DIFFERENT 5 · PENDING 3.**

Eight of the brief's candidates do not exist, and five are real but not for the stated reason,
which moves where the fix goes. Acting on the brief unverified would have produced wrong work in
at least six places. The largest:

- **The floating «Ν» avatar** — presented as proof that shell chrome overlaps content on every
  screen. It is `hidden lg:block`: no box below 1024px. What was seen is the Next.js DevTools badge,
  which appears on every screen because a dev overlay does.
- **809 missing Greek keys** — impossible; `en` is typed `typeof el`, so parity is compiler-enforced.
- **«ΑΣΦΑΛΙΣΤΙΚΟ ΑΠΟΤΥΠΩΜΑ»** — already renamed to «Συνολικό ετήσιο ασφάλιστρο».
- **The dashboard** — 6 sections and one CTA, not 12 and nine.
- **`NotificationPriority`** — delivery ranking, not gap severity; migrating it would have been a
  large wrong change across ~15 registry entries.
- **Privacy export/deletion** — both executors are real and the UI is honest about the review queue.

### The one thing that is worse than the brief says

The score reaches customers through **five** outbound sites, and in three of the four broken
portfolio states it emails **100**. Measured, not inferred — the day-7 drip renders «3 Ασφαλιστήρια
· 100% Βαθμολογία προστασίας · Προσωρινή εκτίμηση · 0 Κενά κάλυψης» to someone whose documents have
never been read.

### The pattern this run found

**Guards here pass while their invariant is violated, and there are three distinct reasons:**

| failure mode | instances |
|---|---|
| **universe too small** | `score-containment` never walks `lib/` (D-005); the equivalence guard sat outside the CI path (D-009) |
| **adoption incomplete** | `NON_LIVE_POLICY_STATUSES` reached 3 of 5 call sites (D-007); `LocaleToggle`'s "group" variant missed the `min-h-11` its sibling got |
| **assertion weaker than the invariant** | `score-containment`'s allowlist permits two score locations; §2.2 permits one (#17) |

It also applies to processes, not just tests: the planned string freeze would cover 2,733 bundle
keys and miss **85 files** of inline `{ el, en }` copy — 56 of them on one tab-bar surface (#26).

So every §11.2 guard must state **what it walks** and **what it claims**, and both must be checked
against `SURFACES.md`. That is now the single most load-bearing lesson of this run.

### Cold start: do these three, in order

1. **T-012** — degraded fixtures. Re-dispatch if it did not finish. Critical path.
2. **T-015** — baseline all 20 surfaces × 320/390/430 × states, in §4.5 order. Dev server on :3000,
   `--project=measure`, system Chrome via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Two known gaps to
   close: the policy-detail baseline never captured **free tier**, and never automated **1.4.11**.
3. **LEDGER** — 13 surfaces remain; format and six worked examples are in `LEDGER.md`.

Phase 1 is queued with ten evidence-backed items (P1-01…P1-10) and **gated** on §5.6, which
baselines do not yet satisfy.

---

## Next three actions



1. **Finish T-011** (in flight) — then unblock T-013, which needs its pure text predicates to run
   leakage and locale metrics against rendered template strings.
2. **T-013 outbound-copy inventory** — now the highest-value item in the run, and the count to
   confirm is 5 score sites, not 4.
3. **T-012** — degraded fixtures. Nothing in Phase 1 can be verified without them, and the
   channel-duplicated notification fixture must include both a keyed and an unkeyed row (D-002).


---

## Phase-boundary verification (§0.10) — 2026-08-23, approaching the Phase 0 gate

Re-verified rather than assumed, as §0.10 requires at every phase boundary:

| constraint | result |
|---|---|
| `lib/gap-detection.ts` untouched | sha256 `69d2c946aaefc309a1c09f0a72b13baebddc173811e33f4de0b592ca1259b859` — **identical to the run-start baseline** |
| No AI provider schema accepts `isDetected` or `severity` | clean — `ai-service.interface.ts` carries only the historical comments recording their removal |
| Dispatch stub holds | 6/6 green, all three transports guarded |

## T-012 closed · T-015 dispatched

`T-012` added 9 `defect-*` fixtures and 2 dashboard fixture functions, all provisioned against the
local dev DB and inspected with Prisma. Prod guard pre-existed and was reused.

It also found a **product defect by building a fixture** — `containsUnreadableMarker` does not
detect a bare `????`, only a bracketed one, so a summary containing the exact form `CLAUDE.md`
names renders to the customer as data. Queued P1-11. Nothing audited it; the fixture had to produce
the defect, failed to, and the trace found the gap. That is §5.3 paying for itself on first use.

`T-015` is now running: baselines for all 20 surfaces × 320/390/430 × states, publishing in §4.5
priority order so a partial set is still useful. It carries five instructions that are easy to get
wrong — record BOTH scans (the attribute scan is vacuous at 8 attributes product-wide), 1.4.11 is
mandatory, capture free tier, reuse rather than recapture where fixtures are unchanged, and hide
`nextjs-portal` (the badge a prior audit reported as a floating app avatar on four screens).

**T-015 is the last item before the Phase 0 gate.** When it lands: check §5.6 in full, tag
`pw-transform-phase-0-complete`, then Phase 1 opens with P1-01…P1-11 already queued.

---

## Checkpoint 5 — Phase 0 measured. Gate FAILED on one condition, deliberately not rounded up.

**Done:** T-000, T-001, T-010, T-011, T-012, T-013, T-014 (36 candidates, none pending), T-016
(string inventory · instrumentation plan · chrome audit · LEDGER 20/20).
**T-015 partial:** 10 baseline documents, 151 captures, 320/390/430, both tiers, 1.4.11 on every one.
**In flight:** T-016b (5 uncaptured targets) + T-016c (`/wallet/[id]` expanded).
**Halts open: 1** (H-001). Suite **5090** green. 26 run commits.

### Phase 0 gate: 6 of 7 conditions MET. The seventh is not, and §1.1.5 forbids softening it.

Missing: `/wallet/[id]/edit`, `/consent/ai` content, 4 of 7 overlays, and a paid-tier "no advisor"
empty state. T-016b is closing them. **Phase 1 does not open until it does.**

### The finding that changes how this run measures anything

**Collapsing content is not reducing it (D-011).** `PolicySection` unmounts closed sections and all
default closed, so `/wallet/[id]`'s apparent fall from 13,428px to 4,930px is largely a fold:
expanded it measures **12,399px**, within 8% of the original. Every structural metric in this run —
and §10.2's "≤50% of baseline" criterion — could be satisfied by defaulting sections closed.
Ceilings are now evaluated **expanded**, and both states are always published.

Its published tap-target, truncation and 1.4.11 numbers are **floors for the visible heads**, not
the page. T-016c is re-measuring.

### An error of mine, recorded because it nearly propagated (D-012)

My T-015 brief told the agent to reuse `docs/evidence/dashboard-mobile/data/current/`. That
directory is named `current` and holds pre-Goal-2 numbers — 13 sections against a shipped 6.
Following it would have published a baseline for a page that does not exist and measured Phase 1
against it: **D-004 committed inside the instruction warning about D-004.** The agent verified with
a live capture instead of obeying. "Unchanged fixtures and code" is itself a claim that needs
checking.

### Priorities changed by measurement

`/coverage-insights` is confirmed the densest surface — **13,454px, 192 containers at 320px**, 2.7×
the policy page's default view, with no accordion softening it. Every earlier assumption in this run
treated policy detail as the worst surface. It is not.

### Guard-failure taxonomy — now four forms

| form | instances |
|---|---|
| universe too small | `score-containment` never walks `lib/` (D-005); equivalence guard outside the CI path (D-009) |
| adoption incomplete | `NON_LIVE_POLICY_STATUSES` 3 of 5 (D-007); `LocaleToggle` missed `min-h-11` |
| assertion weaker than the invariant | score allowlist permits two locations, §2.2 permits one (#17) |
| **check cannot see the behaviour** | `SURFACES.md` verified routes EXIST; `/coverage` exists and silently fails to redirect (#35) |

### Cold start
1. Finish **T-016b/c**, then re-check §5.6 in full and tag `pw-transform-phase-0-complete`.
2. Phase 1 opens with **P1-01…P1-11** queued, evidence-backed, in §6.1 exposure order.
3. **H-001 needs a human.** It blocks only the score's final disposition; every Phase 1 removal
   proceeds without it.

---

## Both answerable halts answered — 2026-08-23

**H-001 = C.** The protection score is removed from the product entirely — both in-product render
sites (`ProtectionStatusHero`, `ProtectionScoreCard`), not only outbound. Replaced by the factual
composition the dashboard already ships. Six ledger rows move to REMOVE; candidate #17 resolves by
deletion because the sanctioned count goes from two to **zero**, which makes
`score-containment.test.ts`'s assertion simpler and stronger than the allowlist it replaces.

*Boundary held:* the **arithmetic** is not deleted. `calculateProtectionScore` /
`provisionalProtectionScore` may have agent-side callers, and agent surfaces are §12.4 out of
scope. Removal is by render site; dead-code removal only after a sweep proves no caller remains.
`provisionalProtectionScore`'s honesty bug is still fixed in P1-02 — out-of-scope callers are not
immune to it.

**H-002 = B.** Outbound reduces to deadline-bearing events plus a monthly digest sent **only when
something changed**. The weekly cadence retires. «Τίποτα δεν άλλαξε» is not sent by email — §9.3
makes it trust-building *in-product*, where the customer chose to look; as an interruption
reporting nothing it is the failure B exists to avoid. **Silence is the correct outbound behaviour
for a quiet month.**

*Consequence that changes the plan:* B depends on three §9.5 controls and **none exist** — no
monthly ceiling, no global off switch, and the preferences screen writes `channel: "email"` only
while push is live. These move from Phase 4 precondition to a **committed Phase 1 dependency**
(P1-09b), and the cadence change does not ship before them.

*Boundary held:* §12.4 puts notification **dispatch** logic out of scope. B decides the policy and
this run builds the controls; it does not edit cron cadence or send triggers.

**H-003 remains unraised** — the compliance boundary on renewal price intelligence genuinely needs
the Phase 2 specs, which do not exist. It will also need the DPO and underwriter tracks, not just
the owner.

### State
Halts open: **0**. Suite 5090 green. 30 run commits. Phase 0 gate still failed on its one
condition; T-016b/c in flight to close it. Phase 1 opens the moment it passes, with P1-01 now
carrying the expanded in-product scope.


---
---

# PW-MOBILE-TRANSFORM-02 — cold-start state, 2026-08-24

**Read this section first.** v1's instruction is superseded; its committed work is inherited
(D-018). Everything below reflects v2.

## Where the run is

**v2 Phase 0 extension: COMPLETE**, tagged `pw-transform-v2-phase-0-complete`.
**v2 Phase 1: OPEN**, serial (§1). `V2-P1-07` in flight; 9 items behind it.
**Halts open: 3** — H-005 (second score), H-006 (IDD advice boundary), H-007 (Art. 9 consent).
None blocks Phase 1. **Answered: 3** — H-001 = C, H-002 = B, H-004 = B.
**Tests: 5263.** `gap-detection.ts` hash unchanged from run start. Dispatch stub 6/6.

## What exists on disk

- **14 baselines** in `docs/transformation/evidence/` — v1's 11 plus `/branches`, `/timeline`,
  `/insights/risk-profile`.
- **`LEDGER.md`: 109 capabilities**, monetization surfaces **5** (§10.1 forbids that rising).
- **`SURFACES.md` is load-bearing** — `tests/unit/route-ownership-surfaces.test.ts` parses its route
  tables. A gap in it is a hole in a guard, not a documentation defect.
- **~20 guards**, each demonstrated failing first.
- Outbound is clean on all three metrics: **score 0 · tokens 0 · Latin 0**.

## The four defects the v2 extension found that nobody had listed

1. **`readCoverageFacts` never reads `vehicle.insuredValue`** → «ΑΓΝΩΣΤΟ» is the default for every
   motor policy, in a market where motor cover is compulsory. `V2-P1-07`, in flight.
2. **A mirrored proxy prefix collision** — `/wallet/[id]/review` bounced agents off an agent-only
   page. Fixed with the reported one; both came from a single `startsWith`.
3. **`/timeline` bypasses `policy-identity.ts`** — D-021: the guard forbids a *spelling* where the
   invariant demands a *routing rule*.
4. **A plural-agreement bug of the class `11ec4987` fixed** — the commit this run is based on.

## The pattern worth carrying — how guards fail here

Five distinct modes, each found in this run rather than theorised:

| mode | instances |
|---|---|
| **universe too small** | `score-containment` never walked `lib/` (D-005); the equivalence guard sat outside the CI path (D-009) |
| **adoption incomplete** | `NON_LIVE_POLICY_STATUSES` reached 3 of 5 call sites (D-007) |
| **assertion weaker than the invariant** | score allowlist permitted two locations where §2.2 permits one; the sentinel guard forbids literals where the rule is "route through the primitive" (D-021) |
| **the check cannot see the behaviour** | `SURFACES.md` verified routes *exist*; `/coverage` exists and silently fails to redirect |
| **the reader cannot see the file** | a raw NUL byte made a source file binary to grep — valid UTF-8, so `lint:utf8` passed (D-016) |

**And four times a fact I recorded as *settled* was wrong in mechanism** — D-002 (dedupeKey suffix),
D-012 (stale `data/current`), D-015 (key-name defaults), D-017 (`maxPerDay = 0` deferred rather than
skipped). Settled means do not relitigate the *conclusion*; it never means do not check the
*mechanism*.

## Verification habits that earned their place

- **Assert a probe changed rendered behaviour**, not merely that a file changed. No-op probes
  produced false greens four times, including inside a probe harness's own assertions.
- **Search case-insensitively and account for `text-transform`** (D-019) — v2 cites rendered
  strings; a literal grep nearly refuted two real defects.
- **A refutation that leaves live code unexplained is incomplete** (D-020) — a branch exists, so
  something reaches it.
- **Audit every Greek freeze regeneration line by line.** It has already caught one item's copy
  changes and proven them interpolation-only.

## Next three actions
1. Review **V2-P1-07** when it reports — check the new motor state is *correct*, not merely no
   longer «ΑΓΝΩΣΤΟ».
2. **V2-P1-02** (unowned lines, including the email path at `mail-templates.ts:132`).
3. **V2-P1-06** + the D-021 guard gap, together — the fix and the reason it was invisible.

## §6 diff — the phase-completion test, run against the instruction (2026-08-25)

Per D-025, Phase 1 closes against **§6's fifteen items**, not `QUEUE.md`. Verified, not recalled:

| § | item | state |
|---|---|---|
| 6.1 | score containment | **done** — 9 sites, `score-containment` |
| 6.2 | the second score (§2.4) | **blocked** — H-005 |
| 6.3 | outbound copy | **done** — 0 score / 0 tokens / 0 Latin |
| 6.4 | token / fixture / placeholder leakage | **done** |
| 6.5 | unowned-line claims (§2.2) | **done** — `unowned-lines-not-held` |
| 6.6 | absence-is-not-reassurance | **done** — `all-clear-honesty` |
| 6.7 | **count consistency** | **open — V2-P1-11 in flight** |
| 6.8 | notification deduplication | **done** |
| 6.9 | **severity framing** | **open — partial** |
| 6.10 | Greek string sweep | **done** — union freeze |
| 6.11 | truncation | deferred to Phase 3 (primitive), recorded |
| 6.12 | **layout integrity** | **open — partial** |
| 6.13 | guilt register (§2.13) | **done** — `finding-copy-register` |
| 6.14 | unusable / meaningless controls | **partial** — shell done (P1-08) |
| 6.15 | settings subtree, upload flow, timeline | **partial** |

### Why 6.9 and 6.12 read "partial" rather than done

Both have a guard whose **universe is one surface**, which is D-005's failure mode:

- `gap-severity-framing.test.tsx` renders **`CoverageGapsWidget` and nothing else**. §6.9 is
  product-wide, and `gap-severity-display-single-source` still carries a **9-entry bypass ceiling** —
  nine surfaces render severity without `describeSeverity()`. A guard over one widget plus a debt
  list of nine is not the invariant.
- 6.12 was covered incidentally by P1-08's shell work and never verified as an item.

### The measurement that made 6.7 visible

**4 `data-count`, 8 `data-fact`, 3 `data-action`** across the entire product, against a key set
agreed in Phase 0 for this exact item. Every attribute-based scan this run has therefore returned a
**vacuous zero** — passing for want of anything to check. The value scans carried the load alone.

### §6.15 re-verified 2026-08-25 — closed, and I had it marked "partial" on no evidence

All three surfaces checked against the code, not against my notes:

- **Settings subtree.** Phase 0 confirmed a real defect here: the group toggles wrote
  `channel: "email"` and nothing else, so switching a stream "off" silenced email while push kept
  firing, with nothing on screen saying so. **Closed by P1-09b** — the channel dimension moved
  entirely server-side (`setNotificationStreamPreference` fans out, `data.streams` folds back), the
  component never names a channel, and a guard holds it there. The two §9.5 controls Phase 0 recorded
  as absent — a **global outbound off switch** and a **user-configurable monthly ceiling** — now both
  render via `CadenceControls`, alongside quiet hours.
- **Timeline.** `lib/services/timeline/build.ts:208` resolves the insurer through
  `displayInsurerName`, with the comment explaining why the raw column is never used. The
  `__PENDING_EXTRACTION__` leak §2.6 cited cannot render from this path.
- **Upload flow.** The invariant that matters at Phase 1 is consent ordering, and it holds:
  `app/api/policies/extract/route.ts` reads `aiProcessingConsentVersion` at **:127** and refuses at
  **:129**, before `req.formData()` at **:147**. A refusal never touches the document.

**6.15 → done.** Worth naming the process error: it sat at "partial" because I had not looked, not
because anything was outstanding. That is the same defect as D-025 in miniature — a status derived
from my own bookkeeping rather than from the code.

### The §6 table, corrected

6.15 done. **6.12 and 6.14 remain open** and are now one item, V2-P1-14, because both need the same
measurement pass — the page-level overflow probe the harness has never had, and fresh tap-target
numbers to replace August 23's. **6.7 (V2-P1-11) and 6.9 (V2-P1-13) are in flight.** 6.2 stays
blocked on H-005.

## Phase 1 close-out — the §6 list, item by item (2026-08-25)

Closed against **§6**, not against `QUEUE.md` (D-025).

| § | item | state |
|---|---|---|
| 6.1 | score containment | done |
| 6.2 | the second score | **accessibility fixed; the product question is H-005 and is not a defect** |
| 6.3 | outbound copy | done — and reopened once, for the day-60 email |
| 6.4 | token / fixture / placeholder leakage | done |
| 6.5 | unowned-line claims | done |
| 6.6 | absence-is-not-reassurance | done |
| 6.7 | count consistency | done (V2-P1-11) |
| 6.8 | notification deduplication | done |
| 6.9 | severity framing | done (V2-P1-13), after review found the guard's own hole |
| 6.10 | Greek string sweep | done — freeze now 16 entries lighter, all dead |
| 6.11 | truncation | **deferred to Phase 3** by design: it is a primitive, not a patch |
| 6.12 | layout integrity | done (V2-P1-14) — probe built, 0px everywhere measured |
| 6.13 | guilt register | done |
| 6.14 | unusable / meaningless controls | done (V2-P1-14) |
| 6.15 | settings, upload, timeline | done — verified, had been marked partial on no evidence |

### What this stretch actually found

Four defects nobody had asked for, each surfaced by a different instrument:

- **A daily cron telling customers we credited them 500 AI credits.** Nothing granted them; the
  service admitted it in a comment two lines above the emission.
- **The day-60 email manufacturing a coverage risk** from inactivity alone — absence-is-not-evidence
  pointed the other way, which is worse, because fear built from missing data is a lever.
- **Two WCAG failures**, one found by the browser and one by arithmetic. On `bg-red-500` even pure
  white is 3.81:1, so «Η ενέργεια είναι οριστική» — the sentence saying a deletion cannot be undone —
  could not be made legible without changing the background.
- **87 sub-44 controls on /wallet**, which were one primitive rendered 29 times.

And three defects **in the guards themselves**, which is the pattern worth keeping:

- the severity guard could not catch a regression in the files it had just fixed (D-027);
- the caveat requirement was satisfiable by an empty string;
- the harness measures contrast and tap targets and **nothing gated on either** — six contrast
  failures and 1,277 tap-target offenders were sitting in evidence files, measured and unread.

### Open, and not blocking

**H-005** — should the second score exist. A product decision. **H-006 / H-007** — the IDD Art. 20
advice boundary and Art. 9 consent, both Phase 2b preconditions. **H-008's commercial half** —
whether returning customers should actually get credits.

### Carried out of scope, named not fixed

`isPolicyCoverageActive` does not exclude `status='deleted'` while its `coveredPolicyWhere` twin does.
Real, latent, and its caller is the frozen `lib/gap-detection.ts:203` — changing which policies gap
detection sees is gap-detection logic. Six agent/admin surfaces carry failing contrast pairs, asserted
still-failing so the exemption cannot outlive them.

## V2-P2-04 — Phase 2 measured (2026-08-25)

Phase 2 deleted four routes **and their four baseline specs**, leaving «Η προστασία μου» and the
relocated history with no measurement coverage at all. `tests/measure/protection-baseline.spec.ts`
restores it; the deleted surfaces' evidence stays committed as the before-picture.

| capture @320 | height | sections | containers | sub-44 | dup-facts | text contrast | **overflow** |
|---|---|---|---|---|---|---|---|
| `/protection` ανά κλάδο | 13,917px (19.3 screens) | 20 | 211 | 22 | 0/0 | 0 | **0px** |
| `/protection?lens=risk` | 15,397px (21.4 screens) | 26 | 219 | 22 | 0/0 | 0 | **0px** |
| `/account/history` | 8,111px (11.3 screens) | 2 | 51 | 0 | 0/0 | 0 | **0px** |

### The 22 are a reasoned exception, not debt

Every one is a **24×24 checkbox inside a `<label>`** — 13 in the branch lens, 9 in the wizard form.
24×24 is the WCAG **2.5.8 (AA)** target floor; the harness flags them because it applies the stricter
**2.5.5 (AAA)** 44px floor. Each sits in a label with an icon and its text, so the row is the real
target and the box only has to clear AA — the same call made for the quiet-hours checkbox.

Two were **not** exceptions and are fixed: the wizard's checkboxes measured **16×24**, under the AA
floor on width (`h-4 w-4` → `h-6 w-6`), and `RecommendationCards`' «Έλεγχος» review pill measured
**88×28** (`min-h-11`). That link was located through the freeze's new **`call` arm** — it exists in
the inventory only because of the shape added earlier today.

### The number Phase 5 has to answer for

**`/protection` is 19–21 screens tall at 320px.** §7.5 called `/coverage-insights` "the densest
surface in the app" and asked for the most aggressive reduction; consolidation has now put three
surfaces where it stood. Nothing is wrong — 0px overflow, no duplicate facts, no text-contrast
failures — but density is the measured cost of the IA collapse, and it is Phase 5's problem, recorded
here so it cannot be discovered as a surprise.

`/account/history` at 2 sections and 51 containers is the shape the relocation was supposed to
produce: the same capability, a tenth of the chrome.

## Phase 3 §9 — closed, mostly by checking rather than building (2026-08-25)

Three checks, two of which found nothing, and saying so is the result.

1. **Is notification criticality §2.1's severity verdict renamed?** No — **D-031**. Priority never
   renders; it routes. The six `critical` events are dated facts or security events.
2. **Does every outbound prompt have a real, dated deadline (§9.5)?** 22 live non-transactional
   outbound events; 13 carry no date, but almost all are *third-party actions* — an advisor asked
   you for a document, a proposal arrived — not prompts. Two are engagement prompts without a
   deadline: `weekly_digest` and `churn_prevention`.
3. **Was H-002 = B implemented?** No — **and that is correct.** I had the finding written before I
   read the boundary note already sitting in `QUEUE.md`:

   > §12.4 puts notification **dispatch** logic (whether a message fires, to which channel, at what
   > cadence) **out of scope for this run.** H-002 decides the *policy*; this run specifies it and
   > builds the *controls*, and does not itself change the cron cadence or the send triggers. […]
   > **B does not move it.**

   The owner chose B — renewals and lapses, plus a **monthly** digest sent only when something
   changed. The product ships **C-minus-the-score**: a weekly digest, the drip, the churn sequence.
   That divergence is deliberate and bounded, and I nearly rewired three crons on the strength of
   "the owner decided B" without checking whether this run was allowed to.

### What was in scope, and is now done

`tests/unit/outbound-policy-divergence.test.ts` inventories the five live outbound events option B
would retire, each with why it is not B. It is **not** a guard that something is broken — it is a
decided-but-unimplemented divergence held somewhere that **fails when it goes stale**, because a
decision recorded only in a halt document quietly stops being true. The count may only fall; when the
dispatch work is in scope, these go red one at a time and each deletion is the proof.

It also pins the half that *did* ship — the §9.5 ceiling and off switch (P1-09b) — because the
inventory is only meaningful if those controls are real, and asserts the option-A deadline events
(`policy_expiring`, `renewal_overdue`, `obligation_due`) stay live, so outbound cannot quietly move
in the wrong direction either.

**§9.4** (perk prompts needing a clause link, conditions belonging to the review register) is a
**Phase 4** row and stays there.

---

## Measurement harness execution discipline (P5-INFRA-00)

**Added:** 2026-08-26 · **Agent:** Evidence (Haiku 4.5)

Five agents on this run backgrounded Playwright measurements and then waited, dying at 600s with no
progress. **Rule for future runs:**

### Do not background a Playwright run and then wait on it

The watchdog kills backgrounded processes at 600s with no progress. Do this instead:

1. **Foreground one spec at a time** — `npx playwright test --project=measure --grep "pattern"` with
   a specific pattern, not `--project=measure` which runs everything in parallel/background
2. **Report rather than retry on pool contention** — the session pooler's 15-client ceiling is
   shared across all sessions on this machine. If a run dies with `max clients reached in session
   mode`, it is not a transient error; another run owns the pooler. Wait, or run the spec later.

### Measurement harness changes

Three fixes have been made to the harness so that this rule can be enforced:

1. **Pooler lock** — `tests/measure/surface-harness.ts` now exports `acquirePoolerLock()`, a
   file-based lock that ensures only one run holds active DB connections at a time. Second run
   fails with a clear error naming the blocking PID instead of a cryptic pooler message.

2. **Refusal rules** — `captureSurface()` now structurally refuses to record:
   - A capture whose DOM contains the generic error boundary (the page did not render)
   - A capture with unlocatable identity fields, unless the surface/field pair is explicitly
     documented in `UNLOCATABLE_EXEMPT` (a measurement problem or a schema gap that must be named)

3. **Test accounting** — `docs/transformation/P5-INFRA-00-tests-not-run.md` records which 14 tests
   in `policy-detail-goal2.spec.ts` could not run (the "duplicate facts", "navigation", "AI
   entry points", and "ten-second test" batches all died at pooler exhaustion in global-setup).
   The "sections ≤ 8" batch that DID run stands independently — 6 fixtures × 3 widths, all passed.

These changes exist to prevent future runs from colliding on the pooler and to make refusals
structural (every capture is checked, not just hand-written specs). The working rule itself must
be remembered by the next agent: **do not background the harness.**
