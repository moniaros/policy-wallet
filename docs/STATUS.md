# STATUS

## Current phase
**B2B first release live — 2026-09-22.** [PR #363](https://github.com/moniaros/policy-wallet/pull/363), production code `4673c1f5`, [release evidence](evidence/agent-workspace/release-2026-09-22.json). Full accepted plan remains in progress; [scope and backlog](audits/agent-workspace-implementation-2026-09.md).

## Done
- **Spec v2 Phase 0 (2026-09-23, `fix/spec-v2-phase0`):** RevenueCat rows keyed per subscriber; proxy role gate reads `app_metadata.roles` and honours the active-role cookie; share re-use/revive instead of duplicate or orphan grants; one invite-redemption core (`lib/invites/redeem-invite.ts`) so typed codes respect direction; analysis polling backs off and stops at 5 min; QStash failure callback marks abandoned runs failed; advisor-added documents notify the owner and are badged. Dev and prod checked: 0 duplicate grants, 0 RevenueCat rows, 0 grants on ended relationships.
- Action-first dashboard, consistent portfolio scopes/counts, honest review states, active coverage, localized templates, serial multi-file intake and versioned extraction reuse.
- Private suggestions/feedback/revisions, exact-content approval and idempotent in-app delivery; ended-relationship access controls; unsaved feedback recovery. Communication workspace enabled; independent second-provider verification off.
- Identical additive migrations verified dev then prod: 20 columns, RLS, 2 FKs, exact checksums. Production deployment READY on www/app/apex aliases.
- 7,608 unit tests / 664 files; 51 agent/responsive cases without retry; build, types, lint, API inventory (108), i18n/UTF-8, private-material, migrations and catalogue checks passed locally. Hosted production build passed.
- Live dashboard and policy workspace verified. Synthetic private draft saved, archived before deletion and absence checked after reload. No production message sent.

## In progress
Durable batches/document chains, page/OCR artifacts, incremental assessments, targeted verification/economics, proposal integration and full 19-PDF accuracy/cost benchmark. Dates remain unpopulated in document chains; legacy English and nested agent-copy issues remain.

## Blocked
GitHub Actions cannot start (billing/spending limit); Vercel Git integration targets an inaccessible team. Release used verified local checks and authenticated CLI against the correct project. Sentry source-map auth token missing.

## Top risks ranked
0. **Spec v2 audit 2026-09-23** ([planning/V2_SPEC_ROADMAP_STATUS.md](planning/V2_SPEC_ROADMAP_STATUS.md), ≈62 % ready): Phase 0 blockers fixed in code (see Done); still open from it: `AccessGrant` has no DB-level uniqueness (app-level dedupe only), `PolicyStatus` lives in three divergent lists, and Task 0.7 (GitHub Actions billing, Vercel Git team, Sentry token, 4 critical advisories) is owner-only.
1. **Security debt:** unchanged dependencies report 35 advisories, including 4 critical; triage and patch promptly.
2. **Full-plan release gate:** OCR/verification accuracy/costs unbenchmarked; six-field agreement is not measured accuracy. Independent verification stays off.
3. **Functional/UX debt:** durable processing, document-chain completion and all-channel approval integration unfinished; legacy English remains.

## Next 3 actions
1. Triage dependency advisories and repair CI/Vercel Git/Sentry configuration (spec-v2 Task 0.7); then spec-v2 Phase 1 (upload wizard, branch quick cards) per the roadmap.
2. Implement durable intake with explicit document targeting/history and derived-artifact lifecycle.
3. Complete page-referenced 19-PDF ground truth and accuracy/cost evaluation before broader AI rollout.

Before further commits/pushes: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant journeys.
