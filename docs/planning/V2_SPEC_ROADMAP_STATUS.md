# PolicyWallet — Spec v2.0 Readiness Status (2026-09-24)

**Status of record.** The 2026-09-23 audit measured **≈ 62 %** readiness against
`docs/design/PRODUCT_SPEC_V2.md` and laid out seven phases. All seven shipped between
2026-09-23 and 2026-09-24 (PRs #364–#373, every one deployed to production and smoked).
Measured the same way, readiness is now **≈ 83 %**. The remainder is not unfinished work: it is
(a) spec items the repo has decided against, (b) checks that need reference data nobody has
sourced, and (c) owner-side configuration. Each is named below so it can be picked up or closed.

Per CLAUDE.md, findings stay split: **broken / insecure (gates launch)** — all fixed in Phase 0 —
vs **spec parity / UX (does not)**.

---

## 1. Readiness matrix (re-scored 2026-09-24)

Percentages are re-scored against the 2026-09-23 baseline on the same scale. «Evidence» names
the code that exists now; the 2026-09-23 column is kept so the movement is auditable.

### 1. Core B2C workflows (policyholder)

| # | Capability | 09-23 | Now | Evidence now |
|---|---|---|---|---|
| 1.1 | Policy upload & ingestion | 85 | 90 | One ingest path (`lib/ingestion/ingest-policy-document.ts`); wizard file step with `capture="environment"`. Direct-to-storage upload is a recorded decision against (§23.1). |
| 1.2 | Async extraction: QStash | 60 | 80 | Queue + `failureCallback` → `jobs/analysis-failed` marks the run failed (Phase 0.5). First-pass summary still inline in `after()` by design. |
| 1.3 | Async extraction: status & polling | 50 | 80 | `usePolling` backs off and stops at 5 min with copy; `AnalysisCard` uses it; failed runs surface a retry. Progress stays in Postgres run steps (decision against Redis key). |
| 1.4 | Vercel AI SDK integration | 95 | 95 | unchanged |
| 1.5 | `AcordDataSchema` | 90 | 95 | `professionalLiability` block + field inventory (Phase 2.1). |
| 1.6 | Quick-view cards per type (§6) | 35 | 80 | One resolver `lib/wallet/quick-facts.ts` → chip row on `PolicyCard` (fact `policy.quickFact`), never from silence. Not five card components — by design. |
| 1.7 | Detailed coverage views (§7) | 75 | 75 | Tabs stay stacked (CoverageTabView rationale). Network lists / fund charts need data the extraction does not state. |
| 1.8 | My Wallet list (§10.1) | 50 | 85 | Grouping, sort, insurer filter, `Policy.nickname`, family rows. |
| 1.9 | Upload flow 5 steps (§10.2) | 35 | 85 | Tiles → file/camera → stepped reading state → extracted-fields check + edit → analyse/share CTAs. |
| 1.10 | Detail utilities (§10.3, §15) | 20 | 85 | `PolicyNote` (private, per viewer), compare-with-previous card, printable portfolio report, printable/shareable digital card (Phase 7). PDF/PNG renders not built (see §3). |
| 1.11 | Gap engine rules (§8) | 60 | 70 | 55 authored rules, fingerprint `33a0731577205d72` dev = prod. Benchmark rules wait for dated reference data (§3). |
| 1.12 | Savings / duplicates / recommendations (§11) | 70 | 70 | unchanged; new insight kinds wait for the same reference data. |
| 1.13 | Health & Wellness (§9) | 5 | 80 | `/wellness`: check-up tracker, consented self-assessment (fixed scoring table), preventive calendar; DSR-wired. |
| 1.14 | Home dashboard elements (§5.1) | 50 | 60 | Check-up nudge added. Donut, FAB, insight card, savings badge, chat are recorded decisions against (§3). |
| 1.15 | Bottom navigation (§5.2) | 80 | 80 | unchanged |

### 2. B2B2C / agent connectivity

| # | Capability | 09-23 | Now | Evidence now |
|---|---|---|---|---|
| 2.1 | Multi-tenant models | 95 | 95 | App-level grant dedupe in `sharePolicy`; no DB partial-unique index yet. |
| 2.2 | Authorization single path | 95 | 95 | + family membership arm in `computePolicyAccess`. |
| 2.3 | Agent portal | 90 | 90 | unchanged |
| 2.4 | «My Agent» + granular sharing (§12) | 55 | 75 | `/agent` reads live relationships and lists all advisors; per-policy private toggle (family scope). Per-advisor per-policy toggle not built. |
| 2.5 | Agent actions → customer notification (§12.3) | 45 | 85 | `agent_document_added` + «added by advisor» badge. |
| 2.6 | Family sharing (§13) | 0 | 80 | `WalletMembership` + `privateToOwner`; invite, remove/leave, mirrored notifications, DSR. Dashboard counts own-only by decision. |
| 2.7 | Role-based UI (§19.2) | 80 | 95 | Proxy gates on `app_metadata.roles` + active-role cookie. |

### 3. Infrastructure & data contracts

| # | Capability | 09-23 | Now | Evidence now |
|---|---|---|---|---|
| 3.1 | Supabase Auth role checks | 60 | 85 | Server-written `app_metadata.roles`, synced with `user_metadata.role`. NextAuth leftovers (`Account/Session/VerificationToken` models) remain. |
| 3.2 | Passkeys (§19.1) | 30 | 80 | Passkey sign-in, identifier-first, session via `generateLink(magiclink)` → `verifyOtp`. **`PASSKEYS_ENABLED` still OFF in prod** (owner soak). |
| 3.3 | RevenueCat sync (§21.1) | 40 | 85 | Rows keyed per subscriber; `premium` → `ph-pro`; env key declared. Dormant until a mobile app exists. |
| 3.4 | Stripe checkout + gating (§21) | 85 | 90 | + post-checkout activation polling. Prod still on TEST keys (owner). |
| 3.5 | NotificationEvent types (§22.3) | 60 | 85 | + day-3 rung, `green_card_expiry`, `enfia_season`, `agent_document_added`, `benefit_reminder`, family events. |
| 3.6 | Cron scheduling | 85 | 85 | + `enfia-season`, `checkup-reminder` crons. |
| 3.7 | Web Push / PWA (§18) | 65 | 85 | Push opt-in in onboarding (iOS install-first); `/offline` + offline card cached by the worker (exactly two entries). |
| 3.8 | GDPR UI (§25) | 70 | 90 | GDPR line on signup; two-step deletion. |
| 3.9 | Storage pre-signed retrieval (§23.2) | n/a | n/a | covered by `docs/audits/upload-pipeline-security-2026-07.md` |
| 3.10 | CI / quality | 70 | 70 | 670 unit files, guards enumerate. **GitHub Actions still billing-blocked** — every deploy since #364 was a manual `vercel deploy --prod` from a clean worktree. |

---

## 2. What each phase delivered (2026-09-23 → 24)

| Phase | PR → NEW-UI | Delivered |
|---|---|---|
| 0 Blockers | #364 → f86745cc | RevenueCat per-subscriber rows; proxy role gate on a server-written claim; share re-use/revive (no duplicate or orphan grants); one invite-redemption core; polling back-off + 5-min cap; QStash failure callback; advisor-added documents notify + badge. Prod checked by SELECT: 0 duplicate grants, 0 grants on ended relationships. |
| 1 Core loop | #365 → 129fbcc4 | Upload wizard; branch quick facts; wallet grouping/sort/filter; `Policy.nickname` (migration dev + prod). |
| 2 Gap engine | #366 → 3569d502, #367 | `professionalLiability` block; five document-stated rules; catalogue 55 active on `33a0731577205d72`, prod parked-then-activated. |
| 3 Notifications | #368 → e096ed2c | Day-3 rung; green-card and ENFIA-season reminders; push opt-in in onboarding. |
| 4 Wellness | #369 → 0f87afd7 | Check-up tracker, consented self-assessment, preventive calendar; two Art. 9 stores migrated dev + prod, DSR-wired. |
| 5 Family | #370 → ce94fd66 | `WalletMembership`, membership arm, `/account/family`, private toggle, mirrored notifications, DSR. |
| 6 Auth/PWA | #371 → 477374f8, #372 → a39d81fb | Passkey sign-in; 30-day cookie; `/offline` + offline card; GDPR signup line; two-step deletion. |
| 7 Utilities | #373 → aaa2593b | Policy notes (`policy_notes` dev + prod); renewal compare; portfolio report; digital card; activation polling. |

Every migration was applied to dev first, verified by SELECT, then applied to prod through the
Supabase MCP with a `_prisma_migrations` row whose checksum equals the file's sha256.

---

## 3. What was NOT built, and why — the only backlog this doc leaves

### 3a. Recorded decisions against the spec (do not implement blindly)

| Spec item | Repo decision | Where recorded |
|---|---|---|
| §5.1 coverage donut / protection score | Removed; guard fails CI on a score render | `tests/unit/score-containment.test.ts`, `ProtectionStatusHero.tsx:149` |
| §4/§19 biometric-first, PIN fallback | No fake biometric block and no PIN; a REAL passkey sign-in exists since Phase 6 (identifier-first, behind `PASSKEYS_ENABLED`), the platform decides the biometric | `app/auth/signin/page.tsx`, `tests/unit/no-fake-biometric-auth-claim.test.ts` |
| §21.2 daily AI analysis limit | `aiAnalysisPerMonth: null` on all consumer tiers | `lib/pricing/plan-defaults.ts` |
| §23.1 browser→Supabase direct upload | One server ingest path, bucket INSERT policy dropped | `lib/ingestion/ingest-policy-document.ts`, `docs/audits/document-validation-gate-2026-09.md` |
| §20.1 Redis progress key | Progress in Postgres run steps | `PolicyAnalysisRun.steps` |
| §8 "Revenue opportunity €150–400/yr", €1,600/m² Athens | Public numbers need a `docs/content/CLAIMS.md` row | CLAUDE.md PW-VOICE-01 |
| §8/§11 CTA copy | Advice verbs must attribute to the ασφαλιστής | `tests/unit/voice-guards.test.ts` |
| §21.3 RevenueCat as entitlement layer | Stripe is the live web path; RevenueCat is dormant mobile plumbing | `lib/billing.ts`, memory |
| §6 five per-type card components | One resolver + chip row; a per-type component would duplicate the branch sections | `lib/wallet/quick-facts.ts` |
| §7 coverage tabs | Stacked on purpose — the section nav is the page's one navigation | `CoverageTabView.tsx` rationale |
| §5.1 upload FAB / AI insight card / savings badge / support chat | Duplicate upload offers measured as a defect; a € figure needs a claims row; no chat backend | `docs/content/CLAIMS.md`, story-dashboard evidence |
| §13 family dashboard merging the owner's portfolio | Dashboard counts stay own-only | Phase 5 note |
| B2B2C distribution through insurers, employers or banks | Kept deferred by the owner on 2026-09-24: no usage data from the benefit journey yet; agencies remain the only B2B2C channel | owner decision, this doc |
| Partner booking | Owner 2026-09-24: no partner integration yet — referrals are RECORDED only (`partner_referrals`), no booking or partner status | #379 |
| §19.1 «passkey first when a credential exists for the device» | The server cannot know the device; identifier-first with the remembered email is the honest form | Phase 6 note |
| §25 typed email + reason before deletion | The request enters a reviewable, withdrawable queue; a second dialog is the proportionate step | Phase 6 note |

### 3b. Needs an input nobody has sourced yet

| Item | What it needs | Where it would land |
|---|---|---|
| Construction-cost index rule (€/m²), health deductible-vs-savings, specialty settlement tables, breed vet-cost benchmarks | A DATED market source and a `docs/content/CLAIMS.md` row per number | `lib/gaps/authored-catalogue.ts` + a reference-data table |
| `marine_tender_not_listed` | A new array-membership operator in `lib/gap-detection.ts` | one operator + one catalogue row + trace case |
| Interactive gap visualisations (§8) | The same reference data | `components/gaps/*` |
| True PDF portfolio export / PNG digital card | A Greek-capable font file (pdf-lib standard fonts cannot encode Greek) / an image renderer dependency | `lib/services/reports/portfolio-report.ts`, `/wallet/[id]/card` |
| Hospital / vet network lists, life fund allocation charts | Data the extraction does not state | coverage-details |

### 3c. Owner-side configuration (no code)

1. **`PASSKEYS_ENABLED=1`** in Vercel after a dev soak; align the Supabase refresh-token lifetime with the 30-day cookie.
2. **Task 0.7 ops:** GitHub Actions billing (restores CI + auto-deploy), Vercel Git integration team, `SENTRY_AUTH_TOKEN`, the four critical npm advisories.
3. **Stripe LIVE keys** in production (the pricing surface refuses sandbox checkout until then).
4. Optional: a DB partial-unique index on active `AccessGrant` rows (app-level dedupe exists); retire the NextAuth leftover models.

---

## 4. Verification routine that was used per phase

1. `audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, `verify:migrations`, `vitest --run tests/unit`, `next build` — all green before every merge.
2. Schema: dev `migrate deploy` → SELECT → prod via Supabase MCP `apply_migration` → `_prisma_migrations` row with the file's sha256 → SELECT.
3. Deploy: squash-merge → `git worktree add` at the merged sha → `vercel deploy --prod --yes` → alias 200s, anonymous probes of the new routes, `vercel logs --json` error scan.
4. Guard ripple for a new page / store / rule / event / Greek string is recorded in the session memory `spec-v2-program.md`.
