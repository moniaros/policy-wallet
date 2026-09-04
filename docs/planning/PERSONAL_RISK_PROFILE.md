# The Personal Risk Profile — Life → Needs → Risk → Coverage → Gap

Planning document for the B2C onboarding-to-risk-assessment architecture. Written
2026-09-04 from four code audits of `feat/onboarding-protection-profile` (which carries
the Personal Protection Profile onboarding, PR #293, and the shipped B2B/phone stack).
Every claim below has a file reference; the implementation waves at the end are the
contract for the code that follows.

## A. Current state (what exists, with evidence)

**Onboarding** (`app/onboarding/**`, `lib/onboarding/protection-profile/**`,
`components/onboarding/protection-profile/**`): ten counted single-question screens plus
three conditional ones and three tail screens (map, upload, advisor). Facts go to typed
`PolicyholderProfile` columns through a non-overwriting patch
(`lib/services/protection-profile/patch.ts`); statements go to `ProtectionProfile`
(`prisma/schema.prisma` `protection_profiles`). `deriveProtectionPriorities`
(`lib/services/protection-profile/derive-priorities.ts`) computes nine areas on read; the
map (`ProtectionMapCard`) renders them with the disclaimer «Αυτό δεν σημαίνει ότι σου λείπει
κάποια συγκεκριμένη κάλυψη…». Analytics: 20 typed journey events plus two server-side
conversion mirrors. DSR wired. No amount, no date of birth, no health column is writable by
construction.

**Risk assessment** (`app/(protected)/protection/**`, `lib/services/gap-engine/**`):
`assessRisks` (`risk-assessment.ts:361`) evaluates a 22-risk catalogue
(`risk-catalog.ts`) against a `LifeContext` built from the profile columns and
`answeredFields` (`life-context.ts:371`) plus held policies matched at branch-family
level. Each risk declares `requires` / `supports` factors from a closed vocabulary of 17
(`CONTEXT_FACTORS`, `life-context.ts:43`), an `applies` predicate, bilingual
`riskExplanation` / `whyItApplies` / `expectedImpact`, `mitigations` with kinds
(`transfer` / `retain` / …) and `eligibility`. Statuses: `needs_review` (a required
factor unknown), `not_applicable`, `already_covered`, `protection_gap`, `opportunity`.
`factorsToResolve` (`risk-assessment.ts:426`) lists the unknown factors that block a
verdict — computed on every run and rendered nowhere. No numeric score reaches the user
(`score-containment`, `protection-score-honesty`, owner decision). The 35-field
`RiskProfileWizard` re-asks every fact onboarding wrote and saves through
`app/api/v1/risk-profile/route.ts:56`, which writes `{...cleanData}` unconditionally and,
because the wizard always sends the health arrays and `isBuildingManager`, **erases stored
Art. 9 data on every save** and records the erasure as answered.

**Evidence chain** (`lib/services/analysis/policy-analysis-orchestrator.service.ts`,
`lib/gap-detection.ts`, `lib/gaps/authored-catalogue.ts`, `recommendation-generator.ts`):
the deep pipeline runs for `pro` only (`createRun` L506); free and plus get
`extractBasicSummary`. Rules decide gaps (29 active, all within-document presence or
same-document value checks); `acordData.coverages[]` — limits, deductibles, optional
covers — is read by no rule. Recommendations order by severity → LOB weight → stated
priority (tie-break only) → rule id. There is no line-of-business ↔ life-domain table;
the only bridge is the nine-row `PRIORITY_LOBS` tie-break. Life events (19 registry
entries over 8 `EVENT_DOMAINS`) write context deltas and open `RiskReview`s that only a
button press or expiry closes; an upload never resolves one. Prevention exists as data
(`preventionActions` from `acordData.conditions`, mitigation kinds) with no consumer.

**Data and analytics**: 45 `PolicyholderProfile` columns with four writers that merge
`answeredFields` differently; twelve duplicate or parallel stores (e.g.
`preferences.onboardingCompleted` vs `ProtectionProfile.completedAt`,
`PolicyholderProfile.lifeEvents` JSON vs `LifeEventInstance`). Knownness is a binary set
with no source, precision or time. Analytics can answer intent, stated concerns with
rank, confidence, don't-know rate, per-step drop-off and upload-from-onboarding; it
cannot answer priority → action, recommendation view → action, or anything joined to a
profile row. Vercel `track()` is not consent-gated (GA is).

## B. Diagnosis

- **A. What onboarding achieves**: a first picture (breadth) and a value exchange (the
  map), with the upload as the next step. Shallow on purpose: no magnitudes, household as
  arithmetic, health unaskable, and three answers (`uncertainty_reason`, `guidance`,
  «Έρχεται κάτι σύντομα») that feed nothing.
- **B. What Risk Assessment achieves**: a real per-risk model with explanations and
  mitigations — rendered as a lens that never says what it still needs, fed by a flat
  form that repeats onboarding and destroys data.
- **C. Connected?** Only through the shared columns. The assessment ignores every
  statement (concerns, confidence, uncertainty reasons, plans) except as a
  recommendation tie-break. Five vocabularies describe the same person: nine onboarding
  areas, 22 risk ids, eight event domains, six score categories, ~20 lines of business.
- **D. Collected twice**: nine facts (wizard), three a third time (quick start), life
  changes (onboarding chips vs wizard chips vs `LifeEventInstance`).
- **E. Missing**: income dependency share, a partner as a fact (`maritalStatus` is never
  written by onboarding), dependants' ages, mortgage balance, second properties, business
  size, assets, pets, travel, activities — most exist as wizard columns but are
  unreachable from the flow that decides relevance.
- **F. Too early**: the wizard asks Art. 9 health facts of everyone; onboarding is clean.
- **G. Too late / never**: «what we don't know yet» is never told; the one question that
  decides most household exposure (how much the household depends on this income) is
  never asked; the assessment's own factor list is the right depth and is never asked.
- **H. Life context understood?** Yes for facts; no for perceived priorities.
- **I. Says / knows / owns / verified?** Not as a model. Life events carry `source` and
  `confidence`; document gaps carry `ruleInputs` / `engineVersion`; the risk graph has a
  `declared | derived | inferred` field defaulted to `declared` everywhere else; the
  profile has only `answeredFields`.
- **J. Potential gaps?** Document-level yes (pro). Needs-versus-coverage: no rule reads a
  limit against a need; for free and plus no gap row ever exists.
- **K. Changing needs?** The registry and reviews are a good baseline; the loop never
  closes with evidence.
- **L. Prevention?** Data present, product absent.
- **M. Reason to continue?** The map and one insight, then an upload whose result for
  most users is a summary with no comparison against what they said matters.

The conceptual defect is structural, not cosmetic: the product has a needs layer and a
risk layer that do not share a vocabulary, a coverage layer that never meets either, and
no way to say how sure it is.

## C. Strategic model — four layers, one vocabulary, one confidence scale

**One vocabulary.** `lib/protection/domains.ts` defines the ten **attention areas** —
`household`, `income`, `debt`, `retirement`, `residence`, `property`, `mobility`,
`work`, `health`, `lifestyle` — each mapped, in one table, to its `EVENT_DOMAIN` (money
splits into income/debt/retirement), its catalogue risk ids, its line-of-business
families, its score category and its labels. `derive-priorities.ts`, the
recommendation tie-break, the risk lens and the map all read this table; a guard proves
every catalogue risk and every writable line of business belongs to exactly one area.

**Layer 1 — Life context** (facts): the typed `PolicyholderProfile` columns. New:
`incomeDependency` (`primary | shared | minor`) and `factProvenance` JSON keyed by
column: `{ source, precision, at }` with `source ∈ onboarding | quick_start | assessment
| life_event | questionnaire | advisor | policy` and `precision ∈ coarse | exact`.
`answeredFields` stays as the derived union for the engine. One function,
`applyFactWrites`, decides precedence: an exact answer replaces a coarse one; a coarse
answer never replaces an exact one; a field absent from a request is untouched (this
retires the wizard's erasure bug); `policy` never overwrites a declared fact.

**Layer 2 — Perceived priorities** (statements): `ProtectionProfile` as built, with two
answers finally consequential: `guidancePreference` sets the explanation density of every
area detail, and `uncertaintyReasons` orders what the assessment explains first.

**Layer 3 — Risk exposure**: the catalogue and `assessRisks`, unchanged as the engine.
Its `needs_review` factors become the assessment's questions: an area asks only the
`requires` then `supports` factors of its risks that are still unknown, one at a time,
pre-filled from Layer 1 and written through `applyFactWrites` with `source: assessment,
precision: exact`.

**Layer 4 — Actual protection**: `lib/protection/coverage-model.ts` derives, per area,
the lines held from the user's policies — `detail: summary_only` (basic extraction) or
`analysed` (deep run with `acordData.coverages[]`), plus the document gap rows. It is
built only from policies and rule findings, never from answers.

**One confidence scale** (`lib/protection/evidence.ts`): `unknown` · `user_reported` ·
`inferred` · `policy_verified` · `externally_verified`. Facts: declared exact →
`user_reported`; floors and derivations (e.g. `propertiesOwned` from `residenceType`) →
`inferred`. Protection: a held policy → `policy_verified` for the line's presence, with
`detail` saying whether its limits were read. `externally_verified` exists in the type
and is produced by nothing today; the report says so.

**The composition** — `lib/protection/attention-areas.ts` `buildAttentionAreas()`:
for each area, importance (Layer 1 + 2, the existing rule table), exposure (the area's
risks with status and the factors still unknown), protection (Layer 4), and an
**alignment** that is deliberately conservative:

| alignment | when | wording register |
|---|---|---|
| `unknown` | required factors unknown | «Δεν το ξεκαθαρίσαμε ακόμη» |
| `not_yet_checked` | exposure known, no policy seen for the area | «Δεν έχουμε δει ακόμη ασφαλιστήριο για αυτό» — never "uncovered" |
| `appears_covered` | a held policy's line answers the risk (`already_covered`) — `summary_only` adds «τα όρια δεν έχουν διαβαστεί ακόμη» | «Φαίνεται να καλύπτεται» |
| `review` | `protection_gap` / `opportunity` from the engine, or a stated priority with no evidence | «Αξίζει να το εξετάσουμε» |
| `gap` | only a rule-decided `GapInstance` on a held policy in the area | the rule's own wording, severity through `describeSeverity` |

Every area carries the explanation triplet: **why this is showing** (the catalogue's
`whyItApplies` or the stated-priority reason), **what we don't know yet** (the unknown
factors as questions, or «we haven't seen your policies for this»), **what happens
next** (answer two questions / check the first policy / review the finding).
`requiresValidation` stays true until a `policy_verified` protection exists for the area.

## D. The journey (decision on timing: adaptive, breadth before upload, depth on demand)

Considered: (A) full assessment before upload — highest effort, lowest evidence; (C)
assessment only after analysis — most users never get an analysed policy (pro gate), so
they would never reach depth; (B/D) breadth first, depth per area on demand, evidence
when it arrives — least effort per unit of value, each question tied to a visible
unknown, the upload stays one screen from the map, health questions only inside the
health area with Art. 9 consent, and the free tier still gets a comparison against the
policy's *presence* even when limits are unread. Chosen: **B/D.**

```
WELCOME → intent → (orientation) → people → (income dependency) → home → income →
obligations → mobility → hurt_most → changes → (plans) → confidence →
(uncertainty_reason) → guidance → THE MAP (areas + triplet)
   ├─ «Να δούμε τι έχω ήδη» → upload → analysis (queued/summary) → the map re-reads
   │     Layer 4: areas flip to appears_covered / review / gap with evidence
   └─ «Θα το κάνω αργότερα» → dashboard (priorities card = the same areas)
/protection?lens=risk → AREAS OF ATTENTION → area detail: why · what we don't know
   (2–4 questions, pre-filled, one at a time) · what your policies say · what you can
   do (mitigations incl. prevention) · «What we still need to understand» (factorsToResolve)
Life event (declared or detected) → review opens on its area → resolved by evidence
   (an analysed policy for the area) or by the person
```

The onboarding stays at ten counted screens; `income_dependency` is conditional
(someone depends on the person and they earn), so the denominator does not move.

## E. Question map (onboarding) — every answer has a consumer

| id | Greek prompt | answer | writes (layer) | why it matters | area(s) | asked again? | downstream |
|---|---|---|---|---|---|---|---|
| intent | Τι σε έφερε εδώ; | single ×7 | `ProtectionProfile.intent` (2) | orders the map's opening line; analytics | — | no | map copy, `orientation` gate, analytics |
| people | Ποιοι βασίζονται σε σένα σήμερα; (+Πόσα;) | multi + count | `childrenCount`, `dependentsCount` (floor, `inferred`), **`maritalStatus=partnered`** when a partner is chosen (1) | dependency risk | household, income | never (pre-filled everywhere) | `life_dependents`, `life_debt` applies; importance |
| income_dependency (new, conditional) | Πόσο βασίζεται το νοικοκυριό σου στο εισόδημά σου; | single: κυρίως σε αυτό / περίπου στο μισό / λίγο — υπάρχουν κι άλλα / δεν είμαι σίγουρος/η | `incomeDependency` (1) | the single strongest signal for household and income importance | household, income | no | importance rule (`primary` → high), area triplet |
| home | Πού μένεις; | single ×4 | `residenceType`, `ownsHome`, `propertiesOwned` (1) | property exposure | residence, debt | never | `home_*` risks, obligations filter |
| income | Από πού έρχεται το εισόδημά σου; | single ×6 | `employmentStatus`, `ownsBusiness` (1) | income continuity, business exposure | income, work, retirement | never | `income_interruption`, `professional_liability` applies |
| obligations | Τρέχει κάποια σταθερή υποχρέωση; | multi + none + unsure | `hasLoans` (1), `commitments` (2) | commitments outlive income | debt | balance asked in the debt area only | `life_debt`, importance |
| mobility | Οδηγείς; | single 0/1/2 | `vehiclesCount` (1) | motor exposure | mobility | never | `motor_*` applies |
| hurt_most | Αν συνέβαινε κάτι απρόοπτο, ποιο θα επηρέαζε περισσότερο τη ζωή σου; | ordered multi ≤2 | `riskConcerns` (2) | perceived priority | all | no | importance high/medium, area order, AI prompt ordering |
| changes | Άλλαξε κάτι σημαντικό τον τελευταίο χρόνο; | multi | `recentChanges` (2) → life events at completion | changed needs | per change | no | reviews, importance `high` on the area |
| plans | Τι έρχεται τους επόμενους 12–18 μήνες; | multi | `futureConsiderations` (2) | future change | per plan | no | importance `medium`, area triplet |
| confidence | Πόσο σίγουρος/η είσαι…; | single ×5 | `confidenceLevel` (2) | where to start explaining | — | no | map confidence line, `uncertainty_reason` gate |
| uncertainty_reason | Τι σε κάνει να μην είσαι σίγουρος/η; | multi | `uncertaintyReasons` (2) | what to explain first | — | no | **area detail ordering** (new consumer) |
| guidance | Πώς προτιμάς να προχωρήσουμε; | single ×3 | `guidancePreference` (2) | explanation density | — | no | **area detail density** (new consumer) |

Assessment questions are not authored per screen: each unknown factor of an activated
area's risks maps to one question component (`lib/protection/factor-questions.ts`:
factor → column(s), input type, Greek prompt, why we ask, Art. 9 flag). The assessment
never asks a factor whose column is already `exact`.

## F. Branching

Onboarding: `orientation` iff `intent = help_me`; `income_dependency` iff people ≠
«Μόνο εγώ» and income ≠ «Δεν δουλεύω / σπουδάζω» ; `plans` iff «Έρχεται κάτι σύντομα»;
`uncertainty_reason` iff confidence in the low three; obligation and concern options
filtered by earlier answers (unchanged). Assessment: an area is **activated** when its
importance is `high` or `medium`, or a stated concern names it, or a life event touched
it; a dormant area is listed under «Δεν το εξετάσαμε ακόμη». Inside an area, the
question order is `requires` before `supports`, and, when `uncertaintyReasons` contains
«Δεν ξέρω τι ακριβώς καλύπτουν», the risk explanation opens before the first question.
Guidance `explain_everything` expands explanations by default; `show_what_matters`
collapses them; `on_my_own` hides the coaching lines. Health factors are asked only inside
the health area, behind the existing Art. 9 consent.

## G. Data model

- `PolicyholderProfile` + `incomeDependency String?` + `factProvenance Json?` (migration
  `20260904150000_fact_provenance`, dev → verify → prod → verify). Export includes both;
  erasure nulls both.
- `ProtectionProfile`: unchanged schema; `assessmentProgress` is **derived** from
  provenance timestamps (no new column).
- `RiskReview`: resolution by evidence recorded in the existing close path with a
  distinct reason (`policy_evidence`) — column added only if none can hold it.
- Nothing new is inferred into a fact column from a policy; Layer 4 is computed on read.
- Duplicate stores are not multiplied: no snapshot of attention areas is stored;
  `priorityAreas` stays the analytics snapshot it already is.

## H. Risk model

Dimensions = the ten areas. Signals per area: importance (rule table, extended with
`incomeDependency`), exposure (catalogue statuses), unknown factors, protection
evidence, alignment, confidence (the lowest evidence level among the inputs the
alignment used). No score: the honesty guards stand, and the alignment table above is
the only verdict vocabulary. Limitations stated in-product: no external data; limits
compared only when a deep run exists; absence of an uploaded policy is never treated as
absence of cover.

## I. Needs → coverage → gap

A stated priority raises importance, never a gap. A held line flips alignment to
`appears_covered` only for the risks the catalogue marks as covered by that line
(`already_covered` uses the same branch-family match), with the limits caveat when the
run was summary-only. A rule-decided document finding is the only `gap`. When a policy
analysis finalises for an area with an open review, the review closes with reason
`policy_evidence`. Adequacy against a computed need (limit vs income × years) is the
next rule to author in the gap catalogue — the reference pattern exists
(`insured_value_*`) and it needs the `income` factor the assessment now collects; it is
listed under next priorities, not built here, because it must ship with its own trace
cases.

## J. Analytics (added; every name registered and emitted)

`life_context_completed {intent, dont_know_count}` · `risk_assessment_started {source}`
· `risk_area_opened {area, importance, alignment, confidence}` · `risk_factor_answered
{area, factor}` · `risk_area_completed {area, remaining_unknown}` ·
`attention_area_created {area, importance, confidence}` (once per area at map time) ·
`recommendation_viewed {rule_id, area}` · `action_started {kind, area}`. Server mirror:
`risk_assessment_completed`. Count keys: `attention.areaCount`, `attention.unknownCount`,
`attention.coveredCount`. Retired: none (registry guard forbids unemitted names). The
Vercel `track()` consent gap is reported, not changed.

## K. Implementation waves

**Wave 1 — core, no UI** (parallel): (1a) `lib/protection/domains.ts` + guard; refactor
`derive-priorities.ts` areas and `PRIORITY_LOBS` to read it. (1b) schema + migration,
`lib/protection/evidence.ts`, `applyFactWrites` in `lib/services/protection-profile/
fact-writes.ts` adopted by every profile writer (patch, quick start, life events,
questionnaire, risk-profile route — which stops erasing), export/erasure, validations,
tests. (1c) `coverage-model.ts`, `attention-areas.ts`, `factor-questions.ts`, the
explanation triplet with dictionary keys, honesty tests.
**Wave 2 — surfaces** (parallel): (2a) onboarding: `income_dependency`, partner →
`maritalStatus`, the map rows from attention areas, uncertainty/guidance wiring, new
events; guards moved. (2b) `/protection?lens=risk`: areas list, area detail with the
adaptive questions (`answerAssessmentFactor` action), evidence, mitigations incl.
prevention, «What we still need to understand»; wizard pre-fill fix; ledger. (2c)
dashboard priorities card on attention areas; review closed by evidence; recommendation
view/action events.
**Wave 3 — validation and red teams**: gates, full suite, build; a 390px browser walk of
five personas; behavioural, insurance and product red teams as independent reviews; fixes;
the A–O report.
