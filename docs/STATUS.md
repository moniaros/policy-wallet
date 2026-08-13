# PolicyWallet — Project Status

_Living dashboard — not a log. Any session that commits or decides ends by updating this file (agent writes the delta; see CLAUDE.md rule). Keep under one screen — move resolved items to `docs/planning/status-archive.md`._

## Session wrap — 2026-08-13b (Feature flags: the automation console's one missing pillar)

**Current phase:** built and gated on `feat/marketing-site-overhaul`. **The migration is
NOT applied to any environment yet** — see "What is left" below.

**The audit first.** Measured against the automation-console brief, this product already has
almost all of it: business events (`/admin/automation/events`), notification/email/push/in-app
templates with preview + test + clone + version, automation rules, **retry rules** and
**escalation rules** (`NotificationRuleOverride.retry*` / `escalation*`), coverage-gap rules
(`/admin/gaps`), AI rules (`/admin/ai/*`), schedules with pause/resume/run-now, queues,
localization, analytics, notification history, automation logs and delivery failures. Every
verb in the brief except one was already wired.

**Feature flags were the gap — and they already existed, as environment variables.**
`FF_AI_FAILOVER_OPENAI`, `FF_AI_DEGRADED_COMPLETION`, `FF_AI_REMEDIATION_ALERTS`,
`FF_AI_REMEDIATION_CANARY_MODE`, `AI_ALLOW_FULL_FAILOVER`, `ENFORCE_EMAIL_VERIFICATION`,
`EXTRACTION_CITATIONS`, each read straight from `process.env` at the call site. They work.
What they cannot do is change: a flip means editing the Vercel environment and redeploying,
so the one control you reach for while production is misbehaving costs a build.

**What shipped.** `FeatureFlag` + `FeatureFlagRevision` (migration
`20260813210000_feature_flags`, additive, new tables only), `lib/flags/registry.ts` (the
catalog), `lib/flags/config.ts` (the resolver), `lib/admin/flag-admin.ts` (pure form logic),
and `/admin/automation/flags`. Precedence on read is **override → environment variable →
the default declared in code**, so no row, or an unreadable database, leaves the product
behaving exactly as it shipped. `withCache` was extracted from `lib/notifications/config.ts`
to `lib/cache/tagged-cache.ts` so both loaders hold one contract rather than two.

Three rules keep it honest:
1. **A flag must be declared in code next to the call site that reads it.** A row for an
   undeclared key is inert. Operators tune flags; they cannot mint one, because a switch
   wired to nothing looks like control and isn't.
2. **NULL is "fall through", not "off".** Clearing an override restores what the deployment
   says. Collapsing those two is how someone disables a feature believing they undid a change.
3. **`extraction.citations` is listed read-only.** It is read synchronously while building the
   extraction prompt and response schema, so moving it into the database would make prompt
   construction async — a change to the extraction contract on the money path, which does not
   belong in an admin-console change. It is shown so its production value is *visible*
   (it IS set in prod), with the reason stated on the card.

**Wired, not decorative:** `remediation-policy.ts`'s five predicates now read the flag layer
(async; callers in `policy-analysis-orchestrator.service.ts` updated), and
`emailVerificationRequired` too. Checked prod env before touching the latter:
`ENFORCE_EMAIL_VERIFICATION` is **not set in production**, so the switch to a slightly wider
boolean parser cannot flip the gate on and lock unverified customers out.

**Also fixed on the way past:** the automation hub had a card titled "Feature flags &
settings" pointing at `/admin/notifications`, which has no flags — that is what sent someone
looking for a flag to the wrong page. It is now "Notification settings", with the real flags
card beside it.

**Verified.** 4,464 unit tests (426 files) green, +19 new pinning the precedence contract.
Full guardrail gate green: `audit:api-auth` 101/101, `lint`, `lint:i18n-changed`,
`lint:utf8` 1806 files, `type-check`. New E2E `tests/admin-feature-flags.spec.ts`, 6/6 under
`admin-chromium` — and deliberately passing in the **degraded** state, i.e. with the table
absent, which is the window this has to survive.

**Protection score rules are no longer hardcoded.** `lib/events/decision-engine.ts` judged
against literals — `current < 40` for the score band, `severity === "critical"` for gap
routing — so moving where "the lowest band" starts, an editorial judgement about Greek
customers rather than a constant, took a deploy. `EventContext` now carries a
`DecisionThresholds` object fed from the EXISTING `NotificationSetting` registry (which
already had a `thresholds` group and an admin surface), via two new settings:
`threshold.protectionScoreLowBand` (40) and `threshold.advisorTaskOnHighGaps` (off).
`DEFAULT_DECISION_THRESHOLDS` reproduces the old literals exactly, and `toContext` defaults to
them, so an empty, unreadable or unmigrated settings table decides what the engine always
decided. The hub gained a **Protection score rules** card showing the live band and deep-
linking to the anchored group.

The engine is still NOT a rules DSL, deliberately. Only numbers and switches moved; the rules
stay TypeScript, because a rule can say "critical, and only when the customer has an advisor
who can act on it" and a table cannot. One floor is deliberately not tunable: a **critical**
gap always reaches a human regardless of the setting — an operator quietly switching that off
would be a defect, not a preference.

**Dead letters can be revived.** Verifying the brief's action matrix rather than asserting it
turned up a real hole: `/admin/automation/queues` counted dead deliveries and stated they "do
not resolve on their own", then offered nothing — a diagnosis with no treatment. A delivery is
parked after 5 attempts with `nextAttemptAt` null, and the sweep only selects
`attempts < MAX_ATTEMPTS`, so it stays parked for ever; behind each row is a notification never
sent or an advisor task never raised for a critical gap. The page now lists them with event,
subscriber, attempts and the killing error, and a per-row Retry. `lastError` is kept on revive
(it is the most useful thing on the row until the retry succeeds) and the action refuses
anything not already dead, so a live delivery cannot be handed a fresh five tries against a
subscriber that is currently failing.

`lib/admin/flag-admin.ts` shipped untested in the flags commit; now 14 cases. Writing them
found a wording defect that would have appeared in every audit log entry ("Set Remediation
audience audience to 50").

**Still open, found in the same pass:** `aiPromptOverrideRevision` and `planRevision` are
written but read by no page, so "Version" is recorded and invisible for AI Rules and Plans —
unlike templates, rules and flags, which all render their history.

**What is left — needs a decision, not more work:**
1. **The migration is unapplied**, on dev and prod both. Applying it was blocked here (both
   the raw-DDL script and Supabase MCP `apply_migration` were refused by the permission
   classifier). Until it runs, the flags console renders read-only with a banner saying
   exactly that, and every flag resolves through the environment as it does today. Both new
   DB reads degrade rather than throw, so **code and migration can land in either order** —
   there is no deploy-ordering trap. Note the threshold work above needs NO migration:
   `NotificationSetting` already exists.
2. **Not merged to `NEW-UI`**, which is what deploys production on CI-green.

**Next 3 actions:** 1) apply `20260813210000_feature_flags` to dev, then prod (Supabase MCP
`apply_migration` + a manual `_prisma_migrations` row — the Prisma migrate CLI cannot reach
this database); 2) merge to `NEW-UI` when ready, checking first which branch/sha the live
deploy is on, since parallel sessions share this prod alias; 3) next candidates for the same
treatment: the dunning ladder's attempt counts and the renewal-window day counts, both still
literals in the decision engine.
**Last updated:** 2026-08-13

---

## Session wrap — 2026-08-13 (E2E audit re-anchored; all three role sessions verified green)

**Current phase:** `feat/marketing-site-overhaul`, three commits (`11610540`, `f53c2978`,
`b58b82cc`) — **not pushed**. `ui-quality-audit` now runs per session against measured
coverage floors instead of one 75%-of-all-routes fraction, which used to fail on branches
that changed nothing.

**Verified green today, full sweeps on current HEAD:**

| session | routes fully scanned | redirected | overflow / touch / a11y / runtime | verdict |
|---|---|---|---|---|
| `chromium` (policyholder) | 71/94 (floor 71) | 23 | 0 / 0 / 0 / 0 | ✅ 15.2m |
| `agent-chromium` | 79/94 (floor 79) | 15 | 0 / 0 / 0 / 0 | ✅ 17.2m |
| `admin-chromium` | 95/108 (floor 95) | 13 | 0 / 0 / 0 / 0 | ✅ 18.6m |

**All three sessions green — the first time every role's surface has passed on one HEAD.**
Route accounting closes in all three (71+23=94, 79+15=94, 95+13=108) — no route left a sweep
silently. Each landed exactly on its floor, which is what the floors were measured from.
Baseline before `b58b82cc`: agent 10 touch + 18 a11y + 5 runtime; admin 46 touch (26
distinct) + 18 a11y + 1 runtime; chromium's own run never finished (see below).

**The admin-console "touch target" findings were never defects.**
`/admin/billing-reconciliation` (9–13×24), `/admin/insurers` (16×24) and `/admin/partners`
(11×24) are all `<input type="checkbox">` inside a `<label class="flex items-center gap-2">`
that wraps the text as well — clicking anywhere in the row toggles them, so the row IS the
target. The label rule added in `b58b82cc` exempts them correctly.

**The 75-minute budget was the fix it looked like.** The policyholder sweep had never
finished: its 14:45 run hit the then-45-minute budget at route 80 and named 14 routes as
never loaded (61/94 scanned), which is what prompted the raise in `b58b82cc`. Re-run tonight
on the raised budget it completed in **15.2 minutes** and reached all 71 — including the
alphabetical tail it had been dying in (`/product/pension` … `/wallet/add`, of which
`/wallet`, `/tasks`, `/renewals`, `/questionnaires`, `/upgrade` are role-dependent and so
had never been audited as a policyholder sees them). The 45→75 change bought headroom that a
warm `.next/dev` cache then made unnecessary; keep it anyway, since a genuinely cold sweep is
the case it exists for.

**`P1017` is the flake to expect here.** The agent sweep's earlier
`PrismaClientKnownRequestError` on `/dashboard/agent` (`getRecentNotifications` →
`getAuthenticatedUserOrNull`) is the remote dev DB closing an idle connection during a
30-minute sweep; it did not recur today. A red agent run on that line alone is the
environment, not the page.

**Next 3 actions:** 1) run the CI guardrails (`audit:api-auth`, `lint`, `lint:i18n-changed`,
`lint:utf8`, `type-check`, unit tests, build) and push the three commits; 2) the E2E audit is
now only meaningful as all four projects together — `--project=chromium --project=agent-chromium
--project=admin-chromium --project=sentry`, ~50 min warm; treat a single-project green as
partial; 3) unchanged from below — the seeded prod accounts still need deleting.
**Last updated:** 2026-08-13

---

## Session wrap — 2026-08-12 (Settings rebuilt: sub-routes, honest controls, one preference surface)

**Current phase:** built and gated locally on `feat/protection-intelligence-dashboard`;
**not committed, not pushed.** 4,390 unit tests, full guardrail gate and production build
green. Zero axe violations across all six settings routes at 375px and 1440px; zero
horizontal overflow at 320/375/390/430/768/1024/1440.

**What changed.** `/account` went from one route with three React-state tabs to a settings
shell with five real sub-routes (`/profile`, `/plan`, `/security`, `/notifications`,
`/privacy`), each with its own loading and error boundary and a focused loader in
`app/(protected)/account/data.ts`. Desktop gets a persistent rail with per-section
descriptions; mobile gets index → detail with a back header, switched in CSS. `/agent/settings`
renders in the same shell, so an advisor sees one settings IA. Legacy `?tab=` links redirect
(`lib/settings/sections.ts`), and the email footer now points straight at
`/account/notifications`. New shared primitives: `ui/form/Switch`, `settings/SettingsShell`,
`SettingsNav`, `SettingsSection`, `SettingRow`, `InlineEditRow` (idle→editing→saving→saved→
error, inline not toast).

**The honesty pass — controls removed because nothing backed them.** `ActiveSession` is
written **only in `prisma/seed.ts`**, so the "active sessions" list was always empty and
"sign out everywhere" deleted nothing and revoked no Supabase session; it now calls
`signOut({scope:'others'|'global'})`, which is real. The audit trail hardcoded device
"System", location "Unknown" and `success: true`, and had no label for `login_success` —
**the only login event anything writes** — so every sign-in printed the raw key to the user.
`Invoice` and `PaymentMethod` are written nowhere outside the seed (the invoice table and
saved-card panel could never fill); billing now points at the Stripe portal, where they
genuinely live. Also removed: always-zero wallet credits, the always-empty `usageMetrics`
block, a "Download report" button with no handler, an unrendered phone-edit state, and a
`mobileProps` prop costing two DB queries plus a full policy mapping that no component read.

**New capability wired to existing backends.** Change password (the `updatePassword` action
had worked with no UI for months — now behind a current-password re-auth and a rate limit),
phone editing, and consent history from `ConsentAudit`, which has recorded every acceptance
since launch and had never been shown to the person who gave it.

**Notification preferences consolidated.** `/notifications` shipped a second, contradicting
preferences UI whose catalog listed `pending_questionnaire` and `policy_reviewed` (no sender
reads either) and exposed `renewal_milestone` standalone while the settings group governs it —
so a stream switched off in one screen could be half-revived in the other. It now owns history
only; the sender registry is the single catalog.

**Latent CSS bugs fixed on the way past:** `.pw-btn` is not defined in `globals.css`, so the
quiet-hours and push buttons **inside Settings** rendered with no fill or radius
(`RiskReviewCard` too); `arc-text`/`arc-text-muted` were deleted from the stylesheet but still
used in `TokenUsageCard`, flattening its hierarchy.

**Open — owner decisions, not blockers:** email change still takes effect with no verification
(`email_confirm: true`); the UI now states the consequence and confirms, per decision, but auth
is unchanged. `wallet/[id]` still advertises a "free full analysis" that no code grants
(`aiAnalysisPerMonth: 0` on free/plus, `FREE_LIFETIME_QUESTIONS = 0`) — not surfaced in
Settings, worth fixing at the source.

---

## Session wrap — 2026-08-11 (Protection-intelligence redesign: dashboard, policy brief, renewal outlook)

**Current phase:** ✅ **SHIPPED.** Merged as `71b943f2` (PR #271, squash — carries
`ac829bde`'s content, which had separately merged as #270/`954597ca`, so the trees were
identical) and **deployed to production 2026-08-11 ~16:45 UTC**; site verified healthy.
First CI run on the merge failed on the KNOWN flake (`batch-upload-modal › attaches each
file to the policy that file became` — #269's suite; fails under full-suite CPU
contention, passes alone and on rerun) which also skipped the first deploy; rerun went
green and deployed. 4,344 unit tests, full guardrail gate, production build all green.
Local Playwright: 20/22 passed; the 2 `theme-state-cascade` failures are a PRE-EXISTING
audit-harness false pairing on the homepage chips (audit combines a declared state's bg
with the unchecked fg; real rendered state is white-on-green ~5.8:1) — documented on PR
#271 and in the browser-measurement-traps memory; that spec fails on `/` on every branch
until fixed.

**What shipped.** The policyholder dashboard rebuilt around protection intelligence, all
from existing unsurfaced data: `ProtectionStatusHero` (score + delta from
`RiskProfileVersion` history + biggest factor + honest empty/provisional/indeterminate
states), `AttentionList` (risk → why → next step from recommendation `personalReason`/
`timing`), `ProtectionPlanCard` (persistent X-of-Y from recorded facts; absorbs the
localStorage checklist), `ProtectionMonitorCard` (the `monitorRisk()` watch, surfaced at
last — pro-gated via new `protection_monitoring` gate backed by `advancedAnalytics`;
free tier gets a future-tense capability card), life-event prompt (anchors
`/coverage-insights#life-events`). Policy page gained the seven-row `PolicyBriefCard`
(covered / not covered / exclusions / limits / overlaps / gaps / renewal — every line
carries its evidence boundary; overlap attribution shares `insuredSubject` with the
engine) and `RenewalOutlookCard` (`#renewal`, facts-only checklist, tier-truthful
reminder promise from the shared milestones module). Dashboard renewal rows deep-link
`#renewal` with the SAME checklist count.

**Deliberately not claimed:** premium change at renewal (renewalHistory stores no
premium), coverage-change diffs (analysisComparison endpoint has no UI), monitor "daily"
cadence (cron only refreshes existing score rows).

**⚠ Environment finding (pre-existing, NOT fixed here):** `.env.local` line 9 sets
`POOLED_DATABASE_URL` to the **PRODUCTION** pooler (`cquudefwfwrmvpftuhyl`), and
`lib/db.ts` prefers it — local dev has been reading/writing PROD data while auth talks
to the dev project (this also made every login bounce-loop: auth user exists, prod
`users` row doesn't). Line 16 additionally re-defines `DIRECT_URL="https://policywallet.gr"`
(bogus). Verified by pointing the app at the dev DB (both vars neutralized) — everything
works. **Owner decision needed: remove/replace both lines.** Two anonymous cookie-consent
POSTs from this session may have written rows to prod.

**Follow-ups, all three closed same day (owner said "proceed"):**
1. **`.env.local` FIXED** — lines 9 (prod `POOLED_DATABASE_URL`) and 16 (bogus
   `DIRECT_URL="https://policywallet.gr"`) commented out with evidence notes; backup at
   `.env.local.bak-20260811`. Verified via `@next/env` that the app now resolves the dev
   project with no shell overrides.
2. **Batch-upload flake root-caused and fixed** — NOT contention: the save-all button
   renders only when a row is READY and stays disabled while extracting; six tests
   clicked right after the ROWS rendered. All clicks now go through a wait-for-enabled
   helper. PR #272 (`fix/deflake-batch-upload-save-all`), suite 11/11 consecutive runs.
3. **Stale-recommendation + delta mechanics verified on dev** — an engine re-run
   auto-dismissed `no_agent_connected`/`no_health` (syncStats dismissed: 2) and wrote
   RiskProfileVersion v1. Bonus: the new score (90, but 21/22 risks undecided) rendered
   the hero's INDETERMINATE state live — "we don't know enough" instead of the number,
   exactly as designed. The delta chip appears once a v2 exists (derivation unit-tested).

**Top risks ranked:** 1) working tree still carries another session's uncommitted work
(auth pages, instrumentation-client, landing/guides content, gap-report + tests) — do
not sweep it into commits; 2) `theme-state-cascade` audit false-pairs declared-state
colors and fails on `/` on every branch until fixed (documented, PR #271 comment);
3) two anonymous cookie-consent rows may have been written to prod by the mispointed
local dev before the env fix.

**Next 3 actions:** 1) ~~merge PR #272~~ — merged as `3baf929e`; 2) ~~fix the
state-cascade audit~~ — merged as `194c9b2c` (PR #273): rules joined per (element,
state signature) + var()-token resolution via scope-correct probe; proven red-green
against the live homepage, full crawl 116/116 pages green in both themes; 3) delete
`.env.local.bak-20260811` once the owner confirms the env cleanup.
**Last updated:** 2026-08-11

## Current phase
Late pre-GA staging → **Greece GA** (`docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md`). Active workstream: **mobile-first responsive refactor** (Step 0 investigation → shared primitives → page-by-page: B2C wallet → dashboard → policy → analysis → B2B dashboard). Branch: `NEW-UI`.

## GO checklist (prod flip is last, always)
1. Delete + rotate **seeded test accounts** (`ph1@` / `agent1@` / `mixed@example.com`) — known default password, **live in prod DB now**
2. Confirm prod env on preview deploy: storage curl, Stripe test checkout, Sentry live event
3. DPO sign-off — privacy wording, badge accuracy, Greek-language terms
4. Underwriter sign-off — CoverageEnvelope severities (placeholders until then; **never surface as authoritative in any UI**)
5. Flip prod

## Waiting on humans (long-lead — start now; not agent-fixable)
- Underwriter validation of CoverageEnvelope severities
- DPO: named legal entity + AFM, processor list, retention periods, cookie table, Greek `/terms` `/privacy`
- Legal: **Art. 9 lawful basis** for agent→customer add-policy (flow stays blocked until decided)

## Top launch risks (ranked — GA-gating only)
1. **High — public site false claims** (audit §A): "500+ policyholders", "10.000+ / 98%", fabricated named testimonials. Unfair-commercial-practices exposure; pure copy fix, zero engineering dependency.
2. **High — AI-processing consent gate (Art. 9)**: design ready (`docs/audits/ai-advice-compliance.md`); needs Prisma migration (`ai_processing` ConsentType + `User.aiProcessingConsentVersion`) + gate at `orchestrator.createRun()`.
3. **High — seeded accounts in prod** (= GO #1; 5-minute human action).
4. **High — auth gaps**: no production passkey/biometric verification; 30-day session persistence untested.
5. **Medium — Privacy page over-claims**: "GDPR export/deletion workflows available" — DSR executors unconfirmed. Ship or soften wording.

## Post-GA debt (tracked, not gating)
- Scope gaps: `analysis-runs/[runId]` grant not `policy:<id>`-scoped; `createUserTask` / `submitQuestionnaireResponse` ownership checks; user-callable `jobs/process-policy` (has owner gate — question is whether it should be cron/admin-only).
- Site consolidation (audit §E): homepage↔`/product` overlap, 7× category duplication.
- Motor broker-demo gaps (`docs/demo/motor-demo-path.md`).

## In progress
- Responsive refactor Step 0 (written report before any code changes)
- Public-surface cleanup per audit punch-list order (§A copy → §B inconsistencies → §C/§D legal EL)
- Phase 1 login hardening

## Decisions (settled — don't re-litigate)
- Revolut integration **deferred**: no API path; `bundledCover` self-declaration designed, `policySource` data model reserved.
- RevenueCat **out of scope** (web-Stripe product).
- Responsive/i18n/gap-dedup/severity-gating fixes go in **shared primitives, never per-page**.
- Greek strings run ~20–30% longer than EN — handled in primitives layer.

## Next 3 actions
1. **Today, human, 5 min:** delete + rotate seeded accounts in prod DB.
2. Pull §A false claims + testimonials from the live site; fix §B cheap inconsistencies (free-tier 2→3 in `/product` FAQ, one email domain, placeholder phone, `0/0/0` stat band).
3. Run the responsive Step 0 investigation prompt; paste report back for assessment before Step 1.