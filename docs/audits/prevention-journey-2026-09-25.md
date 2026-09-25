# Prevention journey — baseline and gap closure (2026-09-25)

Scope: benefit → evidence → chosen action → optional reminder → follow-up, for a
health policy. Most of it shipped on 2026-09-24 (#376 Benefit Reminder, #377
check-up terms, #378 verified insurer call centre). This pass verified it in the
running app and closed three defects the verification found.

## Baseline

| Area | State | Where | Verified by |
|---|---|---|---|
| Benefit discovery, worded by evidence | WORKING | `lib/wellness/checkup-benefit.ts` (one resolver, wellness + home) | unit core tests; browser at 320/390/430 |
| Terms (frequency, cap, tests, network, waiting, conditions), each with its own citation/page | WORKING | `health.checkup`, `BenefitReminderCard` | unit; browser (seeded) |
| Route back to evidence | WORKING | «Δείτε τους όρους» → `/wallet/[id]#coverage`; `SourceSnippetBox` | browser |
| Next actions: terms / call the recorded or verified number / ask an advisor who already sees THIS policy | WORKING | `BenefitReminderCard`, `resolvePolicyAdvisors`, `startBranchActionThread` | unit + browser |
| No booking CTA; «η κράτηση δεν γίνεται μέσα από την εφαρμογή» | WORKING | card copy | browser |
| Status: planned (`considering` «Θα το εξετάσω») / completed / not applicable / deferred (`later` + date) — nothing medical asked | WORKING | `setCheckupIntent` | unit + browser (reload persists) |
| Reminder: person-picked date, daily scan, dedupe key, preferences + quiet hours + monthly ceiling via `emit` | WORKING | `checkup-reminder.service.ts`, `lib/notifications/dispatch.ts` | **live cron run on dev** (below) |
| Reminder when the policy is deleted / cancelled / expired | **BROKEN → fixed** | scan sent it anyway, with an empty label | unit (3 cases) |
| Deferred date across 1 January | **BROKEN → fixed** | usage read by current year only: state vanished and a new «later» made a SECOND pending reminder on a new row | unit (`pickCheckupUsage`, action cancels other-year pending) |
| Follow-up screen after the reminder fired | **BROKEN → fixed** | still said «Θα σας το θυμίσουμε στις <past date>» | live: after the cron run the card offers the four choices again |
| Empty states: no policy / no health policy / silence («δεν καταγράφηκε… δεν σημαίνει ότι δεν καλύπτεται») / unverified false / expired | WORKING | card + page | unit; browser |
| No AI consent / extraction failed | WORKING (honest, generic) | nothing extracted → «δεν καταγράφηκε» | unit (silence case) |
| Advisor: never sees intent/reminders; health snapshot only on consent, minimised, logged, dies with relationship | WORKING | `health-share.ts`, `share-actions.ts` | unit + browser (advisor sees → revoke → nothing) |
| Partner offers | Separate (`/benefits`); never presented as a policy benefit | — | not in this journey |

Not a defect, recorded: the reminder email to the E2E fixture was refused by the
policy-identity guard (fixture policy number); in-app delivered.

## Priority order
Unchanged from the brief (P0 discovery + honest terms → P1 reminder + status →
P2 advisor). P2 reuses the existing customer-initiated thread, so it shipped too.

## Evidence (2026-09-25, branch `fix/prevention-journey-gaps`)
- Live cron on dev (`/api/v1/jobs/checkup-reminder`, Bearer CRON_SECRET): run 1
  `due 1 reminded 1`, run 2 `due 0` — one in_app event `sent`, `remindedAt` stamped.
- `tests/measure/wellness-prevention.spec.ts` (measure project, :3001): 7/7.
- Unit 677 files / 7,742 tests; type-check, lint, i18n, UTF-8, api-auth,
  verify:migrations, production build — all pass. No schema change.

## Remaining (not launch-blocking for this journey)
- «No AI consent» and «analysis failed» read the same as silence; a line naming
  WHY nothing was read would be clearer (UX).
- Signed-in production smoke of `/wellness` never run (no owner session).
- Every live card reads «χρειάζεται επιβεβαίωση» until verified citations exist
  on real policies (re-analysis with `EXTRACTION_CITATIONS`).
- B2B2C gates (unchanged, deferred by owner 2026-09-24): partner contract,
  organisation-level DPIA, consent model for employer distribution, booking
  integration with a real completion signal.
