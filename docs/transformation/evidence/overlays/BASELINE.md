# BASELINE — overlays — T-015 + T-016b, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` + `tests/measure/overlays-baseline.spec.ts` (T-015, paid only) + `tests/measure/overlays-consent-limit-compare-confirm-baseline.spec.ts` (T-016b, paid only).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure overlays-baseline` / `--project=measure overlays-consent-limit-compare-confirm-baseline`

**All 7 of SURFACES.md's overlays are now captured.** T-015 got three: Batch Upload Modal, Delete
Policy Dialog, Change Password Modal. T-016b closes the remaining four: AI Consent Modal, Coverage
Limit Modal, Policy Comparison Dialog, and a generic instance of the shared `ConfirmDialog` (distinct
from Delete Policy Dialog and Change Password Modal, NEITHER of which is actually built on
`ConfirmDialog.tsx` — confirmed by reading both call sites; Delete Policy Dialog is its own
component and Change Password Modal is `ChangePasswordModal`). All captures, across both passes, use
`main#main-content` as the readiness selector and `minSections: 0` where the underlying page has no
`.pw-page-shell`/`section[id]`.

## T-016b: none of the "not captured" reasons T-015 recorded held up

- **AI Consent Modal** — T-015 assumed every fixture account already carries
  `aiProcessingConsentVersion`. Fixed the same way `wallet-edit-and-agent-noadvisor-baseline.spec.ts`
  handles the paid account's pre-existing `CustomerRelationship`: flip the one gating column to
  `null` for a single capture, restore it in `finally`. The modal opens on SUBMIT from
  `/wallet/add`, purely client-side (`handleSubmit`'s `!aiConsent` branch runs before any network
  call), so this needed a file selected in the browser's file input but never touched Supabase
  storage.
- **Coverage Limit Modal** — T-015 assumed this "requires driving the add-policy flow to the plan's
  exact policy cap". Checked directly: `e2e-ph@policywallet.test` is on `ph-pro` (25-policy cap) and
  already carries **29** policies — every fixture matrix in this run (`provisionMatrixFixtures`)
  writes via `db.policy.create` directly, which never calls `canUserAddPolicy`, so the account has
  been over its own plan's cap for the whole of this evidence run without anything checking. The
  very next REAL submission through the UI hits `POLICY_LIMIT_REACHED` immediately — no DB fixture
  change needed, just a real file upload to local-dev Supabase storage (the account already has AI
  consent for this capture, so it skips the consent modal and reaches `createPolicy` directly).
- **Policy Comparison Dialog** — T-015 assumed this "requires selecting exactly two policies via the
  wallet's selection UI". Reading `PolicyComparison.tsx`: the trigger button on `/wallet` opens the
  dialog with ZERO pre-selection — the "selection UI" IS the dialog's own first screen (a card grid,
  `onClick={() => toggleSelect(policy.id)}`), not a wallet-list checkbox flow. `pro` already has
  `analysisComparison: true`, and the fixture matrix's motor-active + motor-expiring are both
  in-force motor policies, so `hasComparablePolicies` was already true. Captured BOTH states: the
  picker (0 selected) and the actual comparison table (2 selected).
- **Confirm Dialog (generic)** — captured via `/account/security`'s "sign out everywhere" trigger, a
  DESTRUCTIVE instance distinct from both dialogs above. Always CANCELLED, never confirmed —
  confirming would have signed out the very session running this suite.

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
| AI Consent Modal (on `/wallet/add`, no prior consent) | 320 | 1652 | 0 | 21/3 | 1 | 0 | 8 | 2 | 0 |
| AI Consent Modal | 390 | 1552 | 0 | 23/3 | 1 | 0 | 8 | 2 | 0 |
| AI Consent Modal | 430 | 1504 | 0 | 25/3 | 1 | 0 | 8 | 3 | 0 |
| Coverage Limit Modal (on `/wallet/add`, real `POLICY_LIMIT_REACHED`) | 320 | 1652 | 0 | 28/3 | 2 | 0 | 10 | 1 | 0 |
| Coverage Limit Modal | 390 | 1552 | 0 | 29/3 | 2 | 0 | 11 | 1 | 0 |
| Coverage Limit Modal | 430 | 1504 | 0 | 31/3 | 2 | 0 | 11 | 2 | 0 |
| Policy Comparison Dialog — picker, 0 selected (on `/wallet`) | 320 | 5703 | 12 | 197/3 | 88 | 0 | 65 | 46 | 1 |
| Policy Comparison Dialog — picker | 390 | 5580 | 12 | 197/3 | 88 | 0 | 65 | 3 | 1 |
| Policy Comparison Dialog — picker | 430 | 5513 | 12 | 197/3 | 88 | 0 | 66 | 3 | 1 |
| Policy Comparison Dialog — table, 2 selected | 320 | 5703 | 12 | 186/3 | 88 | 0 | 58 | 35 | 1 |
| Policy Comparison Dialog — table | 390 | 5580 | 12 | 186/3 | 88 | 0 | 58 | 3 | 1 |
| Policy Comparison Dialog — table | 430 | 5513 | 12 | 186/3 | 88 | 0 | 59 | 3 | 1 |
| Confirm Dialog — sign out everywhere (on `/account/security`) | 320 | 1552 | 1 | 16/3 | 0 | 0 | 5 | 2 | 0 |
| Confirm Dialog — sign out everywhere | 390 | 1434 | 1 | 18/3 | 0 | 0 | 8 | 1 | 0 |
| Confirm Dialog — sign out everywhere | 430 | 1434 | 1 | 19/3 | 0 | 0 | 8 | 1 | 0 |

*`scrollHeight` measures the WHOLE document (background page + overlay), not the modal alone — the
background page's own content and defects (e.g. the wallet list's 87 sub-44 row-action buttons, see
`wallet-list/BASELINE.md`'s W1) are still counted, since a modal overlays rather than replaces the
DOM. Where a row shows the SAME count as that surface's own baseline (Batch Upload Modal's 87 sub-44
== `wallet-list`'s 87), the finding belongs to the BACKGROUND page, not the modal — read each modal's
own contribution from the delta, not the raw number.

The Policy Comparison Dialog rows are the highest `scrollHeight`/containers/sub-44/truncation of any
overlay measured in this run BY FAR — but per the footnote above, that is `/wallet`'s OWN baseline
showing through (`wallet-list/BASELINE.md`'s 87 sub-44 row-action buttons, its 46/35 truncation
findings at 320px), not the dialog's own content. The dialog is a `fixed inset-0` overlay on top of
the full wallet list, so the whole list is still in the DOM and still counted. Selecting the second
policy (picker → table) drops containers 197→186 and 1.4.11 findings 65→58 — the picker's OWN grid of
selectable cards (now hidden) briefly added MORE controls than the resulting comparison table does.

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

### Coverage Limit Modal — a PRO subscriber is told they are on the FREE plan
`e2e-ph@policywallet.test` is confirmed on `ph-pro` (Family, €8.99/mo, 25-policy cap) — not free. The
modal rendered:

> «Έφτασες το όριο ασφαλιστηρίων του **δωρεάν** πλάνου. Αναβάθμισε για να οργανώσεις όλο το
> ασφαλιστικό σου χαρτοφυλάκιο σε ένα μέρος.» — **«Τρέχον πλάνο: FREE → PLUS»**

Two independent bugs, not one:
1. **The body copy is hardcoded, not tier-aware.** `lib/monetization/upgrade-copy.el.ts`'s
   `policy_upload_limit` entry's `body` string always says "δωρεάν πλάνου" (the free plan's limit) —
   there is no branch for a PAID account that has also exceeded its OWN higher cap. Every paid tier
   that can still hit this modal (the fixture account already has 29 policies against `pro`'s 25) sees
   copy that is simply false for them.
2. **The "Τρέχον πλάνο" badge itself resolves to `free`, not the account's real `pro` tier.**
   `UpgradeModal.tsx` initializes `useState<PlanTier>("free")` and only corrects it after an
   async `fetch("/api/v1/tokens/usage")` resolves — a fetch whose failure is silently swallowed
   (`.catch(() => {})`), leaving the free default standing with no visible error. **Re-tested with a
   4-second wait before capture (vs. this baseline's ~1.8s) — the badge STILL read "FREE".** This
   rules out a render race the reader would only see for a moment; the badge is durably wrong for
   this account. `/api/v1/tokens/usage` itself correctly derives `pro` from `resolveUserEntitlements`
   when queried directly — the break is somewhere between the modal's `fetch` and the state update,
   not the server logic. Not traced further into the fetch/response cycle in this pass.

Net effect: a paying Family-tier customer, already over even their own generous cap, is shown a
downgrade-shaped upsell ("FREE → PLUS", Plus being CHEAPER than the Pro plan they already hold) — the
worst possible framing for a limit-reached moment on a paid account. **Broken, not a preference** —
files under the "broken / insecure" backlog per CLAUDE.md's session-workflow rule, not UI/UX taste.

### Coverage Limit Modal — one sub-44 target and the same low-contrast purchase controls seen elsewhere
«Κλείσιμο» (Close) button at 36×44 (the same recurring close-button width seen on Change Password
Modal and `wallet-add/BASELINE.md`'s «Πίσω»). The monthly/annual toggle («Μηνιαία» 1.08:1) and the
primary purchase CTA («Συνέχεια με Plus — €8.99/μήνα» 1.12:1) both fail 1.4.11 — the SAME defect
class `remaining-surfaces/BASELINE.md` already recorded on the full `/upgrade` page (its own toggle
at 1.35:1, its "Αναβάθμιση" CTA at 1.18:1): this is not a page-specific bug, it is the shared
plan-picker UI failing boundary contrast everywhere it is embedded, including inside this modal.

### AI Consent Modal — no new defect in the modal's OWN two buttons
«Όχι τώρα» (Cancel) reads `[1.4.11:unmeasured]` (flat, no edge crossed — excluded from any gated
count) and «Συναινώ στην επεξεργασία με AI» (Accept, `.pw-primary-button`) was not flagged at all.
Every 1.4.11/tap-target finding on this capture belongs to the BACKGROUND `/wallet/add` form showing
through (the insurer `<select>`, the shell's «Πορτοφόλι» nav item, the «Πίσω» back button) — already
documented on `wallet-add/BASELINE.md`, not new here.

### Both AI Consent Modal and Coverage Limit Modal repeat the shell's "9+" badge overflow
`div.relative` containing the notification-count badge overflows (`scrollWidth 30 / clientWidth 24`)
at every width on both captures — the same shell element `wallet-edit/BASELINE.md` (T-016b) also
found overflowing on `/wallet/[id]/edit`. A shell-level defect visible on at least three unrelated
surfaces now, not particular to any one page.

### Confirm Dialog (sign-out-everywhere) — genuinely quiet: no sub-44, one shell-scoped finding
Zero sub-44 targets on the dialog's own two buttons. The one finding classifiable as the DIALOG's own
(`<button> "Ακύρωση"` at `[1.4.11:unmeasured]`, flat) is discarded by the metric's own design; the
rest (`"Αποσύνδεση"` sign-out buttons, password-reset link, activity/security section boundaries) are
the BACKGROUND `/account/security` page, already the subject of its own baseline. The `[1.4.11:shell]`
tag correctly applies here (unlike `wallet-edit`/`wallet/add` above) because `/account/security` DOES
render inside `.pw-page-shell`, so the classifier's root-scoping works as designed on this surface.

### Policy Comparison Dialog — fixture-noise leak (not a product defect), both states
`"E2E-MOT-001"` (a fixture policy number) flagged as an "E2E fixture identifier" in both the picker
and the table — the same class of false positive `agent-view/BASELINE.md` already recorded for the
identical string.

### Both dialogs measure a substantial rise in 1.4.11 findings over their host page
Change Password Modal: 12-13 findings vs. `account-settings/BASELINE.md`'s `security` route's own 5
— the modal's own form controls (inputs, save/cancel buttons) add roughly 7-8 new boundary failures
on top of the page underneath.

## Not captured in this pass (T-016b)

All 7 overlays SURFACES.md lists are now captured. What remains outstanding:

- **Free tier** — none of the seven captured overlays (T-015's three or T-016b's four) were
  re-measured on the free account. Two of T-016b's four are tier-relevant by construction (Coverage
  Limit Modal's copy/badge bug is specific to a PAID account exceeding its cap; a free-tier capture
  would show the — correctly labelled — free-plan version of the same modal) and would need their own
  pass.
- **Confirm Dialog** — SURFACES.md lists this as reused across profile/security/privacy/plan for
  destructive actions (password reset, data export, plan cancellation, account deletion, etc.). Only
  ONE instance (sign-out-everywhere) was captured as this baseline's representative of the shared
  component; the other call sites (`ProfileSection`, `PrivacySection`, `PlanSection`,
  `CustomerProfileClient`, `QuestionnairesClient`, `AgentClient`) render the same component with
  different title/description/consequences copy, not captured individually.
- **Coverage Limit Modal root cause** — the tier-badge bug above is confirmed reproducible (survives
  a 4-second wait) but not traced past "the fetch or its state update never lands"; `UpgradeModal.tsx`'s
  `fetch("/api/v1/tokens/usage").catch(() => {})` silently swallows whatever is actually failing.

---

## Note on this document's editing history

A second, shorter pass briefly existed appended below this line — written concurrently by another
session against the same fixture data (its raw sub-44 counts per overlay — 1/2/0/88/88 — match this
document's exactly, so it read the SAME captures, not a different run). Consolidated back into the
sections above rather than left standing separately, for two reasons: it reported `truncation` and
`leaks` as 0 for every overlay, which the 0a table above and 0b's confirmed findings show is not
so (e.g. the shared "9+" badge overflow on `ai-consent-modal`/`coverage-limit-modal`, the
`E2E-MOT-001` fixture-noise leak on both `policy-comparison-*` captures) — and its closing line
("Six of seven overlays... that is in fact seven distinct captures") contradicted itself. Its one
genuinely useful idea — separating an overlay's OWN sub-44 contribution from the RAW count, which
mostly belongs to the host page underneath — is preserved below rather than lost.

### Sub-44 targets: overlay's own contribution vs. the host page showing through

| overlay | sub-44 (raw, whole page) | sub-44 belonging to the overlay itself |
|---|---|---|
| AI Consent Modal | 1 | 0 — the 1 raw hit is `/wallet/add`'s own «Πίσω» button |
| Coverage Limit Modal | 2 | 1 — «Κλείσιμο» (36×44); the other raw hit is the same «Πίσω» |
| Confirm Dialog (sign-out-everywhere) | 0 | 0 |
| Policy Comparison Dialog (picker or table) | 88 | 0 — all 88 are `/wallet`'s own row-action buttons, **W1** in `wallet-list/BASELINE.md` (three 36×44 quick-action buttons × 29 rows); reproduced exactly here as an independent confirmation of W1, not a new defect. **Do not double-count these 88 against the overlay** — they are one defect on one surface (`/wallet`), not one defect per surface it happens to render underneath.
| Delete Policy Dialog | 1 | 1 — its own unlabelled icon button, 22×44 |
| Change Password Modal | 1 | 1 — its own «Κλείσιμο», 36×44 |
| Batch Upload Modal | 87 | 0 — all 87 are the SAME `wallet-list` W1 buttons as above |

**All 7 of SURFACES.md's catalogued overlays now have a baseline** (8 captures total — Policy
Comparison contributes both the picker and the table state).
