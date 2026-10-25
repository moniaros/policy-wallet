# PW-CALENDAR-01 — Money and obligations calendar

| | |
|---|---|
| **Wave** | 2 (needs ASSET-01, NOTIFY-01 `.ics` feed) |
| **Step 0** | Opus 5.5 · high · `step0-investigator` with **web research** |
| **Build** | Opus 5.5 · medium (rules engine). UI: `ui-implementer` |
| **Review** | `adversarial-reviewer` · Security review: no |
| **Waits on** | H1 for reminders. The calendar and `.ics` feed ship without it. |
| **Session start** | STATUS.md + this file |

## Customer outcome
In one place I see:
- what I pay per year, per thing and per instalment,
- the dated obligations that come with my car and home (ΚΤΕΟ, τέλη κυκλοφορίας, ΕΝΦΙΑ instalments, driving licence renewal).

The app proposes each obligation; I confirm or correct it. It's in my phone calendar.

## Step 0 — investigate, no code
1. **Premium and instalment data the extractor already reads**; its accuracy; the not-read state.
2. **Greek obligation rules.** Research each one against **current official sources** (gov.gr, ΑΑΔΕ, the Ministry of Infrastructure and Transport, the ΚΤΕΟ rules): what determines the date, who it applies to, how it changes year to year. Cite URL + access date for every rule. Where no current official source is found, the obligation is **not proposed**. Nothing from model memory.
3. **Proposal model.** «Το Yaris έχει ΚΤΕΟ τον Μάρτιο;» → the user confirms, corrects or dismisses. Store the confirmation; never assert an unconfirmed obligation as fact.
4. **Separation.** Obligations are not insurance products. They never appear as gaps or findings, and are never styled like them.
5. **Rule maintenance.** Rules carry a `verified_on` date. A yearly re-verification task is proposed (not created).

## Build (after approval)
Premium/instalment view per asset and total → obligation rules with sources → proposal and confirmation flow → calendar view → events into the `.ics` feed.

## Acceptance criteria
- Every obligation rule in code has a source URL and a `verified_on` date in its definition. A missing source fails CI.
- Unconfirmed obligations never render as fact. Dismissed ones never return unless the asset changes.
- Totals reconcile with per-asset premiums (count-consistency guard extended to money).
- The `.ics` feed carries confirmed obligations and policy end dates only.
- CRITICAL 0.

## Guards (fail first)
Rule-source presence. Count consistency for money totals. Obligation/gap separation (obligations can't render with gap components).

## Out of scope
Paying obligations, linking to bank accounts, and tax advice.

## Halt
Any obligation whose rule can't be verified from a current official source: drop it and list it in HALTS.md.

## /goal
```
/goal Calendar, premium view and confirmed-obligation flow from the approved STEP0 are on preview, every rule shows a cited source and verified_on date, all acceptance criteria in docs/series/PW-CALENDAR-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and adversarial-reviewer prints CRITICAL: 0 — or stop after 50 turns.
```
