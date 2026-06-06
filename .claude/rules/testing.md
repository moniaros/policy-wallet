# Testing

**Tests ship with each change** — a feature or fix is not done until its tests land in the
same gate.

## Cost guardrails are NEGATIVE assertions (most important)

The point of the pipeline suite is to assert that **expensive clients are NOT called on the
cheap paths** — a silent cost regression is invisible otherwise. Patterns:

- Dynamic: inject a spy model/OCR client and assert `call-count == 0` on the $0 path
  (e.g. model resolver never called when regex/template resolve a fixture; OCR HQ pass only
  on coverage pages; duplicate content-hash → extractor called once).
- Static: assert a deterministic/$0 module's source references no model/OCR/vision client
  (`tests/unit/ingestion-cost-guardrails.test.ts`). The residual LLM gap-detection is tracked
  there as `it.fails` markers that flip RED when the `detectGaps` cutover lands.

## Dependency injection for mocking

Model and OCR clients are injected (see cost-guardrails), so tests pass fakes — never mock
deep internals or hit a real client. If new code hard-imports an expensive client, refactor
to inject it (behavior-preserving) rather than testing around it.

## Runner + structure

- **Vitest** (`npm run test:unit` → `vitest run tests/unit`; jsdom env, globals, `@` alias,
  `tests/setup.ts`). Node-only specs use `// @vitest-environment node`.
- Reuse `tests/helpers/` (`fixtures.ts`, `test-db.ts`) before adding new helpers.
- Assert gap logic explicitly — **no snapshot tests as a substitute** for explicit
  assertions on `detectGaps` output.

## Databases & network

- **No real network / LLM / OCR anywhere in the suite** — mock at the injected boundary.
- DB tests run **only** against `TEST_DATABASE_URL` (a separate schema in local Supabase);
  `tests/helpers/test-db.ts` hard-refuses the prod pooler and skips when unset. **Never test
  against the dev/prod DB.** `tests/setup.ts` points the Prisma singleton at the test DB when
  configured.

## Fixtures & HTTP boundary

- Committed, anonymized Greek PDFs in `tests/fixtures/` (text-layer + scanned, with
  `€50.000` + dd/mm/yyyy), reproducible via `scripts/generate-pipeline-fixtures.mjs`.
- HTTP-boundary collection in `postman/` run via Newman (`npm run test:newman`,
  `--working-dir tests/fixtures`); CI `api-collection` job is secret-guarded
  (`NEWMAN_BASE_URL` / `NEWMAN_AUTH_TOKEN`).
