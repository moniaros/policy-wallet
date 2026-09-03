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

/** The Grafí focus ring — 3px outline, 3px offset, on every auth control. */
export const AUTH_FOCUS_CLASS =
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"

/** The inline text link of the auth pages — role switch, «Σύνδεση», «Ξέχασα τον κωδικό μου». */
export const AUTH_LINK_CLASS =
    `inline-block min-h-6 py-1 font-semibold text-fg-brand underline decoration-border-strong underline-offset-4 hover:decoration-current ${AUTH_FOCUS_CLASS}`

/** A Link styled as the Grafí primary button — for a navigation that IS the screen's one action. */
export const AUTH_PRIMARY_LINK_CLASS =
    `inline-flex min-h-12 w-full items-center justify-center gap-g-2 rounded-g-pill bg-action-primary-bg px-g-6 py-g-3 text-base font-semibold text-fg-on-brand transition-colors duration-200 hover:bg-action-primary-hover ${AUTH_FOCUS_CLASS}`

/** A Link styled as the Grafí secondary button — «Επιστροφή στη σύνδεση» and its kin. */
export const AUTH_SECONDARY_LINK_CLASS =
    `inline-flex min-h-11 w-full items-center justify-center gap-g-2 rounded-g-pill border border-action-secondary-border bg-surface-raised px-g-6 py-g-3 text-g-body-sm font-semibold text-fg-primary transition-colors duration-200 hover:border-border-strong hover:bg-surface-sunken ${AUTH_FOCUS_CLASS}`

/**
 * The two notice boxes of the auth flow: a refusal on the gap tokens, a
 * confirmation on the covered tokens. The same three-state vocabulary as the
 * trust panel — never a rose or an emerald of their own.
 */
export const AUTH_NOTICE_GAP_CLASS =
    "flex items-start gap-g-2 rounded-g-md border border-state-gap-border bg-state-gap-fill px-g-4 py-g-3 text-g-body-sm text-state-gap"
export const AUTH_NOTICE_COVERED_CLASS =
    "flex items-start gap-g-2 rounded-g-md bg-state-covered-fill px-g-4 py-g-3 text-g-body-sm text-state-covered"

/** The input look shared by every auth field — 16px floor so iOS does not zoom. */
export const AUTH_INPUT_CLASS =
    // text-base is the 16px iOS no-zoom floor, stated as a ladder step.
    "min-h-12 w-full rounded-g-md border border-border-strong bg-surface-raised px-g-4 text-base text-fg-primary " +
    "placeholder:text-fg-secondary aria-[invalid=true]:border-state-gap " +
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
