# Agent workspace implementation — in progress

Implementation of the owner-approved B2B plan, begun September 21–22, 2026. The implemented subset is being prepared for production; this is **not acceptance sign-off for the full plan**. Branch: `codex/agent-workspace`.

## Implemented

- Live relationship scopes for seats, customer counts, team counts and portfolio intelligence; policy visibility remains central. Risk intelligence no longer reads an agent's customer's entire owner portfolio or owner-only historical snapshot. Portfolio intelligence uses explicit pages of 20 with failed/unknown assessment counts instead of silently truncating at 60.
- Dashboard action queue moved above KPIs. Current queue now includes renewals, pending source-review findings, missing policies and the existing due-task slice. Finding counts remain distinct from detected gaps. Lifecycle resolution shared with the customer-directory renewal KPI; its caption names customers and the 30-day window. Portfolio facts replace misleading completeness/health percentages. Commission is identified as estimated commission.
- Active coverage separated from expired policies; extraction distinguished from human confirmation. Authored questionnaire titles localized. Completed onboarding collapsed and licence status taken from the same verification state as settings. Customer removal is a separate disclosure; customer-page AI copy addresses the agent.
- Multi-file serial upload selection, per-file customer confirmation, skip/retry and independent successful saves. Unsaved files are explicitly session-only. Signed, actor/hash/version-bound scan handoff lets unchanged intake extraction populate the existing document cache after validated ingestion. Cache validity follows document and processing versions, not a 24-hour timer. Local pipeline steps no longer receive invented model-token estimates.
- Greek compatibility-glyph normalization and commercial schedule classification corrections. Mixed documents with a scanned cover force visual classification. Model input no longer calls truncated supplied pages a complete document.
- Optional second-provider extraction reading, with separate consent/quota checks and six-field comparisons. Disagreement, missing fields and unavailable verification remain review states; model agreement is never human confirmation. Raw model output cannot mint human confirmation. Review remains required for missing fields even when the model claims otherwise.
- Private AI assistance and immutable communication revisions behind `AGENT_REVIEW_WORKSPACE=1`. Private advice is stored separately from customer text. Feedback accepts/edits/rejects/defers; reuse requires an explicit opt-in and is restricted to the same agent and policy. No shared-model training.
- Approval binds text, recipient, language, channel and source snapshot. Edits create a revision; stale sources block approval/delivery. In-app delivery copies only approved customer text, atomically records the message and makes retries idempotent. Pending relationships cannot deliver. The timeline refreshes after delivery. GDPR export/erasure include the private records.
- Existing collaboration thread access now checks ended relationships and central policy access; list previews apply visibility before reading message bodies. Customers retain their own historical conversation.

## Broken / insecure — release gates

1. **Production schema prerequisite resolved September 22.** The authenticated Supabase SQL editor was available even though no connector or local production credential was available. Both additive migration files were applied atomically after dev verification, with matching SHA-256 migration records. A separate production SELECT confirmed 20 columns, RLS enabled, two foreign keys and both exact checksums. No data deletion or credential export was needed.
2. **Acceptance benchmark incomplete.** All 19 supplied PDFs were inspected locally for page/text characteristics and first-page document classification. This is NOT an OCR accuracy measurement. Full independent page-referenced ground truth, real-model before/after accuracy, review time, cost and latency are still required. Originals and extracted private text remain outside the repository.
3. **Rollout flags stay off by default.** `AGENT_INDEPENDENT_VERIFICATION=1` additionally requires an authorized distinct `AGENT_VERIFICATION_PROVIDER`. Only six identity/date/premium/branch fields are compared; coverage evidence and recommendation verification are not implemented yet.
4. **Remaining product infrastructure:** resumable batch manifests, document-chain grouping/matching roles, persistent page/OCR artifacts, incremental portfolio assessments, per-stage cost UI, targeted verification/retries and complete report/proposal/channel approval integration remain unfinished. Current multi-file intake is session-based; intelligence is paginated on-demand calculation.

## UI/UX backlog — distinct from security gates

- Broader Greek presentation of legacy generated text; additional task/activity prose remains English.
- All-route mobile/keyboard/degraded-state matrix, preserved scroll/context across tools, recipient identity preview and further form recovery. Unsaved review feedback now blocks revision switching, replacement and delivery until saved or explicitly discarded.
- Source-review navigation and consequential-field prioritization beyond the existing citation/editing screen.
- Agent preferences beyond same-policy examples; offline prompt-improvement evaluation.
- Source-linked proposal prefill, questionnaires/profile provenance integration, and further queue consolidation. The dashboard task slice still shows only five due tasks and links to the full task list.

## Verification evidence

- Development migrations `20260921160000_agent_review_workspace` and `20260921170000_agent_review_feedback` applied using `migrate deploy`; queried 20 columns, RLS enabled, two foreign keys. `verify:migrations` passes with 78 migrations. Production now has the identical additive schema, independently verified through the SQL editor.
- Final unit run: 663 files / 7,603 tests passed, including purchased-allowance reservation release, generated-language mismatch, source-review queue actions and honest portfolio counts. Review service has 12 tests.
- API inventory: 108 discovered / 108 inventoried; auth audit, i18n, UTF-8, type-check, lint and production build passed for this checkpoint.
- Agent journey: 10 passed + 1 flaky (passed retry); initial stale currency assertion expected `€25000` while UI correctly showed `25.000 €`, corrected. Flakiness was opportunity loading timeout.
- Browser on development: saved a demo draft; policy evidence changed during the parallel journey, correctly making approval unavailable; saved a fresh revision, approved it, delivered once and observed the exact demo text in the collaboration log. No email/SMS sent. Source changes, terminated relationships, cross-agent scoping, consent/quota failures, malformed provider output and idempotency are unit-tested. A development SELECT verified one delivered revision, one message, matching approval digest, exact approved body and matching recipient.
- Mobile browser initially measured the new review panel at 358px within a 390px viewport and total page width at 397px. The subsequent automated review-page checks passed at 320, 390 and 1440px with no horizontal overflow; the earlier overflow was not reproduced. The 320px first attempt timed out before navigation completed; the assertion now allows 30 seconds for the remote development page. This is a focused check, not the complete all-route matrix.
- Dev UI latency observed: review read/write requests approximately 5–11 seconds against remote development services, with Upstash permission errors falling back to local rate limiting. No production performance conclusion follows from these measurements.

## Decisions

Preserve deterministic gap/severity authority and existing ingestion gate. No price/catalog changes, no named-product advice, no automatic learning, no external customer delivery. Development fixture data was used for communication execution; original supplied PDFs were not committed. Separate localhost:3001 server avoided interrupting another checkout on port 3000. Unrelated `brag-output/` files are not part of this work.


### Follow-up: document chronology (2026-09-22)

**Broken / correctness:** the shared source selector used upload order even when document effective dates existed. It now chooses the latest effective term-bearing live version, retains upload-order fallback for undated legacy documents, and excludes superseded versions. `newestRenewal` also no longer lets an undated renewal outrank a dated one. The wallet supplies effective dates and version linkage to this selector without exposing storage locators.

Validation: 24 tests passed across renewal-chain, analysis source selection and displayed provenance, including backfilled renewals, unknown/invalid dates, serialized dates, equal-date stability and superseded-only collections. No database write or production deployment in this follow-up.

**Still incomplete / release scope:** existing document period columns are not populated by the ingestion/analysis paths. Automatic population was deliberately not added independently: newly queued documents need explicit processing selection before their dates are known, and historical backfills must not overwrite current aggregate policy facts. Deep persistence also currently marks all policy documents completed, although the run reads one source. These need to be resolved together in durable batch/document-chain processing; the ordering helper alone does not complete that workflow.


### Release preparation (2026-09-22)

The owner explicitly requested merge and production deployment. Ship the implemented subset without presenting the full accepted plan as complete. Independent second-provider verification remains off pending the PDF benchmark. Production schema access was recovered through the existing authenticated browser session. One read-only verification query initially failed because the editor retained SQL text; replacing the full editor content resolved it, and the subsequent SELECT confirmed the intended state.

Added a behavioral form-recovery regression: edited private feedback cannot be silently lost by switching revisions, generating a draft, saving new text or sharing. Explicit discard restores those controls; feedback submission remains available.
