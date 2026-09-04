# The Document Validation Gate — no document enters expensive analysis unvalidated

**Date:** 2026-09-05 · **Branch:** `feat/document-validation-gate` (base `NEW-UI` @ `d1924bdb`) ·
**Scope:** every path by which an uploaded file becomes a `Policy`/`PolicyDocument` row or
reaches a model provider.

This document separates **broken / insecure** (gated launch) from **UI/UX** (did not). The
rounds section is filled in as each round completes; nothing below claims a result that was
not observed.

---

## 1. Root cause

A user could upload **any** PDF, select a branch (e.g. Motor), and PolicyWallet would commit a
`Policy` + `PolicyDocument`, then run the deep analysis — the whole file base64'd to Gemini,
3–4 model calls, ~211k estimated tokens — before anything asked whether the file was an
insurance document at all.

Three facts made this structural rather than a missing `if`:

1. **Nothing read a document locally.** No PDF parser, no page count, no text — the only
   reader was the extraction model. Every "is this a policy?" check (`assessExtractionEvidence`,
   `isEmptyExtraction` → `EXTRACTION_EMPTY`) therefore ran *after* the billable call.
2. **Rows were written before content was known.** `/wallet/add` uploaded straight from the
   browser into the private `policies` bucket (an `authenticated` INSERT policy allowed it)
   and `createPolicy` committed the rows with only an extension check on the storage key.
   `uploadAndParse` (onboarding, wallet), `attachRenewalDocument`, the agent
   `addPolicyForCustomer` (`status:'active'` + grant + notification) and the documents route
   (client-declared `documentKind`, which `selectSourceDocument` then preferred) all persisted
   first. The agent scan ran a full extraction with no recognition gate.
3. **The selected branch was a prompt hint**, never checked against the document;
   `resolveLineOfBusiness` let the extracted value silently overwrite it.

At spend time the QStash worker re-checked only lease + terminal status; `createRun` had no
in-flight or document-presence check and marked the policy «analysing» before the token gate;
nothing deduplicated identical uploads.

## 2. Architecture

```
UPLOAD (File in the server action / route body)
  ① validateUploadFile          lib/security/file-upload.ts   size · ext · magic bytes · /Encrypt
  ② probePdf                    lib/ingestion/pdf-probe.ts    numPages FIRST (≤200) → password/corrupt →
                                                              text of first 12 pages → image-only?
  ③ classifyLexically           lib/ingestion/lexical-classifier.ts   el+en evidence GROUPS → type,
                                                              insuranceConfidence, branch family
  ④ classifyWithModel (only the middle band, or a scan)  lib/ingestion/model-classifier.ts
                                                              consent read first · ≤6k chars or ≤2 pages ·
                                                              closed schema · excerpt framed as DATA
  ⑤ branch consistency · duplicate (documentHash) · rejection budget
  ── rejected / held ──▶ ONE ActivityLog row. No object, no row, no run, no model.
  ── validated ────────▶ ingestPolicyDocument: uploadFileDetailed → tx { Policy, PolicyDocument + stamp }
  ⑦ extractPolicyData accepts ONLY a ValidatedAIDocument (toValidatedAIDocument);
     prepareDocument validates legacy rows lazily; createRun/executeRun re-check.
```

**Single paths, enforced by enumerating guards with committed probes:**

| Invariant | Enforcement | Guard |
|---|---|---|
| A policy document reaches storage only through `ingestPolicyDocument` | `lib/ingestion/ingest-policy-document.ts` is the one caller of `uploadFileDetailed(…,"policies")` | `tests/unit/document-gate-storage-single-path.test.ts` (+2 probes) |
| A document reaches the extraction model only through the gate | `extractPolicyData(document: ValidatedAIDocument)`; the brand is minted only by `toValidatedAIDocument(verdict,…)` for a `validated` verdict; no cast may forge it | `tests/unit/document-gate-before-model.test.ts` (+3 probes) |
| Every model call reads consent first | `classifyDocument` added to the consent guard's call set | `tests/unit/ai-processing-consent-gate.test.ts` |

**Verdict states** (`lib/ingestion/types.ts`): `validated` · `requires_review` · `rejected`, with
`documentType` (11 kinds), `insuranceConfidence`, `detectedBranch` (family), `branchConsistency`
(`consistent`/`mismatch`/`unknown`/`not_declared`), `reviewReasons`, evidence, `documentHash`,
`engineVersion: docgate-1`. Codes join the ONE failure vocabulary
(`lib/wallet/batch-upload-errors.ts`): `NOT_AN_INSURANCE_DOCUMENT`, `NOT_AN_INSURANCE_POLICY`,
`BRANCH_MISMATCH`, `BRANCH_UNCONFIRMED`, `DOCUMENT_REVIEW_REQUIRED`, `FILE_UNREADABLE`,
`FILE_PASSWORD_PROTECTED`, `TOO_MANY_PAGES`, `NO_READABLE_CONTENT`, `DUPLICATE_DOCUMENT`,
`UPLOAD_REJECTIONS_THROTTLED`, `AI_CONSENT_REQUIRED`, `AI_UNAVAILABLE`. «Data not found» is no
longer a possible answer to «this is a menu».

**Decisions worth stating once:**
- The lexicon scores *distinct kinds of statement*, never keyword frequency; `≤0.2` is rejected
  without any model (the injection defence); a document that talks to a model
  (`INJECTION_LEXICON`) is refused outright.
- Branch **families** (motor|motorbike|roadside, home|fine_art, health|group_health, life…,
  marine…, business…, travel, pet). A hard `BRANCH_MISMATCH` needs the lexicon *and* the model
  to agree (or a reliable declared side — an analysed policy's own branch); lexical-only
  disagreement is `BRANCH_UNCONFIRMED`, resolvable by the person.
- `requires_review` is user-resolvable only for `branch_unknown`, `medium_insurance_confidence`,
  `scan_unclassified`; never for non-insurance, unreadable or classifier outage. Resolution is
  a resubmission of the same bytes with `branchConfirmed`, re-run through the gate.
- Scans are classified on a ≤2-page pdf-lib excerpt (bounded spend, reported separately);
  legacy rows are validated lazily at their next run, leniently, never discarded.
- The agent commit reuses the scan's recorded verdict for the same bytes (≤30 min) rather than
  paying twice; the branch check still runs against the selection.

## 3. Database / storage / infra

- Migration `20260905120000_document_validation_stamp`: `policy_documents.validation_status`,
  `validation_json`, `validated_at` (nullable; legacy rows stamped lazily). `document_hash`
  reused as the content hash (written at ingest; the extraction cache keys on it). Applied to
  **dev** (`prisma migrate deploy`, verified via `information_schema`) and **prod** (Supabase MCP
  `apply_migration` + `_prisma_migrations` row, checksum `2f928479…4cf5d5`, verified).
- Storage: the `authenticated` INSERT policy on `storage.objects` for `bucket_id='policies'`
  **dropped on dev** (definition archived in
  `docs/archive/2026-09-05-policies-bucket-insert-policy.sql`); **prod drop is scheduled
  immediately after the deploy** that removes the browser path (before that it would break
  the live `/wallet/add`).
- No new table: the KPI lives in `ActivityLog` rows `DOCUMENT_VALIDATED` / `DOCUMENT_REVIEW_REQUIRED`
  / `DOCUMENT_REJECTED` (userId only; metadata = codes and numbers, never text or a file name),
  summarised by `lib/ingestion/gate-metrics.ts` on the admin dashboard («AI analyses
  prevented», «tokens prevented», classifier spend shown separately). Retention and erasure
  follow the existing ActivityLog rules.

## 4. Security

Untrusted-input handling stays in `lib/security/file-upload.ts`; added: page cap 200 checked
**before** any text is read (pdf.js cannot cancel), 12-page sample, 8 s budget, 6k-char /
2-page / 4 MB model-input caps, per-user rejection budget 20/h (DB-backed), rejections no longer
consume the 30/day extraction spend cap, closed enum schema + untrusted-content envelope for
the classifier, deterministic refusal of prompt-injection phrasing, `serverExternalPackages:
['unpdf']`. The worker re-checks owner consent and policy existence; `createRun` returns the
in-flight run instead of creating a second; QStash gets `deduplicationId: run.id`.

## 5. UX

Every surface renders the same code-driven copy (`wallet.batchUpload.failures.<CODE>`, el+en):
`/wallet/add` (card with «Άλλαξε τύπο σε …», «Συνέχισε ως …», «Ανέβασε άλλο έγγραφο»; files
travel in the action; up to 3, the first is the policy), onboarding (card + «Επιβεβαίωση και
συνέχεια»), the agent modal (scan and commit; change type / continue as), the bulk modal
(confirm-and-continue for held rows), the attach card. No field counts, no provider names.

## 6. Tests

Unit: `tests/unit/ingestion/*` (probe, lexicon corpus el+en, gate matrix, ingestion resource
assertions, model classifier bounds, KPI), `document-classification-prompt`, the two new
guards + probes; re-targeted: `create-policy-limit`, `upload-policy-orchestration`,
`ai-processing-consent-gate`, `agent-scan-metering`, `file-format-single-source`,
`document-extension-check-reads-the-key`, `identity-values-are-not-guessed`. Journey:
`tests/document-gate.spec.ts` (policyholder: every fixture on `/wallet/add`, direct
`/api/policies/extract` and documents-route calls), `tests/fixtures/documents/*` built by
`build.mjs`. DB inspection: `scratchpad/document-gate-db.mjs`.

## 7. Rounds

### Round 1 — functional (2026-09-05, local dev server + dev Supabase, E2E policyholder)

Unit: **6805 tests / 582 files green** after re-targeting the seven suites that pinned the old
architecture (see §6). Guardrails: `audit:api-auth`, `lint`, `lint:i18n-changed`,
`lint:utf8`, `type-check`, `verify:migrations` all pass.

Journey `tests/document-gate.spec.ts` (serial, `--workers=1`): **14 passed, 0 failed.**
Observed on `/wallet/add`, each declared «Motor»:

| Fixture | Verdict on screen | Row? | Model? |
|---|---|---|---|
| menu, bank statement, CV, lease, prompt-injection-wrapped menu | `NOT_AN_INSURANCE_DOCUMENT` | no | no |
| Γενικοί Όροι booklet | `NOT_AN_INSURANCE_POLICY` | no | no |
| corrupt bytes · renamed executable | `FILE_UNREADABLE` | no | no |
| 201 pages | `TOO_MANY_PAGES` | no | no |
| health schedule | `BRANCH_MISMATCH` (lexicon *and* classifier: health); «Άλλαξε τύπο σε Υγεία» → validated | only after the change | 793 classifier tokens |
| motor schedule | validated → processing screen | yes, stamped `validated/policy_schedule` | extraction as designed |
| the same motor schedule again | `DUPLICATE_DOCUMENT` | no | no |
| one-pixel «scan» | `FILE_UNREADABLE` (classifier: not readable) | no | 1,574 classifier tokens |

Database after the run (`scratchpad/document-gate-db.mjs inspect`): **11 rejections → 0 Policy
rows, 0 PolicyDocument rows, 0 analysis runs, 0 extraction tokens**; 14 `DOCUMENT_*` ActivityLog
rows with `tokensPrevented = 188,640` per rejection; the 2 validated uploads created 2 policies
whose documents carry `validation_status = validated`, `document_kind = policy_schedule`, a
`document_hash`, and whose runs proceeded (extraction + clarity tokens attributed to the
policy). Gate latency on the dev server: 2.1–2.6 s deterministic, ~9 s with the classifier.

Direct API (same spec, «direct API» group, after pruning the E2E user under the policy cap
— the cap is checked before the gate by design): **4 passed** — `POST /api/policies/extract`
with a menu → 422 `NOT_AN_INSURANCE_DOCUMENT` (stage `recognition`), a spoofed `image/png`
type on PDF bytes → refused at the door, a renamed executable → 415 `FILE_UNREADABLE`;
`POST /api/v1/policies/[id]/documents` with a menu declared `policy_schedule` → 422
`DOCUMENT_REJECTED` / `NOT_AN_INSURANCE_DOCUMENT`.

### Round 2 — adversarial

Covered in code + unit tests: prompt injection wrapped around a menu (`injection.pdf`,
refused deterministically, no model); a disguised executable and a spoofed content type
(byte gate); a client-declared `policy_schedule` on the documents route (gate overrides the
kind); a stamp-less document reaching `extractPolicyData` (type error + source guard, probes
red); a forged `ValidatedAIDocument` cast (source guard, probe red); a policy document stored
from outside the ingestion service (source guard, probe red); a queued run whose owner
withdrew consent or whose policy was deleted (`executeRun` re-check, unit-tested); two
concurrent `createRun`s (in-flight return, unit-tested); the same bytes twice
(`DUPLICATE_DOCUMENT`, journey); 20 rejections/hour (budget, unit-tested); the browser
writing to the bucket directly (INSERT policy dropped on dev; prod after deploy).
**Not exercised live:** the agent door in a browser (`tests/document-gate-agent.spec.ts` is
registered with the `agent-chromium` project but has not yet been run), a real
password-protected PDF (the `/Encrypt` trailer check is unit-tested), a real 15 MB scan.

### Round 3 — readiness

`npm run build` compiles; full unit suite **582 files / 6805 tests green**; every blocking
guardrail green; the dev database after the journey holds exactly the rows the validated
uploads should have created and none for the rejections; no Sentry noise from the dev run.
Preview-deployment smoke was not run (preview deploys write to the PROD database); the
production smoke after deploy is recorded in the deployment report.

## 8. Known limitations

- Scans are judged by the cheap model on a 2-page excerpt: bounded spend, not zero; a scanned
  non-insurance document that looks like a policy on page 1 passes the gate and then fails
  extraction as before.
- The lexicon is Greek/English; other languages land in the model band.
- Legacy rows are validated lazily at their next analysis, not backfilled.
- In-flight run idempotency is application-level + lease, not a DB constraint.
- `resolveLineOfBusiness` still lets the extraction overwrite a declared branch the gate
  called consistent.
- The onboarding and agent flows are covered by unit tests and the shared ingestion path;
  the browser journey walks `/wallet/add` and the two API doors.
