"use client"

import type {
    InputHTMLAttributes,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from "react"
import { useFieldContext } from "./Field"

/**
 * Form controls that wire their own accessibility from the surrounding `Field`.
 *
 * These exist because ~111 raw `<input>` elements across 33 files each
 * hand-rolled the same class string, and none of them set `aria-invalid` or
 * pointed `aria-describedby` at an error message. Used inside a `Field`, these
 * do both automatically; used standalone they degrade to a plain styled control.
 */

const BASE =
    "w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl outline-none transition-all text-sm font-bold " +
    "focus:ring-4 focus:ring-primary/10 disabled:opacity-60 disabled:cursor-not-allowed " +
    "placeholder:font-medium placeholder:text-muted-foreground"

const INVALID = "ring-2 ring-red-500/60 focus:ring-red-500/20"

/** Shared aria wiring; returns nothing meaningful outside a Field. */
function useControlAria() {
    const field = useFieldContext()
    if (!field) return { id: undefined, aria: {} as Record<string, unknown> }
    return {
        id: field.controlId,
        invalid: field.invalid,
        aria: {
            "aria-invalid": field.invalid || undefined,
            "aria-describedby": field.invalid ? field.errorId : undefined,
            "aria-required": field.required || undefined,
        } as Record<string, unknown>,
    }
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
    const { id, invalid, aria } = useControlAria()
    return (
        <input
            id={id}
            {...aria}
            {...props}
            className={`${BASE} h-14 px-6 ${invalid ? INVALID : ""} ${className}`}
        />
    )
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const { id, invalid, aria } = useControlAria()
    return (
        <textarea
            id={id}
            {...aria}
            {...props}
            className={`${BASE} min-h-28 px-6 py-4 ${invalid ? INVALID : ""} ${className}`}
        />
    )
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    const { id, invalid, aria } = useControlAria()
    return (
        <select
            id={id}
            {...aria}
            {...props}
            className={`${BASE} h-14 px-6 appearance-none ${invalid ? INVALID : ""} ${className}`}
        >
            {children}
        </select>
    )
}
