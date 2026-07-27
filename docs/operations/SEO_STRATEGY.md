# SEO / GEO / AEO — implementation & operations

_Response to the July 7, 2026 external audit (SEO 4/10 · GEO 4/10 · AEO 5/10). This
document records what is now implemented in code, what is configured via env, and
the one decision that needs infrastructure work: the domain strategy._

## What is implemented in code (branch `seo-geo-aeo`)

| Area | Implementation |
| --- | --- |
| robots.txt | `app/robots.ts` — allows all public pages for search + AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …), disallows `/api`, `/auth`, `/wallet`, `/admin`, `/account`, `/onboarding`, `/invite`; points to sitemap. |
| sitemap.xml | `app/sitemap.ts` — every public page + guides, hreflang pair for `/`↔`/en`. |
| Per-page metadata | `lib/seo/marketing-pages.ts` — unique Greek titles (50–60 chars via the root `%s \| PolicyWallet` template) + 140–160-char descriptions + canonical for every marketing page. Client pages were wrapped with server `page.tsx` files (a `"use client"` page cannot export metadata — this was why all inner pages shared the bare "PolicyWallet" title). |
| JSON-LD | `lib/seo/jsonld.tsx`, **server-rendered inline** (the old `next/script strategy="afterInteractive"` injected it after hydration, invisible to non-JS crawlers). Organization (+sameAs/contactPoint), WebSite, SoftwareApplication+Offers (pricing tiers), FAQPage (homepage, /product, /pricing, guides), HowTo (/product 3-step), BreadcrumbList (all inner pages), Article (guides). |
| OG images | `app/opengraph-image.tsx` + `twitter-image.tsx` — generated 1200×630 (was a 1024×1024 JPEG). |
| Entity/E-E-A-T | `lib/seo/site.ts` — single source for definition ("PolicyWallet is…"), contact email, phone/address/social via `NEXT_PUBLIC_*` env (rendered only when real values exist; placeholders never render). /company expanded with definition block, company facts, "why we built it". |
| AEO content | `/guides` — 12 bilingual long-form guides (ΕΝΦΙΑ discount, coverage gaps, renewal checklist, earthquake cost, managing policies online, premium payments, claims apps, …) plus `/lexiko` — 20 bilingual glossary terms. Direct-answer openings, question H2s, visible dates, official sources (AADE, EAEE, Bank of Greece), and comparison tables where the query asks to "compare". Product sub-page H2s rephrased as questions. |
| Copy fixes | Free-tier contradiction fixed (3 policies everywhere); /product stat counters now server-render real values instead of "0"; ΕΝΦΙΑ copy updated to "up to 20%". |

## Env-gated data (set in Vercel when known — no code changes needed)

- `NEXT_PUBLIC_SITE_URL` — canonical origin (**required in production**; falls back to `NEXTAUTH_URL`).
- `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_STREET/_CITY/_POSTAL_CODE` — /contact + Organization/PostalAddress. The audit flagged the placeholder "+30 XXX XXX XXXX"; until a real phone exists, nothing renders (absence beats placeholder).
- `NEXT_PUBLIC_SOCIAL_LINKEDIN` (and `_FACEBOOK`, `_INSTAGRAM`, `_X`) — footer links + `sameAs`. Create at least a LinkedIn company page; AI engines use it to corroborate the entity.

## Domain strategy — DECIDED (2026-07-08)

Three-origin split:

| Origin | Serves | Audience |
| --- | --- | --- |
| `policywallet.gr` (apex) | Marketing site: landing, product, pricing, company, contact, guides, legal | Public / crawlers |
| B2C app subdomain (working name `app.policywallet.gr`) | Logged-in policyholder product: `/wallet`, `/home`, onboarding, account | Policyholders |
| B2B subdomain (working name `agency.policywallet.gr` — confirm final name before DNS) | Agent & agency product: `/dashboard/agent`, customers, renewals, team | Agents / agencies |

All ranking signals accrue to the apex; the app subdomains stay behind auth and
are disallowed for crawlers. The canonical infrastructure already supports this —
every canonical, sitemap URL, and JSON-LD `url` derives from `NEXT_PUBLIC_SITE_URL`.

Cutover steps:

1. In Vercel, add `policywallet.gr` as the production domain for the marketing
   deployment; 308-redirect `www.` → apex. Point the B2C/B2B subdomains at the
   app deployment(s).
2. Set `NEXT_PUBLIC_SITE_URL="https://policywallet.gr"` (production env).
3. 301 the marketing paths (`/`, `/product*`, `/pricing`, `/company`, `/contact`,
   `/guides*`, `/solutions*`, `/for-agents`, `/privacy`, `/terms`) from the old
   `app.` host to the apex; keep redirects for ≥6 months.
4. Auth entry points: marketing CTAs (`/auth/signup`, `/auth/signin`) should land
   on the appropriate app subdomain by role (B2C default; agent signup → B2B).
5. Resubmit the sitemap in Google Search Console under the apex property and
   re-run the post-deploy checklist below.

Until cutover, `NEXT_PUBLIC_SITE_URL="https://app.policywallet.gr"` keeps
canonicals/sitemap/JSON-LD consistent on one origin (current state).

Note: the 307 redirect of `/robots.txt` and `/sitemap.xml` to `/auth/signin` came
from `proxy.ts` (Next 16's middleware), which auth-gates every path not on its
allowlist. The allowlist now includes the crawl infrastructure, OG images,
`/guides`, `/for-agents`, `/landing`, the service worker, and the Sentry tunnel.
**When adding a public page, add it to `proxy.ts` too** — otherwise crawlers get
a login redirect. Verify post-deploy with `curl -I https://<host>/robots.txt`
(expect 200).

## Post-deploy checklist

1. `curl -I /robots.txt` and `/sitemap.xml` → 200.
2. Google Search Console: add property, submit sitemap, request indexing for `/`, `/product`, `/pricing`, `/product/property`, guides.
3. Validate JSON-LD with the Rich Results Test on `/`, `/product`, `/pricing`, one guide.
4. Check an inner page's link preview (1200×630) in a Slack/LinkedIn paste.
5. Set the social/contact env vars as real data becomes available.

## Content cadence (freshness signal)

Add one guide per month targeting a Greek long-tail query (`lib/guides/content.ts`
— pure data, no code changes). Update `dateModified` when revising; it feeds the
visible "Updated" date, Article JSON-LD, and the sitemap.
