# AI Analysis Roadmap

## Current Implementation
- **Basic Extraction**: Extracts Insurer, Policy Number, Dates, and Line of Business.
- **Model**: Gemini 1.5 Flash.

## Missing Features & Implementation Plan

### 1. Detailed Coverage Extraction (Priority: High)
- **Goal**: Extract coverage limits, deductibles, and key benefits.
- **Action**: Update `uploadPolicyDocument` prompt to return a `coverage_summary` and structured `coverage_details`.
- **Storage**: Store structured data in a new `coverage_details` JSON column or existing `coverageSummary` text field.

### 2. Policy Summarization (Priority: Medium)
- **Goal**: Generate a "3-bullet point" summary of the policy for the dashboard.
- **Action**: Add a summarization step or combine with the extraction step.

### 3. Gap Analysis (Priority: High - Competitive Advantage)
- **Goal**: Identify missing coverages based on the user's profile and existing policies.
- **Action**: 
    - Create a new background job or async action `analyzeGaps(userId)`.
    - Compare active policies against `GapDefinition` rules.
    - Use AI to evaluate if a policy covers a specific risk.

### 4. Exclusions & Limitations (Priority: Medium)
- **Goal**: Highlight what is NOT covered to prevent nasty surprises.
- **Action**: Extract `exclusions` list during the upload process.

### 5. Smart Categorization (Priority: Low)
- **Goal**: Better `lineOfBusiness` detection (e.g., differentiating "Term" vs "Whole" Life).

## Phase 1 Implementation: Enhanced Extraction
 We will update `app/(protected)/wallet/actions.ts` to:
 1. Expand the prompt to request `coverageSummary` (plain text) and `deductible` information.
 2. Save this to the `Policy` record.
