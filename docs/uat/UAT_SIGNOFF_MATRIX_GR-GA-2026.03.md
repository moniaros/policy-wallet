# UAT Sign-Off Matrix (GR-GA-2026.03)

## Scope
1. Full platform UAT for policyholder, agent, and admin journeys.
2. Locales: `el` and `en`.
3. Environments: staging (required) and production smoke (required after go/no-go).

## Release Baseline
1. Release-candidate commit: `14f75fd802f63a0ec2e783dcca08ae8aa54521a4`.
2. Evidence must reference this baseline unless a newer approved release candidate is documented.

## Journey Sign-Off Grid
| Persona | Locale | Environment | Status (`Pass`/`Fail`/`Blocked`) | Owner | Date (YYYY-MM-DD) | Evidence Path | Notes |
|---|---|---|---|---|---|---|---|
| Policyholder | el | staging | Pending | Product + QA |  | `docs/uat/evidence/policyholder-el-staging-2026-03-06T10-57-43-117Z.md` | Template created on 2026-03-06. |
| Policyholder | en | staging | Pending | Product + QA |  | `docs/uat/evidence/policyholder-en-staging-2026-03-06T10-57-43-117Z.md` | Template created on 2026-03-06. |
| Agent | el | staging | Pending | Product + QA |  | `docs/uat/evidence/agent-el-staging-2026-03-06T10-57-43-117Z.md` | Template created on 2026-03-06. |
| Agent | en | staging | Pending | Product + QA |  | `docs/uat/evidence/agent-en-staging-2026-03-06T10-57-43-117Z.md` | Template created on 2026-03-06. |
| Admin | el | staging | Pending | Product + QA |  | `docs/uat/evidence/admin-el-staging-2026-03-06T10-57-43-117Z.md` | Template created on 2026-03-06. |
| Admin | en | staging | Pending | Product + QA |  | `docs/uat/evidence/admin-en-staging-2026-03-06T10-57-43-117Z.md` | Template created on 2026-03-06. |

## Defect Gate
| Check | Required Value | Current Value | Status | Owner | Date | Evidence |
|---|---|---|---|---|---|---|
| P0 defects | `0` |  | Pending | Engineering + QA |  | `docs/uat/evidence/defect-snapshot-2026-03-06T10-57-43-117Z.json` |
| Launch-critical P1 defects | `0` |  | Pending | Engineering + QA |  | `docs/uat/evidence/defect-snapshot-2026-03-06T10-57-43-117Z.json` |
| Non-critical defects have owner + severity + post-GA target date | `100%` |  | Pending | Engineering + QA |  | `docs/uat/evidence/defect-snapshot-2026-03-06T10-57-43-117Z.json` |

## Required Scenario Coverage
1. Policyholder onboarding to policy upload and AI analysis.
2. Agent customer workflow including policy review and collaboration actions.
3. Admin operations: DSR queue, billing reconciliation view, launch-readiness cockpit.
4. Greek/English localization checks for critical user-facing screens and errors.
5. Billing lifecycle checks for checkout, portal, and webhook-backed state updates.

## Final UAT Sign-Off
| Role | Name | Decision (`Approved`/`Rejected`) | Date (YYYY-MM-DD) | Notes |
|---|---|---|---|---|
| QA Lead |  |  |  |  |
| Product Owner |  |  |  |  |
| Engineering Lead |  |  |  |  |
| Support Lead |  |  |  |  |
