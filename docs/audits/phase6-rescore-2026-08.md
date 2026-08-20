# Phase 6 — Adversarial re-score of the public surface
**2026-08-20 · iterations 1–2 of a maximum 3**

> The rubric this scores against lived in `docs/audits/public-surface-strategy-redteam-2026-08.md`,
> which was **destroyed** by the working-tree revert described in
> `docs/audits/phase1-authorization-findings-2026-08.md` and is unrecoverable (it was
> untracked). The category definitions and weights are restored below from the
> brief that produced it. That restoration is itself an unverified inheritance and
> is labelled as such.

---

## 0. How this was run

Three adversarial agents, none told what answer was wanted:

1. **Claim falsification** on `/trust` and `/platform` — instructed to hunt for live,
   reachable counter-examples rather than accept the pages' own citation comments.
2. **Numeric / superlative / social-proof sweep** of the entire public surface.
3. **Regression verification** of all eight invariants this loop claims to have
   established.

Their findings were then **re-verified by hand** before any was acted on. Two prior
agents in this programme returned confident falsehoods, so agent output is treated as
a lead, not a result. Every fix below cites the check that confirmed it.

---

## 1. Category E failed. The loop did not pass on the first pass.

The user's gate: *"If category E (diligence survivability) is not 15/15, the loop has
failed regardless of total."* It was not. **Seven** distinct false-or-unsupported
public claims were live — six found in iteration 1, and a seventh (E-7) that iteration 1
itself scored as true. The worst two were created or missed by this very loop.

### E-1 — `/trust` promised consent-gating that a live upload path did not do (**FALSE**)

`app/(public)/trust/TrustSections.tsx:114` told the reader:

> *"Analysis starts only after you give explicit consent. Without it, the document
> never leaves for a model provider."*

`app/api/policies/extract/route.ts` base64-encoded the **whole document** and sent it
to Gemini with **no consent check of any kind** — only quota and spend gates. Verified
directly: `grep -n "consent" app/api/policies/extract/route.ts` returned **nothing**.
Reachable from `components/wallet/BatchUploadModal.tsx`, the bulk-upload flow, which
never collected consent (only the single-add flow did, and even there it gated the
deep run, not extraction).

This is the most serious finding of the whole programme: not merely a false sentence,
but a genuine Art. 9 disclosure to a processor happening without a lawful basis the
product itself claimed to require. The orchestrator's own comment named the exception
(*"extraction runs at upload … and never reaches this deep pipeline"*) — the fact was
recorded in code and simply never followed through to the claim.

**Fixed in code, not copy.** The route now performs the same
`aiProcessingConsentVersion` check the deep pipeline does, **before the request body is
read**, and returns a new `AI_CONSENT_REQUIRED` failure code with bilingual
user-facing text.

### E-2 — `/platform` denied a behaviour that a rule seeded **this loop** exhibits (**FALSE**)

`PlatformSections.tsx:86` said *"A gap appears only when the policy says so. Silence is
not evidence of absence."* But `evaluateAcordFieldCheck`'s `missing` operator fires
precisely **on** silence, and `missing_coordination_centre` — one of the four rules
**I seeded to production earlier in this same phase** — uses it.

The rule's own wording is careful ("not recorded", never "not covered") and
`prisma/seed.ts:448-450` is candid about the distinction. The *page* was the
over-claim. Step 04 now separates the two cases explicitly, and the citation block
records the `missing` operator as the reason.

This is the clearest instance of the failure mode this programme exists to catch: a
true-sounding absolute, written one phase, falsified by an action taken in the next.

### E-3 — `/trust` mis-stated what the data export withholds (**FALSE**)

The page listed *"what your advisor recorded about you"* among things **not** included.
`lib/services/compliance.service.ts:342-359` in fact exports the advisor's structured
MEDIC assessment (`medic`, `medicScore`, `medicUpdatedAt`); only free-text `notes` and
`estimatedCommission` are withheld. Corrected to say exactly that.

Worth noting the direction: the export was **more** generous than advertised, which is
right for a data subject. The claim was still false.

### E-4 — "expires within minutes" was contradicted by a live 1-hour link (**OVERSTATED**)

The document-open path is correct (300 s). But `documents/route.ts` POST returned a
`signed_url` minted for **1 hour**. No client reads that field
(`grep -rn "signed_url" app components lib` → no consumers), so **the code was
changed, not the sentence**: it now uses `DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS`, the
same 5 minutes as the download path.

### E-5 — the CI-guard claim was broader than the guard (**OVERSTATED**)

*"A CI test fails if a route is added that bypasses it."* The test is real,
filesystem-derived and in CI — but it scans **`app/api` only** and matches **per file,
not per handler**. A counter-example already exists: the `DELETE` handler in
`documents/[docId]/route.ts` hand-rolls its own ownership check and passes because the
`GET` in the same file calls `getPolicyAccess`. (That instance is *stricter*, so not a
live hole — but it disproves the promise.) Server actions are not scanned at all, and
`agent/actions.ts:1629` already hand-rolls a `policy:${id}` grant lookup.

Copy was narrowed to *"scans the API routes"* in iteration 1. **Iteration 2 widened the
guard instead** — per HTTP handler, plus the whole server-action surface — so the copy
was restored to the broader claim, which is now true. See §6.1.

### E-6 — Sentry was an undisclosed subprocessor (**MISSING**)

Sentry receives scrubbed error events from client, server and edge
(`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) and
was **absent from the privacy policy's subprocessor table**. Added in both locales;
the parity test's expected list went 9 → 10.

### E-7 — `/needs` promised six questions and asked twelve (**FALSE**) — *found in iteration 2*

`NEEDS_STEPS.length === 6`, but `NEEDS_QUESTIONS.length === 12` (2,2,1,3,3,1 across the
six steps). The H1 and both SEO strings said *"six questions"*, in both languages.

**This one indicts iteration 1's own method.** The sweep agent classified it
`[FRAGILE, currently TRUE]` — "accurate today (6 steps in `lib/needs/questions.ts`)" —
conflating steps with questions. I recorded that verdict in §6.7 below **without
counting the questions myself**, and then scored category E as 15/15 with this claim
live. The standing rule for this whole programme is *"do not trust prior session output
including your own"*, and an agent's arithmetic is exactly the kind of inheritance it
was written for.

Fixed: the headline now derives from `NEEDS_STEPS.length`, the metadata says *steps*,
and `needs-check.test.ts` pins both. The first version of that guard failed on **its own
explanatory comment** containing the banned phrase — the mention-vs-use trap, for the
third time in this programme — so it strips comments before matching.

---

## 2. A real authorization hole, of the same class as Phase 1's

Not a claim defect — a live vulnerability, found by the regression agent and confirmed
by hand.

`lib/services/team.service.ts` `transferCustomer` reassigned a `CustomerRelationship`
to a new agent but **never touched `AccessGrant`**. Every policy an agent adds for a
customer auto-mints a `manage` grant, and `computePolicyAccess` derives
read/write/**delete** from the grant level **alone**, deliberately never re-checking
the relationship. So a reassigned agent kept full manage rights over that customer's
entire book **forever**, with no relationship to them at all — reachable from the
agency-owner "Transfer Customer" button.

Phase 1 fixed *termination*. It never asked whether termination was the only way a
relationship could end. It wasn't.

Fixed: the reassignment, the grant revoke, the opportunity handover and an audit-log
entry now happen in **one `$transaction`** — a partial apply here is itself an access
leak. Pinned by `tests/unit/access-ends-with-relationship-change.test.ts`, which was
**verified to fail against the pre-fix source** rather than merely passing against the
new one.

---

## 3. A regression this loop introduced and did not catch

Phase 3 removed `isDetected` from the AI interface. Two consumers still filtered on
it, so both had been silently returning **nothing** ever since:

- `lib/services/reports/savings-report.ts:81` — the "Coverage Gaps" section of every
  customer and agent branded report went out **empty**, even for policies with real
  rule-detected gaps.
- `lib/services/analysis/analysis-comparison.ts:134` — run-to-run gap diffs could
  never report a gap appearing or disappearing.

The naive fix (drop the filter) would have been **worse than the bug**:
`resultJson.gapResults` is a bag of AI **prose keyed by slug**, not a detection list,
so rendering it would print gaps the rules never found — precisely the over-claim
Phase 3 existed to remove. Both now read the rule-decided set: the report from
`GapInstance` rows, the diff from a new `decidedGapSlugs` field the orchestrator
records on each run. Runs analysed before that field existed yield no gap changes —
now because the data is genuinely absent, not because of a filter that never matches.

`lib/honest-copy.ts` (435 lines, unreferenced anywhere) was deleted; its
`'Available soon'` placeholder contradicted the Phase 4 test asserting none survives.

---

## 4. What the sweep did NOT find — the surface's real strengths

Reported because a red-team that only reports faults is not calibrated:

- **Social proof: clean, by construction.** No user counts, no testimonials, no star
  ratings, no insurer logo wall. `lib/seo/team.ts` is `[]` by design. In-code comments
  record the deletion of fabricated "10k+ active users", two invented testimonials, and
  a fake "47 Πελάτες" agent stat. Demo widgets use "Client A/B/C" specifically to avoid
  putting words in the mouth of a customer that does not exist.
- **Neutrality holds.** No code path sends policyholder or portfolio data to an
  insurer, bank or agency. Brevo gets an email address and marketing attributes;
  partner offers are read-only and render nothing until an admin activates one. The
  Terms §3 clause backing the pledge exists verbatim in both locales
  (`legal-content.ts:106-114`, `:577-585`). `AgentProfile.commissionRates` is the
  **agent's own** bookkeeping, not PolicyWallet revenue — checked, not assumed.
- **Superlatives: already hardened.** No "bank-grade", no "seconds", no "100% accurate".
  `no-overpromise-copy.test.ts` actively bans the speed claim. The one "bank-grade"
  hit in the repo is a comment saying the page deliberately does *not* say it.
- **Pricing and limits: every figure derived or exact.** All B2C and agent tier prices,
  policy caps, analysis caps, retention windows, cookie durations and the
  "16 kinds of insurance" count check out against `plan-defaults.ts`,
  `privacy-retention/route.ts` and `catalog.tsx`. The product count is computed from
  `productCategories.length` rather than typed.

---

## 5. Score

Categories and weights restored from the original brief (see the header caveat).

| | Category | Weight | Score | Note |
|---|---|---|---|---|
| A | Category framing | 15 | **11** | `/platform` + `/trust` give the method a name and a boundary. Still described mostly as features rather than a defensible category. |
| B | Asset legibility | 15 | **10** | Provenance, envelope schema and the neutrality clause are legible and cited. The rule catalogue is **4 rules** — a real asset, but a thin one, and the pages now say so. |
| C | Compliance | 20 | **16** | Entity published on every Art. 13 surface; DSR drill 13/13; Sentry now disclosed. Held back by retention promises with no enforcing job (§6.3). |
| D | Neutrality | 15 | **15** | No erosion found on any axis, contractually bound, independently re-verified this phase. |
| E | Diligence survivability | 15 | **15**\* | \*After **two** rounds of remediation. It was not 15 when this phase began, and it was not 15 when iteration 1 claimed it was — see E-7. |
| F | Integrability | 10 | **9** | One authorization decision function, one gap engine, versioned provenance — and the guard now covers API routes **per handler** and the **server-action surface**, with 14 exemptions each carrying a reason. |
| G | Distribution | 10 | **5** | Unchanged this loop; SEO metadata for several pages still asserts gap-finding more broadly than four rules support. |
| | **Total** | **100** | **81** | |

**GATE: NOT PASSED.** Total 81 < 85. No category below 60 %; E is 15/15 only *after*
the fixes in §1. The honest reading is that the gate **failed on entry**, failed again
on iteration 1's own scoring (E-7), and the score above describes the state after both
rounds of remediation.

**Ceiling without new external facts: ~84.** A/B/G are limited by things no amount of
code discipline can supply — a validated severity scale, a broader authored rule
catalogue, and any distribution evidence. The gate is **not reachable** from inside
the repository.

### External facts required, in dependency order

1. **Underwriter validation of severity thresholds and labels** — Gate 3b. Blocks
   presenting severity as authoritative anywhere. Owner: a licensed underwriter or
   the ΕΙΑΣ-qualified intermediary. *(Unchanged and still the single largest blocker.)*
2. **A broader authored rule catalogue** — 4 rules cover 4 branches of 16. Every
   product page implying per-branch gap-finding is thin until this grows. Owner:
   domain author, then underwriter review.
3. **Confirmation of the registered seat against ΓΕΜΗ** — carried from Phase 4.
4. **A decision on the court venue** — deliberately left generic; narrowing it is a
   legal choice, not a transparency one.
5. **Independent attestation for at-rest encryption** — currently a restatement of
   Supabase's platform guarantee, which this repo cannot evidence.

---

## 6. Honest remainders — NOT fixed

1. ~~**The authorization guard does not scan server actions.**~~ **CLOSED (iteration 2).**
   The guard now checks API routes **per HTTP handler** — which immediately surfaced the
   `DELETE` in `documents/[docId]` hand-rolling its own ownership filter behind a
   compliant `GET`, now on the single path — and scans the **server-action surface**.
   All 14 policy-touching actions were read and verified: every one authorizes, several
   deliberately narrower than `getPolicyAccess`, **no live hole**. Each is listed in
   `ACTION_EXEMPT` with its reason. Both new checks were verified to fail against the
   pre-fix source. The `/trust` copy was restored to the wider, now-true claim.
2. **Severity caveats — CLOSED for every surface that names a severity (iteration 2).**
   The "8 of 11 show no caveat" figure was wrong in both directions. Audited all eleven:
   two already carried one (`CoverageInsightsClient` renders `recPriorityNote`;
   `ClientOverviewTab` carries a better, surface-specific line — *"not an assessment of
   insurance adequacy"*), and two print **no severity word at all** — colour only, with
   `PolicyBriefCard`'s dot `aria-hidden`, so a disclaimer there would be noise rather
   than honesty. The four that genuinely name a severity to a person now render
   `<SeverityCaveat />`, pinned by `CAVEAT_REQUIRED`. One component, so sign-off is a
   one-line change. **Gate 3b itself remains open and is not closable by code** — the
   guard now also asserts that `SEVERITY_UNDERWRITER_VALIDATED` is still false.
   Migrating those four colour maps onto `describeSeverity()` is still outstanding, but
   that is tidying, not a truth defect.
3. ~~**`MonetaryLimitSchema.unlimited` still carries `.default(false)`**~~
   **CLOSED (iteration 2).** Now `.optional()`. The AI SDK materialises Zod defaults
   into the returned object, so the default had been storing an explicit "not unlimited"
   on every limit the extractor never determined — indistinguishable from the model
   saying so, and precisely what an `is_false` rule ignores silence to avoid. Undefined,
   false and true are now three distinct states. The v3 schema test asserted the default
   rather than the intent, and was corrected with the reason recorded.
4. **Retention: resolved as a disclosure gap, not an enforcement gap (iteration 2).**
   Traced each table: `TokenUsage`/`MonthlyTokenUsage` are **deliberately** retained as
   financial ledgers keyed to the anonymised row, and `ConsentAudit` minus ip/user-agent
   as proof of consent — both listed as documented exceptions in
   `gdpr-erasure.service.ts:24-32`, so purging them on a 12-month timer would be wrong,
   not right. `Session`/`ActiveSession` are deleted by erasure but never time-swept.
   The real defect was that the privacy table was **silent** about session records and
   about public-form captures entirely. Both are now listed, and
   `tests/unit/retention-copy-matches-code.test.ts` derives the stated windows from the
   job's own constants — change `FORM_SUBMISSION_RETENTION_DAYS` and CI fails rather
   than the policy quietly becoming false.
5. ~~**Newsletter retention may not match its promise.**~~ **RESOLVED (iteration 2).**
   Verified: `app/api/v1/newsletter/subscribe/route.ts` writes the `FormSubmission` row
   **before** calling Brevo, explicitly so "a Brevo outage must never lose the
   subscriber", and there is no in-app unsubscribe — unsubscription happens on Brevo's
   list. So Brevo holds the authoritative subscription state ("until you unsubscribe" is
   true of it), and the local row is a **capture record** of the signup event, deleted at
   24 months. The claim was not false; the table was incomplete, and the capture record
   is now disclosed as its own category.
6. **~80 external Greek market/tax figures** across guides and product pages (ENFIA
   percentages, Schengen minimums, statutory deductibles) cannot be checked against
   this repository. Internally self-consistent; flagged as a class for external
   fact-checking, not asserted as correct.
7. ~~**`/needs` "six questions"** is hardcoded … True today, unprotected against drift.~~
   **WRONG, AND CLOSED (iteration 2).** It was not true: six steps, **twelve questions**.
   This entry is left visible rather than deleted, because the error it records — taking
   an agent's "currently TRUE" without counting — is the one worth remembering. See E-7.

---

## 7. Iteration status

**Iterations 1 and 2 of 3 complete.**

*Iteration 1* — six false or unsupported public claims removed, one live authorization
hole closed, one self-inflicted regression repaired. It also recommended stopping, on
the grounds that further iterations could only reword.

*Iteration 2 proved that recommendation premature*, which is the useful result. Going
back over the ground turned up a **seventh false public claim** that iteration 1 had
scored as true on an agent's say-so (E-7), and closed three of the seven remainders —
including the guard blind spot that let the `DELETE` handler keep its own copy of the
ownership rule. Neither was rewording. Score 79 → **81**.

**Now the recommendation stands.** What is left in §6 is either factual (items 4–6,
needing external confirmation) or disclosed debt whose repayment is gated on Gate 3b.
Iteration 3 would not move the total, and the remaining blockers in §5 belong to their
named owners, not to another scoring pass.
