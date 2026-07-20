# i18n consumer map — who actually reads `t`?

Stage 1 of the dictionary split (`perf/i18n-dictionary-split`). This is the "map before you
move" pass: every `useLanguage()` consumer, classified by what it destructures, and attributed
to the layout tree that can actually render it.

Method: the classification is **not** path-based. `scripts`-free one-off walkers enumerated
every `= useLanguage()` call site (142 sites / 136 files), split them on whether the
destructuring pattern binds `t`, and then walked the **static + dynamic import graph** from
every route entry in `app/` (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`,
`template.tsx`, excluding `app/api`) to find which trees can reach each consumer. A shared
component under `components/` is attributed to every tree that imports it, so "no marketing
component reads `t`" is a reachability claim, not a directory guess.

## Headline finding

**The plan holds.** Walking the import graph from `app/layout.tsx` **and all 57
`app/(public)` pages**, exactly **one** `t`-reading component is reachable:
`components/compliance/CookieConsentBanner.tsx` — the known trap, mounted in the root layout.
Every other `t` consumer is behind `(protected)`, `auth`, or `onboarding`.

The elevation doc's claim is confirmed to the file: **22** `useLanguage()` consumers are
reachable only from `(public)`, and **not one of them binds `t`**.

## Totals

| Bucket | Files |
| --- | --- |
| `useLanguage()` consumer files | 136 (142 call sites) |
| — binds `t` (bucket **b**) | 74 |
| — binds only `language` / `setLanguage` (bucket **a**) | 62 |

## Bucket (b) — reads `t` — by owning layout tree

| Tree | Files | Needs `TranslationsProvider` |
| --- | --- | --- |
| `(protected)` only | 68 | `app/(protected)/layout.tsx` |
| `auth` only — `app/auth/signin/page.tsx` | 1 | `app/auth/layout.tsx` (new) |
| `onboarding` + `(protected)` — `components/ui/AiConsentModal.tsx` | 1 | both layouts |
| **ROOT LAYOUT** — `components/compliance/CookieConsentBanner.tsx` | 1 | **handled separately, see below** |
| Not reachable from any route entry | 3 | — |

The 3 unreachable ones (`components/agent/AddPolicyForCustomerModal.tsx`,
`components/collaboration/AgentCard.tsx`, `components/ui/PlanGate.tsx`) are only imported by
other `(protected)` components, so they are covered by the protected mount either way. None is
reachable from `(public)`.

## Bucket (a) — reads only `language` / `setLanguage` — by tree

| Tree | Files |
| --- | --- |
| `(public)` only | **22** |
| `(protected)` only | 19 |
| `auth` only | 7 |
| `onboarding` only | 7 |
| `onboarding` + `(protected)` | 2 |
| `(public)` + `(protected)` | 1 |
| Not reachable from a route entry | 4 |

23 files touch marketing; all 23 are language-only. These must keep working **without**
loading a dictionary — that is the whole point of the split.

## Named components the brief asked about

| Component | Binds | Tree | Verdict |
| --- | --- | --- | --- |
| `CookieConsentBanner` | `language`, `t` | ROOT layout | **The one blocker.** Handled in Stage 2 with a co-located bilingual copy module. |
| `LegalDocumentPage` | — | `(public)` | Does not call `useLanguage()`; server-rendered copy. No impact. |
| `ContactPageClient` | — | `(public)` | Does not call `useLanguage()` at all. No impact. |
| guides clients (`GuidesIndexClient`, `GuideArticleClient`) | `language` only | `(public)` | Safe. |
| `StaticLanguageProvider` (30 `/en` pages) | provides `t` today | `(public)` | Currently pulls the dictionary into **every `/en` marketing page** for zero `t` consumers. Stage 2 drops `getTranslations` from it. |

## The cookie-banner trap

`CookieConsentBanner` reads `t.compliance?.cookieBanner ?? DEFAULT_COOKIE_COPY`. Letting it
fall through to `DEFAULT_COOKIE_COPY` would be a **regression, not a fix** — that constant is
English-only and its wording differs from both shipped dictionaries:

- EL today: `"Χρησιμοποιούμε cookies για τη λειτουργία της υπηρεσίας και, με τη συγκατάθεσή σας, για analytics και marketing."`
- EN today: `"We use cookies to operate the service and, with your consent, improve analytics and marketing relevance."`
- `DEFAULT_COOKIE_COPY`: `"We use cookies to operate the service and improve reliability."`

So a silent fallback would (a) show English to Greek visitors and (b) change the EN wording.
Stage 2 gives the banner its own co-located `cookie-banner-copy.ts` with both locales copied
verbatim from the dictionaries, and the rendered text is diffed before/after in a real browser.

## Baseline — first-load JS (mainline `0f403d2`, prod build)

Turbopack's build table no longer prints First Load JS, so these are measured directly: every
`/_next/static/**.js` referenced by the route's prerendered HTML, summed raw and gzipped
(gzip -9).

| Route | Chunks | Raw | Gzip |
| --- | ---: | ---: | ---: |
| `/` | 17 | 1,305,687 | 399,476 |
| `/pricing` | 17 | 1,319,365 | 403,689 |
| `/product` | 17 | 1,293,644 | 396,842 |
| `/en` | 17 | 1,305,687 | 399,476 |
| `/auth/signin` (a `t` consumer) | 17 | 1,452,862 | 437,165 |

`/dashboard` is `ƒ` (dynamic, auth-gated) so it has no prerendered HTML to measure;
`/auth/signin` is used as the prerendered stand-in for a `t`-consuming route, and the protected
tree is verified separately by driving it in a browser.

**The dictionary chunk.** `.next/static/chunks/018af4ct-iid8.js` — **193,974 B raw / 60,036 B
gzip** — matches the elevation doc's figure, contains dictionary-only Greek strings
(`Ουρά Ενεργειών`, `Ρυθμίσεις Cookies`), and is referenced directly by `/`'s prerendered HTML.
That is the payload marketing should stop shipping.
