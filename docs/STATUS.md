# STATUS

## Current phase
**B2B subset release preparation — 2026-09-22**, branch `codex/agent-workspace`. Not deployed. [Implementation and remaining scope](audits/agent-workspace-implementation-2026-09.md). [Previous release](archive/STATUS-before-agent-workspace-2026-09-22.md).

## Done
- Document source selection now respects known effective dates and excludes superseded versions; undated renewals no longer outrank dated renewals. Focused follow-up: 24 tests passed. Date population and explicit queued-document processing remain unfinished.
- Scoped portfolio/counts and lifecycle corrections; honest extraction/review states, localized templates, active coverage, action-first dashboard, serial multi-file intake and versioned extraction reuse.
- Flagged private suggestions/feedback/revisions, exact-content approval and idempotent in-app delivery; consent/quota and relationship controls. Hardened historical collaboration access.
- Two identical additive dev + production migrations verified: 20 columns, RLS, 2 FKs; migration check passes. Browser demo save → stale approval block → fresh approval → delivery verified.
- Latest full unit checkpoint: 7,603 tests / 663 files passed; agent journey 10 passed + 1 passed on retry. Build, types, lint, API inventory (108), i18n/UTF-8 and dev migration verification passed.

## In progress
- Focused review-page layout checks pass at 320/390/1440px; full route matrix remains.
- Remaining accepted scope: durable batches/document chains, page/OCR artifacts, incremental assessments, targeted verification/economics, proposal integration and full 19-PDF accuracy/cost benchmark. Neither AI rollout flag is enabled by default.

## Blocked
No deployment access blocker: production migrations applied through the existing authenticated Supabase SQL editor; independent SELECT verified columns/RLS/FKs/checksums. Full-plan benchmark and infrastructure remain incomplete.

## Top risks ranked
1. **Release gate:** OCR/verification accuracy and costs are not benchmarked; six-field model agreement is not measured accuracy.
2. **Release gate:** accepted infrastructure/workflow scope remains incomplete; rollout must describe only the shipped subset.
3. **UX/performance:** earlier 7px overflow not reproduced in final focused checks; dev requests 5–11s, one flaky journey; legacy generated English remains.

## Next 3 actions
1. Finish mobile/regression verification and batch/document-chain infrastructure.
2. Complete independent 19-document ground truth and controlled end-to-end OCR/cost evaluation.
3. Apply identical additive migrations to production once authenticated access is available, verify, then feature-flagged deploy and live journey.

Before commit/push: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit tests/build and agent journeys.
