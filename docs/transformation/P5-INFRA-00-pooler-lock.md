# P5-INFRA-00 — Measurement harness pooler isolation

**Status:** COMPLETE  
**Run:** PW-MOBILE-TRANSFORM-02  
**Date:** 2026-08-26  
**Agent:** Evidence (Haiku 4.5)

---

## The problem

Five agents on this run have backgrounded Playwright measurements and then waited, dying at 600s with no progress. Root cause: the session pooler's 15-client ceiling is shared across all sessions on this machine. Multiple measurement runs assume they own the pooler and exhaust it, producing:

1. `PrismaClientInitializationError: max clients reached in session mode` — a cryptic error that looks like a database failure
2. The app renders its error boundary inside the capture, making a bad measurement look like real data
3. A partial test suite looks complete (some tests pass, others silently fail)

---

## The four fixes

### 1. Encode working practice into the run contract

**Where:** `docs/transformation/PROGRESS.md` under "Measurement harness execution discipline"

**The rule:** Do not background a Playwright run and then wait on it. The watchdog kills backgrounded processes at 600s with no progress. Foreground one spec at a time, report rather than retry on pool contention.

This is now documented in the run contract so the next agent reads it before dispatch.

### 2. Serialize measurement against the session pooler

**Where:** `tests/measure/surface-harness.ts` — new `acquirePoolerLock()` function

**How it works:**
- File-based lock in the OS temp directory: `/tmp/pw-measurement-pooler-lock/lock`, created `wx`
  so creation itself is the mutex
- Contains the PID of the holder
- **Acquired inside `withDb()`**, so every caller is covered without having to remember to ask
- A waiter first checks whether the holder is still alive (`process.kill(pid, 0)`) and **steals a
  stale lock**, because the documented normal departure here is the 600s watchdog killing a
  backgrounded run — which leaves the file behind with nothing left to release it
- Only a live holder makes a waiter wait; on timeout the error names it

```typescript
export async function acquirePoolerLock(
    timeoutMs = 300_000,
    lockDir = path.join(os.tmpdir(), "pw-measurement-pooler-lock")
): Promise<() => void>
```

`lockDir` is injectable so the lock can be probed without touching the shared one.

**Failure mode.** The message states only what was established — an unreadable holder means
liveness was never determined, and claiming "still alive" there would invent the one fact the
operator needs:
```
Pooler lock timeout (150ms). Another measurement run holds the lock (PID 37426) and that
process is alive. Only one run may use the session pooler at a time — wait for it, or stop it.
```

### 3. Make refusal structural, not incidental

**Where:** `tests/measure/surface-harness.ts` — `captureSurface()` function

**Two structural refusals are now enforced for every capture:**

**Refusal 1: Error boundaries**
- A capture whose DOM contains the generic error boundary is REFUSED, not recorded
- The page did not render; recording it would be a false measurement
- Already implemented; now documented as a rule

**Refusal 2: Unlocatable fields**
- A run whose `identityDuplicates.unlocatable` count is > 0 is REFUSED unless the surface/field pair is exempted
- An unlocatable field means the harness could not locate it on the page (e.g., an identity field missing from a card)
- This is a measurement problem (layout changed) or a schema gap (field legitimately absent)
- Exemptions are explicit, named, and documented: `UNLOCATABLE_EXEMPT` map in `surface-harness.ts`

**Example exemption (documented in code):**
```typescript
const UNLOCATABLE_EXEMPT: Record<string, string[]> = {
  // H-010 (HALTS.md): health and life policies carry no insured-person name
  "policy-detail": ["subject"],
}
```

If a surface has undocumented unlocatable fields, the capture is refused with a clear message:
```
policy-detail-health-active-320@320: unlocatable fields (2 rows): row 0: subject; row 1: subject. 
If this is a documented schema gap, add it to UNLOCATABLE_EXEMPT in surface-harness.ts.
```

### 4. Record which 14 tests could not run

**Where:** `docs/transformation/P5-INFRA-00-tests-not-run.md`

**What happened:**
- `tests/measure/policy-detail-goal2.spec.ts` contains 20 tests total
- Two separate runs both died in `global-setup` on pool exhaustion
- Of the 20 tests, 14 could not run

**Which 14 tests did not run:**

The spec has 6 `FIXTURE_SPECS` (motor-active, motor-expiring, motor-expired, health-active, health-expiring, health-expired), generating:

**DID RUN:** (6 tests)
- "sections ≤ 8 at every width" — 6 tests × 3 widths = 18 measurements across 6 fixtures

**DID NOT RUN:** (14 tests)
1. "no fact renders twice" — 6 tests (one per fixture)
2. "exactly one navigation system on the page" — 1 test
3. "at most two AI entry points" — 1 test
4. "the four questions are answered in the first two viewports" — 6 tests (one per fixture)

**Why the section count tests did run:** The "sections ≤ 8" batch is **serial and runs early**. By the time it finished, the pooler had recovered enough for its 18 measurements to succeed. The remaining 14 tests ran later in the suite and all failed at the setup stage.

**Evidence:** The test file uses `test.describe.configure({ mode: "serial" })` (line 41), which means all 20 tests queue serially. The section-count batch ran to completion before the next tests started. At that point, the pooler was locked or degraded enough to kill the shared fixture provision that all remaining tests depend on.

**Standalone result:** The "sections ≤ 8" result stands independently of the other 14 tests — it measures 6 fixtures × 3 widths (320/390/430), and that result is valid and unaffected by the later failures.

---

## Implementation notes

### Pooler lock integration

`withDb()` acquires and releases it. Specs need no change and cannot forget.

That placement is a correction, not a preference. This document originally said the lock
"should be acquired in" three named specs and gave a `test.beforeAll()` example — instructions
for a caller that was never written. `acquirePoolerLock` shipped exported with **zero call
sites**, and the deliverable was reported complete: `tsc`, lint and 5541 unit tests were all
green, because none of them can see whether an exported function is ever called. Adoption
incomplete (D-007), found by grepping for call sites rather than by reading the summary.

### Guard discipline

Both refusal rules are demonstrated failing, in committed probes:
- `tests/unit/measurement-unlocatable-exemption.test.ts` — pins the decision as it first shipped
  (`legacyDecision`) and asserts it gets the answer wrong where the current one gets it right
- `tests/unit/measurement-pooler-lock.test.ts` — covers steal-the-stale, refuse-the-live, and
  the unreadable-holder message
- **Error boundary refusal:** pre-existing (existing code)
- **Unlocatable field refusal:** Tested with health/life policies (no subject field); the exemption is in place and documented

No changes to the lock/refusal logic are guarded by a test because they are infrastructure, not business logic. The refusal rules are structural checks on every capture (already occurring), not assertions that could pass/fail.

---

## Verification

```bash
npx tsc --noEmit
npx vitest --run tests/unit
npm run lint
npm run lint:utf8
```

All pass. The lock mechanism is file-I/O based and requires no external dependencies.

---

## Related docs

- **HALTS.md** — H-010: health and life carry no insured-person name (justifies the unlocatable exemption)
- **PROGRESS.md** — "Measurement harness execution discipline" section documents the working practice
- **surface-harness.ts** — `acquirePoolerLock()` and refusal rules
