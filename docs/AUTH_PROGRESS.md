# AUTH_PROGRESS — signup rebuild ledger

Brief: split-screen auth shell, phone removal, phased social login (2026-08-31).
Rules: work A0→A8 in order; missing decisions land in `docs/ASSUMPTIONS.md` with
`[verify]`; verify each goal on :3000 at 375/393/768/1024/1440, both themes.

| # | Goal | Status | Evidence / notes |
|---|------|--------|------------------|
| A0 | Audit (`docs/auth-audit.md`) | **DONE** | 16-section audit: phone is the login IDENTIFIER (synthetic emails, auto-verified, no recovery); no SMS exists; terms discarded at signup; callback route reusable for OAuth; guard-test inventory |
| A1 | Tokens + components in /styleguide | **DONE** | components/auth/* (AuthShell, TrustPanel+MobileTrustFacts, SocialAuthRow/Button, AuthDivider, FormField+AUTH_INPUT_CLASS, PasswordField, TermsCheckbox, FormError, RoleSwitchLink, DesktopOnly) + lib/auth/social-providers.ts registry + lib/auth/oauth-intent.ts signed cookie + app/auth/social/actions.ts; styleguide section verified on :3000 (states, stamps, error ids); tokens carry both themes |
| A2 | Phone removal + email required + verification | **DONE** | RegisterSchema email-required/phone-gone; synthetic emails minted for NO new account; auto-verify shortcut deleted (emailVerified:null + universal token email); terms+privacy now RECORDED (ConsentAudit ×2 + version stamps, source "signup"); sign-in phone tab kept for existing cohort; guards updated (auth-errors list, wiring→TermsCheckbox) |
| A3 | Split-screen shell | **DONE** | AuthShell live on both signup routes; 375: 16px gutters, no card chrome, sticky header, 16px inputs; 768: aside subtree EMPTY (DesktopOnly omission proven), MobileTrustFacts text path; 1440: 55/45 split, brand-fill panel; dark via tokens; zero animations |
| A4 | Content per §2.5 | **DONE** | Role-differentiated H1/sub/underCta verbatim from brief; «Δημιουργία λογαριασμού» submit (Πορτοφολιού retired); sentence-case labels; cross-link below submit as a question; EN mirror verified; instructive error copy («Χρειάζομαι ένα email…») |
| A5 | Google (phase 1) | **CODE-COMPLETE** [verify] | Full path shipped: registry → SocialAuthRow → startSocialAuth (server-side URL, PKCE cookies, rate-limited) → signed intent → callback (row birth, role from intent, consent recorded source=oauth_signup, role-mismatch guard, email-verified sync by EMAIL — fixed the id-keyed lookup that no-opped). BLOCKED on owner: Google OAuth client + Supabase provider enablement + prod env flip (ASSUMPTIONS AUTH-05) |
| A6 | Facebook + LinkedIn scaffolding (`status: off`) | **DONE** | Registered off; tests/unit/social-auth-providers.test.tsx (10): off renders nothing, no ghost buttons, no vendor SDK anywhere, LinkedIn agent-only, scopes capped at identity, intent round-trip/tamper/expiry/replay |
| A7 | Adjacent screens on AuthShell | **DONE** | signin (+SocialAuthRow, tabs/OTP dialog intact), forgot-password, reset-password, verify-email, auth-code-error, confirmation, handover — all self-shells deleted; per-page fonts (Inter/IBM Plex) gone; guards re-pointed at AuthShell/TermsCheckbox; five enumerating guards caught the new components (16px→text-base, sentence-case error, «ασφαλιστήρια», PasswordField count exception) and were satisfied, not silenced |
| A8 | Review passes + handover | **DONE** | Three passes written into docs/handover.md (security: two accepted residuals; iPhone-SE: physical-device [verify]; compliance: one open flag on the deletion line); owner checklist for Google go-live; 518 files / 5900 unit tests green. E2E harness run BLOCKED environmentally: the ms-playwright cache holds two half-downloaded builds (1208 missing its headless shell AND its framework dylib) and every re-download was externally killed ×3 — recover with `./node_modules/.bin/playwright install chromium` then `npx playwright test tests/e2e/auth.spec.ts --project=chromium`. The spec's assertions (signin fields, no #signup-name on policyholder, agent has it, /auth/signup 307, cross-links, forgot entry) were each verified live on :3000 via the MCP browser during A2–A7 |

## Log

- 2026-08-31: A0 done — `docs/auth-audit.md` (§1–§16), ASSUMPTIONS AUTH-01…07.
  Headline: removing phone is retiring an IDENTIFIER, not a field; email becomes
  the only identity for new accounts and real verification becomes universal.
- 2026-08-31: Ledger opened. Found existing role routes (`app/auth/signup/{policyholder,agent}`),
  existing `app/auth/callback/route.ts`, `verify-email`. Brief's `packages/grafi/` does not
  exist — the Grafí token layer lives at `app/grafi.css` + `src/design-system/` on this
  branch and is used instead (assumption logged).
