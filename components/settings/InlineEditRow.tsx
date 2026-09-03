"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Check, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

type Status = "idle" | "editing" | "saving" | "saved"

interface InlineEditRowProps {
    label: string
    /** Current stored value. `null`/empty renders the not-set placeholder. */
    value: string | null | undefined
    /** Shown in place of the value when there isn't one yet. */
    emptyLabel: string
    type?: "text" | "email" | "tel"
    autoComplete?: string
    inputMode?: "text" | "email" | "tel"
    /** Context shown while NOT editing. */
    hint?: ReactNode
    /** Context shown only once the field is open — consequences belong here. */
    editHint?: ReactNode
    /** Client-side check. Return a localized message, or null when valid. */
    validate?: (value: string) => string | null
    /**
     * Asked between "valid" and "save", for changes with a consequence worth
     * stating twice. Resolving false returns to the open editor with the typed
     * value intact — a declined confirmation is not an error.
     */
    confirm?: (value: string) => Promise<boolean>
    /**
     * Persists the value. Return a localized message to show inline; return
     * nothing (or void) on success. Throwing is treated as a server error.
     */
    onSave: (value: string) => Promise<string | void>
    /** Generic "couldn't save" message for a thrown/unknown failure. */
    serverErrorLabel: string
    disabled?: boolean
    disabledReason?: string
}

/**
 * One editable field, with the whole state machine in one place: idle, editing,
 * saving, saved, invalid, server error.
 *
 * The version this replaces drove name/email/language saves through a
 * full-screen blocking overlay (`ProcessingHUD`) and a toast. Blanking the page
 * to rename yourself is the wrong instrument, and a toast that has been
 * dismissed leaves no record that the change landed — so the confirmation lives
 * on the row itself, and per-field problems are announced beside the input
 * rather than in a corner of the screen (the division `Field` documents).
 */
export function InlineEditRow({
    label,
    value,
    emptyLabel,
    type = "text",
    autoComplete,
    inputMode,
    hint,
    editHint,
    validate,
    confirm,
    onSave,
    serverErrorLabel,
    disabled = false,
    disabledReason,
}: InlineEditRowProps) {
    const { t } = useLanguage()
    const controlId = useId()
    const errorId = `${controlId}-error`
    const hintId = `${controlId}-hint`

    const [status, setStatus] = useState<Status>("idle")
    const [draft, setDraft] = useState(value ?? "")
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // The stored value can change under us (another tab, a server revalidate).
    // Only adopt it when we are not mid-edit, or the user's typing is stolen.
    useEffect(() => {
        if (status === "idle") setDraft(value ?? "")
    }, [value, status])

    useEffect(() => {
        if (status === "editing") inputRef.current?.focus()
    }, [status])

    // "Saved" is a confirmation, not a state to live in.
    useEffect(() => {
        if (status !== "saved") return
        const timer = setTimeout(() => setStatus("idle"), 2600)
        return () => clearTimeout(timer)
    }, [status])

    const open = () => {
        setDraft(value ?? "")
        setError(null)
        setStatus("editing")
    }

    const cancel = () => {
        setDraft(value ?? "")
        setError(null)
        setStatus("idle")
    }

    const submit = async () => {
        const next = draft.trim()

        if (next === (value ?? "").trim()) {
            setStatus("idle")
            return
        }

        const invalid = validate?.(next)
        if (invalid) {
            setError(invalid)
            inputRef.current?.focus()
            return
        }

        setError(null)

        if (confirm) {
            const approved = await confirm(next)
            if (!approved) {
                inputRef.current?.focus()
                return
            }
        }

        setStatus("saving")
        try {
            const failure = await onSave(next)
            if (failure) {
                setError(failure)
                setStatus("editing")
                return
            }
            setStatus("saved")
        } catch {
            setError(serverErrorLabel)
            setStatus("editing")
        }
    }

    if (status === "idle" || status === "saved") {
        return (
            <div className="flex min-h-11 flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                    <p className="text-caption font-medium text-muted-foreground">{label}</p>
                    <p
                        className={`mt-0.5 text-sm [overflow-wrap:anywhere] ${
                            value ? "font-semibold text-foreground" : "text-muted-foreground"
                        }`}
                    >
                        {value || emptyLabel}
                    </p>
                    {hint && <p className="mt-1 text-caption leading-snug text-muted-foreground">{hint}</p>}
                    {disabled && disabledReason && (
                        <p className="mt-1 text-caption leading-snug text-muted-foreground">{disabledReason}</p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:pl-4">
                    {status === "saved" && (
                        <span
                            role="status"
                            className="inline-flex items-center gap-1 text-caption font-semibold text-primary dark:text-mint"
                        >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                            {t.settings.savedLabel}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={open}
                        disabled={disabled}
                        className="pw-soft-button disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {value ? t.common.edit : t.settings.addLabel}
                        <span className="sr-only"> — {label}</span>
                    </button>
                </div>
            </div>
        )
    }

    const saving = status === "saving"

    return (
        <div className="py-3.5">
            <label htmlFor={controlId} className="block text-caption font-medium text-muted-foreground">
                {label}
            </label>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                <input
                    ref={inputRef}
                    id={controlId}
                    type={type}
                    inputMode={inputMode}
                    autoComplete={autoComplete}
                    value={draft}
                    disabled={saving}
                    onChange={(e) => {
                        setDraft(e.target.value)
                        if (error) setError(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            void submit()
                        }
                        if (e.key === "Escape") {
                            e.preventDefault()
                            cancel()
                        }
                    }}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : editHint ? hintId : undefined}
                    className="pw-input pw-input-sm min-h-11 flex-1"
                />
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={saving}
                        className="pw-primary-button pw-btn-sm flex-1 disabled:opacity-60 sm:flex-none"
                    >
                        {saving && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
                        {saving ? t.common.saving : t.common.save}
                    </button>
                    <button
                        type="button"
                        onClick={cancel}
                        disabled={saving}
                        className="pw-soft-button flex-1 disabled:opacity-60 sm:flex-none"
                    >
                        {t.common.cancel}
                    </button>
                </div>
            </div>

            {error ? (
                <p id={errorId} role="alert" className="mt-2 text-caption font-semibold text-status-danger">
                    {error}
                </p>
            ) : editHint ? (
                <p id={hintId} className="mt-2 text-caption leading-snug text-muted-foreground">
                    {editHint}
                </p>
            ) : null}
        </div>
    )
}
