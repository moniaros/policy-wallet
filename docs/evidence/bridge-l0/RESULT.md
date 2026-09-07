# PW-BRIDGE-01 L0.3 — two-sided harness, first run (2026-09-06, dev database, `next dev`, 390px, Greek)

Spec: `tests/measure/bridge/bridge-l0-demo.spec.ts`, project `bridge`. Both sessions are the provisioned E2E accounts (`e2e-ph@` policyholder, `e2e-agent@` agent) connected through an active relationship and a policy-scoped `AccessGrant`, exactly the rows `sharePolicy` writes. Per-state captures (`<label>.<side>.json`) live in the state folders — full-page screenshots are kept only for the five captures that evidence a finding (unauthored branch ×2, expired ×2, revoked agent page); the harness regenerates the rest; `RESULT.json` holds the 18 summary rows; `DIVERGENCE-DEMO.json` the deliberate-divergence run.

## 1. The metric goes red on live pages (required for L0 exit)

Healthy state, policy pair. The customer's page was captured, the run's `finishedAt` was moved +3 days in the database, then the agent's page was captured over the same policy.

| Result | Value |
|---|---|
| fact pairs compared | 4 (`record.status`, `gap.findingsProvenance`, `composition.lines`, `composition.coverage`) |
| divergent | **1 — `gap.findingsProvenance`**: customer «Ευρήματα από την ανάλυση της 20 Φεβρουαρίου 2026.» · agent «…της 23 Φεβρουαρίου 2026.» |
| restored | yes (`finishedAt` set back; `seed.restore()`) |

The same run paired `notification.unreadCount` («9+» vs «3») — the shell's badge shows the VIEWER's unread count, not the object's. It is now a viewer-scoped key and never pairs (`VIEWER_SCOPED_KEYS` in `facts.ts`; unit case added).

## 2. Nine states × two pairs

Policy pair = `/wallet/<id>` ↔ `/customers/<uid>/policy/<id>`. Home pair = `/dashboard` ↔ `/customers/<uid>`.

| State | Policy: fact pairs / divergent | Policy: count pairs / divergent | Policy: one-sided (customer / agent) | Home: pairs | Note |
|---|---|---|---|---|---|
| healthy | 4 / 0 | 3 / 0 | 7 / 0 | 0 / 0 | parity by construction on the shared `AnalysisCard`; the customer additionally renders identity, status, dates, attention, `gap.provenanceGroup`, `gap.underReviewCount` |
| failed_run | 5 / 0 | 3 / 0 | 7 / 0 | 0 / 0 | the failed-attempt sentence pairs |
| pre_plan | 3 / 0 | 0 / 0 | 7 / 0 | 0 / 0 | no composition counts on either side — consistent |
| stale_catalogue | 5 / 0 | 3 / 0 | 7 / 0 | 0 / 0 | the stale sentence pairs |
| unauthored_branch | 1 / 0 | 0 / 0 | 6 / **1** | 0 / 0 | **agent renders `gap.findingsProvenance` = «Δεν έχουν οριστεί ακόμη έλεγχοι…»; the customer's page renders no analysis fact at all** → Queue A-16 |
| expired | 1 / 0 | 0 / 0 | 8 / **3** | 0 / 0 | **agent renders `composition.coverage` («Ελέγξαμε 2 σημεία…: 0 καλύπτονται · 2 δεν καλύπτονται»), `composition.lines`, provenance; customer renders none** — both say «Ανενεργό» → Queue A-18 |
| revoked_access | 0 / 0 | 0 / 0 | 11 / 0 | 0 / 0 | agent page = not-found body, **no customer data in the text** (policy number, insurer, plate all absent); HTTP **200** |
| empty_book | 4 / 0 | 3 / 0 | 7 / 0 | 0 / 0 | policy pair unchanged by book shape |
| single_client_book | 4 / 0 | 3 / 0 | 7 / 0 | 0 / 0 | idem |

Across all 36 captures: horizontal scroll **0**, `<html lang>` **el** on every page, HTTP 200 on every page (including the revoked case, see above).

## 3. What the numbers mean for the queues

- **Fact divergences in the shared card: 0 in every state.** Where both sides render the same component, parity holds. Every contradiction L0 found is either a render the B2B page does on its own (raw policy number, raw end date, premium-or-zero — code findings, PARITY A2/A4/A5) or an **absence** on one side (A-16, A-18).
- **The home pair is unmeasurable**: 0 pairs in every state because the agent's customer profile renders no `data-fact`/`data-count`. Queue A-08 (instrumentation) precedes any VERIFY on A-02…A-07.
- **Revocation holds on the policy page**; Queue B tier 1 extends the capture to every agent surface and template.

## 4. Harness facts worth keeping

- The harness imports `currentCatalogueVersion` statically; a dynamic `import()` of a repo `.ts` module fails under Playwright's loader («Cannot use import statement outside a module»).
- One test per state: the single nine-state test exceeded a 15-minute timeout after five states (≈3 minutes per state at four captures each). `RESULT.json` is merged after every state so a partial run leaves evidence.
- Seeding is idempotent per fixture key (`bridge-motor-active`, `bridge-motor-expired`, `bridge-cyber-active`); relationship, grant and run changes are reverted by `restore()`; the production host is refused.
