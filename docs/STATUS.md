# PolicyWallet — Project Status

_Living dashboard — not a log. Updated at the end of each session with meaningful work. Keep it under one screen._

**Last updated:** 2026-07-24 — insurance-panel audit continues on `claude/ui-foundation-audit-gtm05i` (194 commits, **NOT merged, NOT deployed**). History moved to [status-archive-2026-07.md](status-archive-2026-07.md): this file had reached 207 KB because each session prepended another `Previously:` clause instead of replacing the current picture — eleven of them, 15 KB in the header line alone.

## Current phase

**Production is live** at policywallet.gr. `NEW-UI` is at `65183b7`; the last deploy this doc recorded was `97f908b`, so **`65183b7` (protection score ignored held policies) may not be deployed — verify before assuming prod matches `NEW-UI`.**

Everything since sits on **`claude/ui-foundation-audit-gtm05i`** — a continuous insurance-correctness audit, 194 commits, 559 files, unmerged and undeployed pending review. All guardrails + 2046 unit tests (225 files) + prod build green at every commit; Playwright not yet re-run against the branch.

⚠️ **Branch-name correction.** `fix/coverage-insights-verdict` is a **stale pointer**: it sits at `65183b7`, identical to `NEW-UI`, zero commits ahead, and is fully contained in this branch. Many commit messages on this branch name it as their branch — that attribution is wrong; no work is lost or stranded, it is all on `claude/ui-foundation-audit-gtm05i`. Delete the stale pointer to stop it misleading the next session.

## Done — this branch (newest first)

- **The coverage panel rendered nothing for motor, home and life policies** (`525f623`). `acord-data.ts` carries two names per branch — canonical `vehicle`/`property`/`lifeAndInvestment` and a `motor`/`home`/`life` block the schema itself labels legacy aliases. Nothing maps between them, extraction stores the canonical shape, and all three panels read the alias. The reader lost the motor coverage tier, the accident-declaration line, the green-card expiry, named drivers, the home sum insured and peril grid, and life fund/surrender values. Two more on the same surface: the section lookup omitted `lifeAndInvestment`, so an analysed life policy was told to re-run metered AI; and both the lookup and the tab dispatcher keyed on the raw line of business, so motorbike/truck/renters/income-protection/disability/personal-accident got no panel and no explanation.
- **Green Card dates silently re-ordered; every tier labelled "comprehensive"** (`6303b10`). `new Date("03-01-2027")` returns **1 March**, not 3 January — V8 reads bare numeric dates month-first — so a card was shown valid two months past expiry. A Greek month name gave an Invalid Date, and `Intl` throws on those inside a client render, taking the page down. The tier printed the raw English enum, and the row's glossary hint was the definition of *comprehensive* whatever the tier — a third-party policy explaining cover its holder does not have. `parsePolicyDate` already existed; four panels ignored it, three of them on waiting-period end dates.
- **Life investment figures shown without disclosure; home's insured subject in English** (`5675d1a`). `ytdGrowth` rendered as a green +4.20% with no past-performance statement; `taxFreeAtMaturity` as a settled «Αφορολόγητο» verdict on someone's tax position; the guaranteed/unit-linked bar painted the at-risk share neutral and the guaranteed share affirmative. `contentsVsStructure` printed verbatim — the field deciding whether a burglary or burst pipe is paid at all.
- **An iPhone photo was uploaded, then dropped or sent to the AI as a PDF** (`679f568`). Five places classified documents by extension with hand-written lists, each listing formats the server rejects and omitting HEIC, which it accepts. A single HEIC upload committed a policy with no documents; both AI paths declared it `application/pdf`. Partly self-inflicted — enabling HEIC in the pickers earlier on this branch is what made the path reachable.
- **Earlier on this branch:** gap-engine and scoring integrity (an insured motorbike told at CRITICAL severity it was uninsured; a two-car household advised to drop compulsory cover; the low-limit rule reading the premium; ENFIA described as an insurance requirement in six places including two AI prompts); the Art. 15 export omitting every Art. 9 health field; the Q&A prompt casting the model as a licensed adviser; unsubscribe switches writing keys no sender read; SMS sold as a Premium channel that does not exist; five renamed score labels settled to three. Full detail in the archive.

## In progress

Continuous audit, surface by surface, priority order **insurance correctness → customer trust → professional credibility → clarity → consistency**. Each newly-opened surface is still yielding material findings, so this is not near saturation.

## Blocked / user-gated

- **Merge + deploy of `claude/ui-foundation-audit-gtm05i`** — needs owner authorisation. 194 commits is a large review surface; consider splitting by theme.
- **Owner decisions, deferred:** Plus at €7.99 vs €9.99 (`lib/subscription-copy.ts` and `tests/money-path.spec.ts:251` still assert €7.99); whether `FREE_LIFETIME_QUESTIONS` stays 0; whether extraction review stays agent-only (self-serve users' `reviewState` never leaves `unconfirmed`); whether `duplicate_coverage_detection` should be gated.
- **Brevo IP allowlist (POLICYWALLET-3):** Brevo rejects sends with 401 "unrecognised IP" — Vercel egress IPs rotate. Disable authorised-IPs at https://app.brevo.com/security/authorised_ips. Not fixable in code.
- **Housekeeping:** rotate Brevo API key, both Supabase DB passwords and the `sk_test` key (all transited chat); Supabase outstanding-invoices banner; old dev project `lzqvtvjggylcujenlelh` idle — keep or pause.

## Top risks (ranked)

1. **High — 194 unmerged commits.** The longer this branch runs, the larger the divergence from `NEW-UI` and the harder the review. Prod has none of these insurance-correctness fixes.
2. **Medium — Playwright not re-run on this branch.** E2E is not in CI. Use the IPv4 pooler (`aws-1-eu-west-3.pooler.supabase.com:5432`, `connection_limit=2`) and `--workers=3`; the dev `db.*` host is IPv6-only and this machine has no global IPv6.
3. **Medium — governance HOLD:** legal/DPO/product + UAT + SRE-restore sign-offs pending; `ENFORCE_EMAIL_VERIFICATION=1` still off.
4. **Medium — scale:** QStash queue active in prod since 22 Jul; still needs a real-upload round-trip proof and a k6 run. Pooler `pool_size 15` is the next ceiling.
5. **Low — TEST-mode billing:** live keys, live webhook + secret and a catalog re-run are required before charging real cards.
6. **Low — `Policy.endDate` is untrustworthy**, so lifecycle filters cannot live in SQL and `isPremiumBearing` filters full rows in memory. Durable fix: backfill `endDate` from the extracted envelope. Related: `Policy.status` has no enum and ~7 values in the wild.

## Next 3 actions

1. **Get this branch reviewed and merged.** Propose splitting into themed PRs (gap engine / compliance & GDPR / policy presentation / uploads & documents) so the diff is reviewable, then deploy and re-verify against prod data.
2. **Run Playwright against the branch** — `npx playwright test --project=chromium --project=agent-chromium` plus `RUN_UX_AUDIT=1`, using the pooler connection above. The coverage panels changed shape for five branches; the policy page is the highest-traffic authenticated screen.
3. **Continue the audit** on surfaces not yet opened — claims workflows, batch operations, billing beyond cancellation, permissions matrices, error boundaries — same priority order.
