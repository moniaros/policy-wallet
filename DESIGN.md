---
name: PolicyWallet
description: Independent personal risk intelligence for the Greek market — reads your insurance and shows where cover ends.
colors:
  ledger-green: "#29685B"
  ledger-green-deep: "#1C4E44"
  signal-mint: "#89D9B2"
  signal-mint-deep: "#7de8ba"
  mint-edge: "#A7F3D0"
  trust-forest: "#143B33"
  green-soft: "#DCEBDA"
  green-tint: "#F0FDF4"
  green-wash: "#ECFDF5"
  cta-dark: "#1A2420"
  reading-slate: "#5b6a7a"
  body-slate: "#475569"
  ink: "#0f172a"
  paper: "#ffffff"
  canvas: "#f8fafc"
  hush: "#f1f5f9"
  rule: "#e2e8f0"
  surface-night: "#111111"
  status-ok-bg: "#DCEBDA"
  status-ok-fg: "#166534"
  status-warning-bg: "#FEF3C7"
  status-warning-fg: "#B45309"
  status-critical-bg: "#FEF2F2"
  status-critical-fg: "#B91C1C"
  status-info-bg: "#EFF6FF"
  status-info-fg: "#1E40AF"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 600
    lineHeight: 1.05
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.12
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  body-long:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.24em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.75rem"
  card: "16px"
  pill: "9999px"
spacing:
  tight: "12px"
  snug: "16px"
  base: "24px"
  roomy: "32px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-green}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.ledger-green-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "16px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "1rem"
    padding: "16px 24px"
    typography: "{typography.body}"
  pill:
    backgroundColor: "transparent"
    textColor: "{colors.reading-slate}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
    typography: "{typography.label}"
---

# Design System: PolicyWallet

## Overview

**Creative North Star: "The Plain-Spoken Auditor"**

PolicyWallet reads a document you already own and tells you what it actually says. It sells no insurance and takes no commission, so it has no stake in the answer — and the design exists to make that legible. The auditor's register is methodical and unglamorous: every element earns its place by carrying information, and restraint reads as rigour rather than as taste. Nothing here decorates.

The character is **calm authority, never clinical**. The visitor often arrives anxious, sometimes faintly ashamed of not understanding what they bought. The system reassures by being unhurried — generous spacing, soft geometry, a single quiet green — rather than by being chummy. Warmth lives in the green and in the room around things, not in exclamation.

The binding anti-reference is **the fintech dashboard**: two-digit grades, progress rings, gradient KPI tiles, percentage scores. This has already been fought once in this codebase — the marketing product mock removed its "Protection Score: 84%" on the grounds that *a stranger cannot check any of those numbers*, so it read as decoration rather than evidence. That judgment is now doctrine. A number appears only when the reader can verify it.

**Key Characteristics:**
- One deep green, used sparingly, doing all the persuading
- Flat surfaces separated by hairline rules, never by resting shadow
- A single typeface carrying a twelve-step size ladder and four weights
- Greek-first typography; English must occupy the same space, not a looser paraphrase
- Amber means "gap" and nothing else; blue is reserved for info and AI
- No imagery is currently part of the system — an open decision, not a principle

## Colors

A deep, desaturated green doing trust work on a slate-neutral canvas, with a mint counterpart that carries the same voice onto dark surfaces.

### Primary
- **Ledger Green** (`#29685B`): the record-keeper's ink. Primary actions, active states, focus rings, and the one accent allowed to mean "this is the product speaking". Deepens to **Ledger Green Deep** (`#1C4E44`) on hover.
- **Signal Mint** (`#89D9B2`): not a second brand colour — it *is* Ledger Green, transposed for dark mode. `--primary` resolves to it under `.dark`, where the deep green would sink into black. Its foreground partner darkens to `#1A2420` accordingly.
- **Mint Edge** (`#A7F3D0`): the family's lightest member, and an **edge colour only** — the card's hover border, the checked chip's dot, the accent on dark surfaces. It marks a boundary or a state; it is never a fill behind text and never a third brand colour.

### Secondary
- **Trust Forest** (`#143B33`): the deepest green, for high-commitment surfaces and the trust register. Shifts to `#173330` in dark mode.
- **CTA Dark** (`#1A2420`): a near-black green used for full-bleed closing bands. Deliberately identical in both themes — these panels are always dark by design.

### Tertiary
- **Green Soft** (`#DCEBDA`), **Green Tint** (`#F0FDF4`) and **Green Wash** (`#ECFDF5`): the tinted surfaces behind positive states, icon chips and highlighted rows, lightest last.

### Neutral
- **Ink** (`#0f172a`): primary text.
- **Body Slate** (`#475569`): the workhorse — the most-used text colour on the marketing surface, carrying paragraphs and card copy. Sits between Ink and Reading Slate.
- **Reading Slate** (`#5b6a7a`): secondary and meta text — deliberately darkened from slate-500 so it still clears 4.5:1 on tinted cards, not only on white. This is the single most common near-floor pair in the product; treat it as the floor, not a starting point.

The full slate ramp (`--color-neutral-50` … `-950`) is available for steps these five don't name; anything outside it is a new system colour and needs a decision, not a hex.
- **Paper** (`#ffffff`), **Canvas** (`#f8fafc`), **Hush** (`#f1f5f9`): the three-step surface ladder that carries page banding.
- **Rule** (`#e2e8f0`): hairline borders and dividers. Becomes `rgba(255,255,255,0.14)` in dark mode.
- **Surface Night** (`#111111`) on a pure-black page: the dark-mode card and its ground.

### Status
Semantic pairs, used verbatim, never repainted with brand green: **ok** `#DCEBDA`/`#166534` · **warning** `#FEF3C7`/`#B45309` · **critical** `#FEF2F2`/`#B91C1C` · **info** `#EFF6FF`/`#1E40AF`.

### Named Rules

**The One Voice Rule.** Ledger Green is the only accent that speaks for the product. It appears on primary actions, focus, and active state — nowhere else. Its rarity is what makes a green button mean something.

**The Amber Means Gap Rule.** Amber is warning status only. It never becomes a brand colour, a highlight, or a decorative tint. On this product a gap in cover is the thing the reader is here to find; giving that colour a second job blunts the only alarm the system has.

**The Mint Is Not A Second Brand Rule.** Signal Mint exists because Ledger Green is illegible on black. Never place them side by side as a two-colour palette, and never hardcode `#29685B` where `--primary` would do — a hardcoded green cannot flip, and a mint fill under hardcoded white text fails contrast.

**The Blue Is Borrowed Rule.** Blue belongs to info and AI surfaces only. It is not a brand accent and must never carry a call to action.

## Typography

**Display / Body Font:** Inter (with `system-ui`, sans-serif)
**Mono Font:** JetBrains Mono — for identifiers, IP addresses, policy numbers and measured values only

**Character:** One typeface, worked hard. Hierarchy comes from a twelve-step size ladder and four weights (400/500/600/700) rather than from contrast between families. Headings tighten as they grow — leading runs 1.05 at display and opens to 1.65 for long-form body — so large type reads as composed rather than airy.

### Hierarchy
- **Display** (600, 3.5rem/56px, 1.05): hero only. One per page, never below the fold.
- **Headline** (600, 2.75rem/44px, 1.12): page titles and major section heads.
- **Title** (600, 1.25rem/20px, 1.35): card titles and sub-headings.
- **Body** (400, 0.875rem/14px, 1.6): default UI body.
- **Body long** (400, 1rem/16px, 1.65): marketing and long-form prose. Target a 65–75ch measure.
- **Label** (700, 0.625rem/10px, 0.24em tracking, uppercase): the eyebrow/pill micro-label.
- **Caption** (0.75rem/12px, 1.5) is the **smallest functional size**. Below it, `micro` (11px) and `label` (10px) are decorative or dense-table only.

### Named Rules

**The Twelve-Px Floor Rule.** Nothing a reader must act on is set below 12px. 11px and 10px exist for dense table meta and uppercase eyebrows — never for a sentence, a control label, or a price.

**The No Arbitrary Size Rule.** Type sizes come from the ladder. `text-[Npx]` is a build failure, enforced by unit test.

**The Weight Ceiling Rule.** `font-bold` (700) is the ceiling; inside cards prefer `font-semibold` (600). `font-black` (900) is off the ladder entirely.

**The Greek Sets The Measure Rule.** Greek is the authoritative language and runs longer than English. Size every line, button and column against the Greek string; if it only fits in English, it does not fit.

## Layout

One page-width primitive with four ceilings and a single gutter that never changes: `px-4 sm:px-6 lg:px-8` at every width. Ceilings are **reading** (680px, legal and article prose), **form** (900px, single-column flows), **page** (1240px, standard content) and **page-wide** (1400px, dense dashboards that genuinely need the room).

Density is a three-step scale applied to cards and rows: tight (`p-3 sm:p-4`), default (`p-4 sm:p-6`), roomy (`p-6 sm:p-8`). Vertical rhythm inside a card is tight-group / generous-separation, with more space above a heading than below it.

Responsive behaviour has **one breakpoint boundary: 1024px (`lg`)**, exported as a constant so JS and CSS agree. Presentation switches in CSS — render both arrangements and toggle with `lg:hidden` / `hidden lg:block` — never by measuring the viewport in JavaScript. Grids start at one or two columns and step up; a bare `grid-cols-3` is a build failure.

Touch targets are enforced by an unlayered base rule below 768px: inputs, selects and buttons clear 44px and inputs take 16px type so iOS does not zoom. Above that, WCAG 2.2's 24px minimum applies, satisfied either by size or by spacing.

## Elevation & Depth

**Flat at rest; depth is a response, not a decoration.** Surfaces are separated by a 1px hairline rule and a three-step neutral ladder, never by a resting shadow. Shadow appears only as feedback to state.

In dark mode shadows are invisible, so the same job is done by a 1px inner ring — the dark theme's equivalent of "flat", not an absence of the treatment.

### Shadow Vocabulary
- **Card hover** (`0 8px 24px rgba(41, 104, 91, 0.08)`, with `translateY(-2px)` and the border shifting to `#A7F3D0`): the only shadow a resting surface ever earns, and only on hover.
- **Overlay** (`shadow-2xl`): modals, drawers and floating bars, where the element genuinely sits above the page.
- **Dark card** (`0 0 0 1px rgba(255,255,255,0.08)`): an inner ring standing in for the light theme's border.

### Named Rules

**The Flat-By-Default Rule.** A surface at rest has `box-shadow: none`. If a card needs a shadow to be findable, the problem is its border or the ground beneath it.

**The Offset-And-Blur Rule.** Any shadow that ships carries both an offset and a soft blur. A zero-offset coloured halo is decoration, not depth.

## Shapes

A soft, fully-resolved geometry with one deliberate extreme: buttons and chips are **fully round** (`9999px`), while surfaces are gently curved.

- **Cards and widgets:** 16px.
- **Row tiles, banners and callouts:** 12px.
- **Icon chips:** 10px — a 36px tinted square holding a 16px glyph.
- **Buttons, pills, badges:** fully round.
- **Modals:** 32px, the softest corner in the system, marking the one surface that floats free of the page.

Borders are hairlines. A coloured border thicker than 1px on a card, list item or callout is not part of this language.

## Components

### Buttons
- **Shape:** fully round (`9999px`), with `12px 20px` padding and a 44px floor on mobile.
- **Primary:** Ledger Green fill, white text — and in dark mode Signal Mint fill with near-black text, resolved through `--primary` / `--primary-foreground`. Never hardcode the fill or the text colour together; that pairing breaks the mint flip.
- **Hover / Focus:** background deepens to Ledger Green Deep over 150ms. Focus-visible ships a two-part ring — 2px white then 2px Ledger Green — so it survives on both light and dark grounds.
- **Secondary:** transparent with a hairline rule and ink text; the same shape and padding.
- **Inverse variants** exist for dark and product-family panels; the mint fill is reserved for those panels by explicit decision.

### Cards
- **Corner:** 16px. **Background:** Paper on light, Surface Night on a black ground.
- **Border:** 1px Rule. **Shadow:** none at rest (see Elevation).
- **Padding:** the three-step density scale. Cards carry no padding of their own — it is applied, so the same card can be tight in a list and roomy as a feature.
- **Nested cards are not part of this system.**

### Inputs
- **Style:** borderless on a tinted fill (Canvas), 16px radius, roomy `16px 24px` padding, no fixed height.
- **Focus:** a 4px Ledger Green ring at 10% opacity — a glow, not a border shift.
- **Invalid:** driven by `aria-invalid` on the control itself, which paints a red ring; the message sits inline beside the field, never only in a toast.
- Every input has a real `<label>` or an `aria-label`. There are no exceptions.

### Chips and Pills
- Fully round, hairline border, Reading Slate label text at 10px uppercase with 0.24em tracking.
- Status pills use the semantic pairs verbatim and are never restyled with brand green.

### Navigation
- App shell: a fixed sidebar at `lg+` that becomes a focus-trapped drawer below it, plus a bottom bar on mobile with 44px targets and safe-area inset. Active state carries a tinted ground *and* a weight change — never colour alone.
- Marketing: a floating pill header with the wordmark, section links, a Greek/English toggle and one primary action.

### Signature: the honest empty state
The system's most distinctive component is not decorative. Where data is missing, the product says what is missing, why, and what would fill it — rather than showing a zero, a placeholder chart, or a skeleton that never resolves. This is the same doctrine as the anti-reference: an unverifiable number is worse than an absent one.

## Do's and Don'ts

### Do:
- **Do** read colour from `--primary` / `--foreground` / `--border` so dark mode resolves itself. A hardcoded hex cannot flip.
- **Do** pair a brand fill with `--primary-foreground`, never with a hardcoded `text-white`.
- **Do** keep surfaces flat at rest and let shadow answer to state.
- **Do** size every string against the Greek, then confirm English fits the same space.
- **Do** use the type ladder and the three-step density scale; both are enforced by unit tests.
- **Do** state a limit as a fact the reader can check ("1 policy", "resets 1 September"), not as a grade.
- **Do** give status colour a second, non-colour cue — an icon or a word — so meaning never rests on hue alone.

### Don't:
- **Don't** ship a score, a grade, a progress ring or a percentage the reader cannot verify. This is the binding anti-reference.
- **Don't** introduce `emerald-*`, `teal-*` or a second green. There is one brand green and one dark-mode transposition of it.
- **Don't** use amber for anything but a gap or a warning, or blue for anything but info and AI.
- **Don't** put a resting shadow on a card, a coloured border above 1px on a callout, or a card inside a card.
- **Don't** set functional text below 12px, use `font-black`, or write an arbitrary `text-[Npx]`.
- **Don't** render a control for a capability the product does not have. An absent control is honest; a dead one is not.
- **Don't** add a second implementation of a control that already exists — one switch, one page-width primitive, one language toggle, one confirm dialog.
