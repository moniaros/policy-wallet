# PW-TRANSPARENCY-02 — Goal 0 findings

**Date:** 2026-09-05 · **HEAD:** `32c95229` (NEW-UI) · **Author:** Claude (investigation only, no product code touched)
**Status:** awaiting written approval. Track B and every Track C goal are gated on this document; Track A is gated on the "no product code until approved" rule of Goal 0.

## How to read this

- Every answer names a file and, where it matters, a line. Line numbers are as of `32c95229`.
- Where a spec premise turned out to be stale, the answer says so and cites what is there now. Section H collects them; several Track A items are already done, and several defects the spec did not name were found instead.
- Where a fact could not be established from the repository, the answer says "cannot be determined from the codebase" and names what would establish it. Section I collects them.
- Two documents the spec references are **not in the repository** at any path: `BENCHMARK-TRANSPARENCY-01.md` and `policy-wallet-public-surface-audit.md`. Their claims were checked directly against the code rather than trusted.
- The transformation run's evidence was read and is cited rather than re-measured: `docs/transformation/HALTS.md` (H-001, H-005), `DECISIONS.md` (D-005, D-006, D-014), `PROGRESS.md`, `evidence/outbound/INVENTORY.md` + `METRICS.md`, `evidence/dashboard/BASELINE.md`.

## 0. The ten findings that change the plan

1. **The engine reports only what fired. It never records a check that passed or a check it could not run.** `decideGapsForPolicy` (`lib/gap-detection.ts:109-137`) returns `RuleDecidedGap[]` for rules that evaluated true; nothing else leaves the function. The "checks passed" number the pipeline stores is a count of AI prose entries (`policy-analysis-orchestrator.service.ts:1746-1748`), not of checks. B2's denominator must be derived statically (A3) and every non-firing rule must be classified from the input data (A4), not from the engine.
2. **Twenty of the 29 rules collapse "unknown" into "not detected"; the other nine are not coverage questions at all.** `is_false`, `all_false`, `value_drift` and `date_within_days` (20 rules) return false on an absent field, indistinguishable from a pass. `missing` / `all_missing` (9 rules) fire *on* absence and answer "was it recorded", not "is it covered". A single A+B+C=N over all 29 mixes two questions.
3. **Only eight of ~40 branches have any rule.** Definitions match `lineOfBusiness` exactly (`lib/gap-detection.ts:113-115`); a `renters` policy gets none of the `home` rules. For most of the taxonomy N = 0, and C7's "publish the real count" will publish 6, 5, 4, 4, 3, 3, 3, 1.
4. **Two engines write `gap_instances`.** The orchestrator (rule-decided, with `rule_id` / `rule_inputs` / `engine_version`, delete-and-recreate) and a legacy path `detectGapsForPolicy` + `createGapInstances` (no provenance, no `hasEvaluableRule` filter, reactivate semantics) still called from `app/(protected)/protection/actions.ts:19-21` and `app/api/v1/jobs/process-policy/route.ts:83-84`. Any checklist-driven confirmation (C1) must be reconciled with both or it is overwritten.
5. **A failed re-analysis leaves the previous run's findings in place.** Gap rows are replaced only inside the success transaction (`orchestrator:3363-3369`); `failRun` (`:3378-3450`) sets the policy to `action_needed` and touches no gap row. A `GapInstance` does not record the run that produced it (no `runId` column), so "these findings predate a failed run" cannot be rendered.
6. **The protection score is gone from B2C and from outbound, and still lives in five other places.** Agent-side cards and APIs render it (`components/agent/ClientCard.tsx:76-83`, `app/api/v1/protection-score/route.ts:32-37`); a per-policy health score renders as a number on the B2C policy page (`components/wallet/policy-detail/SummaryCard.tsx:129-141`); Risk DNA renders nine per-dimension 0–100 scores coloured by threshold (`components/risk-dna/RiskDnaPanel.tsx:63-66,139-142`); the Terms of Use still describe «βαθμολογίες προστασίας» as a product output (`lib/legal/legal-content.ts:156`).
7. **Field-level provenance exists for nine envelope fields only, behind a flag whose production value cannot be read from here.** `EXTRACTION_CITATIONS` (`lib/services/ai/extraction-citations.ts:43-45`) is set in Vercel Production (encrypted). No coverage flag the rules read has a source citation. Rule findings carry `rule_inputs`; nothing carries a page.
8. **A policyholder cannot correct an extracted value that a rule reads.** The post-extraction confirm action is agent-only (`app/(protected)/wallet/actions.ts:393`), and the B2C edit form (`components/wallet/EditPolicyForm.tsx`) edits seven envelope columns, never `acordData` coverage flags. C1's "manual entry is a first-class path" is new surface for B2C, not an unburying.
9. **Prior-term premium is not stored anywhere, and the differential that would compute it has no callers.** `Policy.premiumAmount` is overwritten on each successful run (`orchestrator:3319-3322`); `renewalHistory[]` entries carry dates and identity but no premium (`policy-merge.service.ts:134-153`); `buildRenewalDifferential` (`lib/services/renewal-differential.ts:122`) is unwired. C5 needs a per-term store; prior documents survive merges, prior extractions do not.
10. **Most Track A premises are stale.** No fabricated counts or testimonials remain; the `/product` FAQ says 3; the legal pages are Greek-canonical with `/en` parity, name the controller (ΓΕΜΗ, ΑΦΜ, seat), list processors, retention periods, a cookie table and Article 9 consent; the DSR executors exist. What is wrong instead: the Terms say the free tier is «δωρεάν για ένα συμβόλαιο» (`legal-content.ts:128`, EN `:613`) against a canonical 3, and §8 still names the score.

---

# A. Denominator and outcome set

## A1. Every gap category `decideGapsForPolicy` can return, per policy type

Source of truth: `lib/gaps/authored-catalogue.ts` (`AUTHORED_GAP_DEFINITIONS`, 29 entries, all `isActive: true`, all `scope` default `document`). Runtime reads the database copy (`db.gapDefinition.findMany({ lineOfBusiness, isActive: true })`, `lib/gap-detection.ts:113-115`); `npm run verify:gap-catalogue` holds the two equal (CLAUDE.md; last verified equal on both databases 2026-08-23, fingerprint `2df9d0fd4b581caa`).

| Branch | Slug (`authored-catalogue.ts` line) | Operator | Field(s) read |
|---|---|---|---|
| motor (6) | `green_card_expiring` (119) | `date_within_days` 30 | `vehicle.greenCardExpiryDate` |
| | `insured_value_above_declared` (179) | `value_drift` above 20% | `vehicle.insuredValue` vs `vehicle.estimatedMarketValue` |
| | `no_own_damage_cover` (225) | `is_false` | `vehicle.ownVehicleDamage` |
| | `no_glass_breakage_cover` (240) | `is_false` | `vehicle.glassBreakage` |
| | `no_roadside_assistance` (255) | `is_false` | `vehicle.hasRoadsideAssistance` |
| | `missing_accident_declaration_phone` (273) | `missing` | `vehicle.accidentDeclarationPhone` |
| motorbike (4) | `moto_no_own_damage_cover` (576) | `is_false` | `vehicle.ownVehicleDamage` |
| | `moto_no_roadside_assistance` (591) | `is_false` | `vehicle.hasRoadsideAssistance` |
| | `moto_missing_accident_declaration_phone` (606) | `missing` | `vehicle.accidentDeclarationPhone` |
| | `moto_green_card_expiring` (621) | `date_within_days` 30 | `vehicle.greenCardExpiryDate` |
| home (5) | `missing_enfia_components` (44) | `all_false` | `property.fireCoverageIncluded`, `earthquakeCoverageIncluded`, `floodCoverageIncluded` |
| | `insured_value_below_rebuild_cost` (201) | `value_drift` below 20% | `property.insuredValue` vs `property.estimatedRebuildCost` |
| | `no_earthquake_cover` (294) | `is_false` | `property.earthquakeCoverageIncluded` |
| | `no_flood_cover` (309) | `is_false` | `property.floodCoverageIncluded` |
| | `no_fire_cover` (324) | `is_false` | `property.fireCoverageIncluded` |
| health (4) | `missing_coordination_centre` (74) | `missing` | `health.coordinationCentre.phone` |
| | `no_direct_billing` (341) | `is_false` | `health.directBillingAvailable` |
| | `no_annual_checkup` (356) | `is_false` | `health.annualCheckupIncluded` |
| | `missing_hospital_class` (373) | `missing` | `health.hospitalClass` |
| group_health (3) | `group_missing_coordination_centre` (518) | `missing` | `health.coordinationCentre.phone` |
| | `group_missing_hospital_class` (533) | `missing` | `health.hospitalClass` |
| | `group_no_direct_billing` (548) | `is_false` | `health.directBillingAvailable` |
| pet (3) | `missing_leishmaniasis` (98) | `is_false` | `pet.leishmaniaCovered` |
| | `no_direct_vet_payment` (390) | `is_false` | `pet.directVetPayment` |
| | `missing_microchip_number` (407) | `missing` | `pet.microchipNumber` |
| life (1) | `no_beneficiaries_recorded` (428) | `all_missing` | `beneficiaries`, `lifeAndInvestment.beneficiaries` |
| travel (3) | `no_repatriation_cover` (461) | `is_false` | `travel.repatriationCovered` |
| | `no_trip_cancellation_cover` (476) | `is_false` | `travel.cancellationCovered` |
| | `missing_emergency_assistance_phone` (494) | `missing` | `travel.emergencyAssistancePhone` |

Operator census: `is_false` 15 · `missing` 8 · `value_drift` 2 · `date_within_days` 2 · `all_false` 1 · `all_missing` 1. The evaluator also implements `missing_coverage`, `low_limit`, `insurer_match`, `duration_short`, `payment_frequency_check`, `equals`, `not_equals`, `falsy`, `is_true`, `less_than` and `always` (`lib/gap-detection.ts:236-325, 348-442`); no authored rule uses them.

**Branches with zero rules.** `lib/insurance/taxonomy.ts:56-309` defines roughly 40 branch ids (`renters`, `truck`, `roadside`, `income_protection`, `disability`, `personal_accident`, `pension`, `cyber`, `liability`, `legal_expenses`, `boat*`, `fine_art`, `gadget`, `bicycle`, and the `business*` family). None has a definition. Because the lookup is an exact match on `lineOfBusiness`, a child branch does not inherit its parent's rules (the catalogue comment at `authored-catalogue.ts:505-512` records this as deliberate).

**Other producers of findings, for completeness.**
- The profile / portfolio engine (`lib/services/gap-engine/index.ts:469-542`, `profile-gap-rules.ts`, `portfolio-rules.ts`) detects household-level gaps but writes `RecommendationInstance` rows (`gapInstanceId: null`, `index.ts:520`), never `GapInstance`.
- The legacy engine (`detectGapsForPolicy` / `detectGapsForUser` / `createGapInstances`, `lib/gap-detection.ts:20-47, 194-213, 451-502`) still writes `GapInstance` rows from `app/(protected)/protection/actions.ts:19-21` (user-triggered «refresh») and `app/api/v1/jobs/process-policy/route.ts:83-84`. It evaluates the same definitions against the *stored* `acordData`, skips `hasEvaluableRule`, writes no `ruleId` / `ruleInputs` / `engineVersion`, and re-activates dismissed rows rather than replacing the set. The two writers can disagree on the same table.

## A2. Checks attempted versus checks reported

**The engine reports only detected gaps. It never reports checked-and-passed, and it never reports could-not-check.** `decideGapsForPolicy` (`lib/gap-detection.ts:122-134`) `continue`s past a rule that lacks an evaluable shape and past a rule that evaluates false; both leave no trace. The returned array is the whole output.

Checks attempted per branch (all active definitions for that exact branch): motor 6 · home 5 · health 4 · motorbike 4 · pet 3 · travel 3 · group_health 3 · life 1 · every other branch 0.

Two numbers in the pipeline look like a pass count and are not:
- `overallSuccessPct` on `PolicyAnalysisRun` (schema `prisma/schema.prisma:1281`) is the mean of per-step `successPct` (`orchestrator:1979-1981`). The gap step's `successPct` is `min(gapResults.length, gapDefinitions.length) / gapDefinitions.length` (`:1746-1748`) — the share of definitions for which the *model returned prose*, logged as `checksPassed`. It says nothing about rule outcomes.
- `resultJson.checklistScores` (`:2012`) are model-authored pillar scores (`lib/services/ai/ai-service.interface.ts:233`). They are stored and translated (`lib/services/translation/greek-to-bilingual.ts:86-224`) and rendered nowhere in `app/` or `components/`.

## A3. Is the attempted-check set statically derivable?

**Yes, from the repository, with two run-time dependencies that do not change the set but change what it can evaluate.**

- Static: `AUTHORED_GAP_DEFINITIONS` filtered by `lineOfBusiness` and `isActive` is the set; `verify:gap-catalogue` fails on database drift. The field paths each rule reads are literal in `detectionLogic` (`field`, `fields`, `referenceField`), so the checklist row set for a branch is derivable at build time without touching the engine.
- Run-time dependency 1 — the branch itself. `metadata.lineOfBusiness` is normalised and evidence-gated during the run (`orchestrator:3208-3211`), and the row is written with that value (`:3305`). The attempted set is the set for the *final* branch, which can differ from the declared one.
- Run-time dependency 2 — evaluability. Whether a rule can produce anything depends on which fields the extractor wrote: `acordData` null → every `acord_field_check` false (`lib/gap-detection.ts:298-300`); absent boolean → `is_false` false (`:367-368`); missing operand → `value_drift` false (`:409-413`); missing or unparseable date → `date_within_days` false (`:306-309`). The set of attempted checks is fixed per branch; the set of *decidable* checks varies per run.

## A4. Outcome classification per category

Classification of what each operator can actually distinguish, read from `evaluateAcordFieldCheck` (`lib/gap-detection.ts:348-442`) and `evaluateSingleRule` (`:236-325`):

| Operator (rules) | Input state | Engine result | Honest class | Collapses? |
|---|---|---|---|---|
| `is_false` (15) | explicit `true` | no gap | `covered` | — |
| | explicit `false` | gap | `not_covered` | — |
| | absent / null / non-boolean | no gap | `indeterminate` | **yes → reads as covered** |
| `all_false` (1, ENFIA) | any of three explicitly `false` | gap | `not_covered` | — |
| | all three `true` | no gap | `covered` | — |
| | none `false`, at least one absent | no gap | `indeterminate` | **yes** |
| `value_drift` (2) | both numbers present, within threshold | no gap | `covered` (adequate) | — |
| | both present, beyond threshold in direction | gap | `not_covered` (drift) | — |
| | either absent or non-positive | no gap | `indeterminate` | **yes** |
| `date_within_days` (2) | date present, 0–30 days | gap | `not_covered` (expiring) | — |
| | date present, >30 days or past | no gap | `covered` (not expiring) — note a past date also reads as a pass | partial |
| | date absent or unparseable | no gap | `indeterminate` | **yes** |
| `missing` (8) / `all_missing` (1) | value present | no gap | `recorded` | — |
| | value absent / empty array | gap | `not_recorded` | no indeterminate arm exists: the document's silence and the extractor's silence are the same event by design (`:376-391`) |
| any rule | `acordData` absent | no gap | `indeterminate` | **yes** (`:298-300`) |

Consequences for B2:
- 20 rules (`is_false`, `all_false`, `value_drift`, `date_within_days`) currently collapse `indeterminate` into "not detected". The composition must classify them from the input fields, not from the engine's output.
- 9 rules (`missing`, `all_missing`) have a two-valued outcome set {recorded, not_recorded} and are worded "not recorded" by rule (CLAUDE.md, catalogue comments at `:167-176, 267-272`). Counting them as `not_covered` would re-introduce the "not covered" claim the wording rule forbids. They need their own line or exclusion from A/B/C.
- The wording constraint is already enforced for the nine: `tests/unit/gap-rule-catalogue-trace.test.ts` and the catalogue's own comments; nothing enforces it at a composition layer because none exists.

## A5. What happens when a run fails partway

Run states: `queued | running | completed | completed_with_warnings | failed | blocked` (`prisma/schema.prisma:11-18`); step states `pending | running | completed | failed | retrying | skipped` (`:20-27`); steps are `document → extraction → clarity → coverage_mapping → gap_detection → savings → checklist → persistence_and_finalize` (`orchestrator:1400-1934`, `STEP_ORDER:85`).

- **Hard failure** (`failRun`, `orchestrator:3378-3450`): run → `failed` or `blocked` with `failureCode`, `failureMessage`, `remediationSummary`; policy → `status: action_needed` and an `acordData.analysis.pipeline` stamp (`:3433-3450`). **No gap row is written or removed.** `lastAnalyzedAt` is set only on success (`:3326`). Extraction failure fails the whole run (`:509`).
- **Degraded** (`completed_with_warnings`): a non-critical step (clarity, coverage mapping, gap prose, savings, checklist, translation) may be marked degraded and replaced by a fallback — the gap step's fallback is `gapResults: []` (`createFallbackGapAnalysis`, `:340-353`). The rules still run in persistence (`decideGapsForPolicy`, `:3155`), so rule findings survive a degraded prose step; missing sections are listed in `resultJson.remediation.missingArtifacts` (`:1985-2025`).
- **Success**: inside one transaction the policy row is updated and `gapInstance.deleteMany` + `createMany` replace the set (`:3363-3369`).

**Is a partial result distinguishable from a clean zero?**
- At the *run* level, yes: `resolveCoverageAbsence` (`lib/wallet/policy-detail.ts:266-273`) maps the latest run status to `never | failed | blocked | degraded | empty`, the policy page's `AnalysisCard` lists missing sections (`app/(protected)/wallet/[id]/AnalysisCard.tsx:234-240`), and guards `tests/unit/analysis-absence-states.test.ts`, `analysis-degraded-state.test.ts` pin the copy.
- At the *findings* level, no. A `GapInstance` has no `runId` (schema `:549-587`), so after a failed re-run the wallet shows the previous success's rows under a policy whose status is `action_needed`. The branded report route takes "latest completed run" prose and "current open gap rows" (`app/api/v1/agent/policies/[id]/branded-report/route.ts:78-85, 117-120`) — two different moments in one document.
- The legacy path (A1) never deletes rows, so a rule that stops firing under the orchestrator can be re-activated by `/protection` refresh from the stored `acordData`.

---

# B. Score and severity render sites

## B6. Every render site of the score and its derivatives

**What the transformation run removed, cited not re-measured.** H-001 was answered "C" on 2026-08-23 (`docs/transformation/HALTS.md:10-136`): the portfolio protection score was removed from B2C in-product surfaces and from all outbound. D-014 lists the seven outbound sites (`DECISIONS.md:445-471`); `evidence/outbound/METRICS.md` measures score renders in outbound at **0** for the never-analysed portfolio; `PROGRESS.md` row 6.1 records "9 sites, done". The guard `tests/unit/score-containment.test.ts` enumerates `components/`, `app/` and `lib/` from disk (excluding any path containing `/admin/` or `/agent/`), matches JSX and template-literal interpolation of `overallScore|healthScore|protectionScore|previousScore|currentScore`, and holds an **empty** sanctioned set. H-005 (the coverage-completeness index) was answered "should not exist" on 2026-08-25 and deleted (`HALTS.md:324`).

**Sample of five, verified at HEAD:**

| # | Site | Verdict |
|---|---|---|
| 1 | `lib/email/templates/weekly-digest.ts` | Score removed (`:61` comment). Still renders «Το προφίλ κινδύνου σας είναι {completeness}% ολοκληρωμένο» (`:178-179`) — a bare percentage in outbound, of profile completeness, not protection. |
| 2 | `lib/email/templates/engagement-drip.ts:87-89`, `churn-prevention.ts:85-86` | Removed; comments only. |
| 3 | `app/(protected)/dashboard/PolicyholderHome.tsx:159-190, 411` | Reads the cached score and `RiskProfileVersion.overallScore`; the value is not interpolated (comment `:409-411`); facts replaced it (`:373-385`). |
| 4 | `components/agent/ClientCard.tsx:76-83` | **Renders** `{client.protectionScore}/100` — agent-side, outside the guard's jurisdiction. |
| 5 | `app/api/v1/protection-score/route.ts:32-37` | **Returns** `score`, `tier`, `categoryScores`, `gapCount` as JSON to any authenticated policyholder client. The guard matches renders in TSX/TS, not JSON fields. |

**Full inventory of surviving score and derivative sites:**

*Agent-side (B2B) renders*
- `components/agent/ClientCard.tsx:76-83` protection score `/100`; `:23, 50-52` relationship "health score" as a coloured dot with the number in `aria-label` / `title`.
- `components/agent/ProtectionScoreTrendCard.tsx:16, 93` trend chart of `overallScore` per customer.
- `components/agent/tabs/ClientOverviewTab.tsx:47` relationship health score; `:149` `conversionScore%`; `:182` `crossSell.coverageScore%`.
- `app/(protected)/dashboard/agent/page.tsx:387-406` batch `protectionScore` read; `:107, 370` `medicScore`.
- `app/api/v1/customers/protection-scores/route.ts` batch JSON.
- Producers: `lib/agent/health-score.ts`, `lib/services/gap-engine/protection-score.ts`, `score-trend.ts`, `opportunity-scoring.ts`, `cross-sell.service.ts`.

*B2C in-product renders that are not the portfolio score*
- Per-policy health score: `lib/wallet/policy-detail.ts:357-400` (100 − 15 × gaps − 10 × critical clauses − 4 × warning clauses + 5 if verified; `available: false` when no completed run) rendered as a number in `components/wallet/policy-detail/SummaryCard.tsx:129-141` with `ScoreMethodology`; consumed via `components/wallet/PolicyDetailsClientView.tsx:346, 906-924`.
- Risk DNA: nine per-dimension 0–100 scores, `components/risk-dna/RiskDnaPanel.tsx:63-66` (bar colour by 80/50 thresholds), `:139-142` (`data-fact="riskDimension.score"` renders the number); computed in `lib/services/risk-dna/compute.ts:115-147`; also mounted from `components/protection/ProtectionRiskLens.tsx`, `app/(protected)/protection/page.tsx`, `PolicyholderHome.tsx`.
- Stored but unrendered: `ProtectionScore` model (`schema:1772`), `RiskProfileVersion.overallScore`, `RiskReview.scoreAtOpen / scoreAtClose` (`schema:2442+`), `resultJson.checklistScores`.

*APIs*
- `app/api/v1/protection-score/route.ts:32-37, 50` (B2C); `app/api/v1/customers/protection-scores` (B2B); `app/api/v1/risk-profile/route.ts:84` and `app/api/v1/questionnaires/[id]/route.ts:156` refresh it.

*Outbound*
- Email: no protection score (METRICS.md). `weekly-digest.ts:178-179` profile-completeness percentage.
- Push: `lib/push/*` — none.
- Notifications: `protection_score_changed` deleted (`lib/notifications/risk-events.ts:17`, `registry.ts:596`, `decision-engine.ts:313` comment); event type `protection_score.changed` still declared in `lib/events/catalog.ts:269`.

*B2B report*
- `lib/services/reports/savings-report.ts` renders no score. It renders `totalSavings` € and per-opportunity `estimatedAnnualSavingsEur` (`:125-127, 244-259`) — model-estimated money figures with a caveat (`:250`).

*Marketing*
- `components/landing/real-screens/RealScreens.tsx:534-539` mounts a mock `ClientCard` with `healthScore: relationshipHealth` (dot + `aria-label` number) and `protectionScore: null`. `tests/unit/marketing-mock-honesty.test.ts` bans 0–100 scores in mocks.

*Legal*
- `lib/legal/legal-content.ts:156` (EL Terms §8) and its EN counterpart list «οι βαθμολογίες προστασίας» among AI outputs. `HALTS.md:255` already noted "three files still describe it to the public".

## B7. Every render site where severity influences ordering, colour, chip text or emphasis

Severity values come from `GapDefinition.severity` (a proposal; `severityValidatedAt` null on every row, `schema:506-548`); `SEVERITY_UNDERWRITER_VALIDATED = false` (`lib/gaps/severity-display.ts:44`); `describeSeverity()` returns label key, tone and rank (`:61-97`); `tests/unit/gap-severity-display-single-source.test.ts` forbids a second map.

*Ordering*
- `components/coverage/CoverageInsightsClient.tsx:230-232` sort by `gapSeverityRank`; `:160` `hasSevereGap`; `:248` microcopy «immediate review» when critical.
- `lib/wallet/gap-report.ts:93-110` `selectFreePreviewGapIds` — the free-tier paywall reveals the most severe first.
- `lib/services/gap-engine/profile-gap-rules.ts:402-421` dedupe by severity; `recommendation-generator.ts:399` winner by severity.
- `lib/services/customer.service.ts:450` opportunity priority 1/2 by severity; `lib/services/gap-engine/opportunity-scoring.ts:34, 104` `SEVERITY_WEIGHTS`.
- `lib/services/analysis/portfolio-gap-view.ts:174` "risk score weighted by gap severity".
- `lib/insurance/policy-conditions.ts:90, 156` sorts by a sibling enum `ConditionSeverity` (fine-print clauses).

*Colour*
- `components/gaps/severity-tone.ts:16-26` tone → dot colour, used by `components/dashboard/home/AttentionList.tsx:113, 130`, `CoverageGapsWidget.tsx:65, 90`, `CoverageInsightsClient.tsx:368`.
- `lib/email/templates/weekly-digest.ts:124-146` email dot by tone.
- `lib/services/reports/savings-report.ts:213-216, 267-268` `.badge-critical/.badge-high` red, `.badge-medium` orange, `.badge-low` green, plus `gap-card ${severity}`.
- `components/wallet/coverage-details/PolicyConditionsCard.tsx:91` `data-severe` for critical|high clauses.
- `app/(protected)/insights/InsightsClient.tsx:88-90, 523, 561` pill by tone and printed severity word (agent surface, `insights/page.tsx:11-13`).
- `lib/gap-detection.ts:507-547` `getSeverityColor` — no callers; dead.

*Chip text*
- `describeSeverity().labelKey` rendered by `CoverageInsightsClient.tsx`, `AttentionList.tsx`, `CoverageGapsWidget.tsx` (four severity-count chips, `lib/instrumentation/count-keys.ts:48 gap.severityCount`), `components/protection/area-detail-model.ts`, `lib/protection/load-attention-areas.ts`, `app/api/v1/policies/[id]/gaps/route.ts`, `savings-report.ts:33-35`.
- `components/coverage/RecommendationCards.tsx:320-333` urgency chip with a warning icon for `critical`.
- `components/protection/AreaDetail.tsx:285`.

*Emphasis and gating*
- `components/wallet/PolicyDetailsClientView.tsx:411` filters critical|high.
- `app/(protected)/dashboard/agent/page.tsx:521, 536` and `lib/services/agent-portal.service.ts:232` critical/high counts.
- `app/api/v1/jobs/process-policy/route.ts:91-110` notifies (email + push) only for critical|high.
- `lib/events/decision-engine.ts:340-360` creates an advisor task on `critical` (and `high` by setting, `lib/notifications/settings.ts:180`).
- `lib/services/gap-engine/agent-playbook.ts:265` English prose `This ${severity}-priority ${lob} gap`.

---

# C. Checklist feasibility (Track C1)

## C8. Shape of an analysis result

Two stores, both structured:

1. `PolicyAnalysisRun.resultJson` (`orchestrator:1999-2025`): `metadata` (7 envelope fields), `plainLanguageSummary`, `coverageSnapshot { covered[], notCovered[], exclusions[] }` (model strings), `savingsOpportunities`, `coverageGaps`, `checklistScores`, `priorityActions`, `gapResults` (model prose keyed by slug — explicitly not a detection list), `decidedGapSlugs` (rule output), `run`, `remediation`.
2. `Policy.acordData`, validated by `AcordDataSchema` (`lib/schemas/acord-data.ts:84-570`): a per-field record with typed sections `vehicle` (:88), `property` (:116), `health` (:149), `lifeAndInvestment` (:172), `pet` (:189), `travel` (:221), `policy` envelope (:239), `beneficiaries` (:261), `coverages[]` (:267), `exclusions` (:312), `conditions` (:329), `insuredItems`, `insuredPersons`, `namedClauses`, `territorialScope`, `termBasis`, `transit`, `marineVessel`, `finePrintClauses`, `perksAndBenefits`, `notableConditions`, and legacy `motor` / `home` / `life` aliases; plus an `extraction` block written by `enrichExtractionPayload` (`lib/services/ai/extraction-enrichment.ts`).

`GapInstance` rows additionally carry `ruleInputs` — the exact values the rule read (`lib/gap-detection.ts:144-189`).

**Can a checklist be derived without changing the engine? Yes.** Rows = the distinct field paths named by the branch's authored rules (about 30 across the catalogue) plus the nine envelope fields; value = `getNestedField(acordData, path)`; state from presence and type. The engine's own field vocabulary is the row set, and re-running `decideGapsForPolicy` over an `acordData` that a human has completed needs no engine change. The free-text `coverages[]` array is not a stable row set and should not be one.

## C9. Field-level provenance today

- **Per field, nine envelope fields only, flag-gated:** `acordData.extraction.sources[field] = { page, snippet }` for `insurerName, policyNumber, lineOfBusiness, startDate, endDate, premiumAmount, issueDate, premiumFrequency, renewalDate` (`lib/services/ai/extraction-citations.ts:17-27, 35-41`), enabled by `EXTRACTION_CITATIONS === '1'` (`:43-45`). The variable exists in Vercel Production (encrypted, set ~54 days ago per `vercel env ls production`); its value cannot be read from here. Consumed by `lib/wallet/policy-review.ts:85, 246-253, 297` and rendered with a «σελ.» label in `components/wallet/PolicyReviewScreen.tsx:342` and `PolicyDetailsClientView.tsx:1158`.
- **No coverage flag** the rules read (`vehicle.glassBreakage`, `property.earthquakeCoverageIncluded`, …) has a page, snippet or confidence.
- **Per run:** `extraction.source` (provider), `extraction.confidence.{overall, fields}`, `extraction.summaryLanguage`, `extraction.reviewState / confirmedAt / flaggedAt`; `analysis.pipeline.{runId, provider, status}` (`orchestrator:3436-3450`).
- **Per finding:** `GapInstance.ruleId / ruleInputs / engineVersion` (`schema:565-568`) — values, not locations; no `runId`.
- **Per document:** `PolicyDocument` rows survive merges (`policy-merge.service.ts:158-161`); `renewalHistory[]` entries name `sourcePolicyId` and documents (`:134-153`); `renewal-differential.ts:33-36` cites `fromDocumentId / toDocumentId` but is uncalled.

## C10. Can a user correct an extracted value today?

| Path | Who | Fields | Writes |
|---|---|---|---|
| Review screen after upload, `components/wallet/PolicyReviewScreen.tsx:32-53` → `confirmPolicyReview` (`app/(protected)/wallet/actions.ts:373-460`) | **agents only** (`:393 if (!isAgentRole(...)) return Unauthorized`; B2C skips the step, `AddPolicyClient.tsx:491`) | insurer, number, branch, issue/start/end/renewal dates, premium, frequency, sum insured | columns + `acordData.policy.*` + `extraction.reviewState = 'confirmed'`; sum insured to the branch's path (`:441-445`) |
| `/wallet/[id]/edit`, `components/wallet/EditPolicyForm.tsx:107-202` → `updatePolicy` (`actions.ts:725`) | policyholders and agents with `canWrite` | insurer, number, branch, start, end, premium, `coverageSummary` | columns only |
| `flagPolicyExtraction` (`actions.ts:502-570`) | agents only | none — marks `reviewState = 'flagged'` | `acordData.extraction` |
| Bulk upload inline completion (`components/wallet/BatchUploadModal.tsx:338`) | uploader | a missing critical envelope field, before `batch-create` | row payload |
| Agent upload confirm step (`components/agent/UploadPolicyModal.tsx` → `commitScannedPolicy`, `agent/actions.ts:1567`) | agents | envelope fields, before ingest | policy row |
| Admin extraction flags (`app/(protected)/admin/extraction-flags`) | admins | triage view | — |

**No path lets anyone correct a coverage flag or any other rule input.** The rules' inputs are model-only today, and the only confirmation state is run-level and agent-only.

---

# D. Onboarding and confidence

## D11. Upload flow, step by step

**B2C `/wallet/add`** (`components/wallet/AddPolicyClient.tsx`)
1. Form: one or more files (primary + attachments, `:155`) and a **required** branch select (`:120, 693-708`). The branch is declared before anything reads the file.
2. `POST /api/policies/extract` (`app/api/policies/extract/route.ts`): AI-consent check before the body is read (`:143`) → policy-limit check (`:155`) → form and file validation (`:160-176`) → document gate with the declared branch (`:189-227`; verdict `rejected | requires_review`) → daily limit (`:249`) → provider availability (`:269`) → upload-time extraction (`:287`) → recognition (`:310`) → branch normalisation (`:343-351`) → data-quality (`:363`) → `ingestPolicyDocument` (the one storage path, `lib/ingestion/ingest-policy-document.ts`) → response (`:385-390`).
3. Gate outcomes render inline with «change type» / «continue as» actions that resubmit the same bytes with `branchConfirmed` (`AddPolicyClient.tsx:226, 612-628`).
4. Phase `review` mounts `PolicyReviewScreen` (`:99-101`); confirmation is agent-only (C10), so a policyholder proceeds without a confirm step.
5. The deep run is queued (QStash); the orchestrator re-checks consent, quota and document presence (`orchestrator:374-388, 578-629`). The "uploading / extracting / analysing / generating" labels are elapsed-time labels, not step states (`AddPolicyClient.tsx:65-70`).

**B2C onboarding** (`app/onboarding/actions.ts:133 uploadOnboardingPolicy` → `:292 triggerOnboardingAnalysis`): free tier runs `extractBasicSummary` only (`:358`; orchestrator comment `:355-360`), the deep path otherwise; an empty extraction ends as `EXTRACTION_EMPTY` / `action_needed` with the document kept (`:381`).

**B2C bulk** (`components/wallet/BatchUploadModal.tsx`): per row `POST /api/policies/extract` with `extractOnly` (`:143-151`, branch-confirm retry `:539`) → inline completion of a missing critical field (`:338`) → `POST /api/policies/batch-create` (`:377`) → document upload to `/api/v1/policies/{id}/documents` (`:238`).

**B2B** (`components/agent/UploadPolicyModal.tsx`, views `upload → parsing → resolve → confirm → duplicate → success`, `:60`; two or three steps, `:458`)
1. Upload → `scanPolicyForResolution` (`app/(protected)/agent/actions.ts:1495`): agent-role check, `parsePolicyPdfWithGemini` including the document gate, customer candidates by ΑΦΜ / email / name / phone (`:1516-1521`).
2. Resolve: attach to a candidate or create a new customer.
3. Confirm: agent reviews and edits envelope fields, attests the customer's AI-processing consent (`:132`), resolves duplicates and a branch-confirm hold → `commitScannedPolicy` (`:1567`; Zod on both halves, customer cap, `branchConfirmed`) → `ingestPolicyDocument` with `declaredBranch` (`:1136-1143` in `addPolicyForCustomer`) → analysis outcome `queued | blocked_quota | blocked_consent | none` (`:105`).
Also `addCustomerManually` (`:892`) with an optional policy, and CSV bulk import.

B2B therefore extracts first and confirms after; B2C declares first. Both pass the gate's branch-consistency check (`lib/ingestion/document-gate.ts:185-215`).

## D12. Extraction confidence

- **Available:** per run `overallConfidence`, per field for the nine envelope fields (`CRITICAL_FIELDS` six + `EXTENDED_FIELDS` three), `requiresReview`, `missingCriticalFields` (`lib/services/ai/extraction-enrichment.ts:51-70, 116-128`); persisted as `acordData.extraction.confidence.{overall, fields}` (`orchestrator:3062-3068`).
- **Branches on it:** wallet list `requiresReview` when overall < 80 or a critical field is missing (`app/(protected)/wallet/page.tsx:153-159`) and the policy page (`wallet/[id]/page.tsx:340`); review-screen chips via `confidenceLevel` high/medium/low/unknown (`lib/wallet/policy-review.ts:212-215`); bulk-upload badge (`BatchUploadModal.tsx:791`); admin extraction-flags shows the percentage (`admin/extraction-flags/ExtractionFlagsClient.tsx:148`).
- **Not available:** any confidence on a coverage flag. A low-confidence `false` fires `is_false` exactly like a confident one; the rules never read confidence.
- The document gate's `insuranceConfidence` / `branchConfidence` (`lib/ingestion/document-gate.ts`) are an admissibility classifier, separate from extraction confidence.

## D13. Every path by which a placeholder can reach a render

**Mint sites (the writers):**
1. `mintPlaceholderIdentity` (`lib/wallet/policy-identity.ts:53-58`) used by every ingest without a typed identity (`lib/ingestion/ingest-policy-document.ts:296, 308-309`).
2. The providers, on a **successful** empty extraction: `lib/services/ai/gemini-ai.service.ts:289-290`, `anthropic-ai.service.ts:249-250`, `openai-ai.service.ts:230-231` (`'Unknown Insurer'`, `` `PENDING-${Date.now()}` ``).
3. Legacy writers allowed by the guard: `lib/services/policy.service.ts`, `components/wallet/AddPolicyClient.tsx` (`tests/unit/policy-sentinels-unrenderable.test.tsx:271-284`).

**Where the literal is then copied:** `Policy.insurerName / policyNumber` (NOT NULL); `resultJson.metadata` (`orchestrator:2000-2002`); `renewalHistory[]` (`policy-merge.service.ts:139-142`); `UserTask.title` (`lib/services/renewal.service.ts:631`, raw, English); `ActivityLog.description` (`agent/actions.ts:1237`, `api/v1/policies/route.ts:270`).

**Render guards:** `displayInsurerName / displayPolicyNumber / scrubPolicyIdentity / redactPolicyPlaceholders` (`policy-identity.ts:120-136, 195, 355`); the guard test's literal scan and identity-render scan over `app/ components/ lib/ hooks/ contexts/` with named exemptions (`:806-836`: notification boundary files, two agent surfaces, the prompt file, one internal key file); `lib/notifications/dispatch.ts:246-247, 312-319` redacts; `lib/mail-templates.ts:117-121` throws in dev/test and scrubs in production; the report uses `displayInsurerName` / `displayPolicyNumber` (`savings-report.ts:189, 232`).

**Paths still open:**
- JSON APIs return the raw columns: `app/api/v1/policies/route.ts:161-162`; `app/api/v1/policies/[id]/route.ts:75-76`, and `:65-66` composes `Policy Number: …` / `Insurer: …` text. Any API consumer renders them.
- Agent surfaces exempted from the render scan: `app/(protected)/renewals/RenewalsClient.tsx`, `app/(protected)/customers/[id]/policy/[policyId]/page.tsx`.
- `UserTask.title` written raw by the renewal cron and rendered on the agent task list.
- `process-policy` notification interpolates `policy.insurerName` into the message (`app/api/v1/jobs/process-policy/route.ts:105-106`); it passes through `sendNotification` → dispatch redaction, so it is covered only as long as that boundary holds.
- The i18n key `unknownInsurer` (`lib/i18n/translations/el.ts:959`, `en.ts:956`) holds a placeholder literal and has no callers — dead, but a literal in the bundle.
- The provider substitution on a successful run (mint site 2) means a healthy `active` policy can carry a placeholder as its permanent identity; every render depends on the display primitive, not on the data being clean.

---

# E. Renewal, tasks and the B2B model

## E14. Prior-term premium

**Not stored.** `Policy.premiumAmount` is one column (`schema:402`) overwritten by each successful run (`orchestrator:3319-3322`), by review confirm and by the edit form. `PolicyRenewal` (`schema:1553-1590`) has no premium field. `renewalHistory[]` entries carry `uploadedAt, sourcePolicyId, policyNumber, startDate, endDate, insurerName, documents` — no premium (`policy-merge.service.ts:134-153`; `policy.service.ts:671-698`). `AcordData.policy.premium.amount` (`acord-data.ts:249`) exists per extraction, but a merge promotes one envelope and discards the other (`:150-153`). `lifeAndInvestment.lastPremiumAmount` (`:184-185`) is life-specific.

`buildRenewalDifferential` (`lib/services/renewal-differential.ts:122-160`) computes `premiumBefore / premiumAfter / premiumDelta` from two extractions and cites both document ids — and has **no callers**.

**Data needed:** a per-term record — `policyId, termStart, termEnd, premiumAmount, currency, sourceDocumentId, source (extraction | manual)`. **Does it exist in ingested documents?** Partly. For policies that went through a merge, the prior term's PDF survives as a `PolicyDocument` re-parented to the survivor (`policy-merge.service.ts:158-161`) but its extraction does not; the premium could be recovered by re-extracting that document. For single-upload policies the prior term was never ingested.

## E15. Renewal-date provenance and reliability

- `Policy.endDate` is NOT NULL (`schema:395`) and at ingest defaults to **upload date + 365 days** when unknown (`lib/ingestion/ingest-policy-document.ts:298-299`; `lib/constants/time.ts:55`). Nothing records that the value is a default. A policy whose deep run never completes keeps that synthetic date.
- `coverageEndDate` (`schema:400`) is the resolved real end: `renewalHistory` → `acordData.policy.expirationDate` → `endDate` column (`lib/policy-status.ts:162-194, 233-239`); NULL means "unknown duration" and counts as cover.
- Writers of `endDate`: extraction when the renewal matches the policy (`orchestrator:3314-3318`), review confirm (`wallet/actions.ts:404-405, 419`), the edit form, the agent commit, a merge promotion.
- `acordData.policy.renewalDate` is extracted separately (`extraction-enrichment.ts:20`, an `EXTENDED_FIELD`).
- **Provenance is not tagged.** No `endDateSource` exists; the only per-field provenance is the flag-gated citation for `endDate` / `renewalDate` (C9). Reliability: `parseDocumentDate` handles Greek formats and an unparseable date resolves to `unknown_duration` rather than a fake (`:190`), but the ingest default above is a fake date on the column until something overwrites it.

## E16. Task or work-item entity

**Exists:** `UserTask` (`schema:1130-1156`): `userId, creatorUserId, type, title, description, status, priority, dueDate, actionUrl, actionLabel, completedAt`. No linked-record foreign key (only an `actionUrl` string), no origin or cause field.

Creators:
- Manual: `app/(protected)/tasks/taskActions.ts:44`.
- Event executor: `lib/events/executor.ts:147-160` (advisor task; `creatorUserId = evt:<eventId>` doubles as the only provenance) fed by `lib/events/decision-engine.ts:340-360` on `coverage_gap.opened` when severity is `critical` (or `high` by setting) — a task generated from an **internal system event**, which C3 prohibits; `executor.ts:290-300` scheduled follow-ups with `dueDate = occurredAt + offset`.
- Renewal cron: `lib/services/renewal.service.ts:627-640` (type `renewal`, due 7 days before expiry, English title interpolating the raw insurer name).

Related: `DocumentRequest` (`schema:1593-1615`; requester, due date, status, linked thread and relationship), `RiskReview` (`schema:2442-2496`; `trigger`, `dueAt`, `causedByEventId` — the closest existing thing to a provenance-bearing work item, B2C), `PolicyRenewal.taskId / opportunityId` (`:1571-1572`), `Opportunity`, `CollaborationAction`. The event catalogue (`lib/events/catalog.ts:121-518`) mixes real-world events (`policy.renewal_approaching`, `policy.lapsed`, `life_event.declared`, `claim.*`) with system events (`policy.analysis_completed`, `protection_score.changed`, `coverage_gap.opened`, `recommendation.generated`).

**Minimal model for C3** (if it were approved): on `UserTask` or a new `WorkItem`: `linkedType / linkedId`, `origin` ∈ {renewal_window, document_requested, checklist_unconfirmed, client_request, manual}, `causeAt`, `causeRef`; and removal of the severity-triggered creation.

## E17. Agent-owned reusable named objects

- **Yes, one:** `QuestionnaireTemplate` (`schema:747-762`; `name, lineOfBusiness, questions, isSystem, createdByUserId`), created by agents in `app/(protected)/questionnaires/actions.ts:111` under an entitlement cap (`:95-108`); owner-scoped by `createdByUserId`, not org-scoped (`:133-136`).
- Org scope exists — `Tenant` / `TenantMembership` (`schema:351-386`) — and is used only by `lib/services/team.service.ts:44-100`.
- Branding on `AgentProfile.agencyName / logoUrl / brandColor` feeds the report.
- **No** standard, checklist or threshold object. Coverage rules are repo-authored (`authored-catalogue.ts`) and admin-editable rows (`/admin/gaps`), not agent-ownable. So "all configuration is per-run" is false for questionnaires and branding and true for coverage standards.

## E18. How the branded B2B report is generated and where its copy lives

- Route: `app/api/v1/agent/policies/[id]/branded-report/route.ts` — GET; agent role and the `brandedReport` entitlement (Pro+, `:46-58`); visibility via `lib/agent-visibility` (`:69-75`); latest `completed | completed_with_warnings` run (`:78-85`); branding from `AgentProfile` (`:95-113`); open `GapInstance` rows (`:117-120`); **language = the agent's `preferredLanguage` or `"en"`** (`:125`), so a client-facing document defaults to English when the agent has no preference set.
- Generator: `lib/services/reports/savings-report.ts:100-305` → **HTML** with a print button (`:227`), not PDF. The same generator serves the B2C `/api/v1/policies/[id]/savings-report` (the €3 report unlock, `schema:23-24`).
- Copy: inline `L(el, en)` pairs in the generator (`:169-292`) plus i18n keys through `resolveReportKey` (`:16-20`; severity labels `:33-35`; caveat `:265`; `common.aiAdviceDisclaimer` `:292`).
- Content: envelope metadata (`:230-236`, identity scrubbed), «Ευκαιρίες Εξοικονόμησης» with model-estimated euro totals (`:125-127, 244-259`), rule-decided gaps with red/orange/green severity badges and the caveat sentence (`:213-216, 265-268`), model `coverageSnapshot` lists (`:277-287`), `plainLanguageSummary`, powered-by and disclaimer. Metadata comes from the run's `resultJson`, which may lag the current columns.

---

# F. Public surface

## F19. Where marketing statistic bands read their numbers

No CMS. Every number is in one of three TypeScript sources, and a guard against a fabricated count is therefore possible:

1. `/product` stat band — `PRODUCT_STATS` (`app/(public)/product/marketing-content.ts:39-64`): `${productCategories.length} είδη` (derived from `lib/product/catalog.ts`), «Λίγα λεπτά … τρία συμβόλαια» (static; the one speed claim, `lib/marketing/positioning.ts`), «0 προμήθειες» (static, deliberate). The count-up animation that would have shown `0 / 0 / 0` before scrolling was removed (`ProductSections.tsx:26-28`); tiles are static.
2. Homepage market numbers — `lib/marketing/market-numbers.ts:25-58`: two figures (`+6,24%`, `20%`), each with `source { name, url, dated }`, rendered by `components/landing/grafi/MarketNumbers.tsx:54-62` only alongside the source. Note `value: "+6,24%"` is not locale-formatted for `/en`.
3. Growth hooks — `lib/growth/hooks.ts:31, 52-86` `sourceIds` → `docs/growth/SOURCES.md` (primary-source register, 2026-08-26).

`lib/landing/content.ts:16-20` records the deletion of "10k+ users", "50k+ policies", two testimonials and an unsourced "7 out of 10". A repository grep for `500+`, `10.000+`, `10,000+`, `98%`, «Μαρία Π.», «Γιώργος Παπαδόπουλος», «εμπιστεύονται», "policyholders trust" and "testimonial" across `app/ components/ lib/ content/` returns **no marketing hit**. Existing guards: `tests/unit/marketing-mock-honesty.test.ts` (bans 0–100 scores, percentage grades, portfolio counts and invented people in mocks), `marketing-content-contracts.test.ts`, `legal-pricing-claims.test.ts`, `landing-how-it-works.test.ts`.

## F20. State of `/terms` and `/privacy`

- **Language:** Greek by default on `/terms` and `/privacy` (`resolveLegalLanguage`, `lib/legal/legal-content.ts:1080-1083`, `?lang=` is the only override); English on `/en/terms` and `/en/privacy` (`app/(public)/en/terms/page.tsx`) with a counterpart link. Content: EL terms `:83-210`, EL privacy `:212-383`, cookies and subprocessors `:385-530`, EN from `:579`. Version `GR-GA-2026.03`, last updated "March 2, 2026" (`:47-48`); cookies and subprocessors 2026-07-19 (`:63-64`).
- **Controlling entity:** named. `lib/legal/entity-placeholders.ts:51-72` holds the real registry values («Insurance Martech Ι.Κ.Ε.», ΓΕΜΗ 188863359000, ΑΦΜ 302659440 ΔΟΥ Χίου, Εντός Οικισμού Καλαμωτής 82102 Χίος, `dpo@policywallet.gr`) — the file name says "placeholders", the header (`:5-9`) says they are real. Rendered in Terms §1 (`:91`), Privacy §1 (`:220-223`), the public footer, and `/trust` (`app/(public)/trust/TrustSections.tsx:236-247`). Court venue deliberately generic (`entity-placeholders.ts:40-45`).
- **DPO:** a mailbox, no named person.
- **Processor list:** `/subprocessors` (`legal-content.ts:474-530`: Supabase, Vercel, Stripe, Upstash, Sentry, Google Gemini, Google Analytics, Anthropic, OpenAI).
- **Retention periods:** Privacy §8 table, eight rows (`:313-350`).
- **Cookie table:** `/cookies` (`:385-445`).
- **AI-processing and Article 9 language:** present — Privacy §3 lawful-basis table row «Ανάλυση ασφαλιστηρίων με τεχνητή νοημοσύνη — άρθρο 6(1)(α)· δεδομένα υγείας ρητή συγκατάθεση 9(2)(α)» (`:251-252`) and §5 «Ανάλυση με τεχνητή νοημοσύνη» (`:286-290`).
- **Rights the text publishes vs executors:** Privacy §9 (`:352-356`) claims in-app export and deletion. Executors exist: `app/api/v1/me/data-export/route.ts` (requested → processing → completed with a download TTL, `:24-60`), `app/api/v1/me/data-export/[id]/route.ts`, `app/api/v1/me/deletion-request/route.ts`, admin `executeDataExportRequestAsAdmin` (`app/(protected)/admin/actions.ts:1024`), `approveDeletionRequest` (`:1187`), `executeDeletionRequest` (`:1295`) → `eraseUserData` (`lib/services/gdpr-erasure.service.ts:508`), the retention job `app/api/v1/jobs/privacy-retention/route.ts`; audit `docs/audits/gdpr-deletion-erasure-2026-07.md`. Known caveat from project memory: the userId-keyed export misses join-table-linked models. The right is executable; export completeness is the open item.
- **Contradictions inside the legal text:** Terms §5 «Η βασική χρήση είναι δωρεάν για ένα συμβόλαιο» / "Basic use is free for one policy" (`:128`, `:613`) against a canonical 3; Terms §8 lists «οι βαθμολογίες προστασίας» as an AI output (`:156`) after the score's removal. `legal-pricing-claims.test.ts` guards prices, not the policy count.

## F21. Free-tier policy limit on each surface

Canonical: `FREE_POLICY_LIMIT = 3` (`lib/monetization/feature-gates.ts:169`); `lib/pricing/plan-defaults.ts:94` free 3, `:111` Plus 10, `:129` Family 25. The live pricing page renders from the `plans` rows in the database (CLAUDE.md catalogue coupling); the production rows were not queried in this pass.

| Surface | File | Value |
|---|---|---|
| Sign-up | `app/auth/signup/SignupForm.tsx:117-118` | 3 |
| `/product` FAQ | `app/(public)/product/marketing-content.ts:88-89` | **3** (EL and EN) — the spec's "says 2" no longer holds |
| `/product` body and CTA | `ProductSections.tsx:101-102, 409`; `PRODUCT_STATS:55-56` | 3 / «τρία» |
| Guides | `app/(public)/guides/[slug]/GuideArticleClient.tsx:264-265`; `lib/guides/content.ts:2016-2017` | three |
| Homepage FAQ | `lib/landing/content.ts:157-158` | 3 |
| LOB FAQs | `lib/product/lob-faqs.ts:41-42` | 3 |
| Help centre | `lib/help-content.ts:99, 291` | 3 / 10 / 25 |
| Dashboard meter | `app/(protected)/dashboard/PolicyholderHome.tsx:944` | `FREE_POLICY_LIMIT` (comment `:949` records a fixed «2 ασφαλιστήρια» contradiction) |
| Account / upgrade | `app/(protected)/account/data.ts:141` | entitlements (DB) |
| **Terms §5** | `lib/legal/legal-content.ts:128, 613` | **1 — contradicts** |
| Liability demo screen | `app/(public)/product/liability/PageClient.tsx:113` | «Ελέγχθηκαν 2 ασφαλιστήρια» — a mock caption, not a limit claim, but readable as one |

---

# G. Feasibility verdict — Track C1, the review checklist

**Feasible without touching `lib/gap-detection.ts`, and it requires schema (Track C) and three reconciliations first.**

Why feasible (A2 + C8): the engine's rule set per branch is static and its field paths are literal, so a checklist's rows can be derived at build time; the values live in a structured per-field record; re-evaluating `decideGapsForPolicy` over a human-completed `acordData` is the existing call. No provider schema changes. Rows for the nine envelope fields already have confidence and, behind a flag, citations.

What has to be true before it is honest:
1. **Two questions, two lines.** The 9 `missing` / `all_missing` rules answer "was it recorded"; the 20 others answer "is it covered". The composition (B2) and the checklist must keep them apart or the denominator lies (A4).
2. **One writer of `gap_instances`.** The legacy `detectGapsForPolicy` path (A1, A5) must be retired or routed through the orchestrator's rule-decided writer, or a human's confirmed value is re-contradicted by a refresh that never saw it. This is a call-site change in two files, not an engine change.
3. **Confirmation state is new.** Nothing per-row exists; the only state is run-level and agent-only (C10). A `PolicyChecklistRow` (or equivalent) with `policyId, key, value, source ∈ {extraction, manual}, sourceRunId / documentId / page, confidence, confirmedBy, confirmedAt` is a migration, and the manual path must write to the same `acordData` paths the rules read so B2's triple derives from checklist state (acceptance criterion 6).
4. **N = 0 branches render as "no checks authored", not as an empty checklist that reads complete** (A1). Roughly 30 of the taxonomy's branches are in this state.
5. **B2C gains a correction surface it does not have.** The confirm action is agent-only today; opening it to policyholders is a product and IDD-framing decision (the review screen's own H-006/H-007 note in `EditPolicyForm.tsx:103`), not only code.

Not blocking, worth deciding with it: `GapInstance` gains a `runId` so a finding can say which run and which confirmed values produced it (A5); the flag-gated citations extend to the coverage flags the rules read (C9), otherwise the "inspect where this came from" affordance is empty for every row that matters.

---

# H. Spec premises that the codebase contradicts

| Spec statement | What is there now |
|---|---|
| «500+ ασφαλισμένοι», «10.000+ συμβόλαια», «98% ακρίβεια», two testimonials on the site | Absent. Deleted and documented (`lib/landing/content.ts:16-20`); grep returns nothing (F19). |
| `/product` FAQ says the free tier is 2 policies | Says 3 in both languages (`marketing-content.ts:88-89`). |
| Three contact addresses across two domains | One domain. `info@`, `careers@`, `dpo@policywallet.gr` (`lib/seo/site.ts:80-81`, legal content); `support@policywallet.gr` only as a VAPID fallback (`lib/push/web-push.ts:75`); `.com` appears in two code comments only. |
| Placeholder phone `+30 XXX XXX XXXX` on `/contact` | No phone renders unless `NEXT_PUBLIC_CONTACT_PHONE` is set (`lib/seo/site.ts:82`, `ContactPageClient.tsx:406`); not set in production per `vercel env ls`. |
| `/product` stat band renders `0 / 0 / 0` | Static tiles; the third is intentionally «0 προμήθειες» (F19). |
| EN locale shows `10.000+` | No such figure survives; the one unlocalised value is `+6,24%` in `market-numbers.ts:31`. |
| `/solutions/agents` has English headings over Greek copy | Every heading is a `t(el, en)` pair (`AgentsSolutionPageClient.tsx:28, 44-46, 81-83, 159-161`). |
| Footer "FAQ shortcuts" are internal evaluation links | One public anchor, `/pricing#pricing-faq` (`PublicMegaFooter.tsx:52`). |
| `/terms` and `/privacy` render in English | Greek-canonical, `/en` parity (F20). |
| No controlling legal entity named anywhere | Named with ΓΕΜΗ, ΑΦΜ and seat on Terms, Privacy, footer and `/trust` (F20). |
| No processor list, retention periods or cookie table | All three present (F20). |
| No AI-processing or Article 9 consent language | Present in Privacy §3 and §5 (F20). |
| GDPR export and deletion may be unexecutable | Executors exist end to end; export completeness has a known caveat (F20). |
| The protection score renders as a verdict | Removed from B2C in-product and outbound in Aug 2026; survives agent-side, in two APIs, as a per-policy health number, as nine Risk DNA dimension scores, and in Terms §8 (B6). |

Defects found instead, not in the spec: Terms §5 "one policy"; Terms §8 names the score; the B2B report defaults to English; renewal task titles are unscrubbed English; a legacy gap engine writes rows without provenance; stale gap rows survive a failed re-run; `checksPassed` counts prose; JSON APIs return raw placeholder identity; `buildRenewalDifferential` is unwired; the ingest end-date default is a fabricated date; `market-numbers.ts` values are not locale-formatted.

---

# I. Cannot be determined from the codebase

- Whether `EXTRACTION_CITATIONS` is `"1"` in production. The variable exists (encrypted). Establish by reading it in the Vercel dashboard or by checking a recent production `acordData.extraction.sources` for a non-null value.
- The production `plans` rows' `limits.policies` (the pricing page's runtime source). Establish with one SELECT on production, permitted under standing authority; not needed to answer F21 and not run.
- The production `gap_definitions` active set at HEAD. Last verified equal to the catalogue on 2026-08-23; re-run `npm run verify:gap-catalogue` against production to confirm.
- Deliverability of `info@`, `careers@` and `dpo@policywallet.gr`. Not a code property.
- The contents of `BENCHMARK-TRANSPARENCY-01.md` and `policy-wallet-public-surface-audit.md`, which are not in the repository.

---

*Halting here per Goal 0. No product code, no files outside `docs/transparency/`, and `docs/STATUS.md` deliberately not updated until this report is approved in writing.*
