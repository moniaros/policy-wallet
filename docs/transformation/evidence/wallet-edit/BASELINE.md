# BASELINE — `/wallet/[id]/edit` — T-016b, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/wallet/[id]/edit` (authenticated
policyholder, manual policy-detail correction form — `EditPolicyForm.tsx`) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/wallet-edit-and-agent-noadvisor-baseline.spec.ts` (paid, `motor-active` fixture).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure wallet-edit-and-agent-noadvisor-baseline`

Never captured by any prior pass (T-015's B2C surface inventory did not include it). This is the
form a customer lands on to correct an extracted value the wallet could not read — CLAUDE.md's own
description of why the surface is not optional to measure. `minSections: 0` — `EditPolicyForm.tsx`
has neither `.pw-page-shell` nor `section[id]`, same convention gap `/wallet/add` and `/agent`
already established.

## 0a. Metric table — 1 fixture (`motor-active`) × 3 widths, paid

| width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|
| 320 | 1065 | 1.5 | 0 | 17/3 | 1 | 0 | 2 | 3 | 0 |
| 390 | 1045 | 1.2 | 0 | 17/3 | 1 | 0 | 2 | 1 | 0 |
| 430 | 1076 | 1.2 | 0 | 17/3 | 1 | 0 | 2 | 1 | 0 |

The form itself: insurer name, policy number, line-of-business select, start/end date, premium
amount, and the free-text coverage summary — exactly the fields CLAUDE.md's `unreadable-value.ts`
guard describes a customer correcting.

## 0b. Confirmed findings

### Sub-44 tap target: «Πίσω» (Back) link, 35-36×36px at all three widths
The SAME pattern already documented on `wallet-add/BASELINE.md` (its own «Πίσω» button, also
36px-wide) — a recurring back-link sizing, not unique to this page.

### 1.4.11 non-text contrast — 2 findings, one genuine, one a harness artifact of the missing page shell
- `<a> "Πορτοφόλι"` (the SHELL's wallet nav item) measures **1.24-1.25:1 against a 3:1 requirement**
  at all three widths. This SHOULD be classified `shell` (reported, not gated) the way every other
  surface's shell nav items are — but the classifier scopes `shell` vs `control` by testing whether
  the element falls inside `.pw-page-shell`, and this page has none, so its `root` fallback
  (`document.body`) swallows the WHOLE page including the shell, and the nav item is mis-tagged
  `control`. The underlying number is real (and consistent with the shell nav's contrast already
  being a known, reported-not-gated issue elsewhere in this run), but this page's OWN capture cannot
  be used to gate on it without inheriting the shell's contrast, which is out of this surface's
  scope. Recorded as a harness classification gap for any page lacking `.pw-page-shell`, not a new
  per-page defect.
- `<button> "Ακύρωση"` (Cancel) reads `[1.4.11:unmeasured]` — inside and outside sampled identical
  (`#ffffff`/`#ffffff`), meaning the probe crossed no visible edge. Excluded from any gated count by
  the metric's own design (`nonTextContrastFailures`'s `flat` branch).

### Truncation — genuine, narrowest width only
At **320px**, `#startDate` and `#endDate` (`input.pw-input.pw-input-sm`) overflow horizontally
(`scrollWidth 154 / clientWidth 134`) — the date-picker's native rendering does not fit the input box
at the narrowest measured width. Gone by 390px. Also present at all three widths: a `div.relative`
containing the shell's "9+" notification-count badge overflows (`scrollWidth 30 / clientWidth 24`) —
a shell element, not this page's own content.

### Harness limitation, not a page defect: the duplicate-fact value scan cannot see form INPUTS
`duplicateFacts`'s value scan (`metrics.ts`) matches a fact value against visible text NODES —
`el.childNodes` filtered to `nodeType === 3`. An `<input value="ΣΥΜΒ-2025-MOT-ACT">`'s value is a DOM
*property*, not a text node, so the policy-number fact supplied to this capture
(`policy.policyNumber: "ΣΥΜΒ-2025-MOT-ACT"`) was never actually checked against this page — the
`duplicateFactCount: 0` this page reports is "not found by this probe", not "confirmed absent". Any
future duplicate-fact guard on a form-heavy surface needs its own input-aware value read, not this
scan reused as-is.

## Not captured in this pass
- Only ONE fixture (`motor-active`) at each width — the other five matrix states (motor-expiring/
  -expired, health-active/-expiring/-expired) were not run through this form.
- Free tier — not measured (the edit form's write-access gate is ownership/grant-based, not a
  plan-tier feature, so a free-tier capture would likely be identical; not verified here).
- No submission was attempted — this baseline captures the form's INITIAL render only, not a
  validation-error or save-success state.
