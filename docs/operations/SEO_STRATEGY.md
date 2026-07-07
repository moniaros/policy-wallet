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
| AEO content | `/guides` — 3 bilingual long-form guides (ΕΝΦΙΑ discount, coverage gaps, renewal checklist) with direct-answer openings, question H2s, visible dates, official sources (AADE, EAEE, Bank of Greece). Product sub-page H2s rephrased as questions. |
| Copy fixes | Free-tier contradiction fixed (3 policies everywhere); /product stat counters now server-render real values instead of "0"; ΕΝΦΙΑ copy updated to "up to 20%". |

## Env-gated data (set in Vercel when known — no code changes needed)

- `NEXT_PUBLIC_SITE_URL` — canonical origin (**required in production**; falls back to `NEXTAUTH_URL`).
- `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_STREET/_CITY/_POSTAL_CODE` — /contact + Organization/PostalAddress. The audit flagged the placeholder "+30 XXX XXX XXXX"; until a real phone exists, nothing renders (absence beats placeholder).
- `NEXT_PUBLIC_SOCIAL_LINKEDIN` (and `_FACEBOOK`, `_INSTAGRAM`, `_X`) — footer links + `sameAs`. Create at least a LinkedIn company page; AI engines use it to corroborate the entity.

## Domain strategy (audit: "subdomain strategy — needs attention")

The marketing site currently lives on `app.policywallet.gr`, so ranking signals
accrue to an app subdomain. Recommendation, in order:

1. **Target state:** serve marketing pages from `https://policywallet.gr` (apex)
   and keep `app.` for the logged-in product. In Vercel: add `policywallet.gr` to
   the project, make it the production domain, 308-redirect `www.` → apex. Keep
   `app.policywallet.gr` for `/wallet`, `/auth`, etc. (or a separate project).
2. **Until then:** set `NEXT_PUBLIC_SITE_URL="https://app.policywallet.gr"` so
   canonicals, sitemap, and JSON-LD are at least consistent on one origin
   (implemented — this is the current state).
3. **When cutting over:** change `NEXT_PUBLIC_SITE_URL` to the apex, 301 the
   marketing paths from `app.` to apex, resubmit the sitemap in Google Search
   Console, and keep the old URLs redirecting for ≥6 months.

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
