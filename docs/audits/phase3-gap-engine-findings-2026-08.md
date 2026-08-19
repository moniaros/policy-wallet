# Phase 3 — Gap engine: making "rules decide" true
**Step 0 findings · 2026-08-19 · written before any code change**

> **Evidence rule (standing).** `(file:line)` or a named production query for every claim.
> Two of my own earlier statements are corrected below (§1a, §6).

---

## 1. Provenance of a user-visible gap, today

### 1a. Correction to my own earlier finding

I previously said "the LLM decides `isDetected` **and** the severity". Precisely:

| source | detection | severity |
|---|---|---|
| `gap_detection` step (`analyzeGaps`) | **LLM** — `gapResults[].isDetected: z.boolean()` (`anthropic-ai.service.ts:236`, gemini `:320`, openai `:216`) | **hardcoded literal `"medium"`** at `orchestrator:2685`. The schema has **no severity field at all** — the model never emits one here |
| `clarity.coverageGaps` | **LLM** — presence in the array *is* the detection signal; there is no boolean | **LLM** — `severity: z.enum(["low","medium","high","critical"])` (`anthropic:325`, gemini `:446`, openai `:307`), written verbatim at `orchestrator:2700` |

**Merge order matters**: `gap_detection` populates first, and the clarity loop skips slugs already present (`orchestrator:2698`). So the hardcoded `"medium"` **silently overrides** a clarity-assessed severity whenever both flag the same slug.

**And the clarity prompt contains no severity rubric.** `prompts.ts:209-260` gives goals and scoring rules but never defines what separates `low` from `critical`; the model picks from the enum unaided.

### 1b. The LLM authors the catalogue

`orchestrator:2767-2781`: when a clarity slug has no canonical definition, the orchestrator **creates a `GapDefinition`** from model output — `severity: details.severity`, `defaultSeverity: details.severity`, `ruleId: "ai_<slug>"`,
`detectionLogic: { source: "ai_clarity_pipeline" }`, `isActive: false`.

**Production consequence, queried 2026-08-19:** **41 of 41** gap definitions are AI-minted
(`rule_id LIKE 'ai_%'`), **35 active**, every one with `detection_logic = {"source": "ai_clarity_pipeline"}`
— a marker, not an evaluable rule. The rule engine in production has **nothing to evaluate**.

The catalogue drift is visible in the data — the same risk, different slug, different severity:

| concept | slugs | severity |
|---|---|---|
| cyber | `cyber_risk_gap` / `cyber_liability` / `cyber-risk-gap` | **critical** / medium / medium |
| mental health | `mental_health_exclusion` / `mental-health-exclusion` | **high** / medium |
| professional liability | `professional_liability_gap` / `professional_liability` | **critical** / medium |

Severity is an artifact of which slug the model emitted, not a judgement about risk.

**Dev diverges completely**: it holds genuinely evaluable rules (`acord_field_check` with
`missing`/`is_false`/`all_false`, `date_within_days`) against real `AcordData` paths.

### 1c. Three gap pipelines, one table, no source column

1. **Orchestrator** (live) — `createRun`/`executeRun`, reached from the wallet Analyze action
   (`wallet/actions.ts:1546`), the review route (`review/route.ts:68`), the QStash consumer
   (`jobs/execute-analysis:77`), and admin re-run (`admin/policy-actions.ts:152`).
2. **Deterministic** `lib/gap-detection.ts` — reachable ONLY from a manual refresh button
   (`coverage-insights/actions.ts:19` ← `RefreshAnalysisButton.tsx:19`) and
   `api/v1/jobs/process-policy` — **not a cron** (absent from `vercel.json` crons) and called by
   nothing in the repo.
3. **`GapAnalysisService.analyzePolicy`** — a third path with a third severity provenance
   (`gap-analysis.service.ts:309`, `defaultSeverity`). Wired to a server action no UI imports —
   **dead**.

**They cannot coexist**: `orchestrator:2828` `deleteMany({where:{policyId}})` wipes **every**
GapInstance for the policy on each deep run, including rule-authored rows.

Severity is written once at creation and never revised; `recommendation-generator.ts:371`
passes it through verbatim into `RecommendationInstance.urgency`.

---

## 2. Can the rules actually decide? — the honest delta

`lib/gap-detection.ts` is a small but reasonable rule DSL: `missing_coverage`, `low_limit`,
`insurer_match`, `duration_short`, `always`, `acord_field_check` (operators `equals`,
`not_equals`, `is_false`, `is_true`, `missing`, `less_than`, `all_false`), `date_within_days`,
`payment_frequency_check`. Severity comes from `GapDefinition.severity` (`gap-detection.ts:38`)
— already correct.

**Of the 9 seeded definitions, 4 are deterministic — and 2 of those are unsafe:**

| slug | decidable today? | note |
|---|---|---|
| `missing_coordination_centre` | **YES** | `health.coordinationCentre.phone` truly optional; "missing" means "not recorded" |
| `green_card_expiring` | **YES** | optional date, calendar-correct day math |
| `missing_enfia_components` | **YES\*** | the three `property.*CoverageIncluded` fields are `.default(false)` |
| `missing_leishmaniasis` | **YES\*** | `pet.leishmaniaCovered` is `.default(false)` |
| `motor-theft`, `motor-legal` | **NO — missing data** | no typed flag; concept lives in free-text `coverages[]` |
| `health-outpatient` | **NO — missing rule** | `health.outpatientLimit` exists; no agreed threshold |
| `home-earthquake` | **NO — missing rule** | field already exists and is used elsewhere — purely unauthored |
| `low_deductible_premium_waste` | inactive by design | regulatory/product grounds |

### 2a. The defect underneath everything: unknown is not representable

`AcordDataSchema` applies **`.default(false)`** to
`property.fireCoverageIncluded` / `earthquakeCoverageIncluded` / `floodCoverageIncluded`
(`acord-data.ts:109-111`), `pet.leishmaniaCovered` (`:172`),
`vehicle.hasRoadsideAssistance` (`:89`), `health.directBillingAvailable` (`:134`).

The schema is passed directly to `generateObject`, so the SDK **materialises those defaults into
stored `acordData`**. If the model emits a `property` object but never addresses earthquake
cover, `earthquakeCoverageIncluded` is persisted as `false` — **indistinguishable from a policy
that explicitly excludes it.**

A deterministic rule reading that field cannot tell "confirmed absent" from "never looked", so
it will assert a gap that may not exist. Compounding it: per-field **confidence/citation exists
for only 9 policy-metadata fields** (`extraction-enrichment.ts:53-70`), is flag-gated off by
default, and covers **none** of the coverage-level fields a rule would read.

**This is the precondition for trustworthy rules, and it is fixable.**

### 2b. Scale

`lib/wallet/gap-report.ts:122-654` documents **~78 distinct slugs observed in production AI
output**. For most of the branches they cover — liability, income protection, roadside, group
life, legal expenses, group pension, personal accident, boat detail — `AcordDataSchema` has
**no typed section at all**; the source files say so explicitly (e.g. `liability.ts:6-9`:
"coverage detail lives only in the free-text `coverages[]`/exclusions").

So: rules can decide **a handful**; the AI currently reports **~78 concepts**.

### 2c. Two dead rule types

- `payment_frequency_check` reads `premium.frequency`, but the schema has `policy.premium
  { amount }` and a **sibling** `policy.premiumFrequency` (`acord-data.ts:194-198`) — it can
  never fire.
- `low_limit`'s default path `coverage.sumInsured` does not exist (there is `coverages[]` and
  `policy.sumInsured`).

### 2d. No executable test of the evaluator

`tests/unit/gap-rule-integrity.test.ts` is **source-text regex pinning**, not behaviour. No test
calls `evaluateSingleRule`/`evaluateAcordFieldCheck` with fixtures — so the `.default(false)`
false-positive in §2a is caught by nothing.

---

## 3. What Phase 3 will change

1. **Structural constraint** — remove `isDetected` from the gap schema and `severity` from
   `coverageGaps`, in all three providers, the mock, and `ai-service.interface.ts`; type the
   GapInstance write so severity can only originate from a rule decision.
2. **Rewire the orchestrator** — evaluate `evaluateGapLogic` over the freshly extracted
   `AcordData`; severity from `GapDefinition.severity`; the LLM's role reduced to *explaining* a
   gap the rules already found. Delete the auto-mint site and the clarity→GapInstance path.
3. **Make unknown representable** — drop `.default(false)` from the six coverage booleans so a
   rule can distinguish "confirmed absent" from "not extracted", and treat unknown as **no gap**.
4. **Provenance** on every GapInstance: which rule fired, the inputs it read, engine version.
5. **Author the rule that is authorable today** (`home-earthquake`).
6. **Executable evaluator tests**, including unknown-vs-false.
7. **One path** — remove the dead `GapAnalysisService.analyzePolicy` and the orphaned
   `process-policy` route.
8. **Central severity display constraint** (Gate 3b) — see §4.
9. **Truncate GapInstance** (prod = 0 rows; free).

### The consequence, stated plainly

The mission's rule is: *"For gap types the rules cannot yet decide: either write the rule, or
remove the gap type from user-visible output. Do NOT keep an LLM-decided gap in the UI as an
interim."*

Applied honestly, user-visible coverage gaps collapse from ~78 AI-reported concepts to **the
handful the rules can decide**. Production currently holds **0 `gap_instances`**, so nothing is
taken from any user today — but this materially narrows a capability the marketing surface
sells. It is the correct trade under the stated principle, and it is flagged here rather than
buried.

---

## 4. Severity — two gates, and they are not the same

- **Gate 3a (this phase):** severity is rule-derived and traceable to a named rule.
- **Gate 3b (human track, NOT closable by code):** the thresholds and labels are
  underwriter-validated. Until 3b closes, severity must not be presented as an authoritative
  judgement anywhere. Enforced centrally via a shared primitive, not per page.

**Passing 3a does not pass 3b.**

---

# Implementation (committed `92fdd155`, `480a082e`)

| # | Change |
|---|---|
| 1 | **`isDetected` and `severity` deleted from the AI contract** — `ai-service.interface.ts`, all three providers, the mock. Deleted rather than ignored: an ignored field is one refactor from being read again |
| 2 | **`decideGapsForPolicy`** (`lib/gap-detection.ts`) is the decision point. It evaluates rules against the freshly extracted `AcordData`; severity comes from the `GapDefinition` the rule fired on |
| 3 | **`hasEvaluableRule`** refuses the two non-rule shapes (`{check:…}`, `{source:"ai_clarity_pipeline"}`), so a definition nobody wrote a rule for produces nothing instead of failing silently to `false` |
| 4 | **The mint site is gone** — the orchestrator can no longer create a `GapDefinition` |
| 5 | **Unknown is representable** — `.default(false)` removed from six coverage booleans; `is_false` now requires an explicit `false`, and `all_false` fires on a confirmed-missing component, not an unread one |
| 6 | **Provenance persisted** — `ruleId`, `ruleInputs`, `engineVersion` on every gap (migration applied to prod + dev) |
| 7 | **The third pipeline removed** — `GapAnalysisService.analyzePolicy` and the server action nothing imported |
| 8 | **Gate 3b primitive** — `lib/gaps/severity-display.ts`, with a guard test and an eleven-entry debt list |
| 9 | **Production's AI-authored definitions deactivated** — all 41 (`still_active` now 0). They can never fire by construction; leaving them active advertised gap types nothing could evaluate |

## Verification

| Acceptance criterion | Result |
|---|---|
| Every user-visible gap has detection + severity from a named rule, with provenance | ✅ structurally — `decideGapsForPolicy` is the only producer, and it writes `ruleId`/`ruleInputs`/`engineVersion`. ⚠️ **A live three-gap trace was not run** — see below |
| No code path lets an LLM set `isDetected`/`severity` | ✅ the fields do not exist in the interface, any provider schema, or the mock. `gap-automint.test.ts` pins each |
| One orchestration path; dead route and manual-only path gone | ⚠️ **PARTIAL** — the dead third pipeline is deleted, but `api/v1/jobs/process-policy` and the manual `refreshCoverageAnalysis` refresh still call the older `detectGapsForPolicy`. Both now go through the same evaluator, so they cannot disagree about *detection*, but "one path" is not literally true yet |
| GO checklist and behaviour no longer contradict | ✅ see below |
| CLAUDE.md records the invariant | ✅ |

**Gate:** `tsc` clean · ESLint 0 · `audit:api-auth` pass · `lint:utf8` 1818 · i18n pass ·
**4573/4573 unit tests (434 files)**. Two guards red-green proven.

### The contradiction, quoted, resolved

GO checklist: *"Underwriter sign-off — CoverageEnvelope severities (placeholders until then;
**never surface as authoritative in any UI**)."*

Behaviour before: `GapInstance.severity` was a model-chosen enum or a hardcoded literal,
rendered as a red CRITICAL badge on ten surfaces, with a caveat on three.

Behaviour now: severity is rule-derived (3a) and every surface must render it through
`describeSeverity()`, which attaches the caveat until `SEVERITY_UNDERWRITER_VALIDATED` flips.
The eleven surfaces that still hand-roll it are named in the guard as debt with a ceiling.
**They agree in direction and in enforcement; they do not yet agree on all eleven screens.**

## GATE 3a — PASSED. GATE 3b — BLOCKED (underwriter), as designed.

## Honest remainder

1. **No live end-to-end trace.** The mission asked for a trace of three gap types through the
   new path. Production has 0 `gap_instances` and 0 active rule-bearing definitions, so there
   is nothing to trace against without seeding a catalogue first. The evaluator is covered by
   15 executable unit tests (there were none before); the orchestrator wiring is not
   integration-tested.
2. **Production now produces no coverage gaps at all.** Every definition there was AI-authored
   and is deactivated. This is the mission's stated rule applied honestly — but it means the
   gap capability is dark in prod until a rule-bearing catalogue is seeded.
3. **~78 AI-observed gap concepts have no rule and no data to write one from.** For several
   branches (liability, income protection, group life, legal expenses, personal accident)
   `AcordDataSchema` has no typed section at all.
4. **Eleven UI surfaces still hand-roll severity presentation**, eight of them without any
   caveat.
