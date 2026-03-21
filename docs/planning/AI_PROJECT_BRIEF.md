# AI Project Brief (PolicyWallet)

Last updated: February 14, 2026
Purpose: A single orientation document for coding agents to quickly build accurate context before making changes.

## 1) Project Identity

- Product: PolicyWallet Platform
- Domain: Insurance policy management SaaS for policyholders, agents, and admins
- Main app path: `policy-wallet/`
- Primary framework: Next.js App Router
- Current maturity snapshot: Status audit (dated February 13, 2026) estimates about 55% production readiness

## 2) Core Stack

- Frontend/backend framework: Next.js `16.1.1` + React `19.2.3`
- Language: TypeScript
- Database ORM: Prisma `5.22.0`
- Database: PostgreSQL (commonly Supabase Postgres)
- Auth/session: Supabase SSR + Supabase Auth
- AI: Google Gemini (`@google/generative-ai`), with model defaults in `lib/env.ts`
- Payments: Stripe
- Monitoring: Sentry
- Testing: Vitest + Playwright
- Styling: Tailwind CSS 4

## 3) Repository Map (High Signal)

- Routing and pages: `app/`
- Protected features: `app/(protected)/`
- Public pages: `app/(public)/`
- API routes: `app/api/` and `app/api/v1/`
- Shared UI components: `components/ui/`
- Domain components:
  - Wallet: `components/wallet/`
  - Agent: `components/agent/`
  - Account: `components/account/`
  - Notifications: `components/notifications/`
- Service layer (business logic): `lib/services/`
- Auth and API helpers: `lib/api-auth.ts`, `lib/auth-helpers.ts`, `lib/api-utils.ts`
- Environment schema: `lib/env.ts`
- Prisma schema/migrations: `prisma/schema.prisma`, `prisma/migrations/`
- Test suites: `tests/`

## 4) Runtime + Setup Commands

Run from `policy-wallet/`:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Quality and validation:

```bash
npm run type-check
npm run lint
npm test
npm run test:e2e
npm run build
```

## 5) Environment Variables (Operationally Important)

Required for baseline local operation:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Frequently needed for feature-complete workflows:

- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `BREVO_API_KEY`, `SENDER_EMAIL`
- `NEXT_PUBLIC_SENTRY_DSN` (and org/project/token for full Sentry integration)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Reference template: `.env.example`

## 6) Auth and Access Model

- Middleware checks sign-in state and redirects unauthenticated users to `/auth/signin`.
- Protected route groups are enforced primarily by route structure + server checks.
- Role-level enforcement is split across layouts, actions, and API routes.
- Important risk from status audit: RBAC is not fully consistent across all `/api/v1/*` routes.

Primary files:

- `middleware.ts`
- `lib/api-auth.ts`
- `app/(protected)/admin/*`
- `app/api/v1/*`

## 7) Data Model Mental Model

Core entities in `prisma/schema.prisma`:

- Identity: `User`, `AgentProfile`, `PolicyholderProfile`, `AdminUser`
- Policy domain: `Policy`, `PolicyDocument`, `GapDefinition`, `GapInstance`
- Collaboration: `AccessGrant`, `Invite`, `CustomerRelationship`, `Opportunity`
- Tasks/questionnaires: `QuestionnaireTemplate`, `QuestionnaireInstance`, `QuestionnaireResponse`, `UserTask`
- Billing/subscription: `Plan`, `Subscription`, `Invoice`, `PaymentMethod`, `Referral`, `CreditTransaction`
- AI usage accounting: `TokenUsage`, `TokenBalance`, `TokenPurchase`, `MonthlyTokenUsage`
- Notifications/audit: `NotificationEvent`, `NotificationPreference`, `ActivityLog`, `SecurityEvent`

## 8) Main User Flows to Understand First

1. Policyholder
- Auth + onboarding
- Wallet list/detail
- Upload document -> AI extraction -> gap detection -> notifications
- Sharing policies with agents

2. Agent
- Dashboard and customer list/profile
- Opportunity tracking from detected gaps
- Questionnaire sending and response collection

3. Admin
- Admin dashboard and user management
- Agent verification
- Insurer/insurance type management
- Token usage oversight

## 9) Current Known Gaps (From February 13, 2026 Audit)

P0 (must solve before launch):

- Consistent RBAC enforcement across all API routes
- Migration/schema sync verification

P1 examples:

- Policy edit/update + renewal workflow
- Real push notifications + automated expiry reminder jobs
- Auth endpoint rate limiting + complete input validation coverage
- Stronger service-layer consistency and test coverage expansion

Source of truth: `STATUS_FEB_13_2026.md`

## 10) Suggested First 30-Minute Context Routine (For Any New Agent Session)

1. Read `STATUS_FEB_13_2026.md` for current risk and priority context.
2. Read `README.md` and `package.json` for stack and scripts.
3. Inspect changed files with `git status --short`.
4. If task touches APIs/auth, review:
   - `middleware.ts`
   - `lib/api-auth.ts`
   - target `app/api/v1/...` route files
5. If task touches policy flows, review:
   - `lib/services/policy.service.ts`
   - `lib/services/gap-analysis.service.ts`
   - wallet UI in `components/wallet/` and `app/(protected)/wallet/`
6. Run targeted tests for touched area, then `npm run type-check`.

## 11) Working Rules for Future AI Edits

- Prefer service-layer integration over direct Prisma queries in UI/actions.
- Keep API response shapes consistent (target pattern: `{ data, error, meta }`).
- Add/extend Zod validation for all new inputs.
- Preserve bilingual behavior (Greek/English) where existing flows support it.
- Avoid introducing new architecture patterns when existing services can be extended.

## 12) Documents Worth Keeping in Sync

- `STATUS_FEB_13_2026.md`
- `PRODUCTION_READINESS_ASSESSMENT.md`
- `TESTING_CRITICAL_FINDINGS.md`
- `ACTION_PLAN.md`

If priorities shift, update this brief date and sections 9-10 first.
