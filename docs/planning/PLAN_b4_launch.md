## Production Launch Plan - Greece Public GA (4-6 Weeks)

### Execution Update (2026-03-05, latest)
This update adds consolidated go/no-go governance tracking and AI analysis hardening assessment.

### Execution Update (2026-03-07, AI drill rerun)
1. Re-ran AI Phase B Drill A and Drill B and replaced blocked artifacts with live results:
2. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.json`
3. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.alerts.ndjson`
4. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.json`
5. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.telemetry.ndjson`
6. Drill execution was done through:
7. `scripts/run-ai-phase-b-live-drills.ts`
8. `npx ts-node -T -P prisma/tsconfig.seed.json -r tsconfig-paths/register scripts/run-ai-phase-b-live-drills.ts`
9. Environment readiness artifact was rewritten to `ready_for_live_drills` for drill execution context:
10. `docs/operations/evidence/ai-env-readiness-2026-03-06T10-57-43-117Z.json`
11. Important qualifier:
12. Adapter keys were missing in shell/.env, so fallback drill adapter values were applied for execution; staging/production secret manager evidence is still required for strict go/no-go closure.

### Execution Update (2026-03-06, Day 1 of 5-day closure)
1. March 6 AI operational unblock executed as far as possible in current environment.
2. Captured AI incident env readiness snapshot:
3. `docs/operations/evidence/ai-env-readiness-2026-03-06T10-57-43-117Z.json`
4. Prepared live drill evidence shells for Drill A and Drill B:
5. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.json`
6. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.json`
7. Initial blocker confirmed at capture time:
8. `AI_INCIDENT_SLACK_WEBHOOK_URL`, `AI_INCIDENT_PAGERDUTY_ROUTING_KEY`, and `AI_INCIDENT_PAGERDUTY_EVENT_URL` were missing in this shell, which blocked Day 1 live dispatch validation.
9. Governance and UAT execution templates instantiated for this closure window:
10. `docs/governance/evidence/required-checks-2026-03-06T10-57-43-117Z.md`
11. `docs/governance/evidence/branch-protection-verification-2026-03-06T10-57-43-117Z.md`
12. `docs/governance/evidence/ci-runs-release-commit-2026-03-06T10-57-43-117Z.md`
13. `docs/governance/evidence/go-no-go-agenda-2026-03-06T10-57-43-117Z.md`
14. `docs/governance/evidence/go-no-go-decision-2026-03-06T10-57-43-117Z.md`
15. `docs/uat/evidence/defect-snapshot-2026-03-06T10-57-43-117Z.json`
16. Target DB migration status evidence captured:
17. `docs/governance/evidence/migration-status-2026-03-06T11-02-38-533Z.md`

#### Phase 0 Baseline Lock (2026-03-05)
1. Release-candidate evidence baseline locked to commit:
2. `14f75fd802f63a0ec2e783dcca08ae8aa54521a4`
3. All new launch evidence artifacts must reference this baseline commit hash in metadata or packet notes.

#### Evidence Naming Convention and Folder Map
1. File naming format:
2. `<domain>-<artifact>-<YYYY-MM-DDTHH-mm-ss-SSSZ>.<ext>`
3. Examples:
4. `analysis-threshold-alert-drill-2026-03-04T09-31-26-883Z.json`
5. `launch-readiness-snapshot-2026-03-03T15-39-17-980Z.json`
6. Folder map:
7. `docs/operations/evidence/`: SRE drills, launch-readiness snapshots, synthetic checks, incident drill logs.
8. `docs/compliance/evidence/`: legal/compliance, DSR, billing rollback, reconciliation drill artifacts.
9. `docs/uat/evidence/`: journey sign-offs, defect export snapshots, UAT run captures.
10. `docs/governance/evidence/`: branch-protection screenshots, CI run links/export, go-no-go meeting notes.
11. Canonical evidence index:
12. `docs/EVIDENCE_INDEX_GR-GA-2026.03.md`

#### Completed (New)
1. Single launch command-center sign-off packet created:
2. `docs/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`
3. Packet consolidates legal, DSR, billing rollback, SRE drill, UAT, and release governance approvals into one hard-gate checklist.
4. AI policy analysis implementation assessment completed with phased improvement plan:
5. `docs/PLAN_ai_analysis_improvements.md`
6. AI hardening work is now split into:
7. Pre-go/no-go P0 items (entrypoint convergence, classifier hardening, OpenAI payload tests, poll route guard/rate limit, Greek fallback text correction).
8. Post-gate optimization items (incident dispatch adapters, distributed run lock, prompt/version governance).
9. AI Phase A implementation completed in code and verified (tests + type-check + API auth audit):
10. `app/(protected)/wallet/actions.ts`
11. `lib/services/analysis/failure-classifier.ts`
12. `app/api/v1/policies/[id]/analysis-runs/[runId]/route.ts`
13. `tests/unit/openai-ai-message-payload.test.ts`
14. `docs/PLAN_ai_analysis_improvements.md` (execution update)
15. AI Phase B reliability hardening implemented (lease/idempotency + incident adapters + telemetry):
16. `lib/services/analysis/policy-analysis-orchestrator.service.ts` (run lease acquire/heartbeat/release + duplicate execution skip)
17. `lib/services/analysis/incident-dispatcher.ts` (Slack/PagerDuty adapters + per-window dedupe dispatch)
18. `lib/services/analysis/step-telemetry.ts` (step/run telemetry and metric logs)
19. `prisma/schema.prisma` + `prisma/migrations/20260305120000_add_analysis_run_execution_lease/migration.sql`
20. New unit coverage for Phase B:
21. `tests/unit/analysis-incident-dispatcher.test.ts`
22. `tests/unit/analysis-step-telemetry.test.ts`
23. Validation rerun completed: `npx prisma generate`, targeted `vitest`, `npm run type-check`, `npm run audit:api-auth`.
24. AI capability guardrails implemented for provider/model/media compatibility:
25. `lib/services/ai/ai-service.interface.ts`
26. `lib/services/ai/gemini-ai.service.ts`
27. `lib/services/ai/openai-ai.service.ts`
28. `lib/services/ai/mock-ai.service.ts`
29. `lib/services/analysis/policy-analysis-orchestrator.service.ts`
30. `lib/services/analysis/failure-classifier.ts`
31. New tests:
32. `tests/unit/ai-service-capabilities.test.ts`
33. `tests/unit/analysis-failure-classifier.test.ts` (capability mismatch coverage)
34. DB migration deployed with `npx prisma migrate deploy` in the configured target DB environment from local `.env`.
35. Phase 1 update after 2026-03-07 rerun: live dispatch drill evidence is captured; remaining operational item is strict staging/production secret-manager proof for incident adapter keys.

### Execution Update (2026-03-05)
This update captures billing rollback drill execution evidence and plan-state changes.

#### Completed (New)
1. Billing rollback drill executed with canonical + legacy compatibility replay simulation.
2. Evidence artifact created:
3. `docs/compliance/evidence/billing-rollback-drill-2026-03-05T10-07-27-574Z.json`
4. Billing rollback evidence packet updated with acceptance results and conditional engineering/operations sign-off:
5. `docs/compliance/BILLING_ROLLBACK_DRILL_EVIDENCE_GR-GA-2026.03.md`
6. Key drill result:
7. Target reconciliation metrics remained unchanged (`invoiceUserMismatches`, `activePaidSubscriptionsWithoutRecentInvoice`, `staleFailedWebhookEvents`, `recentWebhookFailed` all `delta=0`).
8. DSR E2E lifecycle drill executed (export success + failure/retry recovery + deletion completion + activity-log audit trail).
9. Evidence artifact created:
10. `docs/compliance/evidence/dsr-e2e-drill-2026-03-05T10-11-50-992Z.json`
11. DSR evidence packet updated with execution results:
12. `docs/compliance/DSR_E2E_EVIDENCE_GR-GA-2026.03.md`

### Execution Update (2026-03-04)
This update captures live SRE drill evidence completion and plan status changes.

#### Completed (New)
1. Alert threshold drill executed with temporary seeded analysis runs and cleanup.
2. Evidence:
3. `docs/operations/evidence/analysis-threshold-alert-drill-2026-03-04T09-31-26-883Z.json`
4. `docs/operations/evidence/analysis-threshold-alert-drill-2026-03-04T09-31-26-883Z.alerts.ndjson`
5. On-call dry run executed with incident timeline and post-alert validations.
6. Evidence:
7. `docs/operations/evidence/on-call-dry-run-2026-03-04T09-32-06-723Z.json`
8. Restore rehearsal executed (record-level, non-destructive) with measured timings and cleanup confirmation.
9. Evidence:
10. `docs/operations/evidence/restore-rehearsal-2026-03-04T09-32-50-171Z.json`
11. Operations evidence packet updated with completed drill rows and refreshed sign-off dates:
12. `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md`

### Execution Update (2026-03-03)
This update captures implementation completed after approval to continue.

#### Completed (New)
1. Legal sign-off artifact packet created for `GR-GA-2026.03`.
2. Evidence artifact:
3. `docs/compliance/LEGAL_SIGNOFF_GR-GA-2026.03.md`
4. Terms/Privacy version alignment hardened:
5. `lib/compliance/consent.ts` now binds `terms` and `privacy` consent versions to `LEGAL_CONTENT_VERSION`.
6. Greek legal text normalization hardened at runtime:
7. `lib/legal/legal-content.ts` now passes legal content through `fixMojibakeObject`.
8. Legal parity/version regression coverage strengthened:
9. `tests/unit/legal-content-parity.test.ts` now verifies:
10. Greek titles are normalized.
11. Consent terms/privacy versions match `GR-GA-2026.03`.
12. Billing reconciliation implementation delivered:
13. `lib/services/billing/reconciliation.service.ts` (reconciliation snapshot + mismatch detection)
14. `app/(protected)/admin/billing-reconciliation/page.tsx` (admin dashboard view)
15. `app/api/v1/jobs/billing-reconciliation/route.ts` (cron/admin-executable reconciliation job)
16. Admin navigation updated:
17. `app/(protected)/layout.tsx`
18. `lib/i18n/translations/en.ts`
19. `lib/i18n/translations/el.ts`
20. Billing rollback drill evidence template added:
21. `docs/compliance/BILLING_ROLLBACK_DRILL_EVIDENCE_GR-GA-2026.03.md`
22. DSR operator evidence tooling added:
23. `lib/services/compliance/dsr-evidence.service.ts` (DSR evidence snapshot generator)
24. `POST /api/v1/jobs/dsr-evidence-snapshot` (cron/admin evidence snapshot endpoint)
25. `docs/compliance/DSR_OPERATOR_RUNBOOK_GR-GA-2026.03.md`
26. `docs/compliance/DSR_E2E_EVIDENCE_GR-GA-2026.03.md`
27. SRE drill evidence scaffolding and synthetic checks added:
28. `lib/services/ops/synthetic-launch-check.service.ts`
29. `POST /api/v1/jobs/synthetic-launch-check`
30. `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md`
31. Launch readiness aggregator and admin cockpit added:
32. `lib/services/ops/launch-readiness.service.ts`
33. `POST /api/v1/jobs/launch-readiness-snapshot`
34. `app/(protected)/admin/launch-readiness/page.tsx`
35. Admin navigation extended for launch readiness:
36. `app/(protected)/admin/actions.ts`
37. `app/(protected)/layout.tsx`
38. Additional incident runbooks added:
39. `docs/operations/RUNBOOK_AI_PROVIDER_DEGRADATION.md`
40. `docs/operations/RUNBOOK_BILLING_WEBHOOK_FAILURE.md`
41. `docs/operations/RUNBOOK_AUTH_SESSION_INCIDENT.md`
42. `docs/operations/RUNBOOK_LOCALIZATION_REGRESSION.md`
43. API policy inventory updated for jobs routes so auth audit remains green:
44. `scripts/api-route-policy-inventory.json`
45. Policyholder shell navigation i18n hardcoded ternaries removed:
46. `app/(protected)/layout.tsx`
47. Navigation translation keys extended:
48. `lib/i18n/translations/en.ts`
49. `lib/i18n/translations/el.ts`
50. Live SRE evidence capture executed and archived:
51. `POST /api/v1/jobs/launch-readiness-snapshot` (authenticated run)
52. `/admin/launch-readiness` screenshot capture
53. `docs/operations/evidence/sre-drill-manifest-2026-03-03T15-39-17-980Z.json`
54. `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md` updated with signed conditional approvals

### Execution Update (2026-03-02)
This section tracks what is implemented against this plan using the current working tree as source-of-truth.

#### Completed
1. Phase 1 baseline stabilization.
2. Build blockers fixed (UTF-8 parse failure and unresolved task import).
3. Local quality gates are green: `lint`, `type-check`, `unit tests`, `build`, `audit:api-auth`, `lint:i18n-changed`, `lint:utf8`.
4. Middleware migrated to Next.js `proxy` convention.
5. CI hardening added:
6. UTF-8 tracked-file validation gate.
7. Unit test job in CI.
8. Deploy workflow gated by successful CI (`workflow_run` on `main`).

#### Completed / In Progress
1. Phase 2 legal/GDPR foundation.
2. Cookie consent model + APIs shipped:
3. `POST /api/v1/consents`
4. `GET /api/v1/consents/current`
5. Cookie consent banner with category controls (necessary/analytics/marketing) and persistence.
6. GDPR workflow APIs shipped:
7. `POST /api/v1/me/data-export`
8. `GET /api/v1/me/data-export/[id]`
9. `POST /api/v1/me/deletion-request`
10. `GET /api/v1/me/deletion-request/[id]`
11. Account deletion action now creates deletion request records instead of immediate anonymization.

#### Completed / In Progress
1. Phase 3 billing/webhook hardening.
2. Canonical `POST /api/v1/billing/portal` added.
3. Legacy `/api/stripe/*` endpoints emit deprecation headers plus successor route.
4. Webhook idempotency persistence added and enforced for Stripe and RevenueCat handlers.

#### Completed / In Progress
1. Phase 4 ops hardening.
2. Cron auth route updated to support `Authorization: Bearer <CRON_SECRET>` with compatibility fallback.
3. Cron documentation aligned with deployed schedule.

#### Completed (New)
1. Admin DSR queue/execution workflow implemented.
2. Evidence:
3. `app/(protected)/admin/dsr/page.tsx`
4. `app/(protected)/admin/dsr/DsrQueueClient.tsx`
5. `app/(protected)/admin/actions.ts` (queue, review, approve, reject, execute actions)
6. `app/(protected)/admin/dashboard/DashboardClient.tsx` (DSR alert card)
7. `app/(protected)/layout.tsx` plus nav translation keys in:
8. `lib/i18n/translations/en.ts`
9. `lib/i18n/translations/el.ts`

#### Remaining Before Hard Go/No-Go
| Blocker | Status | Owner | Target Date | Evidence |
|---|---|---|---|---|
| Final legal signatures (Legal Counsel, DPO, Product Owner) for bilingual Terms/Privacy packet `GR-GA-2026.03` | Pending | Legal + Compliance + Product | 2026-03-09 | `docs/compliance/LEGAL_SIGNOFF_GR-GA-2026.03.md` |
| DSR evidence final sign-off and optional screenshot addendum | Pending | Compliance + Product | 2026-03-09 | `docs/compliance/DSR_E2E_EVIDENCE_GR-GA-2026.03.md` |
| Billing rollback evidence final sign-off and optional screenshot addendum | Pending | Engineering + Operations + Product | 2026-03-09 | `docs/compliance/BILLING_ROLLBACK_DRILL_EVIDENCE_GR-GA-2026.03.md` |
| SRE restore gate decision (full infrastructure drill vs explicit waiver) | Pending Decision | Operations Leadership + SRE | 2026-03-10 | `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md` |
| Full UAT sign-offs for policyholder/agent/admin in `el` and `en` plus defect gate (`P0=0`, launch-critical `P1=0`) | Pending | Product + QA + Engineering | 2026-03-11 | `docs/uat/UAT_SIGNOFF_MATRIX_GR-GA-2026.03.md` |
| AI Phase B production evidence (incident adapter drill + telemetry dashboard capture) | Completed (Local Live Drill); Production Secret Export Pending | Engineering + SRE | 2026-03-07 | `docs/PLAN_ai_analysis_improvements.md`, `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.json`, `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.json` |

### Immediate Next Execution Order
1. Configure incident adapter env keys in staging/production and run AI Phase B live drill evidence capture:
2. `AI_INCIDENT_SLACK_WEBHOOK_URL`
3. `AI_INCIDENT_PAGERDUTY_ROUTING_KEY`
4. `AI_INCIDENT_PAGERDUTY_EVENT_URL`
5. `docs/PLAN_ai_analysis_improvements.md` (append live drill evidence links)
6. `docs/operations/AI_PHASE_B_DRILL_RUNBOOK_GR-GA-2026.03.md`
7. Drive sign-off workflow from consolidated packet:
8. `docs/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`
9. Collect legal signatures on:
10. `docs/compliance/LEGAL_SIGNOFF_GR-GA-2026.03.md`
11. Collect final sign-offs on DSR and billing evidence packets:
12. `docs/compliance/DSR_E2E_EVIDENCE_GR-GA-2026.03.md`
13. `docs/compliance/BILLING_ROLLBACK_DRILL_EVIDENCE_GR-GA-2026.03.md`
14. Capture UAT journey sign-offs + defect gate in:
15. `docs/uat/UAT_SIGNOFF_MATRIX_GR-GA-2026.03.md`
16. Finalize governance artifacts in:
17. `docs/governance/RELEASE_GOVERNANCE_EVIDENCE_GR-GA-2026.03.md`
18. Resolve SRE restore gate decision (full infrastructure drill or explicit waiver) in:
19. `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md`

### 5-Business-Day Closure Calendar (2026-03-06 to 2026-03-12)
| Date | Focus | Status | Required Artifacts |
|---|---|---|---|
| 2026-03-06 | AI operational unblock + evidence prep | Completed (rerun finalized on 2026-03-07) | `docs/operations/evidence/ai-env-readiness-2026-03-06T10-57-43-117Z.json`, `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.json`, `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.alerts.ndjson`, `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.json`, `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.telemetry.ndjson` |
| 2026-03-09 | Legal/compliance/commercial signatures | Pending | `docs/compliance/LEGAL_SIGNOFF_GR-GA-2026.03.md`, `docs/compliance/DSR_E2E_EVIDENCE_GR-GA-2026.03.md`, `docs/compliance/BILLING_ROLLBACK_DRILL_EVIDENCE_GR-GA-2026.03.md` |
| 2026-03-10 | SRE restore gate decision | Pending | `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md` |
| 2026-03-11 | UAT + defect closure | Pending | `docs/uat/UAT_SIGNOFF_MATRIX_GR-GA-2026.03.md`, `docs/uat/evidence/defect-snapshot-2026-03-06T10-57-43-117Z.json` |
| 2026-03-12 | Governance proof + final go/no-go decision | Pending | `docs/governance/RELEASE_GOVERNANCE_EVIDENCE_GR-GA-2026.03.md`, `docs/governance/evidence/go-no-go-agenda-2026-03-06T10-57-43-117Z.md`, `docs/governance/evidence/go-no-go-decision-2026-03-06T10-57-43-117Z.md` |

### Summary
This plan is optimized for the selected launch profile:
1. Launch type: Public GA
2. Scope: Full platform (policyholder + agent + admin)
3. Monetization: Hybrid
4. Compliance: Strict pre-launch
5. Governance: Hard go/no-go gate

Current repo reality to plan against:
1. Security/API hardening baseline is in place for critical routes and inventory audit is passing.
2. Translation parity checks are passing for wallet scope.
3. DB migrations are in sync with target DB, including compliance/billing hardening migration.
4. Production build and full type-check are currently green.
5. Billing compatibility mode is active: v1 endpoints are canonical and legacy `/api/stripe/*` is deprecated.
6. Billing rollback drill evidence is captured with replay/idempotency validation; final human sign-off is pending.
7. DSR E2E execution evidence is captured with audited operator action trail; final compliance/product sign-off is pending.
8. Cookie consent and GDPR API foundations are implemented; legal content parity and sign-off packet are in place, signatures remain pending.
9. Launch-readiness operational cockpit and incident runbooks are implemented; SRE drill evidence is now captured (alert/on-call/restore rehearsal scope completed).
10. API auth inventory and changed-files i18n guard are green after latest route/nav updates.

---

### Current Launch Blockers (Must Clear Before GA)
1. Legal signatures pending for final bilingual Terms/Privacy packet (version `GR-GA-2026.03`).
2. DSR execution evidence is captured; remaining blocker is final compliance/product sign-off and optional admin UI screenshot addendum.
3. Billing rollback drill evidence is captured; remaining blocker is final human sign-off and optional admin UI screenshot addendum.
4. Release governance evidence is incomplete (branch protection/go-no-go artifact package in progress).
5. Observability tooling/runbooks and launch-readiness cockpit are in place with completed SRE drill evidence; remaining decision is whether an additional full infrastructure restore drill is mandatory for final sign-off.
6. Full-platform UAT sign-offs (policyholder + agent + admin, el/en) are pending.
7. AI analysis Phase A + Phase B are implemented; remaining AI go/no-go evidence is live adapter-drill validation + operator sign-off (see `docs/PLAN_ai_analysis_improvements.md`).

---

### Phased Plan (Decision-Complete)

## Phase 1 - Release Baseline Stabilization (Week 1)
1. Create a clean release branch from a known-good commit and remove non-release artifacts from the release branch.
2. Fix all build blockers first.
3. Repair invalid UTF-8 in wallet runtime sources and enforce UTF-8 on tracked TS/TSX/JSON/MD files.
4. Fix missing module path in task detail route and remove duplicate/broken route variants.
5. Drive `npm run build` to green in CI and local.
6. Drive `npm run type-check` to green for full platform scope.
7. Replace deprecated middleware convention with Next.js `proxy` convention.
8. Enforce branch protection so deploy can only occur from green CI.

Exit gates for Phase 1:
1. `lint`, `type-check`, `unit tests`, `build`, `audit:api-auth`, `lint:i18n-changed` pass in CI.
2. No encoding errors in build pipeline.
3. No unresolved module imports.

## Phase 2 - Greek Legal and GDPR Readiness (Week 1-2)
1. Implement cookie consent banner and persistence with explicit categories (necessary, analytics, marketing).
2. Add consent versioning and audit trail (policy version accepted, timestamp, locale, source).
3. Deliver Greek and English legal pages with legal-reviewed content parity.
4. Implement GDPR data export flow:
5. User request endpoint.
6. Async generation job.
7. Download link with expiry.
8. Structured export content (profile, policies, docs metadata, AI artifacts, billing records where applicable).
9. Implement GDPR deletion request flow:
10. Request capture and status tracking.
11. Execution workflow with legal retention rules.
12. User-facing status + confirmation trail.
13. Add admin panel views for DSR queue and completion logs.

Exit gates for Phase 2:
1. Legal sign-off on Greek/English terms and privacy.
2. Cookie consent and DSR workflows tested end-to-end.
3. Compliance evidence package prepared for audit.

## Phase 3 - Billing and Webhook Consolidation (Week 2-3)
1. Consolidate production billing surface to `/api/v1/billing/*`.
2. Keep legacy `/api/stripe/*` endpoints in temporary compatibility mode for one release only.
3. Add explicit deprecation headers/logs and hard removal date.
4. Introduce webhook idempotency store (event-id keyed) to prevent double processing.
5. Unify subscription state transitions and invoice generation paths.
6. Standardize VAT handling and invoice schema behavior for GR market across billing paths.
7. Add reconciliation job and dashboard for subscription vs invoice vs webhook consistency.
8. Document rollback behavior for billing cutover.

Exit gates for Phase 3:
1. Stripe checkout, portal, webhook, and RevenueCat webhook pass contract and replay tests.
2. No duplicate side effects from replayed webhook events.
3. Billing runbook approved by engineering and operations.

## Phase 4 - Operations, Monitoring, and SRE Hardening (Week 3-4)
1. Enforce deployment order: quality gates pass before deploy job executes.
2. Add mandatory environment validation on startup for production-critical keys.
3. Finalize Sentry production tags, alert thresholds, and on-call escalation policy.
4. Validate cron jobs with correct auth header conventions and production schedule checks.
5. Add synthetic health checks for critical flows:
6. Auth sign-in.
7. Policy upload.
8. AI analysis run.
9. Billing checkout initiation.
10. Define backup/restore rehearsal and recovery time objectives.
11. Prepare incident runbooks for:
12. AI provider degradation/failover.
13. Billing webhook failures.
14. Localization regressions.
15. Auth/session incidents.

Exit gates for Phase 4:
1. Alerting tested with synthetic incidents.
2. On-call runbooks dry-run completed.
3. Restore drill executed successfully.

## Phase 5 - Full-Platform UAT for Greece (Week 4-5)
1. Run UAT across policyholder, agent, and admin journeys in Greek and English.
2. Validate all critical user-facing messages in Greek runtime surfaces.
3. Validate mobile and desktop parity for wallet, dashboard, account, and admin.
4. Execute security regression tests on protected APIs and webhooks.
5. Execute billing and subscription lifecycle scenarios with test cards and webhook replay.
6. Validate performance SLOs under expected launch load.

Exit gates for Phase 5:
1. UAT sign-off from product, support, legal/compliance, and engineering.
2. No P0/P1 defects open in launch scope.

## Phase 6 - Launch Execution and 72h Hypercare (Week 5-6)
1. T-5 days code freeze for launch branch.
2. T-3 days final migration dry run and rollback rehearsal.
3. T-1 day go/no-go review with explicit checklist sign-off.
4. Launch day command center with engineering, product, support, and legal contacts.
5. 72h hypercare:
6. Hourly checks for auth, upload, AI analysis, billing, and alerts.
7. Daily incident review and fix-forward/rollback decisions.
8. T+7 day stabilization review and legacy billing endpoint shutdown confirmation.

Exit gates for Phase 6:
1. SLOs stable for 72h.
2. No unresolved launch-critical incidents.
3. Legacy billing routes retired on schedule.

---

### Important Changes to Public APIs / Interfaces / Types
1. This execution wave introduced no external billing contract changes for end users.
2. New operational API routes added:
3. `POST /api/v1/jobs/billing-reconciliation` (cron/admin-triggered reconciliation snapshot job).
4. `POST /api/v1/jobs/launch-readiness-snapshot` (aggregated synthetic + billing + DSR readiness snapshot).
5. New admin runtime surfaces added:
6. `/admin/billing-reconciliation` (internal dashboard for subscription/invoice/webhook consistency).
7. `/admin/launch-readiness` (internal go/no-go operational cockpit).
8. Plan status reflects implemented launch APIs:
9. `POST /api/v1/consents`
10. `GET /api/v1/consents/current`
11. `POST /api/v1/me/data-export`
12. `GET /api/v1/me/data-export/[id]`
13. `POST /api/v1/me/deletion-request`
14. `GET /api/v1/me/deletion-request/[id]`
15. `POST /api/v1/billing/portal`
16. Legacy `/api/stripe/*` is in deprecation compatibility mode.
17. Admin DSR/billing/launch-readiness workflows are internal app functionality.
18. Internal AI interface contract now includes capability metadata/check methods for provider/model/media support:
19. `lib/services/ai/ai-service.interface.ts` (`getCapabilities`, `checkCapabilities`).
20. Internal AI run model now includes execution lease fields:
21. `PolicyAnalysisRun.executionLeaseId`, `executionLeaseExpiresAt`, `leaseHeartbeatAt`.

---

### Test Cases and Scenarios
1. Documentation accuracy checks:
2. DSR is no longer listed as a missing implementation.
3. Remaining blockers list only truly open items.
4. Execution update references concrete implemented files/routes.
5. Encoding/readability checks:
6. No mojibake artifacts in plan headings/body.
7. Legal regression checks:
8. Terms/privacy consent versions match `GR-GA-2026.03`.
9. Greek legal titles render normalized text (no mojibake) at runtime.
10. Billing reconciliation checks:
11. `/admin/billing-reconciliation` renders snapshot summary and issue samples.
12. `POST /api/v1/jobs/billing-reconciliation` returns summary payload and `needs_attention`.
13. Launch-readiness checks:
14. `/admin/launch-readiness` renders aggregate status, blockers, warnings, and synthetic detail rows.
15. `POST /api/v1/jobs/launch-readiness-snapshot` returns level, signal counts, and component snapshots.
16. SRE runbook coverage:
17. AI provider, billing webhook, auth/session, and localization incident runbooks exist under `docs/operations/`.
18. AI capability guard checks:
19. Unsupported provider/model/media combinations are blocked pre-dispatch with classified errors.
20. Migration deploy checks:
21. `npx prisma migrate deploy` applies `20260305120000_add_analysis_run_execution_lease` cleanly.
22. Existing post-approval readiness checks remain unchanged and testable.

---

### Go/No-Go Checklist (Hard Gate)
1. All Phase 1-5 exit gates complete.
2. Zero open P0 defects.
3. Zero open P1 defects in launch-critical scope.
4. CI green on release commit.
5. Legal/compliance sign-off completed.
6. Rollback rehearsed and documented.
7. Launch command center staffed for first 72h.

---

### Assumptions and Defaults
1. Source-of-truth for this update is the current working tree.
2. This execution wave includes legal, billing, DSR, and launch-readiness operations updates.
3. No external customer-facing API contract is broken by these changes.
4. Existing in-progress workspace changes are intentional and not reverted by this update.
