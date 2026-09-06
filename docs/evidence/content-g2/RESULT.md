# Goal 2 — rendered numbers before and after the citation-backed classification (PW-CONTENT-01)

Same seeded fixture as the F5 evidence (`e2e-ph@policywallet.test`: her own analysed motor policy carrying `missing_accident_declaration_phone`, plus the agent-demo motor policy with `insured_value_above_declared` and two unauthored findings; agent book `e2e-agent@`), 390px, Greek.

**Before** = `docs/evidence/transparency-f5/after/` (2026-09-05, NEW-UI `7b86805d`: 3 slugs classified). **After** = `docs/evidence/content-g2/after/` (2026-09-06, `feat/content-01` at Goal 7: 8 slugs classified — the fixture's `missing_accident_declaration_phone` moved from under review to legislative on Π.Δ. 237/1986 άρθρο 9 παρ. 1).

## B2C dashboard and wallet

| site | before | after |
|---|---|---|
| Home gap tile (`gap.provenanceCount#legislative`) | 1 Νομοθετική απαίτηση | **2 Νομοθετική απαίτηση** |
| Home hero open-recommendation count | 4 ευρήματα ίσως χρειάζονται έλεγχο | **5 ευρήματα ίσως χρειάζονται έλεγχο** — the recommendation derived from the newly classified finding leaves the disclosed section and counts |
| /protection headline | Εντοπίστηκαν 1 σημεία προς έλεγχο στα ασφαλιστήριά σας — και 3 υπό αξιολόγηση, που δεν έχουν ταξινομηθεί ακόμη. | **Εντοπίστηκαν 2 σημεία προς έλεγχο στα ασφαλιστήριά σας — και 2 υπό αξιολόγηση, που δεν έχουν ταξινομηθεί ακόμη.** |
| /protection citations rendered | 1: Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση) | **2**: Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση) · Νομοθετική απαίτηση · Π.Δ. 237/1986, άρθρο 9 παρ. 1 (δήλωση ατυχήματος στον ασφαλιστή εντός 8 εργάσιμων ημερών) |
| Own motor policy — findings page group | ["under_review: Ευρήματα υπό αξιολόγηση"] | **["legislative: Απαιτήσεις από νόμο ή σύμβαση"]** — the finding renders in the emphasised group with its citation |
| Seeded demo policy — citation line | Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση) | Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση) (unchanged: already classified in F5) |

## Agent book

| site | before | after |
|---|---|---|
| KPI «Με κενά κάλυψης» | Με κενά κάλυψης1 | Με κενά κάλυψης1 (unchanged: the one visible client already had a classified finding) |
| Client card chip | ["1 ανοιχτά ευρήματα"] | ["1 ανοιχτό εύρημα"] |
| /insights recent-gaps pills + citation lines | «Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση)» · «Υπό αξιολόγηση» · «Υπό αξιολόγηση» | «Νομοθετική απαίτηση» · «Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση)» · «Υπό αξιολόγηση» · «Υπό αξιολόγηση» — the class stays in the pill, the citation wraps beneath it (Goal 1/2 fix for the 201px overflow at 320) |

Nothing in the agent book changed, and that is correct: the agent's visible policy carries no rule whose class changed in Goal 2; the newly legislative finding sits on the policyholder's own policy, which this agent cannot see.
