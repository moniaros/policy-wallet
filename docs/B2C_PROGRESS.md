# B2C_PROGRESS — Grafí application-tier rebuild ledger

Run started 2026-08-30 on `feat/grafi-b2c` (worktree `/private/tmp/pw-cutover/grafi-app`, base `NEW-UI@abb1d46f`).
One row per goal, written at the start and the end of each. Goals served = the seven strategy goals
(1 Understand · 2 Protect · 3 Prioritise · 4 Monitor · 5 Adapt · 6 Household · 7 Act).
Plan of record: the approved execution plan (2026-08-30); assumptions in `docs/ASSUMPTIONS.md` A-09+.

| id | goal | status | artefacts | goals served (1–7) | assumptions |
|---|---|---|---|---|---|
| G0 | Audit | **DONE** | `docs/audit.md` § G0 B2C: 14 findings re-verified on :3100 (2 WRONG/STALE, 4 PARTLY, rest CONFIRMED — six severity vocabularies, badge 22, 27 uppercase labels on /protection, zero landmarks there); route table + 301 map; model inventory; before-screens in `docs/screens/before/` | 1 | A-09…A-22 |
| G1 | Single sources | pending | `lib/app/*` typed modules + tests; migration (Finding, HouseholdPerson, AdviserShareAudit, DocumentAiConsent); DSR wiring | 1,2,3,6,7 | A-11, A-12, A-13 |
| G2 | Tokens (app tier) | pending | `tokens/*.json` app roles, `app/grafi.css`, contrast matrix, Commissioner, raw-hex lint | 1 | A-09, A-10, A-21 |
| G3 | Shell | pending | `src/design-system/shell/*`, `lib/app/navigation.ts`, policyholder shell mount | 1,3 | A-20 |
| G4 | Primitives + layout | pending | `src/design-system/*` primitives + layout, `/styleguide` gallery | 1 | |
| G5 | Product components | pending | `src/design-system/product/*` + tests | 1,2,3,4,5,6,7 | A-12 |
| G6 | Voice system | pending | `docs/voice.md`, `app` catalogue namespace, `formatPlural`, `lint:voice` | 1 | |
| G7 | `/` | pending | `app/(protected)/home`, proxy rewrite + 301s, fold test, screens | 1,2,3,4,5,6 | A-13, A-16 |
| G8 | `/see` `/policies` `/policies/[id]` | pending | three routes + 301s; skeletons; section-budget tests | 1,2,3,7 | A-18 |
| G9 | `/money` `/updates` | pending | two routes; streams + badge; dedupe fix | 1,4 | |
| G10 | Adviser + help flow | pending | `/adviser`, `/adviser/help/[findingId]`, share audit | 7 | A-14 |
| G11 | `/me` + household + ledger | pending | `/me/*`, `HouseholdPerson`, ledger projection | 4,6 | A-11 |
| G12 | `/add` + life events + `/welcome` | pending | Article 9 per-document gate, life-event delta, welcome | 1,5 | A-14, A-15 |
| G13 | Logic + regulatory gates | pending | §9 unit tests; §10 gate tests with probes; flags; analytics events | — | A-19 |
| G14 | Hostile review + handover | pending | three reader passes; a11y/perf/contrast/product-evolution/handover docs; PR | — | A-17, A-20 |

## Decisions taken (standing authority — CLAUDE.md)

- D-B2C-01 (G0): the per-policy «healthScore» donut (`components/wallet/policy-detail/SummaryCard.tsx`) is removed with the rebuild of `/policies/[id]`. No owner halt covers it (H-001 = portfolio score, H-005 = «Πόσο καλά σας γνωρίζουμε»); the brief's §3/§10 «never a score» rule is the basis. Reversible: the component and `PolicyHealthScore` stay in git history.
