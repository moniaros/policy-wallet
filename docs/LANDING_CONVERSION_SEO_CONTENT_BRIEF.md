# PolicyWallet Landing Page Content Brief (Conversion + SEO)

## 1. Product Truth Sheet

### Product capabilities that can be claimed in public copy
- PolicyWallet is a multi-role insurance platform for both policyholders and insurance agents/agencies.
- Collaboration is bidirectional:
  - Agent can upload customer policies and make them available to the customer.
  - Policyholder can upload policies and share them with an agent and/or family.
- Upload supports PDF policy documents (and image inputs in current implementation).
- AI is used for policy document understanding and extracts key policy metadata.
- AI-assisted policy Q&A exists for policy-specific questions.
- The product supports Greek and English user-facing experiences.
- Usage limits and upgrade paths exist for AI-related capabilities.

### Data points AI processing can describe
- Insurer name
- Policy number
- Start and expiry dates
- Policyholder and insured-role details (where available in the document)
- Coverage-related details and summary

### Trust-safe framing policy
- Use: "Gemini-powered AI analysis"
- Do not hardcode model version in landing copy until product docs and runtime config are unified.
- Avoid hard growth claims unless verifiable and internally sourced.

## 2. Audience + Jobs-To-Be-Done

### Primary audience (conversion priority)
- Policyholder self-serve signup

### Secondary audience
- Agents/agencies who need client policy collaboration and opportunity workflows

### Core JTBD
- Policyholder JTBD:
  - "Help me understand what I have, what I am missing, and what expires soon."
- Agent JTBD:
  - "Help me centralize customer policies, detect opportunities faster, and collaborate transparently."

## 3. Information Architecture (Single Page, Dual Persona Tracks)

Section order is fixed and must be implemented exactly:

1. Hero (policyholder-first)
- H1: one unified value proposition
- Subhead: AI extraction + clarity + collaboration
- CTA 1 (primary): `Start free as policyholder`
- CTA 2 (secondary): `I have an agent invite`
- CTA 3 (tertiary text link): `I'm an insurance agent`

2. Persona Split Block
- Card A: "For Policyholders" (3 bullets + CTA)
- Card B: "For Agents & Agencies" (3 bullets + CTA)

3. How It Works (Reciprocal Collaboration)
- Step A: Upload policy PDF
- Step B: AI extracts and organizes
- Step C: Share with agent/family or receive from agent
- Step D: Ask policy-specific AI questions

4. AI Extraction Detail Section
- Clearly list extracted fields: insurer, policy number, expiry, insured roles, coverage terms
- Explicit bilingual output positioning (Greek + English)
- Add trust line: "Review and edit if needed"

5. Dual-Side Collaboration Section
- Two-way flow content:
  - Agent-initiated onboarding path
  - Policyholder-initiated sharing path
- Clarify permission control and consent-based sharing

6. Policy Q&A + Token/Upgrade Section
- Explain policy-specific AI Q&A
- Explain daily/periodic limits for lower tiers
- Explain upgrade value in plain language
- Include CTA to pricing/upgrade

7. Social Proof / Trust
- Use proof-safe elements:
  - Product screenshots
  - Workflow proof
  - Privacy/security statements
  - Implementation-readiness markers
- Avoid unverified hard metrics

8. Security & Privacy Section
- Encryption + access control + consent-based sharing
- Include independence positioning ("independent platform")

9. FAQ
- Cover:
  - Who is it for?
  - How sharing works both directions?
  - What AI analyzes?
  - Greek primary and English support?
  - AI limits and upgrades?

10. Final CTA Strip
- Two buttons:
  - Policyholder signup
  - Agent signup
- Include low-friction microcopy

11. SEO Footer Links
- Internal links:
  - `/pricing`
  - `/privacy`
  - `/terms`
  - help docs entry path

## 4. SEO Content Model (Bilingual)

Greek is primary. English is parallel.

### Keyword clusters
- Core cluster:
  - EN: `insurance wallet`, `policy management`
  - EL: `ασφαλιστικό πορτοφόλι`, `διαχείριση συμβολαίων`
- AI-intent cluster:
  - EN: `policy AI analysis`, `insurance document extraction`
  - EL: `ανάλυση ασφαλιστηρίου με AI`
- Collaboration-intent cluster:
  - EN: `share policy with agent`, `client policy collaboration`
  - EL: `μοιρασμός ασφαλιστηρίου με πράκτορα`
- Q&A-intent cluster:
  - EN: `ask AI about policy`, `questions about insurance policy`
  - EL: `ερωτήσεις για ασφαλιστήριο με AI`
- Commercial-intent cluster:
  - EN: `insurance app pricing`, `AI token limits insurance app`
  - EL: `τιμές εφαρμογής ασφαλίσεων`, `όρια AI tokens`

### Per-section SEO requirement
Every landing section must define:
- Target query intent
- Primary and secondary keywords in EL/EN
- Search snippet angle (benefit + clarity + trust)

## 5. Metadata and Structured Data Plan

### Metadata baseline
- Set root `metadataBase` in `app/layout.tsx`.
- Localized landing metadata must include:
  - canonical
  - hreflang alternates
  - OpenGraph
  - Twitter metadata

### Localized URL strategy
- `/` = Greek default
- `/en` = English variant
- Reciprocal alternates on both pages

### Structured data plan
- Add JSON-LD on landing:
  - `SoftwareApplication`
  - `Organization`
- `FAQPage` may be included for semantic clarity, but do not assume rich result eligibility.
- Add `WebSite`; add `SearchAction` only if site search exists publicly.

## 6. Conversion Instrumentation Plan

### Event taxonomy
- `landing_view`
- `persona_card_click` with `persona: policyholder|agent`
- `cta_click` with `location: hero_primary|hero_secondary|agent|final`
- `pricing_click`
- `faq_expand`
- `signup_start` with `role` and `source`
- `signup_complete` with `role` and `source`
- `invite_flow_start` with `source: agent_invite|customer_share`

### Funnel
1. landing_view
2. persona interaction / CTA click
3. signup_start
4. signup_complete

### KPIs
- Primary KPI:
  - Policyholder signup conversion rate from landing sessions
- Secondary KPIs:
  - Agent CTA click-through rate
  - Scroll depth to pricing and FAQ
  - Time-to-signup-start
  - Performance split by locale (`el`, `en`) and source channel

## 7. Public APIs / Interfaces / Types To Add or Update

1. `types/landing-content.ts`
- `LandingContentModel`
- `LandingSection`
- `PersonaTrack`
- `SeoMetaLocalized`
- `FaqItemLocalized`

2. `lib/landing/content.ts`
- Single source of truth for bilingual landing copy (no ad hoc JSX strings)

3. `lib/landing/seo.ts`
- `buildLandingMetadata(locale)`
- `buildLandingJsonLd(locale)`

4. `components/landing/*`
- Components consume typed payload props instead of inline copy literals

## Implementation Sequence
1. Create this brief document first.
2. Normalize product-truth claims against current code and runtime limits.
3. Refactor landing copy into typed content model.
4. Implement localized route + metadata/hreflang.
5. Add JSON-LD.
6. Add conversion instrumentation events.
7. Run QA + SEO validation checks.

## Test Cases and Scenarios

1. Content truth tests
- Every claim maps to implemented feature path or explicitly marked roadmap item.

2. Metadata tests
- Canonical exists on both `/` and `/en`.
- hreflang is reciprocal and correct.
- OG/Twitter fields are present and locale-appropriate.

3. Structured data tests
- JSON-LD validates in schema tooling.
- No hidden/misleading FAQ structured data.

4. Role-conversion tests
- Policyholder primary CTA triggers signup start.
- Agent CTA triggers agent flow.
- Invite CTA triggers invite flow start.

5. Localization tests
- Both locale pages are crawlable and linked.
- Language metadata matches rendered language.

6. Accessibility and UX tests
- Keyboard navigation works on all CTAs.
- Contrast is acceptable.
- Mobile layouts hold at 375/768/1024/1440.

7. Performance tests
- Above-the-fold LCP content is optimized.
- Core Web Vitals are within acceptable targets.

## Assumptions and Defaults (Locked)
- Primary conversion target: policyholder signup.
- One landing page strategy with dual persona tracks.
- Claims style: moderate aspirational, no fabricated hard metrics.
- Bilingual SEO strategy: separate localized URLs + hreflang.
- Public AI wording: "Gemini-powered AI analysis" until versioning is unified.
- Token/pricing claims must use current subscription limits from code as source of truth.

## Source References (SEO Constraints)
- Google title links:
  - https://developers.google.com/search/docs/advanced/appearance/title-link
- Google hreflang / localized versions:
  - https://developers.google.com/search/docs/specialty/international/localized-versions
- Google structured data general policies:
  - https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google FAQ structured data:
  - https://developers.google.com/search/docs/appearance/structured-data/faqpage
- Google FAQ/HowTo visibility changes:
  - https://developers.google.com/search/blog/2023/08/howto-faq-changes
- Next.js metadata API:
  - https://nextjs.org/docs/app/api-reference/functions/generate-metadata
