# Record of processing activities (GDPR Art. 30)

> **Generated from `prisma/schema.prisma` — do not edit by hand.**
> Regenerate with `npx tsx scripts/generate-ropa.ts`. A model that holds personal
> data and carries no `@ropa` tag fails `tests/unit/ropa-tags-complete.test.ts`,
> and a committed record that no longer matches the schema fails
> `tests/unit/generated-compliance-docs-current.test.ts`, so this record cannot
> silently fall behind the database.

**Controller:** Insurance Martech IKE (ΓΕΜΗ 188863359000, ΑΦΜ 302659440, ΔΟΥ Χίου),
Kalamoti, 82102, Chios, Greece · **Privacy contact:** dpo@policywallet.gr

**Covers 57 of 57 models holding personal data.**
Recipients and transfers are generated alongside this record in
[DPIA-INPUTS.md](DPIA-INPUTS.md) §3; security measures are in
[DATA_PROTECTION_REVIEW_PACK.md](DATA_PROTECTION_REVIEW_PACK.md) §13 — they are
properties of the deployment, not of a table, so they are not generated here.

## 1. Processing activities, by purpose

### Records of consents and GDPR requests

| Store | Lawful basis | Data subjects | Retention | On erasure |
| --- | --- | --- | --- | --- |
| `ActivityLog` | Legal obligation — Art. 6(1)(c) | policyholder, agent, admin | Up to 12 months | Deliberately retained, with a documented basis |
| `ConsentAudit` | Legal obligation — Art. 6(1)(c) | policyholder, agent | 5 years from completion, for accountability | Deliberately retained, with a documented basis |
| `DataExportRequest` | Legal obligation — Art. 6(1)(c) | policyholder, agent | 5 years from completion, for accountability | Deliberately retained, with a documented basis |
| `DeletionRequest` | Legal obligation — Art. 6(1)(c) | policyholder, agent | 5 years from completion, for accountability | Deliberately retained, with a documented basis |

### AI analysis of insurance policies and the risk model

| Store | Lawful basis | Data subjects | Retention | On erasure |
| --- | --- | --- | --- | --- |
| `GapInstance` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `LifeEventInstance` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `PolicyAnalysisRun` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Removed with its parent |
| `PolicyholderProfile` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `ProtectionProfile` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `ProtectionScore` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `RecommendationInstance` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `RiskProfileVersion` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `RiskReview` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |

### Subscription billing, invoicing and metering

| Store | Lawful basis | Data subjects | Retention | On erasure |
| --- | --- | --- | --- | --- |
| `CreditTransaction` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `EntitlementUsage` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `Invoice` | Legal obligation — Art. 6(1)(c) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `MonthlyTokenUsage` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `PaymentMethod` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `Referral` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `ReportUnlockPurchase` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `Subscription` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `TokenBalance` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `TokenPurchase` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |
| `TokenUsage` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | 5 years after the end of the relevant tax year (tax legislation) | Deliberately retained, with a documented basis |

### Notifications and email the person asked for

| Store | Lawful basis | Data subjects | Retention | On erasure |
| --- | --- | --- | --- | --- |
| `BusinessEvent` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `NotificationEvent` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `NotificationPreference` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `PushDevice` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `UserNotificationSettings` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |

### Sharing information with the intermediary the customer chose

| Store | Lawful basis | Data subjects | Retention | On erasure |
| --- | --- | --- | --- | --- |
| `AccessGrant` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `CollaborationAction` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deliberately retained, with a documented basis |
| `CollaborationMessage` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `CollaborationParticipant` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deliberately retained, with a documented basis |
| `CollaborationThread` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deliberately retained, with a documented basis |
| `CustomerRelationship` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deliberately retained, with a documented basis |
| `DocumentRequest` | Legitimate interest — Art. 6(1)(f) | policyholder, agent | Retained by the intermediary under their own basis | Deliberately retained, with a documented basis |
| `Invite` | Consent — Art. 6(1)(a) | policyholder, agent, third_party | For as long as the account exists; removed on erasure | Deleted |
| `Opportunity` | Legitimate interest — Art. 6(1)(f) | policyholder, agent | Retained by the intermediary under their own basis | Deliberately retained, with a documented basis |
| `OpportunityStageHistory` | Legitimate interest — Art. 6(1)(f) | policyholder, agent | Retained by the intermediary under their own basis | Deliberately retained, with a documented basis |
| `Proposal` | Legitimate interest — Art. 6(1)(f) | policyholder, agent | Retained by the intermediary under their own basis | Deliberately retained, with a documented basis |
| `QuestionnaireInstance` | Consent — Art. 6(1)(a) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |
| `QuestionnaireResponse` | Consent — Art. 6(1)(a) | policyholder | For as long as the account exists; removed on erasure | Deleted |

### Security, authentication and abuse prevention

| Store | Lawful basis | Data subjects | Retention | On erasure |
| --- | --- | --- | --- | --- |
| `Account` | Performance of a contract — Art. 6(1)(b) | policyholder, agent, admin | For as long as the account exists; removed on erasure | Deleted |
| `ActiveSession` | Legitimate interest — Art. 6(1)(f) | policyholder, agent, admin | For as long as the account exists; removed on erasure | Deleted |
| `AdminUser` | Performance of a contract — Art. 6(1)(b) | admin | For as long as the account exists; removed on erasure | Deliberately retained, with a documented basis |
| `PasskeyCredential` | Performance of a contract — Art. 6(1)(b) | policyholder, agent, admin | For as long as the account exists; removed on erasure | Deleted |
| `SecurityEvent` | Legitimate interest — Art. 6(1)(f) | policyholder, agent, admin | Up to 12 months | Deleted |
| `Session` | Performance of a contract — Art. 6(1)(b) | policyholder, agent, admin | For the life of the session or challenge | Deleted |
| `WebAuthnChallenge` | Performance of a contract — Art. 6(1)(b) | policyholder, agent, admin | For the life of the session or challenge | Deleted |

### Providing the service — account, policy storage, renewal reminders

| Store | Lawful basis | Data subjects | Retention | On erasure |
| --- | --- | --- | --- | --- |
| `AgentProfile` | Performance of a contract — Art. 6(1)(b) | agent | For as long as the account exists; removed on erasure | Anonymised in place |
| `Policy` | Performance of a contract — Art. 6(1)(b) | policyholder | For as long as the account exists; removed on erasure | Deleted |
| `PolicyDocument` | Performance of a contract — Art. 6(1)(b) | policyholder | For as long as the account exists; removed on erasure | Removed with its parent |
| `PolicyMergeRequest` | Performance of a contract — Art. 6(1)(b) | policyholder | For as long as the account exists; removed on erasure | Removed with its parent |
| `PolicyRenewal` | Performance of a contract — Art. 6(1)(b) | policyholder | For as long as the account exists; removed on erasure | Removed with its parent |
| `TenantMembership` | Performance of a contract — Art. 6(1)(b) | agent, admin | For as long as the account exists; removed on erasure | Deliberately retained, with a documented basis |
| `User` | Performance of a contract — Art. 6(1)(b) | policyholder, agent, admin | For as long as the account exists; removed on erasure | Anonymised in place |
| `UserTask` | Performance of a contract — Art. 6(1)(b) | policyholder, agent | For as long as the account exists; removed on erasure | Deleted |

## 2. Special categories of personal data (Art. 9)

Processed only on explicit consent — Art. 9(2)(a). The guard refuses any tag that names
Art. 9 columns under another basis.

| Store | Columns | Lawful basis |
| --- | --- | --- |
| `PolicyholderProfile` | `chronicConditions`, `familyMedicalHistory`, `smokingStatus`, `heightCm`, `weightKg`, `gender`, `activityLevel` | Consent — Art. 6(1)(a) |

**This table is not the whole Art. 9 surface.** It covers the structured columns a
person answers directly. The wider exposure is whatever a health policy PDF
contains — medical annexes, exclusions naming conditions, ΑΜΚΑ — which is
unbounded by design, because the document is not parsed into columns. See
DATA_PROTECTION_REVIEW_PACK.md §3.2b and §7.

## 3. Open questions

No model carries `unclear` for purpose or basis.



## 4. What this record is not

It is not a DPIA. It supplies a DPIA's inputs — the per-store purpose and basis
map, the Art. 9 inventory, and the open questions above — and nothing more. The
assessment under Art. 35 is a legal judgement and is recorded as a halt in
`docs/provenance/HALTS.md` (H-P2). The fuller input pack — every column, the
Art. 9 routes and the transfer table — is [DPIA-INPUTS.md](DPIA-INPUTS.md).

It also does not evidence that the stated bases are correct. It evidences that
someone recorded one for every store, that the record matches the schema today,
and that a new store cannot be added without answering the question.
