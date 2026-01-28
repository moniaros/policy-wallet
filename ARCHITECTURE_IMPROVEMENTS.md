# PolicyWallet Architecture Improvements

**Analysis Date:** January 28, 2026  
**Platform:** Next.js 16 + Prisma + Supabase + Gemini AI

---

## Executive Summary

Your PolicyWallet platform has a solid foundation but could benefit from several architectural improvements to enhance maintainability, scalability, and developer experience. This document outlines key recommendations organized by priority and impact.

---

## 🔴 HIGH PRIORITY - Immediate Impact

### 1. Introduce Service Layer Pattern

**Current State:**  
Business logic is mixed directly in Server Actions (`actions.ts` files), making them 400+ lines with validation, authorization, database operations, AI calls, and logging all in one place.

**Problem:**
- Hard to unit test (requires mocking Next.js internals)
- Code duplication across actions
- Difficult to share logic between Server Actions and API routes
- AI logic tightly coupled with database operations

**Recommendation:**
```
/lib/services/
├── policy.service.ts      # Policy CRUD + business rules
├── gap-analysis.service.ts # AI-powered gap detection
├── customer.service.ts    # Customer management
├── auth.service.ts        # Authentication utilities
├── notification.service.ts # Notification dispatch
└── index.ts               # Barrel export
```

**Example Implementation:**
```typescript
// lib/services/policy.service.ts
export class PolicyService {
  constructor(
    private db: PrismaClient,
    private aiService: AIService
  ) {}

  async create(userId: string, data: CreatePolicyInput): Promise<Policy> {
    // Validation
    const validated = PolicySchema.parse(data)
    
    // Business logic
    const policy = await this.db.policy.create({...})
    
    // Side effects
    await this.createActivityLog(userId, 'POLICY_CREATED', policy.id)
    
    return policy
  }
  
  async analyzeGaps(policyId: string, userId: string): Promise<GapAnalysisResult> {
    // Authorization check
    await this.ensureAccess(policyId, userId)
    
    // Delegate to AI service
    return this.aiService.analyzePolicy(policyId)
  }
}

// app/(protected)/wallet/actions.ts - Now thin
"use server"
export async function createPolicy(formData: FormData) {
  const { dbUser } = await getAuthenticatedUser()
  const service = new PolicyService(db, new AIService())
  
  const result = await service.create(dbUser.id, parseFormData(formData))
  revalidatePath("/wallet")
  return { success: true }
}
```

**Benefits:**
- Testable: Unit test services without Next.js
- Reusable: Same logic for actions and API routes
- Maintainable: Single responsibility principle

---

### 2. Centralized Error Handling

**Current State:**  
Inconsistent error handling - some functions return `{ error: string }`, others throw, some return `NextResponse.json()`.

**Problem:**
- No consistent error structure for frontend
- Lost error context in production
- Difficult to track error patterns

**Recommendation:**
```typescript
// lib/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public userMessage?: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
  
  static unauthorized(message = "Authentication required") {
    return new AppError('UNAUTHORIZED', message, 401)
  }
  
  static forbidden(message = "Access denied") {
    return new AppError('FORBIDDEN', message, 403)
  }
  
  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} not found`, 404)
  }
  
  static validation(details: Record<string, string[]>) {
    return new AppError('VALIDATION', 'Validation failed', 400, undefined, { details })
  }
}

// lib/errors/error-handler.ts
export function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    logger('warn', error.message, { code: error.code, ...error.metadata })
    return { error: error.userMessage || error.message, code: error.code }
  }
  
  // Unexpected error - log full details
  logger('error', 'Unexpected error', { error })
  captureException(error) // Sentry
  
  return { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }
}

// Usage in actions
export async function deletePolicy(policyId: string) {
  try {
    const service = new PolicyService(db)
    await service.delete(policyId, userId)
    return { success: true }
  } catch (error) {
    return handleActionError(error)
  }
}
```

---

### 3. Repository Pattern for Data Access

**Current State:**  
Direct Prisma calls scattered throughout actions with repeated query patterns.

**Problem:**
- Duplicated query logic
- No query optimization visibility
- Hard to add caching layer
- Type casting (`as any`) to bypass Prisma issues

**Recommendation:**
```typescript
// lib/repositories/policy.repository.ts
export class PolicyRepository {
  constructor(private db: PrismaClient) {}
  
  async findByOwner(userId: string, options?: PaginationOptions): Promise<Policy[]> {
    return this.db.policy.findMany({
      where: { ownerUserId: userId },
      include: { documents: true },
      orderBy: { endDate: 'asc' },
      ...this.paginate(options)
    })
  }
  
  async findWithGaps(policyId: string): Promise<PolicyWithGaps | null> {
    return this.db.policy.findUnique({
      where: { id: policyId },
      include: {
        documents: true,
        gapInstances: { include: { definition: true } }
      }
    })
  }
  
  async findAccessible(userId: string): Promise<Policy[]> {
    // Complex query: owned + granted access
    const [owned, granted] = await Promise.all([
      this.findByOwner(userId),
      this.findByGrantedAccess(userId)
    ])
    return [...owned, ...granted]
  }
  
  private async findByGrantedAccess(userId: string): Promise<Policy[]> {
    const grants = await this.db.accessGrant.findMany({
      where: { granteeUserId: userId, status: 'active' }
    })
    // ... extract policy IDs and fetch
  }
}
```

---

### 4. Type Safety Improvements

**Current State:**  
Several `as any` casts and loose types found in codebase.

**Issues Found:**
```typescript
// wallet/page.tsx:57,63
lineOfBusiness: p.lineOfBusiness as any,
documents: p.documents.map((d: any) => ...)

// gap-detection.ts:23
const gapDefinitions = await (db.gapDefinition.findMany as any)

// actions.ts:117,279,429
await (db as any).activityLog.create
```

**Recommendation:**

1. **Create domain types separate from Prisma:**
```typescript
// types/policy.ts
export interface PolicyView {
  id: string
  policyNumber: string
  insurerName: string
  lineOfBusiness: LineOfBusiness
  status: PolicyStatus
  startDate: string // ISO string for serialization
  endDate: string
  documents: PolicyDocumentView[]
}

// Type guards
export function isValidLineOfBusiness(value: string): value is LineOfBusiness {
  return LINES_OF_BUSINESS.includes(value as LineOfBusiness)
}
```

2. **Add strict enums:**
```typescript
// types/enums.ts
export const LINES_OF_BUSINESS = [
  'motor', 'health', 'home', 'life', 'travel', 
  'liability', 'pet', 'business', 'other'
] as const

export type LineOfBusiness = typeof LINES_OF_BUSINESS[number]

export const POLICY_STATUS = ['active', 'expiring_soon', 'incomplete', 'action_needed'] as const
export type PolicyStatus = typeof POLICY_STATUS[number]
```

3. **Remove `any` casts with proper types:**
```typescript
// Instead of (db as any).activityLog.create
// Add ActivityLog model operations properly
```

---

## 🟡 MEDIUM PRIORITY - Maintainability

### 5. API Versioning Strategy

**Current State:**  
Mix of `/api/v1/*` and `/api/*` routes without clear versioning strategy.

**Recommendation:**
```
/app/api/
├── v1/                        # Current stable API
│   ├── policies/
│   ├── customers/
│   └── ...
├── v2/                        # Future breaking changes
│   └── policies/
├── health/                    # No versioning (internal)
├── webhooks/                  # No versioning (external integrations)
└── internal/                  # Admin-only endpoints
```

Add API middleware for versioning:
```typescript
// middleware.ts addition
if (pathname.startsWith('/api/v')) {
  const version = pathname.split('/')[2] // 'v1', 'v2'
  response.headers.set('X-API-Version', version)
  response.headers.set('X-Deprecation-Notice', 'v1 will be deprecated 2027-01-01')
}
```

---

### 6. State Management Patterns

**Current State:**  
Heavy reliance on Server Components with some client state.

**Recommendation - Hybrid Approach:**

1. **Server Components for data fetching** (current - good)
2. **URL state for filters/pagination:**
```typescript
// Instead of useState for filters
import { useSearchParams } from 'next/navigation'

export function CustomerList() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'all'
  const sort = searchParams.get('sort') || 'activity'
  
  // Shareable URLs, back button works
}
```

3. **React Context for cross-cutting concerns:**
```typescript
// contexts/NotificationContext.tsx
export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Poll for notifications or use WebSocket
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <NotificationContext.Provider value={{ unreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}
```

---

### 7. AI Service Abstraction

**Current State:**  
Gemini API calls embedded directly in actions (400+ lines in `analyzeGaps`).

**Recommendation:**
```typescript
// lib/services/ai/ai.service.ts
export interface AIService {
  extractPolicyData(document: Buffer, mimeType: string): Promise<PolicyExtraction>
  analyzeGaps(policy: Policy, definitions: GapDefinition[]): Promise<GapAnalysis>
}

// lib/services/ai/gemini.service.ts
export class GeminiService implements AIService {
  private model: GenerativeModel
  
  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  }
  
  async extractPolicyData(document: Buffer, mimeType: string): Promise<PolicyExtraction> {
    const prompt = this.buildExtractionPrompt()
    const result = await this.model.generateContent([prompt, { inlineData: { data: document.toString('base64'), mimeType } }])
    return this.parseExtractionResponse(result)
  }
  
  private buildExtractionPrompt(): string {
    // Centralized prompt management
    return PROMPTS.POLICY_EXTRACTION
  }
}

// lib/services/ai/mock.service.ts (for testing/offline)
export class MockAIService implements AIService {
  async extractPolicyData(): Promise<PolicyExtraction> {
    return { insurerName: 'Test Insurer', policyNumber: 'TEST-001', ... }
  }
}

// Factory pattern
export function createAIService(): AIService {
  if (process.env.GEMINI_API_KEY) {
    return new GeminiService(process.env.GEMINI_API_KEY)
  }
  return new MockAIService()
}
```

---

### 8. Caching Strategy

**Current State:**  
No caching layer - every request hits the database.

**Recommendation:**
```typescript
// lib/cache/index.ts
import { unstable_cache } from 'next/cache'

// React cache for request deduplication (already built-in)
export const getInsurers = unstable_cache(
  async () => {
    return db.insurer.findMany({ where: { isActive: true } })
  },
  ['insurers'],
  { revalidate: 3600 } // 1 hour
)

export const getGapDefinitions = unstable_cache(
  async (lineOfBusiness: string) => {
    return db.gapDefinition.findMany({
      where: { lineOfBusiness, isActive: true }
    })
  },
  ['gap-definitions'],
  { revalidate: 3600, tags: ['gap-definitions'] }
)

// Invalidation
export async function invalidateGapDefinitions() {
  revalidateTag('gap-definitions')
}
```

For user-specific data, consider Redis:
```typescript
// lib/cache/redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export async function getCachedUserStats(userId: string) {
  const cached = await redis.get(`user:${userId}:stats`)
  if (cached) return cached
  
  const stats = await computeUserStats(userId)
  await redis.setex(`user:${userId}:stats`, 300, stats) // 5 min TTL
  return stats
}
```

---

## 🟢 LOWER PRIORITY - Future Scalability

### 9. Event-Driven Architecture

**Current State:**  
Synchronous side effects (notifications, logging, AI analysis).

**Recommendation - Event System:**
```typescript
// lib/events/types.ts
export type DomainEvent = 
  | { type: 'POLICY_CREATED'; payload: { policyId: string; userId: string } }
  | { type: 'POLICY_ANALYZED'; payload: { policyId: string; gapsFound: number } }
  | { type: 'CUSTOMER_INVITED'; payload: { customerId: string; agentId: string } }

// lib/events/emitter.ts
class EventEmitter {
  private handlers: Map<string, Array<(payload: any) => Promise<void>>> = new Map()
  
  on(type: string, handler: (payload: any) => Promise<void>) {
    const handlers = this.handlers.get(type) || []
    handlers.push(handler)
    this.handlers.set(type, handlers)
  }
  
  async emit(event: DomainEvent) {
    const handlers = this.handlers.get(event.type) || []
    await Promise.allSettled(handlers.map(h => h(event.payload)))
  }
}

export const events = new EventEmitter()

// Register handlers
events.on('POLICY_CREATED', async ({ policyId, userId }) => {
  await createActivityLog(userId, 'POLICY_CREATED', policyId)
  await sendWelcomeNotification(userId)
})

events.on('POLICY_ANALYZED', async ({ policyId, gapsFound }) => {
  if (gapsFound > 0) {
    await createOpportunities(policyId)
    await notifyAgent(policyId)
  }
})
```

---

### 10. Module Boundaries

**Current State:**  
Components and lib files somewhat organized but could be more modular.

**Recommendation - Feature-Based Modules:**
```
/modules/
├── wallet/                    # Policyholder wallet feature
│   ├── components/
│   │   ├── PolicyCard.tsx
│   │   ├── PolicyList.tsx
│   │   └── index.ts
│   ├── services/
│   │   └── policy.service.ts
│   ├── repositories/
│   │   └── policy.repository.ts
│   ├── actions.ts
│   ├── types.ts
│   └── index.ts               # Public API
│
├── agent/                     # Agent dashboard feature
│   ├── components/
│   ├── services/
│   └── ...
│
├── admin/                     # Admin feature
│   └── ...
│
└── shared/                    # Cross-cutting concerns
    ├── components/ui/
    ├── hooks/
    ├── lib/
    └── types/
```

This approach:
- Clear ownership per feature
- Easy to find related code
- Can be extracted to packages if needed
- Testable in isolation

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │    API      │              │
│  │ (protected) │  │   (React)   │  │   Routes    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Server Actions                        │    │
│  │  • Auth check • Call services • Revalidate • Respond    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Services   │  │    Types    │  │   Events    │              │
│  │ PolicySvc   │  │  Enums      │  │  Emitter    │              │
│  │ GapSvc      │  │  Interfaces │  │  Handlers   │              │
│  │ CustomerSvc │  │  Validators │  │             │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Repositories│  │  AI Service │  │   Cache     │              │
│  │ PolicyRepo  │  │  Gemini     │  │  Redis/     │              │
│  │ UserRepo    │  │  Mock       │  │  Next Cache │              │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘              │
│         │                │                                       │
│  ┌──────▼────────────────▼──────────────────────────────────┐   │
│  │              External Services                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │   │
│  │  │ Prisma  │  │Supabase │  │ Gemini  │  │  Brevo  │     │   │
│  │  │   DB    │  │  Auth   │  │   AI    │  │  Email  │     │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
1. Create `AppError` class and `handleActionError` utility
2. Extract AI prompts to constants file
3. Add strict enums for LineOfBusiness, PolicyStatus
4. Remove `as any` casts with proper types

### Phase 2: Service Layer (3-5 days)
1. Create `PolicyService` with existing action logic
2. Create `GapAnalysisService` with AI abstraction
3. Refactor `wallet/actions.ts` to use services
4. Add unit tests for services

### Phase 3: Repository Pattern (2-3 days)
1. Create `PolicyRepository` with common queries
2. Create `UserRepository`, `CustomerRepository`
3. Refactor services to use repositories
4. Add query optimization (indexes, selects)

### Phase 4: Caching & Events (2-3 days)
1. Implement caching for static data (insurers, gap definitions)
2. Add event emitter for side effects
3. Decouple notifications, logging from main actions

---

## 📈 Expected Benefits

| Improvement | Testability | Maintainability | Performance | Scalability |
|-------------|-------------|-----------------|-------------|-------------|
| Service Layer | +++ | +++ | - | ++ |
| Error Handling | + | +++ | - | + |
| Repository Pattern | ++ | ++ | + | ++ |
| Type Safety | - | +++ | - | - |
| AI Abstraction | +++ | ++ | - | ++ |
| Caching | - | + | +++ | ++ |
| Event System | ++ | ++ | + | +++ |

---

## 🔗 References

- [Next.js App Router Best Practices](https://nextjs.org/docs/app)
- [Prisma Best Practices](https://www.prisma.io/docs/guides)
- [Domain-Driven Design in TypeScript](https://khalilstemmler.com/articles/typescript-domain-driven-design/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Questions?** Let me know which areas you'd like me to elaborate on or implement first!
