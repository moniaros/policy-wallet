# Public website & design system — product-design review (2026-10-08)

Lens: senior SaaS product designer — information architecture, conversion paths,
page templates, visual language, and how the design system is governed.
Evidence: full-page captures of production (`www.policywallet.gr`, 1440px and 390px,
12 pages) plus the nav/footer source. Companion to the code-level review
[public-site-and-design-system-2026-10.md](public-site-and-design-system-2026-10.md)
(defects A1–A6, DA1–DA9 live there and are not repeated).

---

## Verdict in one paragraph

The *voice* is the product's strongest asset — honest, plain Greek, a clear "we read,
we don't sell" position — and the needs check is a genuinely good top-of-funnel tool.
The *structure* hasn't caught up: the homepage tries to be the whole site (13 sections,
11,000px desktop / 17,000px mobile), every product page still asks people to create an
account while registrations are closed, the B2B audience has no front door, and two
visual languages (Grafí and the legacy slate system) alternate section by section on
the same page. None of this is cosmetic polish; it is IA and system debt that will cap
conversion once registrations reopen.

---

## A. Broken journeys (gate the next acquisition push)

| # | Finding | Evidence |
|---|---|---|
| P1 | **Closed registrations reach only the homepage header and hero.** `/` and `/en` read `registrationsOpen()` and swap the CTA to «Δείτε τις ανάγκες σας». Every other public page — product, agents, pricing, needs, guides — still shows «Δημιουργία λογαριασμού» in the header and «Δημιουργήστε λογαριασμό» / «Ξεκινήστε δωρεάν» in the body. Each lands on a dead end: «Οι νέες εγγραφές είναι προσωρινά κλειστές» with only a Σύνδεση button. 28 public files link to `/auth/signup`. | `components/landing/WorldClassLanding.tsx:71,80` (the only caller passing the flag); `PublicHeader` default `registrationsOpen = true`; captured `/product/motor`, `/solutions/agents`, `/pricing`, `/needs`, `/auth/signup` |
| P2 | **The closed-registration homepage still asks for signup.** The hero says registrations are closed; two scrolls later the «Για εσάς που θέλετε ηρεμία» card offers «Δημιουργήστε λογαριασμό». | home, role section |
| P3 | **Pricing promises a path that is closed twice.** Free → «Ξεκινήστε» (closed signup); Plus/Family → «online αγορές προσωρινά κλειστές, επικοινωνήστε μαζί μας» with no contact action in the card. | `/pricing` cards |

**Fix shape:** one `registrationsOpen` decision consumed by `PublicHeader` and the shared
CTA components (server value passed once from a public layout — the missing
`app/(public)/layout.tsx` again), and one sanctioned "closed" CTA: «Δείτε τις ανάγκες σας»
→ `/needs`, with the needs-check result as the waitlist/invite capture. Guard: enumerate
public pages and fail on a signup href rendered while the gate is closed.

---

## B. Information architecture (UX — does not gate launch)

1. **Homepage is the whole site.** Order today: hero → branch strip → glossary cards →
   five Q&As → 4 steps → role tabs → comparison table → full pricing → contact form →
   FAQ → dark CTA band → "who are you" band → footer. Pricing, comparison, FAQ, glossary
   and contact each have their own page. Recommended spine (7 sections):
   hero → sample result (proof) → how it works → who it's for (two cards, not tabs) →
   why trust us (comparison, condensed) → one CTA band → footer. Move the contact form
   off home; keep one FAQ (the Q&A list and the FAQ accordion overlap).
2. **The B2B audience has no front door.** Agents are the second row of the «Προϊόντα»
   dropdown and a footer band. A two-sided SaaS exposes the split at the top — the role
   tabs mid-home and the «Ασφαλίζεστε ή ασφαλίζετε άλλους;» band show the need is
   already felt. Add a top-level «Για ασφαλιστές» link; drop the dropdown's agent row.
3. **«Προϊόντα» contradicts the positioning.** The core claim is «Δεν πουλάμε
   ασφάλειες», yet the main menu lists 14 insurance branches as "Products". They are
   *what we read*, not what we sell. «Κλάδοι» (EN "Coverage types") keeps the IA and
   stops the contradiction. Content-owner call under the voice rules (LEXICON.md).
4. **Fourteen branch pages, one template, no hierarchy.** The footer lists every branch
   in one column; the "other categories" grid colours some cards mint and others white
   with no legend (it reads as "recommended" vs "not"). Group by audience — Personal
   (Αυτοκίνητο, Κατοικία, Υγεία, Ζωή, Ταξιδιωτική, Κατοικίδιο) / Business & group — and
   use one card style.
5. **Footer is a sitemap.** Company column mixes company, content and four legal links;
   Solutions mixes audiences with two pricing deep links and a stray caption («Οι
   σελίδες που βοηθούν να αποφασίσετε»). Suggested: Product (how it works, needs check,
   pricing, compare) · Coverage types (grouped, max 8 + "all") · Learn (guides,
   glossary, methodology, changelog, status) · Company (about, trust, contact) · legal
   row at the bottom. This also gives `/methodology`, `/status`, `/changelog` a home
   (code review B: orphans).
6. **Platform vs trust vs methodology.** `/platform` («Πώς δουλεύει η ανάλυση»), `/trust`
   and `/methodology` answer overlapping "how do you read my policy" questions from three
   URLs. Merge into one «Πώς δουλεύει» hub with anchored sections.

---

## C. Visual language & page templates (UX)

1. **Two design systems visible on one scroll.** Home alternates Grafí sections (heavy
   tight display headings, mint ground, hand-drawn underline flourishes) with legacy
   sections (Inter semibold, slate-50 ground, navy CTA band). Product and pricing pages
   are entirely legacy; auth pages entirely Grafí. A visitor going home → product →
   signup crosses the seam twice. This is the owner decision already open in the code
   review (§2); this review adds that the seam is *visible*, not only in the CSS.
2. **Section grounds have no rule.** Mint, white, slate-50 and navy alternate without
   meaning. Pick two grounds (base + sunken) and one inverse band in the brand's own
   green-black — the dark CTA band is the only navy surface on the site.
3. **Decoration competes with the message.** Hand-drawn underlines («απλά», «Ξεκάθαρα»,
   «ηρεμία») three times on one page; the 4-step list carries arrow buttons that look
   clickable. One flourish per page at most; no affordances on non-interactive rows.
4. **Mobile hero spends two screens before the first proof.** 5-line display H1, CTA,
   closed-registration microcopy, then a ~600px phone mock. Cap H1 at 3 lines at 390px;
   show the sample result as a cropped card, not a full device.
5. **Marketing mocks drift from the product's honesty rules.** `/product/motor` sample
   card shows «Πλήρης κάλυψη» in green — the verdict the product refuses to render
   without evidence (CLAUDE.md, "absence of a detected problem…"). Mocks should show
   the product's real states.
6. **Button priority on pricing points at the wrong plan.** The only button in the three
   cards is the free plan's outline «Ξεκινήστε» (itself closed); paid cards carry a grey
   notice. Footer «Εγγραφή» is the one non-pill button on the site.

**Keep:** the header (one row, clear active state, theme + language inline); the agents
page's product-screenshot cards (concrete about what the tool does); the pricing
comparison table; the needs-check wizard (one question group per step, progress bar, no
account); the FAQ density on product pages.

---

## D. Design-system governance (process)

1. **No owner, four documents.** MASTER.md, DESIGN.md, docs/design-system.md and 8 page
   docs disagree with each other and with runtime (code review DA3–DA9). Anyone
   "following the doc" ships regressions until there is one.
2. **No component layer for marketing.** Sections are hand-built per page (~30 client
   components each mounting their own header/footer). 83 public pages need ~10 section
   primitives — Hero, FeatureSplit, StepList, AudienceCards, ComparisonTable, PlanCards,
   FAQ, CTABand, CardGrid, LegalDoc — each taking copy as data. That is also what turns
   a P1-style fix from 28 files into one.
3. **No visual regression net on the public site.** `RUN_VISUAL=1` baselines cover the
   app; add baselines for the templates above at 390/1440.
4. **Tokens before taste.** 1,301 colour literals in `.tsx` make any palette decision a
   find-and-replace project. Freeze new literals with a lint rule first, then migrate.

---

## Recommended order

1. **P1–P3 (one PR):** registration state reaches every CTA; closed-state CTA → needs
   check; pricing cards get a working contact action; enumerating guard.
2. **Owner decisions (one sitting):** design-system winner (Grafí vs legacy) · rename
   «Προϊόντα» · top-level «Για ασφαλιστές» · homepage spine.
3. **Public layout + section primitives**, then rebuild home on the 7-section spine.
4. **Footer/IA regroup**; merge platform/trust/methodology into one hub.
5. **Visual baselines** for the templates; lint rule on colour literals.

## How to re-capture

Playwright against production, 1440×900 and 390×844, full-page, cookie banner
dismissed: `/`, `/product`, `/product/motor`, `/solutions/agents`, `/needs`, `/pricing`,
`/guides`, `/trust`, `/compare`, `/company`, `/platform`, `/auth/signup`.
