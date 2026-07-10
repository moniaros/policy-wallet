# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** PolicyWallet
**Updated:** 2026-07-10
**Category:** Insurance Platform

> **Canonical value table:** [components/ui/design-tokens.ts](../../components/ui/design-tokens.ts) — every hex, radius, shadow, and animation value below is defined there (or in `app/globals.css` for runtime CSS variables). If this document and `design-tokens.ts` ever disagree, `design-tokens.ts` wins.
>
> **Reference implementations:** [components/landing/AgentWidgets.tsx](../../components/landing/AgentWidgets.tsx) (widget cards, severity styling, pill badges) and [app/auth/signin/page.tsx](../../app/auth/signin/page.tsx) (forms, primary buttons, canvas layout).

---

## Global Rules

### Color Palette

| Role | Hex | Token / Utility |
|------|-----|-----------------|
| Primary (brand deep green) | `#29685B` | `bg-primary` / `--primary` / `--pw-primary` |
| Primary hover | `#1C4E44` | `bg-primary-hover` / `--primary-hover` |
| Mint accent (dark-mode primary) | `#89D9B2` | `text-mint` / `--color-mint` |
| Primary soft tint | `#DCEBDA` | `bg-primary-soft` |
| Primary pale tint | `#F0FDF4` | `bg-primary-tint` |
| Canvas / page background | `#F8FAFC` | `colors.neutral[50]` |
| Card border | `#E2E8F0` | `border-[#E2E8F0]` / `colors.neutral[200]` |
| Text — headings | `#0F172A` | `colors.neutral[900]` |
| Text — body | `#475569` | `colors.neutral[600]` |
| Text — muted | `#64748B` | `colors.neutral[500]` |

**Status colors** (semantic — never repaint these with brand green):

| Status | Background | Text | Fill / Icon |
|--------|-----------|------|-------------|
| OK / success | `#DCEBDA` / `#F0FDF4` | `#166534` | `#29685B` |
| Warning / expiring | `#FEF3C7` | `#B45309` | `#F59E0B` (amber is **warning status only**, never a brand color) |
| Critical / error | `#FEF2F2` | `#B91C1C` | `#EF4444` |
| Info | `#EFF6FF` | `#1E40AF` | — |
| AI | `#EEF2FF` | `#4F46E5` | — |

**Color Notes:** Deep green trust + mint freshness on a slate-neutral canvas. Blue is reserved for info and AI surfaces only — it is not a brand accent. No multi-hue gradients anywhere.

### Dark Mode

The single most important rule: **primary flips to mint in dark mode.**

- `bg-primary` resolves to `#29685B` (white foreground) in light mode and `#89D9B2` in dark mode with near-black text `#1A2420` on the fill.
- Hover in dark mode lightens to `#7de8ba` (via `--primary-hover`).
- Surfaces go near-black (see `.dark` block in `app/globals.css`); cards keep their 16px radius and pick up dark surface variables via `.pw-card` / `.arc-card`.
- Never hardcode white text on a primary fill — use `text-primary-foreground` (or the `.pw-primary-button` / `.arc-btn-primary` utilities) so the flip stays correct.

### Typography

- **Font:** Inter, weights 400–700, `latin` + `greek` subsets, loaded via `next/font/google` in `app/layout.tsx` and exposed as `--font-inter`.
- **Heading Font:** Inter (600–700)
- **Body Font:** Inter (400–500)
- **Mood:** financial, trustworthy, professional, modern, calm
- Do **not** add a CSS `@import` for fonts — `next/font` handles loading, subsetting, and `display: swap`. Micro-scale type for widgets (11–13px labels, 18px KPI values) lives in `typography` in `design-tokens.ts`.

### Radii

| Element | Value | Utility |
|---------|-------|---------|
| Cards / widgets | `16px` | `rounded-2xl` (`radius.card`) |
| Row tiles, banners | `12px` | `rounded-xl` (`radius.row`) |
| Icon avatars | `8px` | `rounded-lg` (`radius.avatar`) |
| Badges, chips, pill buttons | full | `rounded-full` (`radius.badge`) |
| shadcn base radius | `0.75rem` | `--radius` (drives `rounded-sm/md/lg` passthroughs) |

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

Component-level spacing (widget padding `p-5`, row padding `p-2.5`, etc.) is tabulated in `spacing` in `design-tokens.ts`.

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--pw-shadow-card` | `0 16px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(15,23,42,0.04)` | Cards, widgets (`shadow.widget`) |
| `--pw-shadow-card-hover` | `0 24px 64px rgba(0,0,0,0.09), 0 0 0 1px rgba(15,23,42,0.04)` | Card hover, hero widgets (`shadow.widgetHero`) |
| `shadow-md` | Tailwind default | Floating badges (`shadow.badge`) |

The soft 1px slate ring baked into the card shadow replaces heavy borders — pair with `border-[#E2E8F0]` only where a hairline is explicitly wanted.

---

## Semantic Tokens — what developers must use

Style through the runtime tokens in `app/globals.css`, never raw palette values:

- **`bg-primary` / `text-primary-foreground` / `bg-primary-hover`** — brand fills and their hover. These flip to mint automatically in dark mode.
- **`bg-primary-soft`** (`#DCEBDA`) and **`bg-primary-tint`** (`#F0FDF4`) — green-tinted surfaces for success chips and highlighted rows.
- **`text-mint`** (`#89D9B2`) — mint accents on dark surfaces.
- **`ring-primary`** — focus rings.
- **`.pw-card`** — the standard card: white surface, `rounded-2xl`, `--pw-shadow-card`, dark-mode-aware. **`.pw-pill`** for pill badges, **`.pw-primary-button`** for the primary CTA, and the **`.arc-*`** utilities (`.arc-card`, `.arc-btn-primary`, `.arc-btn-secondary`, `.arc-btn-neutral`) for the dashboard shell.
- **`border-[#E2E8F0]`** — the one sanctioned hairline border color on light surfaces.
- In TS/TSX where a literal is unavoidable, import from `components/ui/design-tokens.ts` (`colors`, `severityStyles`, `gapSeverityStyles`, `radius`, `shadow`).

---

## Component Specs

### Buttons

```css
/* Primary Button — or just use .pw-primary-button / .arc-btn-primary */
.btn-primary {
  background: #29685B;            /* dark mode: #89D9B2 with #1A2420 text */
  color: white;
  padding: 12px 24px;
  border-radius: 9999px;          /* pill */
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  background: #1C4E44;            /* dark mode: #7de8ba */
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #29685B;
  border: 1px solid #E2E8F0;
  padding: 12px 24px;
  border-radius: 9999px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F0FDF4;
}
```

### Cards

```css
/* Prefer the .pw-card utility — this is what it resolves to */
.card {
  background: #ffffff;            /* near-black surface in dark mode */
  border-radius: 16px;            /* rounded-2xl */
  padding: 24px;
  box-shadow: var(--pw-shadow-card);
  transition: all 200ms ease;
}

.card:hover {
  box-shadow: var(--pw-shadow-card-hover);
  transform: translateY(-2px);
}
```

### Badges / Pills

```css
/* Prefer the .pw-pill utility */
.pill {
  border-radius: 9999px;          /* rounded-full — always */
  padding: 4px 12px;
  font-weight: 600;
}

/* Status pills use the status pairs verbatim: */
.pill-ok       { background: #DCEBDA; color: #166534; }
.pill-warning  { background: #FEF3C7; color: #B45309; }
.pill-critical { background: #FEF2F2; color: #B91C1C; }
.pill-info     { background: #EFF6FF; color: #1E40AF; }
.pill-ai       { background: #EEF2FF; color: #4F46E5; }
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #29685B;          /* or use ring-primary */
  outline: none;
  box-shadow: 0 0 0 3px rgba(41, 104, 91, 0.15);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--pw-shadow-card-hover);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Trust & Authority

**Keywords:** Certificates/badges displayed, expert credentials, case studies with metrics, before/after comparisons, industry recognition, security badges

**Best For:** Healthcare/medical landing pages, financial services, enterprise software, premium/luxury products, legal services

**Key Effects:** Badge hover effects, metric pulse animations, staggered entry transitions (`animation.stagger` in `design-tokens.ts`), smooth stat reveal

### Page Pattern

**Pattern Name:** Pricing-Focused Landing

- **Conversion Strategy:** Annual discount 20-30%. Recommend mid-tier (most popular badge). Address objections in FAQ.
- **CTA Placement:** Each pricing card + Sticky CTA in nav + Bottom
- **Section Order:** 1. Hero (value proposition), 2. Pricing cards (3 tiers), 3. Feature comparison, 4. FAQ, 5. Final CTA

---

## Anti-Patterns (Do NOT Use)

- ❌ **Hardcoded `teal-*` / `emerald-*` utilities or `#1FDC86`** — those belong to the retired palette. Use `bg-primary` / `bg-primary-soft` / `bg-primary-tint` / `text-mint` instead.
- ❌ **Multi-hue gradients** — no `linear-gradient` blending two different hues (incl. the old teal header gradient and AI purple/pink gradients). Brand fills are solid `#29685B`.
- ❌ **Blue as a brand accent** — blue is only for info (`#EFF6FF`/`#1E40AF`) and AI (`#EEF2FF`/`#4F46E5`) surfaces.
- ❌ **Repainting status colors** — amber warning and red critical pairs are semantic; never swap them for brand green, and never use amber `#F59E0B` as anything other than warning status.
- ❌ **Hardcoded white/dark text on primary fills** — breaks the dark-mode mint flip; use `text-primary-foreground` or the button utilities.
- ❌ Confusing pricing
- ❌ No trust signals

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y (`ring-primary`)

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Brand color usage goes through semantic tokens (`bg-primary`, `bg-primary-soft`, `bg-primary-tint`, `text-mint`, `ring-primary`, `.pw-card`) — no raw `teal-*`/`emerald-*`/hex greens
- [ ] Dark mode checked: primary fills flip to mint with `#1A2420` text, surfaces go near-black
- [ ] No multi-hue gradients; blue appears only on info/AI surfaces; amber/red only as status
- [ ] Cards are `rounded-2xl` with `--pw-shadow-card`; badges/chips are `rounded-full`
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
