# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** PolicyWallet
**Updated:** 2026-07-23
**Category:** Insurance Platform

> **Canonical value table:** [app/globals.css](../../app/globals.css) — every hex, radius, shadow, and utility below is defined there, as CSS custom properties (`--primary`, `--pw-*`) and `@layer components` utilities (`.pw-card`, `.pw-pill`, `.pw-primary-button`, `.pw-kicker`). If this document and `globals.css` ever disagree, **`globals.css` wins** — it is what actually ships.
>
> There is **no `components/ui/design-tokens.ts`**; it was deleted in `834957c`. Do not import from it, and do not add a parallel TS token table — extend `globals.css` instead.
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
| Canvas / page background | `#F8FAFC` | `bg-neutral-50` / `.pw-page-shell` |
| Card border | `#E2E8F0` | `border-border` / `--pw-border` / `bg-neutral-200` |
| Text — headings | `#0F172A` | `text-foreground` / `neutral-900` |
| Text — body | `#475569` | `neutral-600` |
| Text — muted | `#64748B` | `text-muted-foreground` / `--pw-text-muted` / `neutral-500` |

The `neutral-*` scale is remapped to slate in the `@theme` block (`--color-neutral-50 … --color-neutral-950`), so `neutral-N` **is** slate-N. Prefer the semantic role tokens (`text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`) over the numeric scale where a role exists — only they flip correctly in dark mode.

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
- Surfaces go near-black (see `.dark` block in `app/globals.css`); cards keep their 16px radius and pick up dark surface variables via `.pw-card`.
- Never hardcode white text on a primary fill — use `text-primary-foreground` (or the `.pw-primary-button` utility) so the flip stays correct.

### Typography

- **Font:** Inter, weights 400–700, `latin` + `greek` subsets, loaded via `next/font/google` in `app/layout.tsx` and exposed as `--font-inter`.
- **Heading Font:** Inter (600–700)
- **Body Font:** Inter (400–500)
- **Mood:** financial, trustworthy, professional, modern, calm
- Do **not** add a CSS `@import` for fonts — `next/font` handles loading, subsetting, and `display: swap`.
- Micro-scale type for widgets (11–13px labels, 18px KPI values) has no token table — use Tailwind's scale (`text-[11px]`, `text-xs`, `text-lg`) directly.
- `font-black` (900) is **not** in the ladder — the heaviest sanctioned weight is `font-bold` (700). Use `font-semibold` (600) for headings inside cards, overlays, and modals.
- The uppercase micro-label is the **`.pw-kicker`** utility — use it instead of re-rolling `text-[10px] uppercase tracking-widest`.

### Radii

| Element | Value | Utility |
|---------|-------|---------|
| Cards / widgets | `16px` | `--pw-radius-card` (baked into `.pw-card`) / `rounded-2xl` |
| Row tiles, banners | `12px` | `rounded-xl` |
| Icon avatars | `8px` | `rounded-lg` |
| Badges, chips, pill buttons | full | `--pw-radius-button` = `9999px` / `rounded-full` |
| shadcn base radius | `0.75rem` | `--radius` (drives `rounded-sm/md/lg` passthroughs) |

### Spacing

There are **no `--space-*` CSS variables** — spacing is Tailwind's default scale, used directly. The rhythm to follow:

| Context | Value |
|---------|-------|
| Card / widget padding | `p-5` (widgets) to `p-6` (standard cards) |
| Row / list-item padding | `p-2.5` – `p-4` |
| Page gutter | `px-4 sm:px-6 lg:px-8` |
| Section vertical rhythm (marketing) | `pt-28/36 · py-20/28`, band `py-16` |
| Icon / inline gaps | `gap-2` – `gap-3` |

### Shadow Depths

`.pw-card` is **border-first and flat at rest** — no resting shadow. This is deliberate: it mirrors the public marketing site, and the old heavy resting shadow read as a boxier, different product.

| State | Value |
|-------|-------|
| Card at rest (light) | `box-shadow: none` + `1px solid var(--pw-border)` |
| Card at rest (dark) | inner ring `0 0 0 1px rgba(255,255,255,0.08)` (shadows are invisible on dark) |
| Card hover | `translateY(-2px)`, border → `#A7F3D0` (dark: `rgba(137,217,178,0.5)`), `0 8px 24px rgba(41,104,91,0.08)` |
| Floating badges / overlays | `shadow-md` / `shadow-2xl` (Tailwind defaults) |

> ⚠️ `--pw-shadow-card` and `--pw-shadow-card-hover` are still **declared** in `globals.css` but are **referenced by nothing**. Do not build on them; they are slated for removal.

---

## Semantic Tokens — what developers must use

Style through the runtime tokens in `app/globals.css`, never raw palette values:

- **`bg-primary` / `text-primary-foreground` / `bg-primary-hover`** — brand fills and their hover. These flip to mint automatically in dark mode.
- **`bg-primary-soft`** (`#DCEBDA`) and **`bg-primary-tint`** (`#F0FDF4`) — green-tinted surfaces for success chips and highlighted rows.
- **`text-mint`** (`#89D9B2`) — mint accents on dark surfaces.
- **`ring-primary`** — focus rings.
- **`.pw-card`** — the standard card: white surface, 16px radius, border-first and flat at rest (see Shadow Depths), dark-mode-aware. **`.pw-pill`** for pill badges, **`.pw-primary-button`** for the primary CTA. (`.arc-card` was a byte-for-byte duplicate of `.pw-card` and has been deleted; the remaining `.arc-btn*` utilities are `rounded-xl` and still contradict the pill rule — retiring them is tracked in the UI-foundation backlog.)
- **`border-border`** (resolves to `#E2E8F0` light / `rgba(255,255,255,0.14)` dark) — the sanctioned hairline. Prefer it over the literal `border-[#E2E8F0]`, which does not flip in dark mode.
- In TS/TSX, a raw hex literal has **no sanctioned escape hatch** — there is no token module to import from. If you need a value the utilities don't cover, add it to `globals.css` as a variable and reference it, rather than inlining a hex.

---

## Component Specs

### Buttons

```css
/* Primary Button — or just use .pw-primary-button */
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

**Use the `.pw-card` utility.** It is border-first and flat at rest — this is what it actually resolves to:

```css
.pw-card {
  border-radius: var(--pw-radius-card);   /* 16px */
  border: 1px solid var(--pw-border);     /* #E2E8F0 light */
  background: var(--pw-bg-light);         /* #ffffff — #111111 in dark */
  box-shadow: none;                       /* dark: inset ring, see above */
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}

.pw-card:hover {
  transform: translateY(-2px);
  border-color: #A7F3D0;
  box-shadow: 0 8px 24px rgba(41, 104, 91, 0.08);
}
```

`.pw-card` carries **no padding** — add your own (`p-5`/`p-6`).

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

> ⚠️ **There is no shared Input/Select/Textarea/Label primitive yet** — ~111 raw `<input>` elements across 33 files hand-roll their styling. Building one is tracked in the UI-foundation backlog (see `docs/audits/ui-foundation-audit-2026-07.md`). Until it lands, match the dominant shipped recipe rather than the older 12px-radius spec that used to live here:

```
w-full h-14 px-6
bg-neutral-50 dark:bg-neutral-800
border-none rounded-2xl
outline-none focus:ring-4 focus:ring-primary/10
transition-all text-sm font-bold
```

Every input needs a real `<label>` (or `aria-label`) and a visible focus ring — the `focus:ring-4 focus:ring-primary/10` above is the sanctioned one.

### Modals

**Use the shared `components/ui/Modal.tsx`**, which wraps `hooks/useDialog.ts` (focus trap, Escape, scroll-lock, focus restore). Do **not** hand-roll a `fixed inset-0` overlay — ~25 already exist and none of them are accessible.

What the shared modal resolves to:

```css
/* Backdrop */
.modal-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.4);            /* dark: rgba(0,0,0,0.6) */
  backdrop-filter: blur(4px);
}

/* Panel — centred, gutter-safe on mobile */
.modal {
  position: fixed; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  width: calc(100% - 2rem);                /* 1rem gutter each side */
  max-width: 32rem;                        /* max-w-lg */
  max-height: 90vh; overflow-y: auto;
  background: var(--card);
  border-radius: 32px;
  box-shadow: var(--tw-shadow-2xl);
}
```

Every modal MUST have an accessible name — pass `ariaLabel`, or `ariaLabelledBy` pointing at an `id` that exists in **every** view the modal can render.

---

## Style Guidelines

**Style:** Trust & Authority

**Keywords:** Certificates/badges displayed, expert credentials, case studies with metrics, before/after comparisons, industry recognition, security badges

**Best For:** Healthcare/medical landing pages, financial services, enterprise software, premium/luxury products, legal services

**Key Effects:** Badge hover effects, metric pulse animations, staggered entry transitions (framer-motion, per-component `delay` — there is no shared stagger token), smooth stat reveal

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
- ❌ **`font-black` (900)** — off the ladder. `font-bold` is the ceiling; prefer `font-semibold` inside cards and overlays.
- ❌ **Hand-rolled `fixed inset-0` modals/overlays** — use `components/ui/Modal.tsx`. Hand-rolled ones ship without focus trap, Escape, scroll-lock, or an accessible name.
- ❌ **Importing from `components/ui/design-tokens.ts`** — the file does not exist (deleted in `834957c`).
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
