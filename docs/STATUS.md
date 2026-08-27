# STATUS

**Production: `7425ef9b`** — deployed 2026-08-28, CI green, Vercel `READY`. Three owner-reported
defects fixed and verified live (see below).
Public surface smoked; `/wallet`, `/dashboard`, `/account` all redirect anonymous callers to
signin. **All five halts answered and implemented.**

## Current phase

`PW-MOBILE-TRANSFORM-02`, **Phases 0–4 complete, Phase 6's guard audit done, Phase 5 in progress**.
Phase 4 did not need building — the design system already existed and was adopted (1,186 utility
references); its defects were 754 hardcoded literals bypassing it and a legacy `--pw-*`/`--brand-*`
path. 274 landing literals migrated with a shrink-only debt guard over the rest. Phase 5's first two
surfaces (`/notifications`, `/dashboard`) are being rebuilt now. Earlier note, still true:
`P5-wallet-00/01a` measured, `P5-infra-00` and `P5-measure-00` landed.

## Done since the last entry

- **The gap engine was inventing duplicate motor cover.** `insuredSubject` kept a hand-rolled copy
  of the asset-identity map and never rejected the extractor's unreadable masks, so two different
  cars whose plates both read «(XXXX)» were reported as one vehicle insured twice — advice to drop a
  policy, on compulsory third-party cover. Measured against the shipped code before fixing. Now
  delegated to `policyAssetSubjectKey`, which also makes the dead `assetIdentityKey` live and adds
  pet and vessel subjects the old copy could not see.
- **Greek public pages could render English, per device, with no way back.** `/guides` and six
  siblings never pinned a locale, so they rendered whatever `localStorage` on THAT device last
  chose — which is why it looked like a mobile bug when nothing in the locale path is
  device-dependent. The ΕΛ toggle pointed at the page you were already on, so it was unrecoverable
  in place. Seven routes pinned; **verified on production with `language:'en'` stored — renders
  Greek, `langOwner="static"`.** Guard enumerates twins from the filesystem (both manual sweeps
  missed `/for-agents`; the guard caught it).
- **A renewal upload left a stale «Το ασφαλιστήριο έχει λήξει» until repeated refreshes.** Three
  defects: the path never marked the policy `analyzing`, so nothing had an honest state to show;
  `after()` deferred the run while `revalidatePath` fired ahead of it and nothing revalidated when
  it landed; and **on free/Starter the dates never moved at all** — the evidence gate rejects
  `renewal_notice` by definition, so those users would never have seen an update, ever. New
  `renewal_under_review` attention state claims neither verdict.
- **A renewal is now checked against the policy it is attached to**, comparing numbers
  presentation-insensitively (punctuation, and Greek/Latin capitals that render identically). A
  mismatch refuses to apply and names both numbers; the document is always kept.
- **The insured person is updated, not duplicated.** `deriveInsuredNames` unioned four keys holding
  one party; a renewal that restated the name listed the old and new spelling as two covered people.

- **GROWTH-HOOKS-01 Track A is live** — hook ticker on `/guides`, three new sourced guides, one
  extended, verified on the production site.
- **Two live consumer-facing errors corrected and deployed.** The uninsured-vehicle guide named the
  wrong authority (ΑΑΔΕ, not Γ.Γ.Π.Σ.Ψ.Δ./Σ.Δ.Ο.Ε.) *and* understated every fine — €150 published
  against €500 in law for a passenger car. Both from ν. 5113/2024, verified verbatim.
- **Phase 4** — design-token debt guard (321 keys, shrink-only, red-proved both directions), 274
  landing literals migrated with before/after computed-style verification across 24 captures,
  MASTER.md's real drift fixed.
- **Phase 5 preconditions** — the two missing §11 metrics built (`duplicateActions`,
  `countConsistency`), counts instrumented, and a **cross-surface** detector that catches a
  contradiction the per-page metric structurally cannot see. Proven red live, not just in jsdom.
- **Phase 6 guard audit** — all 45 guard files read. **Two were green over live defects.**
- **`check-utf8` now refuses C0 control bytes**, and immediately found a corrupted hostname in a
  March governance evidence record.

## Top risks, ranked

1. **H-011 — a document reaches a model provider BEFORE anyone consents.** The agent scan path
   (`parsePolicyPdfWithGemini`, 93 lines, zero consent references) sends the document, and
   `commitScannedPolicy` takes `attestedAiConsent` as a parameter — consent is attested *after* the
   processing. `AddCustomerModal` calls the scan directly from the client, bypassing both wrappers.
   **CLAUDE.md claims this cannot happen "on every path"; that claim is false.** There is a fair
   structural argument (the subject is unknown at scan time — resolving it is the point), but a
   lawful basis is needed when processing happens, not when it is recorded, and no exemption is
   written down anywhere. Three options in `HALTS.md → H-011`; the cheapest is to accept it and fix
   the doc, because a future agent will trust the invariant as written.

2. **The E2E suite has rotted, and it is the only thing that checks journeys.** `money-path.spec.ts`
   — the PAID CONVERSION journey — fails at `#premium-insights`, an element removed on 2026-08-23 in
   `5705289b` (the GOAL 2 restructure). It has been red for four days and nobody knew, because
   **Playwright is not in CI**. This repo's own rule is that the gate checks code and journeys check
   the product; the journey check is currently broken on the path that takes money. Found while
   verifying the new upload UI — the failure is NOT a regression from that work, confirmed by
   dating the removal.

3. **SEC-01 — session objects reached the Vercel runtime logs. LAUNCH RISK, not post-GA debt.**
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

1. ~~`no-raw-euro-money-interpolation` — seven files not yet fixed.~~ **STALE, verified
   2026-08-28: all seven were routed through the formatters, `KNOWN_RAW_EURO_DEBT` is empty and the
   tree is clean of BOTH shapes** — the guard's `€{expr}` / `€${expr}` forms and the suffix shape
   `{expr.toFixed(2)} €` it structurally cannot see (swept separately, 0 matches).
3. Confirm who can read the Vercel runtime logs — team `moniaros' projects` (Pro, no SAML) is the
   access boundary, and its member list could not be enumerated from the tooling here.
2. Re-capture `/protection` once the session pooler recovers; it is the only measurement that
   changes a ceiling.
3. **P5-wallet-01** is unblocked: motor, property, pet and marine carry strong identifiers in
   `acordData`; health, life, travel, cyber, business and pension carry none, which is exactly why
   the duplicate rows measured were health. Rows without an identifier stand alone.
