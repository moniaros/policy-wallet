"use client"

import { useId, type InputHTMLAttributes, type ReactNode } from "react"

/**
 * Checkbox and Radio with a real touch target.
 *
 * The 32 hand-rolled instances across the app render a 16px box — or, in ten of
 * them, no size class at all, leaving the browser default of roughly 13px. Both
 * are far below the 44px minimum, and because the `<input>` usually sat beside a
 * `<label>` rather than inside one, the label text was often not clickable
 * either: the whole affordance was a 16px square.
 *
 * These keep the box visually small (a 44px checkbox looks clumsy) while making
 * the CONTROL — box plus its label — one large target. The row is the hit area.
 */

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
    label: ReactNode
    /** Secondary line under the label. */
    hint?: ReactNode
    /** Inline error; also marks the control invalid. */
    error?: string | null
}

function ChoiceRow({ type, label, hint, error, className = "", id, ...props }: BaseProps & { type: "checkbox" | "radio" }) {
    const generatedId = useId()
    const controlId = id ?? generatedId
    const hintId = `${controlId}-hint`
    const errorId = `${controlId}-error`
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined

    return (
        <div className={className}>
            {/* min-h-11 (44px) makes the whole row the target, not the 16px box. */}
            <label
                htmlFor={controlId}
                className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5"
            >
                <input
                    id={controlId}
                    type={type}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`mt-0.5 h-4 w-4 shrink-0 accent-primary ${type === "checkbox" ? "rounded" : "rounded-full"} border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                    {...props}
                />
                <span className="min-w-0">
                    <span className="block text-body text-foreground">{label}</span>
                    {hint && (
                        <span id={hintId} className="mt-0.5 block text-caption text-muted-foreground">
                            {hint}
                        </span>
                    )}
                </span>
            </label>
            {error && (
                <p id={errorId} role="alert" className="ml-7 text-caption font-semibold text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    )
}

export function Checkbox(props: BaseProps) {
    return <ChoiceRow type="checkbox" {...props} />
}

export function Radio(props: BaseProps) {
    return <ChoiceRow type="radio" {...props} />
}

/**
 * Selection checkbox for a table row or list item.
 *
 * The hand-rolled row selectors had NO accessible name — a screen reader
 * announced a bare "checkbox" with no clue what it selected — and no size class,
 * leaving the browser default of ~13px. The label here is visually hidden
 * (the row's own text is the visible context) but always present, and the padded
 * wrapper gives the box a real tap area without changing the row's height.
 */
export function RowCheckbox({
    label,
    className = "",
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
    return (
        <label className={`-m-2 inline-flex cursor-pointer items-center p-2 ${className}`}>
            <span className="sr-only">{label}</span>
            <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                {...props}
            />
        </label>
    )
}
