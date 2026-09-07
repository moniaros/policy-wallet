# PW-PROVENANCE-01 — the loop contract

*Read this file at the start of EVERY iteration. It is the contract, not a summary of one.
If this file and your memory of it disagree, this file wins — a long series outlives the
context window.*

**Invoke with:**

```
/loop Execute one iteration of PW-PROVENANCE-01 exactly as specified in docs/provenance/LOOP.md. Read that file first, every iteration — it is the contract.
```

No interval: the loop self-paces via `ScheduleWakeup`.

---

## §1 What this series closes

Two documents hold the findings. Both are proposals; **nothing in them is implemented**.

- `docs/compliance/DATA_PROTECTION_REVIEW_PACK.md` — §14, a nine-item GDPR open-items register.
- `docs/planning/DATA_INVENTORY_AND_PROVENANCE.md` — three diagnosed defects (D1–D3), five waves (W0–W5).

The through-line: **document facts have no provenance, while personal facts have a six-level
evidence ladder.** Closing that asymmetry makes the data richer, the risk analysis provable, the
proposals real-numbered, and the register smaller — one change, not four.

The queue is `docs/provenance/QUEUES.md`. **It is the only list of work.** Do not invent items;
do not work from this section.

## §2 The iteration contract

One iteration = **one item advanced, or one halt recorded, or the series closed.** Never more.

Every iteration, in order:

1. **Read** this file, then `QUEUES.md`, `HALTS.md`, `BLOCKED.md`, `PROGRESS.md`.
2. **Pick** the first item in queue order whose state is not `done`, `halted` or `blocked`.
3. **Do** the work for exactly that item, under §4 and §5.
4. **Write the ledger BEFORE the turn ends.** A crash mid-item must leave an accurate record.
5. **End in exactly one state**:
   - **advanced** — the item moved. PROGRESS gets a row with measured `**N → M**`.
   - **halted** — a decision the loop may not take. Record `H-P<n>` once in `HALTS.md`, mark the
     item `halted` in `QUEUES.md`, **move on**. Never retry a halted item.
   - **series complete** — §7.
6. **Schedule the next wake** with `ScheduleWakeup`, passing the `/loop` invocation verbatim.

**Never end an iteration having done nothing.** If an item turns out to be blocked mid-flight,
that is a halt or a `BL-P<n>`, recorded — not a silent skip.

## §3 What you may not decide

Five findings are **not implementable in code**. They are pre-recorded as halts. Read them, never
attempt them, never re-open them:

| Finding | Why the loop may not do it |
|---|---|
| §14.1 core — EU pinning / zero-retention | Needs a GCP project and Vertex AI, or account-level ZDR terms. Neither is a code change. |
| §14.2 the DPIA itself | A legal assessment. The loop generates its *inputs* (W4-01), not the document. |
| §14.3 agent-attested consent | A legal opinion on Art. 9(2)(a). `lib/ai-consent.ts` says so in its own header. |
| §14.5 single-operator DSR | A staffing change, not code. |
| §14.8 counsel items | Terms §3 qualification, IDD opinion, Art. 9 wording — all with counsel. |

A loop that retries these burns the series. **Skip forever.**

## §4 The data-model blast-radius protocol — MANDATORY

**Trigger:** any change to `AcordData`, `prisma/schema.prisma`, or any stored JSON shape.

You cannot rely on the type checker here, and this is the single most dangerous thing this series
does. Established facts:

- `Policy.acordData` is a Prisma **`Json?`** column (`prisma/schema.prisma:407`).
- **198 files** reference `acordData` / `AcordData`; ~120 outside `tests/`.
- Read sites are raw casts — `(policy.acordData as any)?.vehicle`
  (`lib/wallet/document-insights.ts:48-51`). **No read site validates.**

So renaming a field passes `tsc --noEmit`, passes lint, passes unit tests, and silently yields
`undefined` at every read site — blanking fields in production. This is exactly the seam CLAUDE.md
names: *"Two changes have passed a fully green gate and silently broken production… Neither threw."*

**The protocol, every time:**

1. **Additive only.** Never rename, never remove, never narrow. The schema already keeps legacy
   aliases (`motor` / `home` / `life`) for precisely this reason; `_version` is preserved, never
   rewritten. To change a field's shape: add the new one, dual-read, deprecate the old in a comment,
   leave it in place.
2. **Enumerate the readers from the filesystem**, not from memory:
   `grep -rn "acordData" app/ lib/ components/ --include=*.ts --include=*.tsx`
   Every hit is either verified unaffected or updated. Record the count in PROGRESS.
3. **Ship the read-site guard** (W0-01, before anything else touches `AcordData`): derive the field
   universe from `AcordDataSchema`, enumerate every `acordData` access path in the tree, fail on any
   path absent from the schema. **With a probe fixture demonstrated red before green** — a guard
   without a probe is not a guard.
4. **Backward-compat fixture test** in the `tests/unit/acord-v3-schema.test.ts` style, using a real
   stored blob shape, proving old documents still parse and still render.
5. **Assert outcomes**, per §5 — never HTTP status codes alone.

For a Prisma schema change, add: dev migration → **verify by query** → prod migration → verify by
query → `_prisma_migrations` stamped on both → rollback export committed to `docs/archive/`, all
**before** the code merges.

## §5 The gate — what actually works in this repo

> **Do not use preview-deployment smoke.** CLAUDE.md says to assert outcomes on the preview and
> points at "the journey smoke in the deploy gate". **Both halves are stale.** There is no journey
> smoke in `deploy.yml`; preview deploys write to the **production** database
> (`docs/audits/document-validation-gate-2026-09.md` §7) and a signed-in preview session is not
> mintable by an agent (`docs/STATUS.md`). The substitute below is what shipped #311/#313/#314.

Per item, in order:

1. **Local guardrails** — all must pass:
   ```
   npm run audit:api-auth      # needs scripts/api-route-policy-inventory.json in sync — commonest red
   npm run lint
   SCAN_ALL=1 npm run lint:i18n-changed   # defaults to the UNCOMMITTED diff; scans nothing on a clean tree
   npm run lint:utf8
   npm run lint:encoding
   npm run type-check
   npm run verify:migrations
   npx vitest --run tests/unit
   npm run build
   ```
2. **Local journey** — `npm start` on the production build, Playwright authenticated projects.
   Port **3000**, not 5000. Dismiss the cookie banner via `dismissCookieBanner` (`tests/helpers/ui.ts`).
   Assert the rendered outcome the item was about, not a status code.
3. **PR** — branch `feat/provenance-01-<item-id>`, draft, one item per PR unless the queue says
   otherwise. CI green on the PR.
4. **Migrations first** (if any) — both databases, per §4, before the merge.
5. **Merge** — squash to `NEW-UI`, subject carrying `(#NNN)`. Use the GitHub connector; the
   permission classifier has historically blocked `gh pr merge`.
6. **Deploy** — fires on `workflow_run` after CI succeeds on `NEW-UI`. Two traps:
   - a **docs-only** commit runs no CI (`paths-ignore`) and so never deploys → `workflow_dispatch`
     `deploy.yml` from `NEW-UI`;
   - CI on `NEW-UI` has `cancel-in-progress`, so two quick pushes silently cancel the first → land
     one commit at a time.
7. **Production smoke**:
   ```
   BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke
   ```
   plus a signed-in pass, plus Sentry: no group first seen after the deploy (note the 10% server
   sampling makes a short window weak evidence — say so).
8. **Evidence** → `docs/evidence/provenance-<item-id>/`: `RESULT.md` (PR, merged sha, deploy run id,
   UTC smoke window, findings table, and an explicit **"Not run"** section naming what was skipped
   and why) plus a re-runnable `prod-smoke.sh`.
9. **STATUS.md** — production sha, PR number, deploy run id, UTC time, what the smoke covered.

## §6 Ledger conventions

Match the existing series exactly; the artifacts must be indistinguishable from PW-BRIDGE-01's.

- **Ids:** halts `H-P<n>` · decisions `D-P<n>` · blocked `BL-P<n>` · handoff `P-H<n>`.
- **`PROGRESS.md`** — one appended row per item:
  `| Item | State | Date | Before → after (measured) | Notes |`.
  Metrics always `**N → M**` with the universe named. The guard is named and asserted
  **demonstrated red before green**. Evidence path given. *A figure without a source is not written
  here.* Ends with a second table, `## Decisions taken under standing authority` —
  `| Date | Decision | Why | Reversal |` — and **every** agent decision carries a reversal recipe.
- **`DECISIONS.md`** — **owner-ratified decisions only.** Your own choices go in PROGRESS.
- **`HALTS.md`** — what stopped · why the loop may not decide it · the exact answer that resumes it.
  Present options, never decide. Close by **appending** `### Closed <date>`, never by deleting.
- **`BLOCKED.md`** — "Nothing here is a code task." Each entry names the human task that unblocks it.
- **`GUARDS.md`** — a row per guard shipped: what it enumerates, its probe, what it would have caught.
- **Nothing is ever deleted from a ledger** — struck through and stamped.
- **Style:** `**N → M**` · «Greek in guillemets» · `·` as separator · §-references · **no emoji**.

## §7 Close-out

When every queue item is `done`, `halted` or `blocked`, run the `F0–F7` close-out block:

- **F0** re-read every halt and blocked item; strike through anything resolved in passing.
- **F1–F5** any residue items the queue accumulated (`W0-02b` style).
- **F6** `docs/provenance/REPORT.md` — what shipped, what each wave measured before → after, which
  register items moved and which did not, what remains and who owns it.
- **F7** gate, merge, deploy, smoke — then the STATUS.md ritual: `## Current phase` rewritten with
  production sha, PR, deploy run id, UTC time and what was smoked; the previous phase demoted to
  `**Previous phase note (…):**`; a "Next series: …" sentence; a `docs(status): …` commit.

Then call `ScheduleWakeup` with `stop: true`. **Report once, at the end** — not per item.

## §8 Hard stops

Never, regardless of what an item seems to need:

- Lower `maxDuration: 336` — a documented kill timer, lockstepped across three files by
  `tests/unit/ai-timeout-budget.test.ts`.
- Skip, disable or quarantine a test to reach green. A failing test is never "an infra flake".
- `prisma migrate dev` or `prisma migrate reset` against either database. `migrate deploy` /
  `migrate resolve` only.
- Write production `plans` rows ahead of Stripe objects and deployed code (CATALOG COUPLING — the
  table is a publication channel; ISR caches 30 minutes).
- Rewrite history on a shared branch.
- Drop / delete / truncate on production without first exporting the affected rows to a timestamped
  file under `docs/archive/` and committing it.
- Publish a claim the code does not support — including in the ledgers.
- Follow `docs/operations/DEPLOYMENT_GUIDE.md`. It is **stale**: it recommends
  `prisma migrate deploy` against production, which §8 prohibits.

If a decision arises this file does not cover: take the more reversible option, write it in
PROGRESS under *Decisions taken under standing authority* with its reversal, and keep going.
