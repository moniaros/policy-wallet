# B2C insurance-literacy audit — the 7-question walk (July 2026)

Senior-insurance-educator review of every B2C policyholder page, asking whether
a user with **little or no insurance knowledge** can answer the seven questions
that decide whether the page teaches or merely displays:

1. **What am I looking at?** 2. **Why does it matter?** 3. **Is this extracted,
calculated, or recommended?** 4. **What should I do next?** 5. **What if I do
nothing?** 6. **Where can I learn more?** 7. **When do I contact my insurer or
advisor?**

Scope: B2C only. `/renewals`, `/opportunities`, `/customers`, `/commissions`,
`/insights`, `/team`, `/questionnaires` are **agent (B2B)** surfaces — verified
by role-gating (`getAgentRenewals` → `where: { agentUserId }`) and left
untouched. Verdicts are grounded in the code, not a browser walk.

Legend: ✅ answered · ◑ partial · ➕ improved this program.

---

## /wallet — the policy list

| Q | Verdict |
|---|---|
| 1 What | ✅ "Your policies" with type/insurer/status per card |
| 2 Why | ◑ implicit (this is your portfolio); no one-line stakes |
| 3 Source | ✅ extracted fields; status is computed (labeled as status) |
| 4 Next | ✅ add a policy / open one / share |
| 5 Inaction | ◑ expiry status flagged; consequence lives on the detail page |
| 6 Learn | ◑ no glossary link at list level (correct — terms belong on detail) |
| 7 Contact | ◑ via a policy's share-with-advisor, not at list level |

**Sound.** The list is a navigation surface; deep literacy belongs one level in.
No misleading content. *Nice-to-have (not a defect):* a one-line "what this page
is for" lead.

## /wallet/[id] — the policy detail (the flagship literacy surface)

| Q | Verdict |
|---|---|
| 1 What | ✅ hero + coverage cards per branch |
| 2 Why | ✅ each coverage explained; gaps flagged |
| 3 Source | ✅ **best-in-class** — `SourceSnippetBox` shows the verbatim document text + page behind extracted dates; editorial notes are visibly hedged and separate |
| 4 Next | ✅ review, share, request renewal quote |
| 5 Inaction | ➕ renewal-date label now carries the **renewal** hint (what renewal is, what a lapse costs); expiry banner states "cover stops → request a quote" |
| 6 Learn | ✅ contextual `GlossaryHint` on deductible, waiting period, sum insured, underinsurance, beneficiary, surrender, comprehensive, roadside, green card, exclusion, sublimit, co-payment — **and now renewal** |
| 7 Contact | ◑ share-with-advisor present; "ask your insurer/advisor" now in the new glossary entries' `howToCheck` |

**Strong, and stronger this program.** The one page a novice most needs is the
one that teaches most. Remaining upside is wiring the new `lapse` hint onto the
expired-status pill (available in `POLICY_HINT_SLUGS`, not yet rendered).

## /coverage-insights — score, gaps, recommendations

| Q | Verdict |
|---|---|
| 1 What | ✅ protection score + reviewed findings + recommendations |
| 2 Why | ✅ "how well you are covered"; gaps explained per card |
| 3 Source | ✅ score is **calculated** (methodology disclosure), gaps hedged «πιθανό», recommendations labeled suggestions — three visually distinct blocks |
| 4 Next | ✅ recommendations + "complete your profile" nudge |
| 5 Inaction | ◑ gaps convey exposure without alarming language |
| 6 Learn | ✅ score methodology `<details>`; gap cards carry evidence |
| 7 Contact | ✅ "not personalised advice → a licensed intermediary" disclaimer names when to seek a human |

**Sound.** Metric layer verified render-level (methodology, limits, not-advice,
provisional-under-80%). Fact/estimate/recommendation separation is explicit.

## /help + articles

| Q | Verdict |
|---|---|
| 1–7 | ✅ rewritten this program to describe the real product (free limit, plans, support channels, reminder ladder, scan time, share flow) — no fabricated features |

**Sound (was the worst surface).** Honest bottom line: help now tells the truth
about the app but teaches little *insurance* — the roadmap (below) proposes
surfacing the existing `/guides` + `/lexiko` content as help articles.

## /notifications · /tasks · /account (+ billing, referrals)

- **/notifications** — ✅ what/why/next clear; per-event deep links. Sound.
- **/tasks** — ✅ questionnaire delivery carries the health-data privacy note and
  advisor-collaboration framing. Sound.
- **/account** — ✅ settings labeled; billing honest by construction (renews-on
  vs ends-on, app-store cancel routing); referral "credits do not expire"
  (present tense). Sound.

## Onboarding · /upgrade + pricing

- **Onboarding** — ✅ state-aware analysis step ("a few minutes", notified when
  ready), goal copy describes app behaviour; 62 strings, no promise/urgency
  framing. Sound.
- **/upgrade + pricing** — ✅ plan-neutral, fail-closed defaults; no false
  urgency. Sound.

---

## Cross-cutting literacy improvements made (this program)

1. **Contextual glossary at the point of need.** The dictionary (`/lexiko`) was
   SEO-only; 12→**20 terms** are now reachable *inside the product* as
   `GlossaryHint`s on the cards where a policyholder meets them — resolved
   server-side so the 62 KB module never ships to the browser.
2. **All 14 core concepts defined.** deductible, exclusion, **endorsement**,
   waiting period, insured amount, **replacement value**, **indemnity**,
   beneficiary, premium, **renewal**, **lapse**, **cancellation**, co-insurance,
   sublimit — each answer-first, bilingual, with a "find it in YOUR policy"
   step and (for the lifecycle terms) "what if I do nothing / when to contact
   your insurer or advisor". Guarded so the set cannot silently shrink.
3. **Consequence made explicit** where inaction is costly — the renewal/lapse
   pair states the material outcome (no cover for new losses) in plain words,
   without alarming language.
4. **Dead-end prevention.** New guards pin that every `/lexiko` cross-link and
   in-product hint resolves — a "Read more" that 404s is a silent literacy
   failure. The check found and fixed one (`/product/home` → `/product/property`).

## Remaining literacy roadmap (not defects — backlog)

- Wire the `lapse` hint onto the expired-status pill (term already available).
- Surface `/guides` + `/lexiko` content as in-app help articles (help is honest
  but thin on insurance education).
- One-line "what this page is for" leads on `/wallet` and `/coverage-insights`.
- A beneficiary-review prompt and an annual-checkup nudge (educational, action-
  oriented — carried from the compliance-audit roadmap).

## Verdict

No B2C page requires prior insurance knowledge to use, no specialist term is
left unexplained at the point of need, every page offers a next action, and the
consequences of inaction on the lifecycle surfaces are stated plainly. The
remaining items are enrichment, not gaps that mislead or block a novice.
