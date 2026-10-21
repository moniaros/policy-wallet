# PW-CLAIMS-01 — Claims tracker and annual limit used

| | |
|---|---|
| **Wave** | 2 for the pet and property phase · 3 for the human-health phase (after H5) |
| **Step 0** | Opus 5.5 · high |
| **Build** | Opus 5.5 · medium. UI: `ui-implementer` |
| **Review** | `adversarial-reviewer` · Security review: **yes** (invoice uploads) |
| **Waits on** | H4 (claims tables). H5 before any human medical invoice. H1 for reminders. |
| **Session start** | STATUS.md + this file |

## Customer outcome
- I log a claim with what was needed, when I submitted it, and the date I'm waiting for.
- I photograph the vet invoice and see «Ρεξ: 1.240 € από 3.000 € φέτος».
- I'm reminded only on dates I set.

## Step 0 — investigate, no code
1. **Annual limits and per-condition sub-limits:** what the extractor reads for pet, health and property policies; accuracy; not-read state.
2. **Claims log model:** user-entered claim, documents, user-set dates, status the user updates. PolicyWallet never claims to know the insurer's status.
3. **Invoice capture.** OCR of amount, date and provider. The user confirms the amount before it counts. Pets first: animal data isn't Article 9. Human medical invoices wait for H5, and the design must keep them fully separable.
4. **Limit-used calculation** uses only confirmed amounts against an extracted limit. When the limit wasn't read: «Το ετήσιο όριο δεν διαβάστηκε», no bar.
5. **Policy year boundaries** come from the policy dates, not the calendar year.

## Build (after approval + H4)
Claims log → invoice capture (pets, property) → limit-used view → user-set reminders as events (dispatch per NOTIFY-01) → human-health phase only after H5 is recorded.

## Acceptance criteria
- No limit-used bar without both an extracted limit and confirmed amounts.
- Policy-year rollover fixture resets correctly.
- No human-health invoice path reachable while the H5 flag is off (test).
- CRITICAL 0 from both reviewers.

## Guards (fail first)
Absence-is-not-reassurance on limits. H5 feature-flag enforcement. Uncited limit value.

## Out of scope
Submitting claims to insurers. Predicting claim outcomes.

## /goal
```
/goal Claims log, pet/property invoice capture and limit-used view from the approved STEP0 are on preview with the human-health path provably unreachable, all acceptance criteria in docs/series/PW-CLAIMS-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 50 turns.
```
