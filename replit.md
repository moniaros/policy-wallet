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

## Required Environment Variables
See `.env.example` for the full list. Critical ones:
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL connection strings
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase auth
- `AUTH_SECRET` / `NEXTAUTH_SECRET` — Auth secrets
