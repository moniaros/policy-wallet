# Product evolution — NOW / NEXT / FUTURE

*2026-08-30, Grafí G14. The application tier's direction of travel, and the
lines it must never cross while travelling.*

## NOW (shipped on `feat/grafi-b2c`)

A personal protection system: one verdict (`covered / gap / review` — the
only status vocabulary), findings that pass a specificity gate (object +
source or they do not render), time-based urgency (τώρα / αυτόν τον μήνα /
όταν έχετε χρόνο), money as facts (largest single limit, said so; pairs
without invented amounts), the adviser as the customer's OWN person with
audited, per-policy, revocable sharing, a value ledger projected from
BusinessEvent, per-document Article 9 consent, and ten declarable life
events whose only output is a re-check delta.

## NEXT (owed, listed in docs/handover.md)

- Prod DDL for the four G1 tables → flip `FF_APP_FINDINGS`,
  `FF_APP_HOUSEHOLD`, `FF_APP_DOCUMENT_CONSENT` in the PR.
- `plan.upgraded` wired at the Stripe subscription-activation webhook (the
  client cannot truthfully emit it — docs/analytics-events.md).
- The legacy component deletion (A-25 list) with its guard rewrites.
- Emit `finding.shown`, `benefit.surfaced`, `question.answered` (typed,
  planned, deliberately unpublished).
- DPO wording for the per-document consent framing (legal queue item 5);
  tariff data before any paid-twice € figure renders.

## FUTURE (strategy only — no entity, no UI, no event today)

Prevention. The data model is ready to EXTEND, not extended: the
`PreventionOpportunity` type (lib/app/prevention.ts) names the chain —
life event → observed issue → evidence → action → eligibility → decision →
service → outcome — and a guard proves it is imported nowhere outside
lib/app and that no `prevention.*` event has a call site. The product
earns the right to prevention by YEARS of not selling anything: a
water-leak sensor offer the week after a mortgage declaration would spend
that trust in one push notification.

## Domain extensions the current model absorbs without schema change

- New deterministic checks: one operator + catalogue rows (the
  `insured_value_*` reference pattern) — findings inherit the gate, the
  tiers, the sentences.
- New life events: a registry row + a chip id + one authored label.
- New lines: `lib/app/lines.ts` folds new taxonomy branches onto the 16
  marketing lines by name.
- Household ↔ policy linking: today display-only name matching (A-29); a
  person↔policy join table slots under HouseholdPerson without touching
  the verdict logic (personState already takes `policyStates`).

## Must NOT be implemented (standing, from the brief §10 and decisions)

- No score or percentage of the person, ever, anywhere (guards:
  score-containment, no-person-percentage-copy, the rendered gate).
- No product recommendations, no «καλύτερο πρόγραμμα», no switching or
  saving language (voice lint, two universes).
- No adviser directory or matching — the adviser is the customer's own.
- No fabricated preventive services, no `prevention.*` emissions.
- No user-count / «trusted by» / testimonial claims on any surface.
- No severity adjectives as urgency — time only.
