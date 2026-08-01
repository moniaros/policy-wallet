# PolicyWallet — Project Status

> **Full record of the 2026-07-28/29 UI audit:**
> [audits/UI_AUDIT_2026-07-29.md](audits/UI_AUDIT_2026-07-29.md) — what was
> found, what was fixed, what still needs doing, and the five corrections where
> my own tooling was wrong rather than the product.

## Gap-report content gaps (Sentry POLICYWALLET-7) — 2026-08-01

**Broken (user-visible), now fixed.** Three gap definitions live in the production
database with no `GAP_CONTENT_MAP` entry — `no-glass-breakage` (motor), `own-damage-gap`
(motor), `preventive-care-gap` (group_health). All three had live gap instances, so real
customers read a **generic Greek fallback heading instead of the actual finding**; the only
signal was a Sentry warning firing since 14 Jul (68 events).

- **Not a slug-convention bug.** The prod dump looks like a snake/kebab mismatch, but
  `normalizeGapSlug` already folds `_`→`-` and all 35 other prod slugs resolve. The three
  are genuinely absent from the map.
- **Why no test caught it:** they exist *only* in the database — not in `prisma/seed.ts`,
  not anywhere in the repo. They were created straight against the DB, so no repo-level
  assertion could have seen them.
- **Second, quieter defect:** two of them duplicate a concept whose twin definition also
  fires (`no-glass-breakage`≈`glass_breakage`, `own-damage-gap`≈`own_damage`/
  `own_vehicle_damage`), so those policies rendered **two cards for one finding**. Giving the
  new entries the existing `concept` (the `windscreen`→`glass-breakage` alias pattern) fixes
  the heading and the duplicate in one move. `preventive-care-gap` is genuinely new content,
  deliberately NOT folded into an unrelated concept just to silence the warning.
- **Guard against the next one:** `/admin/gaps` now shows a "no content entry" badge per
  definition. It uses a **pure map lookup, not `resolveGapContent`** — that function reports
  unknown slugs to Sentry as a side effect, so an admin opening the page would otherwise
  manufacture the very warning the badge surfaces.
- Regression tests pin all three as `known` and pin the concept collapse. 2749 unit tests +
  full gate + build (exit 0) green.
- **Left for the owner, deliberately:** the duplicate gap *definitions* themselves are still
  active in the DB. Deactivating them changes detection behavior for real policies — an
  owner call, not a side effect of a content fix. `/admin/gaps` is where to do it.
  Recommended first step: compare the twins' `detectionLogic` before touching anything — if
  the logic differs they are not true duplicates, and deactivating one would silently drop a
  real check.
- **DEPLOYED** as release `f69f4363` (auto-deploy run #9). `POLICYWALLET-7` resolved in
  Sentry so a recurrence arrives as a **regression** — which would mean a new unmapped slug
  was added straight to the database. Honest caveat recorded on the issue: the fix is
  verified *by construction* (map entries + regression tests), not by observed silence —
  `/wallet/[id]` traffic is sparse (68 events over 18 days, once per process per slug), so a
  quiet window proves little on its own.
- `POLICYWALLET-G` (Upstash) also resolved, for the same tripwire reason.

**Follow-up (same day): the "DB-only" definitions are AI-minted — and they feed back into
prompts.** Comparing the twins' `detectionLogic` before deactivating (the recommended first
step) found all five rows carry `{"source":"ai_clarity_pipeline"}` and **no check logic at
all** — nobody hand-created them. The orchestrator auto-upserts a `GapDefinition` for every
slug the clarity pipeline emits (`policy-analysis-orchestrator.service.ts:2625`/`:2708`),
with `description: "Auto-created from AI clarity analysis"`. The sting is the feedback loop:
`getGapDefinitionsForPolicy` (`:2394`) feeds every active definition into the deep
gap-detection prompt, using that junk description as the `checkCriteria` fallback — so each
slug the AI invents becomes a **permanent extra check in every future prompt for that LoB**,
which `GAP_RESULT_RULES` then forces the model to evaluate. Prompt bloat that only grows.
- **Done (prod, `changed_by='ops-dedupe-2026-08-01'`, version-bumped):** deactivated
  `no-glass-breakage`, `own-damage-gap`, and `own_damage` (keeping `own_vehicle_damage`, the
  higher-severity twin of the same concept). Nothing real was lost — none carried logic.
  Display-safe by construction: instance rendering filters on instance `status` only, never
  definition `isActive`, so existing gap cards keep rendering with the new content entries.
  Motor's deep prompt drops from 8 checks (3 redundant) to 5 distinct. Dev had none of
  these rows (they were minted by prod traffic).
- **Root cause FIXED (same day):** the auto-mint feedback loop is closed with two guards in
  the persist loop. (1) **Canonicalize before minting** — new pure
  `pickCanonicalGapDefinition` (lib/wallet/gap-report.ts) concept-matches each emitted slug
  against ALL of the LoB's definitions (active + inactive — filtering to active would
  re-mint the moment an admin deactivates a duplicate), preferring active then earliest
  `createdAt`; a vocabulary variant attaches its instance to the original row and mints
  nothing. Slug spellings stay as they are — matching happens at concept level, so the
  snake/kebab trap flagged earlier is sidestepped rather than migrated. (2) **Mint
  inactive** — a genuinely novel concept still gets a definition and a rendered instance
  (rendering ignores `isActive`), but joins prompts only when an admin activates it in
  `/admin/gaps`, where the "no content entry" badge flags it for a content entry at the
  same time. Plus: `gapRows` deduped by `definitionId` (no DB unique protects
  (policyId, gapDefinitionId); gap_detection wins over clarity since it populates the map
  first), and the dead active-minting `ensureGapDefinition` (zero callers) is deleted.
  Pinned by `tests/unit/gap-automint.test.ts` (mutation checks: reverting to
  `isActive: true` or filtering the lookup to active fails) + 5 helper cases in
  `gap-report.test.ts`. 2759 unit tests + full gate + build exit 0.
  Post-deploy watch signal: `SELECT count(*) FROM gap_definitions WHERE
  detection_logic->>'source'='ai_clarity_pipeline' AND is_active=true` stops growing.

**Also verified this pass:** production holds **0 opportunities**, so the MEDDIC
pipeline-memory code merged below is correct but *inert* — there is nothing to live-verify
until an agent has real deals.

## MEDDIC readiness review → opportunity pipeline memory — 2026-08-01 — merged into `NEW-UI`

Merged `claude/meddic-policywallet-crm-gqqcos` (2 commits, forked at `307f04f3`).
The full review is [audits/meddic-readiness-2026-07.md](audits/meddic-readiness-2026-07.md); the
short version is that **the finding, not the feature, was the deliverable**: MEDDIC is a poor fit
here — no buying-committee entity exists to hang an Economic Buyer or Champion on, deals are an
order of magnitude too small (reference deal €104.87), and commercial lines are largely a
marketing veneer (4 of 15 B2B branches `writeEnabled`). What shipped instead is the prerequisite
under either direction — the pipeline's missing memory:

- Append-only `OpportunityStageHistory`: stage changes were destructive overwrites, so
  `open→quoted→lost` and `open→lost` were indistinguishable and time-in-stage / funnel velocity
  were impossible **and unbackfillable**.
- Structured close on `Opportunity` (`outcome`/`outcomeNotes`/`outcomeAt`, the `PolicyRenewal`
  shape) with `outcomeAt` as the immutable close date; `Proposal.declineReason/declineComment/
  counterOfferNotes` persist a taxonomy the UI always collected and threw away.
- Proposal acceptance closes the deal in flight instead of creating a duplicate WON row; the
  commissions trend buckets on immutable dates, so editing a note no longer relocates revenue.

**Merge notes (4 conflicts, all from the 662-commit gap since the fork):** `prisma/schema.prisma`
and `app/(protected)/agent/actions.ts` were additive on both sides — kept both (the Phase 1 scan
guard/metering and the lifecycle helpers coexist). `OpportunityUpdateModal`'s `onUpdate` gained
the branch's 5th `outcome` param while keeping this line's `onMedicChange` callback. This file
kept the NEW-UI structure rather than the branch's older `## Done (recent)` block.

**DEPLOYED** 2026-08-01: merge commit `8d510bad` on `NEW-UI` → CI green → auto-deploy run #8
(`policy-wallet-5bwpmpa4w…`), the first release to ship through the repaired pipeline without a
manual `vercel --prod`. No new Sentry issues in the 2h after. **Not yet live-verified:** a stage
row actually being written on a close, and the proposal accept/decline paths end to end — worth a
manual pass on `/opportunities`, since no production traffic has exercised them yet.

**Migration applied before merge** (the deploy.yml contract): `20260801120000_opportunity_lifecycle_history`
is live on prod (`cquudefwfwrmvpftuhyl`) and dev (`lzqvtvjggylcujenlelh`) via the Supabase MCP path
— table + 3 opportunity columns + 3 proposal columns + 3 indexes + `_prisma_migrations` rows, all
verified. The SQL is additive and idempotent (`IF NOT EXISTS` throughout).

## Admin AI control panel (Phase 6) — 2026-07-31 — branch `claude/nifty-tesla-m80f2p`

Admins can now monitor usage, choose the models each operation runs on, and
edit the prompt content used per line-of-business analysis — three CI-green
commits on top of the Phase 1–5 multi-model system. Not yet deployed.

- **`/admin/gaps` (6a):** editor for `GapDefinition` — the `detectionLogic.check`
  text is per-LoB prompt content fed verbatim into the gap-analysis prompt.
  Wraps the previously ORPHANED versioned `updateGapDefinition` action; edits
  are uncached and apply to the next run. Save-time policy via the new shared
  `lib/services/ai/prompt-policy.ts` (`validateOperatorGuidance`): rejects
  advice language (EN+EL — `ADVICE_LANGUAGE` moved here, the eval scorer
  re-imports it), persona overrides («ασφαλιστικός σύμβουλος» is a licensed IDD
  role), reserved spotlight delimiters, and injection-scoring hits.
- **`/admin/ai/settings` (6b):** runtime model config. New `AiRuntimeConfig` +
  revision table (migration `20260731090000_ai_runtime_config`); rows are
  binary — `auto` (pure env) or fully pinned provider+model. Cached reader
  (`runtime-config.ts`, tag `ai-runtime-config`, never throws → env behavior).
  Precedence: explicit `req.provider` (failover ladder) > per-operation pin >
  primaryProvider pin > env; a pinned model applies ONLY when its provider
  matches the resolved provider, so failover never sends a model name to the
  wrong vendor. Threaded through the gateway, orchestrator (createRun + step
  attempts), quick extract route and batch translator (gemini-only row).
  Save-time: missing-API-key provider blocked; unknown-to-TOKEN_COSTS model
  warns. Writes are versioned + audited (`UPDATE_AI_MODEL_CONFIG`) and
  revalidate the tag, so pins land on the next request.
- **`/admin/ai/prompts` (6c):** operator-guidance overrides. New
  `AiPromptOverride` + revision table (migration
  `20260731120000_ai_prompt_overrides`; `lineOfBusiness` sentinel `__global__`,
  unique per (operation, LoB)). Guidance is **additive only** — rendered under
  an "OPERATOR GUIDANCE (…supplements but never overrides the rules above)"
  label after the canonical task rules, BEFORE the `<untrusted_policy_data>`
  envelope, in all five builders; it can never replace the test-enforced
  informational-assistant persona (validated at save, delimiters re-stripped at
  render). Resolution: exact (operation, LoB) → global → none; the deep
  pipeline resolves with `policy.lineOfBusiness`, Q&A passes the policy's LoB,
  risk and the quick extract use global-only. Cached reader
  (`prompt-overrides.ts`, tag `ai-prompt-overrides`, never throws).
- **Monitoring:** `/admin/ai` gained Active configuration (per-op
  provider/model + env-default vs admin-override source), Prompt overrides
  (identity only — never guidance text on the dashboard), and Usage by line of
  business (raw `token_usage JOIN policies` aggregate; policy-linked rows
  only). `/api/admin/ai-performance` returns the extended snapshot; no new API
  routes, so the auth inventory is unchanged.
- **Migrations APPLIED to both DBs (2026-07-31, Supabase MCP path):**
  `20260731090000_ai_runtime_config` and `20260731120000_ai_prompt_overrides`
  are live on PolicyWallet-Prod (`cquudefwfwrmvpftuhyl`) and dev
  (`lzqvtvjggylcujenlelh`) with matching `_prisma_migrations` rows carrying the
  migration files' real sha256 checksums. Verified on both: 4 new tables, 5 new
  indexes (incl. the unique `(operation, line_of_business)` key), 0 rows —
  every operation still resolves to env defaults until an admin pins one. The
  app code itself is on branch `claude/nifty-tesla-m80f2p`, not yet deployed.
- **Validation loop:** the admin UIs point at `npm run eval`
  (`EVAL_ALLOW_PAID=1` for real providers) to compare scores before/after a
  model pin or guidance change. ~35 new unit tests across prompt policy,
  reader/precedence contracts, admin parse rules, write-path source
  assertions, and prompt-position/wiring guarantees.
- **Promoted to `NEW-UI` (2026-07-31):** fast-forward `09a61f6a → 86634bb`,
  CI green on NEW-UI (run #542); the Vercel git integration built this exact
  commit successfully as a preview. **Auto-deploy rewired:** `deploy.yml` now
  fires on CI success on `NEW-UI` (was: the stale, diverged `main` — 5 runs,
  all failures, none since February) and deploys the CI-validated sha via
  `vercel --prod`. It no longer runs `prisma migrate deploy` (impossible
  through the pooler, P1017 — schema ships via the Supabase MCP path BEFORE
  merge, as recorded above); it preflights the `VERCEL_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets and fails with a named list
  if any is missing. Manual redeploys: workflow_dispatch from NEW-UI only.
- **DEPLOYED + auto-deploy proven end-to-end (2026-08-01):** production is
  `NEW-UI` @ `1c8a83ac` (deployment `policy-wallet-mstfc5x2r…`, run
  30678756560 green). Getting there surfaced two pipeline defects, both
  fixed: (1) the three `VERCEL_*` repo secrets had never existed — the
  cause of every historical deploy.yml failure; owner added them
  (`VERCEL_ORG_ID = team_QzKsHlvajknceItFyQlikMk2`, project id of the
  `policy-wallet` project, team-scoped token). (2) `amondnet/vercel-action@v25`
  pins Vercel CLI 25.1.0 (2021), whose project-settings call no longer
  resolves against today's API ("Could not retrieve Project Settings" even
  with correct IDs) — replaced with a direct `npx vercel@latest deploy
  --prod --yes` step (Vercel's documented CI pattern; same contract as the
  old manual `vercel --prod` flow). From here on, every CI-green push to
  NEW-UI deploys production automatically — the manual CLI step is retired.
  Note for sandboxed sessions: policywallet.gr is not reachable through the
  CCR egress proxy (403) — verify deploys via the workflow job log /
  deployment URL, not by curling the apex.

## Multi-model AI system: guardrails, routing, fallbacks, observability, evals — 2026-07-30 — branch `claude/nifty-tesla-m80f2p`

Built the multi-model AI system in five CI-green commits. Each phase passes the
full gate (audit:api-auth, lint, i18n, utf8, encoding, type-check, unit tests,
build). Not yet deployed.

- **Broken/insecure (now closed):**
  - **Zero-cost input guard** (`lib/services/ai/guard.ts` + `guard-patterns.ts`):
    deterministic, pre-LLM length caps + bilingual (EL/EN) prompt-injection
    scoring + control/zero-width/bidi sanitation. High-confidence injections
    block for €0 and write an `AI_INPUT_REJECTED` audit row (metadata only — no
    raw text, no email); medium signals flag-and-log (`AI_INPUT_FLAGGED`).
  - **Metering/backstop parity on every billable path.** Closed the three
    off-the-books spenders (`extractBasicSummary`, the legacy
    `/api/policies/extract` route — now migrated onto `getAIService()`, and the
    batch translator). Q&A gained a length cap + injection guard + rate limit;
    the agent scan gained an `AGENT_POLICY_SCANNED` audit row + DB backstop
    (the STATUS-flagged live money exposure). Every backstop is DB-count-based,
    so it holds even with prod's `RATELIMIT_ALLOW_LOCAL` / no Upstash.
  - **Prompt spotlighting**: extracted policy data is fenced in
    `<untrusted_policy_data>` with a "data, not instructions" directive and
    forged delimiters stripped — closes the poisoned-PDF indirect-injection
    channel. Scoped to document data only, to keep the MEDIC reuse of
    `buildQaPrompt` working.
- **Routing:** `lib/services/ai/model-router.ts` reworked into a per-call
  `resolveRoute` (deterministic tier table → provider + model + output cap) +
  `selectPrimaryProvider`; a new `gateway.ts` is the chokepoint for the
  interactive paths (Q&A, risk). Fixed the dead code: `analyzeRiskProfile`
  ignored `modelOverride` in all three providers; Gemini Q&A ignored it too and
  set no output cap; the orchestrator hardcoded `provider:"gemini"` and coerced
  Anthropic back to Gemini. **Behavior-neutral under the default env** — the two
  wired paths resolve to today's models at every tier; pro-tier deep-pipeline
  upgrades are tested but deferred until evals can validate them.
- **Fallbacks:** per-provider fallback models (`CLAUDE_MODEL_FALLBACK`,
  `OPENAI_MODEL_FALLBACK`) — Claude/OpenAI previously had none. In-process
  circuit breaker (`provider-health.ts`, per-instance, same serverless caveat as
  the incident cooldown). Anthropic is now a first-class primary via
  `AI_SERVICE_TYPE`. The remediation ladder itself is untouched.
- **Observability:** `/admin/ai` performance dashboard + snapshot service
  (`lib/services/ops/ai-performance.service.ts`) + guarded API
  (`/api/admin/ai-performance`). Success rate, degraded/failed/blocked, failure
  and remediation mix, p50/p95 step latency, cost/operation, **routing
  distribution** (truthful now the model field is real), and **blocked-attack
  counts** from the Phase-1 audit rows. All from already-persisted data; no
  migration. Aggregate ops metrics, not an advice surface (no AiDisclaimer).
- **Evaluation:** `evals/` — TS golden datasets (extraction/gaps/qa), pure
  scorers (field accuracy / gap recall+precision / Q&A compliance incl. an
  advice-language ban), and `evals/run.ts` (`npm run eval`). **CI runs only the
  deterministic pieces**: `tests/unit/eval-scorers.test.ts` (in the unit suite)
  and the mock harness (`npm run eval:ci`). Real providers are **refused unless
  `EVAL_ALLOW_PAID=1`**, so CI can never spend money.
- **Standing owner dependency (unchanged, not code):** production Upstash Redis
  is still unprovisioned (`RATELIMIT_ALLOW_LOCAL=1`), so Redis limits remain
  per-instance. The new DB-count backstops make every billable AI path
  instance-independent regardless; non-AI limits (auth, contact, invites) stay
  weakened until Upstash lands.
- **Deliberately deferred (not broken):** enabling pro-tier premium models on
  the deep pipeline (extraction/gaps/clarity) — the router supports it and it is
  unit-tested, but flipping it in production should wait for a golden-set eval
  run on real providers. An optional LLM-judge for clarity/QA quality is noted
  but not built.

## Insurer data verified against the Bank of Greece register — 2026-07-30

Checked the catalog against the BoG register of (re)insurance undertakings
(all 988 entries; the per-undertaking record carries registered seat,
telephone, email, website, LEI and licence status — it verifies far more than
the "legal name and classes" I assumed). Applied to prod AND dev; the source
dataset `prisma/greek-insurers.json` was corrected too, so a re-import keeps
the fixes rather than reverting them. **Stale values 57 → 32.**

- **Two records are wrong, not merely stale — both left flagged, not
  rewritten, because each needs a human decision.** `prime-insurance` does not
  appear in the register at all (not Greek-authorised, not among the five
  Cyprus branches, no freedom-of-services entry). `geniki-panelladiki`
  conflicts on every identifying field: the register has an **Α.Ε.**, not a
  Συν.Π.Ε., at Βουλής 7 Αθήνα on 210 321 7801, while our record describes a
  bus-owners mutual in Πυλαία Θεσσαλονίκη on 2310 474 422 — it appears to fuse
  two different organisations.
- **Corrected:** Groupama's mailbox (`info@groupama-phoenix.com` was dead →
  `info@groupama.gr`, as the dataset itself suspected); ΕΥΡΩΠΗ has **moved**
  (Φιλελλήνων 25 Αθήνα → Κηφισίας 340 Ν. Ψυχικό) and changed mailbox; wrong
  emails for Ατλαντική and Ιντερσαλόνικα; Ατλαντική's missing postcode
  (115 26); and four stale legal names — ERGO, ΜΙΝΕΤΤΑ (the «Ευρωπαϊκή Ένωσις»
  name is gone), ΟΡΙΖΩΝ (now **ΟΡΙΖΩΝ 1964**) and the 2ος Συνεταιρισμός
  (missing «Βορείου»). Groupama's note was wrong in the other direction:
  ΦΟΙΝΙΞ is the *current* registered name, not a former one.
- **16 stale values were right all along** and are now `verified_2026`
  (INTERLIFE, INTERASCO and Συνεταιριστική on all three of phone/email/
  address; ERGO's phone+email; Υδρόγειος's and Interamerican's email; etc.).
- **Left as ambiguous rather than overwritten:** Allianz (ours 210 699 9999 vs
  registered 210 690 5500) and Interamerican (210 946 2000 vs 210 946 1111)
  read like published customer lines vs registered switchboards — a phone call
  settles it, not a database write.
- **Roadside partners — I was half wrong about the register's scope.** It
  cannot say who contracts whom, but assistance is a licensed class, so it
  *can* say whether a named provider still operates here. **Europ Assistance
  shows Ceased on all three Greek registrations** (branch, freedom of
  services, and Europ Assistance Holding), which means the six insurers
  recorded as its clients — Generali, AIG, Interasco, NP Insurance, Personal
  and ΕΥΡΩΠΗ — **cannot** be current. Those dropped from `stale` to
  `unverified` ("treat as missing") with a note; no replacement was invented,
  because none could be sourced. The provider roster is now sourced rather
  than asserted: MAPFRE Asistencia also Ceased; Inter Partner Assistance
  branch Ceased but freedom-of-services still Active; **AWP P&C (Mondial /
  Allianz Partners) Active**; **Interamerican Βοηθείας Active and a licensed
  Greek undertaking in its own right**. Eurosos is absent from the register
  and that is *expected, not damning* — it is a roadside service operator, not
  an insurer, so the cover is written under the insurer's own class-18 licence.
- **Still genuinely out of scope:** `paymentGatewayUrl` (5 stale, 15
  unverified) — bank-hosted gateways the register has no view of.
- Net across both passes: **stale 57 → 26**, verified 66, and the remaining
  unverified values now mean "known missing" rather than "never looked".
- Context worth keeping: the register holds 73 Greek-authorised undertakings
  of which only **34 are in force** (34 in liquidation, 5 licence withdrawn),
  so a catalog built from marketing sources rather than the register carries
  dead companies very easily. `anytime` is correctly absent — it is an
  Interamerican brand, not an undertaking, exactly as our record says.

## Insurer reference data + admin editing — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `c225fe9`, deploy `dpl_CSjERdp7…` (`f76d9eglm`), Ready, apex+www.
The 29-record Greek-insurer research dataset now lives at
`prisma/greek-insurers.json`; **27 records imported to PROD and dev** (the two
`status='merged'` historic entities — AXA, Ευρωπαϊκή Πίστη — skipped by
design). Insurer model enriched (slug join key, bilingual/legal names, market
status, group parent, free-text contact channels, HQ address JSON, roadside
partner, 22-value LoB vocab, per-field confidence map); `/admin/insurers` is
now a full CRUD surface (list + `[insurerId]` edit page with confidence badges;
edits stamp changed fields `admin_edited`, provenance preserved).

- **Prod pre-check paid off:** prod did NOT hold the 5 dev-seed rows but 5
  admin-created ones (`Groupama`, `NN`, canonical «Εθνική Ασφαλιστική»…). The
  generator's claim pass was generalized to claim-by-canonical-name for every
  record, killing the unique(name) collision class; `Groupama`/`NN` added to
  the legacy-merge map. End state verified: prod 27/27 slugged, 0 orphans; dev
  28 rows (27 + inactive legacy AXA).
- Migration `20260730120000_insurer_reference_enrichment` (additive DDL)
  applied to BOTH DBs via Supabase MCP + `_prisma_migrations` rows with the
  file's real sha256. Seed SQL from `scripts/gen-insurer-seed-sql.ts`
  (idempotent; re-runs clobber dataset-owned fields, never is_active/logo).
- Verified live: list (27, status chips), ERGO edit page (stale/verified
  badges), no-op save → `UPDATE_INSURER` audit row + badges preserved,
  add-policy dropdown shows the canonical Greek names.
- **Re-import no longer destroys admin corrections — found from real prod
  data, not theory.** Minutes after deploy an admin filled in AIG's missing
  contact email, logo and postcode; the confidence map stamped exactly those
  `admin_edited`. The upsert as first written would have silently erased the
  email and postcode on the next seed run (the logo was already safe). Now
  every dataset-owned column is `CASE WHEN field_confidence->>'<field>' =
  'admin_edited' THEN <live> ELSE <dataset> END`, and the confidence map is
  merged so the stamps survive and keep protecting their fields. The dataset
  stays canonical for everything nobody has touched. Proven against a live DB
  (dev, then restored), not just asserted on the generated string — a
  string-level test would pass on SQL that does the wrong thing.
- **E2E added: `tests/admin-insurers.spec.ts`** (runs in `admin-chromium`,
  5/5 green). The `[insurerId]` route is invisible to every audit sweep —
  static-route enumeration never sees it and dynamic discovery only harvests
  hrefs from lists it already knows — so it is checked explicitly: console
  hygiene on both surfaces, all five sections + 22 LoB checkboxes present,
  **320px with no horizontal overflow** (the densest new layout in the app),
  and a full save round-trip asserting persistence, the `admin_edited` stamp,
  and that untouched dataset provenance survives the same save.
- 47 new unit tests incl. dataset-conformance (every imported row re-savable —
  URL/phone validation deliberately lenient: http:// sites and Greek short-code
  phones are real data). 2545 total green + full gate.
- **Correction to my own first note here.** I wrote "local pooler connectivity
  was dead". It was not: `db.insurer.count()` through the app's own Prisma
  client answers instantly (28 rows). What hangs is only the **migrate
  engine** (`migrate deploy` / `migrate status`, and therefore
  `verify:migrations`) — it takes a session-level advisory lock, which
  transaction-mode pgbouncer cannot hold, so it waits forever instead of
  erroring. `.env.local` points `DIRECT_URL` at the `:6543?pgbouncer=true`
  pooler because the direct host is IPv6-only and this machine has no IPv6
  route. So `verify:migrations` cannot pass locally on this network **by
  construction**, not by outage; the MCP path is the correct one and both DBs
  are confirmed at the same migration state. `prisma validate` green.
  - *Refinement from two independent runs (other session, 2026-07-30):* it does
    not actually wait forever — left alone it ends in **`Error: P1017: Server
    has closed the connection`** against `aws-1-eu-west-3.pooler…:6543` after
    several minutes. Same root cause, but worth knowing when diagnosing: the
    pooler drops the connection rather than the client hanging indefinitely, so
    the right move is to let it return and read P1017 rather than kill it and
    guess. Note the script also **exits 0 through a pipe** while printing
    "Migration verification failed" — check its output, not its exit code.


## /agent had no h1 for anyone without an advisor — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `ef0b191`, deploy `dpl_cesmHnRh…` (`bfn4yguyn`), Ready, all 5 aliases
+ apex/www verified. **Note for the next deploy:** `vercel --prod` exited
non-zero with `Not authorized` while the deployment itself built and went Ready
normally — `vercel whoami` was fine throughout. The CLI's exit code was not
trustworthy here; the deployment was confirmed via `vercel inspect` and live
liveness checks rather than by the command's status. Closed the UI audit's open item **"/dashboard and /agent
report no `<h1>` under the ADMIN session"** — whose diagnosis was wrong on both
counts, which is why it was right to leave it flagged rather than patched:

- `/dashboard` under an admin **redirects** to `/admin/dashboard`, which does
  have an h1. The sweep was measuring the redirect, not `DashboardClient`.
- `/agent` is the policyholder's "my advisor" page and early-returns
  `NoAgentEmptyState` when there is no linked advisor. That is **data**-gated,
  not role-gated — the admin fixture simply has zero advisor relationships
  (verified in the DB). So this hit **every new policyholder**, not admins.
- `/team`'s equivalent branch had already been fixed in an earlier pass.

Root cause: shared `components/ui/EmptyState` headlines at `h3` — correct when
nested under a page that owns an h1 (all 12 other consumers, checked
individually), wrong when the empty state IS the page. Added an optional
`headingLevel` (default `h3`, so nothing else moves) and `/agent` passes `h1`.
Styling identical at every level; the change is purely semantic.

**Checked and deliberately NOT changed:** `/wallet`'s empty state, which looks
like the same bug but takes its h1 from `PageHeader` above the early return.
The two h1s in `AgentClient` are in mutually exclusive branches, so this adds
no duplicate — the defect the audit fixed on `/onboarding/agent`.

4 unit tests (render-level + call-site), mutation-tested; E2E asserts exactly
one h1 on `/agent` under the no-advisor fixture — never zero, never two.

## MEDIC suggest metering + admin visibility review — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `c00ce21`, deploy `dpl_9rNz7GMk…` (`btlnbkp8f`), Ready, apex+www
verified. Final E2E: **16/16** (5 agent surfaces + full journey + 5 ladder
tests incl. the modal console check and the 320px strip), zero Chrome console
errors. 2498 unit tests + full gate green. **Re-verified after the insurer
batch landed** (head `8be0c15`): 16/16 again, zero console errors, 2546 unit
tests + full gate.

**Second pass over both areas came up clean** — the bar for closing this out.
Admin visibility: no impersonation feature exists anywhere, and `isBreakGlass`
is only an audit flag on deletion requests, not an access bypass — so neither
opens a route to qualification data. Metering: the token estimate was checked
against what is actually sent (the Q&A framing adds ~500 tokens and this path
passes no ACORD payload, so the 4000-token allowance covers framing plus the
size-capped JSON reply); the audit row is written whenever the billable call
succeeded, including when parsing later fails, so cost incurred always leaves
a trace.

**Metering — one real defect, fixed.** The suggest button was a real, billable
LLM call (up to 80K chars of notes, re-runnable forever) with **none** of the
four controls the B2C Q&A path enforces and no audit trail. "Reuses the metered
askQuestion path" was true and misleading: that helper RECORDS usage, it does
not GATE it. Now: 20/hour rate limit, a DB-backed hourly backstop that does not
depend on Redis, a token-budget check before spending (estimated from the real
payload), and a `MEDIC_SUGGESTION_REQUESTED` audit row with `targetUserId` —
userId only, no email (GDPR audit M3). Both refusals surface as advisor-readable
toasts. 8 unit tests pin the gates at source level incl. ordering; mutation-
tested by deleting the rate limit.

**Admin visibility — clean, no fix needed.** Every qualification surface scopes
by ownership (`ownerAgentUserId` / `relationship.agentUserId`) derived from the
session, never from a parameter and never by role; the admin console has no
opportunity surface at all; `isAgentRole` admits admins to the agent actions but
the ownership check still blocks any admin who is not the owning agent. The new
Art. 15 export section is scoped to the requesting policyholder.

**Chrome consoles.** New `tests/agent-console-clean.spec.ts` — console, page
errors and HTTP ≥400 across the five agent surfaces; the modal + edit-strip
check lives in the ladder block where a fixture exists (placed in the console
spec it would have silently skipped). Local-only noise is filtered by explicit
rule, each verified rather than assumed: the placeholder Sentry DSN (prod ships
a real encrypted one and serves no placeholder), `_vercel/*` scripts (absent
locally), and Next's `?_rsc=` prefetch aborts. Four probe defects were found and
fixed before any product conclusion was drawn — a filter that missed
`speed-insights`, `networkidle` hanging, a 404 reported without its URL, and an
assertion that matched the word "askQuestion" inside a comment.

## ⚠️ OWNER ACTION: production rate limiting is per-instance only

**Found 2026-07-30 while auditing MEDIC cost behaviour. Not fixable in code —
needs credentials.** Production has **no** `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` (0 of 59 env vars) and runs with
`RATELIMIT_ALLOW_LOCAL=1`, the escape hatch
[DEMO_DEPLOY_RUNBOOK](operations/DEMO_DEPLOY_RUNBOOK.md) documents for "a
single-instance demo". Vercel is not single-instance, so `lib/env.ts`'s own
warning applies verbatim: *"each serverless instance keeps its own in-memory
counter, so the effective limit multiplies by the instance count (near
fail-open at scale)"*.

This weakens **every** limit in the app, not just MEDIC's: auth endpoints,
contact/lead forms, agent invites, billable AI scans. Broken/insecure bucket —
not a preference item.

**To fix:** provision an Upstash Redis instance, set both env vars in
Production (and Preview), then remove `RATELIMIT_ALLOW_LOCAL`. `lib/env.ts`
already refuses to boot production without them once the override is gone, so
the guard verifies itself. I did not create credentials or change production
env on your behalf.

Mitigated meanwhile for the AI spend path: the MEDIC suggest cap is now
DB-backed (counts its own audit rows) and therefore instance-independent.

**The concrete money exposure until then** is `scanPolicyDocument`
(`app/(protected)/agent/actions.ts`) — a real billable AI extraction whose
30/hour cap is Redis-only, so it is currently per-instance. Deliberately left
as-is rather than given the same DB-backed backstop: it writes no audit row to
count, so that change is larger than it looks, and provisioning Upstash fixes
it properly along with every other limit. Worth revisiting only if the Upstash
work is postponed.

## MEDIC subject-access gap (GDPR Art. 15) — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `94270ec`, deploy `dpl_6EYcNhMq…` (`oqqu31pau`), Ready, apex+www
verified. **The sweep's "clean round" did NOT come up clean** — this round
found a sixth real defect, so the goal's completion bar is not yet met.

- **MEDIC data was invisible to a subject-access request.** The Art. 15 export
  builds 14 sections keyed by `userId`; `Opportunity` links to the policyholder
  only via `relationship.policyholderUserId`, so it was never queried. The
  profile the feature builds ABOUT a customer (need + severity, € at risk,
  decision criteria, qualification score) has been outside every DSR surface
  since 2026-07-26. Retention under the agent's IDD basis (erasure decision,
  audit H1) covers the ERASURE right and does not exempt the same data from
  ACCESS — different rights.
- Fix: `lib/medic/subject-view.ts` (subject-safe projection) + new
  `advisorOpportunities` export section + DSR runbook amendment 12. Third-party
  names in the stakeholder map (spouse, accountant — not the requester) are
  withheld under Art. 15(4) with the structure still disclosed and the
  withholding flagged in the payload. 6 unit tests; the no-name-leak property
  is mutation-tested. 2490 unit tests + full gate green.
- **Open for counsel:** the Art. 15(4) withholding is a judgement call, and
  whether free-text `Opportunity.notes` should also be disclosed was left
  undecided rather than guessed.

## MEDIC concurrency (CAS) + 320px edit strip — 2026-07-29 — MERGED + DEPLOYED

`NEW-UI` @ `39cf907`, deploy `dpl_2RMcYZ34…` (`nuh9ww1nf`), Ready, apex+www
verified. Sweep's last two angles closed:

- **Concurrent medic writers silently overwrote each other.** All four
  writers (€/EB patch, apply-suggestions, confirmGap sync, proposal-validate
  sync) did read→merge→write-whole-JSON unguarded: a patch could regress the
  pain-ladder mirror; a sync could drop a just-saved € figure. Fix:
  `lib/medic/cas.ts` — optimistic compare-and-swap on the existing
  `medicUpdatedAt` stamp (conditional updateMany; lost race → re-read,
  re-merge, 3 attempts; IO injected so the loop is pure). No schema change.
  5 unit tests incl. a race simulation proving both writes survive.
- **§F edit strip verified at 320px** (never rendered at phone widths before):
  no overflow, controls in-viewport, 24px tap floor — pinned as ladder E2E
  test 5 (5/5). 2484 unit tests + full gate green.

MEDIC issue-sweep tally so far: mirror desync, scorecard-empty, unreachable
`qualified`, row/reopen staleness, concurrent lost-updates — all fixed,
each with a regression guard. Next round must come up clean to close the goal.

## MEDIC row-staleness fix + audit's touch-target rule — 2026-07-29 — MERGED + DEPLOYED

`NEW-UI` @ `6dc2136`, deploy `dpl_EHqyAUaK…` (`7v2cgne0v`), Ready, apex+www
verified (www 200 / apex 308). Two commits:

- **fix(medic) `675ed8f`:** after saving € value-at-risk, an economic buyer, or
  applied AI suggestions, the opportunities row kept the OLD qualification
  score — and the modal re-seeds from the row on open, so close→reopen showed
  pre-save data (advisor's edits looked lost; affected apply-suggestions since
  it shipped). Modal now reports persisted medic changes via `onMedicChange`;
  row + selection update in place. Ladder E2E extended with a close→reopen
  guard (9/9). 2479 unit tests + full gate green. Swept and CLEARED:
  apply-suggestions cannot downgrade an advisor-identified stakeholder
  (append-only merge, name+stance dedupe).
- **fix(a11y) `6dc2136`:** committed the UI-audit session's uncommitted
  `globals.css` WCAG 2.5.8 touch-target floor (owner-approved) — the rule its
  recorded 498→~28 end state was measured with; git and prod are in sync again.

## Product UI/UX + responsive + a11y audit — 2026-07-29 — DEPLOYED

Reported from production: the `/wallet/[id]` header looked wrong in light mode.
It did, and the reason matters more than the fix.

**Why no audit caught it.** Every sweep enumerated static routes from
`app/**/page.tsx` and explicitly skipped the 17 dynamic ones as "covered by the
journey specs" — which do not check theming. `/wallet/[id]` had never been
rendered by any audit, so a 100%-green suite said nothing about it.

**The defect.** `PolicyHero` is dark in BOTH themes (`bg-[#111111]`,
`text-white`, `border-white/15`; not one `dark:` variant in the file). Its status
chip came from `getStatusColor()`, which returns light/dark PAIRS — correct for
a themed surface like `KeyDatesCard`'s `pw-card`, wrong here: in light mode the
light half won and rendered a `bg-green-50` / `text-green-700` chip, styling
meant for a white page, onto a black slab. Added `getStatusColorOnDark()`
following the on-dark idiom the hero already used for its renewal and gap
badges. Pinned with 5 unit tests.

**Coverage fix.** Both audits now DISCOVER dynamic routes at run time by
harvesting real detail hrefs from list pages. Live for `/branches/*`,
`/guides/*`, `/lexiko/*` (18 -> 24 routes, 90 -> 115 surfaces). `/wallet`,
`/customers` and `/tasks` yield nothing locally because the dev DB is
unreachable so no fixture policy exists — those now LOG "that route family is
NOT covered" instead of passing silently.

### New: responsive + a11y + runtime audit — 30 routes x 9 widths

320/360/390/414/768/1024/1280/1440/1920, loading each route once and resizing.
The old sweep's narrowest width was 390px, so 320 and 360 had never rendered.

| | before | after |
|---|---|---|
| horizontal overflow | 191 | **0** |
| accessibility | 18 | **0** |
| runtime/console | 121 | **1** (dev-only warning on a 404) |
| touch targets | 498 | 93 |

Two structural root causes, not per-page bugs:

1. **Greek compounds.** «ασφαλιστήριο» / «πολυασφαλιστήριο» are single words
   whose MIN-CONTENT width exceeds 320px, so a flex/grid child cannot shrink
   below them. Bisecting `/`, `/product` and `/product/business` all landed on
   nodes whose own boxes measured fine.
2. **Automatic minimum size.** Grid and flex children default to
   `min-width: auto`. On `/product` a decorative mock — a 36px icon tile and a
   label — set the width of the whole column while every box measured
   "correctly".

Both fixed in `globals.css` under `@media (max-width: 430px)`:
`overflow-wrap: anywhere` on text blocks, `min-width: 0` on grid/flex children.
Nothing at >=431px changes. **Verified on the live site**: 0 overflow at 320px.

Also fixed: `not-found.tsx` had no `<main>` landmark (every 404 in the app);
`/perks` repeated `| PolicyWallet` over the root layout's own title template;
the fake browser bar's unbreakable mono URL (`min-w-0 flex-1 truncate`);
`LegalDocumentPage`'s light-only hover.

### Full-application coverage — 108 routes

Both sweeps were expanded from a "representative" subset to **all 108 static
routes** (responsive: 30 -> 108; state cascade: 24 -> 108). Narrowing to a subset
is exactly what let the `/wallet/[id]` header defect ship green.

**108/108 routes fully scanned x 9 widths (320-1920): horizontal overflow = 0.**

The first 108-route attempt died on `page.evaluate: Execution context was
destroyed` — an admin route bouncing a policyholder killed the whole sweep. Each
scan is now guarded, and a route that does not complete all 9 widths counts as
incomplete rather than scanned, so coverage cannot silently shrink.

The 78 newly-covered routes carried real semantic defects no earlier sweep could
have seen: `/onboarding` and `/onboarding/agent` had no `<main>` landmark (the
first screen a new user meets, with no skip-link destination), and
`/auth/signup/confirmation` likewise. Both fixed.

### Accessibility — 18 findings down to 1

Fixed on routes no earlier audit had rendered:

- `/agent/settings` had `<label>` elements with no `htmlFor` and inputs not
  nested inside them — visually labelled, programmatically anonymous. Commission
  inputs were named only by an adjacent `<span>`, so the announcement never said
  which branch a rate belonged to.
- `/onboarding/agent` rendered TWO `<h1>`: the brand mark was one, and each step
  renders its own. Logo demoted to `<p>`.
- `/consent/ai` and `/wallet/add` had no `<h1>` at all — given sr-only headings,
  visible design unchanged.
- `<main>` landmarks added to `/onboarding`, `/onboarding/agent`,
  `/auth/signup/confirmation` and `not-found.tsx` (every 404 in the app).

**Final across 108 routes x 9 widths: overflow 0, a11y 1, touch 53.**

The 33 "incomplete" routes are admin pages correctly redirecting a policyholder
— detected and logged, never silently counted as passing.

### Coverage — three sessions, 95/108 routes

The audit runs under policyholder, agent AND admin sessions:

| session | routes fully scanned |
|---|---|
| policyholder | 73/108 |
| agent | 80/108 |
| **admin** | **95/108** |

The remaining 13 are genuine redirects (auth pages bounce a signed-in admin,
`/coverage` -> `/coverage-insights`, `/en/for-agents` -> `/en/solutions/agents`).

**I had recorded the dev DB as unreachable and the admin fixture as therefore
impossible. That was wrong** — the failure was a missing `DIRECT_URL` in the
shell, not connectivity. `E2E_ADMIN` is now provisioned by the existing
`provisionUser`, which writes the role into BOTH `raw_user_meta_data` and the
Prisma `roles` column (admin is gated on both).

### Results

| | start | now |
|---|---|---|
| horizontal overflow | 191 | **0** (incl. the admin console) |
| runtime/console | 121 | **1** (dev-only) |

### /wallet/[id] is now audited — the route that carried the defect

The wallet list navigates with `router.push()` on a card click, not an `<a href>`.
Discovery harvested hrefs, found none, and logged "/wallet ... NOT covered".
**That is exactly why the PolicyHero light-mode defect shipped while every suite
reported green.** Discovery now falls back to the app's own API with the session
cookie (plus a click-through). `/wallet` no longer appears in the NOT-covered
log.

**Two corrections to earlier entries in this file — both were my errors, not the
environment's:**

1. "Dev DB unreachable" — it was a missing `DIRECT_URL` in the shell. With
   `.env.local` loaded the DB answers fine. This had me record the admin fixture
   as impossible for several rounds.
2. "No fixture policy exists" — two exist. I queried `Policy.userId`; the column
   is `ownerUserId`. The query errored and I read that as "none".

Both times I treated a self-inflicted failure as a hard environmental limit.
Worth remembering: when a probe fails, check the probe before believing its
verdict.

### Design-system audit — every className in app/ and components/

Mostly consistent. Shadows use 6 standard values; icon sizes sit on the standard
scale; there are exactly **2** arbitrary spacing values in the whole codebase.

Two real problems, both fixed:

1. `text-[#92400E]` (amber-800) appeared **21 times with no dark partner**,
   several on `dark:bg-amber-900/30` — dark text on a dark surface, the same
   defect class as the reported PolicyHero header.
2. **Duplicate and conflicting `dark:` classes** left by an earlier codemod pass
   in this same session: 3 exact duplicates plus 6 files carrying two different
   values for one property (`dark:bg-amber-900/30 dark:bg-amber-500/15`), where
   the later silently won.

**Deliberately not changed:** 94 hex values without a dark partner are brand and
semantic FILLS that are correct in both themes — `bg-[#29685B]` with white text,
the fake browser chrome's traffic-light dots, status colours. The pixel contrast
audit across 108 routes x 2 themes reports 0 findings, and that is the ground
truth that matters. Converting them to tokens would be churn, not a fix.

### Theme switching — verified across 24+ routes

Three full light/dark toggle rounds per route (a surface that repaints only on
the FIRST switch shows as an unchanged fingerprint on a later pass), then a
refresh, then cross-page navigation and a return. **Passes: zero stale styles,
zero identical-fingerprint surfaces, theme persists cleanly across reloads.**

### Remaining low-priority debt

- **91 touch findings** at the 13-24px WCAG 2.5.8 boundary (44 admin, 39
  policyholder, 8 agent). The checkbox/radio cluster is fixed globally; the rest
  are 20px text links and inputs with explicit `w-3` utilities that correctly
  beat a base-layer rule — per-component work.
- **67 off-scale border radii** (10, 14, 20, 28, 32, 40, 48px). The 44 exact
  matches were collapsed onto the scale with no visual change; these seven are
  genuinely off-scale, so renaming them alters the design. **Needs a human
  decision on what the scale should contain** — a codemod would be guessing.
- `/team` reports no `<h1>` under the agent and admin sessions although
  `TeamClient` renders one unconditionally at line 165 — so those roles see a
  different view. Same for `/dashboard`, `/agent`, `/wallet/add` under admin.
  Not run to ground.
- `/tasks/[id]`, `/customers/[id]`: same `router.push()` navigation as the
  wallet; the API discovery fallback is wallet-specific and could be generalised.
- **No automation exists for UX journey review or performance** (re-renders,
  layout shift, duplicate CSS). Those two brief dimensions were not done and are
  not claimed.

### Checker corrections (each reported correct code as broken)

Left-edge overflow does not scroll in LTR, so a closed off-canvas drawer at
-272..0 is the pattern working; wide content inside its own `overflow-x` scroller
is deliberate; an `aria-hidden` off-screen honeypot needs no label; `sr-only`
skip links are not touch targets. The placeholder Sentry DSN and CSP-blocked
`va.vercel-scripts` are dev-only — **verified prod injects same-origin
`/_vercel/insights/script.js` (200), so the CSP was NOT loosened.**

## Theme & UI consistency audit — 2026-07-28 — MERGED + DEPLOYED

**Live in production.** `origin/NEW-UI` fast-forwarded `17a1b3f..e780e89` (18
commits, 72 files) and deployed via `vercel --prod`:
`dpl_Ab5iDG7KC9pEH2v9DqiMuAxD7DQr` (`kgk3zfa2p`), Ready, all 5 aliases moved
including apex + `www.policywallet.gr`. No DB work — zero `prisma/` changes in
the batch.

Post-deploy verification: 12 public routes 200, 4 protected 307, apex 308. All
three headline fixes confirmed in the shipped assets, not just the build:
`overflow-wrap:anywhere` on `/product/business`; `bg-amber-50
dark:bg-amber-900/20` and `text-amber-700 dark:text-amber-300` on `/product`;
and in the CSS bundle
`.dark .pw-app-canvas{background-image:radial-gradient(...),linear-gradient(to bottom right,#000,#111)}`.

Note: `verify:migrations` fails locally with `Environment variable not found:
DIRECT_URL` — the shell had not loaded `.env.local`. With it loaded,
`prisma validate` reports the schema valid. Environmental, not a defect.



**Full matrix green.** Theme audit (every route x desktop/tablet/mobile x
light/dark) plus theme-switch/stale-styles: **8/8 passed, 0 contrast findings**.
Layout audit (overflow, viewport escapes, clipped text): **4/4 passed, 0
findings**.

### Two "false positives" were real

The scanner fix that exposed them — sampling the background beside the glyph run
instead of across the whole element box — kept both alive, which forced a second
look at findings I had dismissed:

1. `ProductSections` warn branch: `border-amber-100 bg-amber-50` with no dark
   variant, beside an ok branch that correctly carried `dark:bg-slate-900`.
   Child text `text-[#0F172A] dark:text-white`. **White on amber-50, 1.04:1.**
2. `.pw-app-canvas` — the canvas under every authenticated page — painted
   `linear-gradient(..., #f8fafc, #ffffff)` with no `.dark` override, while its
   sibling `.pw-page-shell` had had one all along.

### Why every earlier sweep missed them — the durable lesson

- The static theme-pair audit reads a whole `className` body as ONE string. In
  `${warn ? "bg-amber-50" : "... dark:bg-slate-900"}` it sees both tokens and
  calls it covered. Those are two mutually exclusive elements: a dark variant on
  one branch masks its absence on the other. Making the audit **branch-aware**
  immediately surfaced 56 more. The same blind spot was in the *fixer*, whose
  "already paired?" lookahead read across the ternary boundary.
- A gradient paints via `background-image`, so a computed `backgroundColor`
  check reports `transparent` and never sees it. Only a composited pixel does.
  Anything translucent above it (a `/10` or `/15` wash) blended toward white and
  lost contrast in dark mode.

### Fixed

- 140 light-only surfaces paired with dark partners across 53 files
- `.dark .pw-app-canvas`; swept globals.css for other light gradients: none
- Tablet header overflow: PublicHeader showed nav + actions from `md:` but they
  need ~1024px; at 834px the CTA ran 84px off-screen on `/` and `/company`.
  Moved to `lg:`, keeping the hamburger that already existed.

### Scanner defects corrected

Background now sampled beside the glyph run. `sr-only` skip links no longer read
as truncated text — that guard's regex sat inside a template literal and reached
the browser with its escape stripped, so it split on the letter "s" and could
never match. Hover compared at 400ms rather than 120ms against 150ms
transitions, with the pointer parked between controls, `aria-current` items
exempt, and a pointer-reachability gate.

### Verified green

| Suite | Result |
|---|---|
| Theme audit (contrast, 3 viewports x 2 themes) | **8/8, 0 findings** |
| Layout (overflow, escapes, clipped text) | **4/4, 0 findings** |
| Interaction states (hover + focus) | **3/3, 0 findings, 0 unmeasured** |
| **State cascade** — every declared state, every element, 18 pages x 2 themes | **0 findings** |
| **Surfaces** — cards/dialogs/menus in dark mode | **0 light surfaces** (89/90/90 measured) |

Plus audit:api-auth, lint, i18n, utf8, type-check, 2469 unit tests, build.

**`tests/theme-state-cascade.spec.ts` is the one to keep.** Driving real mouse
events into controls cost ~1.5s each, so the button sweep never finished and two
runs were killed; it also only reached the handful of controls the sampler
picked. Reading the CSSOM instead — every rule carrying :hover, :focus-visible,
:focus, :active, :disabled, :checked, aria-pressed/selected/current or
[data-state] that sets a colour, resolved against live elements and scored on the
COMPOSITED surface — covers every element in every declared state and finishes in
15 minutes. It replaced theme-controls-audit.spec.ts, which measured 16 surfaces
and never completed a button run; this measures 90 and finishes.

### Full 108-route matrix — COMPLETE, zero findings

| Shard | Coverage | Result |
|---|---|---|
| desktop light + dark | 107/108 routes each | **0 findings** (33.5m) |
| tablet light + dark | 107/108 routes each | **0 findings** |
| mobile light + dark | 107/108 routes each | **0 findings** (1.1h) |

The single skipped route redirects after `goto` resolves, which destroyed the
execution context under the scanner's style injection and had been taking the
whole sweep down. Per-route try/catch + a 75% coverage floor fixed that — the
sweep was never timing out, and raising the budget could never have helped.

### Layout — COMPLETE, zero findings

108 routes x desktop/tablet/mobile: **4/4 passed, 0 findings** (43m). Covers
horizontal overflow, elements escaping the viewport, and text clipped without
an ellipsis.

The last open defect is FIXED. `/product/business` scrolled sideways at 390px
(scrollWidth 428). No element's rect exceeded the viewport, so the usual "find
the wide child" probe returned nothing. Bisecting — hide each subtree, watch
scrollWidth — found the hero `<h1>`: its box measures 342px and fits, but its
MIN-CONTENT width overflows, because «πολυασφαλιστήριο» is a single unbreakable
17-character word wider than the viewport at `text-h1`.

`overflow-wrap:anywhere` is the one value that shrinks intrinsic min-content
width (`break-word` does not). Applied to all 16 hero headings sharing the
pattern, since every LoB page carries Greek compounds of the same shape.
NOT fixed with `overflow-x:hidden`, which hides the symptom and silences the
audit.

### The lesson that cost the most

Four of the last five "defects" were the AUDIT failing, not the UI, and every one
had the same shape: **a failure to measure was reported as a failed component.**

- sr-only "truncation" on 12 routes — the guard's `/\s+/` sat inside a template
  literal, reached the browser as `/s+/`, and split on the letter "s"
- all 11 /account controls "no hover" — the snapshot returned `undefined`, and
  `undefined === undefined`
- 0 of 74 buttons measured — `evaluate()` given a STRING silently yields nothing;
  every real function reference worked

/account took eight rounds. What cracked it was not another hypothesis: the
finding count stayed byte-identical at 188 across five different edits, one of
which added an early `continue`. **A number that does not move when the code
moves is not measuring the code.** Both new suites now assert a minimum measured
count so this fails loudly instead of passing green.

**Not deployed** — 8 commits on `NEW-UI` awaiting go-ahead.

