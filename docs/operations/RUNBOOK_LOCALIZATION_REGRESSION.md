# Localization Regression Runbook

## Trigger Conditions
1. Greek runtime surfaces show untranslated or hardcoded copy.
2. Translation parity/unit checks fail in CI.
3. Support reports broken locale rendering or mojibake in production.

## Immediate Actions (0-15 min)
1. Confirm affected surfaces and language scope (`el`, `en`, or both).
2. Validate latest CI results for:
3. `lint:i18n-changed`
4. translation parity tests
5. UTF-8 checks
6. Capture screenshots and exact route/component references.

## Containment (15-60 min)
1. Hotfix missing translation keys in `lib/i18n/translations/en.ts` and `lib/i18n/translations/el.ts`.
2. Replace any newly introduced hardcoded strings with translation keys.
3. If mojibake is present, normalize content path and verify runtime rendering.

## Recovery Validation
1. Greek and English parity tests pass.
2. Wallet + AI runtime smoke routes render correct localized copy.
3. No raw backend/provider errors are surfaced directly in user-facing UI.

## Evidence
1. Before/after screenshots (Greek + English).
2. CI run links with passing localization checks.
3. Changed file list and translation keys added.
4. Sign-off from product/localization owner.
