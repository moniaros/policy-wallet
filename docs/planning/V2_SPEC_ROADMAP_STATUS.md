# PolicyWallet — Spec v2.0 Readiness Audit & Development Roadmap (2026-09-23)

## Context

The owner asked for a deep readiness audit of the PWA against `docs/design/PRODUCT_SPEC_V2.md` (Product Spec v2.0 + architecture sections 18–25) and a step-by-step roadmap to 100 % feature completeness. The last spec-status doc (`docs/planning/V2_SPEC_ROADMAP_STATUS.md`, Feb 2026, "~49 %") is stale: since then the document gate, the 50-rule gap catalogue, PW-VOICE/TRANSPARENCY/BRIDGE, the story dashboard and the B2B agent workspace (live 2026-09-22) all shipped. Three read-only audit passes were run over `prisma/schema.prisma`, `app/`, `components/`, `lib/services/`, `lib/gaps/`, `lib/notifications/`, `proxy.ts`, `vercel.json`. Two schema-level defects were re-verified by hand.

Per CLAUDE.md, findings are split: **broken / insecure (gates launch)** vs **spec parity / UX (does not)**.

This session made no code changes. Executing the roadmap is a separate instruction.

---

## STEP 1 — Readiness Matrix

Overall weighted readiness against Spec v2.0: **≈ 62 %**. Backend/authorization/agent side is strong (≈ 85 %); B2C spec-parity UI (per-type cards, upload wizard, wellness, family, utilities) is where the deficit sits (≈ 35 %).

### 1. Core B2C workflows (policyholder)

| # | Capability | % | Status & evidence |
|---|---|---|---|
| 1.1 | Policy upload & ingestion | 85 | ONE path `lib/ingestion/ingest-policy-document.ts` (gate → bucket → Policy+PolicyDocument in one tx). Called from `app/(protected)/wallet/actions.ts:946` (`uploadPolicyDocument`), `app/api/v1/policies/[id]/documents`, agent actions. **Deliberately server-side**, not spec's browser→Supabase direct upload (bucket INSERT policy dropped in Sept). No `capture=` attribute on file input. |
| 1.2 | Async extraction: QStash | 60 | `lib/services/analysis/analysis-queue.ts` `publishJSON` retries 5, dedupe by runId, flowControl parallelism; receiver `app/api/v1/jobs/execute-analysis/route.ts` verifies `Receiver`. Used only for DEEP runs; first-pass `extractBasicSummary` runs inline in `after()`. **No `failureCallback`/DLQ** — only `jobs/reap-stale-analyses` reaper. |
| 1.3 | Async extraction: status & polling | 50 | Progress lives in Postgres `PolicyAnalysisRun.steps` (8 steps), served by `GET app/api/v1/policies/[id]/analysis-runs/[runId]`. **No Redis job key**, no `extracting_clauses/scoring_gaps` %. `hooks/usePolling.ts` steps 2s→5s→10s forever (no 5-min cap); `wallet/[id]/AnalysisCard.tsx:511` fixed 2.5 s `setInterval`. Policy `status` is a free string (`analyzing|active|action_needed|incomplete|deleted`); three type lists disagree (`lib/policy-status.ts:134`, `lib/validations/policy.ts:16`, `types/enums.ts:47`). No `failed`/`manually_entered`. |
| 1.4 | Vercel AI SDK integration | 95 | `ai` v6 `generateObject` in `lib/services/ai/{gemini,anthropic,openai}-ai.service.ts`; router `lib/services/ai/model-router.ts:359`; orchestrator `lib/services/analysis/policy-analysis-orchestrator.service.ts`. `AIPolicyExtractionResponse.acordData` typed `any` (`ai-service.interface.ts`). |
| 1.5 | `AcordDataSchema` (Zod) | 90 | `lib/schemas/acord-data.ts:93` (v3, 618 lines). ALL spec §22.1 fields present: `vehicle.estimatedMarketValue/hasRoadsideAssistance/namedDrivers/greenCardExpiryDate/deductible`, `property.*` incl. `enfiaEligible`, `health.annualLimit/outOfPocketMax/directBillingAvailable/hospitalClass/annualCheckupIncluded`, `health.coordinationCentreName` (deprecated → `coordinationCentre.{name,phone}`), `lifeAndInvestment.cashValue/maturityDate/beneficiaries` (deprecated → count+relationships), `pet.leishmaniaCovered/breed/annualLimit/microchipNumber/preExistingConditionsExcluded[]`, `marineVessel`, `territorialScope`. **Missing: doctor / professional liability block** (no retroactive date, claims-made). |
| 1.6 | Quick-view policy cards (per type, §6) | 35 | ONE generic `components/wallet/PolicyCard.tsx` + `PolicyTable.tsx`; varies by branch icon only. No hospital-class badge, coordination-centre tap-to-call, green-card badge, ENFIA badge, fund value/YTD, microchip/annual-limit bar on the card. `components/policy/` does not exist. |
| 1.7 | Detailed coverage views (§7) | 75 | `components/wallet/coverage-details/{Motor,Health,Home,Life,Pet}CoverageDetails.tsx`; `CoverageTabView.tsx` covered/not-covered exists but rendered `layout="stacked"` (`PolicyDetailsClientView.tsx:955`). Accident-declaration vs roadside are separate `tel:` cards (`MotorCoverageDetails.tsx:158/179`). Missing: hospital/vet network lists, life fund-allocation & goal charts, surrender value, pet breed radar, waiting-period trackers, outpatient-limit progress bars. |
| 1.8 | My Wallet list (§10.1) | 50 | `components/wallet/PolicyWallet.tsx`: search (number/insurer/LOB/asset) + branch chips. Missing: filter by insurer, sort control, grouping by category, editable nickname (no column), status dot (uses `StatusPill`). |
| 1.9 | Upload flow 5 steps (§10.2) | 35 | `components/wallet/AddPolicyClient.tsx`: branch is a `<select>` (no tiles); spinner "reviewing" phase (no branded progress); confirm/edit screen `PolicyReviewScreen.tsx` is **agent-only**; success has "View policy" only. `BatchUploadModal.tsx` exists. |
| 1.10 | Universal detail utilities (§10.3, §15) | 20 | Add note: MISSING (no `PolicyNote`). Compare: `lib/services/renewal-differential.ts` exists but only test-referenced; `PolicyComparison.tsx` is policy-vs-policy. Digital card download: MISSING. Export portfolio PDF: MISSING (only GDPR export + per-policy HTML savings report). |
| 1.11 | Gap engine rules (§8) | 60 | 50 authored rules (`lib/gaps/authored-catalogue.ts`; home 8, renters 8, motor 6, health 4, pet 3, …). DONE: ENFIA triple (`missing_enfia_components`), rebuild-cost drift (`insured_value_below_rebuild_cost`), leishmania, green card, coordination centre. PARTIAL: motor over-insurance only (`insured_value_above_declared`), legal protection profile-level only. MISSING: construction-cost-index (€/m²) rule, motor under-insurance, health deductible/OOP vs savings, room-class analysis, all doctor-liability rules, all marine rules (cruising area, tender, mooring). Spec's interactive sliders/gauges/simulations: MISSING. |
| 1.12 | Savings / duplicates / recommendations (§11) | 70 | `deterministic-savings.ts`, `portfolio-rules.ts:285` duplicate cover, `recommendation-generator.ts`, `/recommendations` page. Missing: "Did you know" AI insight card, ENFIA-opportunity (purple) card type, health-risk card type. |
| 1.13 | Health & Wellness module (§9) | 5 | No model, route or UI. `PreventiveCard.tsx` is generic. Check-up only as extraction field + `no_annual_checkup` gap. |
| 1.14 | Home dashboard 10 elements (§5.1) | 50 | `components/dashboard/home/*`: counter ✓, renewals timeline ✓, recent documents ✓, agent link ✓. Coverage donut **removed by owner decision** (guard `score-containment.test.ts`). Missing: upload FAB, AI insight card, health check-up nudge, savings badge, support chat. |
| 1.15 | Bottom navigation (§5.2) | 80 | `components/shell/AppShell.tsx:104`: Home / Wallet / Protection / Recommendations / Settings. "My Agent" lives in sidebar, not bottom nav. |

### 2. B2B2C / agent connectivity

| # | Capability | % | Status & evidence |
|---|---|---|---|
| 2.1 | Prisma multi-tenant models | 95 | `AgentProfile` (:209), `CustomerRelationship` (:620, `@@unique(agent,policyholder)`), `AccessGrant` (:653, scope `policy:<id>`), `Invite` (:675). **No uniqueness on `AccessGrant`** → duplicates possible. |
| 2.2 | Authorization single path | 95 | `lib/policy-access.ts`, `lib/agent-visibility.ts` (`resolvePolicyAdvisors`). Grants revoked in-tx on terminate (`agent/relationship-actions.ts:51–76`) and transfer (`team.service.ts:364–393`). Guard test exists. |
| 2.3 | Agent portal | 90 | `/dashboard/agent`, `/customers`, `/customers/[id]`, `/customers/[id]/policy/[policyId]`, `/customers/invite`, `/opportunities`, `/renewals`, `/commissions`, `/questionnaires`, `/tasks`, `/insights`, `/team`, `/agent/settings`, `/wallet/[id]/review`. Consent-gated PII via `lib/agent-consent.ts`. Upload-on-behalf `components/agent/UploadPolicyModal.tsx`. Review workspace (`lib/agent/review-workspace.ts`) behind `AGENT_REVIEW_WORKSPACE=1`. |
| 2.4 | Customer "My Agent" + granular sharing (§12) | 55 | `/agent` (`AgentClient.tsx`): name/photo/contact ✓, "what your advisor sees" ledger ✓ (`lib/wallet/shared-policy-ledger.ts`), messages ✓. Sharing is **email-based** (`CollaborationPanel.tsx`); no per-policy Shared/Private toggle vs the connected advisor. Page filters `status:'active'` + `findFirst` (hides pending, shows one advisor). No last-activity timestamp. |
| 2.5 | Agent actions → customer notification/badges (§12.3) | 45 | New policy by agent → `policy_added` ✓. `addRenewalDocument` (`wallet/actions.ts:1006`) sends **nothing**. No `agent_document_added` type. No "added by advisor" badge on wallet card (`uploadedBy` mapped in `wallet/page.tsx:207`, unrendered). |
| 2.6 | Family sharing (§13) | 0 | No model, route, gate or UI. "Family" is only the `ph-pro` plan name. Help text implies email share, which creates a CustomerRelationship treating the relative as an agent. |
| 2.7 | Role-based UI (§19.2) | 80 | `app/(protected)/layout.tsx:69–150` swaps nav by role; `pw_active_role` cookie + `RoleSwitcher`. **Bug:** proxy gates on first token of `user_metadata.role` and ignores the cookie → dual-role users bounced from `/customers`. |

### 3. Infrastructure & data contracts

| # | Capability | % | Status & evidence |
|---|---|---|---|
| 3.1 | Supabase Auth JWT role checks | 60 | Server pages/actions check DB roles ✓. Proxy trusts **user-editable** `user_metadata.role` (`proxy.ts:415`); `app_metadata` used only for passkey count. NextAuth removed from deps; leftovers `Account/Session/VerificationToken` models + `NEXTAUTH_URL` in `sharePolicy`. |
| 3.2 | Biometric-first login / passkeys (§19.1) | 30 | Passkeys implemented as **2FA step-up** (`lib/auth/passkeys.ts`, `app/api/auth/passkeys/*`, `app/auth/step-up`), flag `PASSKEYS_ENABLED` OFF. Not a primary sign-in. PIN fallback deliberately removed. No explicit 30-day session maxAge. |
| 3.3 | RevenueCat server-side sync (§21.1) | 40 | `lib/services/revenuecat.service.ts` (called only from `account/data.ts`), webhook `app/api/v1/billing/revenuecat-webhook/route.ts`. **BUG:** upsert keyed on `revenueCatIdentifier = productIdentifier`, which is `@unique` on `Subscription` (`schema.prisma:904`) → second buyer of the same product overwrites the first user's row. Service maps `premium`→`ph-premium` (orphan plan). `REVENUECAT_API_KEY` absent from `lib/env.ts`. |
| 3.4 | Stripe checkout + gating (§21) | 85 | `lib/billing.ts`, `app/api/v1/billing/{checkout,webhook}`, `publicCheckoutAvailability()` refuses test key in prod. Limits `lib/pricing/plan-defaults.ts` (3/10/25 policies; AI analyses unlimited by decision). Server gates on portfolio gaps, savings export, comparison, questions/day. `UpgradeModal`, `LockedInsightPreview` ✓. Post-checkout "Activating…" is a static message (no poll). Family gate absent. |
| 3.5 | NotificationEvent types (§22.3) | 60 | Model ✓ (`schema.prisma:1062`), ~70 snake_case types in `lib/notifications/registry.ts`. ✓ `policy_analyzed`, `gap_detected`; ≈ `policy_expiring` at [90,60,30,15,7] (no 3-day; free tier 30 only), `perk_reminder`, `document_uploaded` (wrong direction). MISSING: grace period, green-card notification (rule only), ENFIA season, agent-document-added. |
| 3.6 | Cron scheduling | 85 | 17 Vercel crons in `vercel.json`; `proxy.ts:278` allowlists `/api/v1/jobs/`. QStash is a work queue only (no `schedules.create`) — spec says "QStash Cron"; functionally equivalent. |
| 3.7 | Web Push / PWA (§18) | 65 | `public/manifest.json`, `public/sw.js` (push only), `lib/push/web-push.ts` + `PushDevice`, `components/pwa/InstallPrompt.tsx` in AppShell. **No offline cache** (by design note in sw.js); `lib/services/offline-storage.ts` unreferenced. Push opt-in lives in settings, not onboarding. |
| 3.8 | GDPR UI (§25) | 70 | Cookie bottom sheet ✓ (`components/compliance/CookieConsentBanner.tsx`). GDPR badge on signin only, not signup. Delete account = single `ConfirmDialog` → `DeletionRequest` for admin (`account/actions.ts:137`), erasure admin-run. |
| 3.9 | Storage pre-signed retrieval (§23.2) | n/a | Not audited this pass; covered by `docs/audits/upload-pipeline-security-2026-07.md`. |
| 3.10 | CI / quality | 70 | 659 unit files, enumerated guards. **GitHub Actions blocked (billing)**, Vercel Git integration wrong team, Sentry token missing, 35 npm advisories (4 critical). |

### Spec items in conflict with recorded owner decisions (do NOT implement blindly)

| Spec item | Repo decision | Where recorded |
|---|---|---|
| §5.1 coverage donut / protection score | Removed; guard fails CI on a score render | `tests/unit/score-containment.test.ts`, `ProtectionStatusHero.tsx:149` |
| §4/§19 biometric-first, PIN fallback | Fake biometric block removed; passkeys are 2FA | `app/auth/signin/page.tsx:85,342` |
| §21.2 daily AI analysis limit | `aiAnalysisPerMonth: null` on all consumer tiers | `lib/pricing/plan-defaults.ts` |
| §23.1 browser→Supabase direct upload | One server ingest path, bucket INSERT policy dropped | `lib/ingestion/ingest-policy-document.ts`, `docs/audits/document-validation-gate-2026-09.md` |
| §20.1 Redis progress key | Progress in Postgres run steps | `PolicyAnalysisRun.steps` |
| §8 "Revenue opportunity €150–400/yr", €1,600/m² Athens | Public numbers need a `docs/content/CLAIMS.md` row | CLAUDE.md PW-VOICE-01 |
| §8/§11 CTA copy | Advice verbs must attribute to the ασφαλιστής | `tests/unit/voice-guards.test.ts` |
| §21.3 RevenueCat as entitlement layer | Stripe is the live web path; RevenueCat is dormant mobile plumbing | `lib/billing.ts`, memory |

---

## STEP 2 — Development Roadmap

### Phase 0 — Critical blockers (broken / insecure; gates launch)

Each is a small, self-contained fix with a guard test. Order is by blast radius.

| Task | Fix | Files |
|---|---|---|
| 0.1 RevenueCat cross-user overwrite | Key `Subscription` upsert on `(userId, provider)` or on RevenueCat `app_user_id`/`original_transaction_id`; drop or repurpose `@unique revenueCatIdentifier`; map `premium`→`ph-pro` in the service too; add `REVENUECAT_API_KEY` to `lib/env.ts`. Migration: dev then prod (`migrate deploy`, never `migrate dev`). | `app/api/v1/billing/revenuecat-webhook/route.ts:84–102`, `lib/services/revenuecat.service.ts:57–88`, `prisma/schema.prisma:904`, `lib/env.ts:100`, new `tests/unit/revenuecat-subscription-per-user.test.ts` |
| 0.2 Proxy role gate | Derive route role from the `pw_active_role` cookie validated against a signed roles claim (`app_metadata.roles` set server-side at signup/admin), never `user_metadata`. Honour role switch for dual-role users. | `proxy.ts:415`, `lib/auth/role-routing.ts`, `app/(protected)/role-actions.ts`, `app/auth/actions.ts:217`, `app/(protected)/admin/actions.ts:493`, `app/auth/callback/route.ts:90` |
| 0.3 AccessGrant hygiene | Partial unique index on `(granterUserId, granteeUserId, scope) WHERE status='active'`; `sharePolicy` refuses (or explicitly revives) a `terminated`/`inactive` relationship instead of minting a bare grant. | `prisma/schema.prisma:653`, `app/(protected)/wallet/actions.ts:1101–1200`, extend `tests/unit/policy-authorization-single-path.test.ts` |
| 0.4 Invite direction | `redeemInviteCode` must branch on `relationshipType` (`client_agent` vs `agent_client`) like `applyInviteRedemption`; emit activation notification. Reuse `applyInviteRedemption` (export it). | `app/onboarding/actions.ts:218–269`, `app/auth/actions.ts:407` |
| 0.5 Async state machine completeness | (a) `usePolling` exponential 2→4→8→15 s, hard stop at 5 min with "taking longer" copy; (b) replace `AnalysisCard.tsx:511` interval with `usePolling`; (c) QStash `failureCallback` → `app/api/v1/jobs/analysis-failed/route.ts` marks run `failed` and emits `policy_analysis_failed` (registry has it? verify) so the card shows retry CTA; (d) ONE `PolicyStatus` union exported from `lib/policy-status.ts`, delete the two divergent lists. | `hooks/usePolling.ts`, `app/(protected)/wallet/[id]/AnalysisCard.tsx`, `lib/services/analysis/analysis-queue.ts`, `scripts/api-route-policy-inventory.json`, `lib/validations/policy.ts:16`, `types/enums.ts:47` |
| 0.6 Silent agent action | `addRenewalDocument` emits `agent_document_added` to the owner (new registry type + EL/EN template); wallet card renders "added by your advisor" from `uploadedBy`; `/agent` page reads live relationships (not `status:'active'`) and lists all advisors. | `app/(protected)/wallet/actions.ts:1006`, `lib/notifications/registry.ts`, `components/wallet/PolicyCard.tsx:171`, `app/(protected)/agent/page.tsx`, `tests/unit/all-clear-honesty.test.ts` pattern |
| 0.7 Ops (owner-only) | Restore GitHub Actions billing; repoint Vercel Git integration; set `SENTRY_AUTH_TOKEN`; patch 4 critical advisories (`next`, `vitest`, `tar`). | `.github/workflows/ci.yml`, `package.json` |

### Phase 1 — Core loop UX parity: Upload → Extraction → Cards (B2C)

**Delivered 2026-09-23 (`feat/spec-v2-phase1`):** 1.1 wizard (tiles, `capture`, stepped state, extracted-fields check + edit, analyse/share CTAs) — the policyholder confirm step shows what was read and links to edit rather than gating on a «save»; 1.2 as a single resolver `lib/wallet/quick-facts.ts` + chip row on `PolicyCard` (fact key `policy.quickFact`), not five card components; 1.3 grouping, sort, insurer filter, `Policy.nickname` (migration `20260923120000_policy_nickname`, dev + prod). **Not delivered, by recorded decision:** 1.4 tabs (CoverageTabView documents why stacked; the per-branch sections already render every schema field), 1.5 dashboard FAB / AI-insight card (the story dashboard measured duplicate upload offers as a defect — §11), savings badge (needs a provenance/claims decision before a € figure renders), support chat (no backend). Matrix rows 1.6→80, 1.8→85, 1.9→85.


| Task | Deliverable | Files |
|---|---|---|
| 1.1 Upload wizard | 5-step flow: branch tiles → file input with `accept="application/pdf" capture="environment"` → branded step progress driven by run `steps[]` → **policyholder** confirm/edit screen (reuse `PolicyReviewScreen.tsx`, remove agent-only gate) → success with "Analyse coverage" / "Share with advisor". | `components/wallet/AddPolicyClient.tsx`, `components/wallet/PolicyReviewScreen.tsx`, `app/(protected)/wallet/add/page.tsx`, new `components/wallet/upload/BranchTiles.tsx`, `ExtractionProgress.tsx` |
| 1.2 Branch quick-view cards | `components/wallet/cards/{Health,Motor,Home,Life,Pet}QuickCard.tsx` rendering spec §6 fields from `acordData` via `lib/wallet/unreadable-value.ts` and `describeSeverity()`; `PolicyCard.tsx` dispatches by branch, keeps generic fallback. `data-fact` attributes on each fact. | `components/wallet/PolicyCard.tsx`, new `components/wallet/cards/*`, `lib/wallet/policy-identity.ts` |
| 1.3 Wallet list | Group by category, sort control (type/renewal/insurer), insurer filter, `nickname` column on `Policy` (+migration) with inline edit, status dot from `resolvePolicyLifecycle`. | `components/wallet/PolicyWallet.tsx`, `prisma/schema.prisma` Policy, `app/(protected)/wallet/actions.ts` (`renamePolicy`) |
| 1.4 Detail view tabs | Render `CoverageTabView` as real tabs on phone; add missing per-branch sections (hospital list, waiting periods, outpatient progress; life allocation/goal; pet breed radar placeholder without breed data claims). | `components/wallet/PolicyDetailsClientView.tsx:955`, `coverage-details/*` |
| 1.5 Dashboard elements | Upload FAB (reuse `components/ui/FloatingActionButton.tsx`), AI insight card (from `recommendation-generator` output, "Did you know" copy under voice guards), savings badge (from `deterministic-savings`), health check-up nudge (depends on 4.1), help entry (link to `/help` until chat exists). | `app/(protected)/dashboard/PolicyholderHome.tsx`, `components/dashboard/home/*` |

### Phase 2 — Gap engine & schema completion

Rule = operator + catalogue row + trace test + provenance (CLAUDE.md "a new deterministic check is a rule plus an operator").

| Task | Deliverable | Files |
|---|---|---|
| 2.1 Doctor-liability schema | `professionalLiability` block in `AcordDataSchema` (retroactiveDate, claimsMade, limitPerClaim, aggregate, specialty) + extraction prompt + `field-inventory`. | `lib/schemas/acord-data.ts`, `lib/services/ai/extraction-schema.ts`, `lib/gaps/field-inventory.ts` |
| 2.2 New rules | `motor_insured_value_below_market` (value_drift, below), `health_deductible_above_savings_benchmark` (needs a reference benchmark row + CLAIMS entry), `home_rebuild_below_cost_index` (needs €/m² reference-data table, dated source), `doctor_retroactive_gap`, `marine_cruising_area_not_recorded`, `marine_tender_not_listed`, `marine_layup_cover_missing`. Re-align catalogue fingerprint dev→prod (`align:gap-catalogue --apply`). | `lib/gaps/authored-catalogue.ts`, `lib/gap-detection.ts`, `tests/unit/gap-rule-catalogue-trace.test.ts`, `docs/content/CLAIMS.md`, `docs/planning/INSURED_VALUE_ADEQUACY.md` |
| 2.3 Interactive visualisations | Market-value meter, replacement-value slider, hospital-cost simulation — only where inputs are policy-stated or a dated market source exists; each shows `findings-provenance`. | new `components/gaps/{MarketValueMeter,ReplacementSlider,HospitalCostScenario}.tsx` |
| 2.4 Insight card taxonomy | Add `enfia_opportunity` and `health_risk` recommendation kinds with colour tokens; "Ask your advisor" CTA pre-fills a collaboration thread (reuse `app/api/v1/collaboration/threads`). | `lib/services/gap-engine/recommendation-generator.ts`, `components/gaps/*`, `app/(protected)/recommendations` |

### Phase 3 — Notification matrix (§14, §22.3)

| Task | Deliverable | Files |
|---|---|---|
| 3.1 Milestones | Add day-3 to `lib/renewals/milestones.ts`; decide free-tier milestones (owner: today 30 only). | `lib/renewals/milestones.ts` |
| 3.2 New types | `renewal_grace_period` (fire on endDate when not renewed, from `jobs/renewal-check`), `green_card_expiring` notification bridging the gap rule, `enfia_season` (seasonal cron, eligible home policies only), `agent_document_added` (0.6). Templates EL/EN via admin templates. | `lib/notifications/registry.ts`, `app/api/v1/jobs/renewal-check/route.ts`, new `app/api/v1/jobs/enfia-season/route.ts` + `vercel.json` + inventory + `proxy.ts` allowlist |
| 3.3 Push during onboarding | Move `PushOptIn` into onboarding after the install prompt; iOS: require installed PWA first. | `components/notifications/PushOptIn.tsx`, `app/onboarding/*`, `components/pwa/InstallPrompt.tsx` |

### Phase 4 — Health & Wellness module (§9) — net-new

| Task | Deliverable | Files |
|---|---|---|
| 4.1 Check-up tracker | `HealthBenefitUsage` model (policyId, benefit `annual_checkup`, year, status available/scheduled/completed, note); server actions; nudge card on dashboard + health detail; `perk_reminder` reuse for annual push. | `prisma/schema.prisma`, `app/(protected)/wallet/benefit-actions.ts`, `components/wallet/coverage-details/HealthCoverageDetails.tsx`, `components/dashboard/home/CheckupNudgeCard.tsx` |
| 4.2 Health risk self-assessment | Art. 9 data: consent gate + `logAdminRead` scope + DSR wiring (`gdpr-erasure.service.ts`, data export). `HealthRiskAssessment` model, questionnaire (reuse `lib/services/questionnaire`), 0–100 per category, gauges, plain-language copy under voice guards; recommendations link to covered benefits only when `acordData` proves cover. | `prisma/schema.prisma`, `app/(protected)/wellness/*`, `lib/services/wellness/*`, `tests/unit/admin-reads-are-audited.test.ts`, `tests/unit/new-personal-data-stores` guard |
| 4.3 Preventive calendar | Age/gender/coverage-derived list; mark done → archived. Nav entry "Wellness". | `app/(protected)/wellness/page.tsx`, `components/shell/AppShell.tsx` |

### Phase 5 — Family sharing (§13) — net-new, needs a model decision

Recommended model: `WalletMembership` (walletOwnerUserId, memberUserId, role `member`, status, invitedAt/acceptedAt) — NOT a `CustomerRelationship`. `getPolicyAccess` gains a third arm: active membership ⇒ read/write on policies not flagged `privateToOwner`. Per-policy private toggle. Notifications mirrored to members. Gate invite on `ph-plus`+ (`feature-gates.ts` re-adds `family_portfolio`). DSR: export/erase membership rows.
Files: `prisma/schema.prisma`, `lib/policy-access.ts`, `lib/agent-visibility.ts` (exclude members from advisor lists), `app/(protected)/account/family/*`, `lib/monetization/feature-gates.ts`, `tests/unit/policy-authorization-single-path.test.ts`.

### Phase 6 — Auth, session, PWA (§18–19)

| Task | Deliverable |
|---|---|
| 6.1 Passkey as primary sign-in | New `POST /api/auth/passkeys/login/{options,verify}` exchanging a WebAuthn assertion for a Supabase session (Supabase custom-token or Edge Function); signin page presents passkey first when `PasskeyCredential` exists for the device; email/password collapsed. Flag `PASSKEYS_ENABLED` → on in prod after dev soak. |
| 6.2 Session persistence | Set cookie `maxAge` 30 d in `lib/supabase/server.ts` + `proxy.ts` cookie options; Supabase dashboard JWT/refresh settings (owner). Test. |
| 6.3 Offline critical data | Service-worker cache for `/wallet` shell + a tiny `/api/v1/me/offline-card` JSON (roadside/accident/coordination numbers, renewal dates). Reuse `lib/services/offline-storage.ts` or delete it. |
| 6.4 GDPR polish | GDPR badge on `app/auth/signup/*`; delete flow becomes 2-step (type email + reason) before `DeletionRequest`. |

### Phase 7 — Utilities (§10.3, §15)

| Task | Deliverable | Files |
|---|---|---|
| 7.1 Policy notes | `PolicyNote` model (policyId, userId, body, private=true); DSR wiring; note field on detail view. | schema, `wallet/actions.ts`, `PolicyDetailsClientView.tsx` |
| 7.2 Renewal compare | Wire `buildRenewalDifferential` into detail view "Compare with previous" when a prior document/run exists. | `lib/services/renewal-differential.ts`, `components/wallet/PolicyComparison.tsx` |
| 7.3 Export portfolio PDF | Server action → `pdf-lib` render of active policies (identity via `policyLabel`, lifecycle via `resolvePolicyLifecycle`) → signed URL; gated `ph-plus`+. | new `lib/services/reports/portfolio-export.ts`, `app/(protected)/wallet/export-actions.ts` |
| 7.4 Digital cards | Motor/health card PNG via server render → signed URL; share sheet. | new `lib/services/reports/digital-card.ts` |
| 7.5 Post-checkout activation | `/upgrade/success` polls `getPlanData` up to 60 s before showing the static fallback. | `app/(protected)/upgrade/success/page.tsx` |

### Exact code checklist (create / refactor)

**Create**
- `tests/unit/revenuecat-subscription-per-user.test.ts`
- `app/api/v1/jobs/analysis-failed/route.ts` (+ inventory entry, proxy allowlist already covers `/api/v1/jobs/`)
- `components/wallet/upload/{BranchTiles,ExtractionProgress,UploadSuccess}.tsx`
- `components/wallet/cards/{HealthQuickCard,MotorQuickCard,HomeQuickCard,LifeQuickCard,PetQuickCard}.tsx`
- `components/dashboard/home/{UploadFab,AiInsightCard,SavingsBadge,CheckupNudgeCard}.tsx`
- `components/gaps/{MarketValueMeter,ReplacementSlider,HospitalCostScenario}.tsx`
- `app/api/v1/jobs/enfia-season/route.ts`
- `app/(protected)/wellness/{page.tsx,actions.ts}`, `lib/services/wellness/*`
- `app/(protected)/account/family/{page.tsx,actions.ts}`
- `app/api/auth/passkeys/login/{options,verify}/route.ts`
- `lib/services/reports/{portfolio-export,digital-card}.ts`, `app/(protected)/wallet/export-actions.ts`
- Prisma migrations: subscription key, access-grant partial unique, `Policy.nickname`, `PolicyNote`, `HealthBenefitUsage`, `HealthRiskAssessment`, `WalletMembership`, `professionalLiability` is JSON (no migration)

**Refactor**
- `proxy.ts:415`, `lib/auth/role-routing.ts`, `app/(protected)/role-actions.ts`
- `app/api/v1/billing/revenuecat-webhook/route.ts`, `lib/services/revenuecat.service.ts`, `lib/env.ts`
- `app/(protected)/wallet/actions.ts` (`sharePolicy`, `addRenewalDocument`, `uploadPolicyDocument` success payload)
- `app/onboarding/actions.ts` (`redeemInviteCode`), `app/auth/actions.ts` (export `applyInviteRedemption`)
- `hooks/usePolling.ts`, `app/(protected)/wallet/[id]/AnalysisCard.tsx`
- `lib/policy-status.ts` (single `PolicyStatus` union) → delete lists in `lib/validations/policy.ts`, `types/enums.ts`
- `components/wallet/{PolicyCard,PolicyWallet,AddPolicyClient,PolicyReviewScreen,PolicyDetailsClientView}.tsx`
- `app/(protected)/agent/page.tsx`, `AgentClient.tsx`
- `lib/gaps/authored-catalogue.ts`, `lib/gap-detection.ts`, `lib/schemas/acord-data.ts`, `lib/gaps/field-inventory.ts`
- `lib/notifications/registry.ts`, `lib/renewals/milestones.ts`
- `lib/monetization/feature-gates.ts` (fix stale price comments, re-add `family_portfolio`)
- `lib/supabase/server.ts` cookie options; `public/sw.js`
- `docs/planning/V2_SPEC_ROADMAP_STATUS.md` → replace with this matrix; `docs/STATUS.md` at end of each phase

### Verification (per phase)

1. Guardrails before every commit: `npm run audit:api-auth && npm run lint && npm run lint:i18n-changed && npm run lint:utf8 && npm run type-check && npm run verify:migrations && npx vitest --run tests/unit`.
2. Schema changes: apply to dev, `SELECT` the objects, then `migrate deploy` on prod (Supabase MCP if CLI blocked), `SELECT` again; export affected rows to `docs/archive/` before any destructive statement.
3. Phase 0: unit probes for 0.1/0.3/0.4; Playwright `tests/agent-journey.spec.ts` + a dual-role switch journey for 0.2; force a QStash failure in dev and assert the card shows retry for 0.5.
4. Phase 1: Playwright policyholder upload journey at 390 px asserting the 5 states and each quick-card `data-fact`; `tests/measure` overlap metric on wallet.
5. Phase 2: `npm run verify:gap-catalogue` fingerprint equal on dev and prod after `align:gap-catalogue --apply`; trace tests per rule; voice guards for new copy.
6. Phase 3: run `jobs/renewal-check` against dev fixtures at day 30/7/3/0 and inspect `notification_events`.
7. Phases 4–7: DSR drill (`gdpr-erasure.service.ts` test) must cover every new personal-data table; `admin-reads-are-audited` for wellness reads.
8. Production: owner-session smoke on `policywallet.gr` after each deploy (journey outcomes, not status codes).

### Execution directives (say one of these next)

- "Proceed with Phase 0" — all seven blockers in one branch `fix/spec-v2-phase0`, dev+prod migrations, PR to NEW-UI.
- "Proceed with Task 0.1" … "Task 0.7" — a single blocker.
- "Proceed with Phase 1" — upload wizard, branch quick cards, wallet list, dashboard elements.
- "Proceed with Phase 2" — schema block + seven rules + catalogue alignment.
- "Proceed with Phase 3 / 4 / 5 / 6 / 7" as above. Phase 5 needs the owner to confirm the `WalletMembership` model; Phase 6.1 needs the Supabase custom-token approach confirmed.
- "Update the spec status doc" — rewrite `docs/planning/V2_SPEC_ROADMAP_STATUS.md` from this matrix and refresh `docs/STATUS.md`.

Decisions taken under standing authority while planning: none (read-only). Open owner decisions: the eight spec-vs-repo conflicts listed above; whether spec §8 revenue figures may be published (CLAIMS.md); free-tier renewal milestones.
