# SEO map — every public route

*Generated 2026-08-30 from the registries themselves (`lib/seo/marketing-pages.ts`,
`lib/guides/content.ts`, `lib/glossary/content.ts`), not by hand — regenerate the
tables the same way after adding routes.*

## Mechanism (uniform across routes)

- **Canonical + hreflang**: every registry-driven page emits canonical, and the
  `el` / `en` / `x-default` trio. Verified live 2026-08-30 on /, /en,
  /product/health, /lexiko/kalypsi, /pricing, /compare — all correct, one H1 each.
- **Titles**: registry-enforced budgets (≤60 rendered chars with the
  `%s | PolicyWallet` template; descriptions 140–160). `seo-metadata.test.ts`
  fails CI on a violation — it caught deliverable 4's own property title at 61.
- **robots**: `app/robots.ts` welcomes search AND AI crawlers (GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended…) on public pages, disallows the product surface,
  and disallows EVERYTHING on non-indexable (preview) deployments.
- **Sitemap**: `app/sitemap.ts`, keyed explicitly — a route ships to the sitemap
  by decision, not by glob.

## JSON-LD graph

| Type | Where | Source of truth |
|---|---|---|
| Organization, WebSite, SoftwareApplication | homepage | `lib/seo/jsonld.tsx` (slogan = CATEGORY constant) |
| FAQPage | home, /compare, product pages, guides, glossary | the SAME typed arrays the visible FAQ renders — markup cannot claim an invisible question |
| HowTo (4 steps) | homepage | `landingContent.howItWorks` — moved to 4 steps WITH the visible list, in lockstep |
| BreadcrumbList | all sub-pages | `breadcrumbJsonLd` |
| Article | guides | `lib/guides/content.ts` |
| DefinedTermSet / DefinedTerm | /lexiko + term pages | `lib/glossary/content.ts` (the homepage answer block JOINS this via glossarySlug — guarded) |

## Registry routes (31)

| Path | Key | Locales | Metadata source |
|---|---|---|---|
| `/product` | product | EL+EN | registry |
| `/pricing` | pricing | EL+EN | registry |
| `/needs` | needs | EL+EN | registry |
| `/compare` | compare | EL+EN | registry |
| `/company` | company | EL+EN | registry |
| `/contact` | contact | EL+EN | registry |
| `/solutions/agents` | solutions-agents | EL+EN | registry |
| `/product/motor` | product-motor | EL+EN | registry |
| `/product/property` | product-property | EL+EN | registry |
| `/product/health` | product-health | EL+EN | registry |
| `/product/cyber` | product-cyber | EL+EN | registry |
| `/product/group-health` | product-group-health | EL+EN | registry |
| `/product/group-pension` | product-group-pension | EL+EN | registry |
| `/product/pet` | product-pet | EL+EN | registry |
| `/product/life` | product-life | EL+EN | registry |
| `/product/travel` | product-travel | EL+EN | registry |
| `/product/pension` | product-pension | EL+EN | registry |
| `/product/boat` | product-boat | EL+EN | registry |
| `/product/fine-art` | product-fine-art | EL+EN | registry |
| `/product/business` | product-business | EL+EN | registry |
| `/product/liability` | product-liability | EL+EN | registry |
| `/product/legal-expenses` | product-legal-expenses | EL+EN | registry |
| `/product/group-life` | product-group-life | EL+EN | registry |
| `/guides` | guides | EL+EN | registry |
| `/lexiko` | lexiko | EL+EN | registry |
| `/privacy` | privacy | EL+EN | registry |
| `/terms` | terms | EL+EN | registry |
| `/cookies` | cookies | EL+EN | registry |
| `/trust` | trust | EL+EN | registry |
| `/platform` | platform | EL+EN | registry |
| `/subprocessors` | subprocessors | EL+EN | registry |

## Guides

| `/guides/ekptosi-enfia-asfalisi-katoikias` | guide | EL+EN | Article + FAQPage |
| `/guides/kena-kalypsis-ti-einai-pos-ta-vriskete` | guide | EL+EN | Article + FAQPage |
| `/guides/checklist-ananeosis-asfalistiriou` | guide | EL+EN | Article + FAQPage |
| `/guides/ti-kalyptei-i-asfaleia-aytokinitou` | guide | EL+EN | Article + FAQPage |
| `/guides/apallagi-asfaleia-ygeias-pos-leitourgei` | guide | EL+EN | Article + FAQPage |
| `/guides/poso-kostizei-i-asfalisi-seismou` | guide | EL+EN | Article + FAQPage |
| `/guides/asfaleia-katoikidiou-ti-exaireitai` | guide | EL+EN | Article + FAQPage |
| `/guides/omadiko-symvolaio-ergasias` | guide | EL+EN | Article + FAQPage |
| `/guides/prostimo-anasfalistou-oximatos` | guide | EL+EN | Article + FAQPage |
| `/guides/diaxeirisi-asfalistirion-se-ena-simeio` | guide | EL+EN | Article + FAQPage |
| `/guides/pliromi-asfalistron-psifiaka` | guide | EL+EN | Article + FAQPage |
| `/guides/efarmoges-asfalistirion-apozimioseis` | guide | EL+EN | Article + FAQPage |
| `/guides/analogikos-kanonas-ypasfalisi-katoikias` | guide | EL+EN | Article + FAQPage |
| `/guides/vraxychronia-misthosi-asfalisi-katoikias` | guide | EL+EN | Article + FAQPage |
| `/guides/elga-apozimiosi-kai-pragmatiko-kostos` | guide | EL+EN | Article + FAQPage |

## Glossary terms

| `/lexiko/asfalistirio` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/kalypsi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/apallagi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/exairesi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/asfalismeno-kefalaio` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/asfalistro` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/ypasfalisi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/chronos-anamonis` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/dikaiouchos` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/odiki-voitheia` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/mikti-asfaleia` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/prasini-karta` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/exagora` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/ypoorio` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/symmetochi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/ananeosi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/ekpnoi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/apozimiosi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/axia-antikatastasis` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/prostheti-praxi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/akyrosi` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |
| `/lexiko/skor-prostasias` | glossary | EL+EN | DefinedTerm + FAQPage + Breadcrumb |

## Deliberately outside the map

| Path | Why |
|---|---|
| `/solutions/partners`, `/solutions/synergates` | **noindex,nofollow by decision A-04** — Terms §3 + IDD opinion with legal; unlinked from nav, absent from sitemap |
| `/styleguide` | dev-only (`notFound()` in production) |
| `/wallet`, `/admin`, `/auth`, APIs | product surface — robots-disallowed, auth-gated by proxy.ts |

## Known gaps (honest list)

- The partners pair declares no hreflang link between EN source and EL mirror —
  deliberate while noindexed; add the explicit pair when legal releases them.
- Lighthouse SEO score: measured in `docs/perf-report.md` against a production
  build, not the dev server.
