# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._

**Last updated:** 2026-07-25 — insurance-correctness audit continues on `claude/ui-foundation-audit-gtm05i` (228 commits, **NOT merged, NOT deployed**). Older detail in [status-archive-2026-07.md](status-archive-2026-07.md).

## Current phase

**Production is live** at policywallet.gr. `NEW-UI` is at `65183b7`; the last deploy this doc recorded was `97f908b`, so **`65183b7` may not be deployed — verify before assuming prod matches `NEW-UI`.**

Everything since sits on **`claude/ui-foundation-audit-gtm05i`** — a continuous insurance-correctness audit, 228 commits, unmerged and undeployed pending review. All guardrails + 2199 unit tests (247 files) + prod build green at every commit; Playwright not yet re-run against the branch.

⚠️ **Branch-name correction.** `fix/coverage-insights-verdict` is a **stale pointer** at `65183b7` (= `NEW-UI`); commit messages on this branch that name it are misattributed — all work is on `claude/ui-foundation-audit-gtm05i`. Delete the stale pointer.

## Done — this branch (newest first, grouped)

- **Two defect CLASSES traced to ground and pinned so they can't recur:**
    - *branchFamilyId child-branch matching* — a motorbike/truck/renters/income-protection policy treated as the wrong (or a missing) branch. Fixed across gap engine, protection score, taxonomy, coverage panels, and cross-sell (which was pitching a motorbike owner motor insurance). Swept every raw `lineOfBusiness` comparison; no live instance left. Emitter-side guard pins the coverage matrix to parent branches.
    - *extracted-but-unrendered coverage amounts* — a schema field + i18n label added, panel row forgotten. Six instances fixed (health annual limit / room&board / out-of-pocket; life **death benefit**; motor excess + market value; home rebuild cost; pet annual limit read the legacy alias only). A completeness guard now reads the Zod schema and fails if any amount field is unrendered.
- **Gap/score recompute wired on every policy-data mutation** — the derived gaps + protection score are now rebuilt (for the OWNER, not the editor) after: extraction-review confirm, direct edit, delete, admin edit/delete, merge, batch upload, and onboarding basic extraction. Before, a correction, delete, merge or bulk upload left the customer's gaps and score computed from stale data — most starkly, a new free user's FIRST policy computed no score at all.
- **Renewal-path correctness** — a policy uploaded near expiry emailed the customer five days running (backlog drained one milestone/day); a policy stored `expiring_soon`/`action_needed`/`incomplete` got NO reminder at all because three queries filtered `status: "active"` (now one shared `NON_LIVE_POLICY_STATUSES`); the churn win-back under-counted the same way.
- **Free-tier gap paywall hid the most critical gap** — the €3 lock boundary fell on coverage-area/alphabetical order, not severity, so an uninsured compulsory line could be the one behind the paywall while trivia showed free. Now severity-ranked on both surfaces.
- **A GATED analysis run was reported as a failed one** — a `blocked` run (deep AI analysis is a Plus feature, or the owner has not granted AI-processing consent; persisted with `status: "blocked"` + a `blockedReason`) folded into the coverage-absence "failed" state on reload, telling the reader the analysis broke and to re-analyse or upload a clearer copy — wrong three ways (it did not fail, retrying reproduces the block, the document is fine). `blocked` now has its own state, split on `blockedReason` (consent → grant consent; else → upgrade to Plus), pointing at the real unlock. The whole state+copy decision is extracted into pure `resolveCoverageAbsence` / `resolveCoverageAbsenceCopy` and pinned by a mutation-tested guard.
- **Also:** the "call your insurer" claims button never rendered on any policy (read a schema-less field); beneficiaries listed as people the policy covers; the dashboard premium total added foreign currencies and hid excluded policies; the root 404 was English-only; notable conditions rendered in raw order (a claim deadline below a no-claims bonus). Plus the earlier gap-engine, GDPR-export, Q&A-prompt, upload-format and outbound-email work — see archive.
- **A near-miss worth keeping:** I misread `premiumAmount` (it is the TERM total, not per-period) and nearly shipped a 12× "annualiser"; caught by the lateral sweep, reverted, and pinned with a contract test.

## In progress

Continuous audit, priority order **insurance correctness → customer trust → professional credibility → clarity → consistency**. The recurring root causes that were generating findings on every opened surface (untrustworthy `Policy.status`, raw child-branch matching, schema/label/render drift) are now closed or pinned. Highest-severity correctness defects on the surfaces opened so far are behind us; remaining work on those is more modest polish. Broad surfaces remain unopened (see below).

## Blocked / user-gated

- **Merge + deploy of `claude/ui-foundation-audit-gtm05i`** — needs owner authorisation. 226 commits is a large review surface; consider splitting by theme.
- **Owner decisions, deferred:** Plus at €7.99 vs €9.99 (`lib/subscription-copy.ts` and `tests/money-path.spec.ts:251` still assert €7.99); whether `FREE_LIFETIME_QUESTIONS` stays 0; whether extraction review stays agent-only (self-serve users' `reviewState` never leaves `unconfirmed`); whether `duplicate_coverage_detection` should be gated.
- **Brevo IP allowlist (POLICYWALLET-3):** Brevo rejects sends with 401 "unrecognised IP" — Vercel egress IPs rotate. Disable authorised-IPs at https://app.brevo.com/security/authorised_ips. Not fixable in code.
- **Housekeeping:** rotate Brevo API key, both Supabase DB passwords and the `sk_test` key (all transited chat); Supabase outstanding-invoices banner; old dev project `lzqvtvjggylcujenlelh` idle — keep or pause.

## Top risks (ranked)

1. **High — 226 unmerged commits.** The longer this branch runs, the larger the divergence from `NEW-UI` and the harder the review. Prod has none of these insurance-correctness fixes. This is now the single highest-value action, above any further finding.
2. **Medium — Playwright not re-run on this branch.** E2E is not in CI. Use the IPv4 pooler (`aws-1-eu-west-3.pooler.supabase.com:5432`, `connection_limit=2`) and `--workers=3`; the dev `db.*` host is IPv6-only and this machine has no global IPv6.
3. **Medium — governance HOLD:** legal/DPO/product + UAT + SRE-restore sign-offs pending; `ENFORCE_EMAIL_VERIFICATION=1` still off.
4. **Medium — scale:** QStash queue active in prod since 22 Jul; still needs a real-upload round-trip proof and a k6 run. Pooler `pool_size 15` is the next ceiling.
5. **Low — TEST-mode billing:** live keys, live webhook + secret and a catalog re-run are required before charging real cards.
6. **Low — `Policy.endDate` / `Policy.status` are untrustworthy** (no enum, ~7 values, never recomputed). Symptoms patched query-by-query this session (premium totals, active counts, three renewal queries → `NON_LIVE_POLICY_STATUSES`). **Durable fix, recommended to the owner: a `Policy.status` enum + a lifecycle that maintains it, and backfill `endDate` from the extracted envelope.** Until then the shared status filter is the guard.
7. **Low — recommendation↔product matching** keys a rec's raw lob to a catalog product's lob; whether to normalise to branch family depends on the catalog's (unestablished, empty) lob convention. Left for an owner decision, not guessed.

## Next 3 actions

1. **Get this branch reviewed and merged.** Propose splitting into themed PRs (gap engine / compliance & GDPR / policy presentation / uploads & documents) so the diff is reviewable, then deploy and re-verify against prod data.
2. **Run Playwright against the branch** — `npx playwright test --project=chromium --project=agent-chromium` plus `RUN_UX_AUDIT=1`, using the pooler connection above. The coverage panels changed shape for five branches; the policy page is the highest-traffic authenticated screen.
3. **Continue the audit** on surfaces not yet opened. Covered since the last STATUS and found SOUND (guards added where missing): team/tenant permissions matrix (no escalation, tenant-isolated), notification-preference UI (registry-driven), risk-profile wizard (Art. 9 notice + bounds), agent commission (child-branch-aware), claims guidance content. Still unopened: billing beyond cancellation, customer-acquisition/signup, full mobile-viewport responsiveness, portfolio analytics. Newly-opened surfaces now yield mostly polish or confirm-sound — the high-severity correctness defects are behind us and the three recurring root causes (Policy.status, child-branch matching, schema/label/render drift) are guarded.
