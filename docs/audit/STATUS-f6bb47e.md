# PolicyWallet — Project Status

**Updated:** 2026-09-12 · **Baseline:** `NEW-UI` / `f6bb47e` · Local evidence only.

## Current phase
PW-AUDIT-01 Phase 0 delivered for owner review. **Tracks A–G have not started; GA readiness is not established.** See [product truth](audit/PRODUCT-TRUTH.md) and [approval-dependent findings](audit/HALTS.md).

## Done
- Traced upload, AI/legacy/profile gap paths, shared records, outbound artifacts, pricing and public capability claims. English report ends with the one-page Greek product explanation.
- Counted 9 seeded document definitions (4 named branches + `all`) and 14 separate profile rules; production coverage and real-document accuracy remain unknown.
- Verified sharePolicy/onboarding auth fixes remain; documented remaining scope/recipient defects, missing consent, tracked private-key exposure and apparent fixture identifiers.
- Eight dependency-free local assertions passed, confirming bounded behavior/defects. Frozen gap-engine SHA-256 unchanged. No product code or production state changed.

## In progress
- Owner review of Phase 0 and its evidence limitations. Existing unrelated working-tree changes preserved.

## Blocked
- Explicit Phase 0 approval required before tracks. Consent/privacy, engine, schema, pricing/Terms and send-policy changes require specific proposals/approval.
- No admissible anonymised benchmark or production evidence. `node_modules` absent: Vitest/build/full guardrails not run; available Node 26.8.1 differs from required 20.11.0.

## Top risks — broken / insecure (launch gates)
1. **Critical:** tracked service-account private key; validity unknown. Owner rotation/exposure review required. Apparent identifying fixture fields also need privacy review.
2. **High:** missing AI-processing consent; resource/recipient and retained-relationship access gaps; storage privacy not established.
3. **High:** default Gemini models missing from cost table; 1,000x internal unit mismatch; AI gap decisions/exports lack strict provenance boundary; catalogue selection/history and notification-status defects. Public accuracy/speed/scale claims lack evidence.

## UI/UX backlog (separate; no aesthetic launch gate)
No visual verdict or mobile measurements this phase. Marketing layout, density and 320/390/430 integrity await approved tracks; misleading claims and translation failures are correctness issues.

## Next 3 actions
1. Owner reviews Phase 0/HALTS and handles credential exposure; no production cleanup is authorised.
2. Approve concrete security, consent/storage and analysis-truth/accounting remediation proposals before feature expansion.
3. Establish sanitised labelled corpus and isolated Node 20.11.0 test environment; then schedule approved tracks against verified findings.
