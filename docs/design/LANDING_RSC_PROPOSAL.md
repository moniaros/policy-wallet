# Landing Server-Components refactor (Stage B) — scoped proposal

**Status:** proposal, not started · **Date:** 2026-07-23 · **Owner decision required before implementation**

This is the one item from `docs/ui-responsive-audit-map.md` that was deliberately not executed during the UI-foundation program. It is an architecture change to the public marketing surface, not a mechanical sweep, and its payoff cannot be measured in the current dev environment.

---

## Why it is blocked on a decision, not on effort

The marketing tree looks like this today (using `/product/motor` as the representative case):

```
app/(public)/product/motor/page.tsx          ← Server Component (metadata + JSON-LD)
  └── PageClient.tsx                          ← "use client", calls useLanguage()
        ├── LoBPageShell.tsx                  ← "use client", calls useLanguage()
        └── ProductCategoryExplorer.tsx       ← "use client", calls useLanguage()

app/(public)/en/product/motor/page.tsx        ← Server Component
  └── <StaticLanguageProvider language="en">
        └── PageClient.tsx                    ← the SAME client component
```

The locale is already decided at the route level — but it is delivered through a **React context** (`StaticLanguageProvider`), which a Server Component cannot read. So the components are client-side *because of how locale is plumbed*, not because they are interactive.

That is why the audit map ties this to the `/en` duplicate-route-tree decision: both are the same underlying question — **how does a marketing page learn its locale?**

## Current state (measured, 2026-07-23)

13 components in `components/landing/`:

| | Component | Why it is a client component |
|---|---|---|
| server | `WorldClassLanding`, `ServicesGrid`, `TrustBadges`, `PartnerPerksSection` | — already server |
| client | `AgentWidgets`, `AudienceTabs`, `LandingHeader`, `PolicyWalletWidget`, `PublicMegaFooter`, `SolutionsDropdown` | genuine hooks / state / animation |
| client | `LoBPageShell`, `ProductCategoryExplorer` | **only** `useLanguage()` — the convertible ones |
| client | `LandingCtaLink` | analytics `onClick`; a deliberate island, already correct |

> The audit map states "11 of 13 are client". The real figure is **9 of 13**, and only **2** are convertible without becoming interactive-behaviour changes.

## The refactor

1. **Give the locale a server-side source.** Each `page.tsx` already knows its locale implicitly (`/product/*` = `el`, `/en/product/*` = `en`). Make that explicit: `export default function Page() { return <PageClient locale="el" /> }`.
2. **Thread `locale` as a prop** through `PageClient` → `LoBPageShell` / `ProductCategoryExplorer`, replacing `const { language } = useLanguage()`.
3. **Drop `"use client"`** from `LoBPageShell` and `ProductCategoryExplorer`; keep it on `PageClient` only where the page genuinely has interactivity, otherwise drop it there too.
4. **Keep `StaticLanguageProvider`** for the remaining client descendants (header, footer, dropdown) until they are separately addressed.

**Files touched:** ~15 product `PageClient.tsx` + ~15 `/en` mirrors + 2 shared components ≈ **32 files**.

## Why it was not done as part of the UI-foundation program

- **The blast radius is the entire public site.** A mistake in locale threading ships Greek copy on English pages or vice versa — an SEO and trust failure, on the surface most likely to be someone's first impression.
- **The benefit is unmeasurable here.** The stated goal is reducing the ~448 KB first-load. This project's Next build does not emit a per-route First Load JS table, so there is no before/after number to justify the risk. That measurement should come first.
- **It overlaps a bigger open question.** If the `/en` tree is ever folded into a `[locale]` segment (both audits list this as desirable but out of scope), the locale plumbing gets solved as a by-product — and doing this refactor first would mean doing it twice.

## Recommended sequence

1. **Measure first.** Establish a real first-load baseline for `/`, `/product/motor` and `/pricing` (e.g. `@next/bundle-analyzer`, or a Lighthouse run against a preview deploy). Without this, there is no way to tell whether the refactor achieved anything.
2. **Decide the `/en` question.** If a `[locale]` segment is on the table, do that first — this refactor becomes a subset of it.
3. **Pilot one page** (`/product/motor` + its `/en` mirror), diff the rendered copy in both locales, and re-measure.
4. **Roll out** to the remaining 14 pairs only if the pilot shows a real gain.

## Related

- `docs/ui-responsive-audit-map.md` §0 → "Not mechanical — blocked on a decision, not on effort"
- `docs/audits/ui-foundation-audit-2026-07.md` → the completed shared-layer program
- STATUS → "Landing RSC" under the UI-foundation entry
