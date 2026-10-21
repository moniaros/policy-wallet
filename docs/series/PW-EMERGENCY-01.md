# PW-EMERGENCY-01 — "Something just happened" card

| | |
|---|---|
| **Wave** | 2 (needs ASSET-01) |
| **Step 0** | Opus 5.5 · high · `step0-investigator` |
| **Build** | Opus 5.5 · high (extraction fields, offline, wallet pass). UI: `ui-implementer` |
| **Review** | `adversarial-reviewer` · Security review: **yes** (offline cache and wallet pass hold policy data) |
| **Waits on** | H6 for Apple/Google Wallet. The offline PWA card ships without it. |
| **Session start** | STATUS.md + this file |

## Customer outcome
At 11pm after a crash, one tap shows: roadside assistance number, claims number, policy number, the reporting deadline from *my* policy terms, and the first three steps. It works without signal. For the free tier this is the reason to install.

## Step 0 — investigate, no code
1. **What the extractor reads today** for roadside/assistance phone, claims phone, policy number, notification deadline («προθεσμία αναγγελίας»), and the insurer's emergency instructions. Accuracy on fixtures for each branch: motor, home, health, pet, travel, business.
2. **Fields to add** to the extraction schema. Each has a `source_page` and an `article` reference, and an explicit `not_found` state. **No defaults.** If a number isn't in the document, the card says «Δεν βρέθηκε στο έγγραφο — δείτε τον ασφαλιστή σας», never a guessed number.
3. **"First three steps."** Use only steps stated in the policy document, each cited. When the document gives none, show a neutral generic checklist clearly labelled «γενικές οδηγίες, όχι από το συμβόλαιό σας». Its content needs Eli's sign-off.
4. **Offline.** PWA service-worker cache scope (card data only, never the full document), encryption at rest on device if available, and cache invalidation when the policy changes or the user signs out.
5. **Wallet pass.** Fields on the pass, update push, revocation. Keep personal data on the pass to the minimum.
6. **Install prompt.** Customer dislike 10: there's no sign of an app. Where and when to offer PWA install, so that it's never a modal on first visit.

## Build (after approval)
Extraction fields → card per asset → «Έγινε κάτι» checklist flow → offline cache → PWA install entry → wallet pass (after H6).

## Acceptance criteria
- On fixtures for every branch, each card field is either cited to page/article or shows the explicit not-found state. Zero uncited numbers.
- Airplane-mode test: the card renders from cache. After sign-out the cache is empty.
- Phone numbers are `tel:` links, 44×44 targets, no clipping at 320px with the longest real insurer name.
- CRITICAL 0 from both reviewers.

## Guards (fail first)
- Uncited emergency field: any card value without `source_page` fails.
- Offline cache scope: no full document or extraction blob in the service-worker cache.

## Out of scope
Calling the insurer on the user's behalf, filing claims, and location sharing.

## Halt
H6. Any branch where the deadline can't be extracted reliably enough to show (report the accuracy; Eli decides whether to show it for that branch).

## /goal
```
/goal Emergency card and offline cache from the approved STEP0 are on preview, all acceptance criteria in docs/series/PW-EMERGENCY-01.md are shown met in RESULT.md with per-branch field accuracy, guards' failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 50 turns.
```
