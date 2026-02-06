# Week 2 Implementation Plan

**Date:** 2026-01-29  
**Status:** 🚀 In Progress

---

## Overview

Week 2 focuses on refactoring existing services to use the new Week 1 infrastructure (error handling, type safety, base service) and creating any missing services.

---

## Current State Assessment

### ✅ Existing Services (From Previous Conversation)

1. **`lib/services/policy.service.ts`** (509 lines)
   - Methods: `create()`, `uploadAndParse()`, `delete()`, `share()`, `getShares()`, `revokeShare()`
   - Status: ⚠️ Needs refactoring (no AppError, no domain types)

2. **`lib/services/gap-analysis.service.ts`** (388 lines)
   - Methods: `analyzePolicy()`, `detectGapsForUser()`, `getGapDefinitions()`, `resolveGap()`, `dismissGap()`
   - Status: ⚠️ Needs refactoring (no AppError, no domain types)

3. **`lib/services/base.service.ts`** (95 lines)
   - Status: ✅ Already updated in Week 1

### ❌ Missing Services

4. **`lib/services/customer.service.ts`**
   - Status: 🔴 Needs creation

5. **`lib/services/ai`** (abstraction layer)
   - Status: 🔴 Needs creation

---

## Week 2 Tasks

### Phase 1: Refactor Existing Services ✅

#### Task 1.1: Refactor PolicyService
- [ ] Add `AppError` imports and usage
- [ ] Replace `throw new Error()` with `AppError.*`
- [ ] Use domain types from `@/types`
- [ ] Use `CreatePolicyInput` from `types/api.ts`
- [ ] Add proper error handling with i18n support
- [ ] Update return types to use domain interfaces
- [ ] Add JSDoc with examples

#### Task 1.2: Refactor GapAnalysisService
- [ ] Add `AppError` imports and usage
- [ ] Replace error strings with `AppError.*`
- [ ] Use `GapSeverity`, `GapStatus` enums
- [ ] Use domain types for return values
- [ ] Add proper authorization checks
- [ ] Update JSDoc

### Phase 2: Create Missing Services ✅

#### Task 2.1: Create CustomerService
- [ ] Create `lib/services/customer.service.ts`
- [ ] Implement `getCustomers(agentId, filters)`
- [ ] Implement `getCustomerProfile(customerId, agentId)`
- [ ] Implement `addCustomerManually(agentId, data)`
- [ ] Implement `bulkImport(agentId, data)`
- [ ] Implement `inviteCustomer(agentId, email)`
- [ ] Use `AppError` for all errors
- [ ] Use domain types for all returns

#### Task 2.2: Create AI Service Abstraction
- [ ] Create `lib/services/ai/ai-service.interface.ts`
- [ ] Create `lib/services/ai/gemini-ai.service.ts`
- [ ] Create `lib/services/ai/mock-ai.service.ts`
- [ ] Create `lib/services/ai/ai-service.factory.ts`
- [ ] Create `lib/services/ai/index.ts` (barrel export)

### Phase 3: Refactor Server Actions ✅

#### Task 3.1: Update wallet/actions.ts
- [ ] Import services
- [ ] Replace logic with service calls
- [ ] Use `handleActionError()` for all errors
- [ ] Keep actions as thin wrappers
- [ ] Add proper type annotations

#### Task 3.2: Update agent/actions.ts (if exists)
- [ ] Import `CustomerService`
- [ ] Replace logic with service calls
- [ ] Use `handleActionError()`

### Phase 4: Testing & Verification ✅

- [ ] Run type check
- [ ] Test PolicyService methods
- [ ] Test GapAnalysisService methods
- [ ] Test CustomerService methods
- [ ] Test AI service factory
- [ ] Verify error handling works
- [ ] Check i18n support

---

## Implementation Order

1. **Refactor PolicyService** (highest priority - most used)
2. **Refactor GapAnalysisService** (depends on PolicyService)
3. **Create AI Service Abstraction** (needed by both services)
4. **Create CustomerService** (new functionality)
5. **Refactor Actions** (integration layer)
6. **Testing & Verification**

---

## Success Criteria

- ✅ All services use `AppError` for errors
- ✅ All services use domain types from `@/types`
- ✅ All services extend `BaseService`
- ✅ All server actions are thin wrappers
- ✅ Type check passes
- ✅ No `any` types in services
- ✅ Proper JSDoc documentation
- ✅ i18n support for user-facing errors

---

## Estimated Time

- Phase 1: 2-3 hours
- Phase 2: 2-3 hours
- Phase 3: 1-2 hours
- Phase 4: 1 hour

**Total:** 6-9 hours

---

## Notes

- Existing services are well-structured, just need error handling upgrade
- AI service abstraction will make testing easier
- CustomerService is net-new, needs careful design
- Actions refactoring should be straightforward

---

**Next Step:** Start with Phase 1 - Refactor PolicyService
