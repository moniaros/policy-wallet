# Agent / B2B Checkout & Billing Audit — July 2026

Scope: the agent/B2B pricing, upgrade, checkout, Stripe, VAT, and billing-lifecycle flow. Triggered by the reported **€49.99 → €61.99** checkout discrepancy. Grounded in three passes (root-cause + two parallel specialist sweeps), all file:line-verified on `NEW-UI`.

Tiers: **[NOW]** must fix immediately · **[LAUNCH]** must fix before real B2B traffic · **[AFTER]** optimize after launch.

---

## 1. Executive diagnosis

The prices themselves are **numerically consistent** across every surface (19.99 / 49.99 / 99.99 monthly; 199 / 499 / 999 annual — verified in for-agents, AgentPricingClient, public-pricing-content, subscription-entitlements, billing.ts, setup-billing-catalog, seed.ts, and the migration). **Nothing is mispriced.** The damage is in **tax presentation and billing plumbing**:

1. **Advertised prices are VAT-inclusive** (confirmed by product: €49.99 is the price the customer should pay). But the code **treated the advertised price as net and added 24% on top** (`lib/billing.ts`), charging €49.99 × 1.24 = €61.99 — a **24% overcharge**. **Fixed:** checkout now charges the advertised inclusive price as-is (€49.99), and the surfaces label it "incl. VAT."
2. Because VAT was baked into a single gross line, the Stripe invoice has **no VAT breakdown**, so a B2B agent can't reclaim VAT — and VAT is hardcoded to GR 24% for **every** customer with no VAT-ID capture or reverse-charge. (Itemizing the *inclusive* VAT on the invoice is the remaining [LAUNCH] item.)
3. A second, unrelated trust bug: the Account page **falsely advertised a "14-day free trial" on Agent Pro** (which has no trial) and charged immediately.
4. Local `Invoice` rows are never written, so in-app billing history is permanently empty and the reconciliation monitor permanently alarms.

The product **cleared its pricing-accuracy bar**; what remained was a **VAT-presentation/trust tail** and a **billing-plumbing tail**. This pass fixes the trust tail in code and specifies the plumbing tail (which needs a Stripe-Tax account decision).

## 2. Critical issues list

| # | Sev | Issue | Status |
|---|-----|-------|--------|
| C1 | CRIT | €49.99 (VAT-inclusive) shown, €61.99 charged — code added 24% on top → 24% overcharge | **Fixed — charges €49.99 now** |
| C2 | CRIT | Account page advertises false "14-DAY FREE TRIAL" on Agent Pro; agent charged immediately | **Fixed** |
| C3 | CRIT | No itemized net+VAT on the Stripe invoice → B2B can't reclaim VAT | [LAUNCH] spec below |
| C4 | HIGH | Gross/VAT total absent on the *other* checkout entry points (Account cards, Billing panel, B2C UpgradeModal) | **Fixed (Account cards)** + [LAUNCH] rest |
| C5 | HIGH | Agent "Modify plan" routed to the B2C policyholder pricing page | **Fixed** |
| C6 | HIGH | Local `Invoice` rows never created → empty billing history + reconciliation always alarms | [LAUNCH] |
| C7 | HIGH | GR 24% hardcoded for all customers; no VAT-ID / reverse-charge | [LAUNCH] |

## 3. Pricing & checkout discrepancy report — the €49.99 → €61.99

Trace: `AgentPricingClient.handleUpgrade` → `upgradeSubscription('agent-pro','monthly')` (`account/actions.ts`) → `createCheckoutSession` (`lib/billing.ts`).

- **Was:** `lib/billing.ts` treated `plan.price = 49.99` as net → `calculateVAT` → `unit_amount = 6199` (€61.99). The advertised price is VAT-**inclusive**, so this double-charged VAT.
- **Now:** `unit_amount: Math.round(periodPrice * 100) = 4999` (€49.99) via `vatInclusiveBreakdown` — the advertised price is charged as-is; VAT is the portion *contained* in it (€49.99 = €40.31 net + €9.68 VAT).
- `checkout.sessions.create` still sets **no** `automatic_tax`/`tax_behavior`, so the €49.99 line is not yet itemized net/VAT on the invoice — the [LAUNCH] item (mark the price `tax_behavior: 'inclusive'` so Stripe shows the breakdown).

**This was not** a Stripe setting, duplicate product, stale value, coupon, or interval bug — it was in-code VAT-on-top of a VAT-inclusive price. (Same mechanism the money-path test hit: Agent Starter €19.99 → €24.79, also an overcharge.)

## 4. Root-cause hypotheses, ranked

1. **VAT added on top of a net-displayed price (CONFIRMED)** — `lib/billing.ts calculateVAT` + `unit_amount: totalWithVat`. 100%.
2. Wrong Stripe price ID — ruled out (checkout mints inline `price_data`, never uses a price ID).
3. Duplicate Stripe products — ruled out (though inline pricing *creates* a new Price per purchase — see C6/plumbing).
4. Stale frontend / hardcoded display — ruled out (all surfaces agree at 49.99 net).
5. Region/currency — ruled out (EUR everywhere; but country **is** hardcoded GR for VAT — see C7).
6. Coupon / interval / versioning — ruled out.

## 5. UI/UX audit by flow

- **Agent pricing page (`/agent/pricing`)** — net price dominant, VAT a footnote (**fixed:** inline `€X excl. VAT` + bold `€Y incl. 24% VAT` per card, plus a recurring/cancel disclosure). Monthly-only; annual agent prices (€199/€499/€999) are advertised on marketing but **unreachable in-app** (no period toggle) [AFTER]. In-app titles "Pro/Starter" differ from the Stripe/`displayName` "Agent Pro/Agent Starter" [AFTER].
- **Account → Overview upgrade cards** — showed net mislabeled `/ mo` (hardcoded English) with a **false trial badge** (**both fixed:** real trial gate + gross line + localized `perMonth`). Paid agents see no upgrade path here (gated to free users) [AFTER].
- **Account → Billing panel** (`Billing.tsx`) — current-plan price shows **net** mislabeled "/month" for everyone, including annual subscribers (whose real period is €499/yr) [LAUNCH]; billing history always empty (C6).
- **Checkout handoff** — server-action flows had "Redirecting to Stripe…" + an 800 ms artificial delay (**copy fixed** → "Redirecting to secure payment…"; delay [AFTER]). `UpgradeModal` is the reference-quality flow (error handling, spinner, trust box, immediate redirect) — use it as the template.
- **Post-payment** — `upgrade/success` server-verifies the session, activates idempotently, deep-links agents to `/dashboard/agent`. Solid; only the return-CTA label is generic [AFTER].

## 6. Billing & Stripe remediation plan

- **Done — overcharge.** Checkout now charges the advertised **VAT-inclusive** price (€49.99), not ×1.24. Surfaces label it "incl. VAT."
- **[LAUNCH] C3/C7 — itemized/compliant VAT.** The €49.99 line is still not broken into net + VAT on the Stripe invoice. Mark the price `tax_behavior: 'inclusive'` and set `automatic_tax: { enabled: true }`, `billing_address_collection: 'required'`, `tax_id_collection: { enabled: true }`, `customer_update: { name: 'auto', address: 'auto' }` — then Stripe itemizes the contained VAT (€40.31 + €9.68 = €49.99), applies the correct rate by country, and handles intra-EU **reverse charge** for B2B VAT-ID holders. **Requires Stripe Tax enabled + a GR tax registration.** Minimum interim: attach a Greek 24% **inclusive** `tax_rate` so the invoice itemizes net/VAT without full Stripe Tax.
- **[LAUNCH] C6 — local invoices.** On `invoice.paid` / `checkout.session.completed` in the v1 webhook, create a local `Invoice` (number, `amount`/`taxAmount`/`totalAmount`, `pdfUrl` = Stripe hosted invoice URL) — or drop the local `Invoice` model and link `BillingHistory` straight to Stripe's hosted invoice list. Fixes empty history + the always-alarming reconciliation monitor (`reconciliation.service.ts`).
- **[LAUNCH] Dual webhooks.** Retire `/api/stripe/webhook` (return 410 / delete) and register only `/api/v1/billing/webhook`. Both are live, share the idempotency store, and persist **divergent** state (legacy `handleCheckoutCompleted` defaults `planId:'ph-plus'`) → non-deterministic subscription state by delivery order.
- **[LAUNCH] Agency intent.** Pick one model. `for-agents` sells Agency self-serve ("Get Started" → signup) while everywhere else it's "Contact Sales" → `/contact`, yet a **purchasable €99.99 Agency price + plan row exist** and `upgradeSubscription` has no guard — a signed-in agent could hit a live €99.99 checkout. Either make it contact-only (guard `upgradeSubscription` + point the CTA to `/contact`) or fully self-serve (drop `isContactPlan`).

## 7. Copy & microcopy fixes

**Fixed:** "Redirecting to Stripe…" → "Redirecting to secure payment…" / "Μετάβαση σε ασφαλή πληρωμή…" (both call sites); legacy "Premium" strings (`subscription-copy.ts` `premiumFeature`, `upgradeSuccess`) → upgrade-neutral wording; public "7 templates" → "5" (matches enforced cap); added inline VAT + recurring/cancel disclosure copy.

**[LAUNCH/AFTER] remaining:** Stripe line-item `description: "PolicyWallet monthly subscription"` → name the plan + "renews automatically (incl. 24% VAT)"; `genericError` → recovery guidance; B2C `PricingComparison` headers "Plus/Pro" contradict the card names "Starter/Plus"; B2C `UpgradeModal` shows net while its trust line says "No hidden fees" (propagate gross).

## 8. Design-system consistency

The agent pricing file is token-clean (post-migration) but still mixes raw `neutral-*` with semantic tokens; the shared checkout surfaces `app/(protected)/upgrade/page.tsx` and `components/account/PricingComparison.tsx` are **not** migrated (heavy raw `slate-*`) so the B2C upgrade path is visually inconsistent with the migrated agent path [AFTER — next palette batch].

## 9. Code cleanup & architecture

- **[AFTER] Dead code:** `/api/stripe/checkout` (no callers, hardcoded env price IDs) + its inventory entry + unused `STRIPE_PREMIUM_PRICE_ID`/`STRIPE_PLUS_PRICE_ID`; `scripts/setup-billing-catalog.ts` + `stripe_price_id` columns (checkout mints inline `price_data`, never reads the catalog); `prisma/seed.js` (stale, mis-priced `ag-*` catalog @ €49/€199 — a footgun vs the canonical `seed.ts`).
- **[LAUNCH] `ActivityLog.adminUserId` misuse (B8):** `handleSubscriptionSuccess` and `deleteAccount` write ordinary user events as `adminUserId`, polluting the admin audit trail. Introduce `actorUserId` / a user-event table.
- **Consolidation done here:** VAT math → one client-safe `lib/billing/vat.ts`; trial config → one client-safe `lib/billing/trial-plans.ts`; both now consumed by server + UI (no more display-name heuristics, no duplicated VAT math).

## 10. QA regression checklist

- [ ] Agent Pro card shows €49.99 labelled "incl. VAT"; **checkout charges €49.99** (not €61.99).
- [ ] Agent Pro card / Account card show **no** "free trial" badge; CTA is "Select plan", not "Start trial"; agent is charged immediately (no trial).
- [ ] B2C Plus (ph-pro) **still** shows the 14-day trial badge and gets the trial.
- [ ] Agent on `/account` → "Modify plan" lands on `/agent/pricing`, not `/upgrade`.
- [ ] Redirect toast reads "Redirecting to secure payment…" (EL/EN).
- [ ] Public /for-agents & /pricing show 5 (not 7) Starter templates.
- [ ] Money-path E2E still green (Stripe test card → correct gross charge → activation).

## 11. Release gate — must-fix before production

The **overcharge is fixed** (customers now pay the advertised €49.99). Remaining gates: C3 (itemized VAT invoice) and C7 (per-country VAT / VAT-ID) are **compliance** gates for selling to Greek/EU businesses — an agent legally needs a VAT invoice showing the contained VAT. C6 (local invoices) and the dual-webhook retirement are correctness gates. These need the Stripe-Tax account decision; **do not open paid B2B signups until C3/C7 are resolved or a manual-invoice process is in place.**

## 12. Target-state checkout

VAT-inclusive headline (price shown = price charged, labelled "incl. VAT") that matches the checkout exactly; a pre-redirect summary of the charge, interval, renewal date, and "cancel anytime"; Stripe itemizing the *contained* VAT with VAT-ID capture and reverse-charge; a compliant downloadable VAT invoice per period in Account → Billing; one webhook; one price catalog reused across checkouts.
