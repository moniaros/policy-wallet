# AUTH AUDIT — A0 (2026-08-31)

Scope: everything the signup rebuild touches — the phone field's full blast radius,
the auth routes, the verification mechanism, and (for A5) the exact OAuth scopes.
Companion ledger: [AUTH_PROGRESS.md](AUTH_PROGRESS.md). Brief: split-screen shell,
phone removal, phased social login.

## Headline finding

**Phone is not a profile field at signup — it is the account's primary login
identifier for every user who left email blank.** The system mints a synthetic
email from the phone (`phone_306912345678@phone.policywallet.app`,
`lib/auth/phone-auth.ts:36-39`) and uses it as the Supabase identity
(`app/auth/actions.ts:348`). Three consequences the brief did not know:

1. **Phone-only accounts skip verification entirely** — `emailVerified` is set at
   creation for synthetic emails (`app/auth/actions.ts:399,408`), verifying
   nothing. The gate test names the hole: `tests/unit/email-verification-gate.test.ts:43`
   ("incl. phone-only auto-verified").
2. **Phone-only accounts have no recovery path.** Every reset flow is email-only
   (`app/auth/forgot-password/page.tsx:32`, `app/api/auth/reset-password/route.ts:10-23`,
   magic link `app/api/v1/auth/magic-link/request/route.ts:9-31`), and the synthetic
   domain receives no mail.
3. **Sign-in has a phone tab** (`app/auth/signin/page.tsx:270-301`) that resolves a
   typed mobile back to the synthetic email (`resolveAuthEmailIdentifier`,
   `lib/auth/phone-auth.ts:45-59`). It must keep working for existing synthetic
   accounts (owner-test cohort; zero real users per standing decisions) or they
   are locked out — a data question, not a form question.

So the brief's §2.2 is not "delete a field": it is **retire an identifier**. Email
becomes the only identity for new accounts; the synthetic-email resolver stays for
the existing cohort; the auto-verify shortcut disappears, which makes real email
verification mandatory for every new account.

## 1. Where phone lives (schema)

| Model.field | Column | Null | Created by |
|---|---|---|---|
| **User.phoneNumber** | `phone_number` | nullable, **no unique, no index** | `prisma/migrations/20260328201702_passkeys_and_user_fields` |
| AgentProfile.phone | `phone` | nullable | `20260328201700_agent_branding_and_collaboration` |
| Tenant.phone / Insurer.claimsPhone+roadsidePhone / FormSubmission.phone / PartnerOffer.redemptionPhone | — | nullable | various |

Only `User.phoneNumber` is in scope. It is already nullable → **no schema change
needed**; the column stays (agent product + existing rows), per brief §2.2.

## 2. Every write of User.phoneNumber

- **Signup** (the path being rebuilt): `app/auth/actions.ts:343` (normalize+hard-fail),
  `:367` (Supabase user_metadata), `:395` (phantom-activation update), `:408` (create),
  `:425` (ops signup email).
- **Settings**: `app/(protected)/account/actions.ts:241,249` (truthiness-guarded —
  cannot clear), `app/api/v1/me/route.ts:87` (PATCH; can null).
- **Agent-created customers** (unaffected by signup change):
  `lib/services/customer.service.ts:279`, `app/(protected)/agent/actions.ts:745,1272`,
  `app/api/v1/customers/bulk-import/route.ts:100`.
- **Erasure**: `lib/services/gdpr-erasure.service.ts:414` (→ null);
  drill `scripts/gdpr-erasure-drill.ts:48,126`.

## 3. Every read of User.phoneNumber

- Settings row: `app/(protected)/account/data.ts:28,39` →
  `components/settings/sections/ProfileSection.tsx:65-80` — already framed optional
  with the exact hint the brief asks to keep: el.ts:2394
  «Προαιρετικό. Το βλέπει ο σύμβουλός σας, αν έχετε συνδεθεί με κάποιον.» /
  en.ts:2365. **No change needed there.** (Known mismatch: settings validator
  accepts any 8+ digits, signup only `+3069…` — `ProfileSection.tsx:72-77`.)
- Agent views of customers (identity-gated): `lib/services/customer.service.ts:64,107,213`,
  `app/(protected)/agent/actions.ts:92`, `app/(protected)/agent/page.tsx:69` (agent's
  own branding falls back to account phone), `components/agent/UploadPolicyModal.tsx:340`,
  matching in `lib/services/customer-resolution.service.ts:111-175`.
- Admin: `app/(protected)/admin/actions.ts:283,665`, `admin/users/[id]/page.tsx:81`.
- Ops email: `lib/email/admin-emails.ts:35,64` (renders only when present).
- DSR export: `lib/services/compliance.service.ts:44` (Art. 15 select — keep).
- Engagement scoring: `lib/services/engagement-scoring.ts:85` (+3 if phone present) —
  new signups will simply not earn these 3 points; acceptable, noted.

## 4. Signup validation today (both forms)

- Client `app/auth/signup/SignupForm.tsx:24` — `mobileNumber` required + Greek-mobile
  refine (`lib/auth/phone-auth.ts:3-23`, `/^69\d{8}$/` only); email optional (`:25`),
  labelled «Email (προαιρετικό)» (`:316`); `+30 ` pre-fill and mask (`:46-59,106`).
- Server `app/auth/actions.ts:30-31` (required), `:52-59` (email+name required only
  for agents), `:343-346` (second hard gate).
- Verified on :3000 (2026-08-31): no `required` attributes, **no `autocomplete`
  anywhere**, uppercase labels, cross-link above the form, submit «Δημιουργία
  Πορτοφολιού» vs H1 «Δημιουργία λογαριασμού».

## 5. Verification today

No SMS OTP; no Supabase confirmation email. A **custom self-issued token**:
`registerUser` signs up against Supabase (`actions.ts:361-374`), creates the DB row
(`:399-411`), sends its own `VerificationToken` link → `/auth/verify-email`
(`:456-465`), then **signs the user in immediately** (`:467-471`). Redemption:
`app/auth/verify-email/actions.ts:12-79` (sets `emailVerified`, best-effort
`email_confirm` in Supabase). The enforcement gate `emailVerificationRequired`
(`lib/auth-helpers.ts:106-113`) is **flag-gated off by default**
(`auth.enforce_email_verification`), enforced at `app/(protected)/layout.tsx:33` and
`app/onboarding/layout.tsx:14`. `app/auth/callback/route.ts` is the OAuth/magic-link
exchange path and already syncs `email_confirmed_at` → `emailVerified` (`:26-32`).

## 6. Recovery and notifications

- Recovery: email-only everywhere (§ headline). No phone anywhere in reset.
- **No SMS transport exists**: `IMPLEMENTED_CHANNELS = ["in_app","email","push"]`
  (`lib/notifications/channels/index.ts:121`), `sms`/`whatsapp` are `notBuilt`
  (`:100-101`), preferences API rejects an `sms` key
  (`app/api/v1/notifications/preferences/route.ts:18,50`), no provider or env var in
  the repo. **No verification, recovery or notification path assumes a phone** —
  the brief's §2.2 fallback audit closes empty.

## 7. Phone-removal dependency order (drives A2)

1. Make email required in both client and server schemas; drop `mobileNumber` from
   both and from the forms.
2. Delete the synthetic-email branch from `registerUser` (`actions.ts:348`) for NEW
   accounts; `authEmail` = the real email, always.
3. Delete the auto-verify shortcut (`:399,408`) — every new account goes through the
   real token flow; keep the immediate sign-in (verification is enforced by the
   existing flag gate, and no route can any longer create an account with an
   unverifiable identity).
4. Keep `resolveAuthEmailIdentifier` + the sign-in phone tab for the existing
   synthetic cohort (do not strand them); new accounts never mint synthetic emails.
5. Replace the `Policyholder ${phone.slice(-4)}` displayName fallback
   (`actions.ts:354`) with an email-derived one.
6. Settings phone stays exactly as is (already optional, correct hint).

## 8. OAuth scopes to be requested (A5/A6 plan)

Auth is Supabase; social login goes through `supabase.auth.signInWithOAuth` and the
existing `/auth/callback` exchange. Scopes requested, per provider — profile+email
only, nothing that can post or read contacts (brief §2.3):

| Provider | Phase | Scopes | Notes |
|---|---|---|---|
| Google | 1 (live) | `openid email profile` | Google account IS the email the product depends on |
| Facebook | 2 (`status: off`) | `email public_profile` | Meta app review needed for `email`; may return no email → flow must collect+verify one before the account is usable |
| LinkedIn (OIDC) | 3 (`status: off`) | `openid email profile` | agent-form candidate only |

Role transport: never a user-editable query param — signed, httpOnly, short-lived
cookie set at redirect time and validated in `/auth/callback` (plus Supabase's own
`state` for CSRF). Account linking, no-email fallback, and terms recording are A5
build items; scope documentation here is the A0 deliverable.

## 9. Route map (today)

No shared visual layout: `app/auth/layout.tsx` renders zero DOM (providers only —
`AuthLanguageProvider` → `TranslationsProvider`, order pinned by
`tests/unit/auth-layout-provider-order.test.ts`). Every page self-shells with its
own card, header and even FONT (Inter on signup/confirmation/forgot-password,
IBM Plex Sans on verify-email/auth-code-error/reset-password/handover, none on
signin). Routes: `/auth/signin`, `/auth/signup` (307 → role variant),
`/auth/signup/{policyholder,agent}` (one shared `SignupForm` with `fixedRole`),
`/auth/signup/confirmation`, `/auth/verify-email`, `/auth/forgot-password`,
`/auth/reset-password`, `/auth/auth-code-error`, `/auth/handover` (native bridge),
`/auth/callback` (route handler). A7's "no orphan layouts" = all of these onto
`AuthShell` except `/auth/callback` (no UI) and `/auth/handover` (device bridge —
gets the single-column shell).

## 10. Signup mechanics (today)

Server action `registerUser` (`app/auth/actions.ts:321`): rate-limit 5/15min →
Zod (server schema stricter: confirmPassword, role enum, invite token, agent
licence/agency, plan echo) → Supabase `signUp` with `user_metadata`
`{full_name, role, language, phone_number, selected_plan…}` → explicit Prisma
`User` create/update (**no DB trigger**; phantom-row activation branch clears
agent-attested AI consent) → agent profile upsert → invite redemption → custom
verification email → **auto sign-in** → redirect string. Role is read back from
`user_metadata.role` by `proxy.ts` and signin routing (`lib/auth/role-routing.ts`).

## 11. OAuth (today: none) and the callback

Zero `signInWithOAuth` calls; no social provider anywhere. `app/auth/callback/route.ts`
is the PKCE exchange (currently only the unused magic-link path lands there) and
already: syncs `email_confirmed_at` → `User.emailVerified`, clears stale
verification tokens, writes `securityEvent`/`activityLog`, processes the
`pw_referrer` cookie, syncs Brevo CRM by role, sanitizes `next`. **A5 reuses this
route**; what it lacks for social login: DB-row creation for first-time OAuth users
(today only email signup creates rows), role transport, account-linking rules, and
terms recording.

## 12. Verification and its gate (today)

Custom `VerificationToken` (1h) + `/auth/verify-email`; Supabase's own confirm
email unused (no `emailRedirectTo` at signup, zero `verifyOtp`). The enforcement
gate `emailVerificationRequired` (`lib/auth-helpers.ts:107-113`) is OFF by default
behind flag `auth.enforce_email_verification` — the two sweeps disagree on whether
any layout calls it (one says `app/(protected)/layout.tsx:33` + onboarding, one
says no caller); settle by grep in A2 before relying on it. Unverified sessions can
currently do everything; confirmation page's Skip goes to `/dashboard`.

## 13. Reset paths (three parallel implementations)

A: forgot-password → custom 30-min token → reset-password (service-role password
set). B: signin modal → `/api/auth/reset-password` 6-digit OTP (10 min,
Greek-only email). C: session-based `updateUserPassword`. A7 restyles A and the
signin entry; B/C are logic, untouched.

## 14. Rate limits / CSRF / captcha (today)

Upstash-backed limits on register (5/15min), resend-verification, reset-request,
verify (10/15min), magic-link (5/5min); `/api/*` blanket 60/60s in proxy. Gaps:
`resetPasswordWithToken` and `updateUserPassword` have no limiter of their own.
CSRF: no explicit token — Server Actions ride Next's built-in Origin/Host binding
+ SameSite cookies (documented as the mechanism; see ASSUMPTIONS AUTH-06). No
captcha exists.

## 15. Terms + Article 9 (today)

`termsAccepted` is validated and **discarded** — signup writes no
`termsVersionAccepted`, no `ConsentAudit` row (schema has both;
`enum ConsentType` includes `terms`). Only `POST /api/v1/consents` writes them
(cookie banner + AI-consent modal). **A2 adds terms recording to `registerUser`;
A5 adds it to the OAuth path** («Με τη συνέχεια αποδέχεστε…» + server-side row
with version/timestamp/source). Article 9 / AI-processing consent is confirmed at
first upload (AiConsentModal at wallet add/analysis/onboarding), NOT at signup —
stays there, per brief §3.

## 16. Guard tests that pin the rebuild

Preserve while rebuilding: `auth-layout-provider-order`, `auth-form-validation-wiring`
(terms aria-describedby/aria-invalid ids), `auth-errors-localized` +
`auth-zod-messages-localized`, `no-fake-biometric-auth-claim`,
`always-dark-surfaces` (8 auth files — read before styling),
`locale-toggle-consistency` (one LocaleToggle), `landing-a11y-interaction-contracts`
(signin/SignupForm/forgot-password), `marketing-content-contracts` (no bare
/terms|/privacy|/auth hrefs — authHref/localizeHref only; no opacity-0 card
mounts), `no-overpromise-copy` (all of app/auth), greek-string-inventory (119
app/auth entries — regenerate with every copy change), e2e `tests/e2e/auth.spec.ts`
(signin fields, policyholder has no #signup-name, agent does, /auth/signup 307,
cross-links) and `tests/auth.setup.ts` (E2E logs in through the SIGNIN UI —
keep its selectors working).
