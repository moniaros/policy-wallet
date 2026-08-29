# HELD — `lib/services/ai/extraction-citations.ts`

**Branch:** `feat/growth-extraction-citations` (local only, never pushed).
**Held on owner instruction, 2026-08-29. Not merged. Release conditions below — recorded, not built.**

## What is on the branch

Exactly two production-affecting changes, plus their tests:

| symbol | effect |
|---|---|
| `CITATIONS_PROMPT_SECTION` | widened — tells the model it may cite `conditions[]`, `coverages[]`, `exclusions[]` by index. **This is the prompt every real extraction receives.** |
| `sanitizeExtractionSources` | membership becomes a predicate instead of exact `Set` equality, so member citations survive into `acordData.extraction.sources` |
| `isCitableKey` | the predicate the sanitizer uses |
| `tests/unit/citation-sanitizer-and-prompt.test.ts` | 8 tests, including the probe over the pre-change predicate |

**`EXTRACTION_CITATIONS=1` is live in production** (restored July 2026), so merging this changes
real extraction behaviour on the next upload. Nothing else on the branch touches production.

## Why it is held

Not because a defect was found. Because **the evidence available cannot establish that there
isn't one.**

The case for merging was "additive text, response schema untouched, sanitizer still bounded". Every
part of that is true and every part of it was verified **against the mock provider** — and the mock
provider is precisely how the **July 2026 Gemini schema-budget incident** stayed invisible: Gemini
rejected every call embedding `AcordDataSchema`, extraction and gap analysis and clarity were all
dead in production, and **CI and E2E stayed green throughout because extraction is route-mocked**
(`docs/status-archive-2026-07.md:131`).

So "low risk" is not a finding here. It is a claim whose only evidence comes from the one component
that has already hidden a total production failure on this exact path. That is the same shape as
the three findings this run produced — a claim with no way to check its own scope — and it was
turned on my own risk assessment rather than on the codebase.

## Release conditions

**Either** condition is sufficient. Both would be better. **Neither is built, and building them is
not queued.**

### 1. A test that exercises a real provider, not the route mock

The actual blocker. Something that sends the widened prompt to Gemini (the active provider) and
asserts the response still parses and still carries scalar citations. July's lesson was that a
prompt/schema change can be fatal in production while every mocked test passes — so a mocked test
of a prompt change is close to no test at all.

Cheapest honest form: one opt-in spec, guarded by an env key, run manually before merge and its
output recorded. It does not need to be in CI to discharge the condition; it needs to have been run
once, against the real provider, on this prompt.

### 2. Failing that — confirmation that extraction failure is observable

If a repeat cannot be prevented, it must at least not be silent. July was **untested AND
unobservable**, and it is the combination that produced a total outage nobody saw. Breaking either
half changes the risk materially.

Discharging this means establishing — with evidence, not by assumption — that a rise in extraction
failures reaches somewhere a person actually looks: a Sentry group, an alert, or the
`admin/extraction-flags` queue. **Not yet checked.** `lib/services/ops/ai-performance.service.ts`
and the extraction-flag queue are the places to look first.

### If neither is in reach

**The file stays on its branch. That is an acceptable outcome, not a failure.** Nothing depends on
it: `citation-keys.ts` shipped separately, the capabilities compile, and their behaviour without it
is the documented backfill state — `getAnchor` finds no member citation, so a capability requiring
evidence returns `cannot_determine` / `no_evidence_anchor`, which is honest and correct.

The cost of holding is that C1 and C2a stay foundation-only. The cost of merging without either
condition is a repeat of July that nothing would catch.

## To merge it later

```
git checkout NEW-UI
git merge --no-ff feat/growth-extraction-citations
```

Then re-run the real-provider check, and watch the first real uploads —
`validateJsonModeObject` logs strict-parse fallbacks, and recurring warns mean the prompt needs
tightening. That is July's own closing instruction, and it applies unchanged.
