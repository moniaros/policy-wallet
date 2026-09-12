# PW-PROVENANCE-01 — blocked

Each entry names the exact human task that unblocks it. **Nothing here is a code task.**
A blocked item waits on a fact or an action; a *halt* waits on a judgement (`HALTS.md`).

| Id | What | The human task that unblocks it |
|---|---|---|
| BL-P1 | **The `Workers Builds: policy-wallet` check is red on every commit and always will be.** A `policy-wallet` Worker exists in the Cloudflare account (tag `2fb9c43a20894c1aa2a901a5127c9468`, created 2026-06-28) with a git integration onto this repo. The repo contains **no** Workers project — no `wrangler.*`, no `open-next.config.ts`, no `@cloudflare/*` or `@opennextjs/cloudflare` dependency — so the build has nothing to produce and fails deterministically. Verified red on merged #316 and on every commit of #317. It is not caused by any diff and cannot be fixed from the repository. | **Owner, in the Cloudflare dashboard:** Workers → `policy-wallet` → Settings → git integration → disconnect (or delete the Worker). The instruction is also in `docs/operations/DEMO_DEPLOY_RUNBOOK.md`. Until then every PR carries one permanently-red check, which trains reviewers to ignore red. |
| BL-P2 | `R-02` — the PITR re-erasure job has not run against a real restore: none has happened, and rehearsing one means restoring production (or a branch of it) to a point in time, which is the owner's operation. The job's own logic is guarded on fixtures; its day-to-day production state is `no_restore_point`. | Owner: at the next restore rehearsal, set `PITR_RESTORE_POINT` to the rehearsal's target instant, run `POST /api/v1/jobs/pitr-re-erasure` as an admin, and attach the `job_runs` row to the DSR evidence doc. |
