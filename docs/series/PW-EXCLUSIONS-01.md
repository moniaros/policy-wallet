# PW-EXCLUSIONS-01 — What you probably think is covered, and paying twice

| | |
|---|---|
| **Wave** | 2 (needs ASSET-01) |
| **Step 0** | Opus 5.5 · high |
| **Build** | Opus 5.5 · medium. UI: `ui-implementer`. Copy: `greek-copy-reviewer` |
| **Review** | `adversarial-reviewer` · Security review: no |
| **Waits on** | H7 (exclusion catalogue sign-off; ships `under_review` until then). H3 (which plan gets it). H2 for wording near advice. |
| **Session start** | STATUS.md + this file |

## Customer outcome
- For each thing I own: up to three exclusions people commonly assume are covered, in plain Greek with the article number.
- Where two of my policies cover the same thing: one card saying so, with a euro figure *only* if the documents state one, and a question I can copy for my agent.

## Step 0 — investigate, no code
1. **How exclusions are extracted today**, and how duplicate-cover detection works (it's on every plan already). Its accuracy on fixtures.
2. **Top-3 selection must be deterministic.** It comes from a curated per-branch catalogue of "commonly assumed covered" exclusions, intersected with what the document actually excludes. **Not** LLM ranking, and **not** severity. The catalogue is content that needs underwriter sign-off (H7). Draft it with sources and mark it `under_review`, like the 29 provenance slugs.
3. **Euro estimate for overlaps.** Only when a per-cover premium is explicitly stated in both documents. Otherwise no number at all, just the overlap and the question.
4. **`coverage_voiding_condition`.** Conditions that silently void cover (bundled insurance tied to a payment method, duration caps, residency) are the strongest differentiator. Propose how they appear in this view.
5. **Wording.** Every card describes the document. It never says "you're not protected" and never recommends cancelling.

## Build (after approval)
Catalogue (data, `under_review`) → selection rule → exclusions block on asset detail → overlap card → copyable agent question.

## Acceptance criteria
- Every displayed exclusion is cited to an article/page in the user's own document. Zero catalogue text shown without a matching document clause.
- Overlap € shown only when both premiums are stated (fixtures for both cases).
- No ordering, colour or label implies severity.
- Shown once on first read, then on the asset page. Never as a notification.
- CRITICAL 0.

## Guards (fail first)
Uncited exclusion. Severity framing. Overlap-estimate provenance.

## Out of scope
Recommending changes to cover. Gap-detection logic.

## /goal
```
/goal Exclusions block and overlap card from the approved STEP0 are on preview behind the under_review flag, all acceptance criteria in docs/series/PW-EXCLUSIONS-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and adversarial-reviewer prints CRITICAL: 0 — or stop after 40 turns.
```
