# R3 — the six leak sites, rendered before and after (PW-TRANSPARENCY-02)

Seeded customer wallet (`e2e-ph@policywallet.test`, three policies, one analysed motor policy with findings, every finding `under_review`) and the seeded agent book (`e2e-agent@`), 390px, Greek. Screenshots beside each JSON under `r3-before/` and `r3-after/`.

| site | before | after |
|---|---|---|
| 1. B2C hero open-recommendation count (`recommendation.openCount`) | 5 ευρήματα ίσως χρειάζονται έλεγχο | 4 ευρήματα ίσως χρειάζονται έλεγχο |
| 2. B2C attention list items (gap-derived recommendations included) | 3: Αναμονή για θεραπεία τη στιγμή που μετρά · Απώλεια του εισοδήματος από το οποίο εξα · Δεν καταγράφεται τηλέφωνο αναγγελίας ατυ | 3: Αναμονή για θεραπεία τη στιγμή που μετρά · Απώλεια του εισοδήματος από το οποίο εξα · Ζημιά σε ιδιόκτητο ακίνητοΣας ανήκει η κ |
| 3. Agent client card chip (`client.openGapCount`) | 5 ανοιχτά ευρήματα | not rendered (0 classified findings — the chip renders only above zero) |
| 4. Agent KPI «Με κενά κάλυψης» (agent portal service) | 1 | 0 |
| 5. Coverage-insights headline (/protection) | Εντοπίστηκαν 3 σημεία προς έλεγχο στα ασφαλιστήριά σας. | 3 σημεία υπό αξιολόγηση στα ασφαλιστήριά σας — δεν έχουν ταξινομηθεί ακόμη, οπότε δεν μετρούν ως ευρήματα. |
| 6. Findings-page summary band (`gap.underReviewCount` label) | no label (count unlabelled) | — εκ των οποίων 1 υπό αξιολόγηση, δεν έχουν ταξινομηθεί ακόμη |

The B2C gap tile said «not included in this summary» before and after (sealed by B3). The findings-page band keeps its total and is now LABELLED with how many of them are under review (the owner's correction: a count heading the disclosed section it describes is honest when labelled).
