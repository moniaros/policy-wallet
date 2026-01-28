# PolicyWallet Enhancement Steps

**Document Purpose:** Step-by-step prompts to implement architecture improvements  
**Usage:** Copy each prompt section and execute sequentially

---

## Table of Contents

1. [Service Layer Implementation](#1-service-layer-implementation)
2. [Centralized Error Handling](#2-centralized-error-handling)
3. [Repository Pattern](#3-repository-pattern)
4. [Type Safety Improvements](#4-type-safety-improvements)
5. [AI Service Abstraction](#5-ai-service-abstraction)
6. [Caching Layer](#6-caching-layer)
7. [Event-Driven Architecture](#7-event-driven-architecture)
8. [API Versioning & Documentation](#8-api-versioning--documentation)
9. [Testing Infrastructure](#9-testing-infrastructure)
10. [Module Restructuring](#10-module-restructuring)

---

## 1. Service Layer Implementation

### Step 1.1: Create Base Service Infrastructure

```
PROMPT:

Create the service layer foundation for PolicyWallet. Do the following:

1. Create `/app/lib/services/base.service.ts` with:
   - Abstract BaseService class
   - Common dependencies injection pattern (db, logger)
   - Transaction support helper method
   - Audit logging helper method

2. Create `/app/lib/services/index.ts` as barrel export

3. The BaseService should include:
   - Constructor accepting PrismaClient
   - Protected method `withTransaction<T>(fn: (tx) => Promise<T>): Promise<T>`
   - Protected method `logActivity(userId, action, description, metadata?)`

Keep the implementation minimal and focused. Use existing patterns from the codebase.
```

### Step 1.2: Create PolicyService

```
PROMPT:

Create `/app/lib/services/policy.service.ts` by extracting business logic from `/app/app/(protected)/wallet/actions.ts`.

The PolicyService should include these methods:

1. `create(userId: string, data: CreatePolicyInput): Promise<Policy>`
   - Extract from createPolicy action (lines 30-134)
   - Include validation, document handling, activity logging

2. `uploadAndParse(userId: string, file: File): Promise<{ policy: Policy; extracted: boolean }>`
   - Extract from uploadPolicyDocument action (lines 136-296)
   - Keep AI extraction logic for now (will be extracted later)

3. `delete(policyId: string, userId: string): Promise<void>`
   - Extract from deletePolicy action (lines 739-807)
   - Include ownership check and file cleanup

4. `share(policyId: string, ownerUserId: string, agentEmail: string): Promise<ShareResult>`
   - Extract from sharePolicy action (lines 330-441)

5. `getShares(policyId: string, userId: string): Promise<PolicyShare[]>`
   - Extract from getPolicyShares action

6. `revokeShare(grantId: string, userId: string): Promise<void>`
   - Extract from revokeShare action

Use dependency injection for PrismaClient. Add JSDoc comments for each method.
Do NOT modify the existing actions.ts yet - just create the service.
```

### Step 1.3: Create GapAnalysisService

```
PROMPT:

Create `/app/lib/services/gap-analysis.service.ts` by extracting logic from:
- `/app/app/(protected)/wallet/actions.ts` (analyzeGaps function, lines 490-737)
- `/app/lib/gap-detection.ts`

The GapAnalysisService should include:

1. `analyzePolicy(policyId: string, userId: string): Promise<GapAnalysisResult>`
   - Authorization check (owner or has access grant)
   - Fetch policy with documents
   - Call AI service for analysis
   - Create/update gap instances
   - Return structured result

2. `detectGapsForUser(userId: string): Promise<DetectedGap[]>`
   - Extract from gap-detection.ts

3. `getGapDefinitions(lineOfBusiness: string): Promise<GapDefinition[]>`
   - Cached fetch of active definitions

4. `resolveGap(gapInstanceId: string, userId: string): Promise<void>`
   - Mark gap as resolved

5. `dismissGap(gapInstanceId: string, userId: string, reason: string): Promise<void>`
   - Mark gap as dismissed with reason

Define these types at the top of the file:
- GapAnalysisResult { success: boolean; gapsFound: number; updatedPolicy: Policy }
- DetectedGap (use existing from gap-detection.ts)

Keep AI logic inline for now - we'll extract it in step 5.
```

### Step 1.4: Create CustomerService (for Agents)

```
PROMPT:

Create `/app/lib/services/customer.service.ts` for agent-related customer operations.

Extract logic from agent components and create these methods:

1. `getCustomers(agentId: string, filters: CustomerFilters): Promise<CustomerWithStats[]>`
   - Fetch customers with policy count, gap count
   - Support filters: status, search, sort

2. `getCustomerProfile(customerId: string, agentId: string): Promise<CustomerProfile>`
   - Full customer details with policies, gaps, opportunities
   - Authorization: agent must have relationship

3. `addCustomerManually(agentId: string, data: AddCustomerInput): Promise<Customer>`
   - Create user if not exists
   - Create customer relationship
   - Send invitation email

4. `bulkImport(agentId: string, customers: BulkCustomerInput[]): Promise<BulkImportResult>`
   - Validate all entries
   - Create in transaction
   - Return success/failure counts

5. `inviteCustomer(agentId: string, email: string, scope?: string): Promise<Invite>`
   - Create invite token
   - Queue email notification

Define TypeScript interfaces for all inputs and outputs.
Reference `/app/components/agent/CustomerList.tsx` and `/app/components/agent/CustomerProfile.tsx` for expected data shapes.
```

### Step 1.5: Refactor Actions to Use Services

```
PROMPT:

Refactor `/app/app/(protected)/wallet/actions.ts` to use the new service layer.

1. Import the services:
   ```typescript
   import { PolicyService } from '@/lib/services/policy.service'
   import { GapAnalysisService } from '@/lib/services/gap-analysis.service'
   ```

2. Refactor each action to be a thin wrapper:
   ```typescript
   export async function createPolicy(formData: FormData) {
     const { dbUser } = await getAuthenticatedUser()
     const service = new PolicyService(db)
     
     try {
       const data = parseFormData(formData)
       await service.create(dbUser.id, data)
       revalidatePath("/wallet")
       return { success: true }
     } catch (error) {
       return handleActionError(error)
     }
   }
   ```

3. Each action should only:
   - Get authenticated user
   - Parse input (FormData → typed object)
   - Call service method
   - Handle revalidation
   - Return result

4. Move ALL business logic to services - actions should be < 20 lines each

5. Add `handleActionError` utility (create if not exists) for consistent error handling

Test that existing functionality still works after refactoring.
```

---

## 2. Centralized Error Handling

### Step 2.1: Create Error Classes

```
PROMPT:

Create `/app/lib/errors/app-error.ts` with a comprehensive error handling system:

1. Define ErrorCode enum:
   ```typescript
   export type ErrorCode = 
     | 'UNAUTHORIZED'
     | 'FORBIDDEN' 
     | 'NOT_FOUND'
     | 'VALIDATION'
     | 'CONFLICT'
     | 'RATE_LIMITED'
     | 'EXTERNAL_SERVICE'
     | 'INTERNAL_ERROR'
   ```

2. Create AppError class:
   - Properties: code, message, statusCode, userMessage, metadata
   - Static factory methods:
     - `unauthorized(message?)`
     - `forbidden(message?)`
     - `notFound(resource: string)`
     - `validation(errors: ValidationErrors)`
     - `conflict(message: string)`
     - `rateLimited(retryAfter?: number)`
     - `externalService(service: string, originalError: Error)`
   - Method `toJSON()` for serialization

3. Create ValidationErrors type for form validation:
   ```typescript
   type ValidationErrors = Record<string, string[]>
   ```

4. Export everything from `/app/lib/errors/index.ts`
```

### Step 2.2: Create Error Handler Utilities

```
PROMPT:

Create `/app/lib/errors/error-handler.ts` with utilities for handling errors consistently:

1. `handleActionError(error: unknown): ActionErrorResult`
   - If AppError: log at warn level, return user-friendly message
   - If ZodError: convert to validation error format
   - If PrismaClientKnownRequestError: handle P2002 (unique), P2025 (not found)
   - Otherwise: log at error level, capture to Sentry, return generic message

2. `handleApiError(error: unknown): NextResponse`
   - Similar logic but returns NextResponse.json()
   - Include appropriate status codes
   - Add error tracking headers (X-Error-Id)

3. Type definitions:
   ```typescript
   type ActionErrorResult = {
     error: string
     code: ErrorCode
     details?: Record<string, string[]>
   }
   
   type ActionSuccessResult<T> = {
     success: true
     data?: T
   }
   
   type ActionResult<T> = ActionSuccessResult<T> | ActionErrorResult
   ```

4. Integrate with existing logger from `/app/lib/logger.ts`

5. Integrate with Sentry (already installed) using `captureException`
```

### Step 2.3: Apply Error Handling to Services

```
PROMPT:

Update all services in `/app/lib/services/` to use the new error handling:

1. Replace generic `throw new Error()` with specific AppError types:
   ```typescript
   // Before
   if (!user) throw new Error("Unauthorized")
   
   // After
   if (!user) throw AppError.unauthorized()
   ```

2. Add error context where helpful:
   ```typescript
   throw AppError.notFound('Policy').with({ policyId })
   ```

3. Wrap external service calls:
   ```typescript
   try {
     const result = await geminiModel.generateContent(...)
   } catch (error) {
     throw AppError.externalService('Gemini AI', error as Error)
   }
   ```

4. Update PolicyService, GapAnalysisService, CustomerService

5. Ensure all public methods either return a value or throw AppError
```

---

## 3. Repository Pattern

### Step 3.1: Create Base Repository

```
PROMPT:

Create `/app/lib/repositories/base.repository.ts`:

1. Abstract BaseRepository<T> class with:
   - Constructor accepting PrismaClient
   - Protected `db` property
   - Generic pagination helper: `paginate(options?: PaginationOptions)`
   - Generic soft-delete support (if model has deletedAt)

2. Define common types:
   ```typescript
   interface PaginationOptions {
     page?: number
     limit?: number
     cursor?: string
   }
   
   interface PaginatedResult<T> {
     data: T[]
     pagination: {
       total: number
       page: number
       limit: number
       hasMore: boolean
     }
   }
   ```

3. Create `/app/lib/repositories/index.ts` barrel export
```

### Step 3.2: Create PolicyRepository

```
PROMPT:

Create `/app/lib/repositories/policy.repository.ts`:

1. Extend BaseRepository and implement these methods:

   ```typescript
   class PolicyRepository extends BaseRepository {
     // Find policies owned by user
     async findByOwner(userId: string, options?: QueryOptions): Promise<Policy[]>
     
     // Find policies with access grants
     async findAccessible(userId: string): Promise<Policy[]>
     
     // Find single policy with all relations
     async findWithDetails(policyId: string): Promise<PolicyWithDetails | null>
     
     // Find policies expiring within days
     async findExpiringSoon(userId: string, days: number): Promise<Policy[]>
     
     // Search policies by insurer or policy number
     async search(userId: string, query: string): Promise<Policy[]>
     
     // Create with documents
     async createWithDocuments(data: CreatePolicyData): Promise<Policy>
     
     // Update policy and log change
     async updateWithAudit(policyId: string, data: UpdatePolicyData, userId: string): Promise<Policy>
     
     // Soft delete (or hard delete based on config)
     async delete(policyId: string): Promise<void>
   }
   ```

2. Define query options type:
   ```typescript
   interface QueryOptions {
     include?: {
       documents?: boolean
       gaps?: boolean
       owner?: boolean
     }
     orderBy?: 'endDate' | 'createdAt' | 'insurerName'
     order?: 'asc' | 'desc'
   }
   ```

3. Use efficient Prisma queries with proper `select` and `include`

4. Add indexes comment for DBA: which indexes would optimize these queries
```

### Step 3.3: Create UserRepository

```
PROMPT:

Create `/app/lib/repositories/user.repository.ts`:

1. Methods to implement:

   ```typescript
   class UserRepository extends BaseRepository {
     // Find by email (common lookup)
     async findByEmail(email: string): Promise<User | null>
     
     // Find by ID with role info
     async findWithRole(userId: string): Promise<UserWithRole | null>
     
     // Find agents (for sharing)
     async findAgents(search?: string): Promise<AgentSummary[]>
     
     // Find user's customers (if agent)
     async findCustomers(agentId: string, filters: CustomerFilters): Promise<CustomerSummary[]>
     
     // Get user statistics
     async getStats(userId: string): Promise<UserStats>
     
     // Update preferences
     async updatePreferences(userId: string, prefs: UserPreferences): Promise<void>
     
     // Check if user has role
     async hasRole(userId: string, role: string): Promise<boolean>
   }
   ```

2. Define summary types (lightweight versions for lists):
   ```typescript
   interface AgentSummary {
     id: string
     name: string
     email: string
     agencyName?: string
   }
   
   interface CustomerSummary {
     id: string
     name: string
     email: string
     policyCount: number
     gapCount: number
     lastActivity?: Date
   }
   ```
```

### Step 3.4: Create GapRepository

```
PROMPT:

Create `/app/lib/repositories/gap.repository.ts`:

1. Methods:

   ```typescript
   class GapRepository extends BaseRepository {
     // Get definitions by line of business
     async getDefinitions(lineOfBusiness: string): Promise<GapDefinition[]>
     
     // Get all active definitions (for caching)
     async getAllActiveDefinitions(): Promise<GapDefinition[]>
     
     // Find gaps for a policy
     async findByPolicy(policyId: string): Promise<GapInstance[]>
     
     // Find all gaps for a user's policies
     async findByUser(userId: string): Promise<GapInstanceWithPolicy[]>
     
     // Find open gaps grouped by severity
     async findOpenGroupedBySeverity(userId: string): Promise<GapsBySeverity>
     
     // Create gap instance
     async createInstance(data: CreateGapInstance): Promise<GapInstance>
     
     // Bulk create (for analysis results)
     async createManyInstances(data: CreateGapInstance[]): Promise<number>
     
     // Update status
     async updateStatus(instanceId: string, status: GapStatus, metadata?: object): Promise<void>
     
     // Delete all for policy (before re-analysis)
     async deleteByPolicy(policyId: string): Promise<number>
   }
   ```

2. Types:
   ```typescript
   interface GapsBySeverity {
     critical: GapInstance[]
     high: GapInstance[]
     medium: GapInstance[]
     low: GapInstance[]
   }
   
   interface GapInstanceWithPolicy extends GapInstance {
     policy: Pick<Policy, 'id' | 'policyNumber' | 'insurerName'>
   }
   ```
```

### Step 3.5: Update Services to Use Repositories

```
PROMPT:

Update all services to use repositories instead of direct Prisma calls:

1. Modify service constructors to accept repositories:
   ```typescript
   class PolicyService {
     constructor(
       private policyRepo: PolicyRepository,
       private userRepo: UserRepository,
       private gapRepo: GapRepository
     ) {}
   }
   ```

2. Create a factory or DI container in `/app/lib/container.ts`:
   ```typescript
   import { db } from './db'
   
   // Repositories
   export const policyRepository = new PolicyRepository(db)
   export const userRepository = new UserRepository(db)
   export const gapRepository = new GapRepository(db)
   
   // Services
   export const policyService = new PolicyService(
     policyRepository,
     userRepository,
     gapRepository
   )
   ```

3. Update actions to use container:
   ```typescript
   import { policyService } from '@/lib/container'
   
   export async function createPolicy(formData: FormData) {
     // ... use policyService
   }
   ```

4. This enables easy mocking for tests
```

---

## 4. Type Safety Improvements

### Step 4.1: Create Domain Enums

```
PROMPT:

Create `/app/types/enums.ts` with all domain enumerations:

1. Lines of Business:
   ```typescript
   export const LINES_OF_BUSINESS = [
     'motor', 'health', 'home', 'life', 'travel', 
     'liability', 'pet', 'breakdown', 'legal_expenses',
     'income_protection', 'gadget', 'bicycle', 'business',
     'cyber', 'motorbike', 'public_liability', 'renters', 'other'
   ] as const
   export type LineOfBusiness = typeof LINES_OF_BUSINESS[number]
   ```

2. Policy Status:
   ```typescript
   export const POLICY_STATUSES = ['active', 'expiring_soon', 'expired', 'cancelled', 'incomplete'] as const
   export type PolicyStatus = typeof POLICY_STATUSES[number]
   ```

3. Gap Severity:
   ```typescript
   export const GAP_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
   export type GapSeverity = typeof GAP_SEVERITIES[number]
   ```

4. Gap Status:
   ```typescript
   export const GAP_STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'] as const
   export type GapStatus = typeof GAP_STATUSES[number]
   ```

5. User Roles:
   ```typescript
   export const USER_ROLES = ['policyholder', 'agent', 'admin'] as const
   export type UserRole = typeof USER_ROLES[number]
   ```

6. Opportunity Status:
   ```typescript
   export const OPPORTUNITY_STATUSES = ['open', 'contacted', 'quoted', 'won', 'lost', 'on_hold'] as const
   export type OpportunityStatus = typeof OPPORTUNITY_STATUSES[number]
   ```

7. Add type guard functions for each:
   ```typescript
   export function isLineOfBusiness(value: string): value is LineOfBusiness {
     return LINES_OF_BUSINESS.includes(value as LineOfBusiness)
   }
   ```

8. Export from `/app/types/index.ts`
```

### Step 4.2: Create Domain Interfaces

```
PROMPT:

Create `/app/types/domain.ts` with clean domain interfaces (separate from Prisma types):

1. Policy types:
   ```typescript
   // For API responses and client-side use
   export interface PolicyView {
     id: string
     policyNumber: string
     insurerName: string
     insurerLogo?: string
     lineOfBusiness: LineOfBusiness
     status: PolicyStatus
     startDate: string  // ISO string
     endDate: string
     premiumAmount?: number
     premiumCurrency: string
     coverageSummary?: string
     lastUpdated: string
     documents: PolicyDocumentView[]
     gapCount?: number
   }
   
   export interface PolicyDocumentView {
     id: string
     fileName: string
     fileSize: number
     uploadedAt: string
     source: 'policyholder' | 'agent' | 'system'
   }
   
   export interface PolicyDetailView extends PolicyView {
     owner: UserSummary
     sharedWith: UserSummary[]
     gaps: GapInstanceView[]
     acordData?: AcordData
   }
   ```

2. Gap types:
   ```typescript
   export interface GapInstanceView {
     id: string
     severity: GapSeverity
     status: GapStatus
     title: string
     description: string
     explanation: string
     suggestion: string
     detectedAt: string
     definition: GapDefinitionView
   }
   
   export interface GapDefinitionView {
     id: string
     slug: string
     name: string
     lineOfBusiness: LineOfBusiness
   }
   ```

3. User types:
   ```typescript
   export interface UserSummary {
     id: string
     name: string
     email: string
     image?: string
   }
   
   export interface UserProfile extends UserSummary {
     phone?: string
     preferredLanguage: 'el' | 'en'
     roles: UserRole[]
     createdAt: string
   }
   ```

4. Customer/Agent types:
   ```typescript
   export interface CustomerView {
     id: string
     user: UserSummary
     status: 'active' | 'pending' | 'inactive'
     activationStatus: string
     policyCount: number
     gapCount: number
     lastInteraction?: string
   }
   
   export interface AgentView extends UserSummary {
     agencyName?: string
     licenseNumber?: string
     verificationStatus: 'pending' | 'verified' | 'rejected'
   }
   ```
```

### Step 4.3: Create Input/Output Types

```
PROMPT:

Create `/app/types/api.ts` for API request/response types:

1. Generic response wrapper:
   ```typescript
   export interface ApiResponse<T> {
     success: boolean
     data?: T
     error?: {
       code: string
       message: string
       details?: Record<string, string[]>
     }
     meta?: {
       pagination?: PaginationMeta
       timestamp: string
     }
   }
   
   export interface PaginationMeta {
     total: number
     page: number
     limit: number
     hasMore: boolean
   }
   ```

2. Action results:
   ```typescript
   export type ActionResult<T = void> = 
     | { success: true; data?: T }
     | { success: false; error: string; code?: string }
   ```

3. Input types for forms:
   ```typescript
   export interface CreatePolicyInput {
     insurerName: string
     policyNumber: string
     lineOfBusiness: LineOfBusiness
     startDate: string
     endDate: string
     premiumAmount?: number
     documents?: FileInput[]
   }
   
   export interface FileInput {
     url: string
     name: string
     size: number
   }
   
   export interface SharePolicyInput {
     policyId: string
     agentEmail: string
   }
   
   export interface AddCustomerInput {
     email: string
     name: string
     phone?: string
   }
   ```
```

### Step 4.4: Create Mappers

```
PROMPT:

Create `/app/lib/mappers/` directory with functions to convert between Prisma types and domain types:

1. `/app/lib/mappers/policy.mapper.ts`:
   ```typescript
   import type { Policy, PolicyDocument } from '@prisma/client'
   import type { PolicyView, PolicyDetailView, PolicyDocumentView } from '@/types'
   
   export function toPolicyView(policy: Policy & { documents?: PolicyDocument[] }): PolicyView {
     return {
       id: policy.id,
       policyNumber: policy.policyNumber,
       insurerName: policy.insurerName,
       lineOfBusiness: policy.lineOfBusiness as LineOfBusiness,
       status: computeStatus(policy),
       startDate: policy.startDate.toISOString(),
       endDate: policy.endDate.toISOString(),
       premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : undefined,
       premiumCurrency: policy.premiumCurrency || 'EUR',
       coverageSummary: policy.coverageSummary || undefined,
       lastUpdated: policy.updatedAt.toISOString(),
       documents: policy.documents?.map(toDocumentView) || []
     }
   }
   
   export function toDocumentView(doc: PolicyDocument): PolicyDocumentView {
     // ...
   }
   
   function computeStatus(policy: Policy): PolicyStatus {
     const now = new Date()
     const daysUntilExpiry = (policy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
     
     if (policy.status === 'cancelled') return 'cancelled'
     if (daysUntilExpiry < 0) return 'expired'
     if (daysUntilExpiry < 30) return 'expiring_soon'
     return 'active'
   }
   ```

2. `/app/lib/mappers/gap.mapper.ts`
3. `/app/lib/mappers/user.mapper.ts`
4. `/app/lib/mappers/index.ts` - barrel export

5. Use mappers in repositories/services to ensure clean types at boundaries
```

### Step 4.5: Remove Type Assertions

```
PROMPT:

Audit and fix all `as any` type assertions in the codebase:

1. Search for all occurrences:
   - `as any`
   - `: any`
   - `(db as any)`
   - `as unknown as`

2. For each occurrence, fix by:
   - Using proper types from `/app/types/`
   - Using mappers for conversion
   - Extending Prisma types if needed
   - Adding proper generics

3. Known issues to fix:

   a. `/app/app/(protected)/wallet/page.tsx:57`:
      ```typescript
      // Before
      lineOfBusiness: p.lineOfBusiness as any,
      
      // After
      lineOfBusiness: p.lineOfBusiness as LineOfBusiness,
      // Or better: use mapper
      const mappedPolicies = policies.map(toPolicyView)
      ```

   b. `/app/app/(protected)/wallet/actions.ts:117`:
      ```typescript
      // Before
      await (db as any).activityLog.create(...)
      
      // After - ensure ActivityLog is in Prisma schema and regenerate
      await db.activityLog.create(...)
      ```

   c. `/app/lib/gap-detection.ts:23`:
      ```typescript
      // Before
      const gapDefinitions = await (db.gapDefinition.findMany as any)(...)
      
      // After
      const gapDefinitions = await db.gapDefinition.findMany(...)
      ```

4. Run `npm run type-check` after each fix to ensure no regressions
```

---

## 5. AI Service Abstraction

### Step 5.1: Create AI Service Interface

```
PROMPT:

Create `/app/lib/services/ai/types.ts` with AI service contracts:

1. Define interfaces:
   ```typescript
   export interface AIService {
     extractPolicyData(document: DocumentInput): Promise<PolicyExtractionResult>
     analyzeGaps(policy: PolicyContext, definitions: GapDefinition[]): Promise<GapAnalysisResult>
     generateSummary(text: string, language: 'en' | 'el'): Promise<string>
   }
   
   export interface DocumentInput {
     data: Buffer
     mimeType: string
     fileName: string
   }
   
   export interface PolicyExtractionResult {
     success: boolean
     confidence: number  // 0-1
     data: {
       insurerName?: string
       policyNumber?: string
       lineOfBusiness?: LineOfBusiness
       startDate?: string
       endDate?: string
       premiumAmount?: number
       coverageSummary?: string
     }
     rawResponse?: string  // For debugging
   }
   
   export interface PolicyContext {
     id: string
     insurerName: string
     policyNumber: string
     lineOfBusiness: string
     startDate: Date
     endDate: Date
     coverageSummary?: string
     premiumAmount?: number
     documentBuffer?: Buffer
     documentMimeType?: string
   }
   
   export interface GapAnalysisResult {
     success: boolean
     verifiedMetadata: PolicyExtractionResult['data']
     gaps: DetectedGapResult[]
     acordData?: object
   }
   
   export interface DetectedGapResult {
     definitionSlug: string
     isDetected: boolean
     explanation: { en: string; el: string }
     suggestion: { en: string; el: string }
   }
   ```
```

### Step 5.2: Create Gemini Implementation

```
PROMPT:

Create `/app/lib/services/ai/gemini.service.ts`:

1. Implement AIService interface using Google Gemini:
   ```typescript
   import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
   import type { AIService, DocumentInput, PolicyExtractionResult, GapAnalysisResult } from './types'
   
   export class GeminiService implements AIService {
     private model: GenerativeModel
     
     constructor(apiKey: string) {
       const genAI = new GoogleGenerativeAI(apiKey)
       this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
     }
     
     async extractPolicyData(document: DocumentInput): Promise<PolicyExtractionResult> {
       const prompt = this.buildExtractionPrompt()
       const imagePart = this.createImagePart(document)
       
       try {
         const result = await this.model.generateContent([prompt, imagePart])
         const text = result.response.text()
         const parsed = this.parseJsonResponse(text)
         
         return {
           success: true,
           confidence: 0.8,  // Could be enhanced based on response
           data: parsed
         }
       } catch (error) {
         throw AppError.externalService('Gemini', error as Error)
       }
     }
     
     async analyzeGaps(policy: PolicyContext, definitions: GapDefinition[]): Promise<GapAnalysisResult> {
       // Implementation extracted from analyzeGaps action
     }
     
     private buildExtractionPrompt(): string {
       return PROMPTS.POLICY_EXTRACTION
     }
     
     private buildGapAnalysisPrompt(policy: PolicyContext, definitions: GapDefinition[]): string {
       return PROMPTS.GAP_ANALYSIS
         .replace('{{POLICY_DATA}}', JSON.stringify(policy))
         .replace('{{GAP_DEFINITIONS}}', definitions.map(d => `- ${d.slug}: ${d.description}`).join('\n'))
     }
     
     private parseJsonResponse(text: string): object {
       const jsonMatch = text.match(/\{[\s\S]*\}/)
       if (!jsonMatch) throw new Error('Invalid AI response format')
       return JSON.parse(jsonMatch[0])
     }
   }
   ```

2. Create `/app/lib/services/ai/prompts.ts` with all AI prompts as constants
```

### Step 5.3: Create Mock AI Service

```
PROMPT:

Create `/app/lib/services/ai/mock.service.ts` for testing and offline development:

1. Implement AIService with deterministic responses:
   ```typescript
   export class MockAIService implements AIService {
     async extractPolicyData(document: DocumentInput): Promise<PolicyExtractionResult> {
       // Simulate delay
       await new Promise(r => setTimeout(r, 500))
       
       return {
         success: true,
         confidence: 0.9,
         data: {
           insurerName: 'Mock Insurance Co',
           policyNumber: `MOCK-${Date.now()}`,
           lineOfBusiness: 'motor',
           startDate: new Date().toISOString().split('T')[0],
           endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
           premiumAmount: 500,
           coverageSummary: 'Mock coverage summary for testing'
         }
       }
     }
     
     async analyzeGaps(policy: PolicyContext, definitions: GapDefinition[]): Promise<GapAnalysisResult> {
       await new Promise(r => setTimeout(r, 1000))
       
       // Return first 2 definitions as detected gaps
       const gaps = definitions.slice(0, 2).map(def => ({
         definitionSlug: def.slug,
         isDetected: true,
         explanation: { en: 'Mock gap detected', el: 'Εικονικό κενό' },
         suggestion: { en: 'Consider adding coverage', el: 'Σκεφτείτε να προσθέσετε κάλυψη' }
       }))
       
       return {
         success: true,
         verifiedMetadata: {},
         gaps
       }
     }
   }
   ```

2. This is useful for:
   - Unit tests
   - Development without API key
   - Demo environments
```

### Step 5.4: Create AI Service Factory

```
PROMPT:

Create `/app/lib/services/ai/index.ts` as the main entry point:

1. Export factory function:
   ```typescript
   import { GeminiService } from './gemini.service'
   import { MockAIService } from './mock.service'
   import type { AIService } from './types'
   
   export function createAIService(): AIService {
     const apiKey = process.env.GEMINI_API_KEY
     
     if (!apiKey || process.env.USE_MOCK_AI === 'true') {
       console.warn('Using mock AI service')
       return new MockAIService()
     }
     
     return new GeminiService(apiKey)
   }
   
   // Singleton for app-wide use
   let aiService: AIService | null = null
   
   export function getAIService(): AIService {
     if (!aiService) {
       aiService = createAIService()
     }
     return aiService
   }
   
   // Re-export types
   export * from './types'
   ```

2. Update GapAnalysisService to use getAIService():
   ```typescript
   import { getAIService } from '@/lib/services/ai'
   
   class GapAnalysisService {
     private aiService = getAIService()
     
     async analyzePolicy(policyId: string): Promise<GapAnalysisResult> {
       // ... prepare policy context
       const result = await this.aiService.analyzeGaps(policyContext, definitions)
       // ... process result
     }
   }
   ```
```

---

## 6. Caching Layer

### Step 6.1: Implement Next.js Cache for Static Data

```
PROMPT:

Create `/app/lib/cache/static.ts` for caching static/semi-static data:

1. Use Next.js `unstable_cache` for server-side caching:
   ```typescript
   import { unstable_cache } from 'next/cache'
   import { db } from '@/lib/db'
   
   // Insurers list - rarely changes
   export const getInsurers = unstable_cache(
     async () => {
       return db.insurer.findMany({
         where: { isActive: true },
         orderBy: { name: 'asc' },
         select: { id: true, name: true, logoUrl: true }
       })
     },
     ['insurers-list'],
     { revalidate: 3600, tags: ['insurers'] }  // 1 hour
   )
   
   // Insurance types
   export const getInsuranceTypes = unstable_cache(
     async () => {
       return db.insuranceType.findMany({
         where: { isActive: true },
         orderBy: { name: 'asc' }
       })
     },
     ['insurance-types'],
     { revalidate: 3600, tags: ['insurance-types'] }
   )
   
   // Gap definitions by line of business
   export const getGapDefinitions = unstable_cache(
     async (lineOfBusiness: string) => {
       return db.gapDefinition.findMany({
         where: { lineOfBusiness, isActive: true }
       })
     },
     ['gap-definitions'],
     { revalidate: 1800, tags: ['gap-definitions'] }  // 30 min
   )
   
   // Plans for billing
   export const getPlans = unstable_cache(
     async () => {
       return db.plan.findMany({
         orderBy: { price: 'asc' }
       })
     },
     ['plans'],
     { revalidate: 3600, tags: ['plans'] }
   )
   ```

2. Create invalidation helpers:
   ```typescript
   import { revalidateTag } from 'next/cache'
   
   export function invalidateInsurers() {
     revalidateTag('insurers')
   }
   
   export function invalidateGapDefinitions() {
     revalidateTag('gap-definitions')
   }
   ```

3. Update actions to use cached functions instead of direct DB calls
```

### Step 6.2: Implement Redis Cache for User Data

```
PROMPT:

Create `/app/lib/cache/redis.ts` for user-specific caching:

1. Set up Redis client (using existing Upstash):
   ```typescript
   import { Redis } from '@upstash/redis'
   
   const redis = process.env.UPSTASH_REDIS_REST_URL 
     ? new Redis({
         url: process.env.UPSTASH_REDIS_REST_URL,
         token: process.env.UPSTASH_REDIS_REST_TOKEN!
       })
     : null
   
   export function isRedisAvailable(): boolean {
     return redis !== null
   }
   ```

2. Create cache utilities:
   ```typescript
   // Generic cache wrapper
   export async function cached<T>(
     key: string,
     ttlSeconds: number,
     fetcher: () => Promise<T>
   ): Promise<T> {
     if (!redis) return fetcher()
     
     const cached = await redis.get<T>(key)
     if (cached) return cached
     
     const fresh = await fetcher()
     await redis.setex(key, ttlSeconds, fresh)
     return fresh
   }
   
   // User-specific cache
   export async function cachedForUser<T>(
     userId: string,
     subKey: string,
     ttlSeconds: number,
     fetcher: () => Promise<T>
   ): Promise<T> {
     return cached(`user:${userId}:${subKey}`, ttlSeconds, fetcher)
   }
   
   // Invalidate user cache
   export async function invalidateUserCache(userId: string, subKey?: string) {
     if (!redis) return
     
     if (subKey) {
       await redis.del(`user:${userId}:${subKey}`)
     } else {
       // Delete all user keys (pattern match)
       const keys = await redis.keys(`user:${userId}:*`)
       if (keys.length > 0) {
         await redis.del(...keys)
       }
     }
   }
   ```

3. Usage examples:
   ```typescript
   // In PolicyService
   async getPolicySummary(userId: string) {
     return cachedForUser(userId, 'policy-summary', 300, async () => {
       const policies = await this.policyRepo.findByOwner(userId)
       return {
         total: policies.length,
         active: policies.filter(p => p.status === 'active').length,
         expiringSoon: policies.filter(p => p.status === 'expiring_soon').length
       }
     })
   }
   ```
```

### Step 6.3: Add Cache to Dashboard Queries

```
PROMPT:

Optimize dashboard data loading with caching:

1. Create `/app/lib/cache/dashboard.ts`:
   ```typescript
   import { cachedForUser, invalidateUserCache } from './redis'
   import { db } from '@/lib/db'
   
   interface AgentDashboardData {
     customerCount: number
     activeCustomers: number
     totalPolicies: number
     openOpportunities: number
     openGaps: number
     recentActivity: Activity[]
   }
   
   export async function getAgentDashboardData(agentId: string): Promise<AgentDashboardData> {
     return cachedForUser(agentId, 'dashboard', 60, async () => {  // 1 min cache
       const [customers, opportunities, gaps, activity] = await Promise.all([
         db.customerRelationship.count({ where: { agentUserId: agentId } }),
         db.opportunity.count({ where: { ownerAgentUserId: agentId, status: 'open' } }),
         // ... more queries
       ])
       
       return {
         customerCount: customers,
         // ...
       }
     })
   }
   
   // Invalidate on relevant actions
   export async function invalidateAgentDashboard(agentId: string) {
     await invalidateUserCache(agentId, 'dashboard')
   }
   ```

2. Call invalidation when data changes:
   ```typescript
   // In CustomerService
   async addCustomer(agentId: string, data: AddCustomerInput) {
     const customer = await this.customerRepo.create(...)
     await invalidateAgentDashboard(agentId)
     return customer
   }
   ```
```

---

## 7. Event-Driven Architecture

### Step 7.1: Create Event System

```
PROMPT:

Create `/app/lib/events/event-emitter.ts`:

1. Define event types:
   ```typescript
   export type DomainEvent = 
     | { type: 'POLICY_CREATED'; payload: { policyId: string; userId: string; insurerName: string } }
     | { type: 'POLICY_DELETED'; payload: { policyId: string; userId: string } }
     | { type: 'POLICY_SHARED'; payload: { policyId: string; ownerId: string; agentId: string } }
     | { type: 'POLICY_ANALYZED'; payload: { policyId: string; userId: string; gapsFound: number } }
     | { type: 'GAP_DETECTED'; payload: { gapInstanceId: string; policyId: string; severity: GapSeverity } }
     | { type: 'GAP_RESOLVED'; payload: { gapInstanceId: string; userId: string } }
     | { type: 'CUSTOMER_INVITED'; payload: { inviteId: string; agentId: string; email: string } }
     | { type: 'CUSTOMER_ACTIVATED'; payload: { relationshipId: string; agentId: string; customerId: string } }
     | { type: 'OPPORTUNITY_CREATED'; payload: { opportunityId: string; agentId: string; customerId: string } }
     | { type: 'OPPORTUNITY_STATUS_CHANGED'; payload: { opportunityId: string; oldStatus: string; newStatus: string } }
   ```

2. Create event emitter:
   ```typescript
   type EventHandler<T> = (payload: T) => Promise<void>
   
   class EventEmitter {
     private handlers = new Map<string, EventHandler<any>[]>()
     
     on<E extends DomainEvent>(
       type: E['type'],
       handler: EventHandler<E['payload']>
     ): void {
       const handlers = this.handlers.get(type) || []
       handlers.push(handler)
       this.handlers.set(type, handlers)
     }
     
     async emit<E extends DomainEvent>(event: E): Promise<void> {
       const handlers = this.handlers.get(event.type) || []
       
       // Run handlers in parallel, don't fail on individual errors
       const results = await Promise.allSettled(
         handlers.map(handler => handler(event.payload))
       )
       
       // Log failures
       results.forEach((result, index) => {
         if (result.status === 'rejected') {
           logger('error', `Event handler failed for ${event.type}`, {
             error: result.reason,
             handlerIndex: index
           })
         }
       })
     }
   }
   
   export const events = new EventEmitter()
   ```
```

### Step 7.2: Create Event Handlers

```
PROMPT:

Create `/app/lib/events/handlers/` directory with event handlers:

1. `/app/lib/events/handlers/activity-log.handler.ts`:
   ```typescript
   import { events } from '../event-emitter'
   import { db } from '@/lib/db'
   
   // Log all policy events
   events.on('POLICY_CREATED', async ({ policyId, userId, insurerName }) => {
     await db.activityLog.create({
       data: {
         adminUserId: userId,
         adminEmail: await getUserEmail(userId),
         actionType: 'POLICY_CREATED',
         description: `Created policy with ${insurerName}`,
         metadata: { policyId }
       }
     })
   })
   
   events.on('POLICY_ANALYZED', async ({ policyId, userId, gapsFound }) => {
     await db.activityLog.create({
       data: {
         adminUserId: userId,
         adminEmail: await getUserEmail(userId),
         actionType: 'POLICY_ANALYZED',
         description: `Analyzed policy - ${gapsFound} gaps found`,
         metadata: { policyId, gapsFound }
       }
     })
   })
   
   // ... more handlers
   ```

2. `/app/lib/events/handlers/notification.handler.ts`:
   ```typescript
   import { events } from '../event-emitter'
   import { db } from '@/lib/db'
   import { sendEmail } from '@/lib/mail'
   
   events.on('POLICY_SHARED', async ({ policyId, ownerId, agentId }) => {
     const [owner, agent, policy] = await Promise.all([
       db.user.findUnique({ where: { id: ownerId } }),
       db.user.findUnique({ where: { id: agentId } }),
       db.policy.findUnique({ where: { id: policyId } })
     ])
     
     // Create in-app notification
     await db.notificationEvent.create({
       data: {
         userId: agentId,
         eventType: 'policy_shared',
         channel: 'in_app',
         title: 'New Policy Shared',
         message: `${owner?.name} shared their ${policy?.lineOfBusiness} policy with you`,
         relatedObjectType: 'policy',
         relatedObjectId: policyId
       }
     })
     
     // Send email if preferences allow
     const prefs = await db.notificationPreference.findFirst({
       where: { userId: agentId, eventType: 'policy_shared', channel: 'email' }
     })
     
     if (prefs?.enabled !== false) {
       await sendEmail({
         to: agent!.email,
         subject: 'New Policy Shared With You',
         template: 'policy-shared',
         data: { ownerName: owner?.name, policyType: policy?.lineOfBusiness }
       })
     }
   })
   
   events.on('GAP_DETECTED', async ({ gapInstanceId, policyId, severity }) => {
     if (severity === 'critical' || severity === 'high') {
       // High-priority gaps trigger immediate notification
       const gap = await db.gapInstance.findUnique({
         where: { id: gapInstanceId },
         include: { policy: { include: { owner: true } } }
       })
       
       await db.notificationEvent.create({
         data: {
           userId: gap!.policy.ownerUserId,
           eventType: 'gap_detected',
           channel: 'in_app',
           title: `${severity.toUpperCase()} Coverage Gap Detected`,
           message: gap!.aiExplanation || 'A coverage gap was found in your policy',
           relatedObjectType: 'gap',
           relatedObjectId: gapInstanceId
         }
       })
     }
   })
   ```

3. `/app/lib/events/handlers/opportunity.handler.ts`:
   ```typescript
   events.on('GAP_DETECTED', async ({ gapInstanceId, policyId, severity }) => {
     // Auto-create opportunity for high-severity gaps
     if (severity === 'critical' || severity === 'high') {
       const gap = await db.gapInstance.findUnique({
         where: { id: gapInstanceId },
         include: { 
           policy: { 
             include: { 
               owner: {
                 include: {
                   customerRelationshipsAsCustomer: true
                 }
               }
             }
           }
         }
       })
       
       // Find agent relationship
       const relationship = gap?.policy.owner.customerRelationshipsAsCustomer[0]
       
       if (relationship) {
         await db.opportunity.create({
           data: {
             relationshipId: relationship.id,
             policyId: policyId,
             gapInstanceId: gapInstanceId,
             ownerAgentUserId: relationship.agentUserId,
             status: 'open',
             notes: `Auto-created from ${severity} gap detection`
           }
         })
       }
     }
   })
   ```
```

### Step 7.3: Register Handlers and Emit Events

```
PROMPT:

1. Create `/app/lib/events/index.ts` to initialize all handlers:
   ```typescript
   import { events } from './event-emitter'
   
   // Import handlers to register them
   import './handlers/activity-log.handler'
   import './handlers/notification.handler'
   import './handlers/opportunity.handler'
   import './handlers/cache-invalidation.handler'
   
   export { events }
   export type { DomainEvent } from './event-emitter'
   ```

2. Update services to emit events:
   ```typescript
   // In PolicyService
   import { events } from '@/lib/events'
   
   async create(userId: string, data: CreatePolicyInput): Promise<Policy> {
     const policy = await this.policyRepo.create(...)
     
     // Emit event - handlers run async
     await events.emit({
       type: 'POLICY_CREATED',
       payload: { 
         policyId: policy.id, 
         userId, 
         insurerName: policy.insurerName 
       }
     })
     
     return policy
   }
   
   async analyzeGaps(policyId: string, userId: string): Promise<GapAnalysisResult> {
     const result = await this.aiService.analyzeGaps(...)
     
     // Create gap instances
     for (const gap of result.gaps) {
       const instance = await this.gapRepo.createInstance(...)
       
       await events.emit({
         type: 'GAP_DETECTED',
         payload: {
           gapInstanceId: instance.id,
           policyId,
           severity: instance.severity
         }
       })
     }
     
     await events.emit({
       type: 'POLICY_ANALYZED',
       payload: { policyId, userId, gapsFound: result.gaps.length }
     })
     
     return result
   }
   ```

3. Ensure events module is imported in server entry:
   ```typescript
   // In instrumentation.ts or layout.tsx server component
   import '@/lib/events'
   ```
```

---

## 8. API Versioning & Documentation

### Step 8.1: Standardize API Structure

```
PROMPT:

Reorganize `/app/app/api/` for better versioning:

1. Move all business endpoints under versioned paths:
   ```
   /app/api/
   ├── v1/                     # Current stable API
   │   ├── policies/
   │   │   ├── route.ts        # GET (list), POST (create)
   │   │   └── [id]/
   │   │       ├── route.ts    # GET, PUT, DELETE
   │   │       ├── analyze/
   │   │       │   └── route.ts
   │   │       └── share/
   │   │           └── route.ts
   │   ├── customers/
   │   ├── gaps/
   │   ├── opportunities/
   │   └── me/
   │       └── route.ts
   ├── health/                  # No versioning (infrastructure)
   │   └── route.ts
   ├── webhooks/                # No versioning (external)
   │   ├── stripe/
   │   └── supabase/
   └── internal/                # Admin-only, separate versioning
       └── admin/
   ```

2. Create API response helper `/app/lib/api/response.ts`:
   ```typescript
   import { NextResponse } from 'next/server'
   
   export function apiSuccess<T>(data: T, status = 200) {
     return NextResponse.json({
       success: true,
       data,
       meta: { timestamp: new Date().toISOString() }
     }, { status })
   }
   
   export function apiError(code: string, message: string, status = 500, details?: object) {
     return NextResponse.json({
       success: false,
       error: { code, message, details }
     }, { status })
   }
   
   export function apiPaginated<T>(data: T[], pagination: PaginationMeta) {
     return NextResponse.json({
       success: true,
       data,
       meta: { pagination, timestamp: new Date().toISOString() }
     })
   }
   ```

3. Create versioning middleware:
   ```typescript
   // In middleware.ts, add for API routes:
   if (pathname.startsWith('/api/v1/')) {
     response.headers.set('X-API-Version', '1')
   }
   ```
```

### Step 8.2: Create API Documentation

```
PROMPT:

Create `/app/docs/API.md` with comprehensive API documentation:

1. Include sections:
   - Authentication (how to get/use tokens)
   - Base URL and versioning
   - Common headers
   - Error format
   - Rate limiting info
   - Each endpoint group with:
     - Method + Path
     - Description
     - Request body/params (with types)
     - Response format
     - Example requests (curl)
     - Possible errors

2. Document these endpoint groups:
   - **Authentication** (`/api/v1/auth/*`)
   - **User Profile** (`/api/v1/me`)
   - **Policies** (`/api/v1/policies/*`)
   - **Customers** (`/api/v1/customers/*`)
   - **Gaps** (`/api/v1/gaps/*`)
   - **Opportunities** (`/api/v1/opportunities/*`)
   - **Notifications** (`/api/v1/notifications/*`)
   - **Billing** (`/api/v1/billing/*`)

3. Add example for each:
   ```markdown
   ### Create Policy
   
   `POST /api/v1/policies`
   
   Creates a new insurance policy.
   
   **Request Body:**
   ```json
   {
     "insurerName": "string (required)",
     "policyNumber": "string (required)",
     "lineOfBusiness": "motor|health|home|life|travel|...",
     "startDate": "YYYY-MM-DD",
     "endDate": "YYYY-MM-DD",
     "premiumAmount": "number (optional)"
   }
   ```
   
   **Response:** `201 Created`
   ```json
   {
     "success": true,
     "data": {
       "id": "clx...",
       "policyNumber": "POL-001",
       ...
     }
   }
   ```
   
   **Errors:**
   - `400` - Validation error
   - `401` - Not authenticated
   - `429` - Rate limited
   ```
```

---

## 9. Testing Infrastructure

### Step 9.1: Set Up Unit Testing

```
PROMPT:

Set up Vitest for unit testing:

1. Verify `/app/vitest.config.ts` configuration:
   ```typescript
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'
   import path from 'path'
   
   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./tests/setup.ts'],
       include: ['**/*.test.ts', '**/*.test.tsx'],
       exclude: ['node_modules', '.next'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         exclude: ['node_modules', '.next', 'tests']
       }
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './')
       }
     }
   })
   ```

2. Create `/app/tests/setup.ts`:
   ```typescript
   import '@testing-library/jest-dom'
   import { vi } from 'vitest'
   
   // Mock environment variables
   vi.stubEnv('DATABASE_URL', 'mock://database')
   vi.stubEnv('GEMINI_API_KEY', 'mock-api-key')
   
   // Mock Prisma
   vi.mock('@/lib/db', () => ({
     db: {
       policy: {
         findMany: vi.fn(),
         findUnique: vi.fn(),
         create: vi.fn(),
         update: vi.fn(),
         delete: vi.fn()
       },
       // ... other models
     }
   }))
   ```

3. Add test scripts to package.json (should already exist):
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```
```

### Step 9.2: Write Service Tests

```
PROMPT:

Create tests for PolicyService in `/app/tests/unit/services/policy.service.test.ts`:

1. Test structure:
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'vitest'
   import { PolicyService } from '@/lib/services/policy.service'
   import { AppError } from '@/lib/errors'
   
   describe('PolicyService', () => {
     let service: PolicyService
     let mockPolicyRepo: any
     let mockUserRepo: any
     
     beforeEach(() => {
       mockPolicyRepo = {
         findByOwner: vi.fn(),
         findWithDetails: vi.fn(),
         create: vi.fn(),
         update: vi.fn(),
         delete: vi.fn()
       }
       mockUserRepo = {
         findByEmail: vi.fn()
       }
       
       service = new PolicyService(mockPolicyRepo, mockUserRepo)
     })
     
     describe('create', () => {
       it('should create a policy with valid data', async () => {
         const input = {
           insurerName: 'Test Insurance',
           policyNumber: 'POL-001',
           lineOfBusiness: 'motor' as const,
           startDate: '2024-01-01',
           endDate: '2025-01-01'
         }
         
         mockPolicyRepo.create.mockResolvedValue({ id: '123', ...input })
         
         const result = await service.create('user-1', input)
         
         expect(result.id).toBe('123')
         expect(mockPolicyRepo.create).toHaveBeenCalledWith(
           expect.objectContaining({
             ownerUserId: 'user-1',
             insurerName: 'Test Insurance'
           })
         )
       })
       
       it('should throw validation error for invalid line of business', async () => {
         const input = {
           insurerName: 'Test',
           policyNumber: 'POL-001',
           lineOfBusiness: 'invalid' as any,
           startDate: '2024-01-01',
           endDate: '2025-01-01'
         }
         
         await expect(service.create('user-1', input)).rejects.toThrow(AppError)
       })
     })
     
     describe('delete', () => {
       it('should delete policy if user is owner', async () => {
         mockPolicyRepo.findWithDetails.mockResolvedValue({
           id: 'pol-1',
           ownerUserId: 'user-1'
         })
         
         await service.delete('pol-1', 'user-1')
         
         expect(mockPolicyRepo.delete).toHaveBeenCalledWith('pol-1')
       })
       
       it('should throw forbidden error if user is not owner', async () => {
         mockPolicyRepo.findWithDetails.mockResolvedValue({
           id: 'pol-1',
           ownerUserId: 'other-user'
         })
         
         await expect(service.delete('pol-1', 'user-1')).rejects.toThrow(AppError)
       })
     })
   })
   ```

2. Create similar tests for:
   - GapAnalysisService
   - CustomerService
   - All service methods
```

### Step 9.3: Write E2E Tests

```
PROMPT:

Create Playwright E2E tests in `/app/tests/e2e/`:

1. `/app/tests/e2e/auth.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test'
   
   test.describe('Authentication', () => {
     test('should show login page', async ({ page }) => {
       await page.goto('/auth/signin')
       await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
     })
     
     test('should show validation errors for empty form', async ({ page }) => {
       await page.goto('/auth/signin')
       await page.getByRole('button', { name: /sign in/i }).click()
       await expect(page.getByText(/email is required/i)).toBeVisible()
     })
     
     test('should redirect to wallet after login', async ({ page }) => {
       await page.goto('/auth/signin')
       await page.getByLabel(/email/i).fill('test@example.com')
       await page.getByLabel(/password/i).fill('password123')
       await page.getByRole('button', { name: /sign in/i }).click()
       
       // Wait for redirect
       await expect(page).toHaveURL(/\/wallet/)
     })
   })
   ```

2. `/app/tests/e2e/wallet.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test'
   
   test.describe('Policy Wallet', () => {
     test.beforeEach(async ({ page }) => {
       // Login helper
       await page.goto('/auth/signin')
       await page.getByLabel(/email/i).fill('test@example.com')
       await page.getByLabel(/password/i).fill('password123')
       await page.getByRole('button', { name: /sign in/i }).click()
       await page.waitForURL(/\/wallet/)
     })
     
     test('should display empty state for new user', async ({ page }) => {
       await expect(page.getByText(/no policies/i)).toBeVisible()
     })
     
     test('should open add policy modal', async ({ page }) => {
       await page.getByRole('button', { name: /add policy/i }).click()
       await expect(page.getByRole('dialog')).toBeVisible()
     })
     
     test('should create a policy', async ({ page }) => {
       await page.getByRole('button', { name: /add policy/i }).click()
       
       // Fill form
       await page.getByLabel(/insurer/i).fill('Test Insurance')
       await page.getByLabel(/policy number/i).fill('POL-001')
       await page.getByLabel(/type/i).selectOption('motor')
       await page.getByLabel(/start date/i).fill('2024-01-01')
       await page.getByLabel(/end date/i).fill('2025-01-01')
       
       await page.getByRole('button', { name: /save/i }).click()
       
       // Verify policy appears
       await expect(page.getByText('POL-001')).toBeVisible()
     })
   })
   ```

3. Configure `/app/playwright.config.ts` for local testing
```

---

## 10. Module Restructuring

### Step 10.1: Plan Module Structure

```
PROMPT:

Create a detailed plan for restructuring the codebase into feature modules:

1. Analyze current structure and dependencies
2. Propose new structure:
   ```
   /app/
   ├── modules/
   │   ├── wallet/              # Policyholder wallet
   │   │   ├── components/
   │   │   ├── services/
   │   │   ├── repositories/
   │   │   ├── hooks/
   │   │   ├── actions.ts
   │   │   ├── types.ts
   │   │   └── index.ts
   │   │
   │   ├── agent/               # Agent features
   │   │   ├── components/
   │   │   ├── services/
   │   │   └── ...
   │   │
   │   ├── admin/               # Admin features
   │   │
   │   ├── auth/                # Authentication
   │   │
   │   └── shared/              # Cross-cutting
   │       ├── components/ui/
   │       ├── hooks/
   │       ├── lib/
   │       └── types/
   │
   ├── app/                     # Next.js pages (thin)
   │   └── (protected)/
   │       └── wallet/
   │           └── page.tsx     # Imports from modules/wallet
   ```

3. List files to move with new paths
4. Create migration script or step-by-step guide
5. Ensure no circular dependencies

Do not actually move files yet - just create the plan in `/app/docs/MODULE_RESTRUCTURE_PLAN.md`
```

### Step 10.2: Create Shared Module

```
PROMPT:

Create the shared module at `/app/modules/shared/`:

1. Move common UI components:
   - `/app/components/ui/*` → `/app/modules/shared/components/ui/*`
   - Update all imports

2. Move common hooks:
   - `/app/hooks/*` → `/app/modules/shared/hooks/*`
   - Create barrel export

3. Move common lib:
   - `/app/lib/utils.ts` → `/app/modules/shared/lib/utils.ts`
   - `/app/lib/db.ts` → `/app/modules/shared/lib/db.ts`
   - `/app/lib/logger.ts` → `/app/modules/shared/lib/logger.ts`

4. Move shared types:
   - `/app/types/*` → `/app/modules/shared/types/*`

5. Create `/app/modules/shared/index.ts`:
   ```typescript
   // Components
   export * from './components/ui'
   
   // Hooks
   export * from './hooks'
   
   // Lib
   export { db } from './lib/db'
   export { logger } from './lib/logger'
   export { cn } from './lib/utils'
   
   // Types
   export * from './types'
   ```

6. Update tsconfig.json paths:
   ```json
   {
     "paths": {
       "@/*": ["./*"],
       "@shared/*": ["./modules/shared/*"]
     }
   }
   ```
```

### Step 10.3: Create Wallet Module

```
PROMPT:

Create the wallet module at `/app/modules/wallet/`:

1. Move wallet components:
   - `/app/components/wallet/*` → `/app/modules/wallet/components/*`

2. Move wallet services (created earlier):
   - `/app/lib/services/policy.service.ts` → `/app/modules/wallet/services/policy.service.ts`
   - `/app/lib/services/gap-analysis.service.ts` → `/app/modules/wallet/services/gap-analysis.service.ts`

3. Move wallet repositories:
   - `/app/lib/repositories/policy.repository.ts` → `/app/modules/wallet/repositories/policy.repository.ts`
   - `/app/lib/repositories/gap.repository.ts` → `/app/modules/wallet/repositories/gap.repository.ts`

4. Move wallet actions:
   - `/app/app/(protected)/wallet/actions.ts` → `/app/modules/wallet/actions.ts`

5. Create module types:
   - `/app/modules/wallet/types.ts` - Policy, Gap related types

6. Create barrel export:
   ```typescript
   // /app/modules/wallet/index.ts
   
   // Components
   export { PolicyCard } from './components/PolicyCard'
   export { PolicyWallet } from './components/PolicyWallet'
   export { WalletClient } from './components/WalletClient'
   // ...
   
   // Services
   export { PolicyService } from './services/policy.service'
   export { GapAnalysisService } from './services/gap-analysis.service'
   
   // Actions
   export * from './actions'
   
   // Types
   export * from './types'
   ```

7. Update page imports:
   ```typescript
   // /app/app/(protected)/wallet/page.tsx
   import { WalletClient, PolicyService } from '@/modules/wallet'
   ```
```

---

## Execution Order

For best results, execute these prompts in this order:

1. **Week 1: Foundation**
   - 2.1, 2.2 (Error handling)
   - 4.1, 4.2, 4.3 (Type safety)
   - 1.1 (Base service)

2. **Week 2: Services**
   - 1.2, 1.3, 1.4 (Services)
   - 1.5 (Refactor actions)
   - 5.1, 5.2, 5.3, 5.4 (AI abstraction)

3. **Week 3: Data Layer**
   - 3.1, 3.2, 3.3, 3.4 (Repositories)
   - 3.5 (Update services)
   - 4.4, 4.5 (Mappers, remove any)

4. **Week 4: Infrastructure**
   - 6.1, 6.2, 6.3 (Caching)
   - 7.1, 7.2, 7.3 (Events)

5. **Week 5: Quality**
   - 8.1, 8.2 (API docs)
   - 9.1, 9.2, 9.3 (Testing)

6. **Week 6: Restructure (Optional)**
   - 10.1, 10.2, 10.3 (Modules)

---

*Document Version: 1.0*  
*Created: January 28, 2026*
