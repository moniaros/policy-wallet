import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"
import { FormError } from "@/components/auth/FormError"

/**
 * One labelled field: label bound to the input, hint and error joined through
 * aria-describedby, error marked up once (brief §3 accessibility). The child
 * input is cloned with the wiring so call sites cannot forget it. Labels are
 * sentence case — the uppercase ΑΡΙΘΜΟΣ ΚΙΝΗΤΟΥ style is retired (brief §1.6).
 */
export function FormField({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string
    label: string
    /** Short helper under the input; part of the field's accessible description. */
    hint?: string
    /** The one message per field; says what to do, not what is wrong. */
    error?: string | null
    children: ReactNode
}) {
    const hintId = hint ? `${id}-hint` : undefined
    const errorId = `${id}-error`
    const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined
    const input = isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
              id,
              "aria-invalid": error ? true : undefined,
              "aria-describedby": describedBy,
          })
        : children
    return (
        <div>
            <label htmlFor={id} className="mb-g-2 block text-sm font-semibold text-fg-primary">
                {label}
            </label>
            {input}
            {hint && (
                <p id={hintId} className="mt-g-2 text-g-caption text-fg-secondary">
                    {hint}
                </p>
            )}
            <FormError id={errorId}>{error ?? null}</FormError>
        </div>
    )
}

/** The input look shared by every auth field — 16px floor so iOS does not zoom. */
export const AUTH_INPUT_CLASS =
    // text-base is the 16px iOS no-zoom floor, stated as a ladder step.
    "min-h-12 w-full rounded-g-md border border-border-strong bg-surface-raised px-g-4 text-base text-fg-primary " +
    "placeholder:text-fg-secondary aria-[invalid=true]:border-state-gap " +
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
