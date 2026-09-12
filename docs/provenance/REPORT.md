# PW-PROVENANCE-01 — close-out report

**Series:** provenance, minimisation and the register items of the data-protection review
(`docs/compliance/DATA_PROTECTION_REVIEW_PACK.md` §14). Contract: `docs/provenance/LOOP.md`.
Ledgers: `QUEUES.md` (state per item), `PROGRESS.md` (measured before → after, every agent decision
with its reversal), `GUARDS.md` (every guard, its universe, its probe), `HALTS.md`, `BLOCKED.md`,
`HANDOFF.md`. Evidence per item under `docs/evidence/provenance-<item>/RESULT.md`.

**Window:** 2026-09-07 (queue written) → 2026-09-12 (last merge). Sixteen queue items; every one
`done`. Five halts never attempted (§3). Two blocked items. Six handoff items for the owner.

**F0 pass (2026-09-12):** every halt re-read — none resolved in passing (all five are legal, staffing or
contractual, not code); `BL-P1` (the Cloudflare Workers check red on every commit) unchanged; `BL-P2`
(the PITR job against a real restore) opened by R-02. Nothing struck. **F1–F5:** the queue accumulated
no residue items — every `Wx-yyb`-style follow-up was folded into its item's HANDOFF row instead.

## 1. What shipped, in order, with its production deploy

| Item | PR → NEW-UI | Deploy run | Smoked (UTC) |
|---|---|---|---|
| W4-01 Art. 30 tags → generated ROPA + guard | #320 → `568fee72` | 34627851127 | 2026-09-11 17:3x |
| W4-02 DPIA input pack, generated + currency guard | #334 → `7f570f51` | 34631981624 | 2026-09-11 18:1x |
| W0-01 `acordData` read-site guard + five reader fixes | #335 → `d98bf51f` | 34637008142 | 2026-09-11 19:1x |
| W0-02 the probe's per-page text beside the verdict | #337 → `cb583bce` | 34641015833 | 2026-09-11 19:5x |
| W0-03 text-first extraction contract, flag-gated OFF | #338 → `1c8d98c2` | 34649883589 | 2026-09-11 21:3x |
| W0-04 the stored `acordData` envelope declared | #339 → `ef731076` | 34652505736 | 2026-09-11 22:1x |
| W1-01 citation fields cover every field the rules read | #340 → `b2449342` | 34653889271 | 2026-09-11 22:3x |
| W1-02 citations verified against the document's text | #341 → `691f8f24` | 34655235612 | 2026-09-11 22:5x |
| W2-01 three-state document evidence on every gap row | #342 → `2d920c95` | 34656525974 | 2026-09-11 23:1x |
| W2-02 the evidence floor; findings below it disclosed, never published | #343 → `b791fce8` | 34657928624 | 2026-09-11 23:29 |
| W5-01 named drivers: never asked for by name (additive) | #344 → `43d1f62b` | 34659023427 | 2026-09-11 23:47 |
| W5-02 beneficiary name list deprecated; count + relationship | #345 → `bf71ef69` | 34660011441 | 2026-09-12 00:02 |
| W3-01 needs against cover, provenance on both sides | #346 → ``e3eac9ee`` | `34661939756` | `2026-09-12 00:35` |
| R-01 passkeys as a second factor, OFF by default | #347 → ``1813dcf1`` | `34662816082` | `2026-09-12 00:52` |
| R-02 PITR re-erasure as a daily job | #348 → ``6d4ac289`` | `34663722041` | `2026-09-12 01:09` |
| R-03 breach runbook, register, first (tabletop) drill | #349 → `d6afd586` | `34664531255` | `2026-09-12 01:25` |

Every deploy was smoked anonymously (Playwright `public-anon prod-smoke` 2/2, eight public routes
200 in Greek, three authenticated routes 307, no Sentry group first seen after the deploy). No
signed-in production pass was possible (BL-C2: no browser session on the agent's machine); every
RESULT.md says which outcome that leaves unobserved.

## 2. What each wave measured (before → after)

- **W4 (the record).** Personal-data models with a recorded purpose and lawful basis: **0 → 57**
  of 87, derived from `prisma/schema.prisma`; generated compliance documents whose currency CI
  enforces: **0 → 2**. `unclear` is a legal value, printed as an open question.
- **W0 (the stored shape).** `acordData` read sites checkable against the schema: **0 → 424**
  (188 → 237 schema paths once the envelope was declared). Found live: every production policy
  showed an empty insurer tile (`policy.insurer`, a key the pipeline never wrote). Text-first
  extraction: **3 of 3** providers decide in one place; the flag ships OFF because quality on real
  Greek schedules is unmeasured.
- **W1 (citations).** Fields a rule reads that the extraction is asked to cite: **0 → 34 of 34**.
  Citations that state whether the document contains their snippet: every one on a text-native
  PDF, refuted only within the pages actually read.
- **W2 (evidence-gated rules).** Gap rows recording per-field document evidence: every row written
  after the deploy. Active definitions with a resolved evidence floor: **50 of 50**. **The visible
  consequence:** every live production finding demotes to «Ευρήματα χωρίς επιβεβαίωση από το
  έγγραφο» until its policy is re-analysed with confirmed citations (P-H3, no grandfathering).
- **W5 (minimisation).** Third-party fields the model is ASKED for per named driver: **2 → 0** on
  both arrays; the beneficiary name list: **1 → 0**. Keys stay declared, DEPRECATED, dropped from
  the prompt block (LOOP §4: a stored shape is never narrowed) — deleting them is the owner's.
- **W3 (needs vs cover).** Checks comparing a document limit to a profile need: **0 → 1** pair;
  the (6 × 3) evidence matrix asserts that only a stated need against a confirmed cover publishes.
  Every live comparison is a question today: no production citation carries `verified` yet.
- **R (register).** Passkey routes: **0 → 6**, the second factor gating **18 of 18** route patterns,
  OFF by default. Automated post-restore re-erasure: **0 → 1** job. Breach procedures: **0 → 1**
  runbook, a register with its first (drill) row, **27 of 27** cited references resolving.

## 3. Register items moved, and not moved

| Pack § | Finding | Now |
|---|---|---|
| 14.1 | EU pinning / zero-retention | **Halted (H-P1)** — not code. What moved: the DPIA pack pins each AI client's constructor (`apiKey` only), and text-first extraction can stop the whole file leaving (flag OFF). |
| 14.2 | No Art. 30 record; no DPIA | **Record generated and guarded**; DPIA inputs generated. The DPIA itself: halted (H-P2), counsel's. |
| 14.3 | Agent-attested consent | Halted (H-P3). |
| 14.4 | No 2FA / passkeys | **Implemented, OFF** (R-01). The owner turns it on (P-H6). |
| 14.5 | Single-operator DSR | Halted (H-P4); the breach runbook is written for that operator. |
| 14.6 | PITR resurrects erased data | **Automated** (R-02); not exercised against a real restore (BL-P2). |
| 14.7 | No breach runbook / drill | **Runbook + register + tabletop drill** (R-03); rotation and notification simulated — annotated, not closed. |
| 14.8 | Counsel items | Halted (H-P5). |
| D2/D3 (plan) | Names no rule reads; readers no schema checks | **Minimised additively; every read site guarded.** |

## 4. What remains, and who owns it

- **Owner** — HANDOFF `P-H1`…`P-H6`: the five halts; the demotion of live findings on /protection
  (observe it, decide the re-analysis order); delete or keep the DEPRECATED driver keys (P-H4);
  beneficiary names as a product promise (P-H5); turn passkeys on and enrol with two authenticators
  (P-H6). Plus: set `EXTRACTION_TEXT_FIRST=1` when ready to measure text-first quality.
- **Blocked** — BL-P1 (a Cloudflare Workers check that is red on every commit), BL-P2 (the PITR job
  against a real restore rehearsal).
- **Not built, by design** — a `need_vs_limit` engine operator (D-P38: the engine is owner-frozen);
  recovery codes (D-P41); a new evidence rung for unconfirmed document figures (D-P39).

## 5. Traps this series recorded for the next one

A red CI gate silently skips the deploy (and a GitHub runner SIGSEGV is a second way it fires); a
conflicting PR gets no CI run at all; every docs push to NEW-UI conflicts every open ledger PR — merge
NEW-UI in just before merging, in a throwaway worktree; a squash's identical content still conflicts
on the ledgers; the ledger resolver must know which side is the landed truth; `.next/types` from
another branch's build fails `tsc` on this one; the read-site guard cannot see a reader that goes
through the domain type; the amount-completeness guard treats a head count as an amount; LOOP §4
means additive even when the blast radius is provably zero.
