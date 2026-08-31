/**
 * Grafí primitives. Every component: semantic tokens only (bg-surface-*,
 * text-fg-*, state-*, action-*, g-* scales), logical properties, visible
 * 3px/3px-offset focus, 44px minimum targets, both themes for free via the
 * token layer. No `any`.
 */
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const focusRing =
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"

/* ── Button ─────────────────────────────────────────────────────────── */
const button = cva(
    cn(
        "inline-flex items-center justify-center gap-g-2 rounded-g-pill font-semibold",
        "transition-[background-color,border-color,transform] duration-200 [transition-timing-function:var(--ease-out-g)]",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
        "[-webkit-tap-highlight-color:transparent] ease-g-spring",
        focusRing
    ),
    {
        variants: {
            variant: {
                primary: "bg-action-primary-bg text-fg-on-brand hover:bg-action-primary-hover",
                secondary:
                    "border border-action-secondary-border bg-surface-raised text-fg-primary hover:border-border-control hover:bg-surface-sunken",
                ghost: "text-fg-primary hover:bg-surface-sunken",
                link: "min-h-0 rounded-g-sm px-1 text-fg-brand underline-offset-4 hover:underline",
                // Application tier: a destructive ACTION (delete, disconnect). Never a status.
                danger: "bg-action-danger text-fg-on-brand hover:bg-action-danger-hover",
            },
            size: {
                sm: "min-h-11 px-g-4 text-sm",
                md: "min-h-11 px-g-6 py-g-3 text-g-body-sm",
                lg: "min-h-12 px-g-8 py-g-3 text-base",
            },
        },
        defaultVariants: { variant: "primary", size: "md" },
    }
)
export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof button> {
    loading?: boolean
}
/** The button classes for a NON-button element (a Link) — never nest an <a> in a <button>. */
export const buttonClassName = (opts?: VariantProps<typeof button>, className?: string) => cn(button(opts ?? {}), className)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, loading, children, disabled, ...rest }, ref) => (
        <button
            ref={ref}
            className={cn(button({ variant, size }), className)}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading && <Spinner className="size-4" />}
            {children}
        </button>
    )
)
Button.displayName = "Button"

/* ── IconButton ─────────────────────────────────────────────────────── */
/** A 44×44 icon-only control. The name is REQUIRED — an icon alone is not a label. */
export const IconButton = forwardRef<
    HTMLButtonElement,
    ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: "ghost" | "secondary" | "primary" | "danger"; size?: "md" | "sm" }
>(({ label, variant = "ghost", size = "md", className, children, ...rest }, ref) => (
    <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
            "g-row-press grid shrink-0 place-items-center rounded-g-control transition-colors duration-200 ease-g-out disabled:pointer-events-none disabled:opacity-50 [-webkit-tap-highlight-color:transparent]",
            size === "sm" ? "size-11" : "size-12",
            variant === "ghost" && "text-fg-secondary hover:bg-surface-sunken hover:text-fg-primary",
            variant === "secondary" && "border border-action-secondary-border bg-surface-raised text-fg-primary hover:bg-surface-sunken",
            variant === "primary" && "bg-action-primary-bg text-fg-on-brand hover:bg-action-primary-hover",
            variant === "danger" && "bg-action-danger text-fg-on-brand hover:bg-action-danger-hover",
            focusRing,
            className
        )}
        {...rest}
    >
        {children}
    </button>
))
IconButton.displayName = "IconButton"

/* ── StatusChip — the three-state system, never a traffic light ─────── */
const chip = cva(
    "inline-flex min-h-8 items-center gap-g-2 rounded-g-pill px-g-3 py-g-1 text-sm font-semibold",
    {
        variants: {
            state: {
                covered: "bg-state-covered-fill text-state-covered",
                gap: "border border-state-gap-border bg-state-gap-fill text-state-gap",
                review: "bg-state-review-fill text-state-review",
            },
        },
    }
)
const CHIP_GLYPH = { covered: "✓", gap: "◆", review: "?" } as const
/**
 * `review` is load-bearing honesty: a risk resting on facts the user has not
 * supplied stays "needs review" — it never silently becomes a gap. Icon+label
 * always; colour never carries the meaning alone.
 */
/**
 * The spoken names of the three states — beside the chip so every surface
 * says the same thing. `review` is «για έλεγχο», never a softer «εντάξει»:
 * absence of a verdict must not read as reassurance.
 */
export const STATE_LABELS: Record<"covered" | "gap" | "review", { el: string; en: string }> = {
    covered: { el: "Καλύπτεται", en: "Covered" },
    gap: { el: "Κενό", en: "Gap" },
    review: { el: "Για έλεγχο", en: "Needs review" },
}

export function StatusChip({
    state,
    children,
    className,
}: {
    state: "covered" | "gap" | "review"
    children?: ReactNode
    className?: string
}) {
    return (
        <span className={cn(chip({ state }), className)}>
            <span aria-hidden>{CHIP_GLYPH[state]}</span>
            {children}
        </span>
    )
}

/* ── Tag / Badge ─────────────────────────────────────────────────────── */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-g-pill border border-border-subtle bg-surface-raised px-g-3 py-g-1 text-sm text-fg-secondary",
                className
            )}
        >
            {children}
        </span>
    )
}

/* ── Badge ──────────────────────────────────────────────────────────── */
/** A small count or word beside a label. `tone` is a state or neutral — never a severity. */
export function Badge({
    children,
    tone = "neutral",
    className,
}: {
    children: ReactNode
    tone?: "neutral" | "covered" | "gap" | "review" | "brand"
    className?: string
}) {
    return (
        <span
            className={cn(
                "inline-flex min-h-6 items-center rounded-g-pill px-g-2 text-g-app-caption font-semibold tabular-nums",
                tone === "neutral" && "bg-surface-sunken text-fg-secondary",
                tone === "covered" && "bg-state-covered-fill text-state-covered",
                tone === "gap" && "bg-state-gap-fill text-state-gap",
                tone === "review" && "bg-state-review-fill text-state-review",
                tone === "brand" && "bg-action-primary-bg text-fg-on-brand",
                className
            )}
        >
            {children}
        </span>
    )
}

/* ── Avatar ─────────────────────────────────────────────────────────── */
/** Initials on a soft disc; a photo when there is one. The name is the accessible label. */
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
    const initial = name.trim().charAt(0).toUpperCase()
    const sizes = { sm: "size-8 text-sm", md: "size-10 text-base", lg: "size-12 text-g-heading" } as const
    return src ? (
        <img src={src} alt={name} className={cn("rounded-g-pill object-cover", sizes[size], className)} />
    ) : (
        <span role="img" aria-label={name} className={cn("grid shrink-0 place-items-center rounded-g-pill bg-surface-sunken font-display font-bold text-fg-brand", sizes[size], className)}>
            {initial}
        </span>
    )
}

/* ── FilterChip ─────────────────────────────────────────────────────── */
/** A toggleable filter. `aria-pressed` carries the state; the fill never carries it alone. */
export const FilterChip = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean }>(
    ({ pressed, className, children, ...rest }, ref) => (
        <button
            ref={ref}
            type="button"
            aria-pressed={pressed}
            className={cn(
                "g-row-press inline-flex min-h-11 items-center gap-g-2 rounded-g-pill border px-g-4 text-g-app-body-sm font-medium transition-colors duration-200 ease-g-out [-webkit-tap-highlight-color:transparent]",
                pressed ? "border-action-primary-bg bg-action-primary-bg text-fg-on-brand" : "border-border-control bg-surface-raised text-fg-primary hover:bg-surface-sunken",
                focusRing,
                className
            )}
            {...rest}
        >
            {pressed && <span aria-hidden>✓</span>}
            {children}
        </button>
    )
)
FilterChip.displayName = "FilterChip"

/* ── Input + EmailCapture ────────────────────────────────────────────── */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...rest }, ref) => (
        <input
            ref={ref}
            className={cn(
                // 16px floor stops iOS focus-zoom
                "min-h-12 w-full rounded-g-control border border-border-control bg-surface-raised px-g-4 text-[16px] text-fg-primary",
                "placeholder:text-fg-secondary",
                "aria-[invalid=true]:border-state-gap",
                focusRing,
                className
            )}
            {...rest}
        />
    )
)
Input.displayName = "Input"

/** A search field: 16px floor, `type="search"`, a visible label or an accessible one. */
export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
    ({ label, className, id, ...rest }, ref) => {
        const inputId = id ?? "grafi-search"
        return (
            <div className={cn("relative", className)}>
                <label htmlFor={inputId} className="sr-only">{label}</label>
                <span aria-hidden className="pointer-events-none absolute inset-y-0 start-g-4 grid place-items-center text-fg-faint">⌕</span>
                <input
                    ref={ref}
                    id={inputId}
                    type="search"
                    inputMode="search"
                    autoComplete="off"
                    placeholder={label}
                    className={cn(
                        "min-h-12 w-full rounded-g-control border border-border-control bg-surface-raised pe-g-4 ps-g-10 text-[16px] text-fg-primary placeholder:text-fg-faint",
                        focusRing
                    )}
                    {...rest}
                />
            </div>
        )
    }
)
SearchField.displayName = "SearchField"

export function EmailCapture({
    label,
    cta,
    formAriaLabel,
    onSubmit,
    className,
}: {
    label: string
    cta: string
    /** Names the form for AT — pass the destination action, e.g. PRIMARY_ACTION. */
    formAriaLabel?: string
    onSubmit?: (email: string) => void
    className?: string
}) {
    return (
        <form
            aria-label={formAriaLabel}
            className={cn("flex w-full max-w-md flex-col gap-g-2 sm:flex-row", className)}
            onSubmit={(e) => {
                e.preventDefault()
                const email = new FormData(e.currentTarget).get("email")
                if (typeof email === "string") onSubmit?.(email)
            }}
        >
            <label className="sr-only" htmlFor="grafi-email">{label}</label>
            <Input id="grafi-email" name="email" type="email" required inputMode="email" autoComplete="email" placeholder={label} />
            <Button type="submit" className="shrink-0">{cta}</Button>
        </form>
    )
}

/* ── Divider / Skeleton / Spinner ───────────────────────────────────── */
export function Divider({ className }: { className?: string }) {
    return <hr className={cn("border-border-subtle", className)} />
}
export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn("animate-pulse rounded-g-md bg-surface-sunken motion-reduce:animate-none", className)}
        />
    )
}
export function Spinner({ className }: { className?: string }) {
    return (
        <span
            role="status"
            aria-label="Φόρτωση"
            className={cn(
                "inline-block size-5 animate-spin rounded-full border-2 border-border-control border-t-fg-brand motion-reduce:animate-none",
                className
            )}
        />
    )
}
