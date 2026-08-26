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
- **SEC-01 remediated, not closed** — rotation, redaction at both sinks, and a guard with a
  red-probe per arm. The cookie bug only made the throw reachable; the leak was that nothing
  between the throw and the log sink removed the payload. Closure waits on one human check.
- **Gap catalogue verified on BOTH databases by content, not counts** — dev and prod return the
  identical hash `e7ffd876eeb8a58ce1d1ccab1525bad3` over 29 active rows, 0 inactive, 0 AI-minted.

## Top risks, ranked

1. **SEC-01 — session objects reached the Vercel runtime logs. LAUNCH RISK, not post-GA debt.**
   **Contained, not closed**, and not closable by the agent. The middleware TypeError embedded the
   whole session in its message; **8 occurrences confirmed** in production (2026-08-23 ×7,
   2026-08-26 ×1), counted two independent ways.
   *Done:* the affected admin session **revoked** (prod verified 0 sessions / 0 unrevoked); both
   leaked access-token JWTs had already expired and neither leaked refresh token still existed in
   `auth.refresh_tokens`; the throw is caught and redacted in `proxy.ts`; `scrubText` now redacts
   credentials, which it never did; Sentry holds **no** copy. The IP-origin line raised in review
   is **CLOSED — confirmed VPN, not a finding**.
   *Open, and the only thing gating closure:* whether a **Vercel log drain** was configured inside
   the exposure window. Dashboard check, project *and* team — see `HALTS.md → SEC-01`. No drain ⇒
   exposure confined to Vercel's own logs, which age out and hold only dead credentials, and
   SEC-01 closes. Drain ⇒ the 8 entries were forwarded to a third party with its own retention and
   access list, containment is **not** established, and a new scope item opens.
   Vercel exposes no delete endpoint for runtime logs; the only early-purge lever is deleting the
   two producing deployments, deliberately not done — irreversible, and the credentials are dead.
   Whether occurrences predate 2026-08-23 **cannot be established**: the 7-day aggregate times out
   and 30 days is rejected.

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

1. Confirm who can read the Vercel runtime logs — team `moniaros' projects` (Pro, no SAML) is the
   access boundary, and its member list could not be enumerated from the tooling here.
2. Re-capture `/protection` once the session pooler recovers; it is the only measurement that
   changes a ceiling.
3. **P5-wallet-01** is unblocked: motor, property, pet and marine carry strong identifiers in
   `acordData`; health, life, travel, cyber, business and pension carry none, which is exactly why
   the duplicate rows measured were health. Rows without an identifier stand alone.
