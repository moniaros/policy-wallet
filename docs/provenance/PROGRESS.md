# PW-PROVENANCE-01 — progress ledger

Appended after every item (`LOOP.md` §2). Before/after figures are measured; **a figure without a
source is not written here**. Every guard is named and asserted demonstrated red before green.

| Item | State | Date | Before → after (measured) | Notes |
|---|---|---|---|---|
| — | — | — | — | *Series opened 2026-09-07. No item started.* |

## Decisions taken under standing authority

Agent choices, each with the recipe that reverses it. Owner-ratified decisions live in
`DECISIONS.md`, not here.

| Date | Decision | Why | Reversal |
|---|---|---|---|
| 2026-09-07 | **Queue order W4 → W0 → W1 → W2 → W5 → W3.** W4 first though it is not the largest finding. | W4 touches no runtime path, is self-contained, and closes a High register item (§14.2 Art. 30). W3 last because it depends on every wave before it. | Re-order `QUEUES.md`; no code depends on the order. |
| 2026-09-07 | **W0-01 (the `acordData` read-site guard) is a blocking prerequisite** for every item touching `AcordData`, ahead of the keystone W0-02. | 198 files reference `acordData`, ~120 outside tests, all through `(x as any)?.field` against a Prisma `Json?` column — `tsc` catches nothing. Shipping a shape change before the guard is the documented "green gate, broken production" seam. | Drop the prerequisite in `QUEUES.md` if the guard proves unbuildable; then every W item carries a manual enumeration in its PROGRESS row instead. |
