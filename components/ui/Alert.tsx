import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The shared inline alert — error, success, warning, info.
 *
 * There were 31 hand-rolled alert containers across 25 files and almost no two
 * agreed: the most common styling signature appeared 3 times. Padding ranged
 * over p-1 / p-1.5 / p-2 / p-4, radius over rounded-lg / -xl / -full, some had
 * a border and some did not, and the text was text-red-700 dark:text-rose-200 or text-red-700 dark:text-rose-200
 * depending on the file. Success had no shared treatment at all, so a
 * confirmation looked different on every screen that showed one.
 *
 * Semantics are part of the variant, not left to the caller: a failure is
 * announced (`role="alert"`), while a confirmation is polite (`role="status"`)
 * so it does not interrupt what a screen-reader user is doing.
 */

export type AlertVariant = "error" | "success" | "warning" | "info"

const STYLES: Record<AlertVariant, { box: string; icon: string; Icon: typeof Info }> = {
    error: {
        box: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200",
        icon: "text-red-700 dark:text-red-400",
        Icon: XCircle,
    },
    success: {
        box: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:text-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100",
        icon: "text-emerald-600 dark:text-emerald-400",
        Icon: CheckCircle2,
    },
    warning: {
        box: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
        icon: "text-amber-700 dark:text-amber-400",
        Icon: AlertTriangle,
    },
    info: {
        box: "border-border bg-muted/60 text-foreground",
        icon: "text-muted-foreground",
        Icon: Info,
    },
}

interface AlertProps {
    variant?: AlertVariant
    /** Optional bold first line. Without it the children are the whole message. */
    title?: ReactNode
    children?: ReactNode
    /** Trailing slot for a retry/dismiss control. Wraps below the text on narrow screens. */
    action?: ReactNode
    className?: string
}

export function Alert({ variant = "info", title, children, action, className }: AlertProps) {
    const { box, icon, Icon } = STYLES[variant]
    const failure = variant === "error" || variant === "warning"

    return (
        <div
            role={failure ? "alert" : "status"}
            className={cn(
                "flex flex-col gap-3 rounded-xl border pw-pad-tight sm:flex-row sm:items-start",
                box,
                className
            )}
        >
            <div className="flex min-w-0 flex-1 items-start gap-3">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", icon)} aria-hidden="true" />
                <div className="min-w-0 text-body">
                    {title && <p className="font-semibold">{title}</p>}
                    {children && <div className={cn(title && "mt-0.5", "min-w-0")}>{children}</div>}
                </div>
            </div>
            {/* Stacks under the message below `sm` so a long label never squeezes
                the text into a two-character column. */}
            {action && <div className="shrink-0 sm:ml-2">{action}</div>}
        </div>
    )
}
