# CLAUDE.md

Guidance for Claude Code when working in this repository. For setup, environment variables, and the full documentation index, see [README.md](README.md) and [docs/](docs/).

> [AGENTS.md](AGENTS.md) is a mirror of this file for other coding agents — apply any edits to both.

## Session workflow

- At the START of a session: read docs/STATUS.md and any relevant docs/audits/*.md, then briefly tell me where we are before doing new work.
- At the END of meaningful work: update docs/STATUS.md (Current phase, Done, In progress, Blocked, Top risks ranked, Next 3 actions). Keep it to one screen.
- When documenting findings, ALWAYS separate "broken / insecure" (gates launch) from "UI/UX I dislike" (does not). Different backlogs.
- Before suggesting a commit, remind me to run the CI guardrails: audit:api-auth, lint, type-check, verify:migrations, and the i18n/utf8 checks.

## Project overview

**PolicyWallet** is a Greek-market insurance portfolio hub serving three roles — **policyholder**, **agent**, and **admin**. It ingests insurance policy documents (PDFs), runs an AI analysis pipeline to extract and translate coverage, detects coverage **gaps**, scores protection, and surfaces recommendations. The UI is fully bilingual (Greek default, English).

Stack is in `package.json`. Two things it won't tell you: AI runs through the `ai` SDK with pluggable Gemini / Anthropic / OpenAI providers (selected by which API key is set), and rate-limiting needs Upstash Redis.

- **Node:** `20.20.2` (see `.nvmrc` — run `nvm use`). **Not optional:** vitest 4 + vite 7 need `require(esm)`, which landed in Node 20.19. On 20.11 every test run dies at `failed to load config from vitest.config.ts` with `ERR_REQUIRE_ESM` — a failure that looks like a broken config and is a wrong Node version.
- **Path alias:** `@/*` → repo root (e.g. `import { db } from "@/lib/db"`).

## Commands

Everything routine is a `package.json` script (`npm run` lists them) or a standard
`npx prisma` invocation. Only the non-obvious ones are worth writing down:

```bash
# Tests
npm test               # Vitest (unit) — WATCH mode; use npx vitest --run for one-shot
npx vitest --run tests/unit                          # what CI runs
npx vitest --run tests/unit/gap-detection.test.ts    # single file; add -t "name" for one case
npx playwright test tests/agent-journey.spec.ts --project=chromium   # single E2E spec

# Non-standard scripts
node scripts/seed-agent-demo.mjs <agentEmail> <customerEmail>
                         # Idempotent agent-demo wiring (relationship + analyzed motor
                         # policy + gaps); both accounts must already exist in Supabase auth
```

## CI-enforced guardrails — read before committing

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs these as **blocking** checks, in this order. Run them locally before pushing:

1. **`audit:api-auth`** — every route under `app/api/**/route.ts` must have a matching entry in `scripts/api-route-policy-inventory.json` (auth mode `public|user|role|webhook`, HTTP methods, required controls). When you add/change/remove an API route, **update the inventory to match** or this fails.
2. **`lint`** — ESLint ([eslint.config.mjs](eslint.config.mjs)). Many strictness rules are intentionally off (`no-explicit-any`, `no-unused-vars`, `exhaustive-deps`); `react-hooks/rules-of-hooks` stays `error`.
3. **`lint:i18n-changed`** — fails on hardcoded user-facing strings in `.tsx` (toast literals, `el ? '…' : '…'` ternaries, UI fallback literals). Use translation keys instead. Intentional exceptions: add `// i18n-hardcoded-ignore` on the line.
4. **`lint:utf8`** — all tracked source must be valid UTF-8. (`lint:encoding` additionally scans for mojibake.)
5. **`type-check`** — `tsc --noEmit` under `strict`.
6. **Unit tests** — `vitest --run tests/unit`, then a production **build**.

E2E (Playwright) is **not** in CI — run it locally before merging UI changes. (`verify:migrations` is also local-only.)

### Tests

Layout, the Playwright project list, auto-provisioned test users and the quirks that
bite (port 3000 not 5000, the cookie-consent banner) live in [tests/CLAUDE.md](tests/CLAUDE.md),
which loads automatically when you work under `tests/`.

## Architecture

Auth-gating middleware lives in **`proxy.ts`** (Next 16's replacement for `middleware.ts`): it redirects any path not on its public allowlist to `/auth/signin`. **When adding a public page or public route handler, add its path to the allowlist in `proxy.ts`** or crawlers and anonymous users get a login redirect. Layouts and API guards enforce auth again underneath (defense in depth).

## Key conventions

- **Database:** always `import { db } from "@/lib/db"`. Never `new PrismaClient()` — the singleton ([lib/db.ts](lib/db.ts)) prefers `DIRECT_URL` to avoid pooling errors.
- **Auth (server pages/actions):** call `getAuthenticatedUser()` (redirects if anonymous) from [lib/auth-helpers.ts](lib/auth-helpers.ts). Roles live on `User.roles` as a **comma-separated string** — check with `.includes('admin')` or `parseRoles()`.
- **Auth (API routes):** guard with `requireApiUser({ roles })` (or `withApiGuard`) from [lib/api-auth.ts](lib/api-auth.ts) / [lib/api-guard.ts](lib/api-guard.ts), and return `createApiResponse` / `createApiError` from [lib/api-utils.ts](lib/api-utils.ts). Keep the route's entry in `scripts/api-route-policy-inventory.json` in sync.
- **Authorization for policy-owned records — one path, enforced.** Anything that lets a
  caller name a Policy / PolicyDocument / GapInstance / PolicyAnalysisRun goes through
  `getPolicyAccess` ([lib/policy-access.ts](lib/policy-access.ts)); the agent-facing *set*
  equivalent is [lib/agent-visibility.ts](lib/agent-visibility.ts). Do not hand-roll an
  ownership or grant check — four copies existed by Aug 2026 and had drifted in both
  directions (a dismissed agent still seeing uploads; grant-holders wrongly denied).
  `tests/unit/policy-authorization-single-path.test.ts` derives the route list from the
  filesystem and fails on a new bypass; exemptions go in that file with a reason.
- **An agent's access dies with the relationship — however the relationship ends.** Both
  visibility arms — the grant and the `createdByUserId` upload arm — require a relationship
  that is not `inactive`/`terminated`. Never gate on `status === "active"`: the column
  defaults to `pending_activation`, which is the normal state before a customer accepts.
  **Termination is not the only ending.** `computePolicyAccess` derives read/write/delete
  from an `AccessGrant`'s level *alone* and never re-checks the relationship, so any code
  that ends or moves a relationship must revoke the grants **in the same transaction** —
  `terminateRelationship` always did; `transferCustomer` did not until Aug 2026, and left
  reassigned agents with permanent `manage` over a former customer's whole book. If you add
  a third way for a relationship to end, revoke there too.
- **Rules decide a coverage gap; the model only describes one.** Detection and severity come
  from `decideGapsForPolicy` ([lib/gap-detection.ts](lib/gap-detection.ts)) evaluating a
  `GapDefinition.detectionLogic` against the extracted `AcordData`; severity is the
  definition's, never a literal at the write site. The AI contract has no `isDetected` and no
  `severity` field — deleted, not ignored — and nothing may create a `GapDefinition` from model
  output. A definition without an evaluable rule produces nothing rather than failing silently
  to false. **Unknown is not absence**: for `is_false`/`all_false` only an explicit `false`
  is evidence a cover is missing, because the extractor is silent about most fields. The
  separate `missing` operator deliberately fires *on* silence — it asks whether a value was
  recorded, not whether cover exists — so any finding it produces must be worded "not
  recorded", never "not covered", and public copy must not claim gaps appear only when the
  policy says so.
  A run's `resultJson.gapResults` is **AI prose keyed by slug, not a detection list** —
  entries exist for candidate slugs whether or not a rule fired. Never derive "which gaps
  does this policy have" from it; read `GapInstance` rows or `resultJson.decidedGapSlugs`.
- **Nothing reaches a model provider without AI-processing consent — on every path.** There
  is more than one: the deep pipeline (`policy-analysis-orchestrator.service.ts`) *and*
  upload-time extraction (`app/api/policies/extract/route.ts`, which the bulk-upload modal
  also uses). Check `aiProcessingConsentVersion` **before reading the request body**, so a
  refusal never touches the document. The extract path was ungated until Aug 2026 while
  `/trust` promised the opposite.
- **A document reaches a model, and the `policies` bucket, only through the document gate.**
  Until Sept 2026 any PDF declared «Motor» became an `analyzing` Policy and a full extraction
  (~211k estimated tokens) found out it was a menu. Now `ingestPolicyDocument`
  ([lib/ingestion/ingest-policy-document.ts](lib/ingestion/ingest-policy-document.ts)) is the
  ONE path that stores a policy document, and it runs `validateDocumentForIngestion`
  ([lib/ingestion/document-gate.ts](lib/ingestion/document-gate.ts)) first — bytes, a local
  pdf.js read (page cap, text), a Greek/English lexical classifier, the cheap model only for
  the middle band or a scan, branch consistency, a duplicate check — and persists NOTHING for a
  rejected or held verdict but one `ActivityLog` row (the «analyses prevented» KPI).
  `extractPolicyData` takes a `ValidatedAIDocument`, a brand only `toValidatedAIDocument`
  mints for a `validated` verdict; the orchestrator's `prepareDocument` validates legacy rows
  lazily. The selected branch is a HINT the gate checks; it never authorises anything. Guards:
  `tests/unit/document-gate-before-model.test.ts`, `tests/unit/document-gate-storage-single-path.test.ts`,
  the consent guard's `classifyDocument` arm. Do not add a second upload path or a cast; add a
  caller of the service. Details: `docs/audits/document-validation-gate-2026-09.md`.
- **Severity is not a verdict until an underwriter says so.** Render it through
  `describeSeverity()` ([lib/gaps/severity-display.ts](lib/gaps/severity-display.ts)) and show
  its `caveatKey`. `tests/unit/gap-severity-display-single-source.test.ts` fails on a new
  hand-rolled severity map and carries the migration debt list.
- **A composed AI field has a language of its own — pin it, tag it, and refuse a
  mismatch.** The extraction prompt's rule "keep the document's original language"
  covers fields COPIED from the document; it does not cover `coverageSummary`,
  which the model WRITES. Unpinned, a Greek schedule returned English prose that
  the wallet rendered verbatim under «Το ασφαλιστήριό σας σε απλά ελληνικά».
  Greek is now pinned in both places the model reads (the schema `.describe()`
  and the prompt's LANGUAGE block), `enrichExtractionPayload` records
  `acordData.extraction.summaryLanguage` **detected from the returned text, never
  assumed from the request**, and `lib/wallet/summary-language.ts` is the only
  thing allowed to decide whether a stored summary may render. Do not render
  `policy.coverageSummary` directly from a component.
- **Nothing on the policy surface is redacted — so a masked value is an
  extraction failure, and must say so.** `(XXXX)` / `????` / `N/A` in a field or
  a summary is the model's placeholder for something it could not read, stored
  verbatim. Rendering it as data makes "we are hiding this" and "we could not
  read this" indistinguishable. Route extracted values through
  `lib/wallet/unreadable-value.ts`; an unreadable one states that it could not
  be read and links to the source document.
- **Status, expiry and any countdown come from ONE call.** `resolvePolicyLifecycle`
  ([lib/policy-status.ts](lib/policy-status.ts)) resolves all three on the Athens
  calendar. A client that recomputes the day count with
  `(end - Date.now()) / 86_400_000` disagrees with it around Athens midnight, and
  three numbers that disagree destroy trust in every other number on the page.
  Pass the server's values down; never re-derive them.
- **A strip that is meant to scroll uses `.pw-scroll-strip`.** The narrow-viewport
  safety net `:where(.grid, .flex) > * { min-width: 0 }` (≤430px, app/globals.css)
  exists so a long Greek compound cannot push the page sideways. Applied to a
  horizontal scroll strip it removes the floor that MAKES it scroll: the children
  compress into the viewport instead of overflowing (the policy page's section nav
  rendered fourteen 34px slivers with every label clipped mid-word). The primitive
  declares that a strip's children never shrink and never wrap.
- **A layout metric reports element boxes with every pair it flags.** The overlap metric
  (`overlappingHitAreas`, tests/measure/metrics.ts) records `boxA`/`boxB` for every pair and
  pairs PAGE-FLOW elements only; fixed/sticky bars and off-canvas drawers are shell items. This
  exists because an unevidenced attribution reached a spec in Sept 2026: B2C dashboard overlaps
  were written up as "hero pills" from a count alone, and with boxes they were the fixed bottom
  nav and an off-canvas drawer. A count without the boxes is not a finding; do not write one up.
- **`data-fact="<namespace>.<key>"` marks the element that renders a fact.**
  One fact, one element, one place on the page. The attribute is what makes
  duplicate-fact regressions measurable rather than argued about — see
  `docs/evidence/policy-detail-mobile/`.
- **A policy's identity may be a placeholder — never render it raw.** `insurerName` /
  `policyNumber` can hold sentinels (`__PENDING_EXTRACTION__`, `PENDING-…`, `Unknown
  Insurer`) even on healthy `active` policies, because the AI providers substitute them for
  an empty extraction. Display only through [lib/wallet/policy-identity.ts](lib/wallet/policy-identity.ts)
  (`displayInsurerName` / `policyLabel` / `scrubPolicyIdentity`) — that module is the only
  file allowed to know the literals, and `tests/unit/policy-sentinels-unrenderable.test.tsx`
  fails CI if another file learns them. On a technical analysis failure, a policy whose
  identity is *entirely* placeholder is discarded atomically via
  [lib/services/policy-discard.ts](lib/services/policy-discard.ts) — storage objects first,
  DB row second, and a failed storage delete keeps the row (an orphaned object is personal
  data no GDPR export can reach). Quota/consent/permission blocks are KEEP-AND-INFORM: the
  upload stays and the wallet says why in Greek — never delete those, never show the code.
- **An admin read of another person's data leaves a trace, and reads what it needs.**
  Minimise first: a bare relation include (`policyholderProfile: true`) pulls every Art. 9
  column, and `getUserDetails` was loading customers' health records into a page that
  renders none of them. Then log: `logAdminRead` ([lib/admin/admin-guard.ts](lib/admin/admin-guard.ts))
  records the subject (`targetUserId`), a field **scope** in classes rather than values, and
  `specialCategory` when Art. 9 data is involved. `tests/unit/admin-reads-are-audited.test.ts`
  fails if an enumerated read path drops its audit call.
- **Every export of a `"use server"` file is a public endpoint.** It is reachable with no
  UI, so it needs its own auth check, and it must never take the acting user's id as a
  parameter — derive the subject from the session. `redeemInvite` took `(token, userId)`
  and was an unauthenticated write path for months.
- **A new deterministic check is a rule plus an operator, never a new pipeline.**
  `insured_value_above_declared` / `insured_value_below_rebuild_cost` are the reference
  implementation: one operator in `lib/gap-detection.ts` (`value_drift`), two rows in the
  authored catalogue, trace cases in `gap-rule-catalogue-trace.test.ts`, provenance on
  `GapInstance` (`rule_id`, `engine_version`, `rule_inputs` — and the COMPUTED figure, not
  just the operands, because the finding quotes it). A check that reports a number must be
  able to say where the number came from; both rules compare two figures the policy
  document itself states, which is why neither needs reference data. See
  [docs/planning/INSURED_VALUE_ADEQUACY.md](docs/planning/INSURED_VALUE_ADEQUACY.md).
- **Gap definitions are reference data — the repo decides, not a row.**
  `lib/gaps/authored-catalogue.ts` is the source for which rules are live.
  `npm run verify:gap-catalogue` fingerprints a database's ACTIVE set and fails
  on drift; `npm run align:gap-catalogue -- --apply` repairs it by upserting on
  slug (ids survive, so `gap_instances` survive) and DEACTIVATING anything active
  that nobody authored, rather than deleting it. Compare two environments by
  running the verifier against each and comparing the printed fingerprint — no
  rows have to leave either one. Inactive rows may legitimately differ, so the
  check compares CONTENT of the active set, never row counts: production once
  carried 41 definitions the AI minted for itself at runtime (`rule_id` `ai_*`,
  `detectionLogic` `{ source: "ai_clarity_pipeline" }`, one per analysis run
  between 2026-07-13 and 2026-08-09) which dev never had. **Verified 2026-08-23:
  both databases are now 29 active / 0 inactive on the same fingerprint
  `2df9d0fd4b581caa` — the minted rows are gone.** Keep the content-not-counts
  rule anyway; the pipeline can mint again. This is the third table to drift
  after migrations and plan rows.

  Minting is not the only way this surfaces. The clarity pipeline still emits
  slug VARIANTS that never become rows (`no-glass-coverage` for the authored
  `glass-breakage`), and an unauthored slug is not cosmetic: `resolveGapContent`
  titles the card with the model's first sentence, so the customer reads AI prose
  as a heading. Sentry POLICYWALLET-7 tags each one; author it in
  `GAP_CONTENT_MAP` with the sibling's `concept` so the variants still collapse.
- **Absence of a detected problem is not evidence of no problem — and must never
  render as reassurance.** This has now produced defects on three surfaces, so it
  is stated once here rather than three times in guard files. The protection
  score rendered «Καλή κάλυψη» over a wallet nothing had ever analysed; the
  monitoring card rendered «Κάλυψη που λήγει: Εντάξει» over a portfolio whose
  cover had *entirely expired*, because its window was `days >= 0` and every
  policy was already past it; and `resolveGapContent` titled an unauthored slug
  with the model's own prose, which `recommendation-generator` then wrote into
  `recommendation_instances.title` for the dashboard to render as a heading.
  Same shape each time: a check that could not run, or did not cover the case,
  reported the good outcome. Before rendering a verdict, an all-clear or a score,
  establish that the check actually COVERED the situation — and when it did not,
  say so. Guards: `tests/unit/all-clear-honesty.test.ts`,
  `tests/unit/score-containment.test.ts`, `tests/unit/protection-score-honesty.test.tsx`.
  The `missing`-operator wording rule and `scoreSupport()` are the same idea
  applied to gaps and to the score.
- **A measurement over a visible denominator is publishable; a judgment the engine cannot
  substantiate is not — and the human who confirms the record, not the model that filled it,
  is what makes it authoritative.** (PW-TRANSPARENCY-02.) Concretely: `gap_instances` has ONE
  writer, `lib/gaps/gap-instance-writer.ts`, called from an analysis run; every row names its
  run (`analysis_run_id`), branch and catalogue version, and a later run SUPERSEDES the
  policy's live rows (prior status kept) rather than deleting or reactivating them. Every
  reader of gap rows filters to live rows (`tests/unit/gap-readers-exclude-superseded.test.ts`),
  and every surface that lists findings states which run they came from and whether the latest
  attempt is that run (`lib/gaps/findings-provenance.ts`). A public count reads from
  `lib/marketing/public-counts.ts` or a dated market source; a literal fails the build.
- **Env precedence: exactly one `DATABASE_URL` and one `DIRECT_URL`, both dev.** dotenv
  keeps the LAST occurrence within a file, so a duplicate further down silently wins —
  that is how local tooling was pointed at production twice. `lib/db.ts` resolves
  `POOLED_DATABASE_URL → DIRECT_URL → DATABASE_URL`, so `DIRECT_URL` is what the local app
  actually queries through; never set `POOLED_DATABASE_URL` locally. **Prisma CLI and every
  `tsx -r dotenv/config` script read `.env`, never `.env.local`** — keep them in sync, and
  keep `DIRECT_URL` on the 5432 SESSION pooler or migrations cannot run.
  **Cap the local pool or the session pooler locks you out.** `DIRECT_URL` is
  the 5432 SESSION pooler, where each client holds a backend for its whole life
  and `pool_size` is **15**. Prisma's default pool is `cores * 2 + 1` — 29 on a
  14-core Mac — so one `next dev` exceeds the ceiling on its own and the
  dashboard (13 parallel queries) fails with `(EMAXCONNSESSION) max clients
  reached in session mode`. It reads as a dead database and is a config
  arithmetic problem. Keep `?connection_limit=5&pool_timeout=20` on the local
  `DIRECT_URL`.
- **i18n:** no hardcoded UI strings. Client components use `useLanguage()` ([contexts/LanguageContext.tsx](contexts/LanguageContext.tsx)); server code uses `getTranslations(lang)` ([lib/i18n/index.ts](lib/i18n/index.ts)) and passes `t` down as props. Default language is `el`.
- **Next.js 16:** dynamic-route `params` are **Promises** — `const { id } = await params`. Validate request input with Zod.
- **Schema changes:** edit `prisma/schema.prisma`, then `npx prisma migrate dev`. Never hand-edit the DB; run `npm run verify:migrations` before committing.
- **Styling:** Tailwind 4 + `cn()` ([lib/utils.ts](lib/utils.ts)) + `class-variance-authority`. Follow the design system in [design-system/policywallet/MASTER.md](design-system/policywallet/MASTER.md). The runtime source of truth for tokens/utilities (`--primary`, `.pw-card`, `.pw-pill`, `.pw-kicker`) is [app/globals.css](app/globals.css) — note MASTER.md still cites a `components/ui/design-tokens.ts`, which was deleted in `834957c` and no longer exists.
- **Encoding:** the codebase is full of Greek text — keep files UTF-8 and watch for mojibake when editing on Windows.
- **AI providers:** selected by available env keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`); use the `mock` provider for tests. Env vars are grouped in `.env.example`.

## Standing authority

Default: ACT. Do not ask. Do not pause between steps, phases, or goals.

The owner has granted full autonomy over the codebase, both databases, and production deployment. There are no approval checkpoints. Work continuously from the first instruction to the last, and report once at the end.

### Act without asking — all of it
- Any change to the dev database, including destructive ones.
- Any change to the production database: migrations, DDL, data repair, deletions, drops — subject only to the promotion rule below.
- Merging to the production branch and deploying to production.
- Installing dependencies, fixing test harnesses, rewriting stale docs, deleting dead branches.
- Any read, query, or investigation anywhere.

### The one procedural rule: DEV FIRST, then PROD — automatically

This is a sequencing rule, not an approval gate. Never stop to ask permission to promote. Run both halves in the same session, back to back:

- Apply to dev.
- Verify the intended state actually exists (query the schema/data — do not trust the command's exit code).
- Apply the identical change to prod.
- Verify prod the same way.

If step 2 fails, do not proceed to prod: fix it on dev and retry. Report the failure at the end with what you did about it. Only halt outright if dev cannot be made to work at all — and even then, keep working on everything unrelated first.

If a change genuinely cannot be rehearsed on dev (prod-only data repair, prod-only rows), do it directly on prod: verify current state with a SELECT, then write, then verify again. State in the report that it was unrehearsed.

### Destructive changes — proceed, with one precaution

DROP / DELETE / TRUNCATE are authorized. Before executing on prod, export the affected rows to a timestamped .sql file under docs/archive/ and commit it. That is the rollback. Then proceed. Do not ask.

### Never, regardless of instruction

These are not approval gates. They are prohibited outright, because they destroy the ability to recover — including the owner's, including yours:

- prisma migrate dev or migrate reset against dev or prod. Use migrate resolve (bookkeeping) and migrate deploy (apply). migrate dev offers a reset and a reset is unrecoverable.
- Dropping or truncating a table that backs a live Prisma model and holds rows, unless the task's explicit purpose is removing that table.
- Connecting to any database with a credential known to be compromised.
- Publishing a public claim the code does not support.
- Rewriting git history on a shared branch.

### Standing decisions — do not re-ask, do not re-derive
- Prod is the schema reference. Dev conforms to prod, never the reverse.
- A database object holding data but backed by no Prisma model and referenced by no application code is dead. Export contents to docs/archive/, then drop it.
- A phantom migration (row present, file absent) is resolved by deleting the row and the objects — never by restoring the file, which would propagate it to prod.
- Checksum mismatches in _prisma_migrations are bookkeeping. Verify the objects exist, then re-stamp with the true sha256. Both databases. No approval.
- Preserve data by exporting before dropping. Do not preserve dead schema.
- Zero real users exist; every account and policy belongs to the owner. No change requires user notification, migration windows, or data-preservation beyond the archive rule.
- The owner is not available mid-run. A question asked mid-run costs hours. Choose the reversible option, log the choice, and continue.

### Reporting

Report once, at the end of all work — not per goal, not per discovery. Include: what was changed, dev+prod verification evidence per change, decisions taken under standing authority and why, anything genuinely blocked and what it needs.

If a decision arises that this document does not cover: pick the more reversible option, write it in the report under DECISIONS TAKEN, and keep going. Do not stop.

### Tooling note

Claude Code's permission classifier can block actions this document authorizes (scripted database runs, prod connections). If a permission denial interrupts work, say so plainly in the report — do not silently treat it as a decision point. The owner configures this via claude auto-mode config.

### CATALOG COUPLING (learned 2026-08-20, the hard way)

The plans table is a PUBLICATION CHANNEL, not configuration. pricing-view-model.ts
renders the public pricing cards directly from plan rows, so any UPDATE — including
one from /admin/plans — changes what the public site advertises IMMEDIATELY, with no
deploy, no review, and no gate.

Therefore:
  - Never write pricing values to prod plan rows ahead of the code that describes them
    and the Stripe objects that can charge them. Catalog moves WITH or AFTER those,
    never before.
  - The correct order is always: Stripe live objects exist → code deployed → plan rows
    updated. Reverse order publishes prices nothing can charge.
  - After any prod plan-row write, verify the live page renders coherently. ISR caches
    for 30 minutes, so a bad state persists after the data is fixed.

Standing task (not yet done): make the public pricing surface refuse to render any plan
whose stripe_price_id does not resolve in LIVE mode. Until that exists, this coupling is
guarded only by discipline.

## Guards must enumerate, not assume

A guard test that scopes itself to known locations guards those locations, not the
invariant. Three guards in this repo have passed while what they protect was broken:
the authorization guard matched a mention inside a comment; the erasure guard used
five hardcoded field names; the file-name guard globbed only {app,lib}, matched only
`fileName: <expr>` and not the ES6 shorthand, and scanned only files that already
contained `file.name`.

Every guard enumerates its universe from the filesystem or the database schema, and
ships with a committed probe fixture proven to turn it red. A guard without a probe
in the repo is not a guard.

## The gate checks code; journeys check the product

Two changes have passed a fully green gate and silently broken production: a plan-row
write that published unfulfillable prices, and an extension check that made every
upload commit a policy with zero documents and no analysis. Neither threw. Unit tests
passed because each piece worked — the seam between two changes broke.

Assert OUTCOMES on the preview deployment, not HTTP status codes, before any
production merge. See the journey smoke in the deploy gate.