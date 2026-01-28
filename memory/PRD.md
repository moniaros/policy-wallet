# PolicyWallet - Product Requirements Document

## Platform Overview
PolicyWallet is a modern insurance management SaaS platform for agents and policyholders, built with Next.js 16, Prisma ORM, Supabase Auth, and Google Gemini AI.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Supabase Auth
- **AI:** Google Gemini 2.5 Flash
- **Styling:** Tailwind CSS 4
- **Payments:** Stripe
- **Email:** Brevo
- **Rate Limiting:** Upstash Redis

## User Personas
1. **Policyholders** - Manage personal insurance policies
2. **Agents** - Manage customer relationships and policies
3. **Administrators** - Platform management

## Core Features
- Multi-role authentication (policyholder, agent, admin)
- AI-powered policy document analysis
- Coverage gap detection
- Customer relationship management
- Opportunity tracking
- Questionnaire system
- Notification system
- Subscription/billing
- Multi-language (Greek/English)
- Dark mode support

## What's Been Implemented
- [x] Full authentication flow with email verification
- [x] Policy wallet (CRUD, upload, share)
- [x] AI document extraction (Gemini)
- [x] Gap analysis with multilingual insights
- [x] Agent dashboard with metrics
- [x] Customer management (manual + bulk CSV import)
- [x] Opportunity tracking
- [x] Comprehensive Prisma schema (30+ models)
- [x] Sentry error monitoring
- [x] CI/CD workflows

## Architecture Analysis Completed (Jan 28, 2026)
Created `/app/ARCHITECTURE_IMPROVEMENTS.md` with recommendations:
- Service Layer Pattern
- Centralized Error Handling
- Repository Pattern
- Type Safety Improvements
- API Versioning Strategy
- Caching Strategy
- Event-Driven Architecture

## Prioritized Backlog

### P0 - Critical
- [ ] Implement Service Layer (decouple business logic from actions)
- [ ] Add comprehensive test coverage
- [ ] Complete admin portal functionality

### P1 - High Priority
- [ ] Centralized error handling
- [ ] Repository pattern for data access
- [ ] Remove `as any` type casts

### P2 - Medium Priority
- [ ] Caching layer implementation
- [ ] Event-driven notifications
- [ ] API documentation

## Next Tasks
1. Implement PolicyService and GapAnalysisService
2. Add AppError class and error handler utility
3. Create domain type definitions (enums, interfaces)
4. Add unit tests for business logic

---
*Last Updated: January 28, 2026*
