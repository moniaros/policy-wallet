# Testing — layout and Playwright quirks

Loaded when working under `tests/`. Moved out of the root `CLAUDE.md`, which every
session pays for, because none of it matters until you are actually running or
writing tests.

- Unit tests live in `tests/unit/**` (jsdom, `globals: true`, shared setup in `tests/setup.ts`). Playwright specs are `tests/*.spec.ts` + `tests/e2e/` — Vitest excludes them and Playwright ignores `tests/unit`.
- E2E runs end-to-end on port **3000** (config + dev server aligned; never use :5000 — macOS AirPlay squats it and fools readiness probes). The webServer starts `npm run dev` itself with dummy Upstash env. If Playwright's browsers aren't installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
- **Test users are auto-provisioned** by `tests/global-setup.ts` (Supabase `auth.users` via SQL + Prisma rows + one fixture policy) against the local-dev Supabase from `.env.local` — it refuses to run against prod. Accounts/creds live in `tests/e2e-users.ts`; the auth setups (`playwright/.auth/*.json`) do UI **login only**, never signup.
- Standard local run: `npx playwright test --project=chromium --project=agent-chromium --project=admin-chromium --project=sentry`. Specs are routed to the project whose SESSION can reach the pages they assert on, so the project list is not optional: `agent-chromium` carries the agent session (agent journey, agent console-clean, the agent half of the UI audit), `admin-chromium` carries the admin one (`admin-insurers`, the `/admin/*` half of the UI audit) — leave it out and the admin console is simply never audited. Sentry specs run unauthenticated in their own project. Audit suites are opt-in: `RUN_UX_AUDIT=1` (UX/a11y checklists) and `RUN_VISUAL=1` (screenshot baselines).
- When a click mysteriously times out, it's usually the cookie-consent banner — use `dismissCookieBanner` from `tests/helpers/ui.ts` (locator.isVisible() does NOT wait; the helper uses waitFor).
