# Evidence-backed benefits and personal steps — local/dev, 2026-10-02

## Scope and delivery status

The approved extension to `/wellness` is implemented for local/dev review. It preserves the [earlier prevention pilot](prevention-hub-2026-10-02.md), both views and the existing design. `PREVENTION_PERSONALIZATION_ENABLED` defaults to **false** in the registry and `.env.example`. It is enabled only in the local review configuration alongside `PREVENTION_HUB_ENABLED` and extraction citations. Production has not been migrated, merged or deployed for this delivery.

The application flow is verified with synthetic development fixtures. **Acceptance is not fully closed:** the requested actual AI analysis of `LIFE_POLICY.pdf` and `LIFE_POLICY_RENEWAL.pdf` has not run. Automatic approval review rejected transmission of these sensitive documents to Gemini/OpenAI without destination-specific user authorization. A question identifying both files, providers and purpose is pending. The rejection was not bypassed. No live extraction accuracy, actual provider latency or cost measurement is claimed.

## Broken / trust, privacy and correctness issues addressed

- Original and renewal documents attached to the same policy are composed in effective-date order. Insurer, number and explicitly identified insured person must match; ambiguous or conflicting identities require clarification. Composition does not scan other customers or automatically merge separate policies.
- Renewal silence preserves earlier benefits. Only an explicit, sourced change with full wording replaces/removes its matching benefit. Conflicting terms retain both values and their sources. Missing periods, missing originals and incomplete amendments remain visible issues, not inferred lapses or invented terms.
- Document periods are separate from activation. A renewal is never treated as payment confirmation. Benefits use the shared lifecycle resolver against their documented period; existing gap rules and the policy's main lifecycle are not rewritten by benefit composition.
- Beneficiaries, cost, limits, frequency, network, waiting, conditions, dependencies and procedure have typed evidence. Check-up and diagnostic cover remain distinct. Insurance-year rules are not converted into calendar-year entitlements. A located quotation is not proof of eligibility.
- Extraction reuse keys include document hash and processing/configuration versions. The orchestrator uses the existing document gate, owner/actor consent and usage reservations. Additional documents are bounded to eight and processed sequentially, with partial failures retained as review states. Failed documents are not marked completed.
- Mixed text/scanned documents request multimodal reading with attention to weak pages. The validated PDF is supplied as a whole; this is not a separate page-cropping OCR engine. Quality metadata distinguishes text pages, pages requested for visual reading, model-reported read status, failures, unreported pages and truncation. A model's report is not measured OCR accuracy.
- Independent verification extends to consequential benefit terms. A configured and authorized second provider can check them; unavailable verification and disagreements require review. Its output does not replace extracted facts, decide gaps or confirm entitlement.
- Read-time document membership/hash checks prevent withdrawn or changed source documents from continuing to support a current composition. Deleting a source removes composed copies from the policy and archived runs. Storage deletion happens before record deletion; a storage failure keeps the record reachable. This change addresses the new composition artifacts, not a retrospective cleanup of every legacy raw extraction field.
- Progress and period-based usage are distinct owner-only records, validated with Zod and the shared policy-access path. Forged sources, periods and policy ownership are rejected. Known use dates must fit the documented period and cannot be in the future. A completed phone call does not become a used check-up.
- Export and erasure include the added data. New tables have RLS and cascading ownership keys. Optional health-related records retain explicit consent requirements and are not automatically shared with an insurer.
- An explicit new insurance-period check-up reminder cancels the old yearly sender in the same transaction, preserving delivery history. The legacy action cannot recreate a competing sender. Conditional claims and stable delivery identities protect concurrent retries. Old calendar-year records are retained without assigning them to guessed insurance periods.

## UI/UX improvements — separate from launch gates

- The next step is chosen deterministically: an existing planned step, a clarification blocking a selected goal, a relevant benefit, then an optional general action. Completed, deferred and dismissed actions do not automatically return. Material source changes request review on the relevant card.
- Each step explains why it appears, what is known and what needs confirmation. Optional questions record knowledge of the procedure, a barrier, a planned date and usefulness. Assistance changes with the barrier; reminders require their own explicit choice.
- A separate usage control selects a documented insurance period and records self-reported use, with an optional known date. Both views share stable identity and progress. Only periods supported by documents are offered; the missing 2025–2026 period in the reference pair is not fabricated.
- Terms, per-field sources, conflicting values and special conditions open progressively. Unknown page numbers link to the document without inventing a page. Basic extraction with a document and extraction timestamp has valid provenance even without a deep-analysis run ID.
- Greek/English content, keyboard operation and mobile controls follow the existing visual system. No clinical score, examination schedule, forced onboarding or automatic health-answer sharing was added.
- Owner review follow-up: action-reference links (NHTSA, NICE, WHO, CISA and other authored sources) are no longer rendered on general prevention/preparation cards in either language or view. The reference catalogue remains internal; source-document links for insurance benefits remain visible.

## Development verification

| Check | Observed result |
|---|---|
| Additive migration | `20261002160000_prevention_personalization` applied with `prisma migrate deploy`; 88 migrations up to date |
| Actual dev schema query | Three prevention tables, RLS enabled on all; 34 columns and five cascading foreign keys, [recorded result](../evidence/prevention-personalization/dev-schema.json) |
| Unit suite | 7,817 tests passed across 686 files; includes composition, identity ambiguity, source changes, conflict handling, independent verification, consent/quota paths, ownership, erasure, period usage and reminder concurrency |
| Required checks | API inventory 116/116; lint, changed-string i18n, UTF-8, strict type-check and migration verification passed |
| Production build check | Standard Next/Turbopack build passed; no deployment performed |
| New browser journeys | Six distinct functional cases passed across corrected/targeted runs: layouts at 320/390/430/1280px; persistent planning, view changes and period-specific use; English and keyboard operation |
| Final reviewer regression | 390px and 1280px journeys passed with assertions for unknown pages and basic-extraction provenance |
| Embedded browser | Existing policyholder account successfully renders `/wellness`; no synthetic policies inserted into that account |

The browser fixtures are explicitly synthetic and cleaned from the development E2E account. Initial failures exposed test assumptions about labels, selectors and asynchronous persistence, plus overlapping test/build load on the small dev session pool. The corrected journeys wait for the server-action success before reloading and run with one worker. The standard build initially encountered a cached sandbox port error; moving only the Turbopack build cache and rebuilding resolved it. No product guard was disabled.

Design finish disposition: **ship** for the reviewed surface. Three findings resolved: invented page-1 links, conflict-side-stripe presentation and false basic-extraction provenance warning. No remaining design finding is deferred. [390px top](../evidence/prevention-personalization/top-390.png), [390px controls](../evidence/prevention-personalization/form-390.png), [390px conflict](../evidence/prevention-personalization/conflict-390.png), [desktop](../evidence/prevention-personalization/top-1280.png).

## PDF evidence and remaining release validation

The local, read-only corpus probe completed for **19 PDFs / 592 pages**, finding **9/9 authored reference spans**. Seven documents require visual reading. This made zero model calls and measures local readability/reference matching, not extraction recall.

The original/renewal pair now has [11 independently checked expected results](../evidence/prevention-personalization/pair-expectations.json), with page references for distinct check-up/€2,000 diagnostics, insurance-year frequency, prenatal exclusivity, referral/procedure rules, special conditions and exceptions, missing 2025–2026 evidence, conditional payment and incomplete amendments. These are benchmark expectations, not a successful model result.

`scripts/benchmark-prevention-live.ts` is prepared to run through the authorized ingestion/orchestrator paths in dev. It verifies consent, supports duplicate retry and records private full results outside the repository, with non-personal aggregate measurements for evidence. A second provider is an explicit runner argument, never an automatic default. Await the pending authorization before invoking it on these PDFs. Subsequent work must record misses/inventions, latency and actual usage separately from unit-test success and extend model evaluation across the remaining corpus.

## Decisions taken

- Local/dev delivery only, following the latest request; standing production authority was not used.
- Conservative exact identity matching and same-policy document scope; uncertain matches stay unresolved rather than exposing or combining other policies.
- Additive storage and in-place sender handoff; no destructive conversion of calendar-year history.
- Deterministic personalization and authored content; no additional model calls when a page opens.
- No fabricated extraction results in the review account. Its legacy motor analysis honestly says that benefits were not identified until an explicit authorized reprocessing run supplies evidence.

## Reproduce and continue

Use Node 24.21.0 and the dev environment. Apply with `prisma migrate deploy`, then run `npm run verify:migrations` and `scripts/verify-prevention-pilot.ts`. Run the required repository guardrails, `npx vitest --run tests/unit`, `npm run build`, and `npx playwright test tests/prevention-personalization.spec.ts --project=chromium --workers=1`. Existing pilot regression coverage remains in `tests/prevention-hub.spec.ts` and `tests/measure/wellness-prevention.spec.ts`.

Before any commit/push: `audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, `verify:migrations`, unit/build and relevant journeys. Disable `PREVENTION_PERSONALIZATION_ENABLED` to return to the previous pilot behavior; additive records remain available for export/erasure. No production promotion is part of this delivery.
