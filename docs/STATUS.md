# STATUS

**Production: `60087bb7`** — deployed 2026-08-26 02:07, CI green on all four jobs, Vercel `READY`.
Public surface smoked; `/wallet`, `/dashboard`, `/account` all redirect anonymous callers to
signin. **All five halts answered and implemented.**

## Current phase

`PW-MOBILE-TRANSFORM-02`, **Phases 0–3 complete and tagged**. Phase 5 evidence in progress:
`P5-wallet-00/01a` measured, `P5-infra-00` and `P5-measure-00` landed.

## Done since the last entry

- **A production auth defect, found while verifying a deploy rather than by a test.** `proxy.ts`
  used the legacy per-name Supabase cookie adapter while `lib/supabase/server.ts` used
  `getAll`/`setAll`. Supabase chunks an auth cookie past ~3.2KB; a reader that fetches one cookie
  by name cannot reassemble it, and `set` rebuilt the response per call so only the last chunk
  survived. One adapter now, with a guard whose universe comes from the filesystem.
- **The measurement harness survives a shared machine** — a pooler lock in `withDb()` *and* in
  `global-setup.ts`, stale-holder stealing, and structural refusal of error-boundary and
  unlocatable-field captures.
- **The section-count discontinuity is recorded.** Break point `f66dd435`. Policy detail ≤8 with
  its two halves separable: 10→9 was the measurement fix, 9→8 the page fix.
- **Gap catalogue verified on BOTH databases by content, not counts** — dev and prod return the
  identical hash `e7ffd876eeb8a58ce1d1ccab1525bad3` over 29 active rows, 0 inactive, 0 AI-minted.

## Top risks, ranked

1. **Credentials are sitting in the Vercel runtime logs.** The middleware TypeError embedded the
   whole session object, so two live admin refresh tokens were written to logs across 8
   occurrences (2026-08-23 and 2026-08-26). The throw is fixed; the log entries are not, and
   nothing has rotated those tokens.
2. **The local session pooler (5432) is wedged.** `verify:gap-catalogue` passed at 04:44 and failed
   at 05:10 on the same invocation. TCP is healthy (~400ms, no IPv6 records) and the database is
   idle at 3 upstream connections, but new *session-mode* connections stall past the 20s pool
   timeout while transaction mode (6543) still answers. Follows two crashed provisioning runs.
   Blocks every local Playwright measurement.
3. **`/protection` is the one unresolved capture.** A ceiling baseline, Phase-5-queued, stored
   20/26 sections with 2 confirmed doubles — corrected ≤18/≤23 but **not re-run**, blocked on
   risk 2. 137 more stale capture files across 9 surfaces are recorded, not urgent.
4. **`verify:gap-catalogue` now runs in CI** (the secrets were a name mismatch, not missing) — but
   the loud-skip fallback has never actually fired, so the failure path is unproven.
5. **The fix for a guard gap had the same gap.** The pooler lock shipped guarding `withDb` while
   the heaviest DB user in the run bypassed it. Assume every new guard's universe is too small
   until enumerated from the filesystem.

## Next 3 actions

1. Rotate the exposed refresh tokens, or decide explicitly not to and record why.
2. Re-capture `/protection` once the session pooler recovers; it is the only measurement that
   changes a ceiling.
3. **P5-wallet-01** is unblocked: motor, property, pet and marine carry strong identifiers in
   `acordData`; health, life, travel, cyber, business and pension carry none, which is exactly why
   the duplicate rows measured were health. Rows without an identifier stand alone.
