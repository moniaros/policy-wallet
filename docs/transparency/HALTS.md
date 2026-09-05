# PW-TRANSPARENCY-02 — halts

A halt is a decision the series cannot take. Each entry presents what exists, the options, and what each returns in the states the parent spec names. Nothing here is decided by the agent.

## H-T01 — Risk DNA dimension scores (B1.6)

**Raised:** 2026-09-05 · **Blocks:** B1.6 only. B1.7 removes the protection score elsewhere regardless.

### What exists

`components/risk-dna/RiskDnaPanel.tsx` renders nine "dimensions of your life", each with a 0–100 number (`data-fact="riskDimension.score"`, line 139–142) and a bar coloured by threshold (`barTone`, line 63–66: ≥80 success, ≥50 warning, else danger). Dimensions with no applicable risk render `null` and are listed separately as not applicable (line 76–80), which is right. The panel's own subtitle says the nine "do not add up to one number — they are lenses, not a scoreboard" (line 96).

How a number is made (`lib/services/risk-dna/compute.ts`):

- `scoreDimension(open, applicable) = round((applicable − open) / applicable × 100)`. `applicable` is the number of risk assessments in the dimension that apply to this person's profile; `open` is how many of them are `protection_gap` or `opportunity`. A risk is "open" when no **held, live line** answers it — `activeLines` come from `isPolicyCoverageActive` over the wallet (`lib/services/risk-dna/service.ts`, lines 95–111). Analysis never enters: a held policy answers a risk whether or not it was ever read, and whatever branch it is in.
- The resilience dimension (`resilienceScore`, lines 115–150) is built from profile answers only — savings runway, debt ratio, dependants, whether income is known — and is `null` until savings are known.

It is therefore a **breadth-of-held-lines measure over a profile-derived exposure list**, coloured by threshold. Which is the shape H-001 and H-005 removed elsewhere: a number that cannot distinguish "nothing looked" from "nothing wrong".

### What it returns in the four states the parent spec names

| Portfolio state | Coverage dimensions | Resilience | What the reader sees |
|---|---|---|---|
| **Empty** (no policies) | every applicable risk open → **0** per dimension (null only where no risk applies) | profile-only | nine red bars at 0 — a verdict on a wallet with nothing in it |
| **Never analysed** (policies held, no run ever completed) | held live lines answer risks → scores rise to 50–100 | profile-only | green/amber bars over documents nobody has read |
| **All expired** | `isPolicyCoverageActive` false for all → **0** per dimension | profile-only | nine red bars — here the colour happens to be right, for the wrong reason |
| **Unauthored branch** (e.g. renters, cyber, liability held and live) | the held line answers its risks → score rises | profile-only | a green bar produced by a policy no rule has assessed (B1.5 state) |

The third and fourth rows are the invariant failing in opposite directions on the same surface.

### Options

**Option A — keep the numbers, make them measurements.** Render each dimension as `X από Y κινδύνους απαντώνται από γραμμή που κατέχετε` with `Y` visible, a text label always, no threshold colour (one neutral bar), and add the two facts the number cannot carry: how many of the answering lines are unanalysed, and how many are in unauthored branches (from `lib/gaps/assessment-coverage.ts`). `null` stays "not applicable". Cost: a `RiskDnaPanel` rewrite and new copy; the dimension `ifActioned` deltas ("movement in the protection score if the named risk were answered") must go or be restated as a count, because they re-derive from `calculateScoreFromAssessments`.
Returns: empty → «0 από Y»; never analysed → «X από Y, X μη αναλυμένα»; all expired → «0 από Y»; unauthored → «X από Y, N χωρίς ορισμένους ελέγχους».

**Option B — remove the per-dimension number.** Keep the nine dimensions as a lens: the open risks named, the next action, the confidence limit — everything the panel already renders under the number — and drop `score`, `barTone` and the `ifActioned` delta. `data-fact="riskDimension.score"` retires from the count-key registry.
Returns: the same list of named open risks in all four states, with no figure to be wrong.

### What is not decided here

Whether the dimensions themselves (the risk graph, the open-risk list) are a defensible product surface. Both options keep them; only the 0–100 and its colour are in question. The same reasoning applied to the agent-side `crossSell.coverageScore` percentage, which B1.7 replaced with the count it derived from.

**Recommendation: none — present, do not decide (amendment 01, B1.6).**

### Closed 2026-09-06 — DECIDED by the owner (close-out block, F2): Option B, remove.

**Decision as written:** «B1.6 DECIDED: remove the Risk DNA dimension scores. Remove them from every render site. Where they occupied a surface, render the disclosed-findings treatment already built in B3.» **Reasoning:** the table above shows the number reporting the good outcome in states the check did not cover (never analysed → green bars; unauthored branch → a green bar from an unassessed line) and the bad outcome for the wrong reason (all expired → red bars); Option A would have kept a figure whose denominator is a profile-derived exposure list nobody has confirmed. A judgment the engine cannot substantiate is not publishable (PW-TRANSPARENCY-02); the named open risks, the next action and the confidence limit survive, and the B3 under-review label stands where the number was. **Done:** `RiskDnaPanel` renders no number, bar, trend arrow, «improved by N» line or «would move your score by N points» line; the agent KPI strip's «Μέσος δείκτης προστασίας» (an average of protection scores, threshold-coloured) and the advisor book's household index («Εικόνα: N») went with it; `riskDimension.score` and `agent.portfolioCompleteness` left the instrumentation registry. Guard: `tests/unit/risk-dna-no-scores.test.tsx` (every .tsx under app/ and components/, probe committed). Decision of record: `DECISIONS.md` D-F2.

---

## H-T02 — deleting the two protection-score APIs (B1.7)

**Raised:** 2026-09-05 · **Blocks:** deletion of `app/api/v1/protection-score/route.ts` (B2C) and `app/api/v1/customers/protection-scores/route.ts` (B2B).

No in-repository consumer calls either route (the only mention outside `app/api/` is a comment in the agent dashboard). External consumers cannot be established from the codebase, and the repository carries a RevenueCat integration and a `PushDevice` model, which suggests a native client exists. The amendment's rule is to record and halt rather than break a consumer.

**Human task:** confirm from the API gateway / Vercel logs whether either path receives requests from a client other than the web app in the last 30 days. If none, both routes and their inventory entries are deleted; if any, the consumer is named here and the route is kept until it migrates.

### Closed 2026-09-06 — RESOLVED (close-out block, F4): deleted.

**Evidence, in the order it was gathered.** (1) Codebase: no consumer of either path outside `app/api/` — the only mentions were a comment and audit prose. (2) Production database: `push_devices` holds **0** rows, i.e. no native client has ever registered with production; the routes accept only a session cookie (`auth.mode: user`), which a non-web client would have to hold. (3) Sentry (org `policywallet`, spans, last 30 days, server `tracesSampleRate` 0.1): `span.op:http.server transaction:*protection-score*` → **0** rows, while the same query over `transaction:*/api/v1/*` returned **13** sibling routes with sampled traffic (`POST /api/v1/consents` 420, `GET /api/v1/collaboration/threads` 340, …); the only `protection-score` transaction in the window is the internal cron `/api/v1/jobs/protection-score-refresh`. (4) Vercel runtime logs could NOT be read for the window: the runtime-log API returns `ExceedsBillingLimitError`, and the CLI's `--since 30d` returns HTTP 400 because Hobby retention is one hour. **Path taken:** delete both routes and their inventory entries (the block's "no caller" branch), on (1)–(3), with (4) stated as the gap in coverage; a deletion is a two-file revert if a caller ever surfaces. `DECISIONS.md` D-F4.
