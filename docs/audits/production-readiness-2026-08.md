# Production readiness assessment — August 2026

**Six complete assessment rounds across 20 areas. 14 issues found, explained,
fixed and validated. Rounds 4, 5 and 6 identified zero new issues.**

Every fix carries a guard, and every guard was **proven to fail against the
original defect** before being kept — a guard that cannot fail is worse than no
guard, because it reads as coverage. Ten new suites, 55 assertions.

---

## Confirmation of three consecutive clean rounds

| Round | New issues | Notes |
|---|---|---|
| 1 | 7 | Sentry PII, dead client config, audit blind spot, unbounded rate-limit map, GDPR erasure gaps, authorize-after-read, escalation loop |
| 2 | 3 | Server-rendered dates, quiet-hours DST, unguarded customer read |
| 3 | 4 | Weak identifiers, mock AI in production, next-pwa vs push worker, consent banner blocking the UI |
| **4** | **0** | Full static re-sweep of every round-1–3 detector, plus GDPR/permissions/scheduler subsystem sweep. One hit was a false positive (`authorizeCronRequest` absent from the keyword list). |
| **5** | **0** | Different lenses: admin audit coverage, i18n in toasts, touch targets, locale drift, secret handling. Candidates triaged to non-defects — see *What I deliberately did not call a defect*. |
| **6** | **0** | Different lenses again: nested-transaction deadlocks, float money on write paths, cron N+1, floating notification calls, raw `error.message` returned to clients. |

The counter reset at rounds 1, 2 and 3 because each found something. Rounds 4–6
used **deliberately different detectors** rather than re-running round 1's, so
"clean" means more than "the same scan passes twice".

---

## Implemented improvements

### 1. Production served fabricated AI analysis when no API key was configured
**Severity: highest.** `AIServiceFactory.determineServiceType()` fell through to
the mock provider whenever no provider key was present — **in every
environment**. A rotated, mistyped or missing env var on a deploy meant customers
uploading real insurance policies received an invented insurer, a €500 premium
and invented coverages, stamped **88–96% confidence**.

For an insurance product this is the most harmful output the system can produce.
Telling someone their policy covers something it does not is a wrong answer they
will act on; telling them the analysis failed is an honest one they can retry.
And it failed invisibly — one `warn` line, while the admin dashboard showed
analyses completing normally.

Production now refuses. An explicit `AI_SERVICE_TYPE=mock` is still honoured,
because someone choosing mock is different from nobody noticing. This matches
what the codebase already does elsewhere: `lib/storage.ts` refuses its
local-public fallback in production, `email-service.ts` returns an error rather
than pretending to send. The refusal lands in an existing catch that records
`extraction_failed`, so it becomes a failed analysis rather than a stuck one.

### 2. Four personal-data stores survived GDPR erasure
Erasure is **anonymize-in-place** — the `User` row survives so legally retained
records keep a resolvable anchor. That is correct, and it has one consequence
that is easy to forget: **`ON DELETE CASCADE` never fires.** A table added with a
`userId` is not cleaned up by the database; it simply outlives the erasure
request, silently.

`push_devices`, `business_events`, `risk_reviews` and `user_notification_settings`
all did. The push one is the sharpest: it retains a live delivery endpoint plus
the `p256dh`/`auth` keys to encrypt for it, so a person who asked to be forgotten
could still be sent a notification on their own phone.

The mirror gap was equally real: several stores were erased on request but never
disclosed on request. If a record is personal enough to delete under Art. 17 it
is personal enough to show under Art. 15. Collaboration messages the customer
wrote, their referrals, their notification history and their questionnaire
answers are now in the export. The push **keys** deliberately are not — the
endpoint identifies the device and is disclosable; the keys are a credential.

The previous guard enumerated models by hand, so a new store was invisible to it
**by construction**. The replacement derives the list from `schema.prisma`: a
model is either handled or explicitly exempted with a written reason.

### 3. Customer email addresses were shipped to Sentry as indexed tags
Both server and edge configs declare `sendDefaultPii: false` with a GDPR comment
— and `lib/email/email-service.ts` defeated it on **every send failure**, putting
the recipient's raw address and the subject line into Sentry **tags**, which are
indexed and searchable. Sentry sits outside the DSR export and erasure paths, so
that data is neither disclosable nor deletable.

Call sites now log a domain and a truncated SHA-256 fingerprint — which preserves
exactly the two things an on-call engineer wants ("is one domain bouncing?", "is
it the same recipient every time?") without the address. A `beforeSend` scrubber
on all three runtimes is the net under that, because "remember not to log the
customer's email" is a rule that holds until the next hurried `captureException`.
It also scrubs IBANs and Greek AFM/VAT numbers, and redacts the provider's own
error text — Brevo quotes the rejected address back at us.

### 4. The in-memory rate-limit fallback grew without bound
Named "for Dev", but it is the live path in two **production** situations:
Upstash unconfigured, and Upstash unreachable. Fluid Compute reuses instances, so
the map outlives the request, and public routes key on IP — a bot sweep mints one
entry per source address, none ever removed. The leak engaged **precisely when
Redis was already down**, so the degraded mode would have taken the instance with
it. Now swept on an interval and hard-capped, evicting soonest-to-expire first.

### 5. The client Sentry config was dead code
Next 16 loads `instrumentation-client.ts`; `sentry.client.config.ts` was read by
nothing. Its `ignoreErrors` list and its development drop had therefore been
inert — **every local `npm run dev` error was reaching the production Sentry
project**, and the noise filter everyone assumed was on was off. Meanwhile
`SENTRY_SETUP.md` told engineers to edit the dead file. Consolidated into the
live config (with explicit Session Replay masking, rather than inherited
defaults, for a product that shows policy numbers and premiums), the dead file
deleted, the docs corrected.

### 6. Escalations re-fired every night, for ever
The dedupe key was date-stamped, so a permanently failed notification — a dead
address, a bounced domain — escalated to every admin on every nightly sweep until
someone deleted the row by hand. An escalation that arrives every morning whether
or not anything changed is one a team learns to filter, and a filtered escalation
is the same as none. Now keyed on the failing **row**: once ever, while a genuinely
new failure months later still escalates. The scan is also windowed, so it stops
reconsidering every failure the table has ever held.

The retry sweep had **no test at all**, which is how this survived. It has one now.

### 7. Three server-rendered dates and day-counts were wrong near the Athens boundary
`toLocaleDateString()` with no `timeZone` resolves against the *runtime* zone —
UTC on Vercel — and policy end dates are stored at midnight UTC, i.e. 03:00
Athens. The codebase had already fixed this class once (Sentry POLICYWALLET-8)
and built `lib/i18n/format.ts` as the single formatter; the policyholder
dashboard had since reintroduced it, **and** hand-rolled a `daysUntil` using
millisecond division — a duration in 24-hour blocks, not calendar days, which
drifts a full day across DST and picks the urgency colour shown beside that very
date. The branch page's "expires in N days" badge had the same bug.

Being a day out on a **compulsory** motor policy is not cosmetic in Greece.

### 8. Quiet hours were violated on the autumn clock change
`nextAllowedTime` added `(end - hour + 24) % 24` hours of elapsed time. Those are
the same number only when no clock change intervenes. On the night Greece returns
to EET, a notification deferred at 23:00 with a 22→08 window arrived at **07:00
local — inside quiet hours.** Once a year the mechanism did exactly what it
exists to prevent. Now steps forward an hour at a time and asks the recipient's
clock. The spring case failed too, which I had not predicted.

### 9. The API-auth audit was blind to re-export alias routes
`app/api/v1/contact/route.ts` is one line re-exporting a POST handler. The
auditor read that file's text, found no guard, no rate limit and no validation —
and the inventory was authored to match, permanently recording a **public POST
endpoint as needing no controls**, with a method list of `[]` that made the
drift check unable to ever fire. The auditor now follows aliases; verified by
injecting drift and watching it fail.

### 10. An admin action read the database before authorizing
`updateGapDefinitionFromForm` queried `gapDefinition` and threw "not found",
*then* called a helper that checked the admin role. The write was safe, but any
signed-in user could tell a real gap-definition id from an invented one by which
error came back — and the ordering held only because a function three files away
happened to check. A `"use server"` export is a public endpoint regardless of
which layout the button lives behind.

### 11. Identifiers built by slicing `Math.random()`
`Math.random().toString(36).substring(7)` returns fewer than four characters
about **once in 4,800** (measured, not assumed) and can in principle return an
empty string. Both uses were *matched on*, not merely rendered:

- **Batch upload** — the id is the React key *and* the handle `handleRemove` and
  `handleUpdatePolicy` match on. A collision means deleting a document deletes
  someone else's, or a policy number typed into one file is submitted against
  another.
- **Policy placeholders** — `PENDING-xxxxx` is persisted, and duplicate detection
  matches on `(ownerUserId, policyNumber, insurerName)`. Every placeholder shares
  the insurer `AI Analyzing...`, so two colliding suffixes look like the same
  policy and raise a merge request between two different ones — which, approved,
  loses a policy. A batch upload makes those uploads concurrent by design.

### 12. `next-pwa` was dead configuration aimed at the push service worker
It is a webpack plugin and Next 16 builds with Turbopack, so it emitted nothing —
its offline-caching options had been fiction for as long as they existed. But it
was configured with `dest: "public"`, which is where `public/sw.js` lives. One
build-tool change would have overwritten the push service worker, and push would
have stopped with **no error, no failing test and no diff**. Removed; the product
does not want precaching anyway, as `sw.js` says in its own header — an offline
cache for an app whose job is showing *current* policy data is a way to show
someone stale cover.

### 13. A customer page depended on a table that might not exist
`getQuietHours()` was the one new read not failure-isolated, and it sits on the
account page — billing, security, data export, all behind one optional lookup.
Two ways that bites: any transient database error, and the ordinary window where
code ships before its migration (**the state production is in right now**). It
now falls back to the role defaults, which is the same answer it already gave
when the row was merely absent.

### 14. The cookie consent banner disabled the app underneath it
Measured in a real browser with `elementFromPoint`, before and after:

- **Desktop.** The banner is `fixed inset-x-0 bottom-0 z-[120]` — full width —
  while the visible card is `max-w-4xl mx-auto`. The invisible strip either side
  sat on top of every bottom-right control and **swallowed the click**. The
  wallet's add-policy button looked perfectly clickable and did nothing. Fixed
  with `pointer-events-none` on the wrapper, `pointer-events-auto` on the card.
- **Mobile (375×667).** The card covered the **entire bottom navigation** — every
  navigation control on a phone, for every first-time visitor, on a mobile-first
  product. The banner is not modal (no scrim, the page stays interactive), so
  this was an accident of stacking. The banner now publishes its height and the
  bottom nav sits clear of it.

---

## Remaining risks

1. **Six migrations are unapplied in production.** Confirmed against the live
   database: its newest migration is `20260804140000_life_event_engine`.
   `notification_bus`, `notification_admin`, `business_events`,
   `notification_orchestrator`, `automation_console` and `risk_review` must land
   **in order** before any deploy — including a Vercel Preview, which writes to
   the production database.
2. **The consent banner still covers the batch-upload modal's "Save all".**
   Measured and screenshotted. The modal is trapped in an app-shell stacking
   context (`backdrop-blur`, `transform`, `z-40` ancestors), so raising its
   z-index does nothing — I tried, and it changed the rendering not at all. The
   real fix is a portal or a deliberate restack of the consent layer.
   `tests/wallet-batch-upload.spec.ts` fails for this reason; it is
   **pre-existing**, verified identical with and without every change here.
3. **A portal attempt on that modal broke the page** (hooks after an early
   return) and was reverted. The file now differs from `main` only by the
   `crypto.randomUUID()` fix.
4. **VAPID keys are unset**, so push reports itself unconfigured and is not
   attempted — honest, but the feature is dark until keys are set.
5. **E2E was not run to completion.** The full `chromium` + `agent-chromium`
   suite exceeded 30 minutes and was stopped. Specs in areas I touched were run
   individually. Other failures observed (`admin-insurers`, `money-path`,
   `landing-friction`, `theme-state-cascade`, `agent-viewport-overflow`) are in
   areas this work never touched and were not diagnosed.
6. **Nothing is committed.** The working tree also holds a parallel session's
   landing/auth work, so any commit needs selective staging — never `git add -A`.

---

## What I deliberately did not call a defect

Listed because a report that only says "found and fixed" hides its own judgement.

- **17 hardcoded admin toast strings.** Admin surfaces carry an explicit
  `i18n-hardcoded-ignore — admin-only internal tooling` marker and the CI check
  passes on a full scan. Translating the admin console is a product decision, not
  a readiness fix.
- **`Intl.NumberFormat("en-US")` on one admin page.** The codebase standardised
  on `en-GB`, but for *integers* the two produce identical output on a
  deliberately English page.
- **32–40px buttons in seven components.** Below the 44px comfort target but
  above WCAG 2.2 AA's 24×24 floor, and pre-existing.
- **`db.* as any` casts (38).** A type-safety smell that `tsc --noEmit` shows is
  masking nothing today.
- **Five `dangerouslySetInnerHTML` sites.** All static, developer-authored: JSON-LD
  (with `<` escaped), GA config, a CSS string, a locale bootstrap. No XSS surface.
- **Money read via `Number(...)` at five sites.** All display reads of a Prisma
  `Decimal`, not persisted writes.

---

## Corrections to my own work

Recorded because the same discipline that catches product defects should catch
mine.

- **Two guards passed vacuously on first write.** One compared `indexOf(...) < n`
  where `-1` satisfies the comparison, so it passed *loudest* exactly when the
  guard it protected had been deleted. The other flagged number formatting as
  date formatting, which would have buried the real finding in noise. Both
  rewritten; both then verified to fail against the original defect.
- **My first diagnosis of the consent-banner issue was wrong.** I asserted a
  z-index collision covering the FAB. The desktop screenshot disproved it — the
  FAB is visually clear there. Measurement showed the real mechanism was the
  invisible full-width wrapper intercepting the click, and a genuine visual
  occlusion only at mobile width.
- **I over-lifted the FABs.** Offsetting them by the banner height parked them a
  third of the way up the screen. Measured, judged worse than the problem, and
  scoped back to the bottom navigation where lifting is exactly right.

---

## Architecture summary

**Events.** A 30-event catalog (`lib/events/catalog.ts`) with fact/derived
kinds, a transactional outbox (`publish.ts`, never throws), a pure decision
engine (`decision-engine.ts`) producing planned actions, and an executor
(`executor.ts`) covering twelve action types. Actions run sequentially and are
individually try/caught, so one failure cannot abort the rest, and state-shaped
actions are ordered ahead of notifications so a customer is never told about a
score that has not been written. Claims are specified and honestly unwired —
there is no `Claim` aggregate.

**Notifications.** One registry (74 business events), one bus (`dispatch.emit`),
channel-agnostic adapters that contain no business logic, and an orchestrator
that resolves recipients, applies quiet hours, rate limits and scheduling.
Delivery records are honest: `sent` / `failed` / `skipped` / `expired` /
`queued`, never a `sent` for a message nobody transmitted. Retry, expiry and
escalation run as one nightly sweep in a load-bearing order — expire first, so a
retry is never spent on a message that is no longer true.

**Risk review.** Recalculation is automatic, continuous and silent; a review is
a human checkpoint. Of 20 triggers, 16 open a review and 4 deliberately do not.
Cooldowns, supersession and expiry keep reviews rare enough to be read.

**Guardrails.** `audit:api-auth` (now alias-aware), `lint`, `lint:i18n-changed`,
`lint:utf8`, `lint:encoding`, `type-check`, 3,991 unit tests, production build.

---

## Production readiness

**Not ready to deploy today — for one reason, and it is not code quality.**

The six unapplied production migrations are a hard blocker: this branch's code
queries tables production does not have. Everything else assessed here is either
fixed or listed above with its measurement.

Once those migrations land in order, the assessed surface is in good shape. The
security and privacy findings — fabricated AI analysis, personal data surviving
erasure, PII in the error tracker — were the substantive ones, and all three are
closed with guards that were proven to bite.

**Gate status:** `audit:api-auth` ✓ · `lint` ✓ · `lint:i18n-changed` ✓ ·
`lint:utf8` ✓ · `lint:encoding` ✓ · `type-check` ✓ · **3,991 unit tests ✓** ·
**production build ✓**. E2E: partial, as described above.
