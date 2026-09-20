# Phase 0 — local verification evidence

2026-09-12, `NEW-UI` / `f6bb47e`. No external service, DB bootstrap, credentials, or customer documents are needed for these checks. Available runtime: Node 26.8.1. Required application runtime: Node 20.11.0; dependencies absent. These checks use Node's TypeScript stripping and are **not a Vitest/full-application test result**.

## Dependency-free assertions

Eight assertions passed across the initial seven-check run and one follow-up dispatch check. Consolidated reproduction:

```bash
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { TOKEN_COSTS } from './lib/token-utils.ts';
import { estimatePolicyAnalysisTokenBudget } from './lib/services/analysis/token-budget-estimator.ts';
import { classifyAnalysisFailure } from './lib/services/analysis/failure-classifier.ts';
import { isCriticalStep, isDegradableStep } from './lib/services/analysis/remediation-policy.ts';
assert.equal(TOKEN_COSTS['gemini-2.5-pro'], undefined);
assert.equal(TOKEN_COSTS['gemini-2.5-flash'], undefined);
assert.equal(1e6 / 1e6 * TOKEN_COSTS['gemini-2.0-flash'].input, 0.00007);
const x = { gapDefinitionsCount: 3, checklistPillarsCount: 7 };
assert.equal(
  estimatePolicyAnalysisTokenBudget({ ...x, hasDocument: true }).totalEstimatedTokens -
  estimatePolicyAnalysisTokenBudget({ ...x, hasDocument: false }).totalEstimatedTokens,
  78000
);
assert.equal(classifyAnalysisFailure(new Error('Token budget check failed: monthly_limit_reached')).retryable, false);
assert.ok(isCriticalStep('document_load_and_validation') && isCriticalStep('persistence_and_finalize') && isDegradableStep('gap_detection'));
assert.equal([90, 60, 30, 15, 7].find(m => 7 <= m), 90);
const eligible = [90, 60, 30, 15, 7].filter(m => 7 <= m);
assert.equal(eligible[eligible.length - 1], 7);
console.log('8/8 bounded assertions passed');
JS
```

The last two assertions must be read together: the early lookup is an eligibility gate, while dispatch selects the closest unsent milestone. This **disproved** a suspected selection bug; no renewal-selection defect is asserted in the final report. Source: `lib/services/renewal.service.ts:70,123`.

## Counting and inspection boundaries

- Seed definition count: objects between `const gaps = [` and `for (const gap` in `prisma/seed.ts`; count branch and ruleId literals. Nine definitions: motor 3, health 2, home 2, pet 1, all 1; five ai_check, four acord_deterministic. These are not DB counts.
- Profile rule count: adjacent literal `id` and `lineOfBusiness` entries in `lib/services/gap-engine/profile-gap-rules.ts`: fourteen; life 5, health/legal_expenses 2 each, five other branches 1 each.
- Checklist: eleven pillar `key` entries and 37 check strings in `insurance-clarity-checklist.ts`. Token estimate for document/three definitions/eleven pillars: 187,440.
- Test fixture inventory: `rg --files tests/fixtures` returns one structured fixture. Apparent personal identifiers encountered in its associated test prompted exclusion from benchmarking; no values reproduced here.
- Frozen-engine digest: SHA-256 `f230e51e962402acbce95313fd3be04c9192335e47dfb7bd0f53be3b630d1964`, checked before and after documentation edits. D-V1 identity unavailable.
- Credential exposure: `git ls-files --error-unmatch` confirmed the named service-account artifact is tracked. JSON inspection emitted only booleans for service-account type and nonempty private_key. Local git history identifies last touching commit `0dc95fd`, 2026-03-26. No validity/network/authentication test performed.
- Negative implementation searches: `decideGapsForPolicy`, provenance/under_review/catalogue state identifiers across `lib app components prisma tests`; predecessor names/D-V1/F4 across Markdown docs; current public page inventory; imports/callers for gap engines, notification transports, report generation and product-specific capabilities. Negative searches are local evidence, not production no-consumer proof.
- No Vitest/build/E2E/full CI suite ran. Inspected `vitest.config.ts`, `tests/setup.ts`, failure/remediation/telemetry tests and share-policy mocks. Absence of a global send stub prevents broad dispatch-capable execution.

## Artifact checks

UTF-8 decode and private-key-marker exclusion for all audit/status artifacts; required six sections and Greek explanation; explicit source-reference path/line-bound checks; `git diff --check`; frozen hash equality; final git status compared with initial status. Only audit files were created and STATUS updated by this task. The pre-existing `.claude/settings.local.json` change and other untracked files remain outside the task.
