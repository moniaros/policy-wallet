# Database & Client Update Instructions

During the update of the Token Tracking system, the database schema was successfully updated (via `db push`), but the **Prisma Client generation failed** due to a file lock (`EPERM` error), likely because the development server was running.

## 🚨 Critical Action Required

To fix the type errors and ensure the application runs correctly, you must:

1. **Stop your running development server** (Ctrl+C).
2. Run the following command to update the Prisma Client:
   ```bash
   npx prisma generate
   ```
3. Restart your development server:
   ```bash
   npm run dev
   ```

## Changes Applied
- **Schema**: Added `TokenUsage`, `TokenBalance`, `TokenPurchase`, `MonthlyTokenUsage` models.
- **Relations**: Updated `User` and `Policy` models.
- **Auth**: Updated Admin API routes to explicitly check for `admin` role using Supabase Auth helper.
- **Refactor**: Wallet actions now use centralized `GapAnalysisService` and `GeminiAIService` with token tracking.
