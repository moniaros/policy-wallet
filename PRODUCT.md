# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three roles exist in the product (`policyholder | agent | admin`, global roles on
`User.roles`; tenant-scoped `owner | manager | member` on `TenantMembership`). Admin is
provisioned out of band and is internal tooling, not an audience.

**Design priority order, confirmed 2026-08-12: public marketing site → policyholder →
advisor.** A change that helps one does not automatically help the next; work the order.

- **Policyholder (primary product audience).** A Greek consumer holding several policies
  from different insurers who cannot tell what any of them actually covers. They arrive
  with a PDF and no insurance vocabulary. Their job: find out whether they are still
  protected, and what to fix first.
- **Advisor / agent (secondary).** A licensed Greek insurance intermediary managing a book
  of clients. Their job: see their clients' real coverage position, spot renewals and gaps,
  and work a pipeline. They sign up without approval; licence verification is
  non-blocking.
- **Public visitor (the current top design priority).** Anonymous, arriving cold at the
  marketing site in Greek or English, deciding within seconds whether this is worth an
  upload.

## Product Purpose

PolicyWallet ingests insurance policy documents, extracts and translates their real
coverage, detects gaps against the holder's risk profile, scores protection, and says what
to fix first. Success is a policyholder knowing where their cover ends before an event
proves it, rather than after.

## Positioning

The category, its decode, and the four-beat story are **already codified as the single
source of truth in `lib/marketing/positioning.ts`**, with the definitional sentence
mirrored in `lib/seo/site.ts`. Do not restate or paraphrase them elsewhere — read them from
there.

- Category: **Personal Risk Intelligence Platform** / «Πλατφόρμα προσωπικής ανάλυσης ρίσκου»
- Decode: **"We do not sell insurance. We tell you if you are covered."**
- Story, in this order on every public page: your life changes → your risks change with it,
  your insurance did not → PolicyWallet reads it and shows where cover ends → see what your
  policy says.

The defensible mechanism is **independence**: PolicyWallet sells no insurance and takes no
commission, so its reading of a policy has no distribution incentive behind it. A
neighbouring product owned by an insurer or a broker cannot truthfully make that claim.
(Advisor-side commission *tracking* records the advisor's own rates with insurers — it is
not revenue to PolicyWallet, and is not a contradiction of the claim.)

## Operating Context

- **Greece, bilingual.** Greek is the default and the authoritative language; English must
  carry identical meaning, never a looser paraphrase. Every user-facing string is a
  translation key — hardcoded UI text is a CI failure.
- **The document is the raw material.** Users arrive with insurer PDFs of wildly varying
  structure. Extraction is AI-driven, asynchronous, and measured in minutes, not seconds.
- **AI processing needs explicit consent** (GDPR Art. 9 — policy documents can contain
  health data). The consent gate is a product fact, not a formality, and advisors acting on
  a client's policies must obtain the client's consent rather than be dead-ended.
- **Renewal is the recurring event** the product organises around — an annual cycle with a
  reminder ladder, not a one-off analysis.
- Regulatory frame: Greek insurance intermediation (IDD, ν. 4583/2018). AI output is
  informational support and is **never** presented as regulated advice.

## Capabilities and Constraints

Confirmed and real: document upload and extraction; coverage analysis, gap detection and
protection scoring; renewal reminders; policyholder↔advisor collaboration with typed
invites and per-policy sharing; questionnaires; notifications (email + Web Push) with quiet
hours; GDPR export and deletion request/withdraw; consent history; Stripe subscriptions
and a customer portal; RevenueCat reconciliation for store purchases; admin DSR queue,
agent verification, and reference-data management.

Commercial model: policyholder tiers `free` / `plus` (displayed **"Starter"**) / `pro`
(displayed **"PolicyWallet Plus"**); advisor tiers `agent_free` / `agent_starter` /
`agent_pro` / `agency`. **All deep AI is gated to the top policyholder tier** — free and
Starter include zero AI analyses; the monthly token budget is the limit that actually
binds. Plans are admin-editable rows, not constants.

Does not exist — do not imply otherwise: MFA/2FA, passkeys, a per-device session list,
in-app plan downgrade, server-persisted theme, per-user AI preferences, SMS delivery, or
any insurer partnership or integration.

Never populated outside the seed, so any UI reading them is permanently empty: `Invoice`,
`PaymentMethod`, `CreditTransaction`, `EntitlementUsage`, `ActiveSession`. Invoices and
saved cards genuinely live in the payment provider's portal.

**Open decisions, recorded rather than invented:** whether email changes get a verification
round-trip (today they take effect immediately); whether `Invoice` rows are ever written;
the referral programme has no earn/redeem loop and its UI stays unrendered until it does;
Art. 9 lawful basis for advisor-initiated add-policy is undecided and that flow stays
blocked.

## Brand Commitments

- The name is **PolicyWallet**; the plain-language identity is the decode above.
- **Honesty is a brand system, not a preference.** Claims live in one module, tests pin
  them, and an absent proof point beats a fabricated one. A prior audit removed invented
  user counts, statistics and testimonials; re-introducing that class of claim is a
  regression, not a copywriting choice.
- Independence — no insurance sold, no commission taken — is a load-bearing commitment.
  Nothing may imply a distribution relationship with an insurer.
- Voice: short sentences, concrete nouns, no jargon. A sentence that needs insurance
  knowledge to parse is wrong for this product.
- AI output is described as informational support, never as advice, and never with
  certainty the analysis cannot support.

## Evidence on Hand

**None. The product is pre-launch.** There are no real users, testimonials, named
customers, adoption metrics, benchmarks, press, or partner logos that may be cited, and no
insurer relationships to name.

Future surfaces must therefore persuade on **mechanism and demonstration** — showing the
analysis doing its job on a real policy — never on social proof. Do not invent a number, a
quote, a logo wall, or a user count to fill a layout. If a section needs proof that does
not exist, the section is wrong.

Real assets that do exist: brochure imagery under `public/brand/brochure/`, product
screenshots under `public/images/`, the live product itself at policywallet.gr, and cited
external sources (AADE, HAIC, ν. 4916/2022, Schengen €30,000) already used correctly on the
public site.

## Product Principles

1. **Say only what the data supports.** Every claim on a surface traces to a real record, a
   real capability, or a cited source. No control renders for a capability nothing backs.
2. **Independence is the product.** Anything that reads as selling, steering, or earning a
   commission destroys the reason to trust the analysis.
3. **Greek first, in the reader's words.** Greek is authoritative; English matches its
   meaning exactly. Insurance jargon is a failure of the product, not a requirement of it.
4. **The policy document is the evidence.** Findings are traceable back to what the document
   actually says, with the boundaries of that evidence stated.
5. **Consent and control are visible, not buried.** People hand this product their health
   and financial documents; what is stored, what the AI does, and how to leave are stated
   plainly and reachable.

## Accessibility & Inclusion

**WCAG 2.2 AA is binding** — treated as a hard gate, the way auth and i18n guardrails
already are, not as an aspiration. As a consumer financial service in the EU this is also
the European Accessibility Act's practical bar.

Bilingual EL/EN is an accessibility requirement here, not only a market one: the primary
audience reads Greek, and an English-only control on a trust-critical surface is a defect.
