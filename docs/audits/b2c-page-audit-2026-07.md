# B2C page-by-page insurance audit — scored report (July 2026)

External-auditor review of every B2C policyholder page, scored per the owner's
audit rubric. Grounded in the verified code audits on
`claude/ui-foundation-audit-gtm05i` (terminology/date/notification program +
this factual-accuracy pass; companion doc:
[b2c-terminology-audit-2026-07.md](b2c-terminology-audit-2026-07.md)).
Scores are **post-fix**; where a page changed materially this session, the
pre-fix score is shown in parentheses. Static-code audit — dynamic rendered
states not re-verified in a browser this session.

Rubric: Professionalism / Clarity / Accuracy / Trust (1–10) · Compliance risk · Literacy support (1–10).

---

## /wallet — the policy wallet

**Scores**: Professionalism 9 · Clarity 9 · Accuracy 9 (was 7) · Trust 9 · Compliance **Low** · Literacy 7

**Strengths**: one responsive tree (un-forked); status pipeline recomputes
lifecycle from real dates instead of trusting a stale stored status; risk-tone
discipline (expired = amber "already happened", never panic-red); branch
taxonomy labels with correct Greek genitives; premium footprint is a plain sum,
not an invented score.

**Issues found & fixed**: contractual expiry dates rendered UTC (off-by-one at
Athens midnight, disagreeing with the day counts beside them) on PolicyCard /
PolicyWallet notices / PolicyComparison — Athens-pinned; «σε 0/1 ημέρες» broken
grammar → «σήμερα»/«σε 1 ημέρα»; policy term standardized «ασφαλιστήριο».

**Educational opportunities**: the empty state teaches well; the populated
wallet could link status chips to a "what does expired vs cancelled mean"
explainer (candidate `/lexiko` addition: «Ακύρωση/Λήξη»).

**Professional impression**: *understands insurance* — lifecycle recomputation
and the amber-expired decision are practitioner choices. Maturity gap: none
material on this page.

---

## /wallet/[id] — policy detail (hero, key dates, coverage cards, exclusions, claims, documents, gap report)

**Scores**: Professionalism 10 · Clarity 9 · Accuracy 9 (was 7) · Trust 9 · Compliance **Low** · Literacy 10

**Strengths**: the strongest insurance surface in the product. Branch coverage
cards carry real domain knowledge (Green Card, leishmaniasis for Greek dogs,
IBIP disclosures on life — past-performance, tax caveat, surrender warning;
earthquake/fire/flood catastrophe grid vs ENFIA). Exclusions rendered as
contract facts (neutral), notable conditions as extracted data with values.
Claims guidance: branch-resolved claim lines (health = the coordination centre
that authorises admission), extracted deadlines shown as data not advice,
duty-to-mitigate step, never a fabricated phone number. 11 dictionary terms +
exclusions explained in place via GlossaryHint.

**Issues found & fixed**: `formatPolicyDate` (the shared formatter for ALL
start/end/renewal dates here) was not Athens-pinned — off-by-one for the whole
page; "Ask my agent" shown to advisor-less users (false possessive) →
state-aware CTA; gap cards were uniform alarm-red ignoring severity →
neutralized per the product's own documented principle; document preview button
was nested inside the download anchor (invalid interactive nesting) → sibling.

**Suggested /lexiko links**: already comprehensive; add «Υποόριο»/«Συμμετοχή»
hints (done — both authored this program).

**Professional impression**: *"these people understand insurance"* — this page
is the proof. Gap: the AI-insights tab is visibly rawer than the curated cards
(uppercase heading style, coverage list without limits context) — polish, not
substance.

---

## /coverage-insights — protection score & gaps

**Scores**: Professionalism 9 · Clarity 8 · Accuracy 9 · Trust 9 · Compliance **Low** · Literacy 8

**Strengths**: the score is the best-defended metric in the product — `—` not 0
when unscored, amber "provisional" when fallback, `<details>` methodology with
an explicit limits line ("does NOT assess premiums, insurers or wording
quality") and an IDD-appropriate not-advice line pointing to a licensed
intermediary. Gap wording hedged («πιθανό κενό»), verdict states aligned.

**Issues found & fixed**: gap findings mixed «συμβόλαιο/ασφαλιστήριο» within
one card → standardized; hardcoded labels Title-Cased → sentence case.

**Metrics audit**: score methodology transparent, bounded claims, no monetary
"savings" figures anywhere on the page — no false-confidence vector found.

**Professional impression**: the methodology disclosure would satisfy a
compliance officer; the provisional-state honesty would satisfy an actuary.
Gap: score categories could link to the branch guides for "what would improve
this" — literacy, not correctness.

---

## /renewals

**Scores**: Professionalism 9 · Clarity 9 · Accuracy 9 · Trust 9 · Compliance **Low** · Literacy 8

**Strengths**: proportionate urgency ramp (rose = genuinely uninsured
overdue/lapsed; amber ≤7 days; neutral otherwise); correctly distinguishes
lapse («Εκπνοή», an outcome) from expiry (a status) from cancellation; Athens
dates; today/tomorrow day-label edges.

**Issues found & fixed** (earlier program): reminder-date timezone; «5d»
hardcoded English day suffix.

**Professional impression**: the lapse/expiry/cancellation distinction is an
underwriter's vocabulary — rare in consumer software.

---

## /benefits — partner perks

**Scores**: Professionalism 8 · Clarity 9 · Accuracy 9 · Trust 9 · Compliance **Low** · Literacy 6

**Strengths**: proper third-party disclosure («Η εξαργύρωση γίνεται απευθείας
μαζί τους»), honest empty state (no placeholder offers), framed as prevention
services/perks — never as insurance products, so no distribution-status
ambiguity.

**Issues**: none found.

**Professional impression**: the disclosure line is exactly what a compliance
review asks for first. Gap: none material; literacy score low only because the
page has no insurance concepts to teach — by design.

---

## /help + articles ⚠ the material finding of this pass

**Scores (post-fix)**: Professionalism 8 · Clarity 9 · **Accuracy 9 (was 3)** ·
Trust 8 (was 4) · Compliance **Low (was HIGH)** · Literacy 7

**Issues found & fixed — the product described features and terms it does not have**:

| Severity | Claim | Reality → fix |
|---|---|---|
| **High** | "Expert Agent chat — real human insurance experts (not bots), Mon–Fri 9–6" | Feature does not exist. → real channels: priority email support (a real paid entitlement), ask-the-AI, advisor collaboration |
| **High** | "Free accounts are limited to 3 active policies" | Free = **1** policy. → aligned to the plan catalog (guard reads the constant) |
| **High** | "Community Chat — real-time help from other users" card (live on /help, CTA → account settings) | No community exists. → repurposed to the real advisor-collaboration feature, CTA → /agent |
| Medium | "Premium" plan (×11) | No such plan (Starter/Plus/Pro tiers). → paid-plan framing |
| Medium | Renewal reminders "30, 14, 3 days" | Real ladder 90/60/30/15/7 paid / 30 free. → stated exactly |
| Medium | AI scan "10–30 seconds" | Queued; minutes. → "within a few minutes, you'll be notified" |
| Medium | Share via "Account → Settings → Grant Access" | Path doesn't exist. → the real per-policy "Share with Advisor" flow, quoting actual button labels |

**Why it matters**: help is where a policyholder goes when something didn't
work — meeting a fabricated feature or a wrong limit there converts a support
moment into a trust collapse, and "3 free policies" is an actionable
misrepresentation of the commercial offer.

**Guard**: `help-content-factual.test.ts` — free limit read from
`DEFAULT_ENTITLEMENT_LIMITS`, fabricated-claim patterns forbidden,
mutation-tested.

**Professional impression**: pre-fix, this page alone would have failed the
executive review — polished UI describing an imaginary product is the "built by
software developers" tell. Post-fix it is accurate; remaining gap: the articles
are app-mechanics only — no insurance-education articles yet (see missing
features below).

---

## /account (overview, settings, billing)

**Scores**: Professionalism 8 · Clarity 8 · Accuracy 9 · Trust 9 · Compliance **Low** · Literacy 6

**Strengths**: GDPR deletion copy is exemplary (Art. 17, one-month window, what
is retained by law and that it is anonymized); notification preference groups
map to the real event registry; AI-consent handling (Art. 9) is the strongest
compliance element in the product.

**Issues found & fixed**: «Διαγραφη λογαριασμου» missing accents; Title-Case
sign-out label; dead "security theater" keys (2FA-verified, safe-IP, security
score «εξαιρετική») deleted before anything could ever render them.

**Professional impression**: the deletion copy reads like counsel wrote it.
Gap: none post-fix.

---

## /notifications, /tasks, onboarding, /upgrade + pricing

**Scores**: Professionalism 8–9 · Clarity 8–9 · Accuracy 9 · Trust 8–9 · Compliance **Low** · Literacy 6–7

- **/notifications**: recipient-language localization fixed at the shared
  notifier (collaboration events reached Greek policyholders in English);
  renewal/gap notifications verified correctly localized and hedged.
- **/tasks**: Action Center labels accurate; all-done state casing fixed.
- **Onboarding**: state-aware analysis subtitle (no more "ready" while queued);
  goal picker a11y; policy-term standardized.
- **/upgrade + pricing**: honest cancel flow (verified earlier program); paid
  CTA price format aligned («€3»); plan feature lists match the entitlement
  catalog; upgrade prompts truthful about what each tier unlocks.

**Professional impression**: monetization copy is notably honest — locked
features are shown locked, never hidden, and the one-off unlock is labeled with
its real price and count.

---

# Missing features worth building (insurance-first, in priority order)

1. **Insurance-education help articles** — the help center now tells the truth
   about the app, but teaches no insurance. The `/lexiko` + guides content
   already exists; surface "how to read your policy", "before you claim",
   "underinsurance check" as help articles (reuse, not rewrite).
2. **Beneficiary review prompt** — life card already warns when no beneficiary
   is recorded; elevate to an annual "review your beneficiaries" task.
3. **Annual insurance checkup** — a yearly task bundling renewals + gaps +
   sums-insured revaluation (inflation/underinsurance angle already in guides).
4. **Claims-preparation checklist per branch** — the claims card's steps are
   there; a printable/checkable list at claim time is a small step up.

# Overall verdict

Post-program, the B2C surface communicates insurance **correctly,
professionally, and honestly**: the vocabulary is dictionary-anchored and
consistent, contractual dates are zone-correct, metrics are defended with
methodology and limits, monetization is truthful, and — after this pass — the
product no longer describes features or terms it does not have. What would make
an executive say "they understand insurance": the policy-detail page, the
claims guidance, and the lapse/expiry/cancellation discipline. The remaining
maturity gap is educational depth (help teaches the app, not insurance) — a
content roadmap item, not a correctness defect.
