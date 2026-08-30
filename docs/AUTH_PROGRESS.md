# AUTH_PROGRESS — signup rebuild ledger

Brief: split-screen auth shell, phone removal, phased social login (2026-08-31).
Rules: work A0→A8 in order; missing decisions land in `docs/ASSUMPTIONS.md` with
`[verify]`; verify each goal on :3000 at 375/393/768/1024/1440, both themes.

| # | Goal | Status | Evidence / notes |
|---|------|--------|------------------|
| A0 | Audit (`docs/auth-audit.md`) | **DONE** | 16-section audit: phone is the login IDENTIFIER (synthetic emails, auto-verified, no recovery); no SMS exists; terms discarded at signup; callback route reusable for OAuth; guard-test inventory |
| A1 | Tokens + components in /styleguide | — | |
| A2 | Phone removal + email required + verification | — | |
| A3 | Split-screen shell | — | |
| A4 | Content per §2.5 | — | |
| A5 | Google (phase 1) | — | |
| A6 | Facebook + LinkedIn scaffolding (`status: off`) | — | |
| A7 | Adjacent screens on AuthShell | — | |
| A8 | Review passes + handover | — | |

## Log

- 2026-08-31: A0 done — `docs/auth-audit.md` (§1–§16), ASSUMPTIONS AUTH-01…07.
  Headline: removing phone is retiring an IDENTIFIER, not a field; email becomes
  the only identity for new accounts and real verification becomes universal.
- 2026-08-31: Ledger opened. Found existing role routes (`app/auth/signup/{policyholder,agent}`),
  existing `app/auth/callback/route.ts`, `verify-email`. Brief's `packages/grafi/` does not
  exist — the Grafí token layer lives at `app/grafi.css` + `src/design-system/` on this
  branch and is used instead (assumption logged).
