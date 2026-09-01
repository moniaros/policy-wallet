# Analysis latency — measurement and the model decision (2026-09-01)

Analysis was slow enough to be painful even on localhost. This records what was
measured, what changed, and what is still on the table. Numbers first; every
claim here comes from a run, not from an estimate.

## What the pipeline actually does

There is **no OCR and no text extraction** in this repo (`docs/build/extraction-current.md`).
`prepareDocument` downloads the PDF and base64-encodes it
(`lib/services/analysis/policy-analysis-orchestrator.service.ts:2566-2573`); the
bytes go to a multimodal model as a `type: 'file'` part. **The LLM is the OCR.**
So "speed up OCR" means, today, "make the model call faster" — there is no
separate reading stage to optimise.

## Where the time went

Baseline, from `policy_analysis_runs` on the dev database:

| run | result | total |
|---|---|---|
| `cmtc2nsgn001l86687vnl4ipi` | completed | **226.7 s** |
| `cmtc4jj1b003k8668lptt1c0c` | failed in extraction | 163.8 s |

Per step on the completed baseline — two calls are 80% of the wall clock:

| step | model | seconds |
|---|---|---|
| document_load_and_validation | — | 3.8 |
| **metadata_extraction_and_verification** | `gemini-3-flash-preview` | **89.8** |
| plain_language_translation (clarity) | `gemini-3.1-flash-lite` | 12.6 |
| coverage_mapping | — | 1.3 |
| **gap_detection** | `gemini-3-flash-preview` | **92.6** |
| savings_detection / checklist / persistence | — | 6.5 |
| | | *~20 s unaccounted = step-boundary DB round trips* |

Input was 11.5K tokens — small. **This was model latency, not payload size.**

## The model benchmark

`scripts/bench-analysis-models.ts`, same 6 MB health policy, same prompts:

| model | extraction | gaps |
|---|---|---|
| `gemini-3-flash-preview` (incumbent) | **FAILED** — "Cannot connect to API: other side closed", twice, 125 s burned | — |
| `gemini-3.5-flash` | 27.8 s | 10.6 s |
| **`gemini-3.1-flash-lite`** | **8.6 s** | **3.1 s** |

The incumbent is a *preview* model and it is degraded: it failed outright here,
and the retry ladder (`MAX_STEP_ATTEMPTS` × model fallback × provider failover)
is what turned that into 90-second steps rather than a fast failure.

## Quality gate — no regression

`npm run eval -- --provider=gemini --suite=all` (golden datasets), incumbent vs
candidate, both with `GEMINI_MODEL_EXTRACTION` and `GEMINI_MODEL_GAP_ANALYSIS`
pinned:

| | extraction cases | gaps | qa | aggregate |
|---|---|---|---|---|
| `gemini-3-flash-preview` | 86 / 100 / 100 / 100 / 100 % | recall 0%, precision 100% | 2/2 PASS | **81%** |
| `gemini-3.1-flash-lite` | 86 / 100 / 100 / 100 / 100 % | recall 0%, precision 100% | 2/2 PASS | **81%** |

Identical, case for case. The change is a latency win with no measured fidelity cost.

## What changed

`lib/env.ts` — `GEMINI_MODEL_EXTRACTION` and `GEMINI_MODEL_GAP_ANALYSIS` default
to `gemini-3.1-flash-lite`. Both remain env-overridable; the price entries in
`lib/token-utils.ts` already existed.

**End-to-end proof** — a real run triggered through the app
(`POST /api/v1/policies/:id/review`, run `cmtipsfaj002cx9ki00ly1zk5`):

| step | seconds |
|---|---|
| document_load_and_validation | 4.0 |
| metadata_extraction_and_verification | **12.5** |
| plain_language_translation | 10.8 |
| coverage_mapping | 1.3 |
| gap_detection | **10.1** |
| savings / checklist / persistence | 6.6 |
| **total** | **64.3 s, completed** |

226.7 s → 64.3 s locally. Of the remaining 64 s, ~19 s is step-boundary DB
round-trip time that exists only locally: the dev database is Supabase in Paris
at ~660 ms/query (A-36 in `docs/ASSUMPTIONS.md`), against ~5 ms in production.

## Running on Claude instead

The Anthropic path is fully wired (`lib/services/ai/anthropic-ai.service.ts`).
To use it: set `ANTHROPIC_API_KEY`, set `AI_SERVICE_TYPE=anthropic` (it outranks
key-presence ordering — `ai-service.factory.ts:99-131`), and tune
`CLAUDE_MODEL_EXTRACTION` / `CLAUDE_MODEL_GAP_ANALYSIS` (default `claude-sonnet-5`).
Measure it the same way before committing to it:

```
npx ts-node -r tsconfig-paths/register -P evals/tsconfig.evals.json \
  scripts/bench-analysis-models.ts --provider=anthropic
EVAL_ALLOW_PAID=1 npm run eval -- --provider=anthropic --suite=all
```

Note `CLAUDE_MODEL_*` defaults are Sonnet-class for extraction, gaps and clarity —
more capable and more expensive per call than flash-lite. Benchmark before
switching the fleet.

## Still on the table, in value order

1. **Parallelise clarity and gaps** (~10 s of the remaining 64). They are
   independent — both pass `null` for the document and read only `metadata` +
   `structuredContext` from extraction (`:1467-1475`, `:1605-1616`). *Not done:*
   both run through `executeStepWithRetry`, which calls `reserveTokens`, so
   concurrent execution races on the user's token budget and could surface a
   spurious `TOKEN_LIMIT_BLOCKED`. Needs the reservation made concurrency-safe first.
2. **Make the extraction cache permanent** (`extraction-cache.ts:16`, 24 h TTL).
   It is keyed by SHA-256 of the bytes; identical bytes cannot yield a different
   reading, so the TTL only buys re-billing.
3. **Release the policy at extraction** — after step 2 the insurer, number, dates
   and premium are known. The user could see a real policy row at ~16 s while the
   deep steps continue, provided the UI stays honest about what is still running.
4. **Defer batch translation and the protection-score refresh** off the critical path.
5. **Local-only:** a local Postgres would remove the ~19 s of boundary time; and
   `AI_SERVICE_TYPE=mock` makes analysis instant while working on screens.

## Separate finding, not addressed here

The gaps eval scores **recall 0%** on both models — all three expected gaps
(`no-outpatient`, `no-dental`, `high-deductible`) are missed. This predates the
model change and is unaffected by it. Since `decideGapsForPolicy` (the TS rules)
now decides gaps and the model only words them, the gaps suite may be scoring a
behaviour the model no longer owns. Worth a look on its own terms.
