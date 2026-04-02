/**
 * PolicyWallet Design Tokens
 *
 * Single source of truth for color, spacing, radius, shadow, and animation values
 * used across public-page widgets and the coverage/dashboard UI.
 *
 * Usage:
 *   import { colors, animation, radius } from "@/components/ui/design-tokens"
 *   const style = { transitionDelay: animation.stagger(index, 100, 640) }
 */

// ── Colors ────────────────────────────────────────────────────────────

export const colors = {
    // Brand primaries (public pages — deep teal)
    brand: {
        primary: "#29685B",
        primaryHover: "#1C4E44",
        primaryLight: "#ECFDF5",
        primaryBorder: "#A7F3D0",
        primaryDark: "#166534",
    },

    // Semantic — success
    success: {
        bg: "#F0FDF4",
        border: "#DCEBDA",
        text: "#166534",
        icon: "#22C55E",
    },

    // Semantic — warning / expiring
    warning: {
        bg: "#FFFBEB",
        bgChip: "#FEF3C7",
        border: "#FDE68A",
        text: "#92400E",
        textLight: "#B45309",
        icon: "#D97706",
    },

    // Semantic — critical / error
    critical: {
        bg: "#FEF2F2",
        border: "#FECACA",
        text: "#B91C1C",
        fill: "#EF4444",
    },

    // Semantic — info / AI / medium severity
    info: {
        bg: "#EFF6FF",
        border: "#BFDBFE",
        text: "#1E40AF",
        aiBg: "#EEF2FF",
        aiText: "#4F46E5",
    },

    // Neutral (Slate scale)
    neutral: {
        50: "#F8FAFC",
        100: "#F1F5F9",
        200: "#E2E8F0",
        300: "#CBD5E1",
        400: "#94A3B8",
        500: "#64748B",
        600: "#475569",
        700: "#334155",
        800: "#1E293B",
        900: "#0F172A",
    },

    // Browser chrome traffic-light dots
    chrome: {
        close: "#FF5F57",
        minimize: "#FFBD2E",
        maximize: "#28CA41",
    },
} as const

// ── Severity helpers ──────────────────────────────────────────────────

export type Severity = "ok" | "warn" | "critical"

export const severityStyles: Record<
    Severity,
    {
        rowBorder: string
        avatarBg: string
        avatarText: string
        badgeBg: string
        badgeText: string
        progressFill: string
    }
> = {
    ok: {
        rowBorder: "border-[#E2E8F0]",
        avatarBg: "bg-[#F0FDF4]",
        avatarText: "text-[#166534]",
        badgeBg: "bg-[#F0FDF4]",
        badgeText: "text-[#166534]",
        progressFill: "bg-[#29685B]",
    },
    warn: {
        rowBorder: "border-[#FDE68A]",
        avatarBg: "bg-[#FEF3C7]",
        avatarText: "text-[#92400E]",
        badgeBg: "bg-[#FEF3C7]",
        badgeText: "text-[#B45309]",
        progressFill: "bg-[#D97706]",
    },
    critical: {
        rowBorder: "border-[#FECACA]",
        avatarBg: "bg-[#FEF2F2]",
        avatarText: "text-[#B91C1C]",
        badgeBg: "bg-[#FEF2F2]",
        badgeText: "text-[#B91C1C]",
        progressFill: "bg-[#EF4444]",
    },
}

export type GapSeverity = "CRITICAL" | "HIGH" | "MEDIUM"

export const gapSeverityStyles: Record<
    GapSeverity,
    { border: string; bg: string; textColor: string }
> = {
    CRITICAL: {
        border: `border-[${colors.critical.border}]`,
        bg: `bg-[${colors.critical.bg}]`,
        textColor: `text-[${colors.critical.text}]`,
    },
    HIGH: {
        border: `border-[${colors.warning.border}]`,
        bg: `bg-[${colors.warning.bg}]`,
        textColor: `text-[${colors.warning.textLight}]`,
    },
    MEDIUM: {
        border: `border-[${colors.info.border}]`,
        bg: `bg-[${colors.info.bg}]`,
        textColor: `text-[${colors.info.text}]`,
    },
}

// ── Animation ─────────────────────────────────────────────────────────

export const animation = {
    /** Mount delay before setting loaded=true (ms). Allows initial paint to commit. */
    mountDelay: 350,

    /**
     * Calculates a staggered transition delay for list items.
     *
     * @param index   - zero-based item index
     * @param stepMs  - ms between each item (default 100)
     * @param baseMs  - ms before the first item starts (default 400)
     * @returns       - CSS transitionDelay value string e.g. "640ms"
     *
     * @example
     * style={{ transitionDelay: animation.stagger(i, 100, 640) }}
     */
    stagger: (index: number, stepMs = 100, baseMs = 400): string =>
        `${index * stepMs + baseMs}ms`,

    /** CSS class for standard entry transitions */
    entryClass: "transition-all duration-500",

    /** CSS class for progress bar width transitions */
    progressClass: "transition-all duration-1000 ease-out",

    /** CSS class for scan progress bar (incremental JS updates) */
    scanClass: "transition-all duration-100 ease-linear",

    /** Entry transform: initial state (hidden) */
    hiddenY: "translate-y-3 opacity-0",

    /** Entry transform: final state (visible) */
    visibleY: "translate-y-0 opacity-100",

    /** Entry transform for slide-in-from-left rows */
    hiddenX: "-translate-x-2 opacity-0",
    visibleX: "translate-x-0 opacity-100",

    /** Float-in from top (floating badges above widget) */
    hiddenAboveY: "-translate-y-2 opacity-0",

    /** Float-in from bottom (floating badges below widget) */
    hiddenBelowY: "translate-y-2 opacity-0",

    /** Scan progress: interval step in ms */
    scanIntervalMs: 35,

    /** Scan progress: increment per tick (%) */
    scanStepPct: 2,
} as const

// ── Radius ────────────────────────────────────────────────────────────

export const radius = {
    card: "rounded-2xl",       // widget card outer
    row: "rounded-xl",         // row tiles, banners
    avatar: "rounded-lg",      // icon avatar containers
    badge: "rounded-full",     // status badges, chips, buttons
    urlBar: "rounded-md",      // browser chrome URL bar
} as const

// ── Shadow ────────────────────────────────────────────────────────────

export const shadow = {
    /** Primary widget card — soft drop + subtle border ring */
    widget: "shadow-[0_16px_48px_rgba(0,0,0,0.08),0_0_0_1px_rgba(15,23,42,0.04)]",

    /** Landing page hero widget (slightly more pronounced) */
    widgetHero: "shadow-[0_24px_64px_rgba(0,0,0,0.09),0_0_0_1px_rgba(15,23,42,0.04)]",

    /** Floating badges */
    badge: "shadow-md",
} as const

// ── Typography ────────────────────────────────────────────────────────

export const typography = {
    // Sizes in px (as Tailwind arbitrary values)
    widgetTitle: "text-[13px] font-semibold",
    widgetSubtitle: "text-[11px]",
    kpiValue: "text-[18px] font-bold",
    kpiLabel: "text-[10px]",
    rowName: "text-[12px] font-semibold",
    rowDetail: "text-[11px]",
    badgeText: "text-[9px] font-semibold",
    badgeTextMd: "text-[11px] font-semibold",
    browserUrl: "font-mono text-[11px]",
    sectionLabel: "text-[10px] font-semibold uppercase tracking-wider",
    reportBody: "text-[12px]",
    ctaButton: "text-[10px] font-bold",
} as const

// ── Spacing helpers ───────────────────────────────────────────────────

export const spacing = {
    widgetPadding: "p-5",
    chromeBar: "px-4 py-3",
    rowPadding: "p-2.5",
    rowPaddingLg: "p-3",
    buttonPadding: "px-2.5 py-1",
    buttonPaddingLg: "px-3 py-1.5",
    chipPadding: "px-1.5 py-0.5",
    rowGap: "space-y-2",
    inlineGap: "gap-2",
    inlineGapLg: "gap-3",
    kpiGap: "gap-2",
} as const

// ── Browser Chrome URL convention ────────────────────────────────────

export const widgetUrls = {
    portfolio: "app.policywallet.gr/wallet",
    agentClients: "app.policywallet.gr/agent/clients",
    agentGapScan: "app.policywallet.gr/agent/gap-scan",
    agentRenewals: "app.policywallet.gr/agent/renewals",
    agentReports: "app.policywallet.gr/agent/reports",
} as const
