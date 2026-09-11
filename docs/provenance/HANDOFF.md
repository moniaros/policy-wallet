# PW-PROVENANCE-01 — handoff

What the next person or session needs that is not in the code. Refreshed at each close-out block.

| Id | What | Who owns it |
|---|---|---|
| P-H1 | The five halts (`H-P1`…`H-P5`) are the series' entire unfinished business at open. `H-P1` (AI transfer exposure) is the one with a live compliance consequence — the register ranks it first. | Owner / counsel |
| P-H2 | The findings this series implements are described, with evidence, in `docs/compliance/DATA_PROTECTION_REVIEW_PACK.md` §14 and `docs/planning/DATA_INVENTORY_AND_PROVENANCE.md`. Both are published as private Artifacts for the legal review. | Owner |
| P-H3 | `W2-02` carries a visible product consequence: findings extracted before `W1` have no citations, so they become `policy_asserted` and demote from **gap** to **review**. Users see this. The alternative — grandfathering them — is dishonest and was rejected at open. | Owner to ratify or overturn |
| P-H4 | `W5-01` minimised the named-driver contract ADDITIVELY, as §4 mandates: `name` and `licenseNumber` remain declared on both driver item schemas, described `DEPRECATED`, and are dropped from the prompt block so the model is never asked for them. No row on either database carries the array (2026-09-11). Deleting the two keys (and the `DEPRECATED_NAME` descriptions) is a narrowing of a stored shape, which the loop may not do. | Owner: ratify the deletion, or leave the deprecated keys in place indefinitely — both are safe; the guard `named-drivers-minimised` holds either way (one assertion to drop on deletion). |
| P-H5 | The top-level `beneficiaries[]` still carries each designated beneficiary's NAME, and the life card renders it «as written» (`/product/life` promises this; the review nudge lists the names). D3's argument — no rule reads a name — applies here too, but withdrawing a product promise is not the loop's to decide. `lifeAndInvestment.beneficiaries` (the bare name list) IS deprecated by W5-02. | Owner: keep the names (a policyholder's own designations, on their own document) or minimise to relationship + share — one `DEPRECATED` description and two render lines either way. |
