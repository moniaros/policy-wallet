# PW-LIFE-SEASON-01 — Life events and seasonal prompts (spec only)

| | |
|---|---|
| **Wave** | 4 — **spec only until H1 and H2 are recorded in DECISIONS.md** |
| **Step 0** | Fable 5.1 · xhigh · `step0-investigator` with **web research** |
| **Build** | Not authorised. Re-plan after the decisions. |
| **Review** | `adversarial-reviewer` reviews the spec against §7.4 of the transformation doc (no dark patterns) |
| **Waits on** | H1 (send policy), H2 (compliance boundary) |
| **Session start** | STATUS.md + this file |

## Customer outcome
1. **Life events.** I tell the app something changed: we moved, bought a car, rented out the flat, hired someone, my son got his licence. It shows what to look at in the policies I already have, citing the clauses. It never suggests buying anything.
2. **Seasonal prompts.** Before fire season or winter storms, at most 2–3 times a year, it says only what *my* policy covers or excludes for natural events («φυσικά φαινόμενα»), and only if my policy has something specific to say.

## Step 0 — deliverable is a spec, not code
1. **Event → clause map.** For each life event, which extracted fields and clause types become relevant (e.g. rental use of a home, named drivers, change of address). Each mapping is deterministic and cites the field it reads.
2. **Seasonal triggers.** Season windows and the data source for each, researched from official Greek sources with citations. Which policy fields must be present for a prompt to fire. A policy with no relevant clause → no prompt. Never a generic scare.
3. **Draft copy** for every message, run through `greek-copy-reviewer`, flagged for the advice boundary.
4. **§7.4 check.** Show each proposed message is traceable to a real dated event or a user action, has no urgency language, and can be turned off per type.
5. **Questions for the DPO / underwriter (H2)**, written so they can be answered in writing.

## Acceptance (for the spec)
- `adversarial-reviewer` finds zero §7.4 violations in the spec.
- Every message type in the spec maps to a trigger, a cited clause type, and an off switch.
- The H1 and H2 questions are in HALTS.md, ready to send.

## Halt
This series halts by design after Step 0.
