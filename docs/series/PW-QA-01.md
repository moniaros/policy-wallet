# PW-QA-01 — Ask my policies, get the article

| | |
|---|---|
| **Wave** | 2 |
| **Step 0** | Opus 5.5 · high |
| **Build** | Opus 5.5 · high (answering pipeline + eval suite). UI: `ui-implementer` |
| **Review** | `adversarial-reviewer` · Security review: **yes** (cross-user retrieval) |
| **Waits on** | H3 (which plan) |
| **Session start** | STATUS.md + this file |

## Customer outcome
I ask «Καλύπτεται αν κλέψουν το ποδήλατο από το μπαλκόνι;» and get:
- an answer that quotes the article and page of *my* policy,
- «δεν το αναφέρει το έγγραφο» when it doesn't,
- «επιβεβαιώστε με την ασφαλιστική» whenever the wording is ambiguous.

## Step 0 — investigate, no code
1. **The current Family-tier "unlimited questions" implementation:** retrieval scope, prompt, how answers cite, and failure modes.
2. **Retrieval scope** is the asking user's own documents (plus household shares, once HOUSEHOLD-01 exists). Prove it can't cross users.
3. **Answer contract.** Every claim carries `{policy_id, page, article}`. With no supporting passage, the answer is a refusal-to-guess, not a general-knowledge answer. No yes/no without a citation.
4. **Eval suite.** About 60 Greek questions across branches:
   - answerable,
   - not in document,
   - ambiguous wording,
   - trick questions where general knowledge differs from the policy.

   Graded on citation correctness and abstention. Show the baseline score before any change.
5. **Advice boundary.** Questions like "should I switch?" or "which is better?" get the document facts plus «ρωτήστε τον ασφαλιστή σας», never a recommendation.

## Build (after approval)
Retrieval scoping → citation-enforced answer contract → abstention path → UI with tappable citations that open the page → eval suite in CI.

## Acceptance criteria
- Eval: citation accuracy and correct abstention at or above the targets Eli sets in STEP0 approval; baseline vs result in RESULT.md.
- A cross-user retrieval test returns zero foreign passages.
- Zero answers without a citation, except explicit abstentions.
- CRITICAL 0 from both reviewers.

## Guards (fail first)
The eval suite as a CI gate (threshold from STEP0). Uncited-answer guard. Cross-user retrieval test.

## Out of scope
General insurance Q&A not grounded in the user's documents.

## /goal
```
/goal The answer pipeline from the approved STEP0 is on preview, the eval suite prints baseline and result scores meeting the approved thresholds, all acceptance criteria in docs/series/PW-QA-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 50 turns.
```
