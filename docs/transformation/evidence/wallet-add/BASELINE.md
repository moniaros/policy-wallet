# BASELINE — upload flow `/wallet/add` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/wallet/add` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/wallet-add-baseline.spec.ts` (paid) + `tests/measure/wallet-add-free.spec.ts` (free).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure wallet-add-baseline` / `--project=measure-free wallet-add-free`

`AddPolicyClient.tsx` has neither `.pw-page-shell` nor `section[id]` (same shape as `/agent`) —
captured with `minSections: 0`, per the fix documented in `agent-view/BASELINE.md`.

## 0a. Metric table — landing state only (no file selected, no modal open)

Paid and free renders are **byte-identical** in every metric (this landing screen has no tier-gated
content until a limit is actually hit):

| tier | width | scrollHeight | screens | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|
| paid | 320 | 1566 | 2.2 | 24/4 | 1 | 0 | 2 | 2 | 0 |
| paid | 390 | 1466 | 1.7 | 24/4 | 1 | 0 | 3 | 2 | 0 |
| paid | 430 | 1418 | 1.5 | 24/4 | 1 | 0 | 3 | 2 | 0 |
| free | 320 | 1566 | 2.2 | 24/4 | 1 | 0 | 2 | 2 | 0 |
| free | 390 | 1466 | 1.7 | 24/4 | 1 | 0 | 3 | 2 | 0 |
| free | 430 | 1418 | 1.5 | 24/4 | 1 | 0 | 3 | 2 | 0 |

## 0b. Confirmed findings

- **«Πίσω» (Back) button, 36×44** — width fails by 8px, every width, both tiers.
- **The upload dropzone card overflows its own box**: `div.bg-card.rounded-3xl` at 350/286px
  (`scrollWidth`/`clientWidth`) — the "Μεταφόρτωση εγγράφου... Πατήστε για μεταφόρτωση PDF ή σύρετε
  τα αρχεία σας εδώ" copy block does not fit the card meant to contain it.
- **1.4.11 control failures**: the policy-type `<select>` («Επιλέξτε τύπο» — Car/Motorcycle/…),
  1.24:1; the «Πορτοφόλι» (Wallet) breadcrumb/nav link, 1.25:1.

## Not captured in this pass
- **Coverage Limit Modal** — the overlay that fires when adding would exceed the plan's policy cap.
  Requires driving the add-policy form interactively to the limit (uploading/creating policies until
  the cap is hit), not attempted here. This is the one overlay from SURFACES.md's list of 7 that
  neither this document nor `overlays/BASELINE.md` captures.
- **AI Consent Modal mid-upload** — the fixture accounts already hold `aiProcessingConsentVersion`
  from prior specs, so the trigger condition (first-time consent) cannot fire without a fresh,
  never-consented account.
- **The actual upload interaction** — a real file selected and submitted, the extraction-in-progress
  state, and the post-upload redirect to `/wallet`. Only the pre-interaction landing state was
  measured.
- **`/wallet/[id]/edit`** — SURFACES.md groups this with the upload flow ("upload flow `/wallet/add`,
  `/wallet/[id]/edit`" per `LEDGER.md`'s own surface list), but it was not captured in this pass;
  worth a follow-up baseline of its own.
