# PolicyWallet presentation layer — review and direction

Method: dual-agent (A: `/root/design_review` · B: `/root/evidence_review`), with parent inspection of Bitpanda and the authenticated policyholder home. Assessment A completed before detector findings entered synthesis. Review date: 2026-10-21.

## Decision

Preserve PolicyWallet's existing forest green, mint, typography and recognisable policyholder controls. Establish **one brand with three presentation modes**: an expressive public site, a calm personal workspace, and an efficient professional workspace with explicit agency context. The largest improvement will come from hierarchy, coherent templates and credible product demonstrations. Photography and video support that work; they cannot substitute for it.

This is a review and implementation brief, not a redesign release. No application, account, database, pricing or deployment changes were made. Existing uncommitted implementation work was left untouched.

## Evidence and boundaries

- Fresh public inspection: homepage, pricing and agent landing page at 1280×720; public screenshots in [the evidence directory](../evidence/presentation-review-2026-10-21/).
- Parent inspected [Bitpanda](https://www.bitpanda.com/en): hero, trust section, product imagery and alternating section treatments. Its regulatory, adoption and certification claims are its own; they are not evidence available to PolicyWallet.
- Fresh authenticated policyholder home in Chrome on `www.policywallet.gr`: desktop and settled 390×844 layout. At 390 px, document width was 390 px. The first two policy rows were expired; a generic gap-exploration action preceded specific findings and renewals. Mobile navigation labels differed from desktop labels. An installation promotion competed with the policy list in the first viewport. These are observations of one account/state.
- B also freshly inspected account/security/privacy. Security settings explain recovery, passkeys, device sign-out and security history; privacy explains processing, consent records and data controls. Their functionality was not exercised. A direct professional-dashboard visit ultimately displayed the policyholder dashboard; `/team` was not visited. Professional/agency live acceptance remains outstanding.
- Agency and professional behaviour findings below are conditional source findings unless explicitly marked live. Earlier app screenshots and the [earlier policyholder review](../../.impeccable/critique/2026-10-21T08-39-07Z__app-protected-dashboard-page-tsx.md) provide historical context, not fresh proof that every defect remains.
- Detector: 311 markup files scanned, one warning, manually rejected as a false positive. `InviteModal.tsx:109` uses mutually exclusive class branches; the reported gray-on-amber pair does not coexist. This detector does not certify accessibility, security, usability or correctness.
- No account creation, uploads, sharing, message sending, agency creation, member removal, role changes or payment flows were executed. No penetration test, comprehensive accessibility audit, field performance measurement or real-user study was performed.

## What should carry over from Bitpanda

The useful reference is the visual discipline: a decisive headline, generous space, consistent image treatment, strongly separated sections and prominent explanations of trust. Its current page uses a dark green ground, large condensed headings, pale rounded panels and coherent product imagery. PolicyWallet can achieve similar finish with its own existing palette and Greek-friendly type.

Use larger editorial layouts on public pages, a consistent forest inverse section, and fewer competing messages. Keep sentence-case Greek and the current type family initially; do not copy condensed all-capital display type into the working apps. Avoid importing trading tickers, speculative charts, metallic coin imagery or claims about licences and certifications. The reference informs composition, not product identity.

The distinctive PolicyWallet visual should be **the source document beside an understandable explanation**, with the source and limits visible. A real rights-cleared example may be presented as actual output; an illustrative example must remain clearly labelled as such. Generated screens must never masquerade as product evidence.

## Broken / misleading — separate corrective backlog

### P1 — Professional entry paths disagree

**Live + source:** the agent landing page's header registration points to `role=policyholder`, while its hero points to `role=agent`. Its closing band also introduces the consumer Family plan above professional plan details. This can send a professional down the wrong acquisition path; no completed registration failure was tested.

Evidence: [public CTA definition](../../lib/nav/public-nav.ts), [PublicHeader](../../components/public/PublicHeader.tsx), [LoBPageShell](../../components/landing/LoBPageShell.tsx), and [agent landing](../../app/(public)/solutions/agents/AgentsSolutionPageClient.tsx).

Repair: carry the audience through the shared header, pricing, closing band and registration. Verify the role actually selected on the destination, not just that a link returns 200. Command: `impeccable harden`.

### P1 — Agency presentation can misrepresent an outcome or visibility

**Source-confirmed conditional paths; not mutation-tested:**

1. `TeamClient.tsx`'s member-action wrapper awaits an action and closes the menu, but the server actions return `{ error }` rather than throwing. The wrapper ignores that result. A rejected removal or role change can therefore lose its visible error.
2. The service correctly masks colleagues' revenue for ordinary members, but represents hidden values as zero and sums the masked values. The client displays those values as ordinary currency and labels the scoped sum as a team total. Hidden, actual zero and whole-team total are different meanings.
3. The agency creation form can render raw `UPGRADE_REQUIRED` after collecting input. Permission-dependent controls are also offered without sufficient viewer-role context.

Evidence: [TeamClient](../../app/(protected)/team/TeamClient.tsx) around lines 188, 220, 280, 360 and 550; [team actions](../../app/(protected)/team/actions.ts) around lines 58–81; [team service](../../lib/services/team.service.ts) around lines 99 and 489–533.

Repair: provide explicit visibility and viewer-permission metadata; render “not available with your access” rather than a fabricated zero; name totals by their real scope; handle returned errors inline and preserve the task. Explain prerequisites before form entry. Preserve the server's permission checks. **No authorization bypass is alleged.** Command: `impeccable harden`.

### P1 — More authoritative styling must not amplify unsupported certainty

**Live wording:** public copy sometimes presents the reading as “the truth” or says the platform tells an agent what to do next. These statements deserve a claims/voice check against actual checks, uncertainty and the licensed professional's role. This is a product-truth finding, not a new legal conclusion or a proven security failure.

Repair: make evidence scope and human responsibility visible at the relevant result. Explain upload processing, sharing and deletion through real behaviours and reachable controls. Do not add certifications, guarantees, universal security assurances or fabricated social proof. Respect `docs/content/HALTS.md` before rewriting held strings. Command: `impeccable clarify`.

**Additional live inconsistency:** account privacy describes export as a “full copy”, while the public trust explanation names exclusions. Harmonise the promise with the export's verified scope. Evidence: `lib/i18n/translations/el.ts:3641` and `app/(public)/trust/TrustSections.tsx:168`. Export contents were not tested; this is a wording inconsistency, not a finding of data loss. Preserve the concrete security controls already present rather than replacing them with decorative assurances.

The earlier policyholder findings about consequential copy, reminders and advisor handoff remain a separate verification backlog. Concurrent local fixes exist; reconcile them before opening duplicate work.

## UI/UX improvements — do not independently gate launch

### P2 — Public presentation needs a shorter argument and earlier proof

**Observed:** the homepage places definitions and five expanded educational questions before its mechanism explanation. The phone mock communicates the existence of an app more effectively than the value of its reading. Pricing's first 1280×720 viewport contains no plan or price: introductions and selectors occupy it.

Proposed homepage sequence:

1. Clear existing promise, one primary action and a readable product example.
2. Source clause → explanation → what remains uncertain → document source.
3. Short explanation of upload, reading and review.
4. Distinct consumer and professional paths.
5. Concrete data-control and independence explanations, linked to detail.
6. Compact pricing entry and a few essential questions.
7. One closing action and an organised footer.

Move extensive educational answers to the learning destinations already present. Compact pricing into one introduction and one control row, with plan names and prices visible on desktop without scrolling. Professional marketing should separately demonstrate an individual agent's daily task and an agency's team oversight.

Sources: [WorldClassLanding](../../components/landing/WorldClassLanding.tsx), [GrafiHero](../../components/landing/GrafiHero.tsx), [pricing client](../../app/(public)/pricing/PricingPageClient.tsx). Commands: `impeccable shape`, `impeccable distill`, `impeccable layout`.

### P2 — The apps need clearer priority and working context

**Policyholder, freshly observed:** preserve the composed shell and cards. Replace the generic first action with the most relevant supported task. Prioritise current policies; put history behind an explicit route or disclosure. Bring a compact current-state summary into the scanning path. Use the same destination names across desktop and mobile. Ask for installation after useful progress, rather than competing with initial policy reading.

Suggested home order: current situation → one useful next action → active policies → renewals → useful benefits → history/support. A policy detail should make identity, lifecycle, next action and source easy to find; distinguish AI extraction, deterministic checks and human confirmation. Review failures and missing evidence need their own states.

**Professional/agency, source-based direction:** make daily work the centre: client lookup, due renewals, outstanding source review, assignee and next action. Keep business metrics available but subordinate. Use compact, sortable lists on desktop and deliberately prioritised rows on mobile. Retain filter and return-to-list context. These are proposed improvements, not claims that each capability is absent.

Agency is currently a tenant/team context within the agent experience, not a fourth global role. The service supplies `tenantName`, but the team page uses a generic title and does not display it. Add agency name, viewer role and the scope of the current list/figures. Distinguish “my clients” from “agency clients” only where the permission model genuinely supports those views. Make invitations, reassignment and removal explain their consequences and report the actual outcome.

Sources: [AppShell](../../components/shell/AppShell.tsx), [protected layout](../../app/(protected)/layout.tsx), [team view](../../app/(protected)/team/TeamClient.tsx), [review workspace](../../components/agent/ReviewWorkspace.tsx). Commands: `impeccable distill`, `impeccable layout`, `impeccable adapt`.

### P2 — One visual contract should govern all templates

The implementation has both legacy `.pw-*` recipes and Grafí tokens. They share much of the brand but differ in typography, radii, spacing and page composition. Several design documents describe older decisions; `PRODUCT.md` even says passkeys do not exist while the current sign-in exposes them. The prior token collision and primary-button contrast defect have documented fixes: do not re-report those as current failures.

Preserve runtime brand tokens and establish a documented mapping between the two recipes before migration. Consolidate common controls and page primitives rather than adding a third design system. Update conflicting guidance as an explicit implementation task; it was not silently rewritten during this review.

| Layer | Public website | Policyholder | Agent and agency |
|---|---|---|---|
| Feeling | Confident, editorial, approachable | Calm, personal, understandable | Precise, orderly, efficient |
| Colour | Forest feature sections, paper ground, selective mint | Existing neutral canvas, white cards, green actions | Same brand; restrained status and selection cues |
| Typography | Larger Greek headings; generous reading measure | Clear titles and comfortable factual text | Compact hierarchy; aligned dates, amounts and counts |
| Layout | Strong section rhythm, fewer competing panels | Clear next task and progressive disclosure | Work queues, tables, evidence workspace, explicit team scope |
| Imagery | Selective photography and optional restrained motion | Only where it explains a task | Product demonstrations; minimal decoration in working views |
| Signature | Document and explanation together | Source-linked policy facts | Source, review state, assignee and next action together |

Keep semantic amber/red distinct from brand colour. Avoid giving every static card a lift-on-hover effect. Permission descriptions need readable body text: `components/agent/InviteModal.tsx` currently uses the 10 px micro token for some access explanations. Do not use small decorative typography for a consequential choice.

## Higgsfield art direction and asset brief

Generate a small coordinated set after the page compositions are fixed. This review does not require generation or uploading any private document to a media service.

| Asset | Placement and purpose | Direction | Deliverable |
|---|---|---|---|
| Public hero photograph | Give the public site a human, established presence | Contemporary Greek home; person reviewing documents in natural light; restrained forest/neutral palette; realistic materials; subject to one side with clear text space | Desktop landscape and independently composed mobile crop |
| Optional hero motion | Add subtle atmosphere to the same composition | Slow light or camera movement, approximately 6–8 seconds; no abrupt cuts, sound, floating UI or generated lettering | Video plus a good static poster; static fallback on reduced motion and constrained connections |
| Professional photograph | Agent/agency marketing | Credible small advisory office, attentive document review, restrained styling; illustrative scene rather than a fake testimonial or claimed partner | Landscape and portrait crops matching the hero grade |
| Product proof | Homepage, agent landing, onboarding explanation | Actual rendered PolicyWallet UI and rights-cleared document content; clearly label illustrative data | Crisp responsive crop or HTML demonstration; never AI-generated insurance text or invented scores |

Suggested generation brief: “Editorial photography of a contemporary Greek home, natural Mediterranean daylight, an adult calmly reviewing unbranded papers at a table, forest green and warm neutral details, realistic proportions and materials, understated professional tone, subject on the right, clean negative space on the left, no text, no logos, no dramatic lighting.” The professional variant keeps the lighting and palette, changing the setting to a modest contemporary advisory office.

No background video behind tables, policy terms, upload forms, permission decisions or security settings. Keep all important text as HTML. Reserve image dimensions to avoid layout movement. Provide a pause control for automatically moving material lasting more than five seconds alongside other content, and a reduced-motion poster. [W3C motion guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

## Design health and personas

Scores apply only to A's freshly inspected public presentation and entry paths. They are expert observations, not measured conversion or a platform certification.

| Heuristic | Score /4 | Reason |
|---|---:|---|
| System status | 3 | Selected pricing controls are clear; async work untested |
| Real-world language | 3 | Concrete Greek policy language, some professional jargon |
| Control and freedom | 3 | Clear public navigation and escape routes |
| Consistency | 2 | Audience, plan and presentation inconsistencies |
| Error prevention | 2 | Conflicting registration destination; invalid submissions untested |
| Recognition over recall | 2 | Too much intervening explanation before proof |
| Efficiency | N/A | Working workflows not covered by this public score |
| Minimalism and hierarchy | 2 | Repeated introductions and competing sections |
| Error recovery | N/A | No failure induced |
| Help | 3 | Useful guides and explanations, sometimes over-prominent |
| **Total** | **20/32** | Significant presentation improvements available |

Strengths worth preserving: the green identity, the concrete consumer promise, honest sample labels, and visible independence/sharing explanations. The product is more distinctive when it shows the reading process than when it resembles a generic feature-card website.

For a first-time policyholder, the main question is “Can I understand what this does and what it cannot establish?” For a distracted returning user, it is “What needs attention now?” For an agent or agency manager, it is “Which client, which evidence, whose action?” These three questions should determine each surface's first screen.

The emotional weak point of the public journey is the long educational middle before convincing proof. In the personal app it is the gap between a generic invitation to explore and a concrete task. In agency work it is uncertainty about visibility and whether an action succeeded. More decoration does not resolve those points.

## Delivery sequence and acceptance

1. **Corrective work:** reconcile concurrent changes; fix audience routing, visible agency outcomes and financial scope, and consequential claims. Keep these separate from visual preference changes.
2. **Design contract and representative screens:** specify shared tokens/components and produce desktop/mobile designs for home, pricing, policyholder home/policy detail, agent queue/customer detail and agency team view. Include loading, empty, failed, restricted and expired states. Use `impeccable shape`, `impeccable document` and `impeccable harden` as appropriate.
3. **Public implementation first:** build reusable public templates, introduce the proof example, then generate the selected Higgsfield assets. Migrate pricing, agent landing and auth continuity with the homepage.
4. **App refinement:** preserve policyholder identity; apply task hierarchy and consistent controls; then refine agent density and agency context. `impeccable layout`, `impeccable adapt`, and finally `impeccable polish`.

Acceptance must check outcomes: a visitor can explain the example and its limitation; a policyholder finds a current policy and its source; an agent resumes a specific client task; a member can tell hidden data from zero and a rejected action from a completed one. These are proposed usability checks, not results already achieved.

Verify Greek and English, light/dark, 320/390/430/768/1440 widths, keyboard navigation, visible focus, dialogs, text zoom, reduced motion and real task states. At desktop size pricing should show plan names/prices in the initial viewport; at mobile size do not squeeze Greek to force a fold target. Use meaningful responsive layouts rather than smaller text.

Target good field Core Web Vitals at the 75th percentile, segmented by mobile/desktop: LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1. These are future acceptance targets, not measured current results. [Google's guidance](https://web.dev/articles/vitals).

Before an implementation commit/push run `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant preview journeys. No code tests/build were necessary for this documentation-only review. Dev/prod schema or data verification is not applicable because neither was changed.

Questions skipped: the owner specified the reference, brand preservation, audiences and quality goals, and standing instructions prohibit unnecessary mid-run approval checkpoints. The recommended sequence follows those decisions; no redesign was deployed.
