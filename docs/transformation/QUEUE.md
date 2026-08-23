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

### T-015 — Baseline every surface · `todo` — THE ONLY THING LEFT BEFORE THE PHASE 0 GATE
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

### P1-01 — Score leaves every outbound channel · `todo`
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

### P1-02 — No all-clear in outbound where the check never ran · `todo`
owner: Implementation (Fable 5) · blocked_by: P1-01
file_boundary: `lib/services/gap-engine/protection-score.ts`, `lib/email/templates/engagement-drip.ts`, `tests/unit/all-clear-honesty.test.ts`

- [ ] `provisionalProtectionScore`'s "nothing to score" predicate becomes "nothing **analysed**",
      not `policyCount === 0` (D-006 — basis, in scope; arithmetic untouched)
- [ ] blast radius enumerated first: `engagement-drip.service.ts`, `weekly-digest.service.ts`,
      `tests/unit/email-content-honesty.test.ts` assert current null-behaviour and change together
- [ ] `engagement-drip.ts:123` green/amber gap tile gains a **text** equivalent (WCAG 1.4.1) and
      must not render green for "0 gaps" when nothing was analysed
- [ ] `all-clear-honesty.test.ts` universe extended to outbound templates

### P1-03 — One definition of "policies this person has" · `todo`
owner: Implementation (Fable 5)
file_boundary: `lib/services/engagement-drip.service.ts`, `lib/services/engagement-scoring.ts`,
`lib/services/weekly-digest.service.ts`, `tests/unit/`

- [ ] `engagement-drip.service.ts:152` and `engagement-scoring.ts:167` adopt
      `status: { notIn: [...NON_LIVE_POLICY_STATUSES] }`
- [ ] `weekly-digest.service.ts:166` gains the same filter (currently none — counts deleted rows)
- [ ] new guard: **no Policy query filters on a bare `status: "active"`**, universe = `lib/` + `app/`,
      enumerated from the filesystem. Demonstrated failing first.

### P1-04 — One event, one row · `todo`
owner: Implementation (Fable 5) · blocked_by: T-012 (needs the keyed+unkeyed fixture)
file_boundary: `app/(protected)/notifications/actions.ts`, `components/notifications/**`

- [ ] group on the base `dedupeKey` with the `:${channel}` suffix stripped (D-002)
- [ ] rows with no `dedupeKey` render ungrouped — never merged on a heuristic (§12.2)
- [ ] channel chips removed from the customer-facing list entirely
- [ ] **rewrite the comment at `actions.ts:15-21`**, which currently argues the opposite and will
      otherwise justify reverting this
- [ ] reconcile with the second consumer at `actions.ts:140-144`, which filters `channel: "in_app"`

### P1-05 — English internal prose cannot reach a customer · `todo`
owner: Implementation (Fable 5)
file_boundary: `lib/events/catalog.ts`, `lib/notifications/registry.ts`, `app/(protected)/activity/actions.ts`

- [ ] the per-event-type map at `activity/actions.ts:131-146` is **derived from the registry**, not
      hand-written for `policy_analyzed` alone with a raw-text fallback
- [ ] English documentation prose stops being written into customer-visible columns at composition
      time
- [ ] locale-purity guard extended to stored notification rows, not only rendered DOM

### P1-06 — Delete the dead verdict keys, and freeze the UNION · `todo`
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

### P1-07 — Identity values never render raw · `todo`
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

### P1-09 — Notification preferences control every channel, not just email · `todo`
owner: Implementation (Fable 5) · file_boundary: `components/settings/sections/NotificationsSection.tsx`, `app/(protected)/account/actions.ts`

`NotificationsSection.tsx:44,66` reads and writes `channel === "email"` only, while `push` is an
implemented channel. A customer who switches a group off turns off email and leaves push on, and
nothing says so.
- [ ] the toggle governs every implemented channel, or the label states which channel it governs
- [ ] guard: no preference UI may write a single hardcoded channel

**Phase 4 precondition (not Phase 1):** §9.5 also needs a user-configurable monthly ceiling and a
global off switch honoured in outbound. Neither exists. Phase 4 cannot ship a cadence-controlled
mechanic until they do — recorded here so the dependency is not discovered during Phase 4.

### P1-10 — One status vocabulary across every B2C surface · `todo`
owner: Implementation (Fable 5) · file_boundary: `app/(protected)/agent/page.tsx`, `lib/wallet/map-policy-card-status.ts`

- [ ] `/agent` adopts `getPolicyStatusView`; **delete** `mapPolicyCardStatus` rather than adding
      `expired` to it — two pipelines that agree today drift again, which is the history that file
      already records
- [ ] guard: no B2C surface derives a policy status outside `getPolicyStatusView` /
      `resolvePolicyLifecycle`. Universe = `app/` + `components/`, enumerated from the filesystem
- [ ] ledger row: no status state is lost in the migration — `action_needed` currently absorbs
      `expired`, so the mapping is one-to-many and must be written out

### P1-11 — Every placeholder form is detected, from one list · `todo`
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
