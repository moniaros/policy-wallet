# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._
**Last updated:** 2026-07-03

## Current phase
Phase 1 — Core Journey Compliance, tracking toward **Greece GA** (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`). Active branch: `NEW-UI`. **All former launch-gating security/compliance criticals are now closed.**

## Done (recent)
- **Implemented the AI-processing consent gate (GDPR Art. 9) — closes former Top-risk #1.** `ai_processing` ConsentType + `User.aiProcessingConsentVersion` (migration `20260703000000_ai_processing_consent` — **authored but not yet applied; no DB reachable locally**); server-side gate on the policy **owner's** consent in `orchestrator.createRun()` (blocked run, `AI_CONSENT_REQUIRED`), `GapAnalysisService.analyzePolicy()`, and `askPolicyQuestion` (Q&A also reaches the LLM — new finding); capture via `AiConsentModal` at wallet upload, onboarding step 2, and re-run buttons; anonymous `ai_processing` consent rejected (401). 8 new unit tests. Details: `docs/audits/ai-advice-compliance.md` Part 3.
- **Production build + CI fixes:** builds failed without `AUTH_SECRET` (required by `lib/env.ts` at module eval) — added CI placeholder to the build job; ESLint now covers `**/*.mjs` (the new `seed-agent-demo.mjs` had 30 would-be CI errors); `tests/setup.ts` localStorage polyfill (Node 22+ webstorage global clobbers jsdom's — CI's Node 20 unaffected). Note: **CI only triggers on `main`/`develop`** — `NEW-UI` has never been CI-validated.
- **Repo hygiene:** removed ~45 tracked junk files (build/tsc/test logs, page dumps, one-off root scripts, `graphify-out/` 4.5 MB, playwright debug shots, stale `playwright-report`/`test-results`, `screenshots/` untracked-kept-local); design references moved to `docs/design/`, spec .docx to `docs/reference/`; `.gitignore` hardened. SRE drill evidence logs kept (referenced by `docs/operations/SRE_DRILL_EVIDENCE_*`).
- **Dependency audit:** `npm audit fix` applied — 41 → 10 vulnerabilities. Remaining need breaking changes (see risks #3).
- All guardrails + 118/118 unit tests + production build **green** locally (Node 26; CI pins Node 20 — no version-specific failures beyond the fixed localStorage one).

## In progress
- `NEW-UI` redesign branch (active; this session's work is uncommitted on it).
- Phase 1 login hardening — production passkey/biometric handshake (currently UI-first prefill only).

## Blocked
- **Consent-gate migration not applied to the real (Supabase) DB** — no `.env` on this machine. The migration chain **is verified**: `prisma migrate deploy` + `verify:migrations` ran green against a throwaway local Postgres, and a live-DB integration probe confirmed blocked→consent→queued. Run `npx prisma migrate deploy` against the real DB at deploy time. Browser-level E2E of the consent modal still needs a real Supabase env.

## Top risks (ranked)
1. **High — auth gaps (Phase 1):** no production passkey/biometric verification; 30-day session persistence not enforced/tested.
2. **Medium — assorted scope gaps:** `analysis-runs/[runId]` grant check accepts *any* active owner→grantee grant, not one scoped to `policy:<id>` (`app/api/v1/policies/[id]/analysis-runs/[runId]/route.ts:36`); `share` GET AccessGrant trust chain; `createUserTask`/`submitQuestionnaireResponse` recipient/instance not ownership-checked.
3. **Medium — remaining npm vulnerabilities (10):** criticals are in the **dev-only** vitest UI server (fix only in a 4.1 beta); highs are `nodemailer` (needs major 7→9 — SMTP header-injection class) and `serialize-javascript` via `@ducanh2912/next-pwa`. Majors available: Prisma 5→7, ai-sdk 3→4, `@supabase/ssr` 0.8→0.12 — plan as deliberate upgrades, not audit-fix.
4. ~~Critical — AI-processing consent missing (GDPR Art. 9)~~ **RESOLVED** this session (gate + capture + tests; migration application pending, see Blocked).

## Next 3 actions
1. Apply `20260703000000_ai_processing_consent` to the real DB (`npx prisma migrate deploy` with the production `.env`) and do one browser pass of the consent flow (upload → modal → analysis queues; Q&A without consent → localized error). _Session work is committed on `NEW-UI` (e6f7ae5…031ad31), not pushed._
2. Decide whether CI should also trigger on `NEW-UI` — today CI only runs on `main`/`develop`, so this branch has never been CI-validated remotely.
3. Add `scope: policy:<id>` to the `analysis-runs/[runId]` grant check; schedule the nodemailer 7→9 major bump (its 6 highs are the worst production-code vulnerabilities left).
