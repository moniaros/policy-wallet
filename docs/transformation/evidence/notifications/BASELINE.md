# BASELINE — Ειδοποιήσεις `/notifications` — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/notifications` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` (shared definitions, imported verbatim — nothing redefined) +
`tests/measure/surface-harness.ts` (generic open/settle/measure/write, new for T-015) +
`tests/measure/notifications-baseline.spec.ts` (paid) + `tests/measure/notifications-free.spec.ts` (free).
Fixture helper reused unmodified from `tests/measure/dashboard-fixtures.ts`: `applyNotificationDuplicateFixture`
(already parametrised by owner email — no new fixture code needed for this surface).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure notifications-baseline` and `--project=measure-free notifications-free`
**Raw evidence:** `data/current/*.json` (12 captures), `screenshots/current/*.png` (full-page).

## Settle procedure (identical across every T-015 surface)

`goto(domcontentloaded)` → `waitForLoadState('networkidle')` capped at 8s (never fires locally — the
dummy Upstash host retries DNS forever) → fixed +1s → animations/transitions frozen → `nextjs-portal`
(Next.js dev-tools badge, not product UI) hidden → off-canvas drawer chrome excluded from every count
by the shared visibility filters in `metrics.ts`.

## States captured

| state | tier | account | what it is |
|---|---|---|---|
| `default` | paid | `e2e-ph@policywallet.test` | whatever notification history already exists on the shared, long-lived E2E account — not fabricated, a real lived-in history |
| `duplicated` | paid | same | + `applyNotificationDuplicateFixture` (2 channel-duplicated rows sharing one `dedupeKey`, 2 unkeyed rows for different events — the P1-04 fixture) |
| `default` | free | `e2e-ph-free@policywallet.test` | same, free-tier session |
| `duplicated` | free | same | same fixture applied to the free account |

Both tiers were captured (requirement 3). `data-fact`/`data-count` attribute scan **and** value scan
both recorded per the duplicate-facts result (requirement 1) — this surface has no single named "fact"
value repeated in the sense policy-detail does (a policy number, a date), so the value-scan list is
empty by construction; `repeatedStrings` (a separate, string-level probe) is the one that actually
caught the duplicate-content case below. 1.4.11 measured on every capture (requirement 2).

## 0a. Metric table — 12 captures

| capture | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | **1.4.11** | truncation | leaks | Latin/English |
|---|---|---|---|---|---|---|---|---|---|---|---|
| default-paid | 320 | 5002 | 6.9 | 3 | 55/2 | 0 | 0 | **24** | 19 | 4 | 2 |
| default-paid | 390 | 4382 | 5.2 | 3 | 55/2 | 0 | 0 | **24** | 7 | 4 | 2 |
| default-paid | 430 | 4102 | 4.4 | 3 | 55/2 | 0 | 0 | **24** | 7 | 4 | 2 |
| duplicated-paid | 320 | 5102 | 7.1 | 3 | 55/2 | 0 | 0 | **24** | 21 | 4 | 2 |
| duplicated-paid | 390 | 4522 | 5.4 | 3 | 55/2 | 0 | 0 | **24** | 7 | 4 | 2 |
| duplicated-paid | 430 | 4222 | 4.5 | 3 | 55/2 | 0 | 0 | **24** | 7 | 4 | 2 |
| default-free | 320 | 1422 | 2.0 | 3 | 15/2 | 0 | 0 | **4** | 4 | 1 | 0 |
| default-free | 390 | 1282 | 1.5 | 3 | 15/2 | 0 | 0 | **4** | 1 | 1 | 0 |
| default-free | 430 | 1262 | 1.4 | 3 | 15/2 | 0 | 0 | **4** | 1 | 1 | 0 |
| duplicated-free | 320 | 1422 | 2.0 | 3 | 15/2 | 0 | 0 | **4** | 4 | 1 | 0 |
| duplicated-free | 390 | 1282 | 1.5 | 3 | 15/2 | 0 | 0 | **4** | 1 | 1 | 0 |
| duplicated-free | 430 | 1262 | 1.4 | 3 | 15/2 | 0 | 0 | **4** | 1 | 1 | 0 |

Reading the table:
- **0 sub-44px tap targets, 0 text-contrast (1.4.3) failures** at every capture — this surface is
  clean on both.
- **1.4.11 is not zero.** 24 findings on the paid account (which simply has more notification rows —
  each row's channel badge/icon is a `[role]`-less `<div>` counted as a `surface`, not a `control`; the
  free account's 4 findings are the same shape at lower row count). Sampled findings are all
  `surface`-class boundary readings in the 1.2–1.4:1 range, the same systemic pattern already recorded
  for `/dashboard` (RESULT.md: "the shared secondary-control pattern... is below 3:1 across the whole
  application" — a cross-cutting design-token issue, not specific to this page).
- **The `duplicated` fixture is present and rendering** (confirmed by text search: all three fixture
  event strings — the shared-dedupeKey renewal reminder, the document-request row, the questionnaire
  row — appear in `duplicated-*`'s `fullText`), but adds **no additional scroll height or section** at
  either tier versus `default`. That is itself informative: on the free tier the list was already
  showing every recent event, so the two new unkeyed rows simply replaced/joined existing content
  rather than growing the page — consistent with (but not proof of) the "one row per channel, ungrouped"
  behaviour P1-04 exists to fix. This baseline does not attempt to verify grouping correctness (that is
  P1-04's acceptance harness); it only confirms the fixture is reachable and renders.

## 0b. Confirmed findings — root-caused, not guessed

### N1 — raw enum `in_app` rendered as the channel label (leak, all captures)
Every `in_app`-channel notification row renders the literal string **`in_app`** where every other
channel shows a translated label (`Email`, `Push`, `WhatsApp`, `Viber`). Root cause, read directly:
`channelMeta` (`components/notifications/NotificationsClient.tsx:33-52`) maps `email` / `push` /
`whatsapp` / `viber` only — `in_app` has no entry. The lookup falls through to
`channelLabel = channelInfo ? … : event.channel` (`:185-189`), which is the raw enum. `in_app` is an
implemented, actively-used channel (dashboard-fixtures.ts's own P1-04 fixture writes two `in_app` rows,
and this account's real history already had more before the fixture ran) — this is not a hypothetical
edge case, it is the default channel for in-product notifications. Counted by `internalTokenLeaks`'
"snake_case enum token" class; present in 1 of 4 recorded leaks per capture on both tiers.

### N2 — English notification bodies reach the Greek page (confirms T-014's finding, live)
Two Latin-script sentences render verbatim on the paid account's `el` notifications list:
*"AI extraction finished and the policy is readable"* and *"AI extraction read the policy successfully"*.
This is the exact shape T-014 already identified from source reading (`docs/transformation/evidence/CANDIDATE-VERIFICATION.md`:
"the English notification bodies are already intercepted — but only for `policy_analyzed`, by name,
falling back to raw stored text for every other event type") — here it is the same defect actually
rendering on screen, not just present in source. Absent on the free account only because that account's
history happens not to include one of the untranslated event types, not because the page behaves
differently per tier.

### N3 — a policy-identity placeholder rendered raw in a notification message — CAUSE UNCERTAIN, flagged rather than asserted
`fullText` on the paid account contains: *"Η ανάλυση του συμβολαίου PENDING-1786738708923
(__PENDING_EXTRACTION__) δεν ολοκ…"* — the exact sentinel-leak shape CLAUDE.md's policy-identity
invariant exists to prevent. **Investigated before publishing, per the run's honesty rule, rather than
reported as a fresh defect:** the only writer of this exact message shape,
`lib/services/policy.service.ts:1030-1074` (`policy_analysis_failed`), already calls `policyLabel()`
(`lib/wallet/policy-identity.ts:157`) — and `policyLabel()` on an all-placeholder identity returns `''`,
which the call site's own fallback turns into *"του εγγράφου που ανεβάσατε"* ("the document you
uploaded"), not the raw sentinel. Reading the current code, **this write path cannot produce the string
this baseline observed.** Two explanations remain, and this baseline cannot distinguish them from the
DOM alone: (a) a **stale row** — `notificationEvent` rows are never pruned
(`app/(protected)/notifications/actions.ts`'s own comment: "this table grows unbounded per user") and
this shared E2E account has been reused across the codebase's history, so the row may predate the
`policyLabel()` fix; or (b) a **second, unaudited write path** that constructs this exact Greek sentence
without going through `policyLabel()` or the `emit()`-level `redactPolicyPlaceholders()` scrub. **Not
closed — recommend a grep for this sentence template across `lib/` before deciding, and/or purging
notification history on this shared fixture account and re-observing**, before queuing a fix for a
defect that may already be fixed.

### N4 — heading structure not probed on this pass (corrected)
This surface's own h1 was confirmed present only implicitly (the readiness wait explicitly required an
`h1` and succeeded) — the `headingCounts` probe added to `surface-harness.ts` mid-run was not yet
present when this surface's captures ran, so the explicit count is missing from these 12 JSON files.
Every surface captured after this one carries it.

**CORRECTION.** An earlier draft of this note claimed `/wallet` and `/account/*` have **zero** `<h1>`,
based on grepping only the leaf component files (`PolicyWalletClient.tsx`, `*Section.tsx`) and missing
that both are wrapped by a route-group **layout** that renders the actual `<h1>` — `SettingsShell.tsx`
for `/account/*` (confirmed: `headingCounts.h1 = 1` on every `account-settings` capture) and a similar
shell for `/wallet` (confirmed: `headingCounts.h1 = 1` on `wallet-list`'s captures). **Both surfaces
have exactly one `<h1>`, same as this one.** Grepping a leaf component for a landmark that a shared
layout provides is a reconnaissance mistake, not a product defect — recorded here rather than silently
fixed, since the same claim propagated into this file's sibling comment in `wallet-list-baseline.spec.ts`
and `account-settings-baseline.spec.ts` (source comments, harmless, not corrected retroactively) before
the measurement caught it.

## Not captured in this pass

- **Empty state** (zero notifications) — not attempted. Both fixture accounts are shared across many
  E2E specs and carry real accumulated history; forcing an empty state would mean deleting
  `notificationEvent` rows other suites may depend on, which this baseline avoided rather than risk.
  If an empty-state capture is wanted, it needs a scoped, clearly-owned fixture account.
- **Filter/tab interactions** (the page has a policy filter per `getNotificationData`'s query) — this
  pass measured the default unfiltered view only.
