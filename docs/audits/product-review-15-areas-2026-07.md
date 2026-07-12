# PolicyWallet — Senior Product Review, 15 Areas (July 2026)

_Product-manager / UX-strategist review of the shipped app against the 15-area improvement mandate. Grounded in code as of `NEW-UI` @ `a6cf90e` (12 Jul 2026). Per repo convention, findings separate **[GATES]** (broken / insecure / dead — gates launch quality) from **[POLISH]** (UX judgment — does not)._

## Executive summary

Twelve of the fifteen areas received shipped, deployed improvements between 8–12 Jul (PRs #46–#66): the design-system repaint, upload review, policy detail redesign, smart recommendations, empty states, agent portal, admin triage + funnel, and a four-phase conversion overhaul. The product's core loop — upload → understand → act → upgrade — is now coherent and instrumented.

The three weakest areas, in priority order: **mobile app-shell depth** (two of five bottom-nav tabs are placeholder stubs), **first-time onboarding** (solid 5-step skeleton, but no role fork for agents inside the flow and no "aha in under a minute" fallback when AI analysis is slow), and **claims** (deliberately guidance-only — right call pre-launch, but the guidance card is now the seed of a future assistant). Trust surfaces are unusually strong for this stage (Art. 9 consent gating, attestation trail, DSR queue) with one self-serve gap: data export.

**Top 5 next investments (conversion/activation/retention/trust lens):**
1. Mobile shell: real Alerts + Tasks tabs (retention) — replace stubs with the existing NotificationEvent + UserTask data. [GATES: shipped nav promises content that isn't there]
2. Onboarding: analysis-wait step should teach, not spin — show the extraction-review preview skeleton + one "what you'll get" sample card while Gemini runs (activation).
3. Self-serve GDPR export (JSON/PDF of policies + consents) from Account → closes the "user owns their data" promise (trust). [GATES-adjacent: GDPR right of access currently admin-mediated]
4. Renewal reminders: user-visible schedule + channel preferences (email/push toggle per policy) — the cron exists; the user has no control surface (retention).
5. Portfolio-level Health Score on /home mirroring the per-policy donut (already computed server-side as ProtectionScore) — single number users return for (retention).

---

## Area-by-area

### 1. First-time onboarding — B
**Shipped:** 5-step flow (`app/onboarding/flow.tsx`): welcome → upload (AI consent captured pre-upload) → analysis wait → results → plan selection; plan choice persisted and later re-surfaced by the carried-plan card (#62); trial-exhausted CTA (#61); dashboard tour (`DashboardTour`) after landing.
**Gaps / recommendations:**
- [POLISH] Step 3 (analysis wait) is dead time. Render the review screen's skeleton with a worked sample (the fixture motor policy) and the microcopy: el «Όσο η AI διαβάζει το συμβόλαιό σου, δες τι θα πάρεις…» / en "While the AI reads your policy, here's what you'll get…". Component: reuse `PolicyPreviewRow` + one `RecommendationPreviewCard`.
- [POLISH] No agent fork inside the flow — agents onboard via a separate path (`app/onboarding/agent/`); the entry page should ask role FIRST (two cards: "I hold policies" / "I advise clients") rather than defaulting policyholder.
- Data field to add: `onboardingCompletedAt` on User (activation cohort analytics; funnel today only infers from events).

### 2. B2C policyholder dashboard (/home) — A-
**Shipped:** usage banner w/ meter, multi-insurer trigger, renewal teaser, carried-plan card (#61/#62), smart recommendation cards w/ evidence (#53), premium empty states (#50), journey events.
**Gaps:** [POLISH] No portfolio Health Score despite `ProtectionScore` being computed and persisted per user — add a `PortfolioHealthCard` (donut idiom from the detail page, `calculateProtectionScore` output, link to coverage-insights). One glance-number is the strongest return-visit hook the app has and it's currently invisible on home.

### 3. B2B agent dashboard — A-
**Shipped:** KPI strip, CRM customer intelligence table, portfolio health, revenue pulse, action queue (#55); renewals pipeline; opportunity scoring.
**Gaps:** [POLISH] Action queue items lack one-tap outcomes ("mark contacted") inline — each action currently navigates away; add optimistic inline status mutation (PolicyRenewal.status pipeline already supports pending→contacted).

### 4. Policy upload & AI extraction review — A
**Shipped:** per-field confidence chips, inline edit, confirm/flag with audit trail, review-state soft gate across wallet + detail page (#51); admin extraction-flag triage (#54); real Gemini confidence in prod.
**Gaps:** [POLISH] Batch upload (#48-era) doesn't route through the review screen per file — post-batch, chips appear but there's no "review all N" queue. Add a sequential review walkthrough (`/wallet/review-queue`) iterating unconfirmed policies.

### 5. Policy detail page — A (redesigned #57)
Anchored-section redesign shipped: summary + health donut + glance chips, key dates + reminder trail, first-ever rendering of exclusions/fine-print/perks/conditions, claims guidance, related recommendations, Q&A, decomposed components + `lib/wallet/policy-detail.ts` read model. Money-path E2E now pins its gates (#66). No open recommendations.

### 6. Insurance Health Score — B+
**Shipped:** per-policy donut (exclusions/gaps/verified formula) on the detail page; portfolio `ProtectionScore` service (category-weighted) persisted per user.
**Gaps:** [POLISH] Two scores, two formulas, one name — unify presentation: portfolio score on /home + coverage-insights labeled «Δείκτης Προστασίας», per-policy donut labeled «Υγεία συμβολαίου». Add score *delta* ("+5 από τον προηγούμενο μήνα") — `ProtectionScore.computedAt` history is not kept; add a `ProtectionScoreSnapshot` table (userId, score, computedAt) written by the gap-engine run to enable trends.

### 7. Coverage-gap recommendations — A
**Shipped:** severity + evidence + next-step cards, 3-way CTAs, five portfolio rules, anti-salesy product-matching exclusions (#53); evidence soft-lock as upgrade trigger (#61); same-LOB recommendations on detail page (#57).
**Gaps:** [POLISH] "Not relevant" dismissals feed nothing — log dismissal reason (one-tap chips: "already covered elsewhere / too expensive / not now") into RecommendationInstance.status metadata to tune rules.

### 8. Renewal reminders — B
**Shipped:** renewal-check cron + PolicyRenewal pipeline, milestone trail now user-visible on the detail page (#57), renewal teaser trigger (#61).
**Gaps:** [POLISH] No user control surface: which milestones, which channel, per policy. Add "Υπενθυμίσεις" block in Account → Notifications backed by existing `NotificationPreference`. Microcopy: el «Θα σου θυμίσουμε 30 και 7 ημέρες πριν τη λήξη — άλλαξέ το όποτε θες.»

### 9. Claims assistant — C (deliberately)
**Shipped:** data-aware `ClaimsGuidanceCard` (extracted deadlines, insurer phone, policy number at hand, ask-AI/ask-agent handoffs) (#57). No claims domain model — correctly excluded from empty states (#50).
**Recommendation:** keep guidance-only through GA. Post-GA seed: `ClaimDraft` model (policyId, incident date, description, photos[], status) + a "Ξεκίνα δήλωση" flow that outputs a prepared email/PDF to the insurer — assistant, not adjudicator, preserving the "AI explains, doesn't replace" principle.

### 10. Consent-based agent collaboration — A-
**Shipped:** central `lib/policy-access.ts` authorization, revocable manage grants, agent attestation for phantom customers w/ activity-log evidence (#48, ⚠️ counsel sign-off pending), collaboration panel + timeline, share revocation.
**Gaps:** [POLISH] The policyholder's "who sees what" view is per-policy only — add an Account-level "Πρόσβαση & κοινοποιήσεις" page listing all active grants with one-tap revoke (data: existing AccessGrant query, grouped by grantee).

### 11. Empty states — A (shipped #50; shared primitive, preview rows, trust lines). No open items.

### 12. Pricing & upgrade moments — A
**Shipped:** four-phase conversion overhaul (#59–#63): revenue integrity (no free upgrades, verified checkout returns), 10 typed feature gates + EL/EN copy w/ forbidden-urgency tests, 12 trigger surfaces, working top-up, portal, annual nudge, server-side funnel mirror + admin funnel card. E2E-pinned (#66), incl. the fixed mobile trigger.
**Remaining:** user-gated money-path close-out (sk_test key, 4242 walk); grandfathered free-subs courtesy note before period lapse (STATUS housekeeping).

### 13. Admin dashboard — B+
**Shipped:** eight sections (dashboard w/ conversion funnel #63, DSR queue, extraction flags #54, billing reconciliation, launch readiness, insurers, tokens, users).
**Gaps:** [POLISH] No cross-section alert surface — launch-readiness signals (email deliverability, cron health, webhook registration) should badge the admin nav when red, not wait to be visited.

### 14. Trust, GDPR & AI transparency — B+
**Shipped:** Art. 9 AI-consent gate before any document processing (owner-consent enforced even for agent-initiated analysis), consent approval page (`/consent/ai`), withdrawal path, AiDisclaimer across 9 surfaces, "AI can make mistakes" review flow, DSR admin queue, cookie consent, BillingTrustBox, CSP, per-field confidence honesty.
**Gaps:**
- [GATES-adjacent] **No self-serve data export** — GDPR right of access is admin-mediated via DSR queue. Ship Account → «Λήψη των δεδομένων μου»: JSON bundle (policies + acordData + consents + activity) via a signed, expiring download. Small server action; big trust signal.
- [POLISH] Account deletion path exists but should surface the retention explanation inline (what's kept for legal/billing, for how long).

### 15. Mobile-first UX — C+
**Shipped:** responsive Tailwind layouts everywhere, mobile wallet screen + profile, bottom nav, mobile upgrade surface fixed (#66), 375 px-safe new components (#57).
**Gaps:**
- [GATES] `MobileAppShell` tabs **Tasks** and **Alerts** are placeholder cards ("all caught up") regardless of actual state — real UserTask and NotificationEvent data exists server-side. Wire them (list + mark-read) or remove the tabs until real; a nav tab that always says "nothing here" trains users to ignore it.
- [POLISH] Coverage tab is a link-out card, not a native screen — render `ProtectionScore` + top-3 recommendations inline.
- [POLISH] `MobileWalletView`/`example-responsive.tsx` are dead code (bug source in #66) — delete to prevent the next mis-wire.
- Run the standing Mobile Chrome/Safari Playwright projects in the local pre-merge routine for UI PRs (config already defines them; they're simply never invoked).

---

## Information architecture (current, post-redesign)

**Policyholder:** Home (triggers + renewals + recommendations) → Wallet (list → detail: summary/dates/coverage/exclusions/perks/analysis/recommendations/Q&A/claims/agent/documents) → Coverage Insights (portfolio) → My Agent → Account (billing, tokens, notifications). Mobile mirrors via bottom nav (home/tasks/coverage/alerts/account) — two tabs stubbed, see §15.
**Agent:** Dashboard (KPIs/action queue) → Customers (CRM) → Renewals → Opportunities → Commissions.
**Verdict:** IA is sound; no restructuring recommended. The single structural improvement worth making: Account gains two panes — "Πρόσβαση & κοινοποιήσεις" (§10) and "Τα δεδομένα μου" (§14) — completing the ownership story the product promises.

## Suggested new data fields (consolidated)
| Field | Where | Serves |
|---|---|---|
| `onboardingCompletedAt` | User | activation analytics (§1) |
| `ProtectionScoreSnapshot` (userId, score, computedAt) | new table | score trends (§6) |
| dismissal reason | RecommendationInstance metadata | rule tuning (§7) |
| reminder channel/milestone prefs | NotificationPreference (extend) | §8 |
| `ClaimDraft` | new table, post-GA | §9 |

_Review artifacts: PRs #46–#66; STATUS.md 12 Jul; money-path E2E 9/9; full suite 79 green._
