# ⚡ Quick Wins Checklist

**Time Required**: ~6 hours total  
**Impact**: HIGH  
**Do These First!**

---

## 🎯 TODAY (2-3 hours)

### 1. Update README.md (30 min)
```markdown
# PolicyWallet Platform

Insurance management SaaS platform for agents and policyholders.

## Prerequisites
- Node.js 20+
- PostgreSQL database
- Supabase account

## Environment Variables
Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GEMINI_API_KEY` - Google Gemini API key for AI features

## Setup
1. Install dependencies: `npm install`
2. Run migrations: `npx prisma migrate dev`
3. Seed database: `npx prisma db seed`
4. Start dev server: `npm run dev`
5. Open http://localhost:3000

## Deployment
See DEPLOYMENT_CHECKLIST.md
```

**Action**: Replace current README.md content

---

### 2. Add Health Check Endpoint (15 min)
Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        api: 'operational'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}
```

**Test**: Visit `http://localhost:3000/api/health`

---

### 3. Clean Up Test Files (10 min)
Create `scripts/` directory and move:
- `test-path.js` → `scripts/test-path.js`
- `diagnose_models.js` → `scripts/diagnose_models.js`
- `diagnose_models_v2.js` → `scripts/diagnose_models_v2.js`
- `diagnose_models_v3.js` → `scripts/diagnose_models_v3.js`
- `update-agent.js` → `scripts/update-agent.js`
- `fix_agent_actions.py` → `scripts/fix_agent_actions.py`

Or delete them if no longer needed.

---

### 4. Add .nvmrc (2 min)
Create `.nvmrc` file:
```
20.11.0
```

This ensures everyone uses the same Node version.

---

### 5. Improve ESLint Config (15 min)
Update `eslint.config.mjs`:

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    }
  }
];

export default eslintConfig;
```

**Note**: This will show errors for existing `any` types - that's good! Fix them gradually.

---

## 🔒 THIS WEEK (3-4 hours)

### 6. Set Up Sentry (1 hour)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Follow the wizard, then:

1. Add to `.env`:
```
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

2. Test error tracking:
```typescript
// In any page, add a test button
<button onClick={() => {
  throw new Error('Test Sentry error')
}}>
  Test Error
</button>
```

3. Check Sentry dashboard for the error

---

### 7. Add Input Validation (2 hours)
Create `lib/validations/policy.ts`:

```typescript
import { z } from 'zod'

export const createPolicySchema = z.object({
  policyNumber: z.string().min(1, 'Policy number is required').max(100),
  insurerName: z.string().min(1, 'Insurer name is required').max(200),
  lineOfBusiness: z.enum(['motor', 'health', 'home', 'life', 'business'], {
    errorMap: () => ({ message: 'Invalid line of business' })
  }),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  premium: z.number().positive().optional(),
  coverageSummary: z.string().optional(),
})

export const updatePolicySchema = createPolicySchema.partial()

export type CreatePolicyInput = z.infer<typeof createPolicySchema>
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>
```

Apply to API route `app/api/v1/policies/route.ts`:

```typescript
import { createPolicySchema } from '@/lib/validations/policy'

export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validated = createPolicySchema.parse(body)
    
    // Create policy with validated data
    const policy = await db.policy.create({
      data: {
        ...validated,
        ownerUserId: authResult.dbUser.id,
        createdByUserId: authResult.dbUser.id,
      }
    })

    return NextResponse.json({ policy })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: error.errors 
      }, { status: 400 })
    }
    // Handle other errors
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

---

### 8. Fix Type Safety Issues (1-2 hours)

**Create `types/navigation.ts`**:
```typescript
export type NavigationItem = {
  label: string
  href: string
}

export type NavigationSection = {
  title: string
  items: NavigationItem[]
}
```

**Update `app/(protected)/layout.tsx`**:
```typescript
import type { NavigationSection } from '@/types/navigation'

// Change line 17 from:
const navigation: any[] = []

// To:
const navigation: NavigationSection[] = []
```

**Create `types/questionnaire.ts`**:
```typescript
export type QuestionnaireAnswer = {
  questionId: string
  value: string | number | boolean | string[]
}

export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>
```

**Update `app/(protected)/tasks/actions.ts`**:
```typescript
import type { QuestionnaireAnswers } from '@/types/questionnaire'

// Change line 29 from:
export async function submitQuestionnaireResponse(instanceId: string, answers: any) {

// To:
export async function submitQuestionnaireResponse(
  instanceId: string, 
  answers: QuestionnaireAnswers
) {
```

---

## ✅ VERIFICATION

After completing quick wins:

```bash
# 1. Check TypeScript
npm run build

# 2. Check linting
npm run lint

# 3. Test health endpoint
curl http://localhost:3000/api/health

# 4. Verify Sentry
# Trigger test error and check Sentry dashboard
```

---

## 📊 IMPACT SUMMARY

| Task | Time | Impact | Priority |
|------|------|--------|----------|
| Update README | 30 min | High | ⭐⭐⭐ |
| Health Check | 15 min | Medium | ⭐⭐ |
| Clean Up Files | 10 min | Low | ⭐ |
| Add .nvmrc | 2 min | Low | ⭐ |
| ESLint Config | 15 min | Medium | ⭐⭐ |
| Sentry Setup | 1 hour | High | ⭐⭐⭐ |
| Input Validation | 2 hours | High | ⭐⭐⭐ |
| Fix Types | 1-2 hours | High | ⭐⭐⭐ |

**Total**: ~6 hours  
**High Priority Items**: 4  
**Immediate Value**: Professional setup, error tracking, safer code

---

## 🎯 NEXT STEPS

After completing these quick wins:
1. Review `ACTION_PLAN.md` for Week 1 tasks
2. Set up testing infrastructure
3. Continue with security improvements
4. See `IMPROVEMENT_SUGGESTIONS.md` for full roadmap

---

**Start with #1 (README) and work your way down!** ✨
