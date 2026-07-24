"use client"

import { createContext, useContext, useId, type ReactNode } from "react"

/**
 * The form kit.
 *
 * Every form in the app validated with toasts alone: no inline message beside
 * the offending input, no `aria-invalid`, no `aria-describedby` (5 and 6 uses
 * respectively across the whole codebase). A screen-reader user got a toast that
 * named a problem but nothing tying it to a field, and a sighted user who
 * dismissed the toast lost the message entirely.
 *
 * `Field` owns the wiring so callers cannot forget it: it generates the control
 * id and the error id, and the controls below read them from context. Toasts
 * stay useful for SUBMIT-level failures ("couldn't reach the server"); per-field
 * problems belong here.
 *
 * Styling follows the recipe recorded in design-system/policywallet/MASTER.md,
 * which is the one the agent modals had already converged on.
 */

interface FieldContextValue {
    controlId: string
    errorId: string
    invalid: boolean
    required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

export function useFieldContext() {
    return useContext(FieldContext)
}

interface FieldProps {
    label: string
    /** Inline error. Presence marks the control invalid. */
    error?: string | null
    /** Helper text rendered under the control when there is no error. */
    hint?: string
    required?: boolean
    children: ReactNode
    className?: string
}

export function Field({ label, error, hint, required = false, children, className = "" }: FieldProps) {
    const controlId = useId()
    const errorId = `${controlId}-error`
    const invalid = Boolean(error)

    return (
        <FieldContext.Provider value={{ controlId, errorId, invalid, required }}>
            <div className={`space-y-1.5 ${className}`}>
                <label
                    htmlFor={controlId}
                    className="ml-1 block text-kicker font-bold uppercase tracking-widest text-muted-foreground"
                >
                    {label}
                    {required && <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>}
                </label>

                {children}

                {/* role="alert" so the message is announced when it appears, not
                    only when the field is next focused. */}
                {error ? (
                    <p id={errorId} role="alert" className="ml-1 text-xs font-semibold text-red-700 dark:text-red-400">
                        {error}
                    </p>
                ) : hint ? (
                    <p className="ml-1 text-xs text-muted-foreground">{hint}</p>
                ) : null}
            </div>
        </FieldContext.Provider>
    )
}
