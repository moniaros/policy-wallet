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
