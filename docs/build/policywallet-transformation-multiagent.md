# PolicyWallet — Mobile Transformation Run (Goal-Series, Autonomous Loop)

**Run id:** `PW-MOBILE-TRANSFORM-01`
**Branch:** `NEW-UI` — all work commits here. Never `main`, never a new branch, never a force-push.
**Locale under test:** `el` (Greek is the product language; this document, all code, all commits, and all agent-written docs are in English)
**Widths:** 320 / 390 / 430 CSS px. 320 is the design target, not the edge case.
**Scope:** the entire authenticated **B2C** surface — every route reachable from the main menu, the bottom tab bar, and every subpage beneath them. The surface list is **discovered by route enumeration in Phase 0, not assumed** (§4). No B2C route is out of scope unless it appears in the out-of-scope list in §12.
**Out of scope entirely:** the public marketing site, the B2B/agent dashboard, and everything listed in §12.

**Working directory for run state:** `docs/transformation/`

---

## §0. Run contract — autonomy, loop, modes, models

### 0.1 What this run is

This is a **continuous autonomous loop**, not a conversation. You are expected to run for hours without a human in the loop. You buy that autonomy by replacing human review gates with machine gates: measurement output, CI guards, and an adversarial reviewer model. You do not buy the right to decide the three questions in §12.

Two prior supervised runs on this codebase shipped partial goals and introduced regressions — a protection score removed from one surface reappeared in outbound email, four new broken Greek strings landed in a section that had previously read cleanly, and a count contradiction appeared between two cards that had previously agreed. Every gate in this document exists because of an observed failure. None of them is ceremony. Do not optimise them away.

### 0.2 The loop

Execute this cycle continuously until the queue is empty or a halt condition fires:

1. **Read state from disk.** `QUEUE.md`, `DECISIONS.md`, `HALTS.md`, `LEDGER.md`, `PROGRESS.md`. Never rely on conversational memory for run state.
2. **Select** the highest-priority queue item whose `blocked_by` list is empty and whose phase is currently open.
3. **Switch mode and model** for that item's role, per §0.4 and §0.5. Do this yourself. Do not ask.
4. **Execute** the item to its written acceptance criteria.
5. **Measure.** Run the harness on the affected surfaces and fixture states. Record before/after.
6. **Adversarial review.** Switch to the reviewer role and red-team the change against §2 and against the "fixed here, broke there" class specifically. A change that relocates a defect fails.
7. **Resolve:** if review passes and CI is green → commit with the item id in the message, mark `done`, append to `PROGRESS.md`. If review fails → mark `requeued`, append the reason, return to step 2. Never commit red CI. Never commit a partially completed item.
8. **Checkpoint** every 5 completed items: append a state summary to `PROGRESS.md` sufficient for a cold restart.
9. **Repeat from step 1.**

Do not stop to report progress. Do not ask whether to continue. Do not summarise and wait. The loop continues until the queue empties, a phase gate blocks, or §12 fires.

### 0.3 Resumability — assume you will be restarted

Your context window will exhaust before this run completes. Design for that from the first minute.

- **Everything needed to resume lives on disk.** If a fact is only in your context, it does not exist.
- `QUEUE.md` is the single source of truth for what remains. Update it *before* starting an item, not after finishing it, so a mid-item crash leaves an accurate record.
- Write `PROGRESS.md` as a **cold-start document**: a fresh agent with no history must be able to read it plus `QUEUE.md` and resume correctly without re-deriving anything.
- On restart: read `PROGRESS.md`, `QUEUE.md`, `DECISIONS.md`, `HALTS.md` in that order, then re-enter the loop at step 2. Do not re-run completed work. Do not re-litigate anything in `DECISIONS.md`.

### 0.4 Automatic mode switching — change your own permission mode

Change permission mode yourself at every role transition. Announce the switch in one line in `PROGRESS.md`; do not ask the human for approval mid-run.

| Phase / role | Mode | Rationale |
|---|---|---|
| Phase 0 evidence, all planning, all spec authoring, all adversarial review | **Plan mode** (read-only) | These phases must not write product code. Plan mode makes that structural rather than aspirational. |
| Implementation items inside an open phase, within the item's declared file boundary | **Accept edits** (auto-accept) | This is what makes hours of unsupervised throughput possible. |
| Harness runs, measurement passes, fixture provisioning, CI guard authoring | **Accept edits**, scoped to `tests/`, `docs/`, fixtures | Never touches product code. |
| Anything touching migrations, production config, secrets, auth, consent surfaces, or `lib/gap-detection.ts` | **Never auto-accept. Halt instead.** | §12. |

If the environment requires a one-time human approval to enable auto-accept, request it **once, at run start, before Phase 0**, and state exactly which directories it covers. Do not request escalation again mid-run; if you need it, that is a halt.

### 0.5 Automatic model switching — change your own model per role

Switch models yourself. Announce each switch in `PROGRESS.md` with the item id.

| Role | Model | Why |
|---|---|---|
| **Orchestrator** — owns the queue, adjudicates conflicts, decides halts | **Opus 5** | Judgement work. Writes no product code, ever. |
| **Product-Truth** — holds the PM lens (§7) and the regulatory invariants (§2); **has veto** | **Opus 5** | Cannot be overruled by the Orchestrator. A veto that implementation cannot satisfy is a halt. |
| **Adversarial Reviewer** — red-teams every completed item before merge | **Opus 5** | Must be a different model instance from the one that wrote the code. Never review your own implementation in the same role. |
| **Spec authoring** — Phase 2, Phase 3, Phase 4 designs | **Opus 5** | Do not delegate specification to an implementation model. |
| **Implementation** — product code within one surface boundary | **Fable 5** | Volume. |
| **Design-System** — sole owner of shared primitives and tokens | **Fable 5** | Volume, single owner. |
| **Guard authoring** — CI guards | **Fable 5** | Volume. |
| **Measurement harness runs, fixture maintenance, mechanical sweeps** (string inventories, route enumeration, diff passes) | **Sonnet 5** | Cheap, repetitive, deterministic. |
| **Pure mechanical passes** (file listing, grep sweeps, inventory diffs with no judgement) | **Haiku 4.5** | Cheapest tier that can do the job. |

**Conflict rule:** when an Opus 5 role and a Fable 5 role disagree on whether an invariant is satisfied, the Opus role wins, the item is requeued, and the disagreement is logged in `DECISIONS.md` so it is not relitigated.

**Escalation rule:** if a Fable 5 implementation item fails adversarial review twice, escalate the item to Opus 5 for implementation rather than attempting a third pass. Log the escalation.

### 0.6 Rule of atomicity

**A phase is done or it is not.** No partial phase merges. A phase that completes eight of thirteen items has completed zero. The same applies to queue items: an item ships all of its acceptance criteria or it is requeued.

This rule exists because a previous run shipped one item of a thirteen-item goal, which made the result unmeasurable and produced six regressions that went undetected.

### 0.7 Rule of evidence

**No phase is reviewed by looking at the product.** The measurement output is the review.

- If a metric was not measured on fixtures before and after, the change did not happen.
- Metric definitions are written once and reused verbatim across every pass. A definition that drifts between baseline and result makes the comparison worthless.
- Comparisons must be made on **fixtures**, never on a live dev account whose data moves between captures. A previous review compared two captures whose underlying portfolio had changed — total premium, gap counts and plan denominators all moved — making every conclusion drawn from it unattributable.
- **A fixture must be able to produce the defect.** Placeholder text reached the most prominent list on the dashboard because no fixture could generate it. Every fixture set includes degraded conditions, enumerated in §5.

### 0.8 Git discipline

- One commit per completed queue item. Message format: `[PW-MOBILE-TRANSFORM-01][<item-id>] <what changed>`.
- Never commit with CI red. Never commit a requeued item. Never amend or force-push.
- Never commit fixture data, secrets, `.env` values, or anything under a path listed in §12.
- Tag each phase boundary: `pw-transform-phase-<n>-complete`.

### 0.9 What you may decide alone, and what you may not

**Decide alone:** implementation approach within an item's boundary; component structure; naming; test structure; how to satisfy a written acceptance criterion; requeue-vs-escalate; ordering of unblocked items within a phase.

**Never decide alone — halt and write to `HALTS.md`:** anything in §12. In particular: whether the protection score should exist; which events warrant an outbound message; where market context becomes regulated advice; any schema migration; any change to gap detection, severity values, consent, privacy, or legal surfaces.

When you halt, write the question the human must answer, the options with your recommendation, and the evidence behind it. Then continue with any queue items that are not blocked by that halt. **A halt blocks an item, not the run** — unless §12 marks it run-blocking.

### 0.10 Standing constraints, in force for the entire run

- `lib/gap-detection.ts` is untouched. `decideGapsForPolicy` owns `isDetected` and `severity`. No AI provider schema accepts either. Verify this at run start and again at every phase boundary; do not assume it.
- The protection score's **arithmetic** is out of scope. Its **rendering** is in scope and is a Phase 1 item.
- No real email or push is dispatched at any point. Verify the dispatch stub holds before the first test that could trigger one, and re-verify after any change to notification code.
- No production data. No production reads. No seeded production accounts. No migrations. If a defect exists in production data that dev fixtures cannot reproduce, that is a halt, not a workaround.
- No capability is removed, merged, or relocated without a row in `LEDGER.md`. This is the contract for "nothing lost".

## §1. Agent roster and per-role operating instructions

Each role below is a mode you enter, not a separate process. Enter a role by switching model and permission mode per §0.4 and §0.5, announcing the switch in `PROGRESS.md`, and reading that role's instructions before acting. Never hold two roles simultaneously.

### 1.1 Orchestrator — Opus 5, plan mode

**Owns:** `QUEUE.md`, phase transitions, conflict adjudication, halt decisions.
**Writes:** queue entries, phase gates, `DECISIONS.md` entries, `HALTS.md` entries.
**Never writes:** product code, tests, fixtures, or component files. If you find yourself editing anything under `app/`, `components/`, or `lib/`, you are in the wrong role.

Responsibilities:

1. Decompose each phase into queue items with explicit acceptance criteria, file boundaries, and `blocked_by` lists. An item without written acceptance criteria may not be queued.
2. Assign each item an owner role and therefore a model. Record both in the queue entry.
3. Enforce §0.6 atomicity. When an item completes partially, requeue the whole item — never split it after the fact to make the completed part shippable.
4. Adjudicate Opus-vs-Fable disagreements per §0.5, and log every adjudication in `DECISIONS.md` with the reasoning, so the same argument is not had twice.
5. Decide when a phase gate is satisfied. Gates are listed per phase; you may not soften one.
6. Detect stalls: if the same item is requeued twice, escalate implementation to Opus 5. If it is requeued a third time, halt it and write the blocker.
7. Own the checkpoint cadence in §0.2 step 8.

You do not have veto over the Product-Truth agent. When Product-Truth vetoes an item and implementation cannot satisfy the veto, that is a halt, not an adjudication.

### 1.2 Product-Truth agent — Opus 5, plan mode

**Owns:** the PM lens (§7), the regulatory invariants (§2), and the definition of what a policyholder needs from each surface.
**Power:** **veto over any change on any surface.** A veto cannot be overruled by the Orchestrator.

Responsibilities:

1. Review every implementation item's *intent* before implementation begins, and its *result* before it merges, against §2 and §7.
2. Veto any change that: asserts an unvalidated judgement as fact; renders absence of a finding as reassurance; inverts the §7 question ordering on a surface; removes a capability without a ledger row; or introduces an engagement mechanic prohibited by §9.
3. Author the Phase 2 reordering specs and the Phase 4 engagement specs. Do not delegate these to an implementation model.
4. Kill invented metrics. Any coined term that means something plainer — «ΑΣΦΑΛΙΣΤΙΚΟ ΑΠΟΤΥΠΩΜΑ» meaning total annual premium — is renamed to the plain thing.
5. Hold the line on §9.4's prohibitions during the engagement phase, including against pressure from measured engagement improvements. Engagement metrics are not a success criterion for this run.

When you veto, write: the item id, the invariant or lens principle violated, the specific rendered output or code path that violates it, and what would satisfy you. A veto without a satisfying condition is a halt.

### 1.3 Adversarial Reviewer — Opus 5, plan mode

**Owns:** the merge gate for every completed item.
**Rule:** never review an item you implemented in this run. If you wrote it, a different role instance reviews it.

Your explicit brief is the **"fixed here, broke there"** class. The canonical example in this codebase: the protection score was removed from the dashboard hero and reappeared as a percentage in outbound email. The invariant was satisfied at one render site and violated at another, and the item was marked done.

For every item, verify:

1. **Did the fix remove the defect or relocate it?** Enumerate every render site, code path, and channel — including email and push templates — where the defect class could appear. Grep for the value, not just the component.
2. **Did the fix create a new defect?** Diff the rendered string inventory before and after. Four broken Greek strings once appeared in a section that had previously read cleanly, in a change that touched an adjacent component.
3. **Did any metric regress?** A change that improves its target metric while worsening another has failed.
4. **Is the acceptance criterion actually met, on fixtures, at all three widths, in every declared state** — including empty, all-expired, and every degraded fixture in §5?
5. **Was a capability lost?** Cross-check the diff against `LEDGER.md`.
6. **Did the guard demonstrate failing first?** A guard that has never failed is not a guard.

Write your review to the item's queue entry: pass, or fail with the specific reason and the evidence. Do not soften a fail to keep the loop moving.

### 1.4 Evidence agent — Sonnet 5, accept-edits scoped to `tests/` and `docs/`

**Owns:** the measurement harness, the fixture matrix, all baseline and result tables.
**Never writes:** product code.

Responsibilities:

1. Build **one** harness shared across every surface. Metric definitions live in a single file and are imported, never copied.
2. Maintain the fixture matrix per §5, including every degraded condition. When a defect is confirmed that no fixture can produce, building that fixture is your item and it blocks the fix.
3. Run measurement passes on demand and at every phase boundary. Publish `evidence/<surface>/BASELINE.md` and `RESULT.md`.
4. Never change a metric definition mid-run. If a definition is wrong, halt the metric, log it in `DECISIONS.md`, re-baseline every affected surface, and note the discontinuity in `PROGRESS.md`.
5. Flag any comparison whose fixtures differ between passes as invalid, and refuse to publish it.

### 1.5 Implementation agents — Fable 5, accept-edits within the item's file boundary

**Owns:** product code inside exactly one surface per item.
**May not:** edit the shared primitive or token layer, edit another surface's components, edit tests belonging to another item, or touch anything in §12.

Responsibilities:

1. Read the item's acceptance criteria, the surface's ledger rows, and `DECISIONS.md` before writing code.
2. Stay inside the declared file boundary. If the fix requires a file outside it, stop and file a queue item — do not reach across.
3. **Primitive-change protocol:** when a surface needs a shared primitive change, file it in `QUEUE.md` against the Design-System agent, mark your item `blocked_by` that id, and move on. Do not patch the primitive locally, and do not work around it with a surface-local override. This protocol exists because i18n key mapping, gap deduplication, and severity gating were each fixed page by page in this codebase and each recurred on the next surface built.
4. Instrument as you go: `data-fact`, `data-action`, `data-count` on every fact, action, and quantity you render or touch. Adding instrumentation at the end does not happen.
5. Ship the whole item or none of it.

### 1.6 Design-System agent — Fable 5, accept-edits scoped to the primitive and token layer

**Owns:** tokens, type scale, spacing, elevation, and the shared component set. **Sole writer** of that layer.

Responsibilities:

1. Serve primitive-change requests from the implementation queue, in priority order.
2. Before changing a rule, enumerate its blast radius across every surface. Two live examples: `:where(.grid, .flex) > * { min-width: 0 }` under `max-width: 430px`, which strips the min-content floor from every flex and grid child on every mobile surface; and the global `overflow-wrap: anywhere` on headings under 430px, which breaks brand names mid-word. Fix the rule and its intended callers, never the symptom.
3. Specify every state — loading, empty, partial, failed, stale — for every component. The failures in this codebase cluster in unspecified states.
4. Enforce the container nesting depth ceiling of 2 and the 44×44 minimum in the primitives themselves, so surfaces cannot violate them by default.

### 1.7 Guard agent — Fable 5, accept-edits scoped to `tests/`

**Owns:** CI guards.

Responsibilities:

1. **One guard per defect class, covering every surface.** Three parallel implementations of the same guard will drift, and the drift is how the defect returns on surface eight. When a new surface exhibits an existing defect class, extend the fixture set of the existing guard — never write a second guard.
2. **Demonstrate every guard failing before it counts as written.** Reintroduce the defect in a fixture, show the guard red, revert, show it green. Record both in the item's queue entry. A guard without this proof is not done.
3. Keep the four highest-cost classes on every commit; the rest on the branch. See §11.
4. Guards run against fixtures, including degraded ones, and against rendered outbound templates — not only against the DOM.

### 1.8 Mechanical-sweep role — Haiku 4.5, accept-edits scoped to `docs/`

Route enumeration, file listings, grep sweeps, string inventories, inventory diffs. No judgement, no code. Use this role wherever a task is deterministic and repetitive, to keep the expensive models on judgement work.

---

## §2. Invariants — violation blocks the item; repeated violation halts the run

These apply to every phase, every surface, every channel, and every role. An item that violates one fails review regardless of what else it achieved. Each is written because of an observed defect in this product, cited so no one argues it is hypothetical.

### 2.1 Gap severity is not authoritative

CoverageEnvelope severities are unvalidated placeholders pending underwriter validation. Nothing may present them as a judgement.

- No priority chips («Υψηλή / Μεσαία / Χαμηλή προτεραιότητα»), no severity colour coding, no severity-derived ordering that implies certainty without saying so, no severity in a notification title.
- Gaps render as **items for review**, in neutral treatment, with a plain-Greek qualifier attached to the group and visible without scrolling past the items it qualifies.
- Colour is never the sole carrier of severity meaning (WCAG 1.4.1).
- **Currently violated on:** the dashboard attention card, and in gap-detection notification copy across in-app, email, and push.
- Two attention items that differ only by severity chip are evidence that severity is carrying no information. Where that occurs, report it.

### 2.2 The protection score may not assert a verdict, and may not leave the product

- It renders in **at most one** sanctioned in-product location, or nowhere.
- No verdict label in any state — «Καλή κάλυψη», «Σε καλή κατάσταση», «ΕΠΑΡΚΗΣ ΑΣΦΑΛΙΣΤΙΚΗ» and equivalents are prohibited.
- It is never the largest element, never above the fold, never a gauge, never in a feed, never an activity item.
- **It never enters email, push, or any outbound channel.** Currently violated: «Η προστασία σας μειώθηκε — Το σκορ προστασίας σας πήγε από 83% σε 74%», sent by email, and «Η προστασία σας βελτιώθηκε — από 44% σε 86%». A 42-point swing between runs, pushed to a Greek policyholder's inbox, is the highest-exposure defect in the application.
- **No orphaned derivatives.** A delta, trend, or "points" value may not render unless its base is rendered or reachable in one tap from the same container, and every rendering of one derivative must agree. Currently violated: «πτώση 20 μονάδων» in a card showing no score, disagreeing with a «-9» elsewhere on the same page.
- The score's arithmetic is out of scope; its rendering is not.

### 2.3 Absence of a detected problem is never reassurance

This is the invariant to write into `CLAUDE.md` above all others. It has now produced defects on four surfaces from four different components.

- Where a check could not run, did not run, or does not cover the case, say so. Do not render a tick, a verdict, or an all-clear.
- **Currently violated:** «100 · Σε καλή κατάσταση» rendered when the analysis run failed; «71 · Σε καλή κατάσταση» on a policy 110 days expired; «Εντάξει» monitoring checks on a portfolio containing five expired and two unread policies; «Δεν εντοπίστηκαν ασφαλιστικά κενά» rendered directly beneath a failure banner.
- Zero findings because the engine could not look is not zero findings.
- Where a page body derives from an earlier successful run while a banner describes a newer failed one, state which run produced what.

### 2.4 No internal token, fixture identifier, placeholder, or untranslated string reaches a customer

- Prohibited in rendered output and in **every outbound template**: `__PENDING_EXTRACTION__`, `PENDING-<epoch>`, `E2E-*`, `ΣΥΜΒ-*` where it is a fixture artifact, raw snake_case enums (`in_app`), bare UUIDs, raw status strings, and any string marked test, sample, draft, or «δοκιμαστικό».
- **Currently violated:** `PENDING-1786738708923 (__PENDING_EXTRACTION__)` in notifications and in email; `E2E-MOT-001`; «Καλώς ήρθατε πίσω, **E2E**!» in the wallet greeting; the `in_app` channel chip; and two English notifications, «AI extraction finished and the policy is readable» / «AI extraction read the policy successfully», in a Greek-locale product.
- Content that cannot resolve does not render. An empty attention list is honest; a list of placeholders is not.
- Redaction and extraction failure must be visually and textually distinguishable. There is currently no redaction feature in the repo, which means every masked-looking value is extractor output rendered with the confidence of a real value.

### 2.5 Greek runs 20–30% longer than English, and identity fields never clip

- No fixed-width label containers. No ellipsis on a value the customer needs to act. No truncation of a legal term, a numeric term, an insurer name, or anything that identifies which policy a row is about.
- Where space is genuinely insufficient, restructure the row or wrap — never clip.
- Brand names do not break mid-word.
- Server-side string slicing at a fixed character count is prohibited on Greek content.
- **Currently violated on every surface:** «Νίκος Παπαδό…», «Εθνική Ασφαλιστικ…», «Interamerican · E2…», «ΣΥΜΒ-2025-MOT-…», «Αυτοκίν…», «Ασφαλιστήριο Υγεία - ΣΥΜ…».

### 2.6 Every counted quantity agrees across render sites, or is labelled so the difference is legible

- Instrument every quantity with `data-count="<namespace>.<key>"`.
- Where two figures are both correct but count different things, the defect is the labelling, not the arithmetic — fix the labels.
- **Currently violated:** one portfolio is described by 23 total, 13 active, 5 expired, 2 unread, 9 risk categories, 36 gaps, and 10 needing attention. 23 − 5 − 5 − 2 = 11, not 13. Separately, a header reading «2 λήγουν σύντομα» sits above a card reading «3 ασφαλιστήρια λήγουν μέσα σε 45 ημέρες».

### 2.7 One event, one row

Notification lists render events, not delivery records. A single event dispatched to two channels is one row. Delivery channel is not customer-facing information.
**Currently violated:** every notification renders twice, once with an `Email` chip and once with `in_app`, identical titles, bodies and timestamps.

### 2.8 Every notification traces to a dated real-world event

No notification whose content is an internal system event. No notification asserting a claim the engine cannot substantiate. Every outbound message must be traceable to something that happened in the world or in the customer's own data, with a date.

### 2.9 44×44 CSS px minimum interactive target, at every width

Enforced in the primitive layer. Excludes only links inside running text.

### 2.10 Container nesting depth ceiling of 2

Counted as elements with a visible boundary — non-transparent background, visible border, or box-shadow. The current card → sub-card → chip-row → chip pattern is four. Every border costs horizontal space, which is exactly what Greek at 320px does not have.

### 2.11 No dark patterns

A hard constraint on the engagement work, specified in full in §9.4. No manufactured urgency, no countdowns on non-deadlines, no streaks, no badges, no mechanic that punishes absence, no engagement metric as a success criterion for this run.

### 2.12 Nothing is lost without a ledger row

No capability may be removed, merged, or relocated without a row in `LEDGER.md` giving its destination — or an explicit `DEFERRED` with a named follow-up recorded in `STATUS.md`.


Log: every Opus-vs-Fable adjudication, every metric-definition change, every candidate defect refuted in Phase 0, and every design question resolved. This file exists because settled questions in this codebase — the Revolut integration path, the RevenueCat drop, deterministic engine ownership of `isDetected` and `severity` — were repeatedly reopened by agents who had not read the history.

### 3.5 `HALTS.md` — questions for the human
H <nn> — <one-line question>

date: <ISO>
raised_by: <role>
blocks: [<item-id>, ...] | RUN
context: <what was found, with evidence>
options: <option>: <consequence>

recommendation: <your recommendation and why>
status: <open|answered>
answer: <filled by human>


A halt blocks the listed items, not the run, unless §12 marks it run-blocking. After writing a halt, continue with any unblocked item.

### 3.6 `PROGRESS.md` — the cold-start document

Append-only, written by every role. This is what a fresh agent reads after your context exhausts. Write it for a reader with no history.

At every item completion, append: item id, role, model, mode, what changed, files touched, measurement delta, review outcome.
At every model or mode switch, append one line: item id, from → to.
At every checkpoint (§0.2 step 8) and every phase boundary, append a full state summary: phase status, items done and remaining, ledger delta, guards added with their failure proofs, halts open, metrics across every surface and portfolio state, and the next three actions.

On restart, read `PROGRESS.md`, `QUEUE.md`, `DECISIONS.md`, `HALTS.md` in that order, then re-enter the loop at step 2. Do not re-derive anything already recorded. Do not re-run completed work.

### 3.7 Parallelism

Implementation agents may run in parallel across surfaces **only after Phase 1 completes and the design system exists**. Before that, parallel work on a broken foundation multiplies rework.

When parallel, two items may not share a `file_boundary`. The Orchestrator enforces this at queue time.

### 3.8 Primitive-change protocol

Restated here because it is the protocol most likely to be bypassed under time pressure.

An implementation agent that needs a shared primitive or token change:
1. Files a queue item against the Design-System agent describing the needed change and the surfaces likely affected.
2. Marks its own item `blocked_by` that id.
3. Moves to the next unblocked item.

It does **not** patch the primitive, and does **not** work around it with a surface-local override. A surface-local override is a review failure even when it produces a correct-looking result, because per-page patching is the specific failure mode that has caused i18n key mapping, gap deduplication and severity gating to each recur on every newly built surface in this codebase.

---

## §4. B2C surface inventory — enumerate, do not assume

### 4.1 The rule

**Every authenticated B2C route is in scope unless §12 excludes it.** The surface list is produced by enumeration in Phase 0, not taken from this document. Previous audits worked from a handful of screenshots and consequently missed subpages entirely — including the settings subtree, which has never been examined.

### 4.2 Enumeration task (Phase 0, mechanical-sweep role, Haiku 4.5)

Produce `docs/transformation/SURFACES.md` by enumerating, from the codebase rather than by navigation:

1. **Every route file** under the authenticated B2C app directory, including dynamic segments, route groups, parallel routes, and intercepted routes.
2. **Every destination** reachable from: the bottom tab bar, the main menu/drawer, every in-page CTA, every list row, every modal trigger, and every breadcrumb.
3. **Every modal, sheet, drawer and overlay** that carries content the customer must read or act on. These are surfaces even when they are not routes.
4. For each: route path, the component tree root, whether it is a landing page or a subpage, tier gating if any, and which portfolio states can reach it.

Cross-check the enumeration against the running app to catch routes that exist in code but are unreachable, and destinations that exist in navigation but 404. Report both classes.

### 4.3 Known surfaces — a starting point, not the list

Confirmed to exist from prior evidence. Treat as a floor.

**Bottom tab bar (5 destinations):**

| Tab | Route | Prior evidence |
|---|---|---|
| Αρχική | dashboard | 12 sections; gap findings rendered three ways; nine-plus CTAs, none primary; score behind a disclosure but its derivative orphaned; floating avatar overlap |
| Πορτοφόλι | wallet list | «Καλώς ήρθατε πίσω, E2E!»; 23 near-identical rows; four stat tiles whose numbers contradict the dashboard's; a red alert block with «+8 ακόμη»; search and filter chips; FAB |
| Αναλύσεις AI | analyses | The densest surface in the app: six near-identical review cards, a long form, a ~25-row list, a score donut at the bottom. English label in the tab bar itself |
| Σύμβουλος | advisor | Four tabs with the fourth clipped; «Νίκος Παπαδό…» truncated; shared-access list with truncated policy identities; a destructive disconnect action given a full dashed-red card |
| Ρυθμίσεις | settings | Five rows, clean, closest to correct in the app. **Use as the density reference.** Its five subpages have never been examined |

**Known non-tab surfaces:**

| Surface | Prior evidence |
|---|---|
| Ασφαλιστήριο (policy detail) | 20 sections, 184–191 containers, 11.5–18.8 viewport-heights of scroll, 14-pill clipped nav, three navigation systems, expired state changes ~5 strings out of 20 sections |
| Ειδοποιήσεις | Every notification duplicated by channel; `__PENDING_EXTRACTION__`; English notification bodies; score-as-percentage; layout void and overlapping rows |
| Settings subpages: Προφίλ · Συνδρομή και χρήση · Ασφάλεια · Ειδοποιήσεις · Απόρρητο και δεδομένα | **Never audited.** Notification preferences and privacy/consent are both regulatory-adjacent |
| App shell | Floating «N» avatar clipped at the left edge on dashboard, notifications, settings and advisor — shell chrome overlapping content on every screen, not a per-page bug. `AI Insights` in English in the tab bar |
| Modals and overlays | Upgrade modals, delete confirmations, unlock sheets, cookie consent |
| Upload / add-policy flow | Reachable from the wallet FAB and multiple CTAs. Not yet audited |

### 4.4 Consistency requirements across all surfaces

Every invariant in §2 applies to every surface in `SURFACES.md`, not only to the four with prior evidence. Additionally:

1. **One navigation model.** The policy detail page currently carries three simultaneously — a 14-pill anchor strip, an in-card tab pair, and a coverage toggle — plus the shell's bottom bar. Every surface ends with one in-page navigation system, or none.
2. **One primary action per surface.** Never zero, never nine.
3. **One empty state, one error state, one loading state per component**, specified by the Design-System agent and used identically everywhere.
4. **Identical facts render identically.** Insurer name, policy identity, status, dates and premium use the same primitive on every surface. Currently the wallet, dashboard, renewal timeline and policy detail each render policy identity differently, and each truncates it differently.
5. **Density reference is Ρυθμίσεις.** Where a surface's density materially exceeds it without justification, that is a finding.
6. **Settings subpages are audited as first-class surfaces.** Notification preferences must be able to honour the §9 cadence controls; privacy and data must reflect what the product actually executes, which a prior audit flagged as claiming export and deletion workflows whose executors were unconfirmed.
7. **The upload flow is audited as a first-class surface**, including its consent checkbox, because it is where extraction placeholders originate.

### 4.5 Per-surface evidence requirement

No surface may enter Phase 1 without its own `evidence/<surface>/BASELINE.md`. A surface with no baseline is a surface whose changes cannot be reviewed, per §0.7.

Surfaces are baselined in this order, so the highest-exposure defects are measured first: **Ειδοποιήσεις** (outbound score leakage lives here) → **Αρχική** → **Πορτοφόλι** → **Ασφαλιστήριο** → **Αναλύσεις AI** → **Σύμβουλος** → **Ρυθμίσεις and its five subpages** → **app shell** → **upload flow** → **modals and overlays**.

## §5. Phase 0 — Evidence. No product code.

Owner: Evidence agent (Sonnet 5) with mechanical sweeps (Haiku 4.5). Specs and verdicts: Orchestrator and Product-Truth (Opus 5). Reviewed by: Adversarial Reviewer.
Mode: **plan mode** for all judgement work; **accept-edits scoped to `tests/`, `docs/` and fixtures** for harness and fixture construction. Product code is not touched in this phase under any circumstances.

Phase 0 is the longest phase and the one most likely to be cut short under time pressure. Do not cut it short. Every hour saved here is repaid at three times the cost in Phase 4, because a defect that no fixture can reproduce is a defect that ships.

### 5.1 The harness

Build **one** harness, shared by every surface in `SURFACES.md`. Metric definitions live in a single module and are imported everywhere. Copying a definition between files is prohibited; a definition that drifts between the baseline and result passes makes every comparison worthless.

Settle procedure, identical in every pass, recorded in the evidence file:
- Navigate, wait for DOM content loaded, then network idle with a hard cap (the dev server's stubbed hosts may retry indefinitely, so the cap must be real), then a fixed additional delay.
- Freeze animations.
- Hide dev-only chrome (framework overlays). Record that you did.
- Exclude off-canvas shell chrome (closed drawers at translate offsets) from all counts.
- Note that fixed-position elements paint at their viewport position in full-page screenshots. This is a capture artifact — but the same artifact confounded a prior human observation, so record it explicitly rather than silently.

### 5.2 Metrics — define once, reuse verbatim

| Metric | Definition |
|---|---|
| **Scroll height** | `document.documentElement.scrollHeight` in CSS px after settle, per width. For paginated or virtualized surfaces, measure both initial and fully-loaded. |
| **Section count** | Distinct top-level content groupings a customer perceives as a section. Operationalize with a stated selector — heading-bearing top-level blocks plus bordered top-level blocks without headings. State the selector in the evidence file; nested sections count individually. |
| **Container count and max depth** | Visible elements ≥8×8px with a visible boundary: background alpha above a stated threshold, box-shadow, or any border side with non-zero width and non-transparent colour. Max depth is the deepest ancestor chain of such elements. |
| **Duplicate-fact count** | `data-fact="<namespace>.<key>"` values appearing more than once. Until instrumentation exists, run a parallel value scan counting visible elements whose own text contains each named fact value, and record **both**, because an attribute scan on an uninstrumented page returns a vacuous zero. |
| **Duplicate-action count** | `data-action="<verb>"` values appearing more than once. Distinct from duplicate facts, with a different fix. A prior audit found one quote CTA rendered three times and six AI entry points on one page. |
| **Count-consistency failures** | `data-count="<namespace>.<key>"` keys whose rendered instances disagree without a label explaining the difference. |
| **Duplicate-block count** | Text blocks of ≥80 characters rendered more than once on one surface. Catches boilerplate proliferation — the AI disclaimer paragraph currently renders two to three times on the dashboard. |
| **Internal-token leakage** | Occurrences in rendered text **and in rendered outbound templates** of sentinels (`__…__`), `PENDING-<digits>`, `E2E-*`, fixture-shaped ids, bare UUIDs, raw snake_case enums, or placeholder markers («δοκιμαστικό», test, sample, draft). |
| **Locale purity failures** | Latin-script sentences (≥3 consecutive Latin words) in `el` output, with a narrow allowlist for brand names and acronyms. Applies to outbound templates. |
| **Truncation failures** | Elements sourced from the `el` bundle where `scrollWidth > clientWidth`, plus any server-side string slicing on Greek content, plus mid-word breaks on brand names. |
| **Sub-44px targets** | `a, button, [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])` with a rendered box under 44px in either dimension. Excludes links inside running text and off-canvas chrome. State the selector; note where it differs from any pre-existing viewport spec so the two counts are not confused. |
| **Layout-integrity failures** | Sibling-element box overlaps, and vertical gaps above a stated threshold between consecutive list rows. This is the objective form of "a void appeared and two cards painted over each other". |
| **Contrast** | WCAG 1.4.3 (text, 4.5:1 body / 3:1 large) **and 1.4.11 (non-text boundaries, 3:1)**. 1.4.11 is mandatory in this phase, not deferred — a near-black card on a near-black background was previously missed precisely because only text contrast was automated, and the harness reported zero failures on a page containing it. |

Record every metric at 320/390/430, in every portfolio state, for every surface.

### 5.3 Fixture matrix

**Portfolio states, every surface:** empty (0 policies) · single (1, unanalysed) · typical (3, mixed) · heavy (23, mixed active/expiring/expired/unread) · all-expired.

**Product types where the surface varies by line:** motor, health, and at least one of property or pet, so line-specific rendering paths are exercised.

**Tier states:** free and paid. A prior audit could not reproduce a confirmed collaboration-panel defect because the fixture account was free-tier and the panel only renders for paid.

**Degraded fixtures — mandatory. The governing rule: a fixture must be able to produce the defect.** Placeholder text reached the most prominent list on the dashboard because no fixture could generate it, and four confirmed defects were verifiable only by reading code.

Build, at minimum:

| Condition | Reproduces |
|---|---|
| Stored summary in English, no language tag | English body under a Greek heading |
| Gap instance on a slug the authored content map does not know | Prose-as-heading, mid-word ellipsis, generic duplicate attention items |
| Extractor placeholder in a summary and in an identity field | Masked-looking values rendered with the confidence of real ones |
| One completed run followed by one failed run, zero gaps | Failure banner over a "no findings" empty state; body from an earlier run |
| Analysis in progress; analysis never run | All-clear falsehoods; score with no basis |
| Very long insurer and advisor names; longest real Greek strings in the bundle | Truncation on every surface |
| Notification records duplicated across channels | One event, two rows |
| A `limitBasis` or status value outside its display map | Raw enum reaching the customer |
| Policy with no premium; policy with no documents | Unspecified empty states |

Fixtures live in the local dev database only, are idempotent, and refuse to run against a production project reference. No production data, no production reads, no seeded accounts.

### 5.4 Candidate-defect verification

For every candidate defect — those catalogued in prior audits and every new one found during enumeration — record: **reproduces / does not reproduce / reproduces differently**; at which widths, portfolio states and tiers; the root cause with file and line; and whether a fixture reproduces it or it is code-confirmed only, with the reason.

Two rules that have already paid for themselves:

- **Refute honestly and in both directions.** A prior pass correctly found one candidate already fixed by earlier work, and correctly downgraded another to a capture artifact. Recording a candidate as refuted is as valuable as confirming it, and prevents an agent "fixing" something that was never broken.
- **A "capture artifact" verdict resolves the screenshot, not the page.** Where a fixed bottom bar appears to overlay content, determine whether the layout reserves bottom padding plus safe-area inset. If it does not, content is genuinely occluded in a real viewport and the candidate is confirmed, not dismissed.

Where two figures appear to contradict, determine whether they count different things before declaring a bug. A count that is correct but unlabelled is a labelling defect with a different fix.

### 5.5 Phase 0 also produces

1. **`SURFACES.md`** per §4.2 — full route and overlay enumeration, including unreachable routes and broken destinations.
2. **`LEDGER.md`**, complete — every capability on every surface, with the four running counts at the top.
3. **A global chrome audit.** The floating avatar, the tab bar, the header, and any element that renders on every screen. Shell defects are one item, not seven.
4. **An outbound-copy inventory.** Every email and push template: trigger, channels, and whether it renders a score, an unvalidated severity, an internal token, or English. **This is where §2.2's worst violation lives and it is invisible from the UI.** Render every template to text and run the leakage and locale metrics against the output.
5. **A Greek string inventory** — every `el` string every surface can render, extracted mechanically, with defects flagged for human review. This inventory is later frozen so a newly composed string cannot ship unreviewed.
6. **A `data-*` instrumentation plan** — the full set of fact, action and count keys to be applied in Phase 1, agreed before instrumentation begins. Anything not instrumented becomes permanently invisible once the attribute scan becomes authoritative.

### 5.6 Phase 0 gate

Phase 0 does not end until **all** of the following hold. The Orchestrator may not soften any of them.

- Every surface in `SURFACES.md` has a published `BASELINE.md` with every metric at all three widths in every applicable state.
- Every candidate defect is reproduced in a fixture, or explicitly recorded as code-confirmed-only with the reason stated.
- 1.4.11 is automated and reported.
- The outbound-copy inventory is complete and its templates measured.
- `LEDGER.md` is complete with no unenumerated capability.
- The instrumentation plan is agreed.
- The Adversarial Reviewer confirms all of the above.

---

## §6. Phase 1 — Trust repair. Blocking. Nothing else proceeds.

Owner: Implementation agents (Fable 5, accept-edits), one per surface. Veto: Product-Truth (Opus 5). Guards: Guard agent (Fable 5).

**No styling. No rearranging. No new features. Defects only.**

This phase will feel like it produces no visible improvement, and that is correct. Building engagement mechanics on a product that emails customers an unvalidated 42-point score swing means the mechanics amplify the damage rather than the value.

### 6.1 Item ordering — highest exposure first

**1. Score containment (§2.2).**
Enumerate every render site of the score and every derivative — including outbound templates — by grepping for the value and its formatters, not by inspecting components. Reduce to at most one sanctioned in-product location with no verdict label. Remove entirely from email and push. Remove the orphaned derivative and reconcile the disagreeing deltas. Where a derivative survives, its base must be present or reachable in one tap from the same container.

**2. Outbound copy (§2.2, §2.4, §2.8).**
No score, no unvalidated severity, no internal token, no English, in any email or push template. Verify against rendered template output, not the DOM. The `in_app` chip is a delivery detail and does not belong in a customer-facing list at all.

**3. Token, fixture and placeholder leakage (§2.4).**
`__PENDING_EXTRACTION__`, `PENDING-<epoch>`, `E2E-*`, «Καλώς ήρθατε πίσω, E2E!», and any placeholder-marked content. Fix at the source: a notification or a card must not be constructible with an unresolved identity. Add a dev-time assertion that throws rather than rendering a sentinel. Content that cannot resolve does not render.

**4. Absence-is-not-reassurance (§2.3).**
No verdict, tick, or all-clear derived from zero findings where zero findings means the engine could not look. Where a page body derives from an earlier successful run while a banner describes a newer failed one, state which run produced what, and mark the findings stale.

**5. Count consistency (§2.6).**
Instrument every quantity with `data-count`. Reconcile or label. Start with the seven figures describing one portfolio and the two renewal-window figures that disagree.

**6. Notification deduplication (§2.7).**
Group by event identifier at the query or presentation layer. If no stable event id exists, that is a schema finding — **report it and halt the item**. Do not group on a heuristic such as title-plus-timestamp, which will silently merge genuinely distinct events.

**7. Severity framing (§2.1).**
Chips become review framing, neutral treatment, qualifier attached to the group and visible without scrolling past the items it qualifies. Colour never sole carrier. Fix in the shared template so in-app, email and push change together — and verify they share one, reporting it if they do not.

**8. Greek string sweep (§2.5).**
Fix every defect flagged in the Phase 0 inventory, then freeze the inventory so a newly composed string cannot ship unreviewed. Automated grammar checking is unrealistic; an inventory diff is not. Where broken strings cluster in one newly-touched section, look for a composition path rather than treating them as independent typos.

**9. Truncation (§2.5).**
Identity fields never clip. Fix in the primitive layer via the §3.8 protocol. Audit the global `min-width: 0` rule under 430px and the global `overflow-wrap: anywhere` on headings, document each rule's blast radius, and fix the rule with its intended callers. **A surface-local override is a review failure even when it produces a correct-looking result.**

**10. Layout integrity (§2.10 adjacent).**
Voids, clipped rows and overlapping cards. Where the cause is virtualization with estimated heights, either measure real heights or drop virtualization until row heights are stable. **Do not tune an estimate constant and call it fixed** — Greek string length will move it back.

**11. Global chrome.**
The floating avatar overlapping content on every screen, `AI Insights` in the tab bar, and every other shell-level defect. One item, not one per surface.

**12. Unusable and meaningless controls.**
Sub-44px targets on every surface. Counters with no denominator. Upgrade CTAs reasoned by limits that no longer exist. Unlabelled values. Rows with no destination — a notification that describes a state must be able to reach it.

**13. Settings subtree and upload flow.**
Never audited. Apply every invariant. Privacy and data must reflect what the product actually executes; notification preferences must be capable of honouring the §9 cadence controls.

### 6.2 Instrumentation

Every item in this phase adds `data-fact`, `data-action` and `data-count` to everything it renders or touches, per the Phase 0 plan. Instrumentation added at the end does not happen. Once the attribute scan becomes authoritative, anything uninstrumented is permanently invisible.

### 6.3 Phase 1 gate

- Every Phase 1 CI guard green, **each demonstrated failing first** with the proof recorded.
- Measurement pass shows **zero** on: internal-token leakage (DOM and outbound), locale purity failures, count-consistency failures, duplicate-block count above one per block, layout-integrity failures, sub-44px targets, contrast failures at 1.4.3 and 1.4.11.
- Score renders in at most one sanctioned location, with no verdict, in every portfolio state including empty, all-expired and nothing-analysed — and nowhere in outbound.
- No all-clear renders where a check could not run.
- Every degraded fixture passes, not only the healthy matrix.
- Section count, container count and scroll height need not improve — but **any regression in them fails the phase**.
- Adversarial Reviewer signs off explicitly that no fix relocated a defect rather than removing it, having enumerated render sites and channels for each.
- Product-Truth raises no unsatisfied veto.

## §7. The product-truth lens, and Phase 2 — Reordering

Owner: Product-Truth agent (Opus 5) authors the per-surface specs. Orchestrator critiques. Adversarial Reviewer gates. Implementation follows in Phase 4.
Mode: **plan mode.** Phase 2 produces specifications, not code.

### 7.1 The lens

This is the ordering against which every layout decision in the run is judged. A policyholder's questions, in priority order:

1. **Am I covered right now?** In-force status, per asset. Everything else is secondary to this.
2. **When does it end, and what will it cost me?** Renewal date and money.
3. **What do I do if something happens today?** Claims path, phone number, deadline.
4. **What am I paying, in total and per thing?**
5. **What's excluded that I assume isn't?** The exclusions and ψιλά γράμματα content.
6. **Who is my person?** Advisor, contactable.
7. **Gaps, suggestions, upsell.** Last. Only once the above are settled.

**The app currently inverts this almost exactly.** Score and gaps lead on every surface. Renewal sits at roughly 70% scroll depth on the dashboard. The claims path is near-invisible everywhere. Exclusions — the single most differentiating content in the product — sit furthest down the policy page.

### 7.2 The ten-second test

Every surface is judged by whether someone opening it can answer, within the first two viewports at 320px in Greek: **what is insured · am I protected · what needs attention · what do I do next.**

Every Phase 2 spec must include an annotated wireframe or structural description showing where each of the four questions is answered — including for an empty portfolio and an all-expired one, which are the states most likely to fail and least likely to be checked.

### 7.3 The asset reframe — the largest single change in this run

The wallet currently lists 23 rows reading «Interamerican · Αυτοκίνητο · 04/02/2027», indistinguishable from one another. **No customer thinks in policy numbers and renewal dates.** They think «το Yaris», «το σπίτι στην Κηφισιά», «η υγεία της Μαρίας».

**The wallet's primary object becomes the insured asset, with policies as attributes of it.** One car with three policies is one row, not three. This single change resolves the indistinguishable-rows problem, the count confusion, and most of the wallet's scroll length simultaneously — and it is the precondition for the obligation calendar in §9.

**This is structural, not cosmetic.** If it requires a schema migration, that is a halt under §12, and the Product-Truth agent must present the migration shape and its consequences rather than proceeding. If it can be achieved as a presentation-layer grouping over existing data, proceed and document the grouping key.

Each asset row carries the thing that identifies it to a human — plate, address, person — not the policy number.

### 7.4 Kill invented metrics

Any coined term that means something plainer is renamed to the plain thing. «ΑΣΦΑΛΙΣΤΙΚΟ ΑΠΟΤΥΠΩΜΑ 4.990 €» means total annual premium and should say so. Audit every label on every surface for this class and list them in the spec.

### 7.5 Per-surface target structure

Each is a spec deliverable. Targets are ceilings, and every relocation gets a `LEDGER.md` row.

**Αρχική (dashboard)** — currently 12 sections, three renderings of the same gap findings, nine-plus CTAs with none primary.
Target: ≤6 sections. One primary action. State summary answering questions 1 and 2 in the first viewport. Renewals promoted — a renewal has a deadline, a coverage gap does not. Gap findings render **once**, with the other two locations linking to it. The protection plan **splits**: onboarding tasks and coverage findings are different kinds of thing and must not share a list or a progress denominator. Life-events raised above output — it is the highest-value input a customer can give and currently sits below three cards of findings.

**Πορτοφόλι (wallet)** — asset-first per §7.3.
Target: household assets with policies nested. Each row identifies itself to a human. Stat tiles reconciled with the dashboard's or removed. The alert block's «+8 ακόμη» pattern replaced with something that can be acted on. Search and filter preserved and relocated per ledger.

**Ασφαλιστήριο (policy detail)** — currently 20 sections, 184–191 containers, up to 18.8 viewport-heights, three simultaneous navigation systems.
Target: ≤8 sections. **One** navigation system. Coverage separated from claims contact — two different jobs. Claims phones as real `tel:` targets in the claims section. Dates stated **once**, replacing all three current locations. ψιλά γράμματα promoted out of the basement. Six AI entry points consolidated to at most two.

**Αναλύσεις AI** — the densest surface in the app: six near-identical review cards, a long form, a ~25-row list, and a score donut at the bottom.
Target: the most aggressive reduction of any surface. The form is not the first thing. The review cards deduplicate. The list paginates or groups. The tab label itself is translated.

**Ειδοποιήσεις** — events, not deliveries.
Target: one event, one row. No channel chips. Date grouping. Relative time with absolute on disclosure. Policy identity in human terms. Every row resolves to a destination. Actionable notifications distinguishable from informational ones. Explicit volume boundary.

**Σύμβουλος** — the destructive disconnect action currently gets a full card with a dashed red border.
Target: a rare destructive action does not outrank the two things a customer actually does here. Four tabs all render at 320px. Shared-access list carries full policy identity.

**Ρυθμίσεις** — closest to correct in the app.
Target: **preserve it.** Use it as the density reference. Audit its five subpages as first-class surfaces per §4.4.

**App shell** — one navigation model, no chrome overlapping content, all labels in Greek, bottom inset reserved plus safe-area.

**Upload flow** — audited and specified, including its consent checkbox, since it is where extraction placeholders originate.

### 7.6 Phase 2 gate

- A spec exists for every surface in `SURFACES.md`.
- Each spec maps every current capability to a destination in `LEDGER.md`, or marks it `deferred` with a named follow-up.
- Each spec answers the four ten-second questions in the first two viewports at 320px, demonstrated for empty and all-expired states.
- Each spec states its section, container, CTA and AI-entry-point ceilings.
- Adversarial Reviewer confirms no spec inverts §7.1 and no capability is unaccounted for.
- Product-Truth raises no unsatisfied veto.

---

## §8. Phase 3 — Design system

Owner: Design-System agent (Fable 5), accept-edits scoped to the primitive and token layer. Specs critiqued by Opus 5 before implementation.

**Read `/mnt/skills/public/frontend-design/SKILL.md` before starting.**

### 8.1 Deliverables

**Tokens:** colour, type scale, spacing, radii, elevation, motion. Every value a token; no literals in surface code.

**Component set**, each with every state specified:
asset row · policy row (nested under an asset) · status chip · review-item card · obligation card · since-last-visit strip · perk card · section header · disclosure · list empty state · error state · stale state · primary action · secondary action · destructive action · tab strip · date-group header · count badge · currency value · policy-identity block.

The last one matters: insurer name, policy identity, status, dates and premium currently render differently on the wallet, dashboard, renewal timeline and policy detail, and truncate differently on each. **One primitive, used everywhere.**

### 8.2 Constraints

- **Greek at 320px is the design target, not the edge case.** Every component is designed at 320 with the longest real Greek string from the frozen inventory, then verified at 390 and 430.
- **Container nesting depth ceiling of 2**, enforced in the primitives so surfaces cannot exceed it by default.
- **44×44 minimum** enforced in the primitives.
- **Colour is never the sole carrier of meaning** (WCAG 1.4.1). Every status, severity-adjacent, and state distinction carries a text or shape equivalent.
- **Every state has a specified appearance** — loading, empty, partial, failed, stale, unauthorized, tier-gated. The failures in this codebase cluster in unspecified states; an unspecified state is how «Εντάξει» came to render over an expired portfolio.
- **Truncation is a component decision, not a CSS afterthought.** Components that carry identity restructure rather than clip.
- **Contrast** verified at 1.4.3 and 1.4.11 for every token pair before the component ships, including non-text boundaries — a near-black card on a near-black surface previously passed every automated check because only text contrast was measured.

### 8.3 Global rule remediation

Two shared rules are known to cause surface-wide symptoms and are this agent's responsibility to fix at the rule level, with blast radius documented:

- `:where(.grid, .flex) > * { min-width: 0 }` under `max-width: 430px` — strips the min-content floor from every flex and grid child on every mobile surface.
- Global `overflow-wrap: anywhere` on headings under 430px — breaks brand names mid-word without a hyphen.

Enumerate every surface affected by each before changing either. Fix the rule and its intended callers. A surface-local override anywhere in the codebase is a review failure.

### 8.4 Phase 3 gate

- Every component in §8.1 exists with every state specified and rendered in a fixture harness at 320/390/430 in Greek, using the longest real strings.
- Container depth ceiling and tap-target minimum enforced structurally, demonstrated by a guard that fails when a component violates them.
- All token pairs pass 1.4.3 and 1.4.11.
- Both global rules remediated with blast radius documented in `DECISIONS.md`.
- No surface code contains a literal colour, spacing or type value.
- Adversarial Reviewer confirms the component set covers every capability class in `LEDGER.md`, so Phase 4 cannot be forced into a local override for want of a primitive.

## §9. Phase 4 — Engagement architecture

Owner: Product-Truth agent (Opus 5) drafts, Orchestrator critiques, Design-System agent specifies, then implementation. **Opus 5 writes and critiques this phase. Do not delegate the spec to an implementation model.**
Mode: **plan mode** for the spec. Implementation follows only after the §9.6 gate passes.

### 9.1 The problem, stated honestly

An insurance wallet is opened three or four times a year because policies don't move. Banking apps are opened daily because money moves and the app is where the movement lands. There is no equivalent native event stream in insurance, and manufacturing one — "we ran an analysis", "your score changed" — produces noise, then distrust, then uninstalls. **This app is already doing exactly that, and doing it by email.**

The goal is three to four honest opens per month. The mechanics below are the only ones that survive scrutiny.

**What transfers from consumer banking:** longitudinal analytics that only make sense over time · control surfaces that give real agency — revoke advisor access, correct extracted data, change what's shared, all three of which exist and are all buried · visible accrual of genuine progress.

**What does not transfer:** transaction streams · instant rich push where the notification is the value · money-movement rituals · market-driven daily change.

### 9.2 The asset-obligation calendar — the primary mechanic

Policies don't move; **the insured asset does.** A Greek household with a car and a home carries eight to twelve calendar-deterministic obligations a year — τέλη κυκλοφορίας, ΚΤΕΟ, ΕΝΦΙΑ instalments, δίπλωμα renewal, and the insurance renewals themselves. Each is dated, locally real, individually useful, and requires no risk claim whatsoever. This is where the frequency comes from.

Design a calendar surface built on the **asset**, per §7.3. Requirements:

- **Verify every obligation rule against current Greek sources at build time. Do not hardcode dates or rules from model knowledge.** They change, and a wrong τέλη κυκλοφορίας deadline is worse than no deadline. Where a rule cannot be verified, the obligation does not ship.
- **Obligations the user confirms, not obligations asserted at them.** The app proposes «Το Yaris έχει ΚΤΕΟ τον Μάρτιο;» and the user confirms or corrects. Confirmation is data you don't otherwise get, and it is consented by construction.
- Every obligation is dismissible; every reminder cadence is user-controlled and honoured by the settings subtree.
- **Obligations are not insurance products** and must never be dressed as gaps, findings, or risks.
- An obligation with no date does not render.

### 9.3 Since-your-last-visit

Every surface must re-orient someone returning after a week.

- A per-user last-seen timestamp **per surface**, and a diff computed against it.
- **Only render when something actually changed.** «Τίποτα δεν άλλαξε από την τελευταία σας επίσκεψη» is a trust-building message and should be shown plainly rather than padded with manufactured activity. This discipline is what separates this from a feed.
- Changes must be things that happened **in the world or in the user's data** — a policy added, a renewal window opened, an obligation approaching, a document read, an advisor action, a share granted or revoked. **Not** internal system events, and **not** score movements.
- The diff belongs at the top of the surface it describes, in one line, with one action.

### 9.4 Perk-triggered engagement — unused-benefit recovery

Not a questionnaire. **Most policyholders never use benefits they have already paid for.** Those benefits are dated, per-asset, and individually worth money. Surfacing an unused one is the app returning value, not extracting data — and only that direction survives repetition.

| Wrong framing | Right framing |
|---|---|
| «Πότε έκανες τελευταία φορά check-up;» | «Έχεις δωρεάν ετήσιο check-up στο συμβόλαιό σου, αχρησιμοποίητο φέτος — ο ασφαλιστικός χρόνος λήγει σε 4 μήνες.» |

**Hard preconditions:**

1. A prompt renders **only from a confirmed perk on a confirmed policy** — never from inference, a category default, or a perk whose extraction is incomplete. A prompt about a benefit the customer does not have is worse than silence.
2. **Evidence on tap.** Every prompt links to the clause in the customer's own document. If it cannot, it does not render.
3. Never rendered as a gap, risk or finding. Its own register, no severity styling, no effect on any score.
4. One at a time. Never a form, never a batch, never a profile-completion bar.
5. **Never bundled with an upsell.** A prompt about a benefit already paid for must not carry a purchase CTA. The moment it does, the customer reclassifies the whole channel as marketing.

**Data tiers — determines what may be built:**

| Tier | Covers | Requirement |
|---|---|---|
| **A — nothing stored** | Reminder, booking link, phone number surfaced. The app never learns the answer. | **Default. Build the entire catalogue here first.** |
| **B — ordinary personal data** | ΚΤΕΟ date, beneficiary review status, contents inventory, declared drivers, renovation flag. | Ordinary basis, stated purpose, deletable. Feeds the calendar. |
| **C — Article 9 special category** | Anything about health, medical history, conditions, treatments, blood type, donor status. | **Do not build in this run.** Nothing in the catalogue requires it, and it opens a second Article 9 front alongside the pending agent-side decision. |

**The test for any new prompt:** can the app deliver the value without ever learning the answer? If yes it is Tier A and it ships. If no, justify the storage against the customer's benefit, not the product's.

**Catalogue by line** — perk classes typical of the Greek market, **verified against actual extracted perk data per policy, never assumed**:

- **Υγεία:** unused annual check-up · second medical opinion (widely unknown to holders) · in-network diagnostics near them · 24h medical line, saved before it's needed · dental benefit · paediatric check-up · maternity benefits and waiting periods.
- **Αυτοκίνητο:** roadside assistance number saved to contacts · φροντίδα ατυχήματος and how it differs · free glass repair in-network · replacement vehicle · legal protection · driver personal accident · ΚΤΕΟ due · τέλη κυκλοφορίας deadline · declared-driver review at renewal · φιλικός διακανονισμός form in the glovebox · photograph current condition.
- **Κατοικία:** 24h plumber/electrician number · earthquake cover present or absent — a genuine yes/no in this market · third-party liability · rebuild value after renovation · high-value contents photos and receipts · alarm discount · pre-winter boiler check.
- **Ζωή:** **beneficiary review — the highest-value prompt in the catalogue**, since outdated beneficiaries are a common and consequential real-world failure · premium waiver on incapacity · surrender value and policy loan.
- **Ταξιδιωτική:** emergency number and procedure abroad · cancellation conditions and deadlines · baggage claim documentation · EHIC validity.
- **Κατοικίδιο:** annual vet check · vaccinations due · microchip registration status.
- **Ομαδικά:** plain-language "what your employer's plan actually gives you" — the least-understood product in the market · overlap and claiming sequence where an individual policy also exists · contribution level and beneficiary · portability on leaving.
- **Cyber:** breach monitoring included or not · who to call in the first 24 hours · seasonal security hygiene.
- **Cross-line:** overlap detection where group and individual health coexist · annual perk-expiry sweep per asset · renewal-window benefit review · life-event cascade across multiple lines from one declared event.

**Note:** boiler maintenance, pet vaccinations and vehicle inspection are frequently **policy conditions**, not merely good practice — missing them can silently void cover. Where extraction identifies one as a condition, it belongs in the review register as a coverage-voiding condition, not in the perk register. Flag every such case to the Product-Truth agent.

### 9.5 Prevention, and the line it must not cross

**Renewal price intelligence.** Greek motor insurance is aggressively price-shopped. "Your renewal is in 45 days — here is what the market looks like" is a reason to open that the customer already wants. Presenting market context is different from presenting advice, and where the line sits is a §12 halt, not an agent's call.

**Seasonal prevention.** Greece has genuine seasonality — hail, flood, wildfire, storms. A weather- or season-triggered "your cover for φυσικά φαινόμενα says X, here is what to check" is prevention a customer accepts because it is locally true and falsifiable. Unlike a score movement, it can be checked against reality.

**Prohibited, absolutely:**

- Manufactured urgency, countdowns on non-deadlines, artificial scarcity.
- Streaks, badges, or any mechanic that punishes absence.
- Notifications whose content is an internal system event.
- **Any risk or protection claim the engine cannot substantiate** — this includes the score, and includes severity while it remains unvalidated.
- **Engagement metrics as a success criterion for this run.** Measure whether people found what they needed, not whether they came back. A wallet producing four honest opens a month is the goal; four dishonest ones is a worse product than the one opened twice a year. Hold this line even against measured engagement improvements.

**Delivery rules:** at most one perk or obligation prompt per session; a small monthly ceiling, user-configurable, with a global off switch honoured everywhere including outbound. In-product first — a prompt earns an outbound message only where it has a real, dated deadline. Everything else waits until the customer opens the app.

### 9.6 Phase 4 gate

- The spec passes Adversarial Reviewer critique against §9.4 and §9.5 **before any implementation begins**. A spec that fails returns to Product-Truth. Two failures on the same mechanic is a halt.
- Every proposed notification traces to a real-world event with a date (§2.8).
- Every obligation rule is verified against a current source, cited in the spec. Unverifiable rules are cut.
- Every perk prompt names its Tier, and no Tier C prompt is specified.
- Every prompt can show its evidence in the customer's own document.
- Cadence controls are specified and the settings subtree can honour them.
- Product-Truth confirms no mechanic asserts a claim the engine cannot substantiate.

---

## §10. Phase 5 — Rebuild, surface by surface

Owner: Implementation agents (Fable 5, accept-edits), **parallel, one per surface**. Parallelism is permitted here and only here, because Phase 1 has completed and the design system exists.

### 10.1 Rules

- One surface per item. Two parallel items may not share a `file_boundary`.
- Every surface builds against the Phase 3 primitives. **A surface-local override is a review failure**, even where it produces a correct-looking result. Need a primitive change → §3.8 protocol, block, move on.
- Every relocation updates its `LEDGER.md` row as it happens, not at the end.
- Every surface has its own measurement gate; a surface is not done because another surface passed.
- Instrumentation (`data-fact`, `data-action`, `data-count`) is carried forward, not re-derived.

### 10.2 Per-surface acceptance

Each surface, measured on fixtures at 320/390/430 in every applicable portfolio state including empty and all-expired, and in every degraded fixture that can reach it:

| Criterion | Target |
|---|---|
| Ten-second test | All four questions answerable in the first two viewports at 320px, in every state |
| Section count | At or below the ceiling in its Phase 2 spec |
| Container count | ≤50% of its Phase 0 baseline; max depth ≤2 |
| Scroll height | At or below the ceiling in its Phase 2 spec, at every width and state |
| Duplicate facts / actions / blocks | 0 / 0 / each block ≤1 |
| Count-consistency failures | 0 |
| Internal-token leakage, locale purity failures | 0 |
| Truncation failures | 0 |
| Sub-44px targets | 0 |
| Layout-integrity failures | 0 |
| Contrast 1.4.3 and 1.4.11 | 0 failures |
| Navigation systems | Exactly one in-page, or none |
| Primary actions | Exactly one |
| Capabilities | Every one relocated or deferred with a ledger row; none lost |

### 10.3 Ordering

Rebuild in the §4.5 order — Ειδοποιήσεις, Αρχική, Πορτοφόλι, Ασφαλιστήριο, Αναλύσεις AI, Σύμβουλος, Ρυθμίσεις and subpages, app shell, upload flow, modals — so the highest-exposure surfaces are rebuilt first and the density reference is preserved rather than disturbed early.

### 10.4 Phase 5 gate

- Every surface in `SURFACES.md` meets §10.2 in full.
- `LEDGER.md` has no row without a destination or a named deferral.
- No surface contains a local override of a shared primitive; verified by grep, not assertion.
- The four running counts at the top of `LEDGER.md` are refreshed and reported: total capabilities, total CTAs, AI entry points, monetization surfaces.
- Adversarial Reviewer confirms, per surface, that no capability was lost and no defect was relocated across surfaces.

## §11. Phase 6 — Guards

Owner: Guard agent (Fable 5), accept-edits scoped to `tests/`.

Guards are written **throughout** the run, not only in this phase — each phase's gate requires its guards green. Phase 6 is where the set is completed, consolidated, and proven.

### 11.1 The two governing rules

**One guard per defect class, covering every surface.** Three parallel implementations of the same guard will drift, and the drift is how the defect returns on surface eight. When a new surface exhibits an existing defect class, extend the existing guard's fixture set — never write a second guard. At the end of this phase, grep the test suite for duplicated guard logic and consolidate anything found.

**Every guard is demonstrated failing before it counts as written.** Reintroduce the defect in a fixture, show the guard red, revert, show it green. Record both outcomes in the item's queue entry. **A guard that has never failed is not a guard**, and an item claiming a guard without this proof is requeued.

### 11.2 The guard set

Each runs against fixtures — including every degraded fixture — at 320/390/430, in every portfolio state, and where applicable against **rendered outbound templates** as well as the DOM.

| Guard | Asserts |
|---|---|
| **Score containment** | The score value and every derivative render in at most one sanctioned in-product location, with no verdict label, never the largest element in the first viewport, and **never in any outbound template**. Includes the empty, nothing-analysed and all-expired states. |
| **Orphaned derivative** | No delta, trend or "points" value renders without its base present or reachable in one tap from the same container; all renderings of one derivative agree. |
| **Severity framing** | Wherever a severity string renders, its qualifier is present in the same section; no severity maps to a danger token; colour is never the sole carrier. Covers in-app, email and push. |
| **Absence-is-not-reassurance** | No verdict, tick or all-clear renders where the underlying check could not run, did not run, or does not cover the case — including on expired and unanalysed portfolios. |
| **Internal-token and placeholder** | No sentinel, `PENDING-<digits>`, `E2E-*`, fixture-shaped id, bare UUID, raw enum, or placeholder marker in rendered text or outbound output. |
| **Locale purity** | No Latin-script sentence in `el` output, narrow brand/acronym allowlist, **including outbound templates and shell labels**. |
| **Greek truncation** | No `el`-sourced element with `scrollWidth > clientWidth`; no server-side slicing of Greek content; no mid-word break on a brand name. Fixtures use the longest real strings from the frozen inventory. |
| **String-inventory freeze** | The rendered `el` string set matches the reviewed inventory; a newly composed string fails until reviewed. |
| **Count consistency** | No `data-count` key renders disagreeing values without an explaining label, in any state. |
| **Duplicate fact / action / block** | Each `data-fact` and `data-action` value once per surface; no ≥80-character block twice. |
| **Event-not-delivery** | No two notification rows share an event identifier. |
| **Notification provenance** | Every notification traces to a dated real-world event; none whose content is an internal system event. |
| **Destination** | Every notification type and every list row resolves to a route, and the route exists. |
| **Layout integrity** | Zero sibling-box overlaps; no inter-row gap above threshold; no clipped row at a virtualization boundary. |
| **Tap targets** | Zero interactive elements under 44×44 at any width. |
| **Container depth** | Max nesting depth of bounded elements ≤2. |
| **Scroll-height ceiling** | Per surface, width and state, at or below the Phase 5 result plus a stated tolerance. |
| **Primitive-override** | No surface file contains a literal colour, spacing or type value, and no surface overrides a shared primitive locally. |
| **Contrast** | WCAG 1.4.3 and 1.4.11 across every rendered surface. |
| **Perk provenance** | No perk prompt renders without a confirmed perk on a confirmed policy and a link to its clause. |
| **Obligation provenance** | No obligation renders without a verified rule and a date. |
| **Dispatch stub** | No real email or push can be dispatched from a test run. |
| **Engine ownership** | `lib/gap-detection.ts` unmodified; no AI provider schema accepts `isDetected` or `severity`. |

### 11.3 CI cadence

**Every commit** — the classes with the highest historical cost: score containment · internal-token and placeholder · locale purity · absence-is-not-reassurance · count consistency · engine ownership · dispatch stub.

**Every push to the branch** — the full set above.

### 11.4 Phase 6 gate

- Every guard in §11.2 exists, with its failure proof recorded.
- No duplicated guard logic anywhere in the suite, verified by inspection.
- Full suite green against every fixture including degraded ones.
- Each guard's fixture set covers every surface in `SURFACES.md`, not only the surface it was written for.

---

## §12. Halt conditions and out-of-scope

### 12.1 Three questions you may never decide

Write each to `HALTS.md` with evidence, options and your recommendation. Then continue with unblocked items.

1. **Should the protection score exist at all?** Present what it returns for an empty portfolio, an unanalysed portfolio, an all-expired portfolio, and one whose analyses failed — then recommend keep-behind-disclosure, replace-with-factual-composition, or remove. Removing it from outbound is Phase 1 and is not a decision; deciding whether it survives is.
2. **Send-side notification policy.** Which events warrant an outbound message at all, at what cadence, with what digest rule. Removing the score and the severities from email is Phase 1; deciding what replaces them is not yours.
3. **The compliance boundary on renewal price intelligence and prevention prompts.** Where market context becomes regulated advice in a Greek insurance context. This needs the DPO and underwriter tracks, not an agent.

### 12.2 Also halts the affected item

- Any Product-Truth veto that implementation cannot satisfy.
- Any change requiring a **schema migration** — including the §7.3 asset reframe if it cannot be achieved as a presentation-layer grouping.
- Any change to gap detection logic or severity values.
- Any change to consent, privacy, legal, or authentication surfaces.
- Any engagement mechanic that fails §9.5 twice.
- Any notification deduplication that would require grouping on a heuristic because no stable event identifier exists.
- Any queue item requeued three times.
- Discovery that a defect exists in production data which dev fixtures cannot reproduce.
- Any need for a permission escalation not granted at run start.

### 12.3 Halts the entire run

- Any invariant in §2 violated by already-merged work and not fixable within the current phase.
- The dispatch stub failing to hold, at any point.
- Any evidence that production data or a production system was read or written.
- Loss of the ability to run the measurement harness.

### 12.4 Out of scope — do not touch

- The public marketing site and everything on it.
- The B2B/agent dashboard, the invite-only consent flow, and agent-side surfaces. **But** report if any B2C change would propagate to a shared template, and halt rather than propagate.
- Gap detection logic, coverage envelope contents, severity values.
- Protection score **arithmetic**.
- Pricing, entitlements, plan gating.
- Notification **dispatch** logic — whether a message fires, to which channel, at what cadence.
- Email deliverability, sender reputation, provider configuration.
- Per-insurer template extractors and renewal delta extraction.
- Seeded production account cleanup.
- Any migration, any production data, any production read.

If one of these appears to block a goal, **stop and report rather than reaching across the boundary.**

---

## §13. Reporting and loop exit

### 13.1 Continuous

Append to `PROGRESS.md` at every item completion, every model or mode switch, and every checkpoint, per §3.6. Write it for a reader with no history.

### 13.2 Phase boundaries

Append a full phase report: metrics before and after across every surface and portfolio state · the `LEDGER.md` delta · guards added with the proof each failed first · halts raised and their status · model and mode switches made · and the next phase's queue.

Tag the commit `pw-transform-phase-<n>-complete`.

### 13.3 End of run

Produce:

1. **A single comparison across every surface** in `SURFACES.md`: all metrics, before and after, at 320/390/430, in every portfolio state.
2. **Annotated first-two-viewport captures** at all three widths in Greek for every surface, showing where each of the four ten-second questions is answered — **including for an empty portfolio and an all-expired one**, which are the states most likely to fail and least likely to be checked.
3. **The final `LEDGER.md`** with its four running counts, and a list of every deferral with its named follow-up.
4. **The full guard inventory** with failure proofs.
5. **Every open halt**, with its evidence and recommendation.
6. **Updates to `STATUS.md`** — workstream status, launch risks separated from post-GA debt, waiting-on-humans, next three actions.
7. **Updates to `CLAUDE.md`** with the invariants this run established. Above all others, write this one:

> **Absence of a detected problem is not evidence of no problem, and must never render as reassurance.**

It has now produced defects on four surfaces from four different components, and it is the failure most likely to recur on the next surface anyone builds.

### 13.4 Loop exit

Exit the loop only when one of these is true:

- `QUEUE.md` is empty, every phase gate has passed, and §13.3 is complete.
- A §12.3 run-halt has fired.
- Every remaining item is blocked by an open halt in `HALTS.md`.

In the third case, write a summary of what remains, what each blocked item needs, and the exact question that would unblock the most work — then stop.

**Do not exit because a phase looks finished. Do not exit to report progress. Do not exit to ask whether to continue.**