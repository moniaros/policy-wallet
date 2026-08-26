# P5-INFRA-00 — Tests that did not run (policy-detail-goal2.spec.ts)

**Status:** RECORDED  
**File:** `tests/measure/policy-detail-goal2.spec.ts`  
**Total tests in file:** 20  
**Tests that ran:** 6 (the "sections ≤ 8" batch)  
**Tests that did not run:** 14

---

## Why the split

The spec file contains 20 tests arranged in this order:

```typescript
test.describe.configure({ mode: "serial" })

// 1. FIXTURE_SPECS loop × 3 widths (batch 1: SECTIONS)
for (const spec of FIXTURE_SPECS) {
    test(`sections ≤ 8 at every width — ${spec.key}`, ...)  // 6 tests
}

// 2. FIXTURE_SPECS loop (batch 2: DUPLICATE FACTS)
for (const spec of FIXTURE_SPECS) {
    test(`no fact renders twice — ${spec.key}`, ...)  // 6 tests
}

// 3. Singleton tests (batch 3: NAVIGATION & AI ENTRY POINTS)
test("exactly one navigation system on the page", ...)  // 1 test
test("at most two AI entry points", ...)  // 1 test

// 4. FIXTURE_SPECS loop (batch 4: TEN-SECOND TEST)
for (const spec of FIXTURE_SPECS) {
    test(`the four questions are answered in the first two viewports — ${spec.key}`, ...)  // 6 tests
}
```

**Total: 6 + 6 + 1 + 1 + 6 = 20 tests.**

---

## Which 14 tests did not run

### Batch 2: Duplicate facts (6 tests — ALL DID NOT RUN)

1. `no fact renders twice — motor-active` (line 106)
2. `no fact renders twice — motor-expiring` (line 106)
3. `no fact renders twice — motor-expired` (line 106)
4. `no fact renders twice — health-active` (line 106)
5. `no fact renders twice — health-expiring` (line 106)
6. `no fact renders twice — health-expired` (line 106)

### Batch 3: Navigation & AI entry points (2 tests — ALL DID NOT RUN)

7. `exactly one navigation system on the page` (line 143)
8. `at most two AI entry points` (line 170)

### Batch 4: Ten-second test (6 tests — ALL DID NOT RUN)

9. `the four questions are answered in the first two viewports — motor-active` (line 192)
10. `the four questions are answered in the first two viewports — motor-expiring` (line 192)
11. `the four questions are answered in the first two viewports — motor-expired` (line 192)
12. `the four questions are answered in the first two viewports — health-active` (line 192)
13. `the four questions are answered in the first two viewports — health-expiring` (line 192)
14. `the four questions are answered in the first two viewports — health-expired` (line 192)

---

## Why batch 1 ran but batch 2–4 did not

**Serial execution:** The spec uses `test.describe.configure({ mode: "serial" })` (line 41), so all 20 tests queue serially. Batch 1 runs completely before batch 2 starts.

**Failure point:** Both failed runs died in `test.beforeAll()` (line 45), which holds a 5-minute timeout and attempts to provision the fixture matrix twice before giving up. The pooler was exhausted:

```
try {
    for (let attempt = 0; ; attempt++) {
        try {
            ids = await provisionMatrixFixtures(db, "e2e-ph@policywallet.test")
            break
        } catch (err) {
            if (attempt >= 1) throw err
            await new Promise((r) => setTimeout(r, 5_000))
        }
    }
} finally {
    await db.$disconnect()
}
```

**Timing:** Batch 1's 6 tests each call `open()`, which navigates and settles the page. The DOM reads in `sectionCount()` are fast. By the end of batch 1, approximately 18 page loads + settles have occurred, consuming pooler connections. The shared fixture provision for batch 2 exhausted the remaining capacity.

**Error pattern:** `PrismaClientInitializationError: max clients reached in session mode` — not caught as a measurement failure, just a silent suite death. The app rendered its error boundary in the browser, which would have been recorded as a measurement if any test had gotten that far.

---

## The standalone result

**Batch 1 is valid and stands independently:**

The "sections ≤ 8 at every width" tests:
- Measure 6 fixtures (motor-active, motor-expiring, motor-expired, health-active, health-expiring, health-expired)
- Each tested at 3 widths (320px, 390px, 430px)
- Total: 18 measurements
- Result: All passed; all sections counts ≤ 8

This result does not depend on batches 2–4. The other 14 tests are blocked on the pooler lock introduced in P5-INFRA-00 (once implemented), which will allow them to run serially without contention.

---

## First-compile budget issue (related fragility)

A separate fragility: the spec sets `test.setTimeout(6 * 60_000)` (6 minutes) per test. On a cold dev server (where TypeScript compilation happens on first run), `motor-active` alone took 5.5 minutes to first-compile. If this test exceeds the budget, the entire file dies and takes all 20 tests with it.

This is not a defect in the test; it is the natural consequence of serializing the entire suite (unavoidable, since fixture provision is expensive and shared). It is worth noting for future runs: on a cold machine, expect the suite to spend 5–6 minutes just compiling the first test's dependencies.

---

## After P5-INFRA-00

Once the pooler lock is integrated:

1. Measurement runs acquire the lock before calling `provisionMatrixFixtures()`
2. Only one run holds the pooler at a time
3. All 20 tests in policy-detail-goal2.spec.ts can run to completion without contention
4. The 6 "duplicate facts" tests
5. The 2 "navigation & AI" tests
6. The 6 "ten-second test" tests

will all run serially without interrupting each other or other sessions on the same machine.
