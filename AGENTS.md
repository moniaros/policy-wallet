# AGENTS.md

Guidance for Codex when working in this repository. For setup, environment variables, and the full documentation index, see [README.md](README.md) and [docs/](docs/).

> [CLAUDE.md](CLAUDE.md) is a mirror of this file for Claude Code — apply any edits to both.

## Session workflow

- At the START of a session: read docs/STATUS.md and any relevant docs/audits/*.md, then briefly tell me where we are before doing new work.
- At the END of meaningful work: update docs/STATUS.md (Current phase, Done, In progress, Blocked, Top risks ranked, Next 3 actions). Keep it to one screen.
- When documenting findings, ALWAYS separate "broken / insecure" (gates launch) from "UI/UX I dislike" (does not). Different backlogs.
- Before suggesting a commit, remind me to run the CI guardrails: audit:api-auth, lint, type-check, verify:migrations, and the i18n/utf8 checks.

## Project overview

**PolicyWallet** is a Greek-market insurance portfolio hub serving three roles — **policyholder**, **agent**, and **admin**. It ingests insurance policy documents (PDFs), runs an AI analysis pipeline to extract and translate coverage, detects coverage **gaps**, scores protection, and surfaces recommendations. The UI is fully bilingual (Greek default, English).

Stack is in `package.json`. Two things it won't tell you: AI runs through the `ai` SDK with pluggable Gemini / Anthropic / OpenAI providers (selected by which API key is set), and rate-limiting needs Upstash Redis.

- **Node:** `20.11.0` (see `.nvmrc` — run `nvm use`).
- **Path alias:** `@/*` → repo root (e.g. `import { db } from "@/lib/db"`).

## Commands

```bash
# Dev / build
npm run dev            # Next dev server on http://localhost:3000
npm run build          # Production build
npm start              # Production server (port 3000)
npm run type-check     # tsc --noEmit

# Tests
npm test               # Vitest (unit) — WATCH mode; use npx vitest --run for one-shot
npx vitest --run tests/unit                          # what CI runs
npx vitest --run tests/unit/gap-detection.test.ts    # single file; add -t "name" for one case
npm run test:e2e       # Playwright (E2E); :ui and :headed variants exist
npx playwright test tests/agent-journey.spec.ts --project=chromium   # single E2E spec

# Repo guardrail scripts (see below)
npm run lint               # ESLint
npm run lint:i18n-changed  # Hardcoded-text check on changed files
npm run lint:utf8          # UTF-8 validation of tracked source
npm run lint:encoding      # Mojibake scan of key UI files
npm run audit:api-auth     # API auth policy audit vs. inventory
npm run verify:migrations  # Prisma schema + migration sync check

# Database
npx prisma migrate dev   # Create & apply a migration
npx prisma db seed       # Seed insurers / types / sample data (prisma/seed.ts)
npx prisma studio        # DB GUI
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

### Test layout & Playwright quirks

- Unit tests live in `tests/unit/**` (jsdom, `globals: true`, shared setup in `tests/setup.ts`). Playwright specs are `tests/*.spec.ts` + `tests/e2e/` — Vitest excludes them and Playwright ignores `tests/unit`.
- E2E runs end-to-end on port **3000** (config + dev server aligned; never use :5000 — macOS AirPlay squats it and fools readiness probes). The webServer starts `npm run dev` itself with dummy Upstash env. If Playwright's browsers aren't installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
- **Test users are auto-provisioned** by `tests/global-setup.ts` (Supabase `auth.users` via SQL + Prisma rows + one fixture policy) against the local-dev Supabase from `.env.local` — it refuses to run against prod. Accounts/creds live in `tests/e2e-users.ts`; the auth setups (`playwright/.auth/*.json`) do UI **login only**, never signup.
- Standard local run: `npx playwright test --project=chromium --project=agent-chromium --project=admin-chromium --project=sentry`. Specs are routed to the project whose SESSION can reach the pages they assert on, so the project list is not optional: `agent-chromium` carries the agent session (agent journey, agent console-clean, the agent half of the UI audit), `admin-chromium` carries the admin one (`admin-insurers`, the `/admin/*` half of the UI audit) — leave it out and the admin console is simply never audited. Sentry specs run unauthenticated in their own project. Audit suites are opt-in: `RUN_UX_AUDIT=1` (UX/a11y checklists) and `RUN_VISUAL=1` (screenshot baselines).
- When a click mysteriously times out, it's usually the cookie-consent banner — use `dismissCookieBanner` from `tests/helpers/ui.ts` (locator.isVisible() does NOT wait; the helper uses waitFor).

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
- **Severity is not a verdict until an underwriter says so.** Render it through
  `describeSeverity()` ([lib/gaps/severity-display.ts](lib/gaps/severity-display.ts)) and show
  its `caveatKey`. `tests/unit/gap-severity-display-single-source.test.ts` fails on a new
  hand-rolled severity map and carries the migration debt list.
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
- **i18n:** no hardcoded UI strings. Client components use `useLanguage()` ([contexts/LanguageContext.tsx](contexts/LanguageContext.tsx)); server code uses `getTranslations(lang)` ([lib/i18n/index.ts](lib/i18n/index.ts)) and passes `t` down as props. Default language is `el`.
- **Next.js 16:** dynamic-route `params` are **Promises** — `const { id } = await params`. Validate request input with Zod.
- **Schema changes:** edit `prisma/schema.prisma`, then `npx prisma migrate dev`. Never hand-edit the DB; run `npm run verify:migrations` before committing.
- **Styling:** Tailwind 4 + `cn()` ([lib/utils.ts](lib/utils.ts)) + `class-variance-authority`. Follow the design system in [design-system/policywallet/MASTER.md](design-system/policywallet/MASTER.md). The runtime source of truth for tokens/utilities (`--primary`, `.pw-card`, `.pw-pill`, `.pw-kicker`) is [app/globals.css](app/globals.css) — note MASTER.md still cites a `components/ui/design-tokens.ts`, which was deleted in `834957c` and no longer exists.
- **Encoding:** the codebase is full of Greek text — keep files UTF-8 and watch for mojibake when editing on Windows.
- **AI providers:** selected by available env keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`); use the `mock` provider for tests. Env vars are grouped in `.env.example`.
