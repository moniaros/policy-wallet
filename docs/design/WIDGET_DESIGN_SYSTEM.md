# PolicyWallet Widget Design System

> Canonical reference for all interactive UI widgets used on public marketing pages, the agent solutions page, and the main landing page. Derived from `AgentWidgets.tsx`, `PolicyWalletWidget.tsx`, `AudienceTabs.tsx`, and `WorldClassLanding.tsx`.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Sizing](#4-spacing--sizing)
5. [Elevation & Borders](#5-elevation--borders)
6. [Animation System](#6-animation-system)
7. [Component Patterns](#7-component-patterns)
   - [Browser Chrome Wrapper](#71-browser-chrome-wrapper)
   - [KPI Tiles](#72-kpi-tiles)
   - [Client / Entity Rows](#73-client--entity-rows)
   - [Progress Bars](#74-progress-bars)
   - [Status Badges / Chips](#75-status-badges--chips)
   - [Scan Progress Bar](#76-scan-progress-bar)
   - [Action Buttons](#77-action-buttons)
   - [Floating Badges](#78-floating-badges)
   - [Alert / Notice Banners](#79-alert--notice-banners)
8. [Widget Catalog](#8-widget-catalog)
   - [PolicyWalletWidget](#81-policywalletwidget)
   - [ClientPortfolioDashboardWidget](#82-clientportfoliodashboardwidget)
   - [GapAnalysisWidget](#83-gapanalysiswidget)
   - [RenewalReminderWidget](#84-renewalreminderwidget)
   - [BrandedReportWidget](#85-brandedreportwidget)
9. [Severity System](#9-severity-system)
10. [Bilingual Pattern](#10-bilingual-pattern)
11. [Accessibility Checklist](#11-accessibility-checklist)
12. [Anti-patterns](#12-anti-patterns)

---

## 1. Design Philosophy

PolicyWallet widgets are **product demos embedded in marketing pages**. They communicate the product's value by showing realistic (but static/animated) UI rather than screenshots, so they must:

| Principle | Implication |
|---|---|
| **Look like the real app** | Use the same color tokens, radius values, and font sizes as the dashboard |
| **Animate on mount** | Stagger child elements to draw the eye and imply live data loading |
| **Be self-contained** | No external data fetching; all data is hardcoded demo values |
| **Be interactive where it adds value** | Clickable buttons (e.g., Send Reminder) reinforce the feature story |
| **Respect language context** | Every string is bilingual via the `t(el, en)` helper |
| **Stay lightweight** | No heavy libraries; pure React state + CSS transitions |

---

## 2. Color System

### Brand Primaries

| Token | Hex | Usage |
|---|---|---|
| `brand-primary` | `#29685B` | Primary actions, active states, badges, progress bars, branded headers |
| `brand-primary-hover` | `#1C4E44` | Hover state on primary buttons |
| `brand-primary-light` | `#ECFDF5` | Light green backgrounds (AI badge, success states) |
| `brand-primary-border` | `#A7F3D0` | Borders on green-tinted surfaces |
| `brand-primary-dark` | `#166534` | Dark green text on light green surfaces |

> Note: The global CSS defines `--pw-primary: #1fdc86` (brighter emerald) for the main app. Widgets use `#29685B` (deeper teal) specifically for the premium SaaS feel on public pages. Do not mix them.

### Semantic — Success

| Token | Hex | Usage |
|---|---|---|
| `success-bg` | `#F0FDF4` | Row backgrounds, sent-state button bg |
| `success-border` | `#DCEBDA` | Card borders for positive states |
| `success-text` | `#166534` | Text on success backgrounds |
| `success-icon` | `#22C55E` | Icon color for completion indicators |

### Semantic — Warning

| Token | Hex | Usage |
|---|---|---|
| `warning-bg` | `#FFFBEB` | Alert banner background |
| `warning-bg-chip` | `#FEF3C7` | Chip / badge background |
| `warning-border` | `#FDE68A` | Border on warning surfaces |
| `warning-text` | `#92400E` | Heading text in warning banners |
| `warning-text-light` | `#B45309` | Body text in warning banners; badge text |
| `warning-icon` | `#D97706` | Icon color for warning indicators |

### Semantic — Critical / Error

| Token | Hex | Usage |
|---|---|---|
| `critical-bg` | `#FEF2F2` | Row backgrounds, badge backgrounds |
| `critical-border` | `#FECACA` | Row borders for critical states |
| `critical-text` | `#B91C1C` | Text and icon color |

### Semantic — Info / AI

| Token | Hex | Usage |
|---|---|---|
| `info-bg` | `#EFF6FF` | AI suggestion box backgrounds |
| `info-border` | `#BFDBFE` | Medium-severity gap borders |
| `info-text` | `#1E40AF` | Medium-severity text |
| `ai-badge-bg` | `#EEF2FF` | AI tag chips |
| `ai-badge-text` | `#4F46E5` | AI label text |

### Neutral Scale (Slate)

| Token | Hex | Tailwind equivalent |
|---|---|---|
| `neutral-50` | `#F8FAFC` | `slate-50` — canvas, header bg |
| `neutral-100` | `#F1F5F9` | `slate-100` — progress bar tracks |
| `neutral-200` | `#E2E8F0` | `slate-200` — default borders, dividers |
| `neutral-300` | `#CBD5E1` | `slate-300` |
| `neutral-400` | `#94A3B8` | `slate-400` — secondary text, coverage% |
| `neutral-500` | `#64748B` | `slate-500` — muted text |
| `neutral-600` | `#475569` | `slate-600` — body copy |
| `neutral-900` | `#0F172A` | `slate-900` — headings, primary text |

### Browser Chrome Controls

Used only inside `BrowserChrome` component — never elsewhere.

| Dot | Hex |
|---|---|
| Red (close) | `#FF5F57` |
| Yellow (minimize) | `#FFBD2E` |
| Green (maximize) | `#28CA41` |

---

## 3. Typography

All widgets inherit the page font stack: `'GT America', 'IBM Plex Sans', 'Inter', sans-serif`.

| Role | Size | Weight | Color |
|---|---|---|---|
| Widget title (header) | `13px` | `600` (semibold) | `#0F172A` |
| Widget subtitle | `11px` | `400` | `#64748B` |
| KPI number | `18px` | `700` (bold) | `#0F172A` |
| KPI label | `10px` | `400` | `#64748B` |
| Row name | `12px–13px` | `600` | `#0F172A` |
| Row detail | `11px` | `400` | `#64748B` or `#94A3B8` |
| Badge text | `9px–11px` | `600–700` | Semantic color |
| Browser URL bar | `11px` | `400` | `#94A3B8`, `font-mono` |
| Section label (uppercase) | `10px` | `600` | `#94A3B8`, `tracking-wider` |
| Report body (premium) | `12–14px` | `400–600` | `#0F172A` |
| CTA button | `10px` | `700` | White or semantic |

---

## 4. Spacing & Sizing

### Padding

| Context | Value |
|---|---|
| Widget outer wrapper | `p-5` (20px) |
| Widget header | `px-4 py-3` |
| Row tile inner | `p-2.5` or `p-3` |
| Card content | `p-4` to `p-6` |
| Button pill inner | `px-2.5 py-1` or `px-3 py-1.5` |
| Badge / chip | `px-1.5 py-0.5` or `px-2 py-0.5` |

### Gap

| Context | Value |
|---|---|
| Between rows in a list | `space-y-2` |
| Between icon and text | `gap-2` to `gap-3` |
| Between KPI tiles | `gap-2` |
| Between badge items | `gap-1` to `gap-1.5` |

### Icon Sizing

| Context | Class |
|---|---|
| Row avatar icon | `h-5 w-5` |
| Row avatar container | `h-9 w-9` or `h-8 w-8` |
| Small inline icon | `h-3 w-3` or `h-3.5 w-3.5` |
| Banner icon | `h-4 w-4` |
| Button icon | `h-3 w-3` |

---

## 5. Elevation & Borders

### Widget Card (Outer)

```
shadow-[0_16px_48px_rgba(0,0,0,0.08),0_0_0_1px_rgba(15,23,42,0.04)]
```
The double-layer shadow creates depth (soft drop) + a very subtle inset border ring.

### Standard Border

```
border border-[#E2E8F0]
```
Used on all neutral rows, KPI tiles, and default article cards.

### Semantic Borders

Applied to rows/tiles based on state — see [Severity System](#9-severity-system).

### Border Radius

| Context | Class |
|---|---|
| Widget card outer | `rounded-2xl` |
| Row tile | `rounded-xl` |
| KPI tile | `rounded-xl` |
| Report header bar | `rounded-xl` (container), none on internal header |
| Avatar container | `rounded-lg` |
| Badge / chip | `rounded-full` |
| Browser URL bar | `rounded-md` |
| Button | `rounded-full` |

---

## 6. Animation System

### The Mount Pattern

Every widget uses the same three-step mount pattern:

```tsx
const [loaded, setLoaded] = useState(false)

useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 350)
    return () => clearTimeout(timer)
}, [])
```

**Why 350ms?** The page needs a render pass to paint before animation begins. 350ms ensures the initial state (`opacity-0 translate-y-3`) is committed before the transition fires, producing a clean fade-in.

### Stagger Formula

Each child element gets an incremental delay based on its position:

```
transitionDelay: `${index * stepMs + baseMs}ms`
```

| Widget | Step | Base | Effect |
|---|---|---|---|
| KPI tiles | 80ms | 400ms | 400, 480, 560 |
| Client rows | 100ms | 640ms | 640, 740, 840, 940 |
| Progress bars | 100ms | 900ms | 900, 1000, 1100… |
| Gap findings | 300ms | 1500ms | 1500, 1800, 2100 |
| Report rows | 150ms | 800ms | 800, 950, 1100 |
| Floating badges | explicit | 1100ms / 1300ms | fixed |

### Entry Transforms

| Element type | Initial state | Final state |
|---|---|---|
| Rows, tiles | `translate-y-3 opacity-0` | `translate-y-0 opacity-100` |
| Slide-in rows | `-translate-x-2 opacity-0` | `translate-x-0 opacity-100` |
| Floating badges (top) | `-translate-y-2 opacity-0` | `translate-y-0 opacity-100` |
| Floating badges (bottom) | `translate-y-2 opacity-0` | `translate-y-0 opacity-100` |
| Banners | `translate-y-2 opacity-0` | `translate-y-0 opacity-100` |

All use `transition-all duration-500`.

### Progress Bar Animation

```tsx
// Width drives the animation; delay staggers the start
style={{
    width: loaded ? `${value}%` : "0%",
    transitionDelay: `${index * 100 + 900}ms`,
}}
// className
"transition-all duration-1000 ease-out"
```

### Scan Progress (GapAnalysisWidget)

Uses a `setInterval` loop, not CSS transitions, to give realistic incremental progress:

```tsx
useEffect(() => {
    if (!loaded) return
    let val = 0
    const interval = setInterval(() => {
        val += 2
        setScanProgress(Math.min(val, 100))
        if (val >= 100) clearInterval(interval)
    }, 35)
    return () => clearInterval(interval)
}, [loaded])
```

Fires after `loaded` is set; runs for ~1.75s (50 ticks × 35ms) to reach 100%.

### Pulse Animations

Used for "live" status indicators only:

```
animate-pulse   → on scan status dot, AI badge dot, gap icon
```

Never apply `animate-pulse` to text or user-interactive elements.

### Reduced Motion

When adding new widgets, wrap CSS transitions with:

```css
@media (prefers-reduced-motion: reduce) {
    .transition-all { transition: none; }
}
```

Or in Tailwind:
```
motion-safe:transition-all motion-safe:duration-500
```

---

## 7. Component Patterns

### 7.1 Browser Chrome Wrapper

Renders a mock browser frame that signals "this is a real app."

```tsx
function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white
                        shadow-[0_16px_48px_rgba(0,0,0,0.08),0_0_0_1px_rgba(15,23,42,0.04)]">
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                {/* Traffic lights */}
                <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                </div>
                {/* URL bar */}
                <div className="ml-3 flex-1 rounded-md border border-[#E2E8F0] bg-white
                                px-3 py-1 font-mono text-[11px] text-[#94A3B8]">
                    {url}
                </div>
            </div>
            {children}
        </div>
    )
}
```

**Rules:**
- URL should look like `app.policywallet.gr/[route]`
- Always the outermost wrapper of a widget
- Content goes directly inside without additional padding wrappers

### 7.2 KPI Tiles

Three-column stat row at the top of portfolio/dashboard widgets.

```tsx
<div className="mb-4 grid grid-cols-3 gap-2">
    {stats.map((s, i) => (
        <div
            key={i}
            className={`rounded-xl border border-[#E2E8F0] p-2.5 text-center
                        transition-all duration-500
                        ${loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
            style={{ transitionDelay: `${i * 80 + 400}ms` }}
        >
            <p className="text-[18px] font-bold text-[#0F172A]">{s.value}</p>
            <p className="text-[10px] text-[#64748B]">{s.label}</p>
        </div>
    ))}
</div>
```

**Data shape:** `{ label: string; value: string }[]`
**Always 3 tiles.** If fewer stats are available, fill with placeholders.

### 7.3 Client / Entity Rows

Standard row pattern for any list of entities (clients, policies, renewals).

```tsx
<div className={`flex items-center gap-3 rounded-xl border p-2.5
                transition-all duration-500
                ${severityBorder}
                ${loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
     style={{ transitionDelay: `${i * 100 + 640}ms` }}>

    {/* Avatar: initial letter or icon */}
    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                     rounded-lg text-[11px] font-bold ${severityAvatarStyle}`}>
        {name.charAt(0)}
    </div>

    {/* Content */}
    <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[12px] font-semibold text-[#0F172A]">{name}</span>
            <StatusBadge type={severity} label={badge} />
        </div>
        <ProgressBar value={score} loaded={loaded} delay={i * 100 + 900} severity={severity} />
    </div>
</div>
```

**Key rules:**
- `min-w-0 flex-1` on the content div prevents text overflow in flex containers
- `truncate` on name text prevents long names from breaking layout
- `flex-shrink-0` on avatar and badge prevents them from compressing

### 7.4 Progress Bars

Coverage / protection score visualisation inside a row.

```tsx
<div className="flex items-center gap-2">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${fillColor}`}
            style={{
                width: loaded ? `${value}%` : "0%",
                transitionDelay: `${delay}ms`,
            }}
        />
    </div>
    <span className="text-[10px] font-medium text-[#94A3B8]">{value}%</span>
</div>
```

| Severity | Fill color |
|---|---|
| `ok` | `bg-[#29685B]` |
| `warn` | `bg-[#F59E0B]` |
| `critical` | `bg-[#EF4444]` |
| Expiring | `bg-[#F59E0B]` |

Track is always `bg-[#F1F5F9]`, height `h-1.5`.

### 7.5 Status Badges / Chips

Inline pills attached to entity names, states, or severity labels.

```tsx
<span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${chipStyle}`}>
    {label}
</span>
```

| State | bg | text |
|---|---|---|
| Active | `bg-[#F0FDF4]` | `text-[#166534]` |
| Expiring (warn) | `bg-[#FEF3C7]` | `text-[#B45309]` |
| Critical / gap | `bg-[#FEF2F2]` | `text-[#B91C1C]` |
| AI active | `bg-[#ECFDF5] border-[#A7F3D0]` | `text-[#29685B]` (has border) |
| Sent | `bg-[#F0FDF4]` | `text-[#166534]` |

Always `flex-shrink-0` when inside a flex row.

### 7.6 Scan Progress Bar

Full-width progress bar for the `GapAnalysisWidget` scanning animation.

```tsx
<div className="mb-2 flex items-center justify-between">
    <span className="text-[11px] font-medium text-[#475569]">{label}</span>
    <span className="text-[11px] font-bold text-[#0F172A]">{scanProgress}%</span>
</div>
<div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
    <div
        className="h-full rounded-full bg-[#29685B] transition-all duration-100 ease-linear"
        style={{ width: `${scanProgress}%` }}
    />
</div>
```

Note `duration-100 ease-linear` (not `duration-1000 ease-out`) — this makes incremental updates feel smooth rather than wobbly.

### 7.7 Action Buttons

Contextual buttons inside rows (e.g., Send Reminder, Fix gap).

#### Primary (send / action)
```tsx
<button className="rounded-full bg-[#29685B] px-2.5 py-1 text-[10px] font-semibold
                   text-white transition-all hover:bg-[#1C4E44]">
```

#### Completed state
```tsx
<button className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[10px] font-semibold
                   text-[#166534]">
    <CheckCircle2 className="h-3 w-3" />
    Sent
</button>
```

Toggle between states via local state (`useState`). Never disable a button after action — replace content instead.

#### Fix link (alert banner)
```tsx
<Link className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold
                 text-[#29685B] hover:bg-[#D1FAE5]
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-[#29685B]">
```

### 7.8 Floating Badges

Positioned absolutely around the widget card, in the outer padding zone. Used only in `PolicyWalletWidget`.

```tsx
{/* Outer container must have relative positioning + padding for badge room */}
<div className="relative mx-auto w-full max-w-[480px] px-5 pb-8 pt-5">
    {/* Widget card */}
    <div>...</div>

    {/* Top-right badge */}
    <div className={`absolute right-0 top-0 flex items-center gap-2 rounded-full
                     border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-md
                     transition-all duration-500
                     ${loaded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
         style={{ transitionDelay: "1100ms" }}>
        ...
    </div>

    {/* Bottom-left badge */}
    <div className={`absolute bottom-0 left-0 ...`}
         style={{ transitionDelay: "1300ms" }}>
        ...
    </div>
</div>
```

**Rules:**
- Badges always animate in last (delay > 1000ms)
- Badges use `shadow-md` not the full widget shadow
- Maximum 2 floating badges per widget

### 7.9 Alert / Notice Banners

Full-width banners at the bottom of a widget section.

#### Warning (gap detected)
```tsx
<div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#FDE68A]
                bg-[#FFFBEB] p-3 transition-all duration-500 ...">
    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 animate-pulse text-[#D97706]" />
    <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#92400E]">{title}</p>
        <p className="text-[11px] text-[#B45309]">{detail}</p>
    </div>
    <ActionButton />
</div>
```

#### Success (ready to send)
```tsx
<div className="mt-3 flex items-center gap-2 rounded-xl border border-[#DCEBDA]
                bg-[#F0FDF4] px-3 py-2 transition-all duration-500 ...">
    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#29685B]" />
    <p className="text-[11px] font-semibold text-[#166534]">{message}</p>
</div>
```

---

## 8. Widget Catalog

### 8.1 PolicyWalletWidget

**File:** `components/landing/PolicyWalletWidget.tsx`
**Used on:** Main landing page (individual policyholder audience)
**Purpose:** Show a policyholder's insurance portfolio with a gap alert

**Props:**
```typescript
interface PolicyWalletWidgetProps {
    isGreek: boolean
}
```

**Structure:**
```
BrowserChrome (url: app.policywallet.gr/wallet)
├── Portfolio header (name + coverage badge)
├── Policy tiles × 3 (Motor, Home, Health)
│   ├── Icon + LOB name
│   ├── Insurer + status badge
│   └── Coverage progress bar
├── Gap alert banner (animated pulse icon)
└── [Floating] AI analysis badge (top-right)
└── [Floating] Expiry warning badge (bottom-left)
```

**Animation timeline:**
| ms | Event |
|---|---|
| 350 | `loaded = true` |
| 500, 600, 700 | Policy tiles fade in |
| 800, 900, 1000 | Progress bars animate |
| 900 | Gap alert fades in |
| 1100 | AI floating badge |
| 1300 | Expiry floating badge |

---

### 8.2 ClientPortfolioDashboardWidget

**File:** `components/landing/AgentWidgets.tsx`
**Used on:** `/solutions/agents` page
**Purpose:** Show an agent's client portfolio overview

**Props:**
```typescript
interface ClientPortfolioDashboardWidgetProps {
    isGreek: boolean
}
```

**Structure:**
```
BrowserChrome (url: app.policywallet.gr/agent/clients)
├── Header (title + AI Active badge)
├── KPI tiles × 3 (Clients / Renewals / Opportunities)
└── Client rows × 4
    ├── Initial avatar (colored by severity)
    ├── Name + status badge
    └── Protection score progress bar
```

**Demo data:** 47 clients, 12 renewals, 8 opportunities; 4 sample clients with mixed severity.

---

### 8.3 GapAnalysisWidget

**File:** `components/landing/AgentWidgets.tsx`
**Used on:** `/solutions/agents` page
**Purpose:** Demonstrate the AI gap scanning feature

**Props:**
```typescript
interface GapAnalysisWidgetProps {
    isGreek: boolean
}
```

**Structure:**
```
BrowserChrome (url: app.policywallet.gr/agent/gap-scan)
├── Header (title + live scanning status dot)
├── Scan progress container
│   ├── Label + percentage counter
│   └── Progress bar (JS-driven, 0→100% over ~1.75s)
├── Gap finding rows × 3 (CRITICAL / HIGH / MEDIUM)
│   ├── Alert icon + severity badge
│   └── Gap description
└── Summary banner (count of gaps detected)
```

**Two-phase animation:**
1. **Phase 1** (CSS, triggered by `loaded`): header, progress container slide in
2. **Phase 2** (JS interval, triggered by `loaded`): progress bar counts up
3. **Phase 3** (CSS, timed off absolute delays): gap findings stagger in at 1500/1800/2100ms

---

### 8.4 RenewalReminderWidget

**File:** `components/landing/AgentWidgets.tsx`
**Used on:** `/solutions/agents` page
**Purpose:** Demonstrate the renewal pipeline and one-click reminders

**Props:**
```typescript
interface RenewalReminderWidgetProps {
    isGreek: boolean
}
```

**Structure:**
```
BrowserChrome (url: app.policywallet.gr/agent/renewals)
├── Header (title + urgency count badge)
└── Renewal rows × 4
    ├── Days-remaining chip (colored by urgency)
    ├── Client name + policy type
    └── Send/Sent toggle button (interactive)
```

**Interactive state:** Row index `1` is pre-seeded as `sent: true` to show both states on initial render. Clicking an unsent button toggles it to sent permanently (no undo — intentional for the demo).

**Days chip sizing:**
```tsx
<div className="flex-shrink-0 rounded-lg px-2 py-1 text-center">
    <p className="text-[14px] font-bold leading-none">{days}</p>
    <p className="text-[9px] leading-tight">{t("μέρες", "days")}</p>
</div>
```

---

### 8.5 BrandedReportWidget

**File:** `components/landing/AgentWidgets.tsx`
**Used on:** `/solutions/agents` page
**Purpose:** Demonstrate the branded client report feature

**Props:**
```typescript
interface BrandedReportWidgetProps {
    isGreek: boolean
}
```

**Structure:**
```
BrowserChrome (url: app.policywallet.gr/agent/reports)
└── Report mock
    ├── Branded header bar (#29685B bg, FileText icon, date)
    ├── Client info block (label + name)
    ├── Policy rows × 3 (slide in from left)
    │   ├── Policy type + insurer
    │   └── Premium + Active badge
    ├── Score + Send footer (protection score + send button)
    └── Ready-to-send banner (success style)
```

**Report header** uses an inverted color scheme (white text on `#29685B` background) — the only place in widgets where the brand color is used as a fill rather than an accent.

---

## 9. Severity System

All widgets use a unified three-tier severity system. Apply consistently.

| Tier | Key | Row border | Avatar bg | Avatar text | Badge bg | Badge text | Progress fill |
|---|---|---|---|---|---|---|---|
| Default / Active | `ok` | `#E2E8F0` | `#F0FDF4` | `#166534` | `#F0FDF4` | `#166534` | `#29685B` |
| Warning / Expiring | `warn` | `#FDE68A` | `#FEF3C7` | `#92400E` | `#FEF3C7` | `#B45309` | `#F59E0B` |
| Critical / Gap | `critical` | `#FECACA` | `#FEF2F2` | `#B91C1C` | `#FEF2F2` | `#B91C1C` | `#EF4444` |

### Gap Finding Severity Labels

For AI-detected gap findings (CRITICAL / HIGH / MEDIUM):

| Level | Border | Background | Text |
|---|---|---|---|
| CRITICAL | `#FECACA` | `#FEF2F2` | `#B91C1C` |
| HIGH | `#FDE68A` | `#FFFBEB` | `#B45309` |
| MEDIUM | `#BFDBFE` | `#EFF6FF` | `#1E40AF` |

---

## 10. Bilingual Pattern

Every widget accepts `isGreek: boolean` and uses a local translation helper:

```tsx
const t = (el: string, en: string) => (isGreek ? el : en)
```

**Rules:**
- Call `t()` inline at every string output — never hoist translations to a separate object
- Greek text is always first argument, English second
- Dates use fixed locale-neutral formats (`01/04/2026`) not locale-formatted dates
- Numbers (47 clients, 12%) are locale-neutral — no `.toLocaleString()` in widget demos

**Source of truth for language:** The widget receives `isGreek` from the parent page component, which reads from `useLanguage()` context. Widgets must not call `useLanguage()` directly — keeps them portable and testable.

---

## 11. Accessibility Checklist

Before shipping a new widget:

- [ ] All interactive elements (`button`, `Link`) have `:focus-visible` ring: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B]`
- [ ] Decorative elements (browser chrome dots, animated dots) have `aria-hidden="true"` or are `<span>` with no role
- [ ] Animated icons (`animate-pulse`) are not the sole indicator of state — text label always present
- [ ] Color is never the only differentiator between states — also use shape (icon) or text
- [ ] Buttons have a minimum tap target: pad to at least `32px × 32px` on mobile
- [ ] All `<Image>` alt text present (no empty alt unless purely decorative)
- [ ] Progress bars paired with text percentage for screen reader users
- [ ] No keyboard traps — focus flows naturally through the widget

---

## 12. Anti-patterns

| Anti-pattern | Why it's wrong | Correct approach |
|---|---|---|
| Mixing `#1fdc86` (emerald) with `#29685B` (teal) in the same widget | Creates color inconsistency; they target different contexts | Use `#29685B` exclusively in public-page widgets |
| Using `animate-spin` or `animate-bounce` on data elements | Distracting; implies uncertainty about data | Use `animate-pulse` on status dots only |
| Adding `useEffect` data fetching inside a widget | Widgets are pure demo components | All data is hardcoded; no API calls |
| Applying `translate-y-0 opacity-100` directly (no transition) | Element just appears — misses the entry animation | Always set `transition-all duration-500` on the same element |
| Using `cursor-pointer` on non-interactive elements | Misleads users | Only buttons, links, and `[role="tab"]` get `cursor-pointer` |
| Long Greek text without `truncate` | Overflows narrow containers | Always `truncate` on name/title text in rows |
| Absolute `transitionDelay` values over 3000ms | Widget feels broken/laggy | Cap at 2500ms; use relative step increments |
| Importing `useLanguage()` inside a widget | Couples widget to context provider tree | Accept `isGreek: boolean` as prop instead |
| Using `<img>` instead of Lucide icons or text initials for avatars | Requires network assets; breaks offline | Use initial letter in styled div or Lucide icon |
| Nested `BrowserChrome` wrappers | Creates confusing nested chrome | Each widget gets exactly one `BrowserChrome` |
