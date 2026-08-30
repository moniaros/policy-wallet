# Analytics events — the Grafí application tier (§11)

*2026-08-30, G13. The typed union lives in `types/journey-events.ts`
(`JourneyEventPayloadMap`); every event goes through `trackJourneyEvent` —
no ad-hoc strings. `prevention.*` names are reserved as TYPES ONLY with a
guard asserting zero call sites (`app-life-events-entitlements-prevention`).*

## The revenue equation, instrumented

| Event | Payload | Emitted by | Answers |
|---|---|---|---|
| `activation.first_policy_read` | `policy_id, line` | `PolicyDetailScreen` — once ever per browser, only when a summary exists | Did the first upload turn into a read? |
| `moment_of_truth.shown` | `finding_id, tier, kind` | `components/app/MomentOfTruthBeacon` on `/` — once per finding per session | Does the product show something worth acting on? |
| `finding.dismissed` | `finding_id, reason` | `SeeScreen` after a stored dismissal | Are findings relevant? (reason mix) |
| `help.requested` | `finding_id` | `HelpScreen` on send | Does a finding lead to the adviser? |
| `help.consented` | `finding_id, policies_shared` | `HelpScreen` after the server confirms | How much do people choose to share? |
| `life_event.recorded` | `event_id` | `LifeEventScreen` after `declareLifeEvent` | Do life changes come back to the product? |
| `household.person_added` | `relation, is_dependant` | `HouseholdScreen` after the row lands | Does the household model fill in? |
| `plan.viewed_ledger` | `tier` | `MeScreen` — once per session | Does the value ledger get seen? |
| `plan.upgraded` | `from, to` | Stripe webhook path (server) — see note | Does seen value convert? |
| `notification.opened` | `stream, event_type` | `UpdatesScreen` on row open | Which stream earns attention? |

**`plan.upgraded` note:** upgrades complete OFF-PAGE (Stripe checkout →
webhook). The client cannot truthfully emit it; the conversion bus already
records `plus_selected`/`starter_selected` at intent and the subscription
webhook is the completion fact. The journey name stays typed; wiring it into
the webhook's activation handler is listed in `docs/handover.md` rather than
faked client-side.

## Business events (the BusinessEvent bus, `lib/events/catalog.ts`)

Live and emitted by this tier: `advisor.help_requested` (help flow),
`household.person_added` (household actions). Planned, typed, deliberately
NOT emitted yet: `finding.shown`, `benefit.surfaced`, `question.answered` —
each carries a `status: "planned"` note naming its future emitter, and
`business-events.test.ts` fails if a planned event is published.

## Dashboards this feeds

1. **Activation** — signups → first upload → `activation.first_policy_read` → `moment_of_truth.shown` within 7 days.
2. **Recurring value** — WAU on `/see` + `notification.opened` (protection stream) + `life_event.recorded` per month.
3. **Trust actions** — `help.requested` → `help.consented` rate; `finding.dismissed` reason mix (a high «δεν με αφορά» share means the tiering or the why-you gate is wrong).
4. **Monetisation** — `plan.viewed_ledger` → upgrade intent (`plus_selected`) → webhook completion.

## What is deliberately absent

No `prevention.*` emissions (strategy only — the guard proves zero call
sites). No score or percentage of the person anywhere in any payload.
