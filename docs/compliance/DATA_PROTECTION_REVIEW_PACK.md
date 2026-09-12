# PolicyWallet — Data Protection & Security Review Pack

**Prepared for:** external legal review
**Controller:** Insurance Martech IKE (ΓΕΜΗ 188863359000, ΑΦΜ 302659440, ΔΟΥ Χίου), Kalamoti, 82102, Chios, Greece
**Privacy contact:** dpo@policywallet.gr
**Document version:** 1.1 — 2026-09-07
**Codebase state described:** commit `873eba6`, production build `21160711`

---

## 0. How to read this document

This is a **factual description of what the system does today**, written from the
source code rather than from intent. It is not a compliance certification and it
does not claim conformity; it is the input to that assessment.

It is deliberately structured in two halves:

- **§1–§13 — what is implemented.** Every statement here is traceable to a file
  in the repository, named inline. Where a control is enforced by an automated
  test, the test is named — those are the claims that cannot silently regress.
- **§14 — the open-items register.** Known gaps, verified as still open on the
  date above. These are stated plainly because a reviewer will find them, and a
  gap found undisclosed costs more than a gap disclosed.

**The three items most likely to drive your assessment** are §7 (what actually
leaves our boundary to AI providers), §8 (international transfers — where the
substantive open issue sits), and §14.1–14.3.

**Specific questions we are asking legal to answer** are collected in §15.

---

## 1. What the product does, in data terms

PolicyWallet is a Greek-market insurance portfolio hub. A policyholder uploads
insurance policy documents (PDFs). The platform:

1. Validates the document is genuinely an insurance policy before storing it.
2. Stores the PDF in private object storage.
3. With explicit consent, transmits it to an AI model provider that extracts
   structured data (insurer, coverages, premiums, dates, vehicle/property
   details) and writes a plain-language Greek summary.
4. Runs **deterministic, rule-based** coverage-gap detection over the extracted
   data — the rules decide, the model only describes.
5. Surfaces gaps, a protection score, and recommendations.

There are three roles: **policyholder** (the data subject), **agent**
(an insurance intermediary granted scoped access by a policyholder), and
**admin** (operator).

## 2. Controller / processor roles

| Party | Role | Note |
|---|---|---|
| Insurance Martech IKE | **Controller** | For policyholder accounts, documents and analyses on the direct-to-consumer product. |
| Technical providers (§9) | **Processors** | Art. 28 DPAs; see §9 for the list and §8 for transfer mechanisms. |
| Insurance intermediary (agent) using the platform | **See note** | Where an intermediary invites and manages their own client book, the intermediary is an independent controller for their own client relationship, and PolicyWallet processes on the policyholder's consent. **This allocation has not been externally confirmed and is a question in §15.** |

Nothing in the platform makes PolicyWallet a party to an insurance contract. It
holds no claims data, issues no cover, and has no underwriting authority.

## 3. Data inventory

### 3.1 Ordinary personal data

| Category | Fields | Source |
|---|---|---|
| Account | name, email, phone (optional), role, language, settings | `User` — `prisma/schema.prisma` |
| Identity | ΑΦΜ (`taxId`) | `User.taxId` — used to identify agent-created customers who have no email |
| Policy content | insurer, policy number, coverages, premiums, dates, vehicle/property details | `Policy`, extracted `AcordData` |
| Documents | the uploaded PDFs themselves | `PolicyDocument` + private object storage |
| Risk profile | marital status, dependants, employment, home ownership, mortgage and loan amounts, income, occupation, savings, valuables, properties, business ownership, activities | `PolicyholderProfile` |
| Billing | plan, subscription and invoice history. **Card data never reaches our systems** — held exclusively by Stripe | `Subscription`, `Invoice`, `PaymentMethod` |
| Usage / technical | IP address, device type, in-platform actions | `ActivityLog`, `SecurityEvent`, `ActiveSession` |
| Collaboration | which intermediary has access, the scope granted, the full grant/revoke history | `CustomerRelationship`, `AccessGrant` |

### 3.2 Special-category data (Art. 9)

Two distinct routes bring Art. 9 data into the system, and they need to be
assessed separately:

**a) Structured health fields the user answers directly** — `PolicyholderProfile`:
`chronicConditions`, `familyMedicalHistory`, `smokingStatus`, `heightCm` /
`weightKg` (used for BMI), `gender`, `activityLevel`.

**b) Whatever is inside an uploaded health-policy PDF.** This is the wider
exposure, and it is unbounded by design: we do not parse the PDF ourselves, so
we do not control what it contains. A health policy schedule may carry medical
annexes, exclusions referencing conditions, beneficiary details, ΑΜΚΑ. See §7 —
**the entire document is transmitted to the AI provider**, including pages we
never extract or display.

## 4. Legal bases

As published at `/privacy` (source: `lib/legal/legal-content.ts`):

| Purpose | Legal basis |
|---|---|
| Providing the service: account, policy storage, renewal reminders | Contract — Art. 6(1)(b) |
| **AI analysis of insurance policies** | **Consent — Art. 6(1)(a); for health data, explicit consent — Art. 9(2)(a)** |
| Subscription billing and invoicing | Contract — Art. 6(1)(b); record-keeping: legal obligation — Art. 6(1)(c) |
| Security, abuse prevention, rate limiting | Legitimate interest — Art. 6(1)(f) |
| Sharing information with the intermediary the user chooses | Consent — Art. 6(1)(a), revocable at any time |
| Newsletter | Consent, unsubscribe in every message |
| Records of consents and GDPR requests | Legal obligation / accountability — Art. 6(1)(c), 5(2) |

## 5. Consent architecture

Consent is a **separate, recorded, revocable act** — not a term buried in the
ToS. Four consent types exist (`ConsentType` enum): `cookie`, `terms`,
`privacy`, `ai_processing`.

- **Versioned.** `User.aiProcessingConsentVersion`, `termsVersionAccepted`,
  `privacyVersionAccepted`, `cookieConsentVersion` hold the accepted document
  version, so a policy change invalidates stale consent rather than inheriting it.
- **Audited.** Every consent event writes a `ConsentAudit` row: type, policy
  version, locale, source, accepted/withdrawn, timestamp, IP, user-agent.
- **Cookies are opt-in and granular.** Categories `necessary` / `analytics` /
  `marketing`; absence of a signal means *no*, and analytics tags do not load
  without a prior positive signal (`lib/compliance/consent.ts` — the comment
  there records a prior defect where the default was inverted).

### 5.1 The AI-processing consent gate — the load-bearing control

**Nothing reaches a model provider without AI-processing consent, on every path.**
This is enforced at two chokepoints, because there are two:

1. The deep analysis pipeline — `policy-analysis-orchestrator.service.ts`
   returns a `blocked` run with `failureCode: "AI_CONSENT_REQUIRED"` *before*
   any policy or document status mutation.
2. Upload-time extraction — `app/api/policies/extract/route.ts`, which the
   bulk-upload modal also uses.

Two design details matter legally:

- **The check runs before the request body is read.** In the extract route the
  consent check precedes `req.formData()`, so a refusal never causes the
  document bytes to be handled at all.
- **Consent is checked against the policy *owner*, not the person triggering
  the run.** An intermediary holding a valid access grant still cannot cause a
  customer's documents to be analysed until that customer has consented.

Guard tests: `tests/unit/ai-processing-consent-gate.test.ts`,
`tests/unit/ai-processing-consent-capture.test.ts`.

Revocation stops future analyses and does not affect storage of already-uploaded
documents.

> **Open item — see §14.3.** An "agent-attested" consent path exists for
> customers an intermediary has created but who have not yet activated an
> account. It is flagged in the code itself as pending counsel sign-off.

## 6. The document gate — what is stored at all

Before September 2026 any PDF a user declared to be a motor policy became an
analysing Policy and consumed a full extraction. `ingestPolicyDocument`
(`lib/ingestion/ingest-policy-document.ts`) is now the **single path** that
stores a policy document, and it runs `validateDocumentForIngestion` first:
byte checks, a local pdf.js read, a Greek/English lexical classifier, a cheap
model call only for the ambiguous middle band, branch consistency, duplicate
detection.

A rejected or held document **persists nothing** but a single `ActivityLog` row.
This is a data-minimisation control as much as a cost control: an unrelated
document a user uploads by mistake does not become stored personal data.

Guards: `tests/unit/document-gate-before-model.test.ts`,
`tests/unit/document-gate-storage-single-path.test.ts`.

## 7. What actually leaves our boundary to AI providers

*Source: `docs/audits/AI_PROVIDER_DATA_FLOW.md`, established by reading the code
and correlating with production runtime logs; re-verified against the code on
2026-09-07.*

A full analysis is **8 steps. Four call a model. Exactly one transmits the
document.**

| # | Step | Document sent? | What is sent |
|---|---|---|---|
| 1 | Document load and validation | no | nothing — local fetch and checks |
| 2 | Metadata extraction | **YES** | **the whole file, base64** + prompt |
| 3 | Plain-language translation | no | extracted structured fields |
| 4 | Coverage mapping | no | deterministic, local |
| 5 | Gap detection | no | structured fields + gap definitions |
| 6–8 | Savings, scoring, persistence | no | deterministic, local |

**Three points a reviewer should hold on to:**

1. **It is the whole document, not extracted text.** The file is read from
   storage, base64-encoded, and handed to the model as a document part — the
   model does the reading. The provider therefore receives **every page**,
   including anything on it we never extract or display: ΑΜΚΑ, ΑΦΜ, addresses,
   beneficiaries, medical annexes.

   **This is a choice, not a technical necessity, and that changed in September
   2026.** A local PDF reader now exists and already runs on *every* upload:
   `lib/ingestion/pdf-probe.ts` (the `unpdf` build of pdf.js) extracts the page
   count and the text of the first 12 pages in roughly 100 ms, **before anything
   is transmitted and with no bytes leaving our boundary**, so that the document
   gate can classify the upload. That text is then **discarded**, and the
   complete file is transmitted regardless. Any assessment of proportionality
   should start from the fact that the less-intrusive means is already built,
   already runs, and is currently thrown away — not from the assumption that it
   would have to be created. (Scanned, image-only documents are the exception:
   they yield no text locally and would still require the image, or OCR.)
2. **The file name is not sent.** All twelve provider call sites pass a constant
   from `providerDocumentFileName()`; the `AIDocument` type has no filename field.
3. **Failover carrying the document is separately gated.** Sending the *document*
   to a second provider requires `isFullFailoverAllowed`, whereas a step carrying
   only structured fields may fail over more freely
   (`canSendFailoverData = !includesDocumentContext || failoverDataAllowed`).

## 8. International transfers — **the principal open issue**

**Primary infrastructure is in the EU.** The database, authentication and files
are on Supabase in **eu-west-3 (Paris, France)**.

**The AI processing path is not regionally pinned, and this is the item we most
need reviewed.** Verified in code on 2026-09-07:

- `lib/services/ai/gemini-ai.service.ts:73` — `createGoogleGenerativeAI({ apiKey })`
- `lib/services/ai/anthropic-ai.service.ts:68` — `createAnthropic({ apiKey })`
- `lib/services/ai/openai-ai.service.ts:65` — `createOpenAI({ apiKey })`

All three clients are constructed with an API key **and nothing else**. There is
no `baseURL`, no `location`, no `europe-west*`. Each SDK therefore uses its
default global endpoint. For Gemini that is `generativelanguage.googleapis.com`
— the **AI Studio API**, which has materially different default retention terms
from **Vertex AI**, and no regional pinning at all.

**No zero-retention or no-train setting is applied in code.** Nothing sets a ZDR
header, a `no_train` flag, or any retention option. Whatever the account-level
defaults are on the provider accounts is what governs — and those are configured
outside this repository.

This matters because the published subprocessors page asserts *"The AI providers'
data-processing terms do not permit the use of your data to train their models."*
That assertion rests entirely on the **account-level contract**, not on anything
the application enforces. It needs to be verified against the actual executed
terms before it can be relied on. See §14.1.

Two remediation routes exist, neither of them a code change alone:

- Move Gemini traffic to **Vertex AI with an EU location** — a different SDK, a
  different auth model, and a GCP project.
- Obtain **zero-retention terms** on the provider accounts.

Other non-EEA processing (Stripe, Vercel, monitoring) is stated as covered by
the EU-U.S. Data Privacy Framework and/or Standard Contractual Clauses.

## 9. Subprocessors

Published and maintained at `/subprocessors` (version GR-GA-2026.07):

| Provider | Role | Data | Location |
|---|---|---|---|
| Supabase | Database, auth, file storage | Account data, policy documents, application data | **EU — eu-west-3 (Paris)** |
| Vercel | Hosting and CDN | Traffic data, technical logs | EU/US |
| Stripe | Payments and subscriptions | Billing details; **card data held exclusively by Stripe** | EU/US |
| Brevo | Email delivery | Email, name, notification content | EU (France) |
| Upstash | Rate limiting (Redis) | Per-IP counters — no document content | EU/US |
| Sentry | Error monitoring | Technical events, PII scrubbed — no document content | EU/US |
| Google (Gemini API) | AI analysis — **primary** | Policy content, only with consent | EU/US |
| Google Analytics | Usage analytics | Aggregate events, IP anonymisation, only on opt-in | EU/US |
| Anthropic | AI analysis — alternate | Policy content, only with consent | US |
| OpenAI | AI analysis — alternate | Policy content, only with consent | US |

All are stated to be bound by Art. 28 DPAs. Changes to this list are published
before they take effect.

> **Accuracy note for review.** The August 2026 audit observed that in production
> only Gemini and OpenAI clients initialise — `ANTHROPIC_API_KEY` was unset, so
> the Anthropic arm was dormant. The public list nonetheless discloses Anthropic.
> This is over-disclosure rather than under-disclosure, which is the safer error,
> but the list should be reconciled with the actual production configuration.

## 10. Data subject rights

Both self-service and operator-assisted paths exist.

**Self-service** — `/account/privacy`:
- `POST /api/v1/me/data-export` → `GET /api/v1/me/data-export/[id]`
- `POST /api/v1/me/deletion-request` → `GET /api/v1/me/deletion-request/[id]`

**Operator queue** — `/admin/dsr`, with a **"Due (Art. 12)" column showing the
one-month statutory deadline** from `requestedAt`. Overdue and ≤7-days-left rows
take priority over the internal 72-hour target. A daily cron
(06:30 UTC) produces an evidence snapshot and raises a Sentry warning when
attention is needed.

Statuses: export — `requested / processing / completed / failed / expired`;
deletion — `requested / in_review / approved / processing / completed /
rejected / failed`.

**Notifications (Art. 12(4))** are automatic and in the user's language:
approval, rejection (carrying the operator's stated reason), and completion. The
completion email goes to the pre-erasure address.

### 10.1 Erasure — the mechanism

`lib/services/gdpr-erasure.service.ts` is the **single** place user data is
erased. Model: **anonymise-in-place**. The `User` row survives, anonymised, so
that lawfully-retained records (invoices, consent records, DSR request records)
keep a resolvable but non-identifying anchor.

**Execution order is load-bearing for retry safety** — external systems first,
database last, so any failure leaves the DB intact and the request retryable:

1. **Stripe** — cancel live subscriptions, delete the customer object
2. **Brevo** — delete the marketing contact
3. **Supabase auth** — delete the auth identity (kills sessions and refresh
   tokens, frees the email for re-signup)
4. **Storage** — delete policy document PDFs
5. **Database** — one transaction: deletes plus field-level anonymisation

Every step is idempotent; a partially-failed erasure is safely re-run.

**Deliberately retained, with stated bases:** invoices (tax law, 5y);
DeletionRequest / DataExportRequest rows minus their payloads (accountability);
ConsentAudit rows minus IP and user-agent (proof of consent); financial ledgers
keyed to the anonymised row; and agent-authored B2B artifacts about the customer
(the intermediary's own records under their own basis). The
`CustomerRelationship` row survives, flipped to `terminated`.

**The guard that matters here:** because this is anonymise-in-place, the `User`
row survives and `ON DELETE CASCADE` never fires — so a new data store added
without a corresponding erasure line would silently outlive the erasure.
`tests/unit/erasure-covers-personal-data.test.ts` **derives the model list from
the Prisma schema** and fails CI on any store that has neither an erasure nor a
documented exemption. Nothing is exempt by default.

### 10.2 Access / portability

The export payload is assembled and checked for completeness by
`tests/unit/subject-access-completeness.test.ts`.

Two deliberate positions worth your view:

- **Advisor qualification data is in scope for export.** What an intermediary
  concluded about a customer's needs, the € at risk, decision criteria and
  qualification score is personal data about the customer and is exported as
  `advisorOpportunities[].qualification`. Retaining it after an erasure under the
  intermediary's own basis does not exempt it from a subject access request —
  these are different rights.
- **Third-party names are withheld under Art. 15(4).** Names inside a stakeholder
  map (spouse, accountant) are not released; the payload flags
  `thirdPartyNamesWithheld: true`. A challenge escalates rather than auto-releases.

## 11. Retention

| Category | Period | Enforcement |
|---|---|---|
| Policy documents and analyses | Until deleted by the user or account deletion | User action |
| Account data | Life of the account | Erasure service |
| Invoices and billing | 5 years after the end of the tax year | Retained exception |
| Consent and DSR records | 5 years from revocation / completion | Retained exception |
| **Technical / usage logs** | **Up to 12 months** | Daily cron |
| **Administrator audit records** | **5 years** | Daily cron |
| Public-form submissions | 24 months | Daily cron |
| Invites | 90 days past consumption/expiry | Daily cron |
| Data-export payloads | 7-day download TTL, then payload purged | Daily cron + lazy purge on access |

Automated sweep: `/api/v1/jobs/privacy-retention`, daily at 06:45 UTC.

One implementation detail worth noting as evidence of the approach: `ActivityLog`
holds two different kinds of row — administrator actions (accountability, 5y) and
ordinary user activity (technical logs, 12m). The sweep **splits by kind** rather
than applying the longer period to everything, because the published policy
states both and applying 5 years to user activity would have contradicted it.

## 12. Access control and the intermediary access model

This section is likely to be of specific interest given the agent role.

**Single enforced path.** Anything that lets a caller name a Policy,
PolicyDocument, GapInstance or PolicyAnalysisRun goes through `getPolicyAccess`
(`lib/policy-access.ts`); the agent-facing set equivalent is
`lib/agent-visibility.ts`. Hand-rolled ownership checks are prohibited — four
divergent copies existed by August 2026 and **had drifted in both directions**
(a dismissed agent still seeing uploads; legitimate grant-holders wrongly
denied). `tests/unit/policy-authorization-single-path.test.ts` derives the route
list from the filesystem and fails on a new bypass.

**The ownership rule.** `Policy.ownerUserId` is *always* the policyholder.
Agents never own customer policies. Their capabilities come only from an active,
**policy-scoped** access grant (`policy:<id>` exactly — portfolio-wide scopes
confer nothing), and the policyholder can revoke at any time.

**Access dies with the relationship, however it ends.** Both visibility arms
require a relationship that is not `inactive` / `terminated`. Because
`computePolicyAccess` derives permissions from the grant alone and does not
re-check the relationship, **any code that ends or moves a relationship must
revoke the grants in the same transaction**. This was a real defect:
`transferCustomer` did not do so until August 2026, leaving reassigned agents
with permanent `manage` rights over a former customer's entire book. Guard:
`tests/unit/access-ends-with-relationship-change.test.ts`.

**Server actions.** Every export of a `"use server"` file is treated as a public
endpoint: it needs its own auth check and must never take the acting user's ID
as a parameter — the subject is derived from the session. Guard:
`tests/unit/server-actions-authorize-first.test.ts`.

## 13. Security measures (Art. 32) and accountability

### 13.1 Technical measures

- **Transport:** TLS throughout; HSTS via the hosting platform.
- **At rest:** Supabase-managed encryption (EU region). Web-push payloads are
  additionally AES-128-GCM encrypted per the Web Push spec.
- **Object storage is private.** Policy PDFs live in a private `policies` bucket.
  They are never publicly addressable; access is via **signed URLs with a 5-minute
  expiry** (`DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS`). A previous one-hour link on one
  route was shortened specifically because `/trust` tells readers links "expire
  within minutes" and an hour-long link made that statement false.
- **Storage keys are opaque.** Server-generated crypto UUIDs. The client-supplied
  filename is *never* used as a storage name and reveals nothing about the user,
  policy or contents. Downloads are renamed `policywallet-<lob>-<number>.pdf`.
- **Upload validation (OWASP baseline), centrally enforced.** Magic-byte content
  sniffing cross-checked against the extension, size limits, filename
  sanitisation, plus a malware scan. Every server-side upload funnels through
  `lib/security/file-upload.ts` regardless of what the calling route did, so the
  rules cannot drift between routes.
- **Rate limiting:** Upstash Redis, per-IP, required on 38 of 99 API routes.
- **Input validation:** Zod schemas; required on 27 routes by policy.
- **Error monitoring:** Sentry with `sendDefaultPii: false` **and** an explicit
  `beforeSend` scrubber (`lib/observability/sentry-scrub.ts`) — because
  `sendDefaultPii` alone does not cover fields the application passes
  deliberately.
- **Auth:** Supabase Auth (email/password and magic link). Sessions are revocable;
  "sign out everywhere" is available to the user. Security events (login success
  and failure, email change, password change, logout) are recorded.

### 13.2 Organisational and process measures

- **Auth policy is inventoried and CI-enforced.** Every route under
  `app/api/**/route.ts` must have a matching entry in
  `scripts/api-route-policy-inventory.json` declaring its auth mode, methods and
  required controls. `audit:api-auth` is a **blocking** CI check — a new route
  without a declared policy fails the build. Current inventory: **99 routes — 63
  user-authenticated, 23 role-gated, 9 public, 4 webhook.**
- **Blocking CI gates:** `audit:api-auth`, ESLint, i18n hardcoded-string check,
  UTF-8 validity, `tsc --noEmit` under `strict`, unit tests (613 files), and a
  production build.
- **Guards must enumerate, not assume.** A standing repository rule: a guard test
  that scopes itself to known locations guards those locations, not the
  invariant. Three guards in this repository have passed while what they protect
  was broken. Every guard now enumerates its universe from the filesystem or the
  database schema and ships with a committed probe fixture proven to turn it red.

### 13.3 Admin access to other people's data

Two controls, applied in this order:

1. **Minimise.** A bare Prisma relation include (`policyholderProfile: true`)
   pulls every Art. 9 column. `getUserDetails` was loading customers' health
   records into an admin page that renders none of them. Admin reads now select
   only the fields the surface uses.
2. **Log.** `logAdminRead` (`lib/admin/admin-guard.ts`) records the **data
   subject** (`targetUserId` — the subject, never the actor), a field **scope
   expressed in classes rather than values**, and a `specialCategory` flag when
   Art. 9 data is involved. Guard:
   `tests/unit/admin-reads-are-audited.test.ts` fails if an enumerated read path
   drops its audit call.

### 13.4 Breach notification

Published commitment: notification to the data subject and to the **HDPA (ΑΠΔΠΧ)**
in accordance with Art. 33 and 34. *Runbook and tabletop drill since 2026-09-12 —
see §14.7 addendum.*

### 13.5 Automated decision-making (Art. 22) and advice positioning

**No solely-automated decisions producing legal or similarly significant effects.**
The platform's analyses are informational. Three design decisions back this:

- **Rules decide a gap; the model only describes one.** Detection and severity
  come from `decideGapsForPolicy` evaluating an authored rule against extracted
  data. The AI contract has **no** `isDetected` and **no** `severity` field —
  deleted, not ignored — and nothing may create a gap definition from model
  output.
- **Severity is not a verdict until an underwriter says so.** Severity renders
  through `describeSeverity()` and always carries a caveat.
- **A "not insurance advice" disclaimer** is rendered on every advice-adjacent
  surface (gap lists, recommendations, protection score, policy Q&A, exported
  reports), from one canonical i18n key, in both languages. AI prompts were
  reframed from "expert insurance advisor" giving "personalized" advice to an
  "informational insurance-analysis assistant" producing "observations".

**Absence of a detected problem is never rendered as reassurance.** This produced
defects on three separate surfaces — a protection score reading "good coverage"
over a wallet nothing had analysed; a monitoring card reading "expiring cover: OK"
over a portfolio whose cover had entirely expired. Before rendering a verdict, an
all-clear or a score, the code must establish that the check actually *covered*
the situation, and say so when it did not. Guards:
`tests/unit/all-clear-honesty.test.ts`,
`tests/unit/protection-score-honesty.test.tsx`.

Related: a `missing` operator fires on **silence in the document**, so findings it
produces must be worded "not recorded", never "not covered" — the extractor is
silent about most fields, and unknown is not absence.

---

## 14. Open items register

*Verified as open on 2026-09-07. Ordered by our assessment of legal significance.*

### 14.1 AI provider endpoints are not regionally pinned, and no zero-retention setting is applied — **HIGH**

Detailed at §8. Three components:

1. No `baseURL` / `location` on any of the three AI clients; Gemini traffic uses
   the global AI Studio endpoint, whose default retention terms differ from
   Vertex AI.
2. No ZDR header or `no_train` flag is set anywhere in the codebase; account-level
   defaults govern.
3. The published claim that provider terms forbid training on user data rests on
   the executed account contracts, which have not been verified against the code.

**Consequence:** Greek policyholders' complete insurance documents — including
Art. 9 health content — are processed wherever the provider routes them, under
whatever the account defaults are.

### 14.2 No Art. 30 record of processing and no Art. 35 DPIA — **HIGH**

Neither document exists in the repository. Given large-scale processing of Art. 9
data combined with AI/automated evaluation, a DPIA appears **mandatory** under
Art. 35(3)(b) rather than advisable. This document is intended as raw material
for both, not as a substitute.

### 14.3 Agent-attested consent is unratified — **HIGH**

For customers an intermediary has created but who have not yet activated an
account, the intermediary attests that consent was obtained offline. A sentinel
(`agent-attested:v1:`) is written as the consent version and satisfies the
orchestrator's gate; evidence lands in the activity log; on account activation
the sentinel is **cleared** so the customer is asked first-hand.

`lib/ai-consent.ts` states in its own header that the model is **pending counsel
sign-off**. Given this is the consent basis for Art. 9 processing, it is the item
we most want an opinion on. See §15.

### 14.4 No two-factor authentication and no passkeys — **MEDIUM**

`PasskeyCredential` and `WebAuthnChallenge` tables exist and the
`@simplewebauthn` dependencies are installed, but **no API routes implement
them** and the account security UI deliberately does not offer them. Its source
comment records the reasoning: an empty device list and a dead button are worse
than their absence, because they suggest a protection the account does not have.

Authentication is email/password or magic link. For accounts holding health data,
absent MFA is a defensible finding against Art. 32.

### 14.5 Single-operator DSR model — **MEDIUM**

The same administrator may approve **and** execute a deletion (owner decision,
2026-07-21). No separation of duties. Documented as revisitable once a second
admin operator exists.

Relatedly: admin authorisation is **role-string based only** — a user is an admin
if and only if `User.roles` contains `admin`. `AdminUser.adminLevel` and
`AdminUser.permissions` exist in the schema but are **enforced nowhere**. There is
no granular admin permission model.

### 14.6 Backups and PITR can resurrect erased data — **MEDIUM**

A database restore can bring back personal data that was lawfully erased. The
control is a **manual runbook step**: after any production restore, list
`deletion_requests` with `status='completed'` and `completed_at` after the restore
point, and re-execute each (idempotent). Not automated, not alerted.

### 14.7 No tested incident-response runbook — **MEDIUM**

The Art. 33/34 commitment is published, but there is no documented breach
detection, triage, or 72-hour notification procedure, and no drill evidence.

> **Addendum 2026-09-12 (PW-PROVENANCE-01 R-03).** The procedure now exists:
> `docs/operations/RUNBOOK_PERSONAL_DATA_BREACH.md` (trigger → containment → assessment →
> ΑΠΔΠΧ within 72 h → Art. 34 → evidence), the Art. 33(5) register at
> `docs/compliance/evidence/breach-register.md`, and a first tabletop drill
> (`docs/operations/PERSONAL_DATA_BREACH_DRILL_EVIDENCE_2026-09.md`). A guard fails CI when the
> runbook cites a file or route that does not exist. Rotation and notification were simulated, not
> performed; the finding is downgraded to «documented and drilled (tabletop)», not closed.

### 14.8 Outstanding items already queued with counsel — **INFORMATIONAL**

From `docs/legal-review-queue.md`:

- **Terms §3 / the `/trust` pledge.** The public pledge is currently absolute
  («we do not sell, share or transfer data … to insurance companies, banks or
  third-party agencies»). A consented embedded deployment inside a partner's app
  cannot coexist with an unqualified never-transfer pledge, even where every
  transfer is consented. Proposed qualification: *"without your explicit,
  revocable consent."* **This is directly relevant to any Ethniki deployment
  scenario.**
- **IDD / ν.4583/2018 opinion.** Confirmation sought that PolicyWallet requires no
  intermediary registration for its current activity, and that the framing —
  analysis and questions, with advice remaining the intermediary's — keeps it
  that way.
- **Art. 9 consent wording.** If an externally reviewed wording exists, marketing
  surfaces should quote it verbatim rather than paraphrase.

### 14.9 Subprocessor list vs. production configuration — **LOW**

Anthropic is disclosed as an alternate AI provider but was observed unconfigured
in production (August 2026). Over-disclosure, not under-disclosure — but the list
should be reconciled.

---

## 15. Questions we are asking legal to answer

1. **Transfers (§8, §14.1).** Is the current AI processing arrangement
   defensible as it stands, or must Gemini traffic move to Vertex AI with an EU
   location and/or zero-retention terms **before** further processing of Art. 9
   data? This is our primary question.
2. **Agent-attested consent (§14.3).** Is an intermediary's attestation of
   offline consent an acceptable basis for Art. 9(2)(a) explicit consent for the
   period before the customer activates an account? If not, what is the
   acceptable alternative — no analysis until first-hand consent?
3. **Controller allocation (§2).** Where an intermediary manages their own client
   book on the platform, is the intermediary an independent controller, a joint
   controller, or a processor? The answer changes the contractual stack.
4. **DPIA (§14.2).** Do you agree a DPIA is mandatory under Art. 35(3)(b), and
   would you want to own or review it?
5. **MFA (§14.4).** Is the absence of two-factor authentication an acceptable
   residual risk for accounts holding health data, or a blocking finding?
6. **The `/trust` pledge (§14.8).** Does the proposed qualification — "without
   your explicit, revocable consent" — adequately preserve the consumer promise
   while permitting a consented partner deployment?
7. **Whole-document transmission (§7).** We transmit complete PDFs, including
   pages we never extract, even though a local text extraction already runs on
   every upload and is discarded. Given that the less-intrusive means already
   exists in the codebase, does transmitting the whole document remain
   defensible on consent plus Art. 28 terms, or does data minimisation
   (Art. 5(1)(c)) require us to send the extracted text — and the image only for
   scans — instead?

---

## Appendix A — Primary source files

| Area | File |
|---|---|
| AI consent gate | `lib/ai-consent.ts`, `lib/services/analysis/policy-analysis-orchestrator.service.ts`, `app/api/policies/extract/route.ts` |
| AI clients | `lib/services/ai/{gemini,anthropic,openai}-ai.service.ts`, `ai-service.factory.ts` |
| Document gate | `lib/ingestion/ingest-policy-document.ts`, `lib/ingestion/document-gate.ts` |
| Local PDF read | `lib/ingestion/pdf-probe.ts` (`unpdf` — the only PDF reader in the codebase) |
| Erasure | `lib/services/gdpr-erasure.service.ts` |
| Retention sweep | `app/api/v1/jobs/privacy-retention/route.ts` |
| Authorization | `lib/policy-access.ts`, `lib/agent-visibility.ts` |
| Admin audit | `lib/admin/admin-guard.ts` |
| Upload security | `lib/security/file-upload.ts`, `lib/security/malware-scan.ts` |
| Consent (cookies) | `lib/compliance/consent.ts` |
| DSR deadlines | `lib/compliance/dsr-deadline.ts` |
| Published legal text | `lib/legal/legal-content.ts`, `lib/legal/entity-placeholders.ts` |
| API auth inventory | `scripts/api-route-policy-inventory.json` |

## Appendix B — Related internal documents

| Document | Contents |
|---|---|
| `docs/audits/AI_PROVIDER_DATA_FLOW.md` | Per-step analysis of what reaches each provider |
| `docs/audits/gdpr-deletion-erasure-2026-07.md` | Erasure audit that drove the current design |
| `docs/audits/ai-advice-compliance.md` | Disclaimer, prompt framing, consent gate |
| `docs/compliance/DSR_OPERATOR_RUNBOOK_GR-GA-2026.03.md` | Operator procedures for DSRs |
| `docs/compliance/DSR_E2E_EVIDENCE_GR-GA-2026.03.md` | End-to-end DSR evidence |
| `docs/legal-review-queue.md` | Items awaiting counsel |
| `docs/audits/idor-policyholder-data.md` | Authorization findings |
| `docs/audits/upload-pipeline-security-2026-07.md` | Upload pipeline security review |
