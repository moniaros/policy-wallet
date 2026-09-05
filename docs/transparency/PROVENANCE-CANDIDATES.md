# B3 — provenance candidates for the human track

`lib/gaps/provenance.ts` ships every authored check as `under_review` with `citation: null`.
The agent does not classify. The underwriter and legal tracks fill this table; each row needs a
class (`legislative` | `contractual` | `market`), a citation a reader can check, and who decided.
Until a row is filled, its findings render only in the disclosed «υπό αξιολόγηση» section, are
counted in no summary, and are sent nowhere.

Named by the spec as candidates — listed, **not pre-filled**:

| Candidate | Authored slugs it may bear on | Class | Citation | Reviewed by / on |
|---|---|---|---|---|
| Υποχρεωτική ασφάλιση αστικής ευθύνης οχημάτων και τα νόμιμα ελάχιστα | (no authored rule checks third-party liability presence or minimums today) | — | — | — |
| Αναλογικός κανόνας / υπασφάλιση | `insured_value_below_rebuild_cost`, `insured_value_above_declared` | — | — | — |
| Fire cover required on mortgaged property | `no_fire_cover` | — | — | — |
| Employer-mandated group cover where the policy names the requirement | `group_missing_coordination_centre`, `group_missing_hospital_class`, `group_no_direct_billing` | — | — | — |

All other authored slugs (25) have no named candidate yet and stay `under_review`.

Exact human task: for each row, decide the class, write the citation (law / regulation article,
or the contract clause type), sign with a name and date, then edit `GAP_PROVENANCE` in
`lib/gaps/provenance.ts`. The guard `tests/unit/provenance-skeleton.test.ts` fails on a
classified entry without a citation and on an authored slug missing from the map.
