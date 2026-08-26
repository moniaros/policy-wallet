# P5-hygiene-00 — loose ends in the measurement record

## 1. The two policies deleted from the dev DB — NOT RECORDED, and not recoverable

**No record exists.** `QUEUE.md`, `PROGRESS.md`, `DECISIONS.md` and the wallet evidence files
contain no mention of which two policies the `P5-wallet-00` agent deleted, and the agent's report
did not enumerate them. A database snapshot cannot answer it retroactively: it shows the current
set, not what was removed, and no soft-delete or audit row covers fixture policies.

**This is the finding, not an aside.** A fixture applier that DELETES must log what it deleted, in
the evidence file, at the moment it does it. `applyVariedHouseholdFixture` and
`applySingleLineConcentrationFixture` each clear both `WH-VARIED-` and `WH-CONC-` prefixes — that
double-clear was itself added to fix a contamination bug — and neither records the rows it removes.
The next agent to ask "what state was this baseline taken against?" hits the same wall.

**Reproducibility of `typical` and `all-expired` — determination deferred, deliberately.** The
question is answerable only against a settled database, and at the time of writing a capture run
holds the fixtures: `e2e-ph-dash` currently carries 3 `WH-CONC-` motor policies, which is
`single-line-concentration` applied mid-run, not a resting state. Recording a mid-run snapshot as
the baseline state is exactly the error that produced the 13-row capture describing neither
fixture. Resolve once `P5-wallet-01a-FINISH` lands.

## 2. `evidence/wallet/` vs `evidence/wallet-list/` — not a fork, a naming collision

Both directories are legitimate and neither supersedes the other. They measure the **same surface
on different axes**, and the capture names make it unambiguous:

| Directory | Captures | Axis | Question it answers |
|---|---|---|---|
| `evidence/wallet-list/` | `populated-free`, `populated-paid` × 320/390/430 | **entitlement tier** | Phase-0 baseline of `/wallet` |
| `evidence/wallet/` | `heavy`, `typical`, `all-expired`, `varied-household` × widths | **portfolio fixture** | Phase-5 duplicate-identity work |

**Canonical for the identity work: `evidence/wallet/`.** `wallet-list/` is a Phase-0 tier baseline
and must not be extended with fixture captures, nor read as though its numbers are comparable with
the identity series — different fixtures, different question, and captured before the collector fix
(see D-036's discontinuity note).

## 3. `dashboard-wallet-identity-duplicates.spec.ts` in `measure-dash` — correct, and deliberately so

Not a discrepancy. `playwright.config.ts` isolates it on purpose, and the reason is written at the
project definition: the spec **mutates the wallet between captures**, so running it against the
shared policyholder would destroy the policy-detail fixtures. It therefore runs:

- project `measure-dash`, `testMatch: /tests\/measure\/dashboard.*\.spec\.ts/`
- storage state `playwright/.auth/dash.json` → user `e2e-ph-dash`
- while project `measure` explicitly **excludes** filenames containing `dashboard` or `free`

The isolation is what keeps the two fixture families from colliding. Leave it alone.

## 4. The stall rule — present, and now complete

`PROGRESS.md` already carried "do not background a Playwright run and then wait on it", foreground
one spec, and report-rather-than-retry on contention. Added in this item:

- **the escalation ladder** — two stalls escalates, three halts the item;
- **never route around a wedged pooler** via transaction mode (6543), because different semantics
  produce a capture that is not comparable with every prior one;
- **the wedge does not look like exhaustion** — the 2026-08-26 signature was a generic Prisma pool
  timeout with a healthy database (3 upstream connections against max 60), not `EMAXCONNSESSION`;
- a correction to the harness description, which still described the pooler lock as living in
  `surface-harness.ts` and being *exported* — the version that was never called.

## 5. The repeated failure shape

Written to `PROGRESS.md` ("A fix scoped to the callers you knew about is not a fix"). Its home is
`CLAUDE.md` and the `AGENTS.md` mirror, and it is **deliberately not there yet**: a parallel session
holds an uncommitted rewrite of both files (107 insertions, 111 deletions). Appending mid-rewrite
would be clobbered or would sweep another session's unfinished work into this run's commit. Move it
to **both** files once that lands.
