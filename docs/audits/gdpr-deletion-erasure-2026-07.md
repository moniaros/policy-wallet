# GDPR Account Deletion & Data Erasure Audit — B2C + B2B

**Date:** 2026-07-21 · **Scope:** self-service + admin deletion, erasure engine, data export, retention, downstream/processor propagation, B2B (agent/tenant/relationship) removal paths, UX + legal copy. · **Method:** full read of the DSR surface (`account/actions.ts`, `admin/actions.ts` DSR workflow, `compliance.service.ts`, `me/*` routes, `admin/dsr/*`, schema) + four scoped explorations (B2B paths, PII inventory vs. coverage, UX/legal copy, lifecycle/edge cases). Read-only analysis; a first remediation batch was implemented separately after this document was written (see §8).

**Verdict in one paragraph:** PolicyWallet has a real DSR *skeleton* — self-service request creation, an admin review queue with a status machine, an anonymization transaction, a data-export payload builder, and honest legal copy about the one-month deadline. But the *execution layer* is incomplete in ways that make the current flow non-compliant if exercised: erasure leaves Art. 9 health data and the ΑΦΜ on the retained row, never deletes the Supabase auth identity or storage PDFs, silently keeps a live Stripe subscription billing, the whole lifecycle is manual with no deadline enforcement and no user notification, and the UI tells the user their data was "irrevocably destroyed" when in fact a queue row was created. B2B has **no** deletion surface at all (no org deletion, no relationship termination), and the B2B data graph survives B2C erasure wholesale.

---

## 1. Route/screen-by-screen audit

### B2C self-service
| Surface | Location | What it does | Assessment |
|---|---|---|---|
| Danger Zone (Settings) | `components/account/Settings.tsx:467-482`, handler `:102-116` | Native `confirm()` → server action `deleteAccount()` → redirect `/` | Findable and easy. **Copy is false** ("Οριστική Διαγραφή", "θα καταστρέψει αμετάκλητα όλα τα συμβόλαια") — the click only queues a request. No retention disclosure, no export-before-delete hint, no pending state, "already in progress" error swallowed (only generic `deleteFailed` toast). |
| `deleteAccount()` action | `app/(protected)/account/actions.ts:447-493` | Creates `DeletionRequest(status:"requested", legalBasis:GDPR_ARTICLE_17)` + break-glass ActivityLog | Correct duplicate-guard. Session-auth only (no password re-entry) — acceptable for a *request* that goes through human review, but see UX notes. |
| `POST /api/v1/me/deletion-request` | `app/api/v1/me/deletion-request/route.ts` | Same as action, + `retentionNotes`, rate-limit 3/day | Duplicated logic with the action (drift risk); unlike the action it writes **no** ActivityLog entry. |
| `GET /api/v1/me/deletion-request/[id]` | `.../[id]/route.ts` | Status read, correctly `userId`-scoped | Sound. **No UI consumes it**, and there is no cancel/withdraw endpoint. |
| `POST /api/v1/me/data-export` | `app/api/v1/me/data-export/route.ts` | Synchronous export → `payloadJson` on the row, 7-day token URL | Works, correctly scoped, rate-limited. **No UI calls it** although the privacy policy promises in-app export (`lib/legal/legal-content.ts:800/338`). 500 path echoes raw `error.message` as `details` (`route.ts:78`). |
| `GET /api/v1/me/data-export/[id]` | `.../[id]/route.ts` | Status + token-gated download | Auth + token double-gate is fine. On expiry it flips `status:"expired"` but **never clears `payloadJson`/`downloadToken`** (`:41-45`) — the full-PII snapshot lives forever. |

### Admin
| Surface | Location | What it does | Assessment |
|---|---|---|---|
| DSR queue | `app/(protected)/admin/dsr/page.tsx` + `DsrQueueClient.tsx` | List + In Review / Approve / Reject(reason) / Execute; export Execute | Triple-guarded (proxy, layout, per-action `verifyAdminRole`). **No due-date/aging column, no one-month clock, no overdue flag.** Notes via `window.prompt`. Footer disclaimer text is accurate. |
| Status machine | `admin/actions.ts:928-1173` | `requested→in_review→approved→processing→completed/rejected/failed` | Guards are correct per-transition, **but `processing` is a dead-end**: if the function dies between transaction commit and the `completed` write, no action accepts `processing` (`:946,:996,:1100`). |
| Eraser | `executeDeletionAnonymization` `admin/actions.ts:605-708` | One `$transaction`: deletes owned policies, oauth/sessions/passkeys/notifications/security events/grants/invites; cancels subs **locally**; sanitizes profiles partially; anonymizes User row | See criticals — the deletes it does are idempotent and transactional (good), but coverage is materially incomplete and there are zero external-system calls. |
| Admin hard-delete | `deleteUser` `admin/actions.ts:369-408` | `db.user.delete()` from `/admin/users` | **Effectively inert**: many User relations default to `Restrict` (`Policy`, `Subscription`, `Invoice`, `CreditTransaction`, `CustomerRelationship`, `Opportunity`, `QuestionnaireResponse`, `EntitlementUsage`, `Referral`…) so it throws "Failed to delete user" for any real user; would also skip auth/storage/Stripe and the DSR audit trail if it ever succeeded. Second, divergent deletion path. |

### B2B
| Surface | Status |
|---|---|
| Org/tenant deletion | **Does not exist.** No `tenant.delete` anywhere; `leaveTeam` error text references "delete the agency" — a flow never built (`lib/services/team.service.ts:298`). No ownership transfer either. |
| Agent removes a customer / terminates relationship | **Does not exist.** Zero `customerRelationship.delete*` call sites; the bulk `'delete'` action in `CustomersClient.tsx:57` is unreachable dead code (no button, no branch). An agent cannot honor "remove me from your book". |
| Team-member removal | Sound. `removeTeamMember`/`leaveTeam` (`team.service.ts:239,294`) are tenant-scoped with role checks — but the ex-member's relationships/opportunities/policies are silently orphaned outside the team's view, not reassigned. |
| Access revocation | **Sound.** All three revoke paths are granter-scoped; reads filter `status:"active"` (`lib/policy-access.ts:116,186`, `lib/agent-visibility.ts:25`), so revocation stops access immediately. |
| Invites | `inviteeEmail` PII is **never purged** — checked only at consumption, no expiry cleanup, no cron. |

---

## 2. System-level architecture review

**Model: hybrid (anonymize-in-place + selective hard-delete), manual, single-system.**
- The DSR path keeps the `User` row and anonymizes identifiers; deletes auth artifacts and owned policies; retains billing (correct for tax law) and the `DeletionRequest` record (correct for accountability — but see the `onDelete: Cascade` note below).
- **No automated processor exists.** Every transition is a human admin action; the only SLA artifact (`dsr-evidence.service.ts`, 24 h counter) is a read-only snapshot behind an **unscheduled** job route (`dsr-evidence-snapshot` is not in `vercel.json` crons). The operator runbook (`docs/compliance/DSR_OPERATOR_RUNBOOK_GR-GA-2026.03.md`) targets 72 h — as a human process only.
- **External processors: zero propagation.** No `auth.admin.deleteUser` (Supabase auth), no `stripe.customers.del` / no Stripe subscription cancel in the eraser, no storage `deleteFile`, no Brevo contact delete (`lib/brevo.ts` only creates), no Sentry/GA/AI-provider handling. `sendDefaultPii:false` is set for Sentry, but Session Replay captures DOM (health-form fields) with no `beforeSend` scrub.
- **Sessions:** the eraser deletes Prisma `Session`/`ActiveSession` rows, but the *Supabase* session/refresh token stays valid until natural expiry because the auth user survives. Post-erasure logins succeed at the auth layer and then bounce in a redirect loop (`lib/auth-helpers.ts` resolves the DB user by email, which was anonymized). No resurrection path exists (auth-helpers and the OAuth callback never auto-create users) — good.
- **Re-signup:** blocked forever — Supabase still holds the original email, so `signUp` returns "already registered". Erasure thus creates a *permanent lockout* rather than a clean identity release.
- **Backups/PITR:** no documented erasure-vs-backup policy; a restore would resurrect erased PII with no re-application process.
- **Accountability record fragility:** `DeletionRequest.user` is `onDelete: Cascade` (`schema.prisma:1178`) — if the user row is ever hard-deleted, the record proving the erasure vanishes with it. `logAdminAction` failures are swallowed (`lib/admin/admin-guard.ts:71`), so an erasure can complete with no audit record.

---

## 3. Findings — security / correctness (gates launch)

| # | File/location | Issue | Role(s) affected | Severity | Suggested fix |
|---|---|---|---|---|---|
| C1 | `admin/actions.ts:605-708`; `schema.prisma:202-242,67` | Erasure leaves **Art. 9 health data + ΑΦΜ**: `PolicyholderProfile` sanitization nulls only `preferences` — `chronicConditions`, `familyMedicalHistory`, `dateOfBirth`, `gender`, `heightCm/weightKg`, `smokingStatus`, `annualIncome`, `occupation`, `drivingRecord`, `lifeEvents` etc. all survive; `User.taxId`, `aiProcessingConsentVersion`, `lastActiveAt` never cleared | policyholder | **critical** | Null every profile risk/health field and `taxId`/`aiProcessingConsentVersion` in the same transaction |
| C2 | whole repo (no `auth.admin.deleteUser`); `admin/actions.ts:605-708` | **Supabase auth identity never deleted**: original email/phone/password hash persist at the processor; issued session/refresh tokens stay valid; erased user permanently locked out AND permanently blocked from re-signup | all | **critical** | After successful anonymization, look up the auth user by original email (pattern exists at `app/auth/actions.ts:70`) and `auth.admin.deleteUser`; fail the request if this fails so it retries |
| C3 | `admin/actions.ts:625` vs `lib/storage.ts:148` | **Policy PDFs orphaned on erasure**: `tx.policy.deleteMany` bypasses every path that calls `deleteFile`; the most sensitive artifacts (policy PDFs w/ health data) stay in the `policies` bucket indefinitely | policyholder | **critical** | Collect `PolicyDocument.fileUrl`s before the transaction; delete storage objects as part of execution (before the DB delete for retry-safety) |
| C4 | `admin/actions.ts:644-653,680` | **Stripe keeps billing the erased user**: subscription cancelled *locally only* (no Stripe API call — the exact bug `cancelSubscription` in `account/actions.ts:403` was fixed for), and `stripeCustomerId` is nulled, severing the only link needed to ever fix it. Stripe customer PII never deleted | policyholder, agent | **critical** | Cancel Stripe subscriptions (tolerate `resource_missing`) *before* the DB transaction; record the Stripe customer id in the request record before unlinking; add `stripe.customers.del` (or documented retention decision) |
| C5 | `vercel.json`; `admin/actions.ts:928-1173`; `dsr-evidence-snapshot` unscheduled | **100 % manual lifecycle, no deadline enforcement, no alerting**: a forgotten request breaches the Art. 12(3) one-month deadline the privacy policy explicitly promises (`legal-content.ts:801/339`) | all | **critical** | Schedule the evidence snapshot + alert on `needsAttention`; add due-date/aging to the queue; (later) auto-execute approved requests via cron |
| C6 | `components/account/Settings.tsx:467-482`; `el.ts/en.ts` `nuclearDesc`/`deleteAccountConfirm` | **Misleading legal claim at the moment of consent**: UI says deletion is immediate, total and irreversible; reality is a manual queue with retention exceptions. Art. 12 transparency failure + user believes data is gone when nothing happened yet | policyholder, agent | **high** | Rewrite copy: "request received → processed within one month → invoices/GDPR records retained by law"; show pending status; surface the already-in-progress case |
| H1 | `admin/actions.ts:605-708`; schema `Restrict` FKs | **B2B graph survives B2C erasure**: `CustomerRelationship`, `Opportunity.notes`, `QuestionnaireResponse.answers` (customer-authored, may contain health answers), `CollaborationMessage` bodies, `Proposal`, `DocumentRequest`, profile-level `GapInstance`, `UserTask`, recommendations/protection score all persist keyed to the anonymized user | policyholder | **high** | Extend the eraser: delete customer-authored questionnaire responses + scrub their message bodies; mark relationships terminated; make agent-side retention an explicit documented decision (agents may have their own IDD retention basis) |
| H2 | `admin/actions.ts:369-408` | Admin hard-delete `deleteUser` throws on `Restrict` FKs for any real user; if it worked it would skip auth/storage/Stripe and the DSR trail. Divergent second path | admin | **high** | Route it through the DSR machinery (create+approve+execute a request) — one centralized eraser |
| H3 | `admin/actions.ts:1104-1126` | `processing` **dead-end**: crash between commit and the `completed` write strands the request; no action accepts `processing` | admin | **high** | Allow execute from `processing` (the transaction is idempotent) |
| H4 | `admin/actions.ts:928-1173`; `lib/email/templates/*` | **No user notification at any DSR transition** — rejection collects a mandatory reason the user never sees; Art. 12(4) requires informing the subject | all | **high** | Notify (email + in-app via existing `notifyCounterparty`-style helper) on approve/reject/complete/fail |
| H5 | `app/api/v1/me/data-export/[id]/route.ts:41-45`; `compliance.service.ts` | **Expired export snapshots retained forever**: `payloadJson` (full PII incl. health + billing) is never cleared on expiry, by erasure, or by any cron | all | **high** | Null `payloadJson`+`downloadToken` when flipping to `expired`; also purge in the eraser; add a retention cron |
| H6 | `admin/actions.ts:625` (`ownerUserId` only) | Policies the user **created for others** (agent-uploaded) and their `PolicyAnalysisRun.resultJson`/`Step.logJson` (extracted document text) survive the creator's erasure; conversely a customer's runs created by their agent are owned data that DOES get deleted — asymmetric | agent, policyholder | **medium-high** | Decide + document: `createdByUserId` policies belong to the *owner*; scrub only the creator link. Verify analysis-run cascade coverage for non-owned runs |
| M1 | `schema.prisma:1420-1433` | `FormSubmission` (email/name/phone/message/IP/UA) has **no userId and no erasure path at all** | anonymous, all | **medium** | Erase by email match during erasure + retention cron (e.g. 12 months, matching the "technical logs" promise) |
| M2 | `Invite.inviteeEmail`, `Referral.referredEmail`; no cleanup cron | Third-party emails (people who never signed up) accumulate indefinitely | non-users | **medium** | Expiry cron for consumed/expired invites; scrub `referredEmail` once credited |
| M3 | `lib/admin/admin-guard.ts:40-75`; `admin/actions.ts` DSR logs | ActivityLog stores plain **emails** in descriptions (including during erasure — re-introducing the identifier being erased); log retention unbounded vs. the 12-month "technical logs" promise | all | **medium** | Log userIds/request ids, not emails, for DSR actions; define ActivityLog retention |
| M4 | `app/api/v1/me/data-export/route.ts:78` | Export 500 echoes raw `error.message` to the client (same class as the extract-route fix in #197) | all | **medium** | Generic message; details to logs only |
| M5 | `schema.prisma:1178` `DeletionRequest onDelete: Cascade`; `admin-guard.ts:71` | Accountability records fragile: deletion request cascades away if the user row is ever hard-deleted; audit-log write failures swallowed | admin | **medium** | Change to `SetNull` + keep a userId copy column; at minimum never hard-delete users (H2 fix does this) |
| M6 | `admin/actions.ts:605-708` | `PaymentMethod` rows (brand/last4/expiry) not deleted by the eraser | policyholder, agent | **medium** | Add `tx.paymentMethod.deleteMany` |
| M7 | Sentry configs; `components/analytics/GoogleAnalytics.tsx`; `lib/brevo.ts` | Processor tail: Brevo contacts never deleted on erasure; GA client-id not cleared; AI-provider retention unaddressed. (Sentry Session Replay verified OK on closer look: `replayIntegration()` runs with SDK defaults, which mask all text and block all media — the replay-PII concern is limited to unmasked media/urls, minor) | all | **medium** | Brevo DELETE contact on erasure *(shipped in Batch 2)*; document GA/AI retention positions in the privacy policy |
| M8 | `docs/operations/*` | No backup/PITR erasure re-application policy — a restore resurrects erased PII | all | **medium** | Document backup retention window; runbook step: re-run completed deletion requests after any restore (idempotent once H3 lands) |
| M9 | `tests/` | **Zero test coverage** of the entire deletion/DSR/export surface | — | **medium** | See §7 |
| M10 | `lib/services/team.service.ts:155` | `invitee.roles.includes("agent")` raw substring check (vs `parseRoles`) — latent only (no overlapping role names today) | agent | **low** | Use `parseRoles()` |

## 4. Observations — UI/UX (does not gate launch)

| Location | Observation |
|---|---|
| `Settings.tsx:103` | Native `confirm()` for the gravest action in the product; no type-to-confirm or password re-entry. |
| `Settings.tsx` | No pending-deletion banner/status view; no link to export before deleting. |
| `DsrQueueClient.tsx:113-131` | Admin notes/reasons collected via `window.prompt`. |
| `DsrQueueClient.tsx` | No aging/due-date column; operator can't see the one-month clock. |
| Export | No UI at all — API-only feature. |
| `team.service.ts:298` | Error copy advertises "delete the agency", which doesn't exist. |

## 5. B2B vs B2C

- **B2C** has the full (if flawed) chain: request → queue → anonymize. **B2B has nothing**: no org deletion, no relationship termination, no agent-side removal, and org data (Tenant: name, ΑΦΜ, address, phone) is permanent by construction.
- **Org-vs-individual separation is implicitly correct** (tenant carries only org identity; customer data keys to users) but **shared-asset semantics are undefined**: B2C erasure deletes policies an agent manages (agent loses their working copy with no notice — no notification exists), while agent-authored artifacts about the customer (opportunities, proposals, notes) survive the customer's erasure. Neither direction is a documented decision.
- **One admin can erase any non-admin user** (single-role check, no dual control, no second approval identity required — approve and execute may be the same person). Acceptable at current team size; note it in the runbook.
- Member removal from a tenant is clean on authorization but orphans the member's book of business inside the org view.

## 6. Priority-ordered remediation plan

**Batch 1 — erasure correctness (no schema change; implemented in working tree, see §8):**
1. Eraser completeness: taxId + consent fields + full profile scrub + PaymentMethod + customer-authored questionnaire responses + export-payload purge + FormSubmission-by-email + referral email scrub.
2. External propagation in `executeDeletionRequest`, retry-safe order: Stripe cancel → storage file delete → DB transaction → Supabase auth delete; each failure → `failed` + `errorMessage` (retryable).
3. `processing` accepted by execute (dead-end recovery).
4. Export expiry purges `payloadJson`/`downloadToken`; export 500 stops echoing internals.
5. Honest deletion UX copy (both languages) + surface already-pending state.
6. Route admin `deleteUser` through the DSR eraser (centralize; kill the broken hard-delete).
7. Unit tests for all of the above.

**Batch 2 — process compliance (small features) — IMPLEMENTED same session:**
8. ✅ DSR lifecycle emails (approve / reject-with-reason incl. ΑΠΔΠΧ complaint right / complete-to-original-address; `lib/email/templates/dsr-emails.ts`, fire-and-forget).
9. ✅ Queue "Due (Art. 12)" column (30 d clock, overdue/urgent badges; `lib/compliance/dsr-deadline.ts`); `dsr-evidence-snapshot` scheduled daily (GET handler added — Vercel crons issue GET) + Sentry warning on `needsAttention`; new daily `privacy-retention` cron purges expired export payloads + 90-day-dead invites.
10. ✅ Pending-deletion panel on load (`getAccountData.pendingDeletion`), self-service withdrawal (`cancelDeletionRequest` — pre-approval only, row kept as history), "My data" export card in Settings (fulfils the privacy-policy promise); Brevo contact deletion wired into the eraser.

**Batch 3 — schema + retention (needs `prisma migrate dev`):**
11. `DeletionRequest.userId` → `SetNull` + denormalized subject reference; consider `CustomerRelationship.status='terminated'` writes.
12. Retention crons: expired exports, stale invites, FormSubmission, ActivityLog window.
13. B2B: relationship termination action (agent + customer sides), org deletion with invoice/legal-retention block, ownership transfer.

**Batch 4 — processor tail + docs:**
14. Brevo contact deletion; Stripe customer deletion decision; Sentry replay masking; backup/restore erasure runbook; privacy-policy alignment (export UI, AI-provider retention).

## 7. Suggested tests

- **Eraser coverage invariant** (strongest guard): a test that introspects `Prisma.dmmf` for User-relations + PII-bearing models and asserts each is either handled by the eraser or on an explicit documented allowlist (retention exceptions) — prevents silent drift when new models land.
- Status machine: every legal/illegal transition incl. execute-from-`processing`; double-execute idempotency.
- Erasure unit tests (mock `db.$transaction`): profile fields all nulled, taxId cleared, payment methods deleted, export payloads purged, storage `deleteFile` called per document, Stripe cancel called before transaction and `resource_missing` tolerated, Supabase `deleteUser` called with the id resolved from the *original* email, each external failure → `failed` + retry works.
- Export routes: expiry purge clears payload+token; 500 body contains no `error.message`; token mismatch → status JSON not payload; cross-user id → 404.
- `deleteAccount`: duplicate-guard; UI surfaces the pending case.
- E2E (manual/Playwright): request → admin execute → erased user's session bounces, login impossible, re-signup possible (post-C2 fix).

## 8. Criticals, ranked

1. **C4 — live Stripe billing after erasure** (money + trust + unlinkable): eraser flips local status only and nulls the customer pointer.
2. **C1 — Art. 9 health data + ΑΦΜ survive erasure** on the retained anonymized row.
3. **C3 — policy PDFs (health data) never deleted from storage** by the GDPR path.
4. **C2 — Supabase auth identity retained**: valid sessions post-erasure, PII at the processor, permanent lockout, re-signup impossible.
5. **C5 — no processor, no deadline, no alerting** for a legally deadlined workflow the privacy policy promises.
6. **C6/H4 — the user is misled at consent time and never informed of the outcome.**

*Status note: Batch 1 (items 1–7 of §6) was implemented in the working tree immediately after this audit; the findings table above describes the pre-remediation state, which is the state of the deployed production code.*
