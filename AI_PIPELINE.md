# AI Processing Pipeline

## Overview

PolicyWallet uses Google Gemini 2.0 Flash for AI-powered policy document analysis. This document describes the data flow, status transitions, retry behavior, and front-end polling contract.

## Data Flow

```
Upload (File)
  -> uploadAndParse() creates Policy record (status = "analyzing")
  -> Next.js after() triggers runBackgroundAnalysis()
    -> GapAnalysisService.analyzePolicy()
      -> GeminiAIService.extractPolicyData() [60s timeout, 1 retry]
      -> GeminiAIService.analyzeGaps() [60s timeout, 1 retry]
    -> Deduplication check (merge if duplicate policy number found)
    -> Policy updated (status = "active" | "action_needed")
    -> NotificationEvent created
```

## Status State Machine

```
  pending
    |
    v
  analyzing ──────────────────┐
    |                         |
    v                         v
  active              action_needed
    |                    (retryable)
    v
  expiring_soon
    |
    v
  cancelled
```

| Status          | Meaning                                           | Terminal? |
|-----------------|---------------------------------------------------|-----------|
| `pending`       | Policy created but not yet submitted for analysis | No        |
| `analyzing`     | AI extraction + gap analysis in progress          | No        |
| `active`        | Analysis complete, policy is live                 | No        |
| `action_needed` | Analysis failed or requires manual review         | Yes*      |
| `expiring_soon` | Policy nearing expiration date                    | No        |
| `cancelled`     | Policy cancelled by user                          | Yes       |

*`action_needed` is retryable via the "Analyze" button in the UI.

## AI Call Reliability

### Timeout
- All Gemini API calls have a **60-second timeout** enforced via `Promise.race()`.
- If the call exceeds 60s, a timeout error is thrown.

### Retry
- On transient failures (timeout, HTTP 429/500/503, overloaded), **1 automatic retry** is attempted.
- Backoff: 2 seconds (exponential, base 2s).
- Non-transient errors (invalid JSON, auth errors, etc.) are **not retried**.

### Error Storage
- On failure, `acordData.processingError` is populated:
  ```json
  {
    "processingError": {
      "message": "AI call timed out after 60000ms",
      "code": "TIMEOUT | ANALYSIS_FAILED",
      "occurredAt": "2025-01-15T10:30:00.000Z",
      "retryable": true
    }
  }
  ```

## Front-End Polling Contract

### Polling Behavior (`PolicyWalletClient.tsx`)
- When any policy has `status === "analyzing"`, the client polls via `router.refresh()` every **3 seconds**.
- Polling stops automatically when no policies are in `analyzing` state.

### Status Transition Handling
- `analyzing` -> `active`: Success toast + browser notification.
- `analyzing` -> `action_needed`: Error toast with retry prompt + browser notification.
- Policy disappears during analysis (deduplication merge): Fetches latest notifications to show merge toast.

### Timing Expectations
| Operation           | Typical Duration | Max Duration (with retry) |
|---------------------|------------------|---------------------------|
| Policy extraction   | 5-15s            | ~124s (60s + 2s + 60s + 2s) |
| Gap analysis        | 5-20s            | ~124s                     |
| Total pipeline      | 10-35s           | ~248s                     |

### Browser Notifications
- Requested on first `analyzing` policy detection.
- Fired on analysis completion (success or failure).

## Gemini Configuration

| Parameter        | Extraction | Gap Analysis | Q&A   |
|------------------|-----------|--------------|-------|
| Temperature      | 0.1       | 0.2          | 0.3   |
| Top P            | 0.95      | 0.95         | 0.95  |
| Top K            | 40        | 40           | 40    |
| Max Output Tokens| 8192      | 8192         | 2048  |

## No Persistent Queue

The pipeline uses Next.js `after()` for fire-and-forget background processing. There is no persistent job queue or worker system. If the server restarts during analysis, the policy remains in `analyzing` state indefinitely. Users can manually re-trigger via the "Analyze" button.
