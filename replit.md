# Policy Wallet

## Overview
A Next.js 16 insurance policy management web application (PWA) migrated from Vercel to Replit.

## Tech Stack
- **Framework**: Next.js 16.1.1 (App Router) with Turbopack
- **Language**: TypeScript 5
- **Database**: PostgreSQL via Prisma ORM (schema in `prisma/schema.prisma`)
- **Auth**: Supabase Auth (SSR cookies via middleware)
- **UI**: Tailwind CSS 4, Radix UI, Lucide icons, Framer Motion
- **Payments**: Stripe
- **AI**: Google Gemini API
- **Email**: Brevo (formerly Sendinblue)
- **Monitoring**: Sentry (conditionally enabled — requires SENTRY_ORG and SENTRY_PROJECT env vars)
- **Rate Limiting**: Upstash Redis
- **PWA**: @ducanh2912/next-pwa
- **Package Manager**: npm

## Project Structure
- `app/` — Next.js App Router pages and API routes
- `components/` — React components
- `lib/` — Shared utilities, services, database helpers
- `prisma/` — Database schema and migrations
- `hooks/` — Custom React hooks
- `contexts/` — React context providers
- `types/` — TypeScript type definitions
- `public/` — Static assets
- `scripts/` — Utility scripts

## Development
- **Dev server**: `npm run dev` (port 5000, host 0.0.0.0)
- **Build**: `npm run build`
- **Start**: `npm run start` (port 5000, host 0.0.0.0)

## Replit Migration Notes
- `instrumentation.ts` — Sentry instrumentation commented out (re-enable when Sentry env vars are configured)
- `next.config.ts` — Sentry wrapping is conditional on SENTRY_ORG/SENTRY_PROJECT; `allowedDevOrigins` set for Replit
- Vercel-specific packages (@vercel/analytics, @vercel/speed-insights) remain installed but are non-functional outside Vercel

## Testing
- **E2E Tests**: Playwright with system Chromium (`npx playwright test --project=sentry`)
- **Test files**:
  - `tests/helpers/sentry-helper.ts` — SentryTestHelper class that intercepts Sentry envelope requests
  - `tests/e2e/sentry-client.spec.ts` — Client-side error capture, ignoreErrors filtering, beforeSend dev suppression
  - `tests/e2e/sentry-api.spec.ts` — API route middleware redirects, callback URLs, error tracking integration
  - `tests/e2e/sentry-auth.spec.ts` — Auth flow redirects, invalid credentials, protected route enforcement
  - `tests/e2e/sentry-admin.spec.ts` — Admin route protection, API endpoint middleware, security event handling
- **Run**: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(which chromium) npx playwright test --project=sentry --workers=1`
- 42 tests total across 4 test files

## Required Environment Variables
See `.env.example` for the full list. Critical ones:
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL connection strings
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase auth
- `AUTH_SECRET` / `NEXTAUTH_SECRET` — Auth secrets
