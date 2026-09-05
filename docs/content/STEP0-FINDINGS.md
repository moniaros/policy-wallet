# PW-CONTENT-01 — Step 0 findings (investigation, no code)

Written 2026-09-06 at NEW-UI `f79f867b`. Read-only throughout: no product code, no database writes, no deletions. Every claim names the file or the query it came from. **Halt at the end; nothing here is a change.**

The headline findings, before the sixteen numbered ones:

1. **The three seeded production accounts do not exist.** `ph1@`, `agent1@`, `mixed@example.com` are in neither `public.users` nor `auth.users` on production. They are created by `prisma/seed.js` and live in the **dev** project; the August authorisation audit already recorded the same ("Stale — they live in the dev project"). Goal 8.1 has no target and HANDOFF H7 is wrong as written. (H16.)
2. **`renters` is not a branch a policy can be in, and `contents` is not a branch at all.** `renters` exists in the taxonomy with `writeEnabled: false` and `parentId: 'home'`; it is not in `WRITE_BRANCH_IDS`, so it cannot be declared at upload and the extractor's `lineOfBusiness` enum cannot emit it. A tenant's contract is detected as the property family and stored as `home`. `contents` has no id; it is the value `contents-only` of `property.contentsVsStructure`. Goal 5 as written names two branches no production policy can occupy. (B4.)
3. **Catalogue growth already has a third state, and it is the wrong one.** On any version difference the composition returns `catalogue_mismatch` and renders **nothing** but «Οι έλεγχοι άλλαξαν μετά από αυτή την ανάλυση, γι' αυτό η σύνθεση δεν εμφανίζεται». The version is a fingerprint of every active rule's slug, branch, severity and detection logic, so adding one rule, or editing one severity that renders nowhere, blanks the composition of every run in production. Neither of D10's two failure modes is what happens; the composition vanishes instead. (D9.)
4. **The relationship index is weighted and banded, and it reads «Καλή» for a customer whose cover has entirely expired.** Four coefficients, four recency thresholds, two colour bands with verdict labels. Presented under F13 for Goal 3 to decide.
5. **The locale has two sources that never meet.** The server reads `users.preferred_language`; the client provider starts at `'el'` and then reads `localStorage`, never the stored preference. Eleven server surfaces render client components that read the other source. (C6–C7.)

---

## A. What can a rule express?

### A1. The predicate vocabulary (`lib/gap-detection.ts`, frozen at the D-V1 hash)

A definition's `detectionLogic` is either one rule object or `{ operator: 'AND' | 'OR', rules: Rule[] }`. There is no NOT and no nesting. `hasEvaluableRule` requires at least one rule with a string `type`.

| rule `type` | what it reads | fires when | notes |
|---|---|---|---|
| `acord_field_check` | `field` (dotted path into `acordData`), plus per-operator params | see operators below | the only type the authored catalogue uses for 27 of 29 rules |
| `date_within_days` | `field` (ISO date string) + `withinDays` (default 30) | the date is 0…N Athens calendar days ahead | 2 of 29 authored rules (green card) |
| `low_limit` | `field` → `property.insuredValue` → `home.insuredValue` → `coverage.sumInsured`, plus authored `threshold` | the number is below the constant | unused by the authored catalogue |
| `missing_coverage` | `policy.coverageSummary` free text + `requiredCoverage` substring | summary present and does not contain the word | legacy, prose-based; unused |
| `insurer_match` | `policy.insurerName` + constant | equal | unused |
| `duration_short` | `policy.startDate/endDate` + `minMonths` | term shorter than N calendar months | unused |
| `payment_frequency_check` | `policy.premium.frequency` | monthly or quarterly | unused |
| `always` | — | always | unused |

`acord_field_check` operators (`evaluateAcordFieldCheck`):

| operator | params | fires when | unknown → |
|---|---|---|---|
| `equals` / `not_equals` | `value` | strict equality | `equals` false; `not_equals` **true when the field is absent** (undefined ≠ value) |
| `is_true` / `truthy` | — | `=== true` | false |
| `is_false` | — | `=== false` | false (silence is not absence) |
| `falsy` | — | present and falsy (`''`, `0`, `false`) | false |
| `missing` | — | undefined, null, `''`, or empty array | **true** (fires ON silence — must be worded «δεν καταγράφεται») |
| `all_missing` | `fields[]` | every listed field absent | true |
| `all_false` | `fields[]` | at least one listed field `=== false` | false |
| `less_than` | `value` (number) | number `<` constant | false |
| `value_drift` | `referenceField`, `thresholdPct` (default 20, must be > 0), `direction` above/below/either | both numbers finite and > 0, drift beyond the threshold | false |

The authored catalogue today: 29 definitions, one rule each, all `operator: 'AND'`; `is_false` ×14, `missing` ×8, `all_missing` ×1, `all_false` ×1, `value_drift` ×2, `date_within_days` ×2. Fields read: 22 distinct paths, all under `vehicle.*`, `property.*`, `health.*`, `pet.*`, `travel.*`, plus `beneficiaries` and `property` (whole object).

### A2. Fields and optionality

Every field in `lib/schemas/acord-data.ts` is `z.optional()` (a few carry defaults: `pet.species` → `UNKNOWN`, `pet.preExistingConditionsExcluded` → `[]`). The prompt tells the model to omit anything it would score below ~40. **Every input a rule can read is therefore optional**, and the evaluator's contract is built on that: only `missing`/`all_missing`/`not_equals` fire on an absent field. Branch scoping is at the definition, not the rule: `planAttemptedRules` selects active definitions whose `lineOfBusiness === policy.lineOfBusiness` **exactly** (no family inheritance), and `decideGapsForPolicy` evaluates the same set.

### A3. What a definition can and cannot express

| need | expressible? | how / why not |
|---|---|---|
| presence check | **yes** | `missing` / `all_missing` (fires on silence); `is_true` for "the document says so" |
| numeric threshold | **partly** | only `less_than` a constant; no greater-than, no range |
| comparison between two extracted fields | **partly** | only as relative drift (`value_drift` ±%, direction); an absolute "A < B" is approximated by `direction: 'below'` with a small `thresholdPct`, never exactly |
| date comparison | **partly** | only "expires within N days of today"; not "date A before date B", not "older than N years" |
| conditional on branch | **yes, at the definition** | exact `lineOfBusiness`; a rule cannot say "if home-family" |
| conditional on an asset attribute | **yes in the engine, wrong in the composition** | `AND [ {equals property.contentsVsStructure 'contents-only'}, {missing property.theftCoverageLimit} ]` evaluates correctly, but when the gate is false the rule does not fire and `composeFindings` counts it **covered** if its inputs are present — there is no "not applicable" outcome in `lib/gaps/composition.ts`. A conditional rule would inflate «καλύπτεται» on every policy the condition excludes. (Presentation-side gap, not an engine gap — see the Goal 5 note.) |
| check against a user-supplied value | **no** | no operator reads anything but `acordData` and policy columns; `low_limit.threshold` is an authored constant |

## B. What does the extractor actually produce, per branch?

### B4. Fields per branch

Schema sections (`lib/schemas/acord-data.ts`): shared — `policy.*` (insurer, number, lineOfBusiness, dates, premium, sumInsured), `coverages[]` (name, limit, deductible, appliesTo…), `deductibles`, `exclusions[]`, `conditions[]`, `insuredItems[]`, `insuredPersons[]`, `namedClauses[]`, `territorialScope`, `finePrintClauses[]`, `perksAndBenefits[]`, `notableConditions[]`, `beneficiaries[]`; branch sections — `vehicle` (18 fields), `property` (15), `health` (12), `lifeAndInvestment` (13), `pet` (13), `travel` (10), `transit`, `marineVessel`; legacy duplicates `motor`, `home`, `life`. The prompt (`lib/services/ai/prompts.ts:124-125`) requires `lineOfBusiness` to be one of the **31** `WRITE_BRANCH_IDS` and says «populate ONLY the section matching the detected lineOfBusiness». Knowledge packs exist for marine_hull, marine_cargo, marine_crew, crime_and_valuables, personal_cyber, liability only.

**Unauthored branches.** `WRITE_BRANCH_IDS` has **31** branches; 8 are authored (motor, motorbike, home, health, group_health, pet, travel, life); **23 writable branches have no rule**: income_protection, personal_accident, pension, cyber, liability, legal_expenses, roadside, boat, boat_hull, boat_tpl, fine_art, business, professional_liability, employer_liability, transports, marine_hull, marine_cargo, marine_crew, money, fidelity, group_life, group_pension, other. A further 13 branches are read-only (`writeEnabled: false`, reachable only as legacy data): truck, renters, disability, gadget, bicycle, business_property, equipment, stock, business_interruption, technical_works, energy, guarantees, special_risks.

**`renters`.** `writeEnabled: false`, `parentId: 'home'`, aliases `tenant`, absent from `WRITE_BRANCH_IDS` and therefore from the extractor's enum and the upload form. The document gate's family map (\`lib/ingestion/types.ts\`): motor → motor (motor, motorbike, roadside); home → home (home, fine_art); health → health (health, group_health); life → life (life, group_life, pension, group_pension, income_protection, personal_accident); marine → boat; business → business (business, liability, professional_liability, employer_liability, cyber, money, fidelity, legal_expenses); travel; pet. \`renters\` appears in no family. A tenant's contract is detected as the **home** family and stored as **\`home\`**; the extractor then fills \`property.*\` — including \`contentsVsStructure\` («structure-only / contents-only / both»), \`insuredValue\`, \`replacementValue\`, \`theftCoverageLimit\`, \`mortgageeBank\`, \`technicalAssistancePhone\`. There is no tenant-specific field (no landlord liability, no deposit, no tenant-improvements).

**`contents`.** Not a branch id anywhere in `lib/insurance/taxonomy.ts`. It is `property.contentsVsStructure = 'contents-only'`.

**What has actually been extracted.** Production (6 policies with `acord_data`): health ×2 (`health.*` populated; coverages 0 and 4), money ×1 (generic sections only), motor ×2 (`vehicle.*`: accidentDeclarationPhone, coverageTier, hasRoadsideAssistance, make, model, plateNumber, roadsideAssistancePhone, usage / coverageTier, deductible, glassBreakage, hasRoadsideAssistance, make, model, ownVehicleDamage, plateNumber, vin), roadside ×1 (failed, `processingError` only). **No production policy in any unauthored branch has ever been extracted**, so "which fields populate for renters" cannot be read from data; only the schema and prompt above answer it. Dev (34 policies): motor 16 (8 with acord), health 9 (3), travel 2 (1), home 2 (2), pet 1 (1), life 1 (1), pension/other/cyber 1 each (none extracted). The two dev home policies that carry \`acord_data\` (\`ΣΥΜΒ-2026-H5\`, \`ΣΥΜΒ-2026-H11\`) hold only \`_version\`, \`extraction\` and \`policy\` — **no \`property\` section and no legacy \`home\` section**: they are seeded fixtures, not extractions, and every home rule (all read \`property.*\`) returns indeterminate on them. There is no real home extraction anywhere to read a field inventory from.

### B5. Shared fields

Shared across every branch: `policy.*`, `coverages[]`, `exclusions`, `conditions`, `insured`/`policyholder`, `extraction.*` (provenance). Branch pairs sharing a section: motor + motorbike (`vehicle`), health + group_health (`health`), home + a tenant's document (`property`, because the tenant's document IS home today). Life reads `beneficiaries` and `lifeAndInvestment`. A `home` field is populated for a renters policy only in the trivial sense that the policy is stored as home.

## C. Locale sources

### C6. Every source of the rendered language

| # | source | default | written by | read by |
|---|---|---|---|---|
| 1 | `users.preferred_language` (DB) | `'el'` (Prisma default) | signup (`app/auth/actions.ts`), OAuth callback, `POST /api/user/language` (the client toggle) | every server page/layout under `(protected)` (`getTranslations(dbUser.preferredLanguage \|\| 'el')`), `wallet/[id]`, `customers/[id]/policy`, emails, the digest |
| 2 | client `LanguageProvider` state (`contexts/LanguageContext.tsx`) | `initialLanguage ?? 'el'`, then `localStorage.language` in an effect after hydration | the toggle (which also POSTs to source 1 and `router.refresh()`s) | every `useLanguage()` / `useTranslations()` component — the root layout mounts it **without** `initialLanguage`, so it never sees source 1 |
| 3 | `StaticLanguageProvider` (pinned) | the route's language | `/en/*`, `/auth/*?lang=` | public and auth trees |
| 4 | route defaults | `resolveLegalLanguage(?lang)` → `'el'`; `<html lang="el">` in the root layout | — | legal pages, crawlers |
| 5 | per-component fallbacks | `InsightsClient` `language \|\| "en"` and `ActivityClient` `language \|\| "en"` (**English** fallback in a Greek-default product), `AppShell` `preferred_language \|\| 'el'`, consents API cookie `\|\| "el"`, emails `\|\| "el"`, ~15 `=== 'en' ? 'en' : 'el'` normalisations | — | those components |
| 6 | `<html data-locale>` | client effect stamps `el-GR` / **`en-US`**, while `lib/i18n/format.ts` maps en → **`en-GB`** | — | CSS/assistive tech vs formatters disagree on the English locale tag |

Sources 1 and 2 agree only if the user has toggled since the DB value was set. A user whose preference was set at signup (or by an admin) and who never toggled — the agent account in the F7 smoke — gets an English shell from source 1 and Greek client cards from source 2.

### C7. Surfaces where a server-rendered string and a client-rendered string share a view

Enumerated by script (`scratchpad/meeting-surfaces.js`: server `page.tsx`/`layout.tsx` calling `getTranslations` or reading `preferredLanguage`, whose import graph reaches a component calling `useLanguage()`), **11 surfaces**:

| audience | server surface | client component(s) reading source 2 |
|---|---|---|
| B2B | `customers/[id]/policy/[policyId]` (the known case) | `AnalysisCard` (record status, composition, findings), `CollaborationTimeline` |
| B2B | `insights` | `AiDisclaimer` |
| B2B | `collaboration/threads/[id]` | `CollaborationTimeline`, `ThreadActionPanel`, `AiDisclaimer` |
| both | `tasks`, `tasks/[id]` | `TasksClient`, `QuestionnaireForm` |
| both | `notifications` | `NotificationsClient` |
| both | `(protected)/layout` | `NeedsClaim` |
| B2C | `wallet` | `PolicyWalletClient` |
| B2C | `wallet/[id]/edit` | `EditPolicyForm` |
| B2C | `protection` | `UpgradeTriggerCard` |
| B2C | `benefits` | `LockedInsightPreview` |

Not in the list but the same shape in reverse: `wallet/[id]` formats dates server-side with source 1 (`formatProvenanceDate(…, language)`) and hands them to `AnalysisCard`, which picks its sentence copy from source 2 — that is exactly the Greek sentence with an English date seen on production.

### C8. Dates and numbers

- `lib/i18n/format.ts`: `resolveLocale` (el → `el-GR`, en → `en-GB`, unknown → el-GR), `formatCurrency`, `formatNumber`, `formatDate`, `formatDateTime`, `formatTime` — all take the language from the caller.
- `formatProvenanceDate(date, locale)` (`lib/gaps/findings-provenance.ts`): el-GR / en-GB, Europe/Athens, long month.
- Ad hoc (counts from a grep): `toLocaleDateString(language…)` ×11, `(locale…)` ×8, **bare `toLocaleDateString()` ×8** (the browser's locale, whatever it is), `toLocaleString(…)` ×12 assorted, `Intl.NumberFormat(language)` ×4 and `(lang)` ×5 passing a bare `'el'`/`'en'` tag.
- Hardcoded and defensible: `lib/policy-status.ts` uses `en-CA` to obtain ISO date parts (internal); `portfolio-rules.ts` formats both languages explicitly; admin email and admin dashboard use fixed locales for an admin-only audience.

## D. Catalogue growth — the blocking question

### D9. Which version does a surface compute the denominator from?

`composeFindings` (`lib/gaps/composition.ts:221-262`):
- with no attempted plan → `pre_plan` (dated) or `no_run`;
- with an empty plan → `unauthored`;
- **if `attempted.catalogueVersion !== currentCatalogueVersion()` → `catalogue_mismatch`, and the component renders only the sentence** «Οι έλεγχοι άλλαξαν μετά από αυτή την ανάλυση, γι' αυτό η σύνθεση δεν εμφανίζεται. Μια νέα ανάλυση θα την ενημερώσει.» (`CoverageComposition`, B2 acceptance 6);
- otherwise the denominator is `attempted.slugs` (the run's plan) and each slug is classified with the **current** definition of that slug (`AUTHORED_GAP_DEFINITIONS` by slug).

So the answer to "run's version or current one" is **neither, after growth: the composition is withheld.** Before growth, it is the run's plan classified by current definitions, which are identical by construction.

The version is `fingerprintGapDefinitions` (`lib/gaps/catalogue-version.ts`): sha256 over every **active** row's `slug | lineOfBusiness | severity | defaultSeverity | ruleId | detectionLogic`, sorted. At run time it is computed from the database rows (`planAttemptedRules`); at render time from the repository catalogue. Consequences: adding one rule to any branch, editing one rule's logic, or changing a **severity that renders nowhere**, flips every run in every branch to `catalogue_mismatch`.

### D10. What each option does to a real production policy

Production's live findings sit on one motor policy analysed 2026-09-05 (pre-plan, so today unaffected); its sibling analysed 2026-08-21 renders the composition. The first merged rule of this series blanks that composition on every surface until the owner re-analyses.

- **Current-version denominator:** not implemented; would show the 2026-08-21 run with the new checks counted as `indeterminate` and no explanation — the inflation the spec describes.
- **Run-version denominator:** the data exists (`attempted.slugs` is the exact list); the definitions for those slugs still exist and are unchanged unless someone edited that rule. Two policies analysed a week apart show 6 and 8 checks with nothing saying why — unless the stale line names it, which is what Goal 4 requires.
- **Today (withhold):** the customer loses the two lines entirely and gets a sentence that blames "the checks changed"; the report's caveat still shows the dated provenance.

### D11. Re-analysis and cost

- Per policy: B2C `runPolicyAnalysis` / `retryPolicyAnalysis` (`app/(protected)/wallet/actions.ts`), the run-level `retry-missing` route, admin `requeuePolicy` (`app/(protected)/admin/policy-actions.ts`), and the queue entry `POST /api/v1/jobs/process-policy`. Consent and the plan's allowance gate each.
- **Bulk: none.** No admin action or job iterates policies to re-run analysis; a catalogue-growth backfill would be a one-off script through `requeuePolicy`.
- Cost, production: 5 completed runs averaged **55,934 actual tokens** (max 99,936; the pre-run estimate averages 189,600, so the gate's estimate is ~3.4× actual). `token_usage` for `policy_analysis` on gemini-3.5-flash: 33 calls, avg 27,797 tokens, **avg €0.0945**; plus `gap_detection` ≈ €0.015 and `policy_clarity` ≈ €0.005 per run. A full re-analysis costs roughly **€0.10–0.15 and 50–100k tokens**; the free plan's 150,000-token month allows two or three.

## E. Classification inputs — the 26 `under_review` slugs

| # | branch | slug | τι ελέγχει (μία γραμμή) |
|---|---|---|---|
| 1 | motor | no_own_damage_cover | Δεν περιλαμβάνεται κάλυψη ιδίων ζημιών του οχήματος (το έγγραφο το δηλώνει ρητά). |
| 2 | motor | no_glass_breakage_cover | Δεν περιλαμβάνεται κάλυψη θραύσης κρυστάλλων. |
| 3 | motor | no_roadside_assistance | Δεν περιλαμβάνεται οδική βοήθεια. |
| 4 | motor | missing_accident_declaration_phone | Δεν καταγράφεται τηλέφωνο αναγγελίας ατυχήματος / φροντίδας ατυχήματος. |
| 5 | motor | green_card_expiring | Η πράσινη κάρτα λήγει εντός των επόμενων ημερών. |
| 6 | motorbike | moto_no_own_damage_cover | Όπως 1, για δίκυκλο. |
| 7 | motorbike | moto_no_roadside_assistance | Όπως 3, για δίκυκλο. |
| 8 | motorbike | moto_missing_accident_declaration_phone | Όπως 4, για δίκυκλο. |
| 9 | motorbike | moto_green_card_expiring | Όπως 5, για δίκυκλο. |
| 10 | home | no_earthquake_cover | Δεν περιλαμβάνεται κάλυψη σεισμού. |
| 11 | home | no_flood_cover | Δεν περιλαμβάνεται κάλυψη πλημμύρας. |
| 12 | home | no_fire_cover | Δεν περιλαμβάνεται κάλυψη πυρκαγιάς. |
| 13 | home | missing_enfia_components | Λείπει τουλάχιστον μία από τις καλύψεις πυρός–σεισμού–πλημμύρας που απαιτούνται για την έκπτωση ΕΝΦΙΑ. |
| 14 | health | no_direct_billing | Δεν προβλέπεται απευθείας εξόφληση του νοσοκομείου από την ασφαλιστική. |
| 15 | health | no_annual_checkup | Δεν περιλαμβάνεται ετήσιος προληπτικός έλεγχος. |
| 16 | health | missing_hospital_class | Δεν καταγράφεται θέση νοσηλείας. |
| 17 | health | missing_coordination_centre | Δεν καταγράφεται συντονιστικό κέντρο / τηλέφωνο. |
| 18 | group_health | group_no_direct_billing | Όπως 14, για ομαδικό. |
| 19 | group_health | group_missing_hospital_class | Όπως 16, για ομαδικό. |
| 20 | group_health | group_missing_coordination_centre | Όπως 17, για ομαδικό. |
| 21 | pet | no_direct_vet_payment | Δεν προβλέπεται απευθείας πληρωμή του κτηνιάτρου. |
| 22 | pet | missing_leishmaniasis | Το έγγραφο δηλώνει ότι η λεϊσμανίαση δεν καλύπτεται. |
| 23 | travel | no_repatriation_cover | Δεν καλύπτεται ο υγειονομικός επαναπατρισμός. |
| 24 | travel | no_trip_cancellation_cover | Δεν καλύπτεται η ακύρωση ταξιδιού. |
| 25 | travel | missing_emergency_assistance_phone | Δεν καταγράφεται τηλέφωνο έκτακτης βοήθειας. |
| 26 | life | no_beneficiaries_recorded | Δεν καταγράφεται κανένας δικαιούχος (ούτε στο σχετικό πεδίο ούτε στην ενότητα ζωής). |

Where the search for Goal 2 should start, from the F5 pass: Π.Δ. 237/1986 (accident declaration duty, green card regime) for 4/5/8/9; Ν. 2496/1997 άρθρα 27–29 for 26; mortgage-loan terms (contractual class) for 10–12; ΕΑΕΕ published guidance and insurers' general terms (market class) for the rest. The F5 pass found nothing citable for any of them at the "named article" bar.

## F. The relationship index

### F13. Definition (`lib/agent/health-score.ts`, «Δείκτης σχέσης πελάτη»)

Inputs: `policyCount` (policies the agent may see, **any status, expired included** — `policiesOwned` under the visibility set with no status filter; `activePolicyCount` exists separately and is not used), `openGapsCount` (classified live gap rows since R3), `lastInteractionDate`, `profileComplete` (= activated AND policyCount > 0), `activationStatus`.

| component | max | formula |
|---|---|---|
| coverage completeness | 40 | `40 × (1 − (gaps / policies) × 0.5)`, floor 0; **0 when policyCount = 0** |
| profile completeness | 20 | +10 activated, +5 profileComplete, +5 policyCount > 0 |
| interaction recency | 20 | ≤7 days 20, ≤30 15, ≤90 10, ≤180 5, else 0 |
| gap count inverse | 20 | `20 − 4 × gaps`, floor 0 |

Rendering: `getRelationshipScoreColor` (≥70 emerald, ≥40 amber, else red), `getRelationshipScoreDotColor` (status-success/warning/danger), `getRelationshipScoreLabel` (≥70 «Καλή», ≥40 «Μέτρια», else «Χρειάζεται προσοχή»). Sites: the agent customer profile («90/100», with the disclaimer «Δεν αποτελεί αξιολόγηση της επάρκειας ασφάλισης»), the agent dashboard client rows, the customer list (per the docstring: the column once headed «Υγεία»).

Inputs are counted quantities and dates; the combination is **weighted** (40/20/20/20, the 0.5 and the 4 per gap), **thresholded** (7/30/90/180 days) and **banded into verdict adjectives with colours**. What it returns:

| customer | policyCount | gaps | result |
|---|---|---|---|
| no policies, never activated, never contacted | 0 | 0 | 0 + 0 + 0 + 20 = **20** → red «Χρειάζεται προσοχή» |
| no policies, activated, contacted this week | 0 | 0 | 0 + 10 + 20 + 20 = **50** → amber «Μέτρια» |
| only expired policies (say 2), no gap rows, activated, contacted this week | 2 | 0 | 40 + 20 + 20 + 20 = **100** → green «Καλή» — for a customer with no cover in force |
| every analysis failed (policies held, no gap rows ever) | n | 0 | identical to a fully-insured customer: up to **100** «Καλή» |
| one policy, five classified gaps, activated, contacted this week | 1 | 5 | 0 + 20 + 20 + 0 = **40** → amber |

Presented, not decided. The evidence Goal 3 asked for: the inputs are counts, the index is not — it is weighted, thresholded and banded, and two of the three edge states read as the good outcome.

## G. Trust pages

### G14. How `/terms` and `/privacy` are built

- Content: `lib/legal/legal-content.ts` — `legalContentByLanguage[el|en]` with typed `LegalSection[]` per document kind (`terms`, `privacy`, `cookies`, `subprocessors`), `LEGAL_DOC_META` (version + `lastUpdatedIso` per kind), `getLegalContent(language)`, `resolveLegalLanguage(?lang)` (only `?lang=el|en`; default el; Accept-Language deliberately ignored).
- Rendering: `components/legal/LegalDocumentPage` (`PublicHeader locale`, formatted last-updated via `Intl.DateTimeFormat(el-GR|en-GB)`, counterpart link `/en/<kind>` ↔ `/<kind>?lang=el`, h2 sections).
- Routes: `app/(public)/<kind>/page.tsx` (Greek URL, `generateMetadata` via `buildLegalPageMetadata(kind, language)`) and `app/(public)/en/<kind>/page.tsx` under `StaticLanguageProvider language="en"`.
- Reachability: `proxy.ts` public allowlist carries `/terms`, `/privacy`, `/cookies`, `/subprocessors`, `/trust`; a new page needs its two paths added there or anonymous visitors get a sign-in redirect. A `/trust` page already exists on the same machinery.
- Adding `/methodology`, `/changelog`, `/status` = one new `LegalDocumentKind` each (or a sibling content module for non-legal prose), two routes each, `LEGAL_DOC_META`, the allowlist, the sitemap. The fabricated-count guard already forbids literal public counts; `lib/marketing/public-counts.ts` is where a catalogue-derived number belongs.

### G15. Changelog source of truth

None exists: no `docs/changelog*`, no `CHANGELOG`, no GitHub releases (`gh release list` is empty). Dated sources that do exist: merged PR titles on NEW-UI (squash commits carry `(#N)` and a date), `docs/STATUS.md` and `docs/status-archive-2026-07.md`, and the per-series ledgers (`docs/transparency/PROGRESS.md`). A changelog can be generated from merged PRs since a start date, or hand-written into `docs/changelog/YYYY-MM-DD-*.md` and rendered; an empty page with a start date is the honest v1.

## H. Production hygiene

### H16. The seeded production accounts

Query (read-only, 2026-09-06): `SELECT … FROM users WHERE email IN ('ph1@example.com','agent1@example.com','mixed@example.com')` → **0 rows**; the same against `auth.users` → **0 rows**; a broader `%example.com% / e2e-% / %test% / %seed%` sweep of both tables → **0 rows**. `docs/audits/phase1-authorization-findings-2026-08.md` line 23 already recorded: "Stale. None exists in prod `auth.users` or `public.users`; they live in the dev project." They are created by `prisma/seed.js` (lines 53–68). Production holds 19 `users` rows (12 with an `auth.users` row): the owner's addresses and family/colleague addresses, one phone-only account, and six `deleted+…@deleted.policywallet.local` erasure tombstones.

**Nothing to delete. Goal 8.1 has no target; HANDOFF H7 should be closed as stale.** Whether the owner's own secondary accounts (`moniaros.*`, `amoniarou*`) count as test accounts to rotate before GA is the owner's call and out of this series.

---

## Recommendation on D9/D10 — the option I would take

**Compute against the run's plan, always; never withhold; say when the catalogue moved on.** Concretely, in `lib/gaps/composition.ts` only (presentation, no engine change):

1. Denominator `N₁ = attempted.slugs.length` — the run's recorded plan, whatever the current catalogue says. Classification of each slug uses the current definition **of that slug**; a slug with no current definition (retired) counts as `indeterminate` with reason `rule_retired`.
2. `catalogue_mismatch` stops being a terminal state. It becomes a flag on the composition (`stale: { runCatalogueVersion, currentCatalogueVersion, runDateLabel }`) and the component renders the two lines **plus** one sentence: «Η ανάλυση έγινε στις {date}. Έχουν προστεθεί έλεγχοι από τότε.» with re-analysis as the action. Three states, three sentences: pre-plan (V3), unauthored (B1.5), stale (new) — textually distinct, never interchangeable.
3. Keep the fingerprint as the trigger for the stale line (it is already what `verify:gap-catalogue` compares), but recognise that it flips on a severity edit that renders nowhere; a later, separate decision could drop `severity`/`defaultSeverity` from the hash. Not this series.
4. Re-analysis stays a user action (`runPolicyAnalysis`, `requeuePolicy`); no automatic backfill.

Why this and not the alternatives: the current-version denominator invents checks a run never made; withholding (today) deletes an honest, dated measurement because something unrelated changed; the run-version denominator with a dated stale line is the only option where every number on the page can say where it came from.

## What Goal 0 changes in the series (for the owner's decision, not applied)

- **Goal 5 as written cannot be met**: no policy can be in `renters` and `contents` is not a branch. Two honest reframings: (a) make `renters` a write branch (taxonomy `writeEnabled`, `WRITE_BRANCH_IDS`, the zod enum, the gate's property family) so a tenant's document gets its own branch and its own rule set reading `property.*` — no engine change, but a taxonomy change that touches upload, extraction enum and the gate; or (b) author **home** rules for the contents question keyed on `property.contentsVsStructure`, which requires a composition-side «δεν εφαρμόζεται» outcome (A3) before any conditional rule is safe. Either way the extractor has no tenant-specific fields, so landlord-liability and deposit checks are extraction requests, not rules.
- **Goal 4 is not optional after Goal 5**: the first authored rule blanks every existing composition (D9).
- **Goal 8.1 is moot** (H16); 8.2 and 8.3 stand.
- **Goal 1 has eleven surfaces, not one** (C7), and two English fallbacks in a Greek product (C6 row 5).
- **Goal 3's evidence points at removal** (F13) — the inputs are counts, the index is a weighted, banded verdict; two edge states read as good.

Halt. No code was written; no data was changed.
