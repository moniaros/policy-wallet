# Evidence Index (GR-GA-2026.03)

## Release Baseline
1. Release-candidate commit hash: `14f75fd802f63a0ec2e783dcca08ae8aa54521a4`.
2. All artifacts in this index are tied to this baseline unless explicitly marked otherwise.

## Naming Convention
1. `<domain>-<artifact>-<YYYY-MM-DDTHH-mm-ss-SSSZ>.<ext>`
2. Domain values: `operations`, `compliance`, `uat`, `governance`, `ai`.

## Folder Map
1. `docs/operations/evidence/`: SRE drills, launch-readiness snapshots, synthetic checks, AI drill logs.
2. `docs/compliance/evidence/`: legal/compliance, DSR, billing rollback, reconciliation evidence.
3. `docs/uat/evidence/`: persona/locale journey sign-offs and defect snapshots.
4. `docs/governance/evidence/`: branch protection, CI, and go/no-go governance artifacts.

## Existing Evidence (Current)
1. `docs/compliance/evidence/billing-rollback-drill-2026-03-05T10-07-27-574Z.json`
2. `docs/compliance/evidence/dsr-e2e-drill-2026-03-05T10-11-50-992Z.json`
3. `docs/operations/evidence/analysis-threshold-alert-drill-2026-03-04T09-31-26-883Z.json`
4. `docs/operations/evidence/on-call-dry-run-2026-03-04T09-32-06-723Z.json`
5. `docs/operations/evidence/restore-rehearsal-2026-03-04T09-32-50-171Z.json`
6. `docs/operations/evidence/launch-readiness-snapshot-2026-03-03T15-39-17-980Z.json`
7. `docs/governance/evidence/migration-deploy-2026-03-05T15-37-33-818Z.md`
8. `docs/governance/evidence/ai-incident-env-snapshot-2026-03-05T15-37-50-222Z.md`
9. `docs/governance/evidence/migration-status-2026-03-06T11-02-38-533Z.md`

## Day 1 Artifacts (2026-03-06)
1. `docs/operations/evidence/ai-env-readiness-2026-03-06T10-57-43-117Z.json` (updated on 2026-03-07; ready in drill execution context)
2. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.json` (live rerun result; completed)
3. `docs/operations/evidence/ai-drill-a-2026-03-06T10-57-43-117Z.alerts.ndjson` (threshold alert logs)
4. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.json` (live rerun result; completed)
5. `docs/operations/evidence/ai-drill-b-2026-03-06T10-57-43-117Z.telemetry.ndjson` (step/run telemetry logs)
6. `docs/governance/evidence/required-checks-2026-03-06T10-57-43-117Z.md` (template created)
7. `docs/governance/evidence/branch-protection-verification-2026-03-06T10-57-43-117Z.md` (template created)
8. `docs/governance/evidence/ci-runs-release-commit-2026-03-06T10-57-43-117Z.md` (template created)
9. `docs/governance/evidence/go-no-go-agenda-2026-03-06T10-57-43-117Z.md` (template created)
10. `docs/governance/evidence/go-no-go-decision-2026-03-06T10-57-43-117Z.md` (template created)
11. `docs/uat/evidence/defect-snapshot-2026-03-06T10-57-43-117Z.json` (template created)
12. `docs/uat/evidence/policyholder-el-staging-2026-03-06T10-57-43-117Z.md` (template created)
13. `docs/uat/evidence/policyholder-en-staging-2026-03-06T10-57-43-117Z.md` (template created)
14. `docs/uat/evidence/agent-el-staging-2026-03-06T10-57-43-117Z.md` (template created)
15. `docs/uat/evidence/agent-en-staging-2026-03-06T10-57-43-117Z.md` (template created)
16. `docs/uat/evidence/admin-el-staging-2026-03-06T10-57-43-117Z.md` (template created)
17. `docs/uat/evidence/admin-en-staging-2026-03-06T10-57-43-117Z.md` (template created)

## Pending Evidence by Closure Day
1. `2026-03-09 (Mon)`: legal/compliance signatures in `docs/compliance/*.md` artifacts.
2. `2026-03-10 (Tue)`: SRE restore decision/waiver evidence in `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md`.
3. `2026-03-11 (Wed)`: completed UAT persona sheets and defect snapshot values in `docs/uat/evidence/*`.
4. `2026-03-12 (Thu)`: branch protection capture, CI run links, signed go/no-go decision package in `docs/governance/evidence/*`.
