# PW-BRIDGE-01 — the four queues, populated at L0 exit (2026-09-06)

Populated from `PARITY.md` and `INTERACTIONS.md`. Order within Queue A follows §6 (leaks, then count/state contradictions, then text contradictions, then asymmetries). Every item runs the six-phase loop (§3); a class here is the L0 **proposal** and CLASSIFY may overturn it. Depth at L0 exit: **A 18 · B 23 · C 8 · D 6** (A-19, A-20, A-21 appended from A-08's captures).

## Queue A — Dashboard parity

| # | Item | Source row | Proposed class |
|---|---|---|---|
| A-01 | `customers/[id]/page.tsx` selects the customer's `password` hash and never uses it — minimise | PARITY E3 | **Leak** (repair first) — **ACT done 2026-09-06**, eleven sites, guard green |
| A-01b | Full-row `include: { customer: … }` loads (`customer.service.ts` profile; `findUnique({ where: { email } })` without select in the customer creator) still bring every user column including the hash | A-01 residue | Leak (minimisation) — narrow to selects; extend the guard to bare includes of the user relation |
| A-02 | Finding count: B2C home reads `disclosed`, every agent surface reads `classified`; a third raw count computed in `customer.service` | PARITY B3 | **Reclassified** Unjustified asymmetry (the headline was already classified on both sides; the agent lacked the under-review figure) — **ACT done 2026-09-06** |
| A-03 | Unknown premium renders «0,00 €» on the B2B policy page; B2C counts it as unknown | PARITY A5 | Contradiction (value) — **ACT done 2026-09-06**, VERIFY by harness |
| A-04 | End date: B2B page and both templates read the raw `endDate` column, the app the lifecycle | PARITY A4 (+ C-01, C-02) | Contradiction (date/count) — **ACT done 2026-09-06**, VERIFY by harness |
| A-05 | Raw `policy.policyNumber` on the B2B policy page (a `PENDING-…` sentinel shows) | PARITY A2 | Contradiction (text) — **ACT done 2026-09-06**, VERIFY by harness |
| A-06 | After an agent confirms, record status says ΠΡΟΣ ΕΠΙΒΕΒΑΙΩΣΗ while the «unverified» badge is gone — on both sides | PARITY B1 / I-08 | Contradiction (state) — **ACT done 2026-09-06** (D-B4) |
| A-07 | Insurer rendered twice on the B2B page (column and raw extracted value) | PARITY A1 | Contradiction or Cosmetic — capture decides — **ACT done 2026-09-07** — the raw-envelope insurer/premium pair deleted; the registry-resolved head is the one render; parity guard rule A-07 + probe |
| A-08 | Agent dashboard KPIs (`agent.*`) and the B2B list's per-client counts carry no `data-count`; B2B identity/premium/date renders carry no `data-fact` — parity unmeasurable | PARITY D | Instrumentation — **ACT done 2026-09-06** (policy pair 4 → 8 pairs; the KPI strip was already instrumented — PARITY D corrected); wallet pair needs the policies tab; three degraded identity states added to the harness |
| A-09 | A policy the customer never shared is invisible to the agent with no explanation on either side | PARITY C3 | Justified asymmetry — **customer half ACT done 2026-09-06**; agent half **HALT H-B2** |
| A-10 | `/agent` lists grants without the permission level | PARITY C2 | Justified asymmetry — **ACT done 2026-09-06** (the permissions mirror's first half; D-02 remains for revoke-from-the-same-surface, which /agent already offers) |
| A-11 | Agent dashboard still loads `protectionScore.overallScore` per customer | PARITY E1 | Void/cleanup — **ACT done 2026-09-07** — the score fetch and its owner-set query deleted on the dashboard and in agent-portal.service; the wire field gone; containment guard rule + probe |
| A-12 | `data-fact` keys with score vocabulary (`timeline.scoreDelta`, `review.scoreAtOpen`, `riskDimension.*`) | PARITY E2 | Verify, then rename or remove — **ACT done 2026-09-07** — review.scoreAtOpen and timeline.scoreDelta no longer render and left the vocabulary; riskDimension.* verified text (registry note); score-containment IDS widened + probe |
| A-13 | Asset identity (plate/address) absent on every B2B surface | PARITY A6 | Unjustified asymmetry (small extension) — **ACT done 2026-09-07** — the agent policy page renders policy.insuredSubject through policyAssetIdentity with the customer's words |
| A-14 | Document list and `document.count` parity between the two policy pages | PARITY A7 | Verify — **ACT done 2026-09-07** — the agent page's documents ordered and minimised like the customer's; document.count rendered as a door on both headings; registry entry defined |
| A-16 | Unauthored-branch policy: the agent's page states the unauthored state, the customer's page renders no analysis facts at all (live capture) | PARITY B9 | Contradiction (state) — **ACT done 2026-09-07** — one defaultOpen predicate on the customer's review section (unassessed / unauthored / pre-plan / stale / any live item); VERIFY by harness |
| A-17 | `gap.underReviewCount` renders on the customer's policy card and nowhere on the agent's | PARITY B10 | Adjudicate with A-02 — **ACT done 2026-09-07** — gap.underReviewCount on the agent's policy page as a door, same sentence as the customer's band, over the live rows; the report LIST stays customer-side (the advisor's confirm action lives in the card's own list — swapping lists would remove it) |
| A-18 | Expired policy: the agent's page renders composition and provenance, the customer's renders none (live capture) | PARITY B11 | Contradiction (state) — **ACT done 2026-09-07** — the same defaultOpen predicate opens the review section for an expired policy with findings; VERIFY by harness |
| A-19 | The B2B policy page calls `getStatusLabel(status)` without the account language (defaults to Greek) — the customer's head passes `language`; an English agent reads a Greek status word on one page and an English one on the next | found while tagging the page for A-08 | Contradiction (locale) — **ACT done 2026-09-06** |
| A-20 | Agent client-policies rows render the STORED status label («Ενεργό» for a placeholder-identity policy the customer sees as «ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ»), and in a different case from the customer's pill; two status resolvers (`policy-status-view` vs `effectivePolicyStatus` + a local label map) | harness wallet pair, every state | Contradiction (state) — **ACT done 2026-09-06**, VERIFY by harness |
| A-21 | One insurer renders as «Εθνική Ασφαλιστική» to the customer (`resolveInsurerDisplay`) and «ΕΘΝΙΚΗ» to the agent (raw column) | harness wallet pair | Contradiction (text) — **ACT done 2026-09-06**, VERIFY by harness |
| A-20b | `resolvePolicyLifecycle` counted a placeholder identity as present, so raw rows and scrubbed rows resolved differently | A-20 VERIFY residue | Contradiction (state) — **ACT done 2026-09-06** |
| A-15 | `gap-readers-exclude-superseded` accepts `status:` alone as a filter; nested includes escape the B3 scope | PARITY E5 | Guard hole — **ACT done 2026-09-07** — guard demands a live set AND supersededAt: null with a brace-matched window and split-call detection (6 red probe shapes); 7 readers moved to the live set (the agent's policy page listed resolved/dismissed rows as current; customer.service under-counted on 'open'); harness state resolved_finding |

## Queue B — Interactions (all 23 rows of the ledger; order = invisible effects on a person's own record first)

| Tier | Rows | What the loop must establish |
|---|---|---|
| 1 — invisible effect on someone's record | I-08 (agent confirm), I-04 (revoke), I-05 (disconnect), I-06 (terminate), I-22 (owner edits/deletes a shared policy), I-17 (branded report), I-07 (old agent on transfer) | a dated, attributed trace on the affected party's side; revocation verified by capture on every agent surface |
| 2 — actor not declared | I-03, I-07, I-10, I-11, I-12, I-14, I-16, I-21 | `notifications` has no actor column: decide schema (halt: migration) or copy-level attribution |
| 3 — misleading | I-08 (status vs badge), I-09 (registry says owner, code says agent) | one truth per fact; registry corrected or code corrected |
| 4 — half-failure unspecified | I-03 (grant/relationship/emit not one transaction), I-09, I-13 | a specified state per interaction |
| 5 — passive | I-02, I-15, I-23 | decide: visible or justified-passive with disclosure |
| 6 — visible and declared | I-13, I-15 (task creator shown) | keep; use as the reference shape |

## Queue C — Templates are the third surface

| # | Item | Source |
|---|---|---|
| C-01 | Weekly digest computes days from the raw `endDate` column (`calendarDaysUntil(r.endDate)`), the app from the lifecycle | PARITY A4, I-21 — **ACT done 2026-09-07**: one `resolvePolicyLifecycle` call over an `expiryWindowWhere` (coverageEndDate, raw column only while NULL); guard `expiry-countdown-single-source` |
| C-02 | `policy_expiring` (renewal.service) — same raw-column computation and milestones | PARITY A4 — **ACT done 2026-09-07**: the lifecycle decides the count and the milestone; the `PolicyRenewal` cycle is keyed on the resolved date, `closeSupersededRenewals` runs before the upsert and a sweep closes open cycles a later resolved date superseded; the /renewals batch reminder quotes the cycle's own date |
| C-01b | Residue raw-column countdowns, allowlisted with exact counts in the guard: `gap-engine/portfolio-rules.ts` (3, the facts builders pass the column), `risk-graph/protection.ts` (1), `timeline/build.ts` (1, selects only the column), `components/wallet/PolicyComparison.tsx` (1, client DTO), `lib/agent/format.ts` (1, `classifyUrgencyTier` should read `expiresAt`); `risk-dna/monitoring.ts` is resolved upstream (NOT debt, listed so the universe is complete). Same class without a countdown: the raw windows at `churn-prevention.service.ts:158` («N policies expiring soon») and `perk-reminder.service.ts:49` | guard `expiry-countdown-single-source` RESIDUE; PARITY A4 — **ACT done 2026-09-07** (residue emptied; the wallet policy page was a fourth builder the row had not listed; the two raw windows now spread `expiryWindowWhere` and re-check through the lifecycle; guard rule (c) + probe `expiry-window-raw-column`) |
| C-03 | The report carries the stale-catalogue sentence but no pre-plan / unauthored counterpart; acceptance 4 requires the record-state sentence on an unconfirmed or pre-plan analysis | PARITY B7 |
| C-04 | The report renders no composition lines while the app does — a subset is allowed only if it can never contradict | PARITY B2 |
| C-05 | The report reads `scope: "disclosed"` — verify every under-review row is labelled as such in the artifact (B3 lets a labelled list through, never a count) | PARITY B3, I-17 |
| C-06 | Notification copy is generic («ένα ασφαλιστήριο») and the digest counts («N νέα κενά») name no denominator | registry, weekly-digest.ts:72 |
| C-07 | Mobile-width renders of digest, invite and report with longest-Greek identity fields — no clipping | §8 acceptance 3 |
| C-08 | Registry recipients drift from code (`extraction_flagged`) — the registry is documentation the loop must keep true | PARITY E4 |

## Queue D — Bridges (scored against §0 before design; a zero is closed, not parked)

| # | Candidate | §0 dimensions claimed | Source | Pre-score notes (scoring happens at design time) |
|---|---|---|---|---|
| D-01 | Document request as a dated mutual work item with requester, reason, due date, state | substitution, work product | spec seed 1; I-16 | An API exists (`collaboration/document-requests`) — the loop first measures whether it already meets the definition (owner, reason, due, state, visible both sides) before building anything |
| D-02 | Permissions mirror — the customer sees exactly what the agent can see and do, per policy, and revokes from the same surface | retention | spec seed 2; A-09, A-10, I-04, I-05 | Resolves the largest cluster of undisclosed justified asymmetries |
| D-03 | Shared finding thread — dated, attributed annotations on a finding | substitution, work product | spec seed 3; I-12 | Today the customer's question becomes an opportunity they cannot see; the thread is the honest artifact |
| D-04 | Renewal handoff — one action connecting the customer's date to the agent's book | retention, acquisition | spec seed 4; A-04 | Send-side policy is a HALT by rule; surface only |
| D-05 | Asset identity on the agent's surfaces (plate / address) | work product (the name a client uses on the phone) | A-13 | Tiny; may fold into Queue A as an extension |
| D-06 | Disclosure of unshared policies on both sides («2 of your 3 policies are shared with Νίκος») | retention | A-09 | Likely part of D-02 |

**Rejected by construction, not queued:** anything on the agent→customer add-policy flow (Article 9); streaks/badges; notifications whose content is an internal event; any risk or protection claim the engine cannot substantiate.
