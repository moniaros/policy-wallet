# Prevention & benefits — local/dev pilot, 2026-10-02

## Scope and rollout

The approved prevention plan is implemented as a local/dev pilot at `/wellness`, preserving that URL. `PREVENTION_HUB_ENABLED=1` enables the new hub; its checked-in default is off. Local `EXTRACTION_CITATIONS=1` enables per-benefit citation requests on subsequent explicit processing. No production deployment, production migration, pricing change or external customer communication was performed. Earlier home/intake/notifications work remains in the working tree; its separate evidence is in `policyholder-mobile-ux-2026-10-02.md`.

## Broken / trust and privacy issues addressed

- Benefits are read across all branches. A motor policy can supply a health benefit without changing the document's branch. Beneficiaries, cost, frequency, limits, network, conditions, waiting and provider details remain separate per policy and are not inferred when absent.
- Indexed benefit citations are bounded and sanitised. Model-provided `verified` flags and invented document/run identities cannot establish provenance. A replacement perk array cannot inherit the previous array's index-based evidence. The deep pipeline persists trusted extraction perks rather than clarity-generated replacements; basic extraction now also persists its benefits and actual source document, without inventing a deep-analysis run.
- Expired/cancelled benefits are historical and have no active progress action. Missing extraction is visibly unknown. A quote located in the PDF is explicitly not proof of eligibility. Explicit discount wording overrides a free-service model tag; unlocated free claims remain unresolved.
- Unsupported health scores are retired from active generation, display and sharing, including the legacy flag-off screen and old advisor snapshots. Historical rows remain exportable/deletable. The old pure scoring helper remains only for archive interpretation/tests; an enumerating guard with a committed red probe prevents new runtime scoring/writes.
- Progress and optional factual health answers use the authenticated owner, strict inputs and the existing policy-access path. Health records require explicit separate consent. No new answer is automatically copied to the health profile or advisor shares.
- Export and erasure cover both new tables. The prevention deletion control removes new progress/check-ins, old assessments/benefit usage and old share snapshots; the dialog names this scope. Both new tables have RLS and cascading ownership keys.
- Reminders require a chosen date. The existing daily health opt-in remains separately controllable and is never broadened to other domains. Legacy yearly check-up records remain canonical: no copy migration or second emitter. New reminders check owner, lifecycle, source version and health consent; concurrent claims and stable dispatch identities suppress duplicates.

## UI/UX changes — separate from launch gates

- One achievable next step precedes source-backed benefits, then optional general actions and health questions. No mandatory daily questionnaire or streaks.
- Primary grouping is by existing life domains; secondary grouping is by policy. A multi-domain benefit appears once in the unfiltered list, stays discoverable through each relevant filter, and retains the same progress identity in both views.
- Cards distinguish policy benefit, general prevention and incident preparation. Terms/evidence and personal actions use separate native disclosures. The source link opens the existing authorised document route; original-language excerpts remain quotations.
- Actions offer planned/completed/later/not-relevant states, optional reminder date, barriers and usefulness. Completion is labelled self-reported. Changed source revisions request review.
- Greek and English copy, mobile layouts and keyboard disclosures are implemented within the incumbent design system. `DESIGN.md` records the evidence disclosure pattern; local Impeccable surface/sidecar artifacts are under the already-ignored `.impeccable/` directory.

## Data and implementation decisions

`PreventionProgress` stores a stable semantic item key plus an independent source revision, current state, first-action/completion timestamps, barrier/usefulness and explicit reminder. `PreventionCheckIn` stores versioned consent and optional factual answers. These are personal activity records, not diagnoses or provider-confirmed benefit use. Progress timestamps and feedback support pilot reporting; no disease, claim or premium-reduction metric is claimed.

The authored action catalogue links to WHO, NICE, NHTSA, CISA and London Fire Brigade sources. It supplies general small actions, not model-authored medical or insurance recommendations. Model work runs only through existing explicit extraction/analysis paths and consent/document gates. Extraction reuse was version-bumped for the new benefit-evidence contract; there is no model call on page opening and no automatic portfolio-wide reprocessing.

Schema rollout used additive migration `20261002120000_prevention_hub` via `prisma migrate deploy`, on dev only. Existing reminders were adapted in place instead of copied because copying would create a duplicate-delivery risk. Prior unrelated work was preserved. The Next-generated agent guidance block was mirrored into CLAUDE.md without replacing pre-existing differences.

## Verification evidence

- Unit suite: **7,790 passed / 684 files** (`npx vitest --run tests/unit`, Node 24.21.0).
- Guardrails: API-auth inventory 116/116, lint, changed-string i18n, UTF-8 and strict type-check passed. `verify:migrations`: **87 migrations, up to date**.
- Actual dev schema query: project `lzqvtvjggylcujenlelh`; `prevention_progress` and `prevention_check_ins` present, RLS true on both, **20 combined columns and 3 cascading foreign keys**. Reproducible with `scripts/verify-prevention-pilot.ts`.
- Standard Next 16 Turbopack production build passed, including TypeScript and 335 static pages. This was a build check, not a production deployment.
- Browser evidence: **7 distinct functional cases passed**, plus auth setup, across the full run and the corrected targeted rerun (3/3). `tests/prevention-hub.spec.ts` covers 320/390/1280px, source/discount copy, both views, explicit health consent, persisted completion/clear, English/keyboard and filtered next-step destination. `tests/measure/wellness-prevention.spec.ts` covers canonical legacy reminder continuity and absence of a new duplicate progress row. Fixtures are explicitly synthetic and are cleaned from the development E2E account.
- The initial domain-filter test had two incorrect test assumptions (label lookup selected the view group; it then assumed every portfolio's next step must be a generic action). These were corrected to assert the actual contract: the destination is visible and the filtered-out health benefit is absent.
- Design finish review disposition: **ship**. Four findings resolved: filtered destination, heading hierarchy, readable functional labels and view-switch selected state. Static detector ran once with `[]`. Settled screenshots: `../evidence/prevention-hub/mobile-390.png`, `../evidence/prevention-hub/desktop-1280.png`.

## Supplied PDF corpus — measured limits

All **19 PDFs / 592 pages** passed local PDF reading; **9 independently authored page-reference spans were found, 9/9**. Seven files have image-only or weak opening text and need vision-assisted review: samples 06, 09, 11, 12, 13, 14 and 18. Reports store sample IDs/hashes and non-personal source fragments; originals and private filename mapping stay outside the repository.

Manual evidence highlights: the motor document mentions preferential health services, not a demonstrated free blood-test entitlement; the one-page health poster is marketing, not a policy; group diagnostic rates are discounts; some check-up mentions are exclusions; adult and child contracts have different conditions; prevention duties and salvage indemnities are not service perks. These distinctions informed the prompt and synthetic cases.

**This is not a live model/OCR accuracy benchmark.** The corpus run made zero model calls. Source-span location measures quotation matching, not extraction completeness or eligibility. Full model recall/precision, targeted reprocessing of old user analyses, comparative processing cost/latency and a timed user benefit-use study remain release-validation work. No model accuracy percentage or savings claim is published. The pilot user's older motor analysis still shows “not identified” until explicitly reprocessed; synthetic E2E benefits were not inserted into that user's wallet.

## Reproduce

Use Node 24.21.0, dev DB and the two local flags above. Run migrations with `prisma migrate deploy`, then `npm run verify:migrations` and the schema verifier. Run unit tests and build. Run `npx playwright test tests/prevention-hub.spec.ts tests/measure/wellness-prevention.spec.ts --project=chromium --project=measure --workers=1`. Run `node --import tsx scripts/benchmark-prevention-documents.ts <private-PDF-directory>` for the local corpus probe.

Before commits/pushes, run `audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, `verify:migrations`, unit/build and relevant journeys. Disable the pilot flag to return to the existing benefits screen; the score retirement remains in force.
