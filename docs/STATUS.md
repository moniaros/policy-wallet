# PolicyWallet — Project Status

_Living dashboard — not a log. Any session that commits or decides ends by updating this file (agent writes the delta; see CLAUDE.md rule). Keep under one screen — move resolved items to `docs/planning/status-archive.md`._

## Session wrap — 2026-08-20b (Sentinel policies & atomic discard — verified, committed)

The 2026-08-14 work ("a failed upload must not leave a half-created policy behind") had been
**half-committed**: the service layer referencing `lib/wallet/policy-identity.ts` and
`lib/services/policy-discard.ts` was already in this branch's history, but those two modules,
the cleanup script and all three guard tests were still **untracked** — HEAD did not build
without the working tree. This session verified the whole thing end-to-end and committed it.

**Verified green on this tree:** `tsc` clean · **4725/4725 unit (437 files)** · lint /
i18n-changed / utf8 (1837) / encoding / api-auth all pass. The three dispositions hold:
DISCARD only when identity is *entirely* placeholder (storage first, DB second; a failed
object delete KEEPS the row); KEEP for user-typed identity; INFORM in Greek for
quota/consent/permission (`TOKEN_LIMIT_BLOCKED` → «εξαντλήθηκε το διαθέσιμο όριο AI…», never
the code). A `completed_with_warnings` run at 96% is saved — pinned by
`analysis-failure-disposition.test.ts:191`. Process death is covered by the reaper's discard.
Convention added to CLAUDE.md/AGENTS.md (identity may be a placeholder; render only through
the primitive).

**⚠ CORRECTION — this branch is superseded, and two claims above/below were wrong.** The same
work merged to `NEW-UI` hours earlier as **PR #283** (`852a2b4c`, deployed 11:07 UTC): the six
modules are byte-identical to the ones committed here, so *this branch adds no code to prod*.
Only the CLAUDE.md/AGENTS.md convention was genuinely new; it went to `NEW-UI` via **PR #284**.

**Counts measured today (2026-08-20 ~11:25 UTC).** Sentinel policies: **dev 0, prod 0** — but
prod was **1** mid-measurement, and that row is the fix working, not the bug. A real
admin-account upload at `11:15:34` created `PENDING-1787224529142 / __PENDING_EXTRACTION__`;
at `11:19:48/49` `notifyUploadDiscarded` fired on both channels («…δεν μπόρεσε να αναλυθεί,
οπότε δεν αποθηκεύτηκε», `related_object_id: null`) and the row, its documents and its storage
object were gone. The count query simply landed inside that 4-minute window. It was **not**
manually removed, and the fix **was** deployed — both earlier claims are withdrawn.
Orphaned storage objects: **dev 34, prod 9** — the prod nine all date from 13–21 July
(713–923h), i.e. pre-fix; today's discard left none behind.

**⚠ Two live environment hazards, one defused:** (1) the uncommitted `.env.example` diff
appended the **production DB URL with its plaintext password** to a tracked file — reverted
here, never committed, but treat the password as exposed and **rotate it** (it sat in a
shared working tree). (2) `.env.local` line 16 still re-defines `DIRECT_URL` to **prod**
(last-wins under dotenv) while storage/auth point at dev. Still needs the owner's edit. (It is
*not* what explains the prod row having no storage object — the discard removed that object.)

**Next 3 actions:** 1) rotate the prod Postgres password; 2) fix `.env.local` line 16;
3) ~~decide on merging this branch to `NEW-UI`~~ **done via #284 (docs only; code shipped in
#283)** — remaining: run the prod
orphan cleanup (`npm run cleanup:sentinels -- --apply` with prod env).

---

## Session wrap — 2026-08-20 (PHASE 7 — rule catalogue + Gate 3b apparatus)

Full write-up: `docs/audits/phase7-rule-catalogue-and-gate3b-2026-08.md`. Taking the two
items Phase 6 handed to humans as far as code honestly can, on one distinction:
**detection is factual, severity is an underwriting judgement.**

**Catalogue 4 → 27 rules, 4 → 8 branches** (motor 5, health 4, home 4, motorbike 4,
group_health 3, pet 3, travel 3, life 1). All live in prod, all rule-bearing, **116 fixture
cases** — every rule must prove it stays silent on a field nobody extracted. Three new
branches by two routes: *travel* got the `AcordDataSchema` section it needed (the blocker was
the extraction schema, not the rule engine); *group_health* and *motorbike* needed nothing at
all — they map onto the existing `health` and `vehicle` sections, which the repo's own branch
content files have recorded for as long as they have existed. Nobody had asked.
Motorbike takes four of motor's five rules and **not** glass breakage: the content file
records that telling riders about glass while saying nothing about rider injury was
"actively misleading". New `all_missing` operator so the life-beneficiaries rule needs **both**
paths empty; an empty array counts as absent.

**Deliberately NOT authored:** a `medicalExpensesLimit < 30000` rule. The €30,000 Schengen
minimum is real but externally unverifiable here, and a threshold in detection logic is a
severity verdict wearing a rule's clothes.

**Latent defect found:** four `ai_check` definitions were still `isActive: true` in
`prisma/seed.ts` after Phase 3 deactivated them in prod — the next `db seed` would have
switched them back on, four "active" definitions that can never fire. One was
`home-earthquake`, which is why an audit reported earthquake had no rule. It has a real one
now.

**Gate 3b — still open, now openable.** It needs an underwriter and always did; what was
missing was everything that makes sign-off possible. Now: per-definition validation columns
(dev + prod), a per-definition caveat that fails safe, a real consumer
(`GET /api/v1/policies/[id]/gaps` returns `severity_validated` + `severity_caveat_key`), and
**`docs/reviews/severity-review-packet.md`** — generated from the LIVE catalogue, stating
what each rule asks, the fields it reads, the severity proposed, and the words the customer
sees. Recording an answer is one UPDATE per definition.

⚠️ **Owner action, 1 of 2:** the packet is the deliverable. Owner: licensed underwriter /
ΕΙΑΣ-qualified intermediary. **27 pending, 0 validated.**

⚠️ **Owner action, 2 of 2:** eight branches still have no rules, and it is a domain question,
not an engineering one. Every one of their content files already records that the meaningful
detail arrives as free text (legal expenses: *"scope, waiting periods and limits exist only as
free text"*; boat: *"hull value, navigation area, crew cover… only in the free text"*). The
answerable question is: **for branch X, which three or four facts does a Greek policy always
state?** Given that, the schema section and rules are an afternoon — travel is the worked
example.

Guardrails: `tsc` clean · **4723/4723 unit** · lint/utf8/encoding/i18n/api-auth green.
(`verify:migrations` fails locally on `DATABASE_URL`, identically without these changes.)
Commits `8600a873`, `7c670721`, `a3d7420f`, `+1`.

---

## Session wrap — 2026-08-20 (PHASE 6 iteration 2 — closing the remainders) — **81/100**, loop ends here

Iteration 1 recommended stopping. **Iteration 2 proved that premature**, which is the
useful result:

- **A seventh false public claim, which iteration 1 scored as true.** `/needs` says "six
  questions" and asks **twelve**, across six steps (2,2,1,3,3,1) — in both languages and
  in the SEO metadata. The sweep agent called it "fragile but currently TRUE" by
  conflating steps with questions, and I recorded that **without counting**. Headline now
  derives from `NEEDS_STEPS.length`; pinned by `needs-check.test.ts`. (That guard's first
  version failed on **its own comment** quoting the banned phrase — mention-vs-use, third
  time this programme.)
- **The guard blind spot is closed, not just disclosed.** `policy-authorization-single-path`
  now checks API routes **per HTTP handler** — which immediately caught the `DELETE` in
  `documents/[docId]` hand-rolling its own ownership filter behind a compliant `GET`, now
  on the single path with its deliberate owner-only narrowing kept — and scans the
  **server-action surface** for the first time. All 14 policy-touching actions audited:
  every one authorizes, several deliberately narrower than `getPolicyAccess`, **no live
  hole**; each listed with a reason. Both checks verified to fail against pre-fix source.
  `/trust` copy restored to the wider, now-true claim.
- **`MonetaryLimitSchema.unlimited` → `.optional()`.** `.default(false)` was being
  materialised by the AI SDK into stored data, recording "there is a cap" on every limit
  nobody determined — one rule away from load-bearing.

- **Retention was a disclosure gap, not an enforcement gap.** `TokenUsage`/`ConsentAudit`
  are *deliberately* retained (financial ledger / proof of consent, both documented
  exceptions in the eraser) — purging them on a timer would be the bug. The real defect:
  the privacy table was **silent** about session records and about public-form captures
  (24 months in `FormSubmission`). Both now listed, both locales, and
  `retention-copy-matches-code.test.ts` derives the stated windows from the job's own
  constants. Newsletter row verified correct — Brevo holds the authoritative list; the
  local row is a signup capture, now disclosed as one.
- **Severity caveats closed for every surface that names a severity.** "8 of 11 show no
  caveat" was wrong both ways: two already carried one, two print no severity word at all
  (colour only; `PolicyBriefCard`'s dot is `aria-hidden`). The four that name a severity
  to a person now render a single shared `<SeverityCaveat />` — one component so that
  **Gate 3b sign-off is a one-line change**. Gate 3b itself stays open and human-owned;
  the guard now asserts `SEVERITY_UNDERWRITER_VALIDATED === false`.

**Score 79 → 81** (F: 7 → 9). Gate is 85 and remains unreachable from inside the repo.
**Loop ends here**: every remaining item in the audit's §6 is either an external fact or
Gate 3b, both human-owned.

Guardrails: `tsc` clean · **4605/4605 unit** · lint/utf8/encoding/i18n/api-auth green.
Commits `60c022bf`, `e8ecbd6b`, `155138ff`, `caa15e9e`, `c5279c76`.

---

## Session wrap — 2026-08-20 (PHASE 6 — Adversarial re-score) — **GATE NOT PASSED (79/100)**

Full write-up: `docs/audits/phase6-rescore-2026-08.md`. Three adversarial agents, every
finding re-verified by hand before action.

**Category E failed on entry** — six false or unsupported public claims were live, two
of them created or missed by this loop:

- **`/trust` promised consent-gating that a live path did not do.**
  `app/api/policies/extract/route.ts` sent whole documents to Gemini with **no consent
  check** (bulk upload via `BatchUploadModal.tsx`). Not just a false sentence — an Art. 9
  disclosure without the basis the product claimed to require. **Fixed in code:** same
  `aiProcessingConsentVersion` gate as the deep pipeline, before the body is read, with a
  new bilingual `AI_CONSENT_REQUIRED` failure code.
- **`/platform` denied a behaviour a rule I seeded this phase exhibits.** "A gap appears
  only when the policy says so" is false for `operator: 'missing'`
  (`missing_coordination_centre`). Copy now separates "not recorded" from "not covered".
- **Live authorization hole, Phase-1 class.** `transferCustomer`
  (`lib/services/team.service.ts`) reassigned a relationship but never revoked
  `AccessGrant`s, so a reassigned agent kept `manage` (incl. **delete**) on that
  customer's whole book forever. Phase 1 fixed *termination* and never asked if that was
  the only way a relationship ends. Now atomic; pinned by
  `tests/unit/access-ends-with-relationship-change.test.ts`, **verified to fail against
  the pre-fix source**.
- **Self-inflicted regression:** removing `isDetected` in Phase 3 silently emptied the
  gap section of every branded/savings report and every run-to-run diff. Both now read
  the rule-decided set (`GapInstance` rows / new `decidedGapSlugs`). Dropping the filter
  would have been worse — `gapResults` is AI prose, not a detection list.
- Also: export-exclusion list corrected (advisor MEDIC data **is** exported), 1-hour
  signed URL cut to 5 min, CI-guard claim narrowed to what it scans, **Sentry disclosed
  as a subprocessor** (it was receiving scrubbed events undisclosed), dead
  `lib/honest-copy.ts` deleted.

**Score 79/100. Ceiling without new external facts ≈84 — the gate (85) is not reachable
from inside the repo.** Blocking facts, in order: underwriter validation of severity
(Gate 3b), a broader authored rule catalogue (**4 rules cover 4 of 16 branches**), ΓΕΜΗ
seat confirmation, court-venue decision, at-rest encryption attestation.

~~**Recommendation: stop the scoring loop at iteration 1 of 3.**~~ **Superseded** — see the
iteration-2 wrap above. Iteration 2 was not rewording: it found a seventh false claim this
wrap had scored as true, and closed the guard blind spot below.

**Known remainder, ranked #1 for the next security pass:** the authorization guard scans
`app/api` only, per-file not per-handler, and **not server actions** — three already
hand-roll their own checks (`agent/actions.ts:1629`, `coverage-insights/actions.ts:36`,
`wallet/actions.ts:1614`). All currently narrower than `getPolicyAccess`, none exploitable
today. Guardrails: `tsc` clean · **4590/4590 unit tests** · lint/utf8/encoding/i18n/api-auth green.

---

## Session wrap — 2026-08-20 (PHASE 5 — Trust & platform surface) — **GATE PASSED**, committed `8629e04f`

**`/trust` and `/platform` shipped** (+ `/en` mirrors, registry-derived so sitemap and hreflang
follow). One rule: every sentence describes what the code does today, with the citation in a
comment beside it. **No DPIA section — none has been carried out**, so per the hard constraint
it is BLOCKED-ON-FACT and stays unwritten. No certification badge, no "bank-grade" anything.

**The neutrality pledge is now a CONTRACTUAL TERM** — Terms §3, both locales: *we do not sell,
share, or transfer policyholder or portfolio data to insurers, banks, or third-party agencies*,
with the one honest carve-out (the advisor you connect yourself). Inserting it renumbered the
ten following sections in both languages.

**Deliberately narrower than a reader expects, twice:** access control says the check happens
in the **application** and that a CI test fails if a route bypasses it — it does **not** claim
database-enforced isolation, because Phase 1 proved there is none. And portability **lists what
does not come out** (payment methods, session/security records, the who-viewed-your-data
history, usage metering, advisor notes).

**`/platform` states its own limit:** the rules cover what someone has written a rule for, not
every gap in every branch. A page that explains a method and hides its boundary is an advert.

**AI incoherence resolved by naming it.** "AI" appeared **26 times in SEO metas and in zero of
the 16 product pages' visible copy** — so the first place a visitor learned a model reads their
document was the consent dialog. `/product` now says it in one sentence, with its limit, linking
to `/platform`.

**Checked and NOT changed:** `/compare` already bridges to the advisor (*"you go to your agent
knowing what to ask"* + *"that is why we also built tools for agents"*) — the channel-hostility
concern is already answered. The insurer reference data is claimed **nowhere** publicly, and the
`/platform` source records why it must stay that way.

**Two repo guards caught me and were right** — descriptions over the 160-char budget, and Title
Case in Greek. Fixing the latter surfaced two genuine detector gaps: `;` is the Greek question
mark and restarts a sentence, and `Παρίσι` is a proper noun like the `Αθήνα` already allowed.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1823 · i18n pass ·
**4584/4584 tests (434 files)**.

**BLOCKED-ON-FACT (unwritten, not claimed):** DPIA; any certification/attestation; database-level
isolation; "complete" export.

**Next:** Phase 6 — re-score against the red-team rubric, re-verifying in code rather than
trusting this loop's own claims.

## Session wrap — 2026-08-20 (PHASE 4 — Regulatory identity & truth defects) — **GATE PASSED**, committed `b3e4a329`

Report: `docs/audits/phase4-regulatory-truth-2026-08.md`.

**The entity is published.** «Insurance Martech Ι.Κ.Ε.» / Insurance Martech IKE, ΓΕΜΗ
188863359000, ΑΦΜ 302659440 (ΔΟΥ Χίου), seat Εντός Οικισμού Καλαμωτής, 82102, Χίος — on the
footer, Terms §1 and Privacy §1, both locales, from one source. Values verified against commit
`ec9d5f81`, which still carries the pre-suppression file headed *"These are the REAL corporate
registry values"*; **its ΓΕΜΗ matches the number the owner supplied independently.** The
concealment guards are **inverted** — the clauses must now contain name/ΓΕΜΗ/seat/ΑΦΜ, and no
"available soon" placeholder may survive.

**Deliberately NOT restored: the court venue.** The old record named the courts of Chios and
`law_venue` renders that field; restoring it would narrow where a consumer's dispute is heard
from "the courts of Greece" to the company's own island. That is a contract change, worse for
the consumer, and nobody asked for it. **Owner/legal decision.**

**Truth defects — all were still live, all fixed:** "Bank-grade security" (no attestation
behind it) → AES-256; "Takes 90 seconds" removed; bulk import said **50 files, which matches no
tier** (10/100/500/∞) → 100; Greek hero promised gap-finding without the Plus attribution the
English carried — and Greek is the binding language; the free-tier promise was hand-typed in
**17 files** → single-sourced; `/api/health` allowlisted (probes were getting a 307 to signin);
dead `/workbox-` removed.

**The guard that should have caught two of these scanned `app/(public)` only** — which is how
false claims lived on the signup and password-reset screens through a marketing audit that
closed with three consecutive zero-finding rounds. It now scans `app/auth`.

**DSR copy matches the machine:** export is immediate but **not complete** (payment methods,
session/security telemetry, the access-audit trail, usage ledgers, agent-authored records are
excluded); deletion is a **request** an admin executes within the statutory month. Chose
request-and-fulfil over automating an irreversible action. "Entire" appears nowhere. Greek
Terms/Privacy confirmed available.

**DSR DRILL RUN AND PASSED — 13/13**, 2026-08-20, dev project (the script refuses prod). Real
`eraseUserData` against a full PII footprint: auth identity deleted, storage PDF removed, Art. 9
profile scrubbed, consent row kept with IP scrubbed, export payload purged, **idempotent
re-run**. First post-remediation drill on record — the July doc describes the pre-fix state. It
also exercised the Phase 1 additions with no FK failure.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1822 · i18n pass ·
**4574/4574 tests (434 files)**.

**Not claimed:** that a grep of *every* numeric/superlative claim across ~120 public URLs in two
languages returns only traceable ones. I fixed the enumerated defects and widened the guard;
a full sweep is a separate audit. **The seat could not be confirmed against ΓΕΜΗ from here** —
it was live until 2026-07-22 and is internally consistent (ΔΟΥ Χίου matches); owner to confirm
it is current.

**Next:** Phase 5 (trust & platform surface) — now unblocked, since Phases 1–4 have all passed.

## Session wrap — 2026-08-19 (PHASE 3 — Gap engine) — **GATE 3a PASSED / 3b BLOCKED**, committed `92fdd155`, `480a082e`

Report: `docs/audits/phase3-gap-engine-findings-2026-08.md`.

**A coverage gap was a model's opinion wearing a severity badge.** Detection came from
`gapResults[].isDetected`, a boolean the LLM chose. Severity came from a hardcoded `"medium"`
at the write site, or from a `low|medium|high|critical` enum the clarity pass emitted **with no
rubric anywhere in the prompt** — and because gap_detection merged first, the literal silently
overrode the clarity value for any slug both flagged.

**Worse: the model authored the catalogue.** When clarity emitted an unknown slug, the
orchestrator CREATED a `GapDefinition` from model output. In prod that ran to completion —
**41 of 41 definitions AI-authored, 35 active**, none with evaluable logic. The drift is
visible: `cyber_risk_gap` (critical) / `cyber_liability` (medium) / `cyber-risk-gap` (medium)
are one risk under three spellings and two severities; `mental_health_exclusion` high vs
`mental-health-exclusion` medium. What a customer was told depended on the model's spelling.

**Now:** `decideGapsForPolicy` evaluates rules against the fresh `AcordData`; severity is the
definition's; the model is handed an existing gap and asked only to word it. `isDetected` and
`severity` are **deleted** from the interface, all three providers and the mock — not ignored.
The mint site is gone. Provenance (`ruleId`/`ruleInputs`/`engineVersion`) is persisted.
The dead third pipeline (`GapAnalysisService.analyzePolicy` + its unimported action) is removed.

**A defect underneath that would have made rules untrustworthy anyway:** `AcordDataSchema` had
`.default(false)` on six coverage booleans, and the SDK materialises defaults — so "the
extractor never mentioned leishmaniasis" was stored as "not covered", and `is_false` read
`!actual`. Unknown is representable now; only explicit `false` is evidence of absence. The
evaluator had **no executable test** before (only source-text regex); it has 15.

**Gate 3b:** `lib/gaps/severity-display.ts` is the single primitive — label, neutral tone,
rank, and the mandatory caveat, with one flag to drop it when an underwriter signs off.
Eleven surfaces still hand-roll severity (eight with no caveat) and are listed as **debt with a
ceiling** in a red-green-proven guard.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1818 · i18n pass ·
**4573/4573 tests (434 files)**. Migrations applied to prod + dev.

**⚠ Consequence, stated not buried:** prod's 41 AI-authored definitions are now **deactivated**
(they can never fire by construction), so **production produces no coverage gaps at all** until
a rule-bearing catalogue is seeded. `gap_instances` was already 0, so nothing was taken from a
user — but the capability is dark. Of ~78 AI-observed gap concepts, rules can decide a handful;
several branches (liability, income protection, group life, legal expenses, personal accident)
have **no typed `AcordData` section at all** to write a rule from.

**Not done:** a live three-gap trace — there is nothing to trace against until a catalogue is
seeded. "One path" is partial: `process-policy` and the manual refresh still call the older
entry point, though both now share the evaluator.

**Next:** seed a rule-bearing gap catalogue (owner + underwriter input), then Phase 4.

## Session wrap — 2026-08-19 (PHASE 2 — Accountability: make access observable) — **GATE PASSED, committed `d795ec05`**

Report: `docs/audits/phase2-accountability-findings-2026-08.md`.

**Every mutating admin action logged; reads did not.** The sharpest case:
`getUserDetails` pulled the whole `policyholderProfile` — chronic conditions, family medical
history, smoking status, income, mortgage — for any customer and wrote **no audit row**. It
was also **pure over-fetch**: its only caller reads 17 fields, none from that relation. So
every customer's health record was loaded into an admin page render and discarded. The
relation is gone; what remains is logged. **Minimise first, then log** — logging access to
data you never needed is the worse repair.

**A correction to my own Step 0, caught by the compiler.** I claimed the advisor playbook was
the same over-fetch ("uses only `profile.ownsHome`"). Wrong — `toLifeContext` consumes
`chronicConditions` and `familyMedicalHistory`. My narrowing would have been a silent
behaviour change; `tsc` rejected it. It is a **genuine Art. 9 read** and is now audited and
flagged instead.

**The right-of-access index backed nothing.** 18 `activityLog.create` sites, only 3 set
`targetUserId` — and **neither shared helper could**, so 15 structurally couldn't name the
subject. `logAdminAction` takes it now; new `logAdminRead` records subject + field **scope**
(classes, never values) + `specialCategory`. Nine read paths instrumented.

**Retention had the matching flaw:** the 5-year window keys on `metadata._audit`, which only
`logAdminAction` stamps — so read-access rows fell into the 12-month bucket and the
right-of-access trail expired four years before the admin-action trail for the same class of
event. Rows naming a subject are accountability records now; the short sweep is their strict
complement.

**`isBreakGlass` dropped** (migration `20260819120000`, applied to **prod and dev** via
Supabase MCP). One writer — a user filing their own deletion request, the opposite of an
emergency override — and zero readers. A column promising a control that doesn't exist reads
as evidence of one.

**Verified:** tsc clean · ESLint 0 · audit:api-auth pass · utf8 1816 · i18n pass ·
**4551/4551 unit tests (432 files)**. New guard `tests/unit/admin-reads-are-audited.test.ts`
**red-green proven**. Retention **observed to have run in prod** (an export payload purged
after expiry — and an earlier "unpurged payload" finding of mine was a SQL-NULL vs JSON-`null`
artifact, discarded).

**Two exclusions stated, not papered over:** (1) ~14 cron jobs still record only "the job ran",
never which subjects they touched — per-subject rows for a bulk sweep is the wrong design;
(2) in prod, all 60 `AGENT_VIEWED_CUSTOMER` rows lack `targetUserId` despite the code setting
it since 2026-07-17 — likely branch divergence; **confirm which build prod runs before
trusting any right-of-access report.**

**BLOCKED (owner/DPO):** notifying subjects of admin access (`registry.ts:1295` — deliberately
a policy decision); disclosing `ActivityLog` in the Art. 15 export; ratifying the 5-year window
for read-access rows.

**Next:** Phase 3 (gap engine — make "rules decide" true). `gap_instances` is 0 rows in prod,
so truncate-and-regenerate is free.

## Session wrap — 2026-08-19 (PHASE 1 — Security: authorization consolidation) — **GATE PASSED, committed `0ddb7605`**

Report: `docs/audits/phase1-authorization-findings-2026-08.md`. Every claim carries file:line
or a named prod query.

**⚠ This work was written on 2026-08-14, DESTROYED by a working-tree revert, and re-applied
on 2026-08-19.** The untracked files (guard test, audit docs) had never been staged, so git
could not recover them. It is now **committed**. In this shared tree, uncommitted security
work is not work — commit before handing off.

**A live IDOR, fixed.** `lib/agent-visibility.ts` granted sight of any policy where
`createdByUserId` matched, with **no relationship-status check**; termination revokes grants
but cannot revoke immutable history. A dismissed agent kept seeing every policy they had
uploaded for that customer across 15 files — including `branded-report`, which serves the
analysis itself — while `relationship-actions.ts:10` promised access had stopped.
`lib/policy-access.ts:140-141` had it right all along. **Live prod exposure: ZERO** (the one
terminated relationship's former customer owns 0 policies), so no data remediation.

**More severe:** `redeemInvite` was an **exported** function in a `"use server"` file taking a
caller-supplied `userId` with **no auth at all** — an unauthenticated path that consumed
invites and wrote AccessGrant/CustomerRelationship rows. Now session-derived. (A subagent had
called this flow SAFE by reading only the page caller, never the export.)

**Also:** `createUserTask` status filter and `requestAiConsent` scope filter (both claimed by
their own comments, neither implemented); orchestrator accepted a bare relationship to read
document bytes and spend tokens; **7 routes consolidated** onto `getPolicyAccess` (also
un-breaking grant-holding advisors); **441 lines of dead duplicate authorization deleted**.

**Erasure guard blindspot closed** — detection now derives User FKs from `@relation` shape,
not 5 hardcoded names, surfacing **8 invisible models**. Two leaked real subject data and are
now erased + exported; six exempt with verified reasons (`CollaborationParticipant`'s old
reason was factually false — threads are never deleted).

**Verified:** tsc clean · ESLint 0 · audit:api-auth 0/0/0/0 · utf8 1814 · i18n pass ·
**4538/4538 unit tests (431 files)**. The new guard is **red-green proven** and was hardened
mid-verification after a probe slipped through on a *comment* mentioning `getPolicyAccess`.
Cross-tenant checks are proven at the decision layer, **not** as live two-session HTTP calls.

**Premise corrections (do not re-inherit):** "Zero registered users" is **false** — prod has 5
auth users, 12 DB rows, 2 policies, 11 storage objects, and `pkaragian@outlook.com` is an
external person owning a policy. `gap_instances` **is** 0, so Phase 3 truncate is free. GO #1's
trio was **never in prod**; the real find was `e2e-money@policywallet.test`, **purged**
(survived the revert — it was a DB change). Storage is **healthier than documented**: all
buckets private with the July limits applied and **no SELECT policy**, so stored URLs are
inert — the feared unauthenticated PDF IDOR does not exist. **One migration unapplied in prod**
(`drop_dead_protection_score_history`), leaving a dead table with 3 rows of per-user scores
outside the DSR export path — Phase 2/4.

**Next:** Phase 2 (accountability) — log admin reads incl. `getUserDetails`; give
`isBreakGlass` a real semantic or remove it (one call site, on user-initiated deletion).

## Session wrap — 2026-08-14 (A failed upload must not leave a half-created policy behind)

**Current phase:** built on `feat/marketing-site-overhaul`, uncommitted. Full guardrail gate
green (audit:api-auth, lint, lint:i18n-changed, lint:utf8, type-check, **4,528 unit tests /
430 files**, production build). No migration, no schema change.

**The bug as reported.** A wallet upload writes the policy row *before* extraction knows
anything, filling the NOT NULL identity columns with placeholders. When analysis never
completed, those survived at `action_needed` and the wallet notice strip printed them raw:
"Αυτοκίνητο · **__PENDING_EXTRACTION__**: λείπουν στοιχεία από το έγγραφο."

**What the investigation actually found — three sentinel sources, not one.** Besides the add
form (`AddPolicyClient.tsx:100/103`) and `uploadAndParse` (`policy.service.ts:353/365`), **the
AI providers substitute `Unknown Insurer` / `PENDING-<epoch>` for an empty extraction on a
SUCCESSFUL run** (`gemini|anthropic|openai-ai.service.ts`), and `buildMetadata` keeps whatever
is stored when the evidence gate rejects a document. So a placeholder reaches perfectly healthy
`active` policies, and discarding failed ones does **not** close the hole on its own.

**Two more holes found on the way.** `runBackgroundAnalysis` awaited `extractBasicSummary` and
**threw the result away** — for every free/Starter user (the majority tier) a failed or
consent-blocked parse left the policy stuck `analyzing` forever, with nothing said. And process
death (`LEASE_EXPIRED`) had no discard path at all.

**Three dispositions, deliberately not collapsed into one.**
- **DISCARD** (technical: provider error, unreadable document, timeout, dead executor) on a
  policy whose identity is *entirely* placeholder → row, document rows and bucket objects all
  removed. **Storage first, database second**: an object that outlives its row is personal data
  no GDPR export can see, so a failed storage delete ABORTS the discard and keeps the row.
- **KEEP** — the same technical failure on a policy someone typed an insurer into is kept and
  marked `action_needed`. A provider timeout must not delete an agent's work.
- **INFORM** — quota / consent / permission never started the run: the upload is kept and the
  reason is said in Greek, from a stable code (`TOKEN_LIMIT_BLOCKED`, `AI_CONSENT_REQUIRED`,
  `ANALYSIS_NOT_PERMITTED`) the UI localizes. Silently deleting a quota-blocked file would make
  the product look broken.

A **96% (`completed_with_warnings`) run is still a success** — verified nothing anywhere
thresholds `overallSuccessPct`, and nothing was added that does.

**The sentinel is now unrenderable, centrally.** `lib/wallet/policy-identity.ts` is the single
owner of the literals (~20 unguarded surfaces adopted it; the 5 divergent inline copies were
replaced), `resolveInsurerDisplay` resolves a placeholder to `""`, and `emit()` scrubs every
notification title/message/subject as a backstop. A repo-scan test fails CI if any file outside
the primitive and the three writers learns the strings again.

**Storage rollback on the create path.** `createPolicy` now removes client-uploaded objects on
every non-persisting path (cap hit, Zod throw, rejected extension, over-cap, transaction
failure) — previously all of them orphaned.

**Counts measured today.** Sentinel-valued policies: **0 in dev, 0 in prod**. Orphaned storage
objects: **34 in dev, 9 in prod** — nine real customer PDFs in production reachable by no
export and no erasure request. `scripts/cleanup-sentinel-policies.ts` (`npm run
cleanup:sentinels`) reports them; **the prod cleanup has NOT been run — it needs the owner's
go-ahead.**

**Environment hazard found and guarded.** `.env.local` declares `DIRECT_URL` twice — dev first,
**prod second** — and dotenv keeps the last, so `npx tsx -r dotenv/config …` reads **production
Postgres** while the Supabase client talks to the **dev** bucket. The cleanup script hard-refuses
to run when the two refs disagree. Any new destructive script should copy that guard.

**Next 3 actions:** (1) decide on running the prod orphan cleanup; (2) fix the duplicate
`DIRECT_URL` in `.env.local`; (3) E2E the upload-failure path locally before merging.

## Session wrap — 2026-08-13b (Feature flags: the automation console's one missing pillar)

**Current phase:** built and gated on `feat/marketing-site-overhaul`. **The migration is
NOT applied to any environment yet** — see "What is left" below.

**The audit first.** Measured against the automation-console brief, this product already has
almost all of it: business events (`/admin/automation/events`), notification/email/push/in-app
templates with preview + test + clone + version, automation rules, **retry rules** and
**escalation rules** (`NotificationRuleOverride.retry*` / `escalation*`), coverage-gap rules
(`/admin/gaps`), AI rules (`/admin/ai/*`), schedules with pause/resume/run-now, queues,
localization, analytics, notification history, automation logs and delivery failures. Every
verb in the brief except one was already wired.

**Feature flags were the gap — and they already existed, as environment variables.**
`FF_AI_FAILOVER_OPENAI`, `FF_AI_DEGRADED_COMPLETION`, `FF_AI_REMEDIATION_ALERTS`,
`FF_AI_REMEDIATION_CANARY_MODE`, `AI_ALLOW_FULL_FAILOVER`, `ENFORCE_EMAIL_VERIFICATION`,
`EXTRACTION_CITATIONS`, each read straight from `process.env` at the call site. They work.
What they cannot do is change: a flip means editing the Vercel environment and redeploying,
so the one control you reach for while production is misbehaving costs a build.

**What shipped.** `FeatureFlag` + `FeatureFlagRevision` (migration
`20260813210000_feature_flags`, additive, new tables only), `lib/flags/registry.ts` (the
catalog), `lib/flags/config.ts` (the resolver), `lib/admin/flag-admin.ts` (pure form logic),
and `/admin/automation/flags`. Precedence on read is **override → environment variable →
the default declared in code**, so no row, or an unreadable database, leaves the product
behaving exactly as it shipped. `withCache` was extracted from `lib/notifications/config.ts`
to `lib/cache/tagged-cache.ts` so both loaders hold one contract rather than two.

Three rules keep it honest:
1. **A flag must be declared in code next to the call site that reads it.** A row for an
   undeclared key is inert. Operators tune flags; they cannot mint one, because a switch
   wired to nothing looks like control and isn't.
2. **NULL is "fall through", not "off".** Clearing an override restores what the deployment
   says. Collapsing those two is how someone disables a feature believing they undid a change.
3. **`extraction.citations` is listed read-only.** It is read synchronously while building the
   extraction prompt and response schema, so moving it into the database would make prompt
   construction async — a change to the extraction contract on the money path, which does not
   belong in an admin-console change. It is shown so its production value is *visible*
   (it IS set in prod), with the reason stated on the card.

**Wired, not decorative:** `remediation-policy.ts`'s five predicates now read the flag layer
(async; callers in `policy-analysis-orchestrator.service.ts` updated), and
`emailVerificationRequired` too. Checked prod env before touching the latter:
`ENFORCE_EMAIL_VERIFICATION` is **not set in production**, so the switch to a slightly wider
boolean parser cannot flip the gate on and lock unverified customers out.

**Also fixed on the way past:** the automation hub had a card titled "Feature flags &
settings" pointing at `/admin/notifications`, which has no flags — that is what sent someone
looking for a flag to the wrong page. It is now "Notification settings", with the real flags
card beside it.

**Verified.** 4,464 unit tests (426 files) green, +19 new pinning the precedence contract.
Full guardrail gate green: `audit:api-auth` 101/101, `lint`, `lint:i18n-changed`,
`lint:utf8` 1806 files, `type-check`. New E2E `tests/admin-feature-flags.spec.ts`, 6/6 under
`admin-chromium` — and deliberately passing in the **degraded** state, i.e. with the table
absent, which is the window this has to survive.

**Protection score rules are no longer hardcoded.** `lib/events/decision-engine.ts` judged
against literals — `current < 40` for the score band, `severity === "critical"` for gap
routing — so moving where "the lowest band" starts, an editorial judgement about Greek
customers rather than a constant, took a deploy. `EventContext` now carries a
`DecisionThresholds` object fed from the EXISTING `NotificationSetting` registry (which
already had a `thresholds` group and an admin surface), via two new settings:
`threshold.protectionScoreLowBand` (40) and `threshold.advisorTaskOnHighGaps` (off).
`DEFAULT_DECISION_THRESHOLDS` reproduces the old literals exactly, and `toContext` defaults to
them, so an empty, unreadable or unmigrated settings table decides what the engine always
decided. The hub gained a **Protection score rules** card showing the live band and deep-
linking to the anchored group.

The engine is still NOT a rules DSL, deliberately. Only numbers and switches moved; the rules
stay TypeScript, because a rule can say "critical, and only when the customer has an advisor
who can act on it" and a table cannot. One floor is deliberately not tunable: a **critical**
gap always reaches a human regardless of the setting — an operator quietly switching that off
would be a defect, not a preference.

**Dead letters can be revived.** Verifying the brief's action matrix rather than asserting it
turned up a real hole: `/admin/automation/queues` counted dead deliveries and stated they "do
not resolve on their own", then offered nothing — a diagnosis with no treatment. A delivery is
parked after 5 attempts with `nextAttemptAt` null, and the sweep only selects
`attempts < MAX_ATTEMPTS`, so it stays parked for ever; behind each row is a notification never
sent or an advisor task never raised for a critical gap. The page now lists them with event,
subscriber, attempts and the killing error, and a per-row Retry. `lastError` is kept on revive
(it is the most useful thing on the row until the retry succeeds) and the action refuses
anything not already dead, so a live delivery cannot be handed a fresh five tries against a
subscriber that is currently failing.

`lib/admin/flag-admin.ts` shipped untested in the flags commit; now 14 cases. Writing them
found a wording defect that would have appeared in every audit log entry ("Set Remediation
audience audience to 50").

**"Version" now holds for AI Rules too.** `aiPromptOverrideRevision` had been written on every
save since that page shipped and read by nothing, so the history existed in the database and
was invisible to the operator — for the setting that changes what the model is told about a
customer's insurance contract, which is the first thing anyone asks about after a bad
extraction. `/admin/ai/prompts/[overrideId]` now renders it in the same shape as templates and
rules. (An earlier draft of this note also claimed `planRevision` was unsurfaced; that was
wrong — `/admin/plans/[planId]` has always rendered it via the `revisions` relation, which is
why a grep for the model name missed it.)

**What is left — needs a decision, not more work:**
1. **The migration is unapplied**, on dev and prod both. Applying it was blocked here (both
   the raw-DDL script and Supabase MCP `apply_migration` were refused by the permission
   classifier). Until it runs, the flags console renders read-only with a banner saying
   exactly that, and every flag resolves through the environment as it does today. Both new
   DB reads degrade rather than throw, so **code and migration can land in either order** —
   there is no deploy-ordering trap. Note the threshold work above needs NO migration:
   `NotificationSetting` already exists.
2. **Not merged to `NEW-UI`**, which is what deploys production on CI-green.

**Next 3 actions:** 1) apply `20260813210000_feature_flags` to dev, then prod (Supabase MCP
`apply_migration` + a manual `_prisma_migrations` row — the Prisma migrate CLI cannot reach
this database); 2) merge to `NEW-UI` when ready, checking first which branch/sha the live
deploy is on, since parallel sessions share this prod alias; 3) next candidates for the same
treatment: the dunning ladder's attempt counts and the renewal-window day counts, both still
literals in the decision engine.
**Last updated:** 2026-08-13

---

## Session wrap — 2026-08-13 (E2E audit re-anchored; all three role sessions verified green)

**Current phase:** `feat/marketing-site-overhaul`, three commits (`11610540`, `f53c2978`,
`b58b82cc`) — **not pushed**. `ui-quality-audit` now runs per session against measured
coverage floors instead of one 75%-of-all-routes fraction, which used to fail on branches
that changed nothing.

**Verified green today, full sweeps on current HEAD:**

| session | routes fully scanned | redirected | overflow / touch / a11y / runtime | verdict |
|---|---|---|---|---|
| `chromium` (policyholder) | 71/94 (floor 71) | 23 | 0 / 0 / 0 / 0 | ✅ 15.2m |
| `agent-chromium` | 79/94 (floor 79) | 15 | 0 / 0 / 0 / 0 | ✅ 17.2m |
| `admin-chromium` | 95/108 (floor 95) | 13 | 0 / 0 / 0 / 0 | ✅ 18.6m |

**All three sessions green — the first time every role's surface has passed on one HEAD.**
Route accounting closes in all three (71+23=94, 79+15=94, 95+13=108) — no route left a sweep
silently. Each landed exactly on its floor, which is what the floors were measured from.
Baseline before `b58b82cc`: agent 10 touch + 18 a11y + 5 runtime; admin 46 touch (26
distinct) + 18 a11y + 1 runtime; chromium's own run never finished (see below).

**The admin-console "touch target" findings were never defects.**
`/admin/billing-reconciliation` (9–13×24), `/admin/insurers` (16×24) and `/admin/partners`
(11×24) are all `<input type="checkbox">` inside a `<label class="flex items-center gap-2">`
that wraps the text as well — clicking anywhere in the row toggles them, so the row IS the
target. The label rule added in `b58b82cc` exempts them correctly.

**The 75-minute budget was the fix it looked like.** The policyholder sweep had never
finished: its 14:45 run hit the then-45-minute budget at route 80 and named 14 routes as
never loaded (61/94 scanned), which is what prompted the raise in `b58b82cc`. Re-run tonight
on the raised budget it completed in **15.2 minutes** and reached all 71 — including the
alphabetical tail it had been dying in (`/product/pension` … `/wallet/add`, of which
`/wallet`, `/tasks`, `/renewals`, `/questionnaires`, `/upgrade` are role-dependent and so
had never been audited as a policyholder sees them). The 45→75 change bought headroom that a
warm `.next/dev` cache then made unnecessary; keep it anyway, since a genuinely cold sweep is
the case it exists for.

**`P1017` is the flake to expect here.** The agent sweep's earlier
`PrismaClientKnownRequestError` on `/dashboard/agent` (`getRecentNotifications` →
`getAuthenticatedUserOrNull`) is the remote dev DB closing an idle connection during a
30-minute sweep; it did not recur today. A red agent run on that line alone is the
environment, not the page.

**Next 3 actions:** 1) run the CI guardrails (`audit:api-auth`, `lint`, `lint:i18n-changed`,
`lint:utf8`, `type-check`, unit tests, build) and push the three commits; 2) the E2E audit is
now only meaningful as all four projects together — `--project=chromium --project=agent-chromium
--project=admin-chromium --project=sentry`, ~50 min warm; treat a single-project green as
partial; 3) unchanged from below — the seeded prod accounts still need deleting.
**Last updated:** 2026-08-13

---

## Session wrap — 2026-08-12 (Settings rebuilt: sub-routes, honest controls, one preference surface)

**Current phase:** built and gated locally on `feat/protection-intelligence-dashboard`;
**not committed, not pushed.** 4,390 unit tests, full guardrail gate and production build
green. Zero axe violations across all six settings routes at 375px and 1440px; zero
horizontal overflow at 320/375/390/430/768/1024/1440.

**What changed.** `/account` went from one route with three React-state tabs to a settings
shell with five real sub-routes (`/profile`, `/plan`, `/security`, `/notifications`,
`/privacy`), each with its own loading and error boundary and a focused loader in
`app/(protected)/account/data.ts`. Desktop gets a persistent rail with per-section
descriptions; mobile gets index → detail with a back header, switched in CSS. `/agent/settings`
renders in the same shell, so an advisor sees one settings IA. Legacy `?tab=` links redirect
(`lib/settings/sections.ts`), and the email footer now points straight at
`/account/notifications`. New shared primitives: `ui/form/Switch`, `settings/SettingsShell`,
`SettingsNav`, `SettingsSection`, `SettingRow`, `InlineEditRow` (idle→editing→saving→saved→
error, inline not toast).

**The honesty pass — controls removed because nothing backed them.** `ActiveSession` is
written **only in `prisma/seed.ts`**, so the "active sessions" list was always empty and
"sign out everywhere" deleted nothing and revoked no Supabase session; it now calls
`signOut({scope:'others'|'global'})`, which is real. The audit trail hardcoded device
"System", location "Unknown" and `success: true`, and had no label for `login_success` —
**the only login event anything writes** — so every sign-in printed the raw key to the user.
`Invoice` and `PaymentMethod` are written nowhere outside the seed (the invoice table and
saved-card panel could never fill); billing now points at the Stripe portal, where they
genuinely live. Also removed: always-zero wallet credits, the always-empty `usageMetrics`
block, a "Download report" button with no handler, an unrendered phone-edit state, and a
`mobileProps` prop costing two DB queries plus a full policy mapping that no component read.

**New capability wired to existing backends.** Change password (the `updatePassword` action
had worked with no UI for months — now behind a current-password re-auth and a rate limit),
phone editing, and consent history from `ConsentAudit`, which has recorded every acceptance
since launch and had never been shown to the person who gave it.

**Notification preferences consolidated.** `/notifications` shipped a second, contradicting
preferences UI whose catalog listed `pending_questionnaire` and `policy_reviewed` (no sender
reads either) and exposed `renewal_milestone` standalone while the settings group governs it —
so a stream switched off in one screen could be half-revived in the other. It now owns history
only; the sender registry is the single catalog.

**Latent CSS bugs fixed on the way past:** `.pw-btn` is not defined in `globals.css`, so the
quiet-hours and push buttons **inside Settings** rendered with no fill or radius
(`RiskReviewCard` too); `arc-text`/`arc-text-muted` were deleted from the stylesheet but still
used in `TokenUsageCard`, flattening its hierarchy.

**Open — owner decisions, not blockers:** email change still takes effect with no verification
(`email_confirm: true`); the UI now states the consequence and confirms, per decision, but auth
is unchanged. `wallet/[id]` still advertises a "free full analysis" that no code grants
(`aiAnalysisPerMonth: 0` on free/plus, `FREE_LIFETIME_QUESTIONS = 0`) — not surfaced in
Settings, worth fixing at the source.

---

## Session wrap — 2026-08-11 (Protection-intelligence redesign: dashboard, policy brief, renewal outlook)

**Current phase:** ✅ **SHIPPED.** Merged as `71b943f2` (PR #271, squash — carries
`ac829bde`'s content, which had separately merged as #270/`954597ca`, so the trees were
identical) and **deployed to production 2026-08-11 ~16:45 UTC**; site verified healthy.
First CI run on the merge failed on the KNOWN flake (`batch-upload-modal › attaches each
file to the policy that file became` — #269's suite; fails under full-suite CPU
contention, passes alone and on rerun) which also skipped the first deploy; rerun went
green and deployed. 4,344 unit tests, full guardrail gate, production build all green.
Local Playwright: 20/22 passed; the 2 `theme-state-cascade` failures are a PRE-EXISTING
audit-harness false pairing on the homepage chips (audit combines a declared state's bg
with the unchecked fg; real rendered state is white-on-green ~5.8:1) — documented on PR
#271 and in the browser-measurement-traps memory; that spec fails on `/` on every branch
until fixed.

**What shipped.** The policyholder dashboard rebuilt around protection intelligence, all
from existing unsurfaced data: `ProtectionStatusHero` (score + delta from
`RiskProfileVersion` history + biggest factor + honest empty/provisional/indeterminate
states), `AttentionList` (risk → why → next step from recommendation `personalReason`/
`timing`), `ProtectionPlanCard` (persistent X-of-Y from recorded facts; absorbs the
localStorage checklist), `ProtectionMonitorCard` (the `monitorRisk()` watch, surfaced at
last — pro-gated via new `protection_monitoring` gate backed by `advancedAnalytics`;
free tier gets a future-tense capability card), life-event prompt (anchors
`/coverage-insights#life-events`). Policy page gained the seven-row `PolicyBriefCard`
(covered / not covered / exclusions / limits / overlaps / gaps / renewal — every line
carries its evidence boundary; overlap attribution shares `insuredSubject` with the
engine) and `RenewalOutlookCard` (`#renewal`, facts-only checklist, tier-truthful
reminder promise from the shared milestones module). Dashboard renewal rows deep-link
`#renewal` with the SAME checklist count.

**Deliberately not claimed:** premium change at renewal (renewalHistory stores no
premium), coverage-change diffs (analysisComparison endpoint has no UI), monitor "daily"
cadence (cron only refreshes existing score rows).

**⚠ Environment finding (pre-existing, NOT fixed here):** `.env.local` line 9 sets
`POOLED_DATABASE_URL` to the **PRODUCTION** pooler (`cquudefwfwrmvpftuhyl`), and
`lib/db.ts` prefers it — local dev has been reading/writing PROD data while auth talks
to the dev project (this also made every login bounce-loop: auth user exists, prod
`users` row doesn't). Line 16 additionally re-defines `DIRECT_URL="https://policywallet.gr"`
(bogus). Verified by pointing the app at the dev DB (both vars neutralized) — everything
works. **Owner decision needed: remove/replace both lines.** Two anonymous cookie-consent
POSTs from this session may have written rows to prod.

**Follow-ups, all three closed same day (owner said "proceed"):**
1. **`.env.local` FIXED** — lines 9 (prod `POOLED_DATABASE_URL`) and 16 (bogus
   `DIRECT_URL="https://policywallet.gr"`) commented out with evidence notes; backup at
   `.env.local.bak-20260811`. Verified via `@next/env` that the app now resolves the dev
   project with no shell overrides.
2. **Batch-upload flake root-caused and fixed** — NOT contention: the save-all button
   renders only when a row is READY and stays disabled while extracting; six tests
   clicked right after the ROWS rendered. All clicks now go through a wait-for-enabled
   helper. PR #272 (`fix/deflake-batch-upload-save-all`), suite 11/11 consecutive runs.
3. **Stale-recommendation + delta mechanics verified on dev** — an engine re-run
   auto-dismissed `no_agent_connected`/`no_health` (syncStats dismissed: 2) and wrote
   RiskProfileVersion v1. Bonus: the new score (90, but 21/22 risks undecided) rendered
   the hero's INDETERMINATE state live — "we don't know enough" instead of the number,
   exactly as designed. The delta chip appears once a v2 exists (derivation unit-tested).

**Top risks ranked:** 1) working tree still carries another session's uncommitted work
(auth pages, instrumentation-client, landing/guides content, gap-report + tests) — do
not sweep it into commits; 2) `theme-state-cascade` audit false-pairs declared-state
colors and fails on `/` on every branch until fixed (documented, PR #271 comment);
3) two anonymous cookie-consent rows may have been written to prod by the mispointed
local dev before the env fix.

**Next 3 actions:** 1) ~~merge PR #272~~ — merged as `3baf929e`; 2) ~~fix the
state-cascade audit~~ — merged as `194c9b2c` (PR #273): rules joined per (element,
state signature) + var()-token resolution via scope-correct probe; proven red-green
against the live homepage, full crawl 116/116 pages green in both themes; 3) delete
`.env.local.bak-20260811` once the owner confirms the env cleanup.
**Last updated:** 2026-08-11

## Current phase
Late pre-GA staging → **Greece GA** (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`). Active workstream: **mobile-first responsive refactor** (Step 0 investigation → shared primitives → page-by-page: B2C wallet → dashboard → policy → analysis → B2B dashboard). Branch: `NEW-UI`.

## GO checklist (prod flip is last, always)
1. Delete + rotate **seeded test accounts** (`ph1@` / `agent1@` / `mixed@example.com`) — known default password, **live in prod DB now**
2. Confirm prod env on preview deploy: storage curl, Stripe test checkout, Sentry live event
3. DPO sign-off — privacy wording, badge accuracy, Greek-language terms
4. Underwriter sign-off — CoverageEnvelope severities (placeholders until then; **never surface as authoritative in any UI**)
5. Flip prod

## Waiting on humans (long-lead — start now; not agent-fixable)
- Underwriter validation of CoverageEnvelope severities
- DPO: named legal entity + AFM, processor list, retention periods, cookie table, Greek `/terms` `/privacy`
- Legal: **Art. 9 lawful basis** for agent→customer add-policy (flow stays blocked until decided)

## Top launch risks (ranked — GA-gating only)
1. ~~**High — public site false claims**~~ **RESOLVED (verified 2026-08-20).** The fabricated stats and testimonials are gone; `lib/landing/content.ts:16-21` records the deletion and `lib/seo/team.ts` is `[]` by design. An exhaustive numeric/superlative/social-proof sweep this phase found **no** invented figures, testimonials or logo walls left. Remaining copy risk is narrower and tracked in `phase6-rescore-2026-08.md` §6: SEO metadata on several pages still implies broader gap-finding than **4 rules** support.
2. ~~**High — AI-processing consent gate (Art. 9)**~~ **RESOLVED (verified 2026-08-20).** Migration and `User.aiProcessingConsentVersion` shipped; **both** paths that send bytes to a provider are now gated — the deep pipeline *and* `app/api/policies/extract/route.ts` (the upload/bulk path, which was ungated until this phase). Pinned by `tests/unit/access-ends-with-relationship-change.test.ts`.
3. **High — seeded accounts in prod** (= GO #1; 5-minute human action).
4. **High — auth gaps**: no production passkey/biometric verification; 30-day session persistence untested.
5. **Medium — Privacy page over-claims**: "GDPR export/deletion workflows available" — DSR executors unconfirmed. Ship or soften wording.

## Post-GA debt (tracked, not gating)
- Scope gaps: `analysis-runs/[runId]` grant not `policy:<id>`-scoped; `createUserTask` / `submitQuestionnaireResponse` ownership checks; user-callable `jobs/process-policy` (has owner gate — question is whether it should be cron/admin-only).
- Site consolidation (audit §E): homepage↔`/product` overlap, 7× category duplication.
- Motor broker-demo gaps (`docs/demo/motor-demo-path.md`).

## In progress
- Responsive refactor Step 0 (written report before any code changes)
- Public-surface cleanup per audit punch-list order (§A copy → §B inconsistencies → §C/§D legal EL)
- Phase 1 login hardening

## Decisions (settled — don't re-litigate)
- Revolut integration **deferred**: no API path; `bundledCover` self-declaration designed, `policySource` data model reserved.
- RevenueCat **out of scope** (web-Stripe product).
- Responsive/i18n/gap-dedup/severity-gating fixes go in **shared primitives, never per-page**.
- Greek strings run ~20–30% longer than EN — handled in primitives layer.

## Next 3 actions
1. **Today, human, 5 min:** delete + rotate seeded accounts in prod DB.
2. Pull §A false claims + testimonials from the live site; fix §B cheap inconsistencies (free-tier 2→3 in `/product` FAQ, one email domain, placeholder phone, `0/0/0` stat band).
3. Run the responsive Step 0 investigation prompt; paste report back for assessment before Step 1.