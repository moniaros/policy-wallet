# BASELINE — remaining surfaces — T-015 + T-016b, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surfaces:** `/help`, `/help/article/[slug]`, `/activity`,
`/insights/risk-profile`, `/upgrade`, `/upgrade/success`, `/benefits`, `/consent/ai` (content), plus
`/coverage` and `/home` reachability probes · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/remaining-surfaces-baseline.spec.ts` (paid) + `tests/measure/remaining-surfaces-free.spec.ts` (free)
+ `tests/measure/consent-ai-content-baseline.spec.ts` (T-016b, paid, `/consent/ai` content).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure remaining-surfaces-baseline` / `--project=measure-free remaining-surfaces-free` / `--project=measure consent-ai-content-baseline`

None of these pages is confirmed to use `.pw-page-shell`/`section[id]` except `/insights/risk-profile`
(confirmed present) — captured with `minSections: 0` throughout, per the fix documented in
`agent-view/BASELINE.md`.

## 0a. Metric table — paid, 7 landing surfaces × 3 widths

| surface | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| help-index | 320 | 3344 | 4.6 | 0 | 39/3 | 1 | 0 | 18 | 4 | 0 |
| help-index | 390 | 3129 | 3.7 | 0 | 39/3 | 1 | 0 | 18 | 3 | 0 |
| help-index | 430 | 3018 | 3.2 | 0 | 39/3 | 1 | 0 | 18 | 2 | 0 |
| help-article (upload-policy) | 320 | 3621 | 5.0 | 0 | 19/4 | 1 | 0 | 5 | 1 | 0 |
| help-article | 390 | 3151 | 3.7 | 0 | 19/4 | 1 | 0 | 5 | 1 | 0 |
| help-article | 430 | 2964 | 3.2 | 0 | 19/4 | 1 | 0 | 5 | 1 | 0 |
| activity | 320 | 3982 | 5.5 | 0 | 64/3 | 0 | 0 | 2 | 1 | 3 |
| activity | 390 | 3338 | 4.0 | 0 | 64/3 | 0 | 0 | 3 | 1 | 3 |
| activity | 430 | 3318 | 3.6 | 0 | 64/3 | 0 | 0 | 3 | 1 | 3 |
| risk-profile | 320 | 5943 | 8.3 | 6 | 83/3 | 0 | 0 | 10 | 14 | 1 |
| risk-profile | 390 | 4343 | 5.1 | 6 | 84/3 | 0 | 0 | 12 | 14 | 1 |
| risk-profile | 430 | 4162 | 4.5 | 6 | 85/3 | 0 | 0 | 10 | 13 | 1 |
| upgrade (paid) | 320 | 5086 | 7.1 | 0 | 56/3 | 0 | 0 | 4 | 10 | 0 |
| upgrade | 390 | 4752 | 5.6 | 0 | 56/3 | 0 | 0 | 4 | 8 | 0 |
| upgrade | 430 | 4682 | 5.0 | 0 | 56/3 | 0 | 0 | 4 | 8 | 0 |
| upgrade/success | 320 | 864 | 1.2 | 0 | 7/2 | 0 | 0 | 1 | 1 | 0 |
| upgrade/success | 390 | 988 | 1.2 | 0 | 7/2 | 0 | 0 | 1 | 1 | 0 |
| upgrade/success | 430 | 1076 | 1.2 | 0 | 7/2 | 0 | 0 | 1 | 1 | 0 |
| benefits (paid+) | 320 | 864 | 1.2 | 0 | 5/2 | 0 | 0 | 1 | 1 | 0 |
| benefits | 390 | 988 | 1.2 | 0 | 5/2 | 0 | 0 | 1 | 1 | 0 |
| benefits | 430 | 1076 | 1.2 | 0 | 5/2 | 0 | 0 | 1 | 1 | 0 |

`/upgrade/success` and `/benefits` are both ~864–1076px shell-only-looking pages — `/upgrade/success`
because there is no real checkout-session context in this pass (no Stripe session ID to resolve), and
`/benefits` because the partner-offers catalog is empty by default (per the memory index: "empty-until-
activated partner catalog"). Neither is a non-render; both are honest empty states.

## 0b. Confirmed findings

### §7.5's "densest surface" claim does NOT belong to `/coverage-insights` alone at 320px width — `/insights/risk-profile` is close behind, and worse on truncation
5,943px / 8.3 screens at 320px, with **14 truncation findings — the most of ANY surface measured in
this pass, including `/coverage-insights` (max 3)**. Two classes stand out:
- The line-of-business selector strip (`div.pw-scroll-strip`) measures **1234px content in a 262px
  box** — by far the largest overflow ratio measured anywhere in this run. This is `.pw-scroll-strip`
  (the primitive CLAUDE.md documents exists precisely so a horizontal strip scrolls instead of
  compressing) — the overflow here is the INTENDED behavior (a strip meant to scroll), not a bug; but
  a 262px viewport of a 1234px strip is nonetheless the most extreme content-to-viewport ratio on any
  page in this baseline set.
- Recent-document rows repeat the same overflow pattern seen elsewhere: `Ασφαλιστήριο Αυτοκίνητο ·
  ΣΥΜΒ-2025-DEF-LI·Δεύτερος Αλληλασφαλιστικός Συνεταιρισμός…` (the T-012 long-insurer fixture) clips
  at 262/254px — reproduces cleanly with the SAME fixture used on `/wallet` and `/wallet/[id]`.

### `/help` — six of the top navigation cards are 1.4.11 control failures
«Ξεκινώντας» 1.10:1, «Διαχείριση ασφαλιστηρίων» 1.10:1, «Λογαριασμός & ασφάλεια» 1.06:1, «Χρεώσεις &
συνδρομές» 1.06:1, plus more in the raw JSON — every top-level help category button on the index page
fails 1.4.11. Also: three `css-truncation` records where a card's description text is vertically
clipped by `line-clamp` at 40px height against ~60-80px of actual content ("Ψηφιοποιήστε με ασφάλεια
τα ασφαλιστήριά σας...", "Δώστε ασφαλή, προσωρινή ή μόνιμη πρόσβαση...", "Ξεκλειδώστε την πλήρη
ανάλυση AI...") — each help-card description is losing its second line with no "read more" affordance.

### `/upgrade` — the plan-comparison controls are the worst 1.4.11 offenders measured on this surface
«Βασικό πλάνο» 1.03:1, «Τρέχον Πλάνο» (Current Plan) 1.10:1, «Αναβάθμιση» (Upgrade) 1.18:1, the
monthly/annual toggle «Μηνιαία» 1.35:1 — the primary purchase-decision controls on the pricing page
are all under half the required contrast ratio.

### `/activity` — confirms the notification-sentinel leak also reaches the activity feed
Same shape as `notifications/BASELINE.md`'s N3 finding: *"Η ανάλυση του συμβολαίου
PENDING-1786738708923 (__PENDING_EXTRACTION__) δεν ολοκ…"* appears here too (twice, two different
`PENDING-` events), confirming this is not a `/notifications`-only rendering path — the underlying
event record's raw text reaches at least two customer-facing surfaces. Reinforces (does not newly
discover) the open question already flagged in `notifications/BASELINE.md`: stale-row vs. a live,
unaudited write path.

### `/consent/ai` reachability — reproduces DIFFERENTLY than assumed
The spec's own comment assumed this would redirect (every long-lived E2E account already has
`aiProcessingConsentVersion` set from dozens of upload specs). **It did not redirect** — the probe
landed on `http://localhost:3000/consent/ai` directly, meaning `e2e-ph@policywallet.test` does NOT
currently carry a consent version despite its extraction history. Worth a follow-up: either the
consent flag is not being set where expected, or this account's consent was reset by another spec
between runs (RESOLVED below — the account was in a normal state; the flip needed for the CONTENT
capture is deliberate and self-restoring, not evidence of drift).

### `/consent/ai` CONTENT — T-016b, READ-ONLY capture (§12.2 consent surface: measured, nothing changed)
The whole route's content is `AiConsentModal` rendered full-page (`AiConsentApprovalClient.tsx`
passes `isOpen` unconditionally, `source="agent_consent_request"` — this is the standalone link an
agent can send a customer to request consent, distinct from the modal's other three call sites
inline on `/wallet/add`, `/wallet/[id]`'s AnalysisCard, and `PolicyWalletClient`). Reached by flipping
`aiProcessingConsentVersion` to `null` for the single capture and restoring the original value
(`2026-07`) in `finally` — verified restored directly against the DB afterward. The ACCEPT button was
never clicked.

| width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|
| 320 | 864 | 1.2 | 0 | 9/2 | 0 | 0 | 1 | 2 | 0 |
| 390 | 988 | 1.2 | 0 | 9/2 | 0 | 0 | 1 | 2 | 0 |
| 430 | 1076 | 1.2 | 0 | 9/2 | 0 | 0 | 1 | 2 | 0 |

Content, verbatim: *"Για να αναλύσουμε τα ασφαλιστήριά σας, το περιεχόμενο των εγγράφων σας — που
ενδέχεται να περιλαμβάνει δεδομένα υγείας — αποστέλλεται σε πάροχο τεχνητής νοημοσύνης για
επεξεργασία. Η συγκατάθεσή σας καταγράφεται και μπορείτε να την ανακαλέσετε ανά πάσα στιγμή από τις
ρυθμίσεις απορρήτου."* — names the Art. 9 category explicitly ("δεδομένα υγείας", health data), says
where the content goes, and points to where consent can be withdrawn. No hardcoded strings, no
placeholder content.

**Cleanest measurement of `AiConsentModal`'s OWN defects in this run — zero background page to
confound it.** `overlays/BASELINE.md`'s capture of the same component on `/wallet/add` carries 8
non-text-contrast findings and 1 sub-44 target, all attributed there to the `/wallet/add` form
underneath. This page has almost no background (`AiConsentApprovalClient.tsx`'s wrapper is an
sr-only `<h1>` and nothing else), and the numbers confirm that attribution: **0 sub-44, 1 nonText
finding (the Cancel button, `[1.4.11:unmeasured]` — flat, no edge crossed, excluded from any gated
count), same 2 truncation findings as everywhere else this component's icon/badge render** (the
shell's "9+" notification badge, `scrollWidth 30/clientWidth 24`, and the modal's own `ShieldCheck`
icon wrapper, `scrollWidth 36/clientWidth 26`, both also seen on `overlays/BASELINE.md`'s AI Consent
Modal capture). The component's own accept/cancel buttons contribute no confirmed defect.

### `/coverage` legacy redirect — CONFIRMED BROKEN, root cause narrowed, in a REAL browser
`/home` redirects correctly — confirmed by curl (`307 Temporary Redirect` to `/dashboard`) AND by
the Playwright probe (browser `page.url()` ends at `/dashboard`).

**`/coverage` does not.** The Playwright probe — an actual Chrome navigation via `page.goto("/coverage")`
— asserts `page.url()` and fails:
```
Error: /coverage should redirect to /coverage-insights
Expected substring: "/coverage-insights"
Received string:    "http://localhost:3000/coverage"
```
Reproduced twice (original run + full-file retry), so this is not a flake. Investigated further before
publishing: `app/(protected)/coverage/page.tsx` unconditionally calls Next's `redirect("/coverage-insights")`
with no branching — there is no code path that could produce anything else. A direct `curl` fetch of
`/coverage` returns **`200 OK`, no `Location` header**, and its response body is **byte-for-byte the
`/coverage-insights` page** (same `<title>PolicyWallet — Δείτε αν είστε καλυμμένοι</title>`, same
rendered content, confirmed by diffing the stripped HTML of both responses). **So the CONTENT redirect
works — the customer sees the right page — but the URL never changes to `/coverage-insights`.** This
is a "silent content substitution" rather than a broken destination: nothing renders wrong, but the
address bar, browser history, any bookmark, and any analytics/OG canonical tag keyed off the URL all
still say `/coverage`. Not traced further into Next.js 16's `redirect()`/RSC internals in this pass
(this baseline's scope is measurement, not a fix) — but the failure is real, reproducible, and
specific to `/coverage`, not `/home`, so it is not a generic harness or environment issue.

## FREE tier

| surface | width | scrollHeight | sections | containers | sub-44 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|
| upgrade (free) | 320 | 5086 | 0 | 56 | 0 | 3 | 10 | 0 |
| upgrade | 390 | 4752 | 0 | 56 | 0 | 3 | 8 | 0 |
| upgrade | 430 | 4682 | 0 | 56 | 0 | 3 | 8 | 0 |
| benefits (free probe) | 390 | 988 | 0 | 5 | 0 | 1 | 1 | 0 |

`/upgrade` renders **byte-identical scrollHeight** on free vs. paid (5086px at 320px, matching
exactly) — the page structure does not change by tier, only one fewer 1.4.11 finding on free (3 vs 4
on paid), consistent with the paid-only "Current Plan" badge state contributing an extra
low-contrast element.

**`/benefits` — NOT gated for the free tier either.** SURFACES.md classifies this route "Paid+"
(tier-gated), but the free-account probe landed directly on `http://localhost:3000/benefits` with no
redirect or block screen — the same short (988px), empty-catalog page the paid account sees. Either
the gate does not exist at the ROUTE level (only in navigation, i.e. it is unlinked rather than
blocked — SURFACES.md's own §5.1 already notes it is "not discoverable in default nav"), or the gate
exists but did not fire for this account. Not investigated further; recorded as a discrepancy between
SURFACES.md's tier classification and this route's actual server-side behaviour.

## Not captured in this pass
- The Quick-Start form's post-submission state on `/insights/risk-profile` (captured only in its
  pre-submission, `needsQuickStart` state).
- Dark theme, on any surface in this document.
- `/consent/ai`'s OTHER three call sites (`/wallet/[id]`'s AnalysisCard, `PolicyWalletClient`, and
  `app/onboarding/flow.tsx`) — this pass captured the standalone `agent_consent_request` route only;
  `overlays/BASELINE.md` separately covers the `/wallet/add` (`wallet_add_policy`) instance.
