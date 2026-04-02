---
description: Scaffold a new PolicyWallet interactive widget following the established design system. Provide a short description of what the widget should show.
argument-hint: "<widget description, e.g. 'policyholderPremiumSummaryWidget showing total premium spend by category'>"
---

You are scaffolding a new interactive marketing widget for PolicyWallet. The widget will be embedded in a public-facing page to demo a product feature — no real data fetching, pure React + CSS transitions.

## What to build

$ARGUMENTS

## Design system rules (follow exactly)

### File placement
- If creating a standalone widget: add it as a named export in `components/landing/AgentWidgets.tsx`
- If it belongs to a new audience segment: create `components/landing/<AudienceName>Widgets.tsx`
- Token constants live in `components/ui/design-tokens.ts` — import from there if useful

### Required prop interface
Every widget accepts exactly one prop:
```tsx
interface <WidgetName>Props {
    isGreek: boolean
}
```
Never call `useLanguage()` inside a widget. The parent page passes `isGreek`.

### Bilingual helper — always define locally
```tsx
const t = (el: string, en: string) => (isGreek ? el : en)
```

### Mount animation — required on every widget
```tsx
const [loaded, setLoaded] = useState(false)

useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 350)
    return () => clearTimeout(timer)
}, [])
```
Apply `transition-all duration-500` to every animated element.
Apply `${loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}` as the default entry state.

### Stagger formula
```
transitionDelay: `${index * stepMs + baseMs}ms`
```
Typical values: step=100ms, base=400ms for first section; base=640ms for second section.

### BrowserChrome wrapper — wrap every widget in this
```tsx
function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.08),0_0_0_1px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                </div>
                <div className="ml-3 flex-1 rounded-md border border-[#E2E8F0] bg-white px-3 py-1 font-mono text-[11px] text-[#94A3B8]">
                    {url}
                </div>
            </div>
            {children}
        </div>
    )
}
```
URL format: `app.policywallet.gr/[route]`

### Color tokens — use these exact hex values, never approximate

**Brand:**
- Primary action / filled buttons / progress bars / branded headers: `#29685B`
- Primary hover: `#1C4E44`
- Primary light bg: `#ECFDF5` | border: `#A7F3D0` | dark text: `#166534`

**Neutral (Slate):**
- Canvas / chrome bg: `#F8FAFC` | Default borders: `#E2E8F0` | Track bg: `#F1F5F9`
- Muted text: `#94A3B8` | Subtext: `#64748B` | Body copy: `#475569`
- Headings / primary text: `#0F172A`

**Success (ok state):**
- bg: `#F0FDF4` | border: `#DCEBDA` | text: `#166534` | icon: `#22C55E`

**Warning (expiring / high severity):**
- bg: `#FFFBEB` | chip bg: `#FEF3C7` | border: `#FDE68A`
- heading text: `#92400E` | body text / badge: `#B45309` | icon: `#D97706`
- progress fill: `#F59E0B`

**Critical (gap / error):**
- bg: `#FEF2F2` | border: `#FECACA` | text: `#B91C1C` | fill: `#EF4444`

**Info / Medium severity / AI:**
- bg: `#EFF6FF` | border: `#BFDBFE` | text: `#1E40AF`

### Severity system — apply to rows/tiles

| Severity | `type` key | Row border | Avatar bg/text | Badge bg/text | Progress fill |
|---|---|---|---|---|---|
| Default/Active | `ok` | `#E2E8F0` | `#F0FDF4` / `#166534` | `#F0FDF4` / `#166534` | `#29685B` |
| Warning/Expiring | `warn` | `#FDE68A` | `#FEF3C7` / `#92400E` | `#FEF3C7` / `#B45309` | `#F59E0B` |
| Critical/Gap | `critical` | `#FECACA` | `#FEF2F2` / `#B91C1C` | `#FEF2F2` / `#B91C1C` | `#EF4444` |

### Typography scale

| Role | Size | Weight |
|---|---|---|
| Widget header title | `13px` | `600` |
| Widget subtitle | `11px` | `400` |
| KPI number | `18px` | `700` |
| KPI label | `10px` | `400` |
| Row name | `12px` | `600` |
| Row detail / secondary | `11px` | `400` |
| Badge | `9px`–`11px` | `600` |
| Browser URL | `11px`, `font-mono` | `400` |
| Button label | `10px` | `700` |

### Border radius

| Element | Class |
|---|---|
| Widget outer card | `rounded-2xl` |
| Row tile / banner | `rounded-xl` |
| Avatar container | `rounded-lg` |
| Badge / chip / button | `rounded-full` |
| URL bar | `rounded-md` |

### Widget inner padding: `p-5`
### Row padding: `p-2.5` (compact) or `p-3` (normal)
### Row gap: `space-y-2`

### Standard row structure
```tsx
<div className={`flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-500
    ${borderByType} ${loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
    style={{ transitionDelay: animation.stagger(i) }}>

    {/* Avatar: initial letter or Lucide icon */}
    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${avatarStyle}`}>
        {name.charAt(0)}
    </div>

    {/* Content */}
    <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[12px] font-semibold text-[#0F172A]">{name}</span>
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${badgeStyle}`}>{badge}</span>
        </div>
        {/* Progress bar or secondary text here */}
    </div>
</div>
```
Key: `min-w-0 flex-1` on content div, `truncate` on name, `flex-shrink-0` on avatar and badge.

### Progress bar structure
```tsx
<div className="flex items-center gap-2">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${fillColor}`}
             style={{ width: loaded ? `${value}%` : "0%", transitionDelay: `${delay}ms` }} />
    </div>
    <span className="text-[10px] font-medium text-[#94A3B8]">{value}%</span>
</div>
```

### KPI tiles (3-column grid)
```tsx
<div className="mb-4 grid grid-cols-3 gap-2">
    {stats.map((s, i) => (
        <div key={i}
             className={`rounded-xl border border-[#E2E8F0] p-2.5 text-center transition-all duration-500
                         ${loaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
             style={{ transitionDelay: `${i * 80 + 400}ms` }}>
            <p className="text-[18px] font-bold text-[#0F172A]">{s.value}</p>
            <p className="text-[10px] text-[#64748B]">{s.label}</p>
        </div>
    ))}
</div>
```

### Alert / warning banner
```tsx
<div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 transition-all duration-500 ...">
    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 animate-pulse text-[#D97706]" />
    <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#92400E]">{title}</p>
        <p className="text-[11px] text-[#B45309]">{detail}</p>
    </div>
</div>
```

### Success banner
```tsx
<div className="mt-3 flex items-center gap-2 rounded-xl border border-[#DCEBDA] bg-[#F0FDF4] px-3 py-2 ...">
    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#29685B]" />
    <p className="text-[11px] font-semibold text-[#166534]">{message}</p>
</div>
```

### Interactive buttons — toggle state, never disable
```tsx
// Unsent/action state
<button onClick={() => markSent(i)} className="rounded-full bg-[#29685B] px-2.5 py-1 text-[10px] font-bold text-white transition-all hover:bg-[#1C4E44]">
    <Icon className="h-3 w-3" /> {label}
</button>

// Completed state (same element, different classes)
<button className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[10px] font-bold text-[#166534]">
    <CheckCircle2 className="h-3 w-3" /> {t("Ολοκληρώθη", "Done")}
</button>
```

### What NOT to do
- Do NOT call `useLanguage()` inside a widget — use the `isGreek` prop
- Do NOT fetch data — all data is hardcoded demo values
- Do NOT use `#1fdc86` (that's the app emerald) — use `#29685B` (public-page teal)
- Do NOT nest two `BrowserChrome` wrappers
- Do NOT set `transitionDelay` above 3000ms
- Do NOT use `animate-spin` or `animate-bounce` — only `animate-pulse` on status dots
- Do NOT omit `truncate` on name/title text in rows
- Do NOT omit `flex-shrink-0` on avatars and badges inside flex rows

## Output format

1. Read `components/landing/AgentWidgets.tsx` to understand the existing exports and `BrowserChrome` definition (it is already defined there — do NOT redefine it in a new file if adding to that file)
2. Write the widget code as a TypeScript React component following all rules above
3. Export the widget as a named export
4. If adding to `AgentWidgets.tsx`, append to the end of the file
5. If creating a new file, also define `BrowserChrome` locally at the top of that file
6. After writing the code, report: file path, export name, prop interface, and a one-line description of what the demo data shows
