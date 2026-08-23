# BASELINE — overlays — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` + `tests/measure/overlays-baseline.spec.ts` (paid only).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure overlays-baseline`

3 of SURFACES.md's 7 overlays captured: Batch Upload Modal, Delete Policy Dialog, Change Password
Modal. All three, plus every other T-015 surface's captures, use `main#main-content` as the
readiness selector and `minSections: 0` where the underlying page has no `.pw-page-shell`/`section[id]`.

## A genuine multi-minute stall, root-caused rather than worked around

The Delete Policy Dialog test initially could not find its trigger button at all
(`getByRole` → 0 matches), which manifested as what looked like a hang (repeated
actionability-wait retries with near-zero CPU) rather than a clean failure. Traced to source: the
button lives inside the "documents" `PolicySection` — one of six accordion sections the Goal 2
restructure introduced on `/wallet/[id]`, **all closed by default**, and `PolicySection` **unmounts
its children when closed** ("Unmounted when closed, not hidden" — the component's own comment). The
button is not hidden, it does not exist in the DOM until the section is opened. Fixed by clicking
`#documents button` (the accordion header) before looking for the delete trigger — see
`wallet-detail/BASELINE.md`'s "CORRECTION 2" for the much larger consequence this has for that
surface's own baseline numbers.

## 0a. Metric table

| overlay | width | scrollHeight* | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|
| Batch Upload Modal (on `/wallet`) | 320 | 5703 | 12 | 149/3 | 87 | 0 | 41 | 9 | 0 |
| Batch Upload Modal | 390 | 5580 | 12 | 149/3 | 87 | 0 | 40 | 2 | 0 |
| Batch Upload Modal | 430 | 5513 | 12 | 149/3 | 87 | 0 | 42 | 2 | 0 |
| Delete Policy Dialog (on `/wallet/[id]`, documents section expanded) | 320 | 6596 | 1 | 19/4 | 1 | **1** | 4 | 1 | 1 |
| Delete Policy Dialog | 390 | 5890 | 1 | 23/5 | 1 | **1** | 6 | 1 | 1 |
| Delete Policy Dialog | 430 | 5544 | 1 | 24/5 | 1 | **1** | 6 | 1 | 1 |
| Change Password Modal (on `/account/security`) | 320 | 1552 | 2 | 23/3 | 1 | 0 | 12 | 1 | 0 |
| Change Password Modal | 390 | 1434 | 2 | 23/3 | 1 | 0 | 13 | 1 | 0 |
| Change Password Modal | 430 | 1434 | 2 | 23/3 | 1 | 0 | 13 | 1 | 0 |

*`scrollHeight` measures the WHOLE document (background page + overlay), not the modal alone — the
background page's own content and defects (e.g. the wallet list's 87 sub-44 row-action buttons, see
`wallet-list/BASELINE.md`'s W1) are still counted, since a modal overlays rather than replaces the
DOM. Where a row shows the SAME count as that surface's own baseline (Batch Upload Modal's 87 sub-44
== `wallet-list`'s 87), the finding belongs to the BACKGROUND page, not the modal — read each modal's
own contribution from the delta, not the raw number.

## 0b. Confirmed findings — the modals' OWN content

### Delete Policy Dialog — a genuine WCAG 1.4.3 text-contrast failure on a destructive-action warning
*"Η ενέργεια είναι οριστική"* ("This action is final") renders at **3.12:1 against a 4.5:1
requirement** (`fg=#ffe2e2 bg=#fb2c36`, light pink text on a red background) — the one sentence
whose entire job is to slow a reader down before they delete a policy and its documents is itself
hard to read. Also: one unlabelled icon button at 22×44 (width fails; no accessible text found by
the probe, likely a close "×" button).

### Delete Policy Dialog — fixture-noise leak (not a product defect)
`"E2E Policyholder"` flagged as an "E2E fixture identifier" — this is the insured person's name on
the fixture data, a false positive of the leak probe's pattern, not a real leak.

### Change Password Modal — one sub-44 target
«Κλείσιμο» (Close) button at 36×44 — width fails by 8px, consistent with the same close-button
pattern seen elsewhere in this run (`wallet-add/BASELINE.md`'s «Πίσω» button, also 36-wide).

### Both dialogs measure a substantial rise in 1.4.11 findings over their host page
Change Password Modal: 12-13 findings vs. `account-settings/BASELINE.md`'s `security` route's own 5
— the modal's own form controls (inputs, save/cancel buttons) add roughly 7-8 new boundary failures
on top of the page underneath.

## Not captured in this pass
- **AI Consent Modal** — the fixture accounts already hold `aiProcessingConsentVersion` from prior
  specs; the trigger condition (first-time consent) cannot fire without a fresh, never-consented
  account (same limitation noted in `wallet-add/BASELINE.md`).
- **Policy Comparison Dialog** — requires selecting exactly two policies via the wallet's selection
  UI; not scripted in this pass.
- **Coverage Limit Modal** — requires driving the add-policy flow to the plan's exact policy cap;
  not scripted in this pass (also noted in `wallet-add/BASELINE.md`).
- **Confirm Dialog (generic)** — SURFACES.md lists this as reused across profile/security/privacy/plan
  for destructive actions (password reset, data export, etc.); not captured as its own baseline —
  only the Change Password Modal, one specific instance, was.
- Free tier — none of the three captured overlays were re-measured on the free account in this pass.
