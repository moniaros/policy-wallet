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
        "[-webkit-tap-highlight-color:transparent]",
        focusRing
    ),
    {
        variants: {
            variant: {
                primary: "bg-action-primary-bg text-fg-on-brand hover:bg-action-primary-hover",
                secondary:
                    "border border-action-secondary-border bg-surface-raised text-fg-primary hover:border-border-strong hover:bg-surface-sunken",
                ghost: "text-fg-primary hover:bg-surface-sunken",
                link: "min-h-0 rounded-g-sm px-1 text-fg-brand underline-offset-4 hover:underline",
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

/* ── Input + EmailCapture ────────────────────────────────────────────── */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...rest }, ref) => (
        <input
            ref={ref}
            className={cn(
                // 16px floor stops iOS focus-zoom
                "min-h-12 w-full rounded-g-md border border-border-strong bg-surface-raised px-g-4 text-[16px] text-fg-primary",
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
                "inline-block size-5 animate-spin rounded-full border-2 border-border-strong border-t-fg-brand motion-reduce:animate-none",
                className
            )}
        />
    )
}
