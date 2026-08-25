# QUEUE — PW-MOBILE-TRANSFORM-01

Single source of truth for what remains. An item is written here **before** it starts, so a
mid-item crash leaves an accurate record. No item is queued without written acceptance criteria.

Status: `todo` · `in_progress` · `done` · `requeued` · `blocked` · `halted`

---

## Phase −1 — Safety preconditions (BLOCKS EVERYTHING)

### T-000 — Scaffold run state · `done`
owner: Orchestrator (Opus 5) · mode: default · file_boundary: `docs/transformation/**`
- [x] `DECISIONS.md` with run-start adjudications D-001…D-004
- [x] `HALTS.md`, `LEDGER.md`, `QUEUE.md`, `PROGRESS.md`
- [x] `lib/gap-detection.ts` hash recorded as phase-boundary baseline

### T-001 — Outbound dispatch stub · `done`
owner: Orchestrator (Opus 5) · mode: accept-edits · blocked_by: none
file_boundary: `lib/outbound/**`, `lib/email/email-service.ts`, `lib/push/web-push.ts`,
`lib/services/push.service.ts`, `tests/unit/outbound-dispatch-stub.test.ts`

Acceptance criteria:
- [x] Dispatch decided by ENVIRONMENT, never by credential presence, at every transport
- [x] Test run **throws** on a dispatch attempt; development skips and logs; production sends
- [x] Guard enumerates transports from the filesystem rather than a hardcoded list
- [x] Guard demonstrated failing first, both halves, revert proven green
- [x] `tsc --noEmit` clean

Review (Adversarial, Opus 5): **PASS.** The enumeration half found a third transport
(`lib/services/push.service.ts`, FCM) that the behaviour half would have missed — the
"fixed here, broke there" class caught inside the item that created it. Defect removed at all
three chokepoints, not relocated.

Failure proofs recorded in `PROGRESS.md`.

---

## Phase 0 — Evidence (no product code)

### T-010 — Enumerate every B2C surface · `done`
owner: Mechanical sweep (Haiku 4.5) · file_boundary: `docs/transformation/SURFACES.md`
`app/(protected)/` mixes B2C, agent and admin routes, so classification is the work.
- [ ] Every route file, dynamic segment, route group, parallel/intercepted route
- [ ] Every modal, sheet, drawer and overlay carrying content to read or act on
- [ ] Per surface: path, component-tree root, landing vs subpage, tier gating, reaching states
- [ ] Cross-check against the running app: routes unreachable in code, destinations that 404

### T-011 — Consolidate the harness · `done`
owner: Evidence (Sonnet 5) · file_boundary: `tests/measure/**`
- [ ] `policy-detail.ts` → `metrics.ts`; update importers; no behaviour change
- [ ] Reconcile `clippedContent` / `clippedLabels` into ONE truncation definition (D-003)
- [ ] Re-run an existing baseline and prove numbers are byte-identical to `data/current/`

### T-012 — Extend the fixture matrix with missing degraded conditions · `done`
owner: Evidence (Sonnet 5) · blocked_by: T-011 · file_boundary: `tests/measure/fixtures.ts`
Existing set already covers empty/single/typical/heavy/all-expired/pro-tier + 3 degraded.
Missing, per §5.3 — each must be able to PRODUCE its defect:
- [ ] English summary with no language tag · unauthored gap slug · extractor placeholder in an
      identity field · completed-then-failed run · channel-duplicated notifications (keyed AND
      unkeyed, per D-002) · out-of-map enum · policy with no premium · policy with no documents
- [ ] Longest real Greek strings from the string inventory

### T-013 — Outbound-copy inventory · `done`
owner: Evidence (Sonnet 5) · blocked_by: T-001 · file_boundary: `docs/transformation/evidence/outbound/**`
Highest-exposure surface in the run and invisible from the UI.
- [ ] Every email and push template rendered TO TEXT via render functions, never the transport
- [ ] Per template: trigger, channels, and whether it renders a score, an unvalidated severity,
      an internal token, or English
- [ ] Leakage + locale-purity metrics run against the rendered output
- [ ] Confirm/refute the four known score sites (`templates.ts:57`, `weekly-digest.ts:118`,
      `engagement-drip.ts:115`, `churn-prevention.ts:91`)

### T-014 — Re-verify every candidate defect against HEAD · `todo`
owner: Orchestrator (Opus 5) · blocked_by: T-010
Per D-004 the contract's evidence is partly stale. Record reproduces / does not reproduce /
reproduces differently, with width, state, tier, root cause file:line, and fixture-vs-code-confirmed.

### T-015 — Baseline every surface · `partial` — 10 of 10 documents published, 5 targets uncaptured
owner: Evidence (Sonnet 5) · blocked_by: T-012 only (T-011 done)

**Ready to run:** a dev server is live on `:3000`, `playwright.config.ts` has a `measure` project,
and the invocation the existing baselines used is:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure`
(Node 20.20.2 first: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use`.)

§4.5 order: Ειδοποιήσεις → Αρχική → Πορτοφόλι → Ασφαλιστήριο → Αναλύσεις AI → Σύμβουλος →
Ρυθμίσεις +5 subpages → app shell → upload flow → modals.

- [ ] Every metric from `tests/measure/metrics.ts` at 320/390/430, every applicable state,
      published to `docs/transformation/evidence/<surface>/BASELINE.md`
- [ ] **Record BOTH the `data-*` attribute scan and the value scan** for duplicate facts, actions
      and counts. Instrumentation is 8 attributes product-wide, so the attribute scan returns a
      vacuous zero on 22 of 24 surfaces and the VALUE scan is authoritative until P1 instruments
      (`INSTRUMENTATION-PLAN.md`)
- [ ] **Close the two gaps the existing policy-detail baseline documents about itself:**
      free-tier paths were never captured (the fixture account holds an active `ph-pro`), and
      **1.4.11 was never automated** — `tests/measure/nontext-contrast.spec.ts` exists now and §5.6
      makes it mandatory, not deferred
- [ ] Reuse `docs/evidence/dashboard-mobile/data/current/` rather than recapturing where the
      fixtures and code are unchanged; state explicitly which captures were reused
- [ ] Fix the stale `tests/measure/policy-detail.ts` reference in the old `BASELINE.md` (now `metrics.ts`)
- [ ] Any comparison whose fixtures differ between passes is INVALID and must not be published (§1.4.5)

**Do not soften the gate.** §5.6 requires every surface in `SURFACES.md` to have a published
baseline before Phase 1 opens. 20 surfaces + 7 overlays.

### T-016 — `LEDGER.md`, Greek string inventory, instrumentation plan, chrome audit · `todo`
owner: mixed · blocked_by: T-010

---

## Phase 1 — Trust repair (blocked by the Phase 0 gate; items written now because the evidence exists)

Ordering is §6.1's: highest exposure first. Every item instruments what it touches per
`INSTRUMENTATION-PLAN.md`, and every item's guard must be demonstrated failing first.

### P1-01 — The protection score is removed from the product · `done` — REVIEW PASSED
**Scope expanded by H-001 = option C (2026-08-23).** This was "score leaves outbound"; it is now
"score leaves everywhere". The in-product half is below the outbound half.

**In-product (new, from H-001):**
- [ ] `components/dashboard/home/ProtectionStatusHero.tsx` — score, ring, delta, four-state logic.
      The surface keeps D-01's factual composition, which already ships beneath it
- [ ] `components/coverage/ProtectionScoreCard.tsx` — deleted outright: value, `scoreColor`
      verdict, freshness stamp, methodology / limits / not-advice block
- [ ] `score-containment.test.ts`'s `SANCTIONED` set becomes **empty** and the guard asserts the
      value renders nowhere — a stronger and simpler claim than the allowlist it replaces
- [ ] **Do NOT delete `calculateProtectionScore` / `provisionalProtectionScore`.** They may have
      non-rendering and agent-side callers, and agent surfaces are §12.4 out of scope. Remove by
      render site; dead-code removal only after a sweep proves no caller remains
- [ ] ledger rows D-02, D-04, A-01, A-02, A-03, A-04 marked done as removed

**Outbound (unchanged — never depended on the answer):**
owner: Implementation (Fable 5) · blocked_by: T-013 metric half
file_boundary: `lib/notifications/risk-events.ts`, `lib/notifications/templates.ts`,
`lib/email/templates/{weekly-digest,engagement-drip,churn-prevention}.ts`,
`lib/services/{weekly-digest,engagement-drip}.service.ts`, `tests/unit/score-containment.test.ts`

**Five sites, not one** (evidence: `evidence/outbound/INVENTORY.md`). Fix at the producer, not
only the template — `email-content-honesty.test.ts` already learned this once, when guarding the
template passed while the service still emitted `0`.

- [ ] `risk-events.ts:176-190` — the `protection_score_changed` emission is **removed**, not
      thresholded. Its materiality logic is preserved only if H-001 keeps an in-product score.
- [ ] `templates.ts:57` — the event type's var declaration goes with it
- [ ] `weekly-digest.ts:118-126` and `engagement-drip.ts:115-118` — score block removed
- [ ] `churn-prevention.ts:91,97` — the feature bullet advertising the score removed (it becomes a
      false claim under H-001 options A and C, and is unverifiable copy under B)
- [ ] the two services stop computing `healthScore` for outbound at all
- [ ] **extend** `score-containment.test.ts`'s universe to `lib/` with outbound FORBIDDEN — do not
      write a second guard (§11.1, D-005)
- [ ] **reduce `SANCTIONED` from two entries to at most one** (candidate #17). The guard currently
      authorises both `ProtectionStatusHero.tsx` and `ProtectionScoreCard.tsx`; §2.2 permits one.
      Which one survives is H-001's call — but the guard must stop blessing two either way, and the
      "dedicated score surface" comment is rewritten with it
- [ ] `ProtectionScoreCard`'s `scoreColor` gains a text equivalent or goes (WCAG 1.4.1)
- [ ] guard demonstrated failing first; probe recorded

### P1-02 — No all-clear in outbound where the check never ran · `done` — REVIEW PASSED

P1-01 removed every product caller of `provisionalProtectionScore`, so **the predicate change is
moot** — it is now dead code, not a live defect. Do NOT change it and do NOT delete it
(§12.4 / D-006); logged for a later dead-code sweep.

What remains is real, and was never really about the score:

- [ ] **`lib/email/templates/engagement-drip.ts:111`** renders
      `background: ${stats!.gapCount > 0 ? '#FEF3C7' : '#F0FDF4'}` — amber vs **green**, no text
      equivalent. Two invariants in one element: WCAG 1.4.1 (colour as sole carrier) and §2.3,
      because the green fires when `gapCount === 0`, which includes *nothing was analysed*.
- [ ] The tile must state its basis. "0 gaps found" and "nothing analysed yet" must not render
      identically.
- [ ] **`tests/unit/all-clear-honesty.test.ts` is a unit test of `monitorRisk`, not a guard** — it
      imports one function and asserts on its output, so it structurally cannot see an email
      template. Give the defect class an arm that covers outbound. D-005's universe rule, third
      application, and the reason this sat in email while four in-product surfaces were guarded
      against exactly it.
owner: Implementation (Fable 5) · blocked_by: P1-01
file_boundary: `lib/services/gap-engine/protection-score.ts`, `lib/email/templates/engagement-drip.ts`, `tests/unit/all-clear-honesty.test.ts`

- [ ] `provisionalProtectionScore`'s "nothing to score" predicate becomes "nothing **analysed**",
      not `policyCount === 0` (D-006 — basis, in scope; arithmetic untouched)
- [x] **blast radius enumerated 2026-08-23 — it is wider than this item assumed:**

| caller | status |
|---|---|
| `lib/services/weekly-digest.service.ts:167` | P1-01 removes it |
| `lib/services/engagement-drip.service.ts:167` | P1-01 removes it |
| `app/(protected)/dashboard/PolicyholderHome.tsx:305` | P1-01 removes the render — confirm it removes the CALL |
| **`app/onboarding/actions.ts:338`** | **uncatalogued until now.** `provisionalProtectionScore(1, gaps.map(…))` in the onboarding flow. Not touched by P1-01, so P1-02 owns it |

**Two guards pin the current behaviour with DUPLICATED assertions**, and both go red the moment the
predicate changes:
- `tests/unit/protection-score-single-source.test.ts:41-55`
- `tests/unit/email-content-honesty.test.ts:41-61`

Both assert `provisionalProtectionScore(1, []) === 100` and both re-state the same severity-weight
table. That is §11.1's "one guard per defect class" already violated — two copies that will drift.
**P1-02 consolidates them rather than editing both**, and the survivor states its universe.

`calculateProtectionScore` has an agent-side caller (`lib/agent/health-score.ts`), which is §12.4
out of scope. That confirms D-006: the function is not deletable by this run, only its render sites
are. Do not "tidy" it away.
- [ ] `engagement-drip.ts:123` green/amber gap tile gains a **text** equivalent (WCAG 1.4.1) and
      must not render green for "0 gaps" when nothing was analysed
- [ ] `all-clear-honesty.test.ts` universe extended to outbound templates

### P1-03 — One definition of "policies this person has" · `done` — REVIEW PASSED

**Call sites re-verified 2026-08-23 after P1-01** (line numbers had moved; P1-01 did NOT introduce
any of these — checked against `27acb200^`):

| site | current filter | verdict |
|---|---|---|
| `engagement-drip.service.ts:98` | `{ ownerUserId }` — **none** | wrong |
| `engagement-drip.service.ts:151` | `{ ownerUserId, status: "active" }` | wrong, both directions |
| `weekly-digest.service.ts:103` (renewals) | `NON_LIVE_POLICY_STATUSES` | correct |
| `weekly-digest.service.ts` (count) | **none** | wrong |
| `engagement-scoring.ts:167` | `{ ownerUserId, status: "active" }` | wrong |

**D-007 is broader than recorded.** It said three services hold three different definitions. In
fact **two services each disagree with themselves**: `weekly-digest` filters correctly for its
renewals list and not at all for its count, and `engagement-drip` does the same — an unfiltered
count at :98 and a `status: "active"` fetch at :151, in one function. So a single email can quote
two different totals for one portfolio.
owner: Implementation (Fable 5)
file_boundary: `lib/services/engagement-drip.service.ts`, `lib/services/engagement-scoring.ts`,
`lib/services/weekly-digest.service.ts`, `tests/unit/`

- [ ] `engagement-drip.service.ts:152` and `engagement-scoring.ts:167` adopt
      `status: { notIn: [...NON_LIVE_POLICY_STATUSES] }`
- [ ] `weekly-digest.service.ts:166` gains the same filter (currently none — counts deleted rows)
- [ ] new guard: **no Policy query filters on a bare `status: "active"`**, universe = `lib/` + `app/`,
      enumerated from the filesystem. Demonstrated failing first.

### P1-04 — One event, one row · `done` — REVIEW PASSED
owner: Implementation (Fable 5) · blocked_by: T-012 (needs the keyed+unkeyed fixture)
file_boundary: `app/(protected)/notifications/actions.ts`, `components/notifications/**`

- [ ] group on the base `dedupeKey` with the `:${channel}` suffix stripped (D-002)
- [ ] rows with no `dedupeKey` render ungrouped — never merged on a heuristic (§12.2)
- [ ] channel chips removed from the customer-facing list entirely
- [ ] **rewrite the comment at `actions.ts:15-21`**, which currently argues the opposite and will
      otherwise justify reverting this
- [ ] reconcile with the second consumer at `actions.ts:140-144`, which filters `channel: "in_app"`

### P1-05 — English internal prose cannot reach a customer · `done` — REVIEW PASSED

**Recon 2026-08-23 — the ratio is the finding.** `lib/notifications/registry.ts` declares **63
event types**. The interception map at `app/(protected)/activity/actions.ts:136-147` handles
**one** (`policy_analyzed`). The other 62 fall through to `{ en: n.title, el: n.title }` — whatever
prose the writer of the day stored, rendered verbatim in both languages.

Whether a given event is safe therefore depends entirely on its emitter: `risk-events.ts` stores
bilingual `{ el, en }` and is fine; anything that stored the registry's English `businessEvent`
prose is not. So the fallback is not a small gap — it is the default path for 98% of event types,
and its correctness is decided per-emitter with nothing enforcing it.

**Fix at composition, not at render.** A complete 63-entry map would be correct today and wrong the
moment event 64 is added. Nothing English may be *stored* in a customer-visible column; the render
layer should not need a map at all.
owner: Implementation (Fable 5)
file_boundary: `lib/events/catalog.ts`, `lib/notifications/registry.ts`, `app/(protected)/activity/actions.ts`

- [ ] the per-event-type map at `activity/actions.ts:131-146` is **derived from the registry**, not
      hand-written for `policy_analyzed` alone with a raw-text fallback
- [ ] English documentation prose stops being written into customer-visible columns at composition
      time
- [ ] locale-purity guard extended to stored notification rows, not only rendered DOM

### P1-06 — Delete the dead verdict keys, and freeze the UNION · `done` — REVIEW PASSED
owner: Implementation (Fable 5) · file_boundary: `lib/i18n/translations/{el,en}.ts`, `tests/unit/`
- [ ] `scoreGood`, `scoreNeedsImprovement`, `scoreNeedsAttention` deleted (zero references; §2.2-prohibited copy sitting in the bundle awaiting a caller)
- [ ] string-inventory freeze covers deletions as well as additions
- [ ] **the freeze's universe is the UNION** of the `el` bundle AND every inline `{ el, en }` pair in
      `app/` + `components/` — 85 files carry them, `AgentClient.tsx` alone has 56, and a
      bundle-only freeze would certify "no unreviewed Greek shipped" while a component grew 56 new
      strings (candidate #26). These are not lint violations: a well-formed `{ el, en }` object is
      the approved escape from `lint:i18n-changed`, so nothing flags them today
- [ ] guard states its universe explicitly and is demonstrated failing on a newly added inline pair
- [ ] **remove the WIRING, not just the strings.** `healthLevels` is still passed from
      `PolicyDetailsClientView.tsx:834` into `SummaryCard` (typed at `:27`) and never rendered
      (candidate #29). Prohibited copy threaded to a consumer that stopped using it is a shorter
      path back to the defect than an unreferenced bundle key. Delete the prop, the type and the
      import with the strings

### P1-07 — Identity values never render raw · `done` — REVIEW PASSED (P1-11 absorbed)
owner: Implementation (Fable 5)
- [ ] «Καλώς ήρθατε πίσω, {name}» and every display-name render goes through the identity scrubber
      (candidate #6 — not an i18n defect; the string is clean)
- [ ] `__PENDING_EXTRACTION__` / `PENDING-<epoch>` / `E2E-*` unrenderable, dev-time assertion throws

### P1-08 — App shell defects · `todo`
owner: Implementation (Fable 5) · file_boundary: `components/shell/AppShell.tsx`,
`components/pwa/InstallPrompt.tsx`, `components/ui/LocaleToggle.tsx`, `components/ui/ThemeToggle.tsx`

Evidence: `evidence/CHROME-AUDIT.md`. **The brief's headline shell defect is refuted** — the
floating avatar is `hidden lg:block` and has no box below 1024px; what was seen is the Next.js
DevTools badge. Do not "fix" it. These are the real ones:

- [ ] **Drawer scrim must cover the bottom nav** (`AppShell.tsx:360` vs `:381`, same `z-40`,
      scrim ordered first). Today a `role="dialog" aria-modal` drawer leaves five tab targets
      operable and undimmed — assistive tech is told they are unreachable while they are not.
      Correctness, not polish.
- [ ] **`InstallPrompt` safe-area** (`InstallPrompt.tsx:128`): `fixed bottom-24 z-40` with zero
      `safe-area-inset-bottom`, overlapping the nav by ≈18px on a notched device
- [ ] 7 sub-44px controls, all in the drawer footer / `InstallPrompt`. `LocaleToggle`'s "group"
      variant is missing the `min-h-11` its "plain" sibling already has — another partial adoption
- [ ] `InstallPrompt` dismiss is ≈16×16 with no padding
- [ ] stale comment `AppShell.tsx:59-61` still says the locale toggle renders "GR"/"EN"; it renders «ΕΛ»/"EN"
- [ ] `ThemeToggle` bypasses the translation bundle with an inline literal pair
- [ ] `NotificationBell` is dead in the shell — its only mount point is never invoked. Remove with a ledger row.

### P1-09 — Notification preferences control every channel, not just email · `done` — REVIEW PASSED
owner: Implementation (Fable 5) · file_boundary: `components/settings/sections/NotificationsSection.tsx`, `app/(protected)/account/actions.ts`

`NotificationsSection.tsx:44,66` reads and writes `channel === "email"` only, while `push` is an
implemented channel. A customer who switches a group off turns off email and leaves push on, and
nothing says so.
- [ ] the toggle governs every implemented channel, or the label states which channel it governs
- [ ] guard: no preference UI may write a single hardcoded channel

**Elevated by H-002 = B (2026-08-23): no longer a Phase 4 precondition, now a committed
dependency of the send-side change.** §9.5 needs a user-configurable monthly ceiling and a global
off switch honoured in outbound. Neither exists. A monthly digest with no ceiling and no off switch
is a worse product than the weekly one it replaces, so the controls ship first. See P1-09b.

### P1-09b — The three §9.5 cadence controls · `todo`
owner: Implementation (Fable 5) · blocked_by: P1-09
file_boundary: `components/settings/sections/NotificationsSection.tsx`, `app/(protected)/account/actions.ts`, `lib/notifications/settings.ts`

- [ ] user-configurable **monthly ceiling** on non-deadline outbound
- [ ] a **global off switch**, honoured in outbound and not only in-app
- [ ] both readable by the send path, not merely stored — a preference nothing consults is a
      dark pattern with a checkbox
- [ ] guard: no outbound send path may ignore the global off switch. Universe enumerated from the
      filesystem across `lib/notifications/**` and `lib/email/**`, per D-005

**BOUNDARY — read before starting.** §12.4 puts notification **dispatch** logic (whether a message
fires, to which channel, at what cadence) **out of scope for this run.** H-002 decides the *policy*;
this run specifies it and builds the *controls*, and does not itself change the cron cadence or the
send triggers. If an item appears to require editing dispatch scheduling, stop and report — that is
the §12.4 line, and B does not move it.

### P1-10 — One status vocabulary across every B2C surface · `todo`
owner: Implementation (Fable 5) · file_boundary: `app/(protected)/agent/page.tsx`, `lib/wallet/map-policy-card-status.ts`

- [ ] `/agent` adopts `getPolicyStatusView`; **delete** `mapPolicyCardStatus` rather than adding
      `expired` to it — two pipelines that agree today drift again, which is the history that file
      already records
- [ ] guard: no B2C surface derives a policy status outside `getPolicyStatusView` /
      `resolvePolicyLifecycle`. Universe = `app/` + `components/`, enumerated from the filesystem
- [ ] ledger row: no status state is lost in the migration — `action_needed` currently absorbs
      `expired`, so the mapping is one-to-many and must be written out

### P1-11 — Every placeholder form is detected, from one list · `done` — ABSORBED INTO P1-07
owner: Implementation (Fable 5) · file_boundary: `lib/wallet/unreadable-value.ts`, `tests/unit/`

- [ ] a bare `????` is detected (candidate #30). Add `?` to the bare branch; keep bare at 4+ while
      bracketed stays at 3+, so `???` in prose is not swept up
- [ ] the placeholder forms come from ONE enumerated list, not a restated regex in the guard
- [ ] probe fixture proving the guard red before green

### T-012 also left two conditions unbuilt, flagged not hidden
`renewalOutlookNoEndDate` (a policy with no resolvable end date) and a plural variant of the
no-premium case (≥2 in one portfolio). Both reachable with no schema change. Add if T-015 shows a
surface that needs them.

### P1-12…P1-13
Truncation (blocked by Phase 3 primitive, per candidate #12), layout integrity, global chrome,
sub-44px sweep, settings subtree, upload flow. Written when their surfaces are baselined.


---

## PHASE 0 GATE — **PASSED** 2026-08-23 (re-assessed; the earlier NOT MET below is superseded)

All seven §5.6 conditions verified individually, not asserted:

| §5.6 condition | evidence |
|---|---|
| Every surface baselined, 3 widths, every applicable state | **11 BASELINE.md documents, 188 captures**, covering all 20 landing surfaces + 7 overlays from `SURFACES.md` |
| Every candidate reproduced in a fixture, or code-confirmed with a reason | **36 verified, 0 pending** — 20 confirmed · 11 refuted · 5 relocated; 9 `defect-*` fixtures |
| 1.4.11 automated and reported | present in **all 11** baseline documents |
| Outbound-copy inventory complete, templates measured | `evidence/outbound/{INVENTORY,METRICS}.md` |
| `LEDGER.md` complete | 20 surfaces + 7 overlays, 89 capabilities |
| Instrumentation plan agreed | `INSTRUMENTATION-PLAN.md`, `reviewCoverage` ratified |
| Adversarial Reviewer confirms | **yes** — this table, each row checked against disk |

§0.10 re-verified at the boundary: `gap-detection.ts` sha256 unchanged from run start; dispatch stub
6/6 green; no AI schema accepts `isDetected`/`severity`.

### Honest note on sequencing
P1-01 and H-004 landed **before** this gate formally closed, under D-013 (owner instruction). The
gate was left recorded as FAILED throughout rather than back-dated, and it is only marked passed now
that the last capture (`/consent/ai`) is on disk. The dashboard and coverage-insights baselines
therefore describe the pre-P1-01 state — which is what a baseline is for, and is correct.

---

## PHASE 0 GATE — earlier assessment, superseded: **NOT MET**

§1.1.5 forbids the Orchestrator softening a gate, so this is recorded as failed rather than
rounded up. Six of the seven conditions in §5.6 hold.

| §5.6 condition | status |
|---|---|
| Every surface in `SURFACES.md` has a published baseline, all three widths, every applicable state | **NOT MET** — see below |
| Every candidate defect reproduced in a fixture, or recorded code-confirmed-only with a reason | MET — 30 verified, 9 `defect-*` fixtures |
| 1.4.11 automated and reported | MET — measured on every capture |
| Outbound-copy inventory complete, templates measured | MET — `evidence/outbound/METRICS.md` |
| `LEDGER.md` complete, no unenumerated capability | MET — 20 surfaces + 7 overlays, 89 capabilities |
| Instrumentation plan agreed | MET |
| Adversarial Reviewer confirms all of the above | **cannot** — condition 1 fails |

### T-016b — Close the five uncaptured targets · `partial` — 4 of 5 done
owner: Evidence (Sonnet 5) · blocks: the Phase 0 gate

**Done:** `/wallet/[id]/edit` (BASELINE + 3 captures) · four overlays, captured as five states
(`policy-comparison` splits into picker and table) · the genuine paid "no advisor" empty state.
**Outstanding:** `/consent/ai` content. `tests/measure/consent-ai-content-baseline.spec.ts` is
written but never ran — the agent ended while waiting on a background run. Only the old
reachability probe exists.

**Deliberately not run yet:** P1-01 is concurrently editing the score out of `lib/` and
`components/`, so the dev server is recompiling partially-removed code. A capture taken now would
measure a transient build, not the product. Run the consent spec once P1-01 lands.
- [ ] `/wallet/[id]/edit` — never captured. It is where a customer corrects an unreadable value
      (ledger U-06), so it is not optional
- [ ] `/consent/ai` — reachability only; content uncaptured. **Read-only measurement**: it is a
      §12.2 consent surface, so measure it and change nothing
- [ ] AI Consent Modal · Coverage Limit Modal · Policy Comparison Dialog · generic Confirm Dialog
      (4 of 7 overlays)
- [ ] a genuine "no advisor" state on `/agent` at paid tier — the shared fixture account has a
      pre-existing relationship, so the empty state is unreachable there. §5.3 requires it: the
      empty state is one of the two most likely to fail and least likely to be checked

### T-016c — Re-measure `/wallet/[id]` EXPANDED · `todo`
owner: Evidence (Sonnet 5) · blocks: any Phase 1 item claiming zero on that surface
Per D-011, its published tap-target / truncation / 1.4.11 numbers are floors for the collapsed
heads. Re-measure with all sections expanded and publish both.

### T-016d — `/coverage` legacy redirect is broken · `todo`
owner: Implementation (Fable 5) · file_boundary: `app/(protected)/coverage/page.tsx`
Confirmed twice in a real browser: the correct content is silently substituted but the URL never
becomes `/coverage-insights`. `SURFACES.md` reported zero broken destinations because the
enumeration checked that routes EXIST, not that redirects actually redirect — a route-level check
cannot see a runtime behaviour, which is the same universe lesson as D-005.

---

## Phase 1 execution order — SERIAL, and why

§3.7: *"Implementation agents may run in parallel across surfaces only after Phase 1 completes and
the design system exists. Before that, parallel work on a broken foundation multiplies rework."*

So Phase 1 runs **one item at a time**, each fully reviewed and committed before the next starts.
With eleven items that is slower than it looks tempting to make it — but the two prior runs that
produced regressions both shipped concurrent partial work, and §0.6 makes a partly-done phase worth
zero.

### Order, with the reasoning

| # | item | why here |
|---|---|---|
| 1 | **P1-01** score removed everywhere | Highest exposure. Also the largest, and H-001 just doubled its scope. Everything else is smaller once this lands. |
| 2 | **P1-02** no all-clear where the check never ran | Touches `provisionalProtectionScore`, which P1-01 has just stopped rendering — doing it second means the blast radius is already understood. |
| 3 | **P1-03** one definition of "policies this person has" | Same files as P1-02 (`engagement-drip`, `weekly-digest` services). Adjacent, so it goes next to avoid re-reading them cold. |
| 4 | **P1-05** English internal prose | Independent; unblocks the locale guard the later items lean on. |
| 5 | **P1-04** one event, one row | Needs T-012's keyed+unkeyed fixture, which exists. Carries the comment-rewrite instruction. |
| 6 | **P1-06** dead verdict keys + freeze the UNION | Must come **after** P1-01, or it would delete strings P1-01 is still removing callers for. |
| 7 | **P1-07** identity values never render raw | Independent. |
| 8 | **P1-09** preferences control every channel | Prerequisite for P1-09b. |
| 9 | **P1-09b** the three §9.5 cadence controls | Committed dependency of H-002 = B. |
| 10 | **P1-10** one status vocabulary | Cross-surface; safer once the surfaces above have settled. |
| 11 | **P1-11** every placeholder form detected | Small, self-contained. |
| 12 | **P1-08** app shell defects | Last of the code items — it touches chrome present on every screen, so it lands when nothing else is in flight. |

### Deferred out of Phase 1 by dependency, not by choice

- **Truncation (§6.1.9)** — candidate #12 established the real fix is a `policy-identity` primitive
  that does not break at all, which is a **Phase 3** deliverable. A `globals.css` edit here would be
  the surface-local override §3.8 calls a review failure. Deferred to Phase 3 with a ledger note.
- **T-016d `/coverage` redirect** — a real defect but a one-line routing fix with no measurement
  dependency; it rides along with whichever item is open when the gate passes.

### Standing rules for every Phase 1 item
1. Instrument what you touch, per `INSTRUMENTATION-PLAN.md`. Instrumentation added at the end does
   not happen.
2. Extend an existing guard; never write a second one for a defect class that has one (§11.1).
3. Every guard states **what it walks** and **what it claims** — the two questions D-005 and #17
   established are different.
4. Demonstrate the guard failing first. Record both outcomes in the item's queue entry.
5. Ship the whole item or requeue it. No partial merges.


---

## P1-01 — Adversarial review: **PASS**

Reviewed by the Orchestrator (Opus 5), who did not implement it. Every claim re-verified
independently rather than accepted.

| check | result |
|---|---|
| Defect removed, not **relocated** | **PASS.** My own grep for the value across `app/`, `components/`, `lib/` — excluding agent/admin (§12.4) — found exactly one hit: `risk-profile-version.ts:44`, which is a `createHash("sha256").update(…)` version input, not a render. Legitimately exempt. |
| Score renders in outbound | **2 → 0**, re-measured via `outbound-inventory.test.ts` |
| Guard `SANCTIONED` | empty, and asserted empty at line 107 |
| Guard universe extended to `lib/` | **PASS — proven, not asserted.** I injected `Βαθμολογία προστασίας: ${data.healthScore}%` into `weekly-digest.ts`; the guard went red naming that exact file; reverted → 8/8 green |
| Two pre-existing guards modified | **Both are STRENGTHENINGS.** `risk-engine-surface-consistency` replaced "indeterminate must reach tiles as null" with `not.toMatch(/cachedScore\.overallScore/)` + `not.toMatch(/provisionalProtectionScore/)` — strictly stronger. `policy-sentinels-unrenderable` filters `existsSync` because `git ls-files` reports the INDEX and a deleted-unstaged file cannot render a sentinel — not a universe shrink. |
| Three sites my map missed | verified at **0** occurrences each: `onboarding/flow.tsx`, `QuestionnaireForm.tsx`, `CoverageInsightsClient` dead prop |
| CI | `tsc` clean · lint · i18n · utf8 · audit:api-auth · **5076/5076 tests** |

**On the −14 test delta.** Accepted. Score-surface tests were deleted with the surfaces they
tested, the containment guard grew 4 → 8, and the honesty suite was rewritten to 16. Deleting a
test whose subject no longer exists is correct; the thing that would have failed review is deleting
a test whose subject survived, and the independent value sweep plus the proven guard cover that.

**The item found three render sites my 11-site map missed** — including
`app/onboarding/actions.ts` returning `healthScore: result.overallSuccessPct`, a *pipeline success
percentage* rendered to the customer as a protection figure. That is a worse defect than the one
P1-01 was written to fix, and no audit in this run had found it.

### Reviewer's note on scope discipline
It correctly did **not** delete `provisionalProtectionScore` despite reporting that it now has zero
product callers, and did not touch `ScoreRing` or any agent surface. That is the D-006 boundary held
under exactly the temptation that would have breached it.


---

## P1-02 — Adversarial review: **PASS**

| check | result |
|---|---|
| Never-analysed state | `gapFigure = nothingAnalysed ? '—' : String(gapCount)` — **«—», not «0»** |
| Green means one thing | `gapCount > 0 ? amber : fullyAnalysed ? green : grey`. The policy-count tile also went from *permanent* green to neutral, so green is now earned rather than default |
| Colour not sole carrier | in-tile text states the basis in el+en; survives a CSS-stripping client |
| Basis forced at the type level | `analysedPolicyCount` is **required** on `stats`, so the compiler makes every caller state it — stronger than a runtime check |
| Guard arm fails first | **proven by me.** Injecting «Δεν εντοπίσαμε κανένα κενό κάλυψης» into `getDay7Email`'s *rendered output* turned 2 tests red with "All-clear claimed where nothing was checked (zero recorded findings is not a finding of zero)"; reverted → 22/22 |
| `provisionalProtectionScore` | untouched, as required |
| CI | tsc · lint · i18n · utf8 clean; **5090/5090** (+14 = exactly the new guard tests) |

**The `knownDefect` pin is a ratchet, not a skip** — the thing I checked hardest. `churn-prevention`
has the same defect and was outside this brief, so it is registered with a reason AND an assertion
that it is *still violating*: "no longer violates the invariant — delete its knownDefect entry".
Fixing churn therefore breaks the test until the exemption is removed. Same precedent as the
severity-display debt list.

**Reviewer's own error, recorded:** my first two probes were no-ops — one used a missing anchor, the
other injected a dead module-scope const that the guard (correctly) never renders. Both produced
false greens. The guard was fine; my instrument was not. Third instance this run, and the reason
D-015's rule now reads *assert the probe changed rendered behaviour*, not merely that it changed the file.

---

## P1-03 — sharpened by what P1-02 left behind

P1-02 fixed `engagement-drip`'s day-7 **fetch** (`:164`, now `NON_LIVE_POLICY_STATUSES`). Three
offenders remain, and the guard is the real story:

| site | current | needed |
|---|---|---|
| `engagement-drip.service.ts:99` | `{ ownerUserId }` — no filter | `NON_LIVE_POLICY_STATUSES` |
| `weekly-digest.service.ts` count | no filter | same |
| `engagement-scoring.ts:167` | `status: "active"` | same |

**`tests/unit/live-policy-status-filter.test.ts` imports `globSync` and then hardcodes a list of
four files** (`:33-39`). `engagement-scoring.ts` is not on it — which is exactly why that file still
carries the original bug while the four listed ones were fixed. D-005, fourth instance, and this
time the guard even imports the enumeration helper it declines to use.

So P1-03's primary deliverable is **converting that list into a real enumeration** over `lib/` +
`app/`, with the three fixes falling out of it.


---

## P1-03 — Adversarial review: **PASS**

| check | result |
|---|---|
| Guard truly enumerates | **proven by me.** I created `lib/services/zz-reviewer-probe.service.ts` — a file the guard had never seen — with one bare-active Policy query. Red, naming file, line and snippet. Deleted → 10/10 green. A hardcoded list cannot do that. |
| No false positives on other models | proven by the pass itself: the repo is full of legitimate `status: 'active'` queries on Subscription / CustomerRelationship / PolicyAnalysisRun, and the guard is green |
| Universe floors asserted | 812 files, 125 Policy call sites, both asserted so an empty glob fails loudly rather than passing vacuously — the D-015 lesson applied by the implementer without being told |
| 43 exemptions across 29 files | **acceptable, because they are exact-count and ratchet BOTH ways**: "Stale exemption: … ratchet the entry down (or delete it) so the fix cannot regress". An exempted file cannot silently absorb a new violation, and fixing one forces the entry down. That is an inventory of known state, not a blanket pass. |
| CI | tsc · lint · i18n · utf8 clean; **5096/5096** (+6 = the old guard's 4 tests replaced by 10) |

**It found a fourth offender and a fifth.** Fourth, fixed: `churn-prevention.service.ts:154` — the
win-back email quotes a NON_LIVE-filtered `expiringPolicies` count beside an unfiltered `openGaps`
count *in the same message*. Fifth, correctly **not** fixed: `app/(protected)/admin/actions.ts:64`
runs a bare-active `db.policy.count` in the platform-stats tile, under-counting live policies. Admin
is §12.4, so it is exempted with a DEBT reason naming this run. **That is precisely the finding the
old hardcoded list could never have produced**, and it is the argument for D-005 in one example.

**It corrected my brief.** I asserted `weekly-digest.service.ts` had an unfiltered `db.policy.count`.
It has no such call — the unfiltered Policy-ownership query is the `newGaps` count's
`policy: { ownerUserId }` relation. Same defect, different shape; my line reference was wrong and it
said so rather than fixing something adjacent and calling it done.

**Five entries are marked DEBT** rather than quietly exempted: the admin tile, portfolio-gap-view,
coverage-insights, both branches pages, and the wallet overlap scan. Enumerated and deferred, which
is the honest form.


---

## P1-05 — Adversarial review: **PASS**, and the strongest fix in the run so far

| check | result |
|---|---|
| Structural, not detective | **proven by me.** `LocalizedText = { el: string; en: string }` — the `string` arm is gone. I compiled `const t: LocalizedText = "AI extraction finished and the policy is readable"` (the literal original defect) and got **`TS2322: Type 'string' is not assignable to type 'LocalizedText'`**. `type-check` is a blocking CI gate, so the bug can no longer be *written*, not merely caught. |
| Three modified pre-existing tests | **all strengthenings.** `gap-rule-integrity` went from "speaks the owner language" to "speaks BOTH product languages" and re-anchored on a count rather than a local's name (the old anchor would have gone stale); `renewal-reminder-days` replaced one ternary assertion with **two** — `"el"` and `"en"` asserted separately at lines 174-175. |
| Guard extended, not duplicated | `notification-bus-invariants.test.ts` +9, using the **shared** `findLatinSentences`/`findInternalTokens` from `metrics.ts` — the §5.1 single-definition rule honoured across a third consumer |
| CI | tsc · lint · i18n · utf8 · audit:api-auth clean; **5105/5105** |
| Outbound | Latin-script sentences **1 → 0** (churn day-30's "credits" subject); score stays 0 |

**My "63 event types" was stale — it is 74.** 66 readable events now carry authored bilingual copy;
8 `conv_*` analytics mirrors declare `copy: null` and are filtered from every surface by channel.
Verified two ways, runtime enumeration and a guard that fails on any event violating either rule.

**The Ειδοποιήσεις surface had no interception at all** — confirmed, not assumed. My earlier note
recorded that as suspected; it was true. Four read surfaces are now wired through one presenter
(`lib/notifications/stored-content.ts`) instead of one hand-written two-entry map.

**Legacy rows were handled honestly.** 52 non-analytics rows in the dev DB, run through the
presenter: 4 sanitized (2× `policy_analyzed`, 2× `renewal_overdue` storing `businessEvent` as both
title and message), 48 pass through untouched. A row whose event no longer exists degrades to
«Ειδοποίηση / Η αρχική διατύπωση… δεν είναι διαθέσιμη» — never the internal prose, and never an
invented claim. That last choice is the §2.3 rule applied to a migration.

**What still relies on discipline, stated rather than glossed:** an emitter could hand-write English
inside an `el:` arm. The type forces bilingual *shape*, not bilingual *content*. Recorded as the
residual risk.


---

## P1-04 — Adversarial review: **PASS**, and it corrected D-002

| check | result |
|---|---|
| Grouping is exact-match, no suffix surgery | `const key = row.dedupeKey && row.dedupeKey.length > 0 ? row.dedupeKey : null` — no `split`/`slice`/`lastIndexOf` anywhere in `event-grouping.ts` |
| Channel chip gone | `page.tsx` and `NotificationsClient.tsx` contain the word `channel` **only in comments explaining its removal**. The `in_app` raw-enum leak dies with it |
| Unkeyed rows never merged | nulls map to `null` and render individually; the T-012 fixture's two deliberately-similar unkeyed rows survive through both `getNotificationData` and the v1 API |
| Guard fails first | **proven by me.** Bypassing `groupNotificationEventRows` turned **6 tests red** — behaviourally (4 rows rendering as 4 not 3, channel back in the payload, read state wrong) *and* statically (call-site scan). Reverted → 23/23 |
| CI | tsc · lint · i18n · utf8 clean; **5128/5128** (+23 = exactly the new guard) |

**It refused my instruction, and was right to.** See the correction at the top of D-002: I told it to
strip a `:${channel}` suffix that does not exist. The suffix is `recipient.kind`; the channel is a
separate column in `@@unique([userId, dedupeKey, channel])`. Stripping the last segment would have
merged `renewal:…:30d` with `:7d`, collapsed `churn:${tier}:${runDay}` across days, and — worst —
merged `evt:${id}:admin` into `evt:${id}:${notificationEvent}`.

**Read state has one home**, which is the decision I asked for and did not specify: the in-app arm's
`readAt`. An event with no in-app arm has no read state and never renders unread — otherwise the
badge could never be cleared, since `markAllNotificationsRead` is in-app-only. `markNotificationRead`
now scopes to `channel: "in_app"` so single and bulk mark-read finally agree.

**The guard contains its own flow-through test** — one case is literally named *"flow-through: the
query still spans real channels (grouping, not an in_app filter that would drop email-only
events)"*. That is the check I have had to run manually on every prior item, built in.

**Two limits reported rather than hidden:** v1 cursor pagination can show an event once per page if
its rows straddle a boundary (milliseconds wide; a real fix needs an event table, i.e. §12.2), and
groups whose arms are all `skipped` still render — pre-existing, not worsened.


---

## P1-06 — Adversarial review: **PASS**. Scope expansion RATIFIED.

| check | result |
|---|---|
| `healthLevels` strings **and wiring** gone | **0 occurrences** repo-wide. Strings, the `SummaryCard.tsx:27` type field (whose own comment admitted "NOT rendered here"), and the `PolicyDetailsClientView.tsx:834` pass-through. `tsc` clean, so a hidden consumer would have failed to compile |
| Freeze fails on addition | **proven by me.** Adding one bundle string turned it red with `+ bundle zzReviewerProbe "ΔΟΚΙΜΗ ΑΝΑΘΕΩΡΗΤΗ"` — the diff *names the string*, which is the reviewability property I asked for. Reverted → 7/7, inventory unchanged at 7,215 lines |
| Deletions fail too | asserted by the agent in both bundle and inline form, so prohibited copy cannot be quietly re-removed |
| Extraction is AST, not regex | handles all 7 shapes found in the wild; composed templates freeze their **shape** (`` `Λήγει σε ${d} ημέρες` ``), so recomposition trips too |
| CI | tsc · lint · i18n · utf8 clean; **5135/5135** (+7 = the new guard) |

### The scope expansion is RATIFIED, and my brief was wrong

I scoped the inline walk to `app/` + `components/`. It added **`lib/`** and flagged it for review.
Measured independently:

| root | files with inline Greek |
|---|---|
| `app/` | 53 |
| `components/` | 39 |
| **`lib/`** | **124** |

`lib/` alone holds more than the two roots I specified combined — guides 439 pairs, glossary 278,
risk-catalogue 245, notification registry 132, public pricing copy 117. A freeze on my universe would
have certified "no unreviewed Greek shipped" while **87% of the inline surface floated free.**

That is D-005 applied to my own instruction, by the implementer, unprompted. Ratified. Enumerating
`app/(public)` read-only is also correct — public marketing copy is where an unreviewed claim does
most damage, and §12.4 restricts *editing*, not *reading*.

My "85 files" estimate was close for the briefed roots (real: 78 files / 569 pairs, AgentClient.tsx
at 56 exactly as predicted) and beside the point, because the roots were wrong.

### It caught a false green in its own probe harness

Probe D's first attempt was a no-op: the plant script's `count()==1` assertion matched a substring,
and the revert half inserted a duplicate key which left the guard legitimately green. **It noticed
via an anomalous `git diff --stat`, removed the stray line, and redid the probe line-based to a
genuine red.** That is the exact failure mode I hit three times in this run, self-caught and
self-reported rather than shipped as a passing proof.

### Residual gap it reported — needs its own item
Greek **not** shaped as `{ el, en }` — locale ternaries in `.ts` files such as `lib/i18n/role-copy.ts`
and `lib/agent/format.ts` — is frozen by neither this guard nor `lint:i18n-changed` (which only sees
`.tsx`). Genuinely unfrozen and unlinted. Queued below.

### P1-14 — Freeze locale-ternary Greek in `.ts` files · `todo`
Third form of Greek in this codebase, covered by nothing. `lint:i18n-changed` scans `.tsx`; the P1-06
freeze matches `{ el, en }` object pairs. A `lang === 'el' ? '…' : '…'` in a `.ts` file is invisible
to both.


---

## P1-07 — Adversarial review: **PASS**. Outbound is now clean on all three metrics.

| check | result |
|---|---|
| Outbound leakage | **score 0 · tokens 0 · Latin 0** — the §6.3 outbound target, met. Tokens went 1 → 0 by fixing `buildNotificationEmail`, so every notification email inherits it rather than each caller |
| Bare `????` detected (P1-11) | **probed by me**: `????` → true, `Αριθμός ????` → true, `(????)` → true, `XXXX` → true, `???` → **false** (correctly not swept up in prose). Was rendering as customer data before |
| Guard fails first | **proven by me.** Bypassing all 3 `assertRenderableText` calls turned **4 tests red**, covering both halves — dev/test THROWS on the exact payload that leaked, production degrades honestly and never throws. Reverted → 56/56 |
| Guards extended, not added | `policy-sentinels-unrenderable` + the unreadable-value tests. §11.1 honoured |
| CI | tsc · lint · i18n · utf8 clean; **5171/5171** (+36) |

### The P1-06 freeze earned its keep on first contact

P1-07 touched four Greek template literals, and the freeze **caught it and forced a deliberate
regeneration**. I audited that diff, because regenerating a freeze is precisely how a copy change
would slip past it: exactly 4 lines changed, every one `${agent.name}` → `${displayPersonName(agent.name)}`,
with the Greek byte-identical. "Interpolation-only" verified in seconds — which is the whole point of
making the artifact human-readable.

### The right fix for the right defect

Candidate #6 was never a copy defect. `welcomeBack` is clean Greek; `E2E` was the display name
interpolated into it. A fixture-shaped name now renders the wallet title «Το πορτοφόλι μου» instead,
the shell falls back to «Χρήστης», and `UserMenu` identifies the account by its **email** — the
honest identifier. Fallbacks are always existing honest copy: an email, a role label
(«Ο σύμβουλός σας», «Ένας πελάτης»), or the un-personalised sentence. **Never blank, never invented.**

`greeting()` in `phrases.ts` is one chokepoint covering the weekly digest, 3 drip and 4 churn emails.

### Scope held, and the remainder named
Agent-facing sites carrying the same class — `renewal.service` customerName, `tasks/actions.ts`,
`agent/actions.ts`, `cross-sell`, `customer.service` — were left unrouted under §12.4 and reported as
needing a scope decision rather than quietly included.


---

## P1-09 — Adversarial review: **PASS**, plus one defect I found in review (D-016)

| check | result |
|---|---|
| Channels derived, not listed | `PREFERENCE_CHANNELS = IMPLEMENTED_CHANNELS.filter(c => c !== "in_app")` — a fourth transport joins automatically |
| Screen names no channel | the only `"email"`/`"push"` occurrence is a comment explaining the history |
| Send path honours it | verified as a **seam test**: the exact rows the action persists go to the dispatcher with VAPID keys set and a live push device registered, so the push arm is genuinely attemptable — then every governed channel records `skipReason: "preference_off"` and no transport is called. A companion case pins the old defect: the email-only write yields `push.status: "sent"` and a real `sendWebPush`. **That is the difference between a preference and a checkbox.** |
| Greek freeze diff | audited: 3 removed / 3 added exactly as reported. «Email που σας στέλνουμε» → «Τι σας στέλνουμε»; the new description names both channels; history copy now discloses the in-app record is always kept |
| CI | tsc · lint · i18n · utf8 clean; **5181/5181** (+10) |

**A security fix arrived incidentally.** `toggleNotificationPreference` was a `"use server"` export
taking arbitrary strings — a public endpoint under `CLAUDE.md`'s rule that every export of such a file
is reachable with no UI. Deleted and replaced by an action that refuses non-registry streams and
writes the group in **one transaction** (the old UI fired parallel per-event calls that could
half-fail, splitting a group).

**The `in_app` decision is right and well-argued:** in-app delivery *is* the `NotificationEvent` row,
and all five readers filter `channel: "in_app"` with no status filter — a suppressed arm would still
render. A checkbox that changed nothing is exactly the dark pattern this item removes. Making it real
means changing dispatch semantics across five readers: §12.4.

### D-016 — the defect I found while reviewing
`grep` returned nothing on a 4,907-byte file: it held a **raw NUL byte** instead of the `\u0000`
escape. Valid UTF-8, so `lint:utf8` passed — but grep, ripgrep and git treat the file as **binary and
skip it**. A source file invisible to every command-line text tool, with all gates green. Fixed at the
source and in `check-utf8.js`, proven red on a planted NUL.


---
---

# PW-MOBILE-TRANSFORM-02 — v2 queue

v1's instruction is superseded; its committed work is inherited (D-018). Everything below is new.

## Phase 0 extension — blocks v2 Phase 1

### V2-P0-FIX — two new degraded fixtures · `done` (fixture 1) / `requeued` (fixture 2)
owner: Evidence (Sonnet 5) · file_boundary: `tests/measure/fixtures.ts`, `dashboard-fixtures.ts`
Blocks V2-P0-BASE, because a fixture must be able to produce the defect.
- [ ] a portfolio holding some lines and demonstrably **not** holding others (§2.2)
- [ ] a household with income and dependants genuinely unset, with motor cover present (§2.4 zero-scores)
- [ ] each verified by calling the real render functions, not assumed

### V2-P0-BASE — baseline three unmeasured surfaces · `done`
owner: Evidence (Sonnet 5) · blocked_by: V2-P0-FIX
`/branches` · `/insights/risk-profile` · `/timeline`, at 320/390/430, every applicable state.
**Note for `/insights/risk-profile`:** it is currently unreachable for policyholders (v2-6) — the
capture must bypass the proxy bounce or the fix must land first.

### V2-P0-VERIFY — candidate verification · `done`
Six v2 candidates verified case-insensitively. **5 confirmed, 1 refuted.** Recorded in
`evidence/CANDIDATE-VERIFICATION.md`.

## Phase 1 additions (v2)

### V2-P1-01 — the misroute is a proxy prefix collision · `done` — REVIEW PASSED
owner: Implementation (Fable 5) · file_boundary: `proxy.ts`, `tests/unit/`
`proxy.ts:223` lists `"/insights"` in `agentRoutes` and matches with `startsWith`, so the B2C
`/insights/risk-profile` is classified agent-only and policyholders are bounced to `/dashboard`.
- [ ] `/insights` and `/insights/book` stay agent; `/insights/risk-profile` is B2C
- [ ] a prefix match cannot express "all children except one" — fix the rule, not the symptom
- [ ] guard: every route in `SURFACES.md` is reachable by the role that owns it. **Enumerate from
      `SURFACES.md`**, do not hand-list. The file's own comment already warns about this collision
      class for `/dashboard`; the guard must catch the next one too
- [ ] demonstrate failing first, with the probe proven to exercise the routing decision

### V2-P1-02 — unowned lines are not findings (§2.2) · `done` — REVIEW PASSED
owner: Implementation (Fable 5) · blocked_by: V2-P0-FIX
`RiskGraphPanel.tsx:71` «Απροστάτευτο» · `lib/wallet/gap-report.ts:592,599` «Πιθανό κενό» ·
**`lib/mail-templates.ts:132` puts «Πιθανό κενό» in email.** Unowned lines render as *not held*,
neutrally, never in the visual language of a finding, never a red chip.

### V2-P1-03 — the second score's verdict (§2.4) · `todo`
owner: Implementation (Fable 5) · blocked_by: H-005
Remove «Καλή εικόνα» from `RiskIntelligenceView.tsx:106`. Whether the **metric** survives is H-005.

### V2-P1-04 — the guilt register (§2.13) · `done` — REVIEW PASSED
owner: Product-Truth (copy) + Implementation · file_boundary: `lib/services/risk-dna/health-index.ts`
Rewrite line 199. Emotional leverage on an unvalidated finding.

### V2-P1-05 — `/timeline` leakage (§2.6) · `done` — ABSORBED INTO V2-P1-06
`__PENDING_EXTRACTION__` rendering as a policy name.

### Carried from v1, still open
**P1-10** ✓ done · **P1-08** ✓ done ·
**P1-14** ✓ done.

## Halts to raise
**H-005** — should the second score exist? **H-006** — the AI advisor's advice boundary (IDD Art. 20).
**H-007** — Art. 9 consent for the interview.


---

## V2-P0-FIX — review: fixture 1 PASS, fixture 2 REQUEUED

**Fixture 1 — unowned lines: PASS, and §2.2 is confirmed reproducing.** Verified by calling the
real `assembleRiskGraph()` and `buildBranchOverview()` against DB-read data, not assumed. With 29
policies covering only motor and health, three lines the customer holds **zero** policies in render
as findings: `cyber_fraud`, `life_dependents`, `pet_costs` → «Απροστάτευτο» on the risk graph, and
life / pet / cyber → «Πιθανό κενό» on `/branches` (`el.ts:1541`). A fourth, `home_contents_tenant`,
appears incidentally from a pre-existing `residenceType: "rented"`.

It also caught something by testing rather than assuming: `childrenCount` had to be seeded because
`life_dependents.requires` lists both `dependents` and `children`, and omitting it left the risk
**silently absent** rather than unprotected — a fixture that would have under-reported the defect.

**Fixture 2 — unknown household: REQUEUED. Right result, wrong path** (D-020).

The health-index unknown state reproduces exactly (`index: null`, `band: "unknown"`, even with 22
motor policies). But its refutation of the «ΑΓΝΩΣΤΟ» row tested `applicability: needs_review`, which
`bindRisksToGraph` legitimately drops. «Άγνωστο» hangs off **`state`**, produced by
`protection.ts:373` when an *applicable, covered* risk has all-`unevaluable` adequacy.

Requeue with the corrected target: **policies present · risk applicable · adequacy unevaluable.**

One result worth keeping from it regardless: `protectionScore` returned **94 with
`indeterminate: true`** for a household the product knows nothing about. That is §2.5 territory and
feeds H-005.


---

## V2-P1-01 — Adversarial review: **PASS**, and it found the same bug mirrored

| check | result |
|---|---|
| Rule replaced, not patched | `ROUTE_OWNERSHIP` — one table, whole-segment matching, most-specific-wins. A child overriding its parent is **one more row**, not a hand-written exception, and `/dashboard` vs `/dashboard/agent` collapses from a special case into two ordinary rows |
| Guard derives its universe from `SURFACES.md` | **proven**: adding `/timeline` to that document took the guard 56 → 57 tests with no code change |
| Fails first | **proven by me.** Deleting the `/insights/risk-profile` ownership row turned it red naming that route, plus the control case. Reverted → 57/57 |
| Seam test on the real `proxy()` | 7 cases end-to-end with real `NextRequest`/`NextResponse`: policyholder **200 pass-through**, agent **307 → `/dashboard/agent`** |
| CI | tsc · lint · i18n · utf8 clean; **5262/5262** (+63); `npm run build` compiles the middleware entry |

### The find: the identical defect, mirrored

`/wallet/[id]/review` is **agent-owned** — `review/page.tsx:24` is
`if (!isAgentRole(dbUser.roles)) notFound()`, and it is linked from
`customers/[id]/policy/[policyId]/page.tsx:128`. The old `policyholderRoutes` contained `/wallet`,
matched by `startsWith`, so **every agent was bounced off a page built for them.**

Same defect class as `/insights/risk-profile`, in the opposite direction, in the same function,
a few lines apart — under a comment warning about precisely this hazard for `/dashboard`. Two live
instances and one documented near-miss of a single root cause.

### `/timeline` was missing from `SURFACES.md`

The guard could not classify a route the document never mentioned, and said so. Cross-checked
afterwards: of 37 menu hrefs, exactly one was absent — the v1 sweep was 36/37, not unreliable, but
the miss is a top-level menu destination. Corrected, with the lesson recorded: that document is no
longer a report, it is **load-bearing**, and a gap in it is now a hole in a guard.


---

## V2-P0-BASE(a) — `/branches` and `/timeline` baselined. Review: **PASS**

| surface | scroll @320 | sections | containers/depth | sub-44 | truncation | leaks |
|---|---|---|---|---|---|---|
| `/branches` (both tiers) | 1,981 | 0* | 31 / 2 | 0 | **9** | 0 |
| `/timeline` paid | 9,539 | 5 | 68 / 2 | 0 | 2 | **1** |
| `/timeline` free | 864 | 2 | 7 / 2 | 0 | 1 | 0 |

`*` no `section[id]` on the page — the documented metric artifact, captured with `minSections: 0`.

**Confirmed:** §2.2 «Πιθανό κενό» on life / pet / cyber with **zero policies each** · 8 of 9 branch
taglines clip mid-word at 320px (`line-clamp-2`), falling to 4/9 at 390 and 2/9 at 430 ·
`__PENDING_EXTRACTION__` on `/timeline` · 18 of 60 rows share one title.

**Refuted:** the floating avatar over «Ζωή». No avatar exists below 1024px (`AppShell.tsx:347`,
`hidden lg:block`); the only overlap in the full-page capture is the fixed bottom nav at a
scroll-stitch boundary, over the *Health* card, and the page reserves space for it. A re-crop at
Ζωή's real position is clean. Second refutation of this claim, on a second surface.

**Two findings nobody listed:**
1. `/branches` reads a **cached** protection-score row that no GET recomputes — the capture needed
   `GET /api/v1/protection-score?fresh=true` first. A surface rendering «Πιθανό κενό» off a stale
   cache is a §2.5 question in its own right.
2. The nine cards include `business` because it is `contentTier: 'rich'` with **no B2C/B2B filter** —
   possibly unintended on a consumer surface.

**It caught its own measurement artifact**, which is the part worth naming. Chip counts drifted
mid-run (free timeline 2 → 12 entries between widths). It traced this to *its own* parallel
Playwright workers — `branches-*.spec.ts` force-refreshing the shared account's score while
`timeline-*.spec.ts` was capturing, because `describe.configure({mode:"serial"})` serialises within
a file, not across files. §0.5 forbids comparing captures whose data moved; it found itself doing
that and said so rather than publishing the numbers.

### V2-P1-06 — `/timeline` identity bypass · `done` — REVIEW PASSED
`lib/services/timeline/build.ts:202` reads `policy.insurerName?.trim()` directly; `LifeTimeline.tsx`
renders it verbatim. Route through `lib/wallet/policy-identity.ts`, and close the guard gap in
D-021 — the sentinel guard cannot see this because the file never contains a literal.


---

## V2-P0-BASE(b) — `/insights/risk-profile` baselined. Review: **PASS**

All five candidates confirmed, plus three findings nobody listed. Reachability verified live first
(a dedicated `reachability:` assertion in all three specs, proving V2-P1-01 actually opened the
surface) — this page had never been measured because policyholders could not reach it.

### New Phase 1 items from this baseline

### V2-P1-07 — `readCoverageFacts` never reads `vehicle.insuredValue` · `done` — REVIEW PASSED
owner: Implementation (Fable 5) · file_boundary: `lib/services/risk-graph/service.ts`, `tests/unit/`

`readCoverageFacts` resolves a sum insured from `coverage.sumInsured ?? property.insuredValue ??
home.insuredValue`. Two are property fields; the motor one is missing, though
`lib/schemas/acord-data.ts:235` defines `vehicle.insuredValue` and both the gap catalogue and
renewal-differential read it.

Every motor policy therefore yields `sumInsured: null` → limit `unevaluable` → `state: "unknown"` →
**«Οδήγηση χωρίς υποχρεωτική κάλυψη · ΑΓΝΩΣΤΟ» for every customer who owns a car**, in a market
where motor cover is compulsory.

- [ ] read `vehicle.insuredValue`, and audit the other spellings the schema defines against what
      this function reads — one omission implies the list was never checked against the schema
- [ ] guard: the fields `readCoverageFacts` reads are **derived from or checked against**
      `lib/schemas/acord-data.ts`, so a schema field cannot go unread again
- [ ] **do not soften the label as the fix.** «Άγνωστο» is honest when a check cannot run; here it
      can — the data is in the column under a name nobody read

### V2-P1-08 — the second score's amber fails contrast · `todo`
«Μερική εικόνα» measures **3.20:1** against 4.5:1 (WCAG 1.4.3). Merge into V2-P1-03 if H-005 removes
the verdict — deleting it resolves this too.

### V2-P1-09 — singular/plural agreement, `health-index.ts:206` · `done` — REVIEW PASSED
«1 περιοχή που **αφορούν** … **παραμένουν** ανοιχτές». **The same class `11ec4987` fixed** — the
commit this run is based on. Fix with V2-P1-04 (guilt copy), same file.

### V2-P1-10 — one expiry window, or two visible labels · `refuted` — NOT a §2.8 violation; carried to Phase 2
`/insights/risk-profile` says «3 λήγουν μέσα σε 45 ημέρες» (`risk-dna/monitoring.ts:69`);
`/dashboard` says «2 λήγουν μέσα σε 30 ημέρες» (`lib/policy-status.ts:192`). Proved in one session
against one database state, with the causing policy identified. Both correct for their own window —
§2.8's labelling case, not an arithmetic one.

**Honesty note carried from the capture:** the "heavy portfolio" state was contaminated (34 policies
= 12 + 22) because `applyPortfolioState` only clears its own prefix. Called out in the baseline
rather than mislabelled; the same-session dashboard cross-check inside that state is unaffected.


---

# V2 PHASE 0 EXTENSION — **COMPLETE** 2026-08-24

| §5 gate condition | evidence |
|---|---|
| Every surface baselined, 3 widths, applicable states | **14 BASELINE.md documents** — v1's 11 plus `/branches`, `/timeline`, `/insights/risk-profile` |
| New degraded fixtures built and proven | `applyUnownedLinesProfileFixture` (§2.2) and the corrected `applyUnknownHouseholdFixture` (§2.4 / ΑΓΝΩΣΤΟ), both verified by calling real functions |
| Every v2 candidate reproduced or refuted | **7 verified: 6 confirmed, 1 refuted** (§10's analyses counter, already fixed) |
| 1.4.11 automated | in every baseline |
| `LEDGER.md` complete | **109 capabilities**, 4 counts refreshed |
| Instrumentation plan agreed | carried from v1 |
| Adversarial Reviewer confirms | yes — each row checked against disk |

**§0.7 re-verified at the boundary:** `lib/gap-detection.ts` sha256 unchanged from run start;
dispatch stub 6/6 green.

## What the extension actually bought

Three surfaces measured for the first time, and **four defects nobody had listed**:

1. **`readCoverageFacts` never reads `vehicle.insuredValue`** — so «ΑΓΝΩΣΤΟ» is the default for
   every motor policy, in a market where motor cover is compulsory. The single most consequential
   finding of either run.
2. **A mirrored proxy prefix collision** — `/wallet/[id]/review` bounced agents off an agent-only
   page, the same root cause as the reported `/insights/risk-profile` bug, in the opposite direction.
3. **`/timeline` bypasses `policy-identity.ts`** — and the guard cannot see it, because it forbids a
   spelling where the invariant demands a routing rule (D-021).
4. **A plural-agreement bug of exactly the class `11ec4987` fixed** — the commit this run is based on.

And two refutations that would have caused wasted work: the floating avatar (twice, on two
surfaces) and §10's analyses counter.

## Phase 1 (v2) queue — 10 items

**V2-P1-07** (motor field, highest priority) · **V2-P1-02** (unowned lines, incl. email) ·
**V2-P1-06** (timeline identity + the D-021 guard gap) · **V2-P1-03**+**08** (second score, blocked
on H-005) · **V2-P1-04**+**09** (guilt copy + agreement, same file) · **V2-P1-10** (expiry window) ·
**V2-P1-05** (timeline leakage) · plus v1's carried **P1-10**, **P1-08**, **P1-14**.

Phase 1 remains **serial** (§1).


---

## V2-P1-07 — Adversarial review: **PASS**. The audit found far more than the motor field.

### Six of nine spellings were phantoms

I verified the central claim: **`AcordDataSchema` defines no top-level `coverage` object at all.**
It defines `coverages` (plural) and per-line objects — `motor`, `home`, `health`, `life`,
`lifeAndInvestment`, `marineVessel`, `pet`. So five reads against `acord.coverage?.*` were against a
key that has never existed, and a sixth (`home.perils`) likewise.

| fact | before | after |
|---|---|---|
| `sumInsured` | 1 phantom + 2 property spellings | **10 real carriers wired**, canonical-per-line → fallback → generic → legacy |
| `perils` | **3 phantoms, all of them** | still unwired — **no schema path carries a peril list**; the fact lives in per-line booleans, and mapping flags → peril tokens is a taxonomy decision, not a spelling. 19-entry reasoned exemption list |
| `territories` | **3 phantoms** | still unwired — the carrier `territorialScope.includes` holds free text *in the document's language*, and `assessTerritory` compares English tokens. Wiring it raw would fail every Greek policy naming Greece as «Ελλάδα» — a new false downgrade |

Those two non-wirings are the right call and the reasons are recorded rather than the work quietly
skipped.

### The state after the fix is correct, not merely different — which is what I checked hardest

| case | result |
|---|---|
| motor with `vehicle.insuredValue` | `limit: satisfied`, `peril: unevaluable` → **`partially_protected`** — *not* `protected`. "A sum insured alone does not confirm the compulsory liability cover." |
| motor, envelope only | **stays `unknown`** — «Άγνωστο» preserved where nothing is genuinely readable. P1-02's principle intact |
| home 10k insured against a 180k mortgage | `limit: failed` → `partially_protected`. **Readability did not become protection** |
| life, 5k death benefit vs 40k loan | `failed`; 60k vs 40k → `protected` |

### Guard

`COVERAGE_FACT_SOURCES` is exported and is what `readCoverageFacts` actually iterates — one table,
load-bearing twice. The guard walks the **Zod schema itself** (100+ leaves, vacuity-checked),
asserts every declared path exists with the right type, every legacy path does **not**, and every
fact-bearing field is read or exempted with a written reason. Stale exemptions fail too.

**Proven by me:** removing the `vehicle.insuredValue` row turned **5 tests red** across both halves —
the schema audit naming the field, *and* the real reader losing the value, *and* the end-to-end state
regressing. Reverted → 88/88.

### Honest consequence it flagged rather than buried
Health, pet and travel policies carrying `policy.sumInsured` now reach `protected` on a recorded
limit alone, because no peril expectations exist for those lines. That is `protection.ts`'s existing
roll-up now fed by production data, identical to home-without-mortgage. If those lines want a floor,
that is a `requiredMinimum` extension — a separate item, not a silent widening here.

**No Greek copy changed**, so the string freeze needed no regeneration.

### Reviewer's own error, fifth of its kind
My first probe asserted on a 2,000-character window rather than counting occurrences, so the file
was never written and the green was meaningless. Caught because the assertion threw. Re-run with a
before/after count.


---

## V2-P1-02 — Adversarial review: **PASS**

An unowned line now renders «Χωρίς ασφαλιστήριο» on a neutral gray surface with a dashed-circle
glyph, keeping its name and anchors and its evidence line — «Κανένα ενεργό ασφαλιστήριο στο
πορτοφόλι σας δεν καλύπτει αυτόν τον κίνδυνο.» The filter strip counts them under **their own
register**: «Όλα 6 | Άγνωστο 2 | Χωρίς ασφαλιστήριο 4». No «Απροστάτευτο», no red, and the
information the ledger required kept (B-05, R-03) is intact.

### The discrimination is ownership, and it is proven by the case that would break a copy-only fix

`GraphRisk.heldInLine` counts wallet policies **of any lifecycle status** whose branch family
answers the risk's line. `not_held` derives only from `state === "unprotected" && heldInLine === 0`.

The test that matters: **a held-but-lapsed line stays a red finding.** An expired motor policy
yields `unprotected` with `heldInLine === 1` and still renders «Απροστάτευτο», beside pet rendering
«Χωρίς ασφαλιστήριο» — *"an expired policy is a held product; its exposure is a finding, not a
not-held."*

Getting that backwards would have been the dangerous outcome: someone driving on expired cover
reclassified as merely not owning motor insurance. §2.2 removes a false claim; it must not suppress
a true one.

**Proven by me:** disabling the `heldInLine === 0` derivation turned **4 tests red**, including the
lapsed-policy case and the WCAG 1.4.1 plain-text assertion. Reverted → 14/14.

### The ownership test found a third site and cleared two others
- **Found:** `components/branches/BranchCoverageMap.tsx` on the **dashboard** — same state and label,
  rose dot on a zero-policy branch. Fixed through the shared mechanism, not separately.
- **Cleared:** `PolicyWalletWidget.tsx` and `AudienceTabs.tsx` — the demo customer **holds** the home
  policy and the gap is missing flood cover *inside* it. Correctly untouched, as were the two sites
  I had wrongly listed.

That is the rule from my own correction, applied in both directions by the implementer.

### Details worth keeping
- **An existing guard caught its copy choice.** The first draft «Χωρίς συμβόλαιο» was rejected by
  `policy-term-asfalistirio.test.ts` — «συμβόλαιο» is owner-banned vocabulary. The repo's guards
  are now dense enough to correct an agent mid-implementation.
- **Colour is not the carrier.** «Χωρίς ασφαλιστήριο» differs from «Δεν έχει αξιολογηθεί» in *words*.
- **Monetization stayed at 5.** §2.2 permits one labelled upsell; adding one would have raised the
  ledger count, so it was **reported rather than added**.
- **Greek freeze:** exactly one removal, one addition — `branches.statusGap "Πιθανό κενό"` →
  `branches.statusNotHeld "Χωρίς ασφαλιστήριο"`. Audited.


---

## V2-P1-06 — Adversarial review: **PASS**. Six more bypasses, one of them downloadable.

`/timeline` now degrades a placeholder identity to the branch label alone — «Προστέθηκε
ασφαλιστήριο Αυτοκίνητο», no dangling em-dash — while a real insurer still renders « — Interamerican».

### The guard's rule: *reads are not renders*
Three sinks only — **jsx_text** (interpolation, not attribute pass-through), **bilingual_copy**
(`${…}` on an `el:`/`en:` line, or any line carrying Greek), **identity_pair** (hand-built
"Insurer (Number)"). Per-file lexical taint follows `const` aliases **to a fixpoint** — which is
precisely the shape (`const insurer = policy.insurerName`) that walked past the literal scan and
caused D-021.

Universe: tracked `.ts/.tsx` under `app/ components/ lib/ hooks/ contexts/`, minus admin/agent, floor
asserted >400 files. **13 exemptions in 4 mechanical classes, not 100 one-offs** — and they
self-invalidate (D-022).

### The guard found six bypasses beyond the briefed one

| site | why it matters |
|---|---|
| `lib/services/risk-graph/protection.ts:448` | the **identical alias shape**, found by the guard rather than my manual survey |
| `lib/services/gap-engine/recommendation-generator.ts` | **DB-stored** prose — "Review your Unknown Insurer policy" persisted with no downstream scrub |
| `lib/services/reports/savings-report.ts` | a **customer-downloadable** report title and meta rows |
| `app/(protected)/notifications/actions.ts` | `${insurerName} (${policyNumber})` rendered by `NotificationCard` |
| `components/wallet/PolicyDetailsClientView.tsx` | the `navigator.share` sheet |
| `components/coverage/CoverageInsightsClient.tsx:401` | was relying on a scrub in *another* file — made self-defending |

The stored one deserves attention beyond this item: rows already written carry that prose, and a
scrub at render is not a migration. Flagged, not silently assumed clean.

### Failure proof
Reverting `build.ts` to the raw read → **9 tests red**, with the DOM assertion's received text
byte-identical to the leak in `evidence/timeline/BASELINE.md`'s §2.6 screenshot. Restored → green.
I separately probed the *exemption* rather than the fix — see D-022.

**Greek freeze:** one entry, the sanitization itself. The old form was
`${gi.policy?.insurerName ?? ""}`, which rendered a **dangling sentence** on a null insurer as well
as the sentinel on a placeholder. Both gone.

**Outbound stays 0 / 0 / 0.**


---

## V2-P1-04 + V2-P1-09 — Adversarial review: **PASS**

Copy implemented exactly as authored. Verified at n = 0/1/2 in both languages, asserted with
`toEqual` on the objects the view renders verbatim.

### The agreement class was five sites, not one

The briefed defect was `health-index.ts`. The new guard found **two more**, and a manual sweep of
the guard's own documented blind spots found **two more again**:

| site | defect |
|---|---|
| `health-index.ts:206` | briefed — «1 περιοχή που **αφορούν** … **παραμένουν ανοιχτές**» |
| `compute.ts:392` | **both languages, unreported** — "1 question … **are** still unanswered" / «παραμένουν αναπάντητες» |
| `role-copy.ts:281` | «1 στοιχείο που **χρειάζονται** προσοχή» |
| `advisory-impact.ts` | **no ternary at all** → "1 people depend on this book" |
| `advisory-impact.ts` (el) | «1 νοικοκυριό είναι πολύ ελλιπώς **γνωστά**» — plural adjective over the number-neutral «είναι» |

`11ec4987` — the commit this run is based on — fixed this class and its message says *"found on
production, not in the fixtures."* It was still shipping in five places.

The guard **partially evaluates each template at n = 1** and runs agreement markers on the
**rendered clause**, segment-windowed at clause boundaries. It tests output, not source, which is
why the no-ternary case (`advisory-impact`) was findable at all. Its blind spots are documented in
its own header rather than silently claimed.

**Proven by me:** restoring plural verbs on the singular branch turned it red quoting the exact
rendered string — `"1 περιοχή που αφορούν όλο το νοικοκυριό παραμένουν ανοιχτές."` Reverted → 11/11.

### The guilt register: an honest refusal — see D-023
Declared not reliably automatable, with reasoning. Behavioural pins plus four tombstones shipped
instead, claiming exactly what they cover. That is a better outcome than a lexicon guard that would
pass forever while implying coverage of the class.

**Greek freeze:** 8 entries, every one accounted for — two moral clauses dropped, three singular
branches split out, and a comment relocated out of a frozen initializer so the entry stays pure copy.
Zero occurrences of the four tombstoned phrases remain.


---

## P1-10 — Adversarial review: **PASS**, and it corrected my premise

`mapPolicyCardStatus` is deleted; `/agent` adopts the wallet's contract. Every old state has an
explicit home, and three things fell out that the brief did not anticipate:

| old state | new home |
|---|---|
| `action_needed` (days < 0) | **`expired`** — the briefed defect |
| `action_needed` (stored cancelled) | **`cancelled`** — regains its own state, «ΑΚΥΡΩΜΕΝΟ» |
| `incomplete` | **never produced** — declared in the type, no code path returned it. Dead vocabulary |
| exactly 30 days | was `active`, now `expiring_soon` — the canonical ≤30 window wins. Boundary change, stated |

**It corrected my premise (D-024).** I claimed one policy reads «Χρειάζεται προσοχή» on Σύμβουλος and
«Έληξε» on Πορτοφόλι. Nothing on `/agent` renders a per-policy status — `AgentClient` takes
`policies` and never reads it. The defect was **latent in the serialized contract**, not visible.
Still worth fixing: the contract was wrong and the second pipeline was the drift hazard. But the
symptom I described did not exist, and «Έληξε» is not in the vocabulary — it renders «ΛΗΓΜΕΝΟ».

**Guard: new file, and the §11.1 call is argued rather than assumed.**
`live-policy-status-filter.test.ts` guards which *rows* a query admits; this guards which *words* a
surface may mint — different universe, matcher and exemption semantics. It is the sibling of
`gap-severity-display-single-source.test.ts`, which is the right precedent.

**Proven by me:** a brand-new file reviving the deleted pipeline — day arithmetic plus minted status
literals — turned it red naming that file. Reverted → 8/8.

**Its first enumeration found two DEBT items and correctly cleared two non-offenders:**
`ClientPoliciesTab.tsx` (§12.4, hand-rolled labels but a lifecycle-derived key — vocabulary
duplication, not a truth defect) and `branches/[branch]/page.tsx` (compliant derivation, duplicated
i18n bridge). Cleared: a DSR export status and Green Card validity — a document fact the lifecycle
does not model.

**No B2C surface derives a policy lifecycle status independently any more.**


---

## P1-14 — Adversarial review: **PASS**. 298 strings nobody had ever reviewed.

The freeze gained a third source: **298 ternary entries across 45 files** (7 under `app/`, 38 under
`lib/`). Diff verified clean — 307 insertions, 298 of them `ternary` lines, and **zero** bundle or
inline lines changed.

### The discriminator is elegant and needs no allowlist
A branch freezes iff **any literal under it decodes to text containing a Greek codepoint**
(U+0370–03FF, U+1F00–1FFF). The condition is never inspected — so `lang === "el"`, `isEl`, `isGreek`
and reversed `=== "en"` polarity are all covered, while **locale codes are ASCII and fall out
naturally.** No allowlist means nothing to silence later, which is what would have killed this guard.

Two branch kinds skipped, both correct: a branch that is itself a conditional (chains freeze as
leaves, not mega-entries) and a branch that is exactly an `{el, en}` pair (already an inline entry —
cross-checked against the inline extractor from the same fixture).

Failure proofs at **artifact level** in both directions: an added Greek ternary appears in the diff
as its own inventory line; a deleted one produces a double red — the missing line *and* a reach pin.

### The point of the item was the unreviewed copy, and it delivered

**BROKEN — escalated as H-008.** The day-30 churn email says «σας δωρίζουμε 500 δωρεάν AI credits»
and «AI Credits προστέθηκαν στον λογαριασμό σας», and the service grants nothing. Verified: zero
balance writes; the only write is the notification repeating the claim. The code's own comment —
*"integrate with actual billing/token system"* — admits the integration was never built. The cron is
scheduled **daily in production**.

**Dead copy:** `lib/mail-templates.ts` exports a `templates` map that **no file imports** — 16 of the
frozen entries are unreachable, including a PAYMENT_SUCCESS invoice link to a seed-only table.

**Flagged, not acted on:** the day-60 email asserts «Η κάλυψή σας μπορεί να κινδυνεύει» from
*inactivity alone*, with no check behind it — the mirror image of the all-clear-honesty rule, and a
§2.10 candidate for Phase 3.

**Frozen, not edited, per the brief:** `health-score.ts`'s «Καλή» / «Μέτρια» / «Χρειάζεται προσοχή» —
a verdict vocabulary on a score, agent-side and therefore §12.4. Pinned at exactly 3 entries with a
comment naming the invariant, so extending it now requires a deliberate regeneration.


---

## P1-08 — Adversarial review: **PASS**. The audit found 7 defects; the guard found 12.

### The modal fix has two halves, and I only asked for one

- **Paint order:** scrim `z-40` → `z-[45]`, above every `z-40` chrome sibling regardless of DOM
  order, below the drawer's `z-50`. This also covers **`InstallPrompt`**, which painted over the
  scrim by the same mechanics — the audit named only the nav.
- **Reachability:** `inert={sidebarOpen || undefined}` on the header **and** the bottom nav. As the
  code comment puts it: *the scrim only covers pointers — `inert` is what removes the tab targets
  from focus and the accessibility tree.* That is what makes `aria-modal` true rather than
  aspirational, and I had not asked for it.

**Proven by me, both halves separately:** reverting the scrim className to `z-40` turns **2** tests
red (policyholder and agent shells); removing both `inert` guards turns a third red. Reverted → 20/20.

### Five defects the audit missed
`MainNav` help link ~36px · `InstallPrompt` CTA `h-9` · `RoleSwitcher` menu items ~40px and an
unfloored trigger · the scrim not covering `InstallPrompt` · and **`MainNav` rows that were 44px only
by coincidence** — `py-3` plus line-height, now an explicit `min-h-11` so a type change cannot
silently sink them. That last one is the useful kind: not a defect today, a defect waiting for an
unrelated edit.

### `InstallPrompt` now rides the nav's own variable
`bottom-[calc(var(--pw-bottom-nav-h,5rem)+env(safe-area-inset-bottom,0px)+0.75rem)]` — coupled to the
same variable the nav sizes itself from, so the two cannot drift apart again. −14px overlap → +16px
clear on a notched device.

### `NotificationBell` was genuinely unreachable
Verified properly before deletion: `UserMenu` is rendered once (`AppShell.tsx:348`), never with
`compact`; the only consumer of `@/components/shell` imports `AppShell` alone. Branch, prop and
import deleted. `NotificationBell.tsx` itself now has **zero production call sites** — flagged, not
removed, since it is outside the boundary.

### Boundary extensions, each forced and named
`components/ThemeToggle.tsx` — **my brief had the wrong path**; `components/ui/ThemeToggle.tsx` does
not exist. And `ThemeToggle` now takes a **required `ariaLabel`** because it renders on public routes
where `useLanguage().t` deliberately throws — a real constraint found only in implementation.

**Greek freeze:** one addition, `userMenu.toggleTheme "Εναλλαγή θέματος"`. No edits, no deletions.

### Reviewer's own error, eighth of its kind
My first probe replaced `z-[45]` in a **comment** rather than the `className` — my `s2 != s`
assertion passed because a comment changed, and I briefly read a correct guard as having a gap. The
rule I keep relearning: assert the **behavioural token** changed, not that the file did.

## Phase 1, the three items the §6 diff surfaced (D-025)

| id | § | item | state |
|---|---|---|---|
| **V2-P1-11** | 6.7 | count consistency — instrument, then reconcile or label | in flight |
| **V2-P1-12** | — | H-008: the credit grant nothing granted | **shipped** `0e62dc45` |
| **V2-P1-13** | 6.9 | severity guard universe — extend the walk to `lib/` | in flight |

V2-P1-12 was not on the §6 list. It came out of H-008 and shipped ahead of the halt's commercial half
because CLAUDE.md prohibits publishing a claim the code does not support *regardless of instruction*,
and this one was going out daily. See `HALTS.md`.

### V2-P1-14 (§6.12 layout integrity) — queued, not yet dispatched

**The harness has never asked whether the page scrolls sideways.** `captureSurface` records scroll
*height* and, via `truncationFailures`, element-level overflow (`el.scrollWidth > el.clientWidth`,
the widened successor to `clippedLabels`). Nothing anywhere compares
`document.documentElement.scrollWidth` against the viewport width. Across ~190 captures at 320/390/430
the one question §6.12 exists to ask has not been asked.

That matters more here than it would elsewhere, because `app/globals.css` carries a **deliberate
safety net** for exactly this failure — `:where(.grid, .flex) > * { min-width: 0 }` below 430px, added
so a long Greek compound cannot push the page sideways — and `.pw-scroll-strip` exists because that
net, applied to a strip that is *meant* to scroll, removes the floor that makes it scroll. Both are
load-bearing and neither has a page-level assertion behind it.

**Item:** add a document-level horizontal-overflow probe to `metrics.ts`, wire it into
`captureSurface` so every future capture carries it, re-measure the baselines at 320, and fix what it
finds. Held until V2-P1-11 lands — that agent may also be extending the harness, and `metrics.ts` is
the one file both items would touch (D-026).

### V2-P1-14 gains a second half: §6.14 tap targets, pending re-measurement

Aggregating `tapTargets` across all **212** captures that carry the field: **129 clean, 83 with
offenders**, 1,277 offender instances — 1,110 `button`, 137 `input`, 30 `a`. The dominant shape is
**36×44**: the height already clears the 44px floor and the **width** is 8px short, repeated across a
comparison table's per-policy actions («Κατανόηση ασφαλιστηρίου», «Έγγραφα», «Κοινοποίηση σε
σύμβουλο»). That is one component repeated down a list, not 88 independent defects, so it is a
primitive-level fix — cheap, and high leverage.

**Not queued as work yet, deliberately.** Those captures are dated **2026-08-23** and live in
`data/current/`, which is the directory D-012 caught holding pre-Goal-2 numbers. HEAD is two days and
several commits past them, P1-08 among those. Acting on them would repeat D-012 exactly.

So V2-P1-14 becomes one measurement pass with two outputs: add the page-level horizontal-overflow
probe, re-measure the affected surfaces at 320/390/430, and take the tap-target numbers from that run
rather than from August 23. Whatever survives re-measurement is the §6.14 fix list.

**Not a defect, checked and dismissed:** `threshold.protectionScoreLowBand` survives in
`/admin/automation` after the protection score was removed from the product. It reads as a dead knob
and is not one — `decision-engine.ts:322` uses it to open an **advisor task**, a book-management
signal, never a customer render. The code says so at the branch. Admin is also outside §12.4's B2C
scope. No action.

### V2-P1-13 (§6.9) — severity guard universe. Done, after review found the guard's own hole.

The agent's substance was right and the two hits were real customer surfaces, both invisible to a
guard that walked only `app` and `components`:

- **`lib/services/reports/savings-report.ts`** — the Pro downloadable / agent-branded report, which is
  literally the "printable report with a red CRITICAL badge" the primitive's own doc comment names.
  Its local `{el,en}` map is gone; the badge resolves `describeSeverity().labelKey` and the gaps
  section carries the caveat sentence.
- **`lib/email/templates/weekly-digest.ts`** — outbound, D-005's exact worry. Colour-only, so no
  caveat is owed, but its map was severity-keyed; it is now keyed by the primitive's `tone`, and junk
  urgency normalises to moderate instead of a call-site grey.

`lib/wallet/gap-report.ts` was checked and is clean — it holds only `GAP_SEVERITY_RANK`, ordering,
never a word or a colour. **`KNOWN_BYPASSES` stayed at 9.** Both offenders were fixed, not listed.

**Review found a hole in the guard itself — see D-027.** Its escape hatch was
`source.includes("severity-display")`, so any file could leave the guard's universe by importing the
primitive or naming it in a comment. Rebuilt: path-based exemptions for the primitive and
`severity-tone.ts`, the map matcher always applies, and the colour matcher is excused only by an
actual `describeSeverity(` call. The decision is now an extracted `isSeverityOffender()` with six
probes; the old line reinstated turns exactly two red.

Also closed a vacuity hole the agent left: `SEVERITY_CAVEAT_KEY` was asserted to be a *string*, not a
non-empty one — and `toContain("")` is true of every document, so an empty caveat would have
satisfied both that check and the report's caveat assertion. Emptying `recPriorityNote` now turns the
guard red; before, it did not. **12 → 26 tests.**

### V2-P1-14 half 1 (§6.12) — the page-overflow probe exists and is proven

`pageOverflow()` in `tests/measure/metrics.ts`, wired into `captureSurface` so every future capture
carries it. Committed self-test `tests/measure/page-overflow-probe.spec.ts`, 3 cases, all passing:
a clean page reports 0 **non-vacuously** (`documentScrollWidth > 0`); a 2000px element is detected and
named; and an `overflow-x:auto` strip with a 2000px child is **correctly not flagged** — the strip
scrolls, the page does not, which is the whole distinction `.pw-scroll-strip` exists to preserve.

First real numbers: **`/timeline` is clean at 320/390/430** (`overflow=0px`).

**Harness note:** the `measure` projects depend on `setup`, which re-runs UI login and dies when the
bundled Playwright browser is absent — the normal state here, since everything runs on system Chrome.
Run with `--no-deps` and reuse `playwright/.auth/*.json`. Saved to memory.

### V2-P1-14 — first results, and two contrast defects found by arithmetic

**Page-level overflow: clean.** 51 captures across 17 surfaces (settings subtree, notifications,
timeline, benefits, help, upgrade, wallet-add landing, risk-profile) — **0px on every one**. The
`min-width: 0` safety net holds where it has been measured. Still unmeasured: dashboard, wallet,
policy-detail, branches, coverage-insights, overlays — all just rewritten by V2-P1-11, so they need a
fresh pass. **Caveat on these captures:** they were taken while V2-P1-11 was mid-edit, so their
count/duplicate-fact numbers are not trustworthy. The overflow figure is what is claimed here.

**Two WCAG 1.4.3 failures fixed**, one found by the browser and one by arithmetic:

1. **The delete-policy dialog.** «Η ενέργεια είναι οριστική» — the sentence saying the deletion cannot
   be undone — rendered at **3.12:1** in `text-red-100` on `bg-red-500`. The instructive part: **no
   foreground fixes it.** On `bg-red-500` even pure white is 3.81:1. The background was the defect,
   and the heading above it passed only because bold 20px counts as large text. Now `bg-red-600` with
   white, 4.77:1.
2. **The `/agent` count badge.** `bg-amber-500` + `text-white` = **2.14:1**, failing even the lenient
   3:1 large-text floor, on `text-kicker` — the smallest text on the page. Now `amber-700`, 5.03:1.

**The harness measures contrast and nothing gates on it** — six failures were sitting in the evidence
files. `tests/unit/solid-panel-contrast.test.ts` is the cheap arithmetic half: any element naming a
background AND a foreground in one class list is checkable without a browser. It found four pairs the
browser had never navigated to. Its palette **fails loudly on an unknown colour** rather than skipping
it, and that check is a test rather than a module throw, because a throw makes vitest report "no
tests" — which reads like a pass.

What it cannot see is an inherited background, which is exactly how the delete dialog looked in
source. That case belongs to the harness's `contrastFailures`. Two halves, neither sufficient alone.

**Out of scope, recorded not fixed (§12.4):** six agent/admin surfaces carry the same failing pairs.
The guard asserts they still fail, so the exemption set cannot outlive the defects and quietly excuse
a new one. `NotificationBell` is exempt only while nothing imports it — asserted, not assumed.

# Phase 2 — §4.2 IA consolidation

**Target: 5 tabs + a bell.** Ten policyholder menu items today
(`/dashboard`, `/wallet`, `/branches`, `/insights/risk-profile`, `/coverage-insights`, `/timeline`,
`/benefits`, `/agent`, `/account`, `/notifications`).

| tab | route | absorbs |
|---|---|---|
| Αρχική | `/dashboard` | — |
| Ο φάκελός μου | `/wallet` | — |
| **Η προστασία μου** | **`/protection`** (new) | `/branches` (*ανά κλάδο* lens), `/insights/risk-profile` (*ανά κίνδυνο* lens), `/coverage-insights` |
| Ο σύμβουλός μου | `/agent` | — |
| Ρυθμίσεις | `/account` | `/timeline` → activity history; `/benefits` stays a link from here |
| *(bell)* | `/notifications` | — |

**Four routes removed outright** — the owner chose removal over redirects. Verified in Phase 0: none
is in `app/sitemap.ts`, none is in `proxy.ts`'s public allowlist, none is referenced from
`app/(public)`, `lib/guides` or `lib/glossary`, so §12.1.7's halt condition is not met.

### Ordering — build before remove, always

- **V2-P2-01** build `/protection`, both lenses, old routes still alive. Must preserve
  **B-01…B-06, R-01…R-08, A-05…A-09** from `LEDGER.md`.
- **V2-P2-02** relocate the timeline into Ρυθμίσεις. **T-02** (filter) and **T-03** (cause link) must
  survive or the move is a loss — T-03 especially, it is the only thing here the wallet cannot
  already tell you. **T-06** (18 of 60 rows sharing one title) is fixed by grouping during the move.
- **V2-P2-03** nav → 5 + bell; delete the four routes; `proxy.ts` lines 56 and 70 go with them.
- **V2-P2-04** verify every ledger row against the new IA; re-measure; refresh the counts.

### Decided under standing authority: B-06, the `business` line

`/branches` renders a **business** line to consumers because `contentTier: 'rich'` carries no B2C/B2B
filter. The ledger deferred it as "needs a product decision, not a fix".

**Decision: show the line only when the customer holds a policy in it.** Hiding it outright would
remove a real capability from anyone who does hold business cover; showing it to everyone is noise on
a consumer surface. Conditioning on ownership keeps the capability exactly where it means something
and is reversible in one predicate. Logged rather than escalated, per the standing rule to choose the
reversible option and keep going.

### V2-P2-03 prep — 62 sites, and one premise I got wrong in Phase 0

| route | → | sites |
|---|---|---|
| `/coverage-insights` | `/protection` | **47** |
| `/branches` | `/protection` / `/protection/[branch]` | 6 |
| `/timeline` | `/account/history` | 5 |
| `/insights/risk-profile` | `/protection?lens=risk` | 4 |

The `/coverage-insights` count is dominated by **18 `lib/insurance/content/*.ts` branch-action links**
plus 4 in `lib/services/timeline/build.ts`, 3 `revalidatePath` calls, the nav, the bottom nav, five
dashboard widgets, `InstallPrompt`'s route list, `api-docs`, and
`lib/notifications/links.ts:75`. `app/(protected)/coverage/page.tsx` redirects to it and is a **KEEP**
row — repoint it, do not delete it.

**The premise correction.** When the owner chose removal over redirects, I supported it with "no
external links or bookmarks exist to break", having checked `app/sitemap.ts`, the `proxy.ts` public
allowlist, `app/(public)`, `lib/guides` and `lib/glossary`. I did not consider **already-delivered
email**: `buildNotificationEmail` bakes an absolute URL, and `notificationActionPath` returns
`/coverage-insights` for every `recommendation` notification. Those links live in inboxes, where no
code change can reach them.

It happens not to matter — CLAUDE.md records that zero real users exist and every account belongs to
the owner, so no such email is in anyone's inbox. But the reasoning I gave at the time was incomplete,
and the general rule is worth keeping: **a delivered email is an external reference to a route.** The
link itself is computed at render, not stored on the row, so changing that one line is enough for
everything not yet sent.

### Findings from browser-checking the new surfaces (2026-08-25)

The agents' guards render components in jsdom. Loading the real routes in Chrome with a live session
found three things their tests could not:

1. **React key warning on the risk lens — PRE-EXISTING, not a Phase 2 regression.** The exact
   diagnostic, which nobody had before: *"Check the render method of `RiskIntelligenceView`. It was
   passed a child from `ProtectionRiskLens`."* `/insights/risk-profile` emits the identical warning,
   so `/protection` inherited it. All five `.map()` calls in `RiskIntelligenceView` carry keys and
   `graphPanel` is a single element rendered directly at :259, so the array is somewhere less
   obvious — note the file has **two** `return (` statements, at :149 and :366. Not chased further:
   it is a dev-mode warning on a surface Phase 2 is rebuilding anyway. Real, though — a keyless list
   misapplies child state across a reorder or a filter, and this list is filterable (R-07).
2. **`/insights/risk-profile` renders an empty `<h1>`.** Resolves by deletion; `/protection` has a
   real one («Η προστασία μου»).
3. **Auth state expires mid-session.** `playwright/.auth/*.json` silently stops working and every
   route renders the sign-in page at **HTTP 200** — so a naive check reads as "route fine, content
   thin". Diagnosed by checking a known-good route (`/wallet`) rather than trusting the new ones.
   Refresh with `--project=setup` and the system-Chrome env var. Worth knowing before anyone reads a
   measurement run that quietly captured 17 sign-in pages.

**Verified good, at 320px with a live session:** `/protection` (h1 «Η προστασία μου», 4 counts, 5,478
chars), `/protection?lens=risk` (15 counts, 9 facts, 6,365 chars), `/account/history` (h1 «Ιστορικό
δραστηριότητας», 8 counts, 3 facts, 6,430 chars). **All three: 0px page overflow.**

### Full re-measure, 2026-08-25 — 513 captures, two failures

**Truncation restated.** 572 across the evidence set, against the **729** that justified deferring
§6.11 — and the corrected files are the ones that fell. **Page overflow: 0 of 174 captures.**

**Failure 1 — `/coverage` did not redirect. Real, and fixed.** It answered **200 with
`NEXT_REDIRECT` serialised into the body**: the customer got the app shell with an empty content area
instead of arriving at «Η προστασία μου». `proxy.ts:332` already carried the explanation, written by
whoever last hit this — *"a page-level redirect streams inside the RSC payload as a 200"* — and had
solved it for `/home` by owning that path in the proxy. `/coverage` was left as a page-level
`redirect()` and had exactly the documented bug. `/home` passing is what hid it: the proxy answered
before the page ever ran, so the one legacy redirect that was broken looked like the healthy one.
Now proxy-owned; verified `307 → /protection`.

Two fixes came out of it, both kept:
- `proxy.ts` owns `/coverage`, matching `/home`.
- `RouteError` **re-throws framework control flow** (`NEXT_REDIRECT` / `NEXT_NOT_FOUND` by digest)
  instead of rendering it. All **26** boundaries sharing it were turning a redirect into «Κάτι πήγε
  στραβά», and reporting it to Sentry as an incident. That is a separate defect from the RSC-payload
  one and would have outlived it.

**Failure 2 — `policy-detail-goal2`: 10 sections against a ≤8 budget. UNRESOLVED, not fixed.**
The reported list is six anchored sections plus a header, a button, and «Το ασφαλιστήριό σας σε απλά
ελληνικά» **twice**. `SummaryCard` is rendered once, at `PolicyDetailsClientView.tsx:824`, so the
duplicate is more likely `sectionCount` counting a wrapper and its child than the page rendering
twice — but I could not confirm it against the live DOM and **am not claiming it is an artifact**.
Not on the CI path, does not gate the deploy. Needs the section detector checked for nested matches
before anyone edits the page on the strength of this number.


## P5-wallet-00 — the measurement the reframe is gated on · `in flight`

owner: Evidence (Sonnet 5) · phase 5 · surface: wallet
file_boundary: `tests/measure/**`, `docs/transformation/evidence/wallet/**`

**duplicate-identity-row count.** For each rendered wallet row, concatenate the visible text of its
identity fields — **insurer, line, date, status** — and count rows whose identity string is
byte-identical to at least one other row's. Report the **raw count** and the **size of the largest
identical group**. Target after the reframe: **0**.

The policy number is deliberately excluded. It is the disambiguator, so including it would make every
row unique and measure nothing. The question is whether the fields a customer actually scans tell one
row from another.

- [ ] metric in the **shared harness module, imported not copied** — baseline and result must use one
      definition, or the after-number is not comparable to the before-number
- [ ] heavy (29), typical (3), all-expired · 320/390/430
- [ ] `BASELINE.md` publishes raw count and largest-group size per capture, **and how each of the four
      fields was located** — an undocumented extraction cannot be reproduced after the reframe, which
      is the one thing this measurement exists to allow
- [ ] reported to the Orchestrator

**This closes the gap `ASSET-REFRAME-SPEC.md` §5 left open.** That spec removed the ledger's gate but
refused to argue the case: the wallet renders 29 policies as 29 rows and "hard to scan" was not on
the measured defect list. This turns that into a number. **The asset reframe stays blocked until it
lands** — and if the count is low, the reframe's premise is wrong and the phase should say so rather
than build anyway.
