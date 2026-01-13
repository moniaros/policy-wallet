# AI Analysis Roadmap

## Current Implementation
- **Basic Extraction**: Extracts Insurer, Policy Number, Dates, and Line of Business.
- **Model**: Gemini 1.5 Flash.

## Missing Features & Implementation Plan

### 1. Detailed Coverage Extraction (Priority: High)
- **Goal**: Extract coverage limits, deductibles, and key benefits.
- **Action**: Update `uploadPolicyDocument` prompt to return a `coverage_summary` and structured `coverage_details`.
- **Storage**: Store structured data in a new `coverage_details` JSON column or existing `coverageSummary` text field.

## Phase 1: Enhanced Extraction (Completed)
- [x] Extract `coverageSummary` (plain text)
- [x] Store in `Policy` model
- [x] Display in UI (Wallet Detail)

## Phase 2: Gap Analysis (Implemented)
- [x] Define `GapDefiniton` and `GapInstance` models
- [x] Seed standard gaps (Motor, Health, Home) via `prisma/seed.ts`
- [x] Create `analyzeGaps` server action
- [x] Create UI to trigger analysis and view results (`AnalysisCard`)
- [x] Integrate with Policy Detail page

## Phase 3: Advanced Intelligence (Next)
- [ ] Automated Opportunity creation for Agents
- [ ] Email notifications for detected gaps
- [ ] Detailed "Exclusions" analysis

### 4. Exclusions & Limitations (Priority: Medium)
- **Goal**: Highlight what is NOT covered to prevent nasty surprises.
- **Action**: Extract `exclusions` list during the upload process.

### 5. Smart Categorization (Priority: Low)
- **Goal**: Better `lineOfBusiness` detection (e.g., differentiating "Term" vs "Whole" Life).

## Phase 1 Implementation: Enhanced Extraction
 We will update `app/(protected)/wallet/actions.ts` to:
 1. Expand the prompt to request `coverageSummary` (plain text) and `deductible` information.
 2. Save this to the `Policy` record.
