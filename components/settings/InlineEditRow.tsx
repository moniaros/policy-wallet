"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Check } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button, Input } from "@/src/design-system/primitives"
import { SettingRow } from "./SettingRow"

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
        // The read-only presentation IS SettingRow — one row layout, not two copies.
        const idleHint =
            hint || (disabled && disabledReason) ? (
                <>
                    {hint}
                    {disabled && disabledReason && <span className={hint ? "mt-1 block" : "block"}>{disabledReason}</span>}
                </>
            ) : undefined
        return (
            <SettingRow
                label={label}
                value={value || emptyLabel}
                muted={!value}
                hint={idleHint}
                action={
                    <div className="flex items-center gap-3">
                        {status === "saved" && (
                            <span
                                role="status"
                                className="inline-flex items-center gap-1 text-g-app-caption font-semibold text-fg-brand"
                            >
                                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                {t.settings.savedLabel}
                            </span>
                        )}
                        <Button type="button" variant="secondary" size="sm" onClick={open} disabled={disabled}>
                            {value ? t.common.edit : t.settings.addLabel}
                            <span className="sr-only"> — {label}</span>
                        </Button>
                    </div>
                }
            />
        )
    }

    const saving = status === "saving"

    return (
        <div className="py-3.5">
            <label htmlFor={controlId} className="block text-g-app-caption font-medium text-fg-secondary">
                {label}
            </label>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                <Input
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
                    className="min-h-11 flex-1"
                />
                <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => void submit()} loading={saving} className="flex-1 sm:flex-none">
                        {saving ? t.common.saving : t.common.save}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={cancel} disabled={saving} className="flex-1 sm:flex-none">
                        {t.common.cancel}
                    </Button>
                </div>
            </div>

            {error ? (
                <p id={errorId} role="alert" className="mt-2 text-g-app-caption font-semibold text-action-danger">
                    {error}
                </p>
            ) : editHint ? (
                <p id={hintId} className="mt-2 text-g-app-caption leading-snug text-fg-secondary">
                    {editHint}
                </p>
            ) : null}
        </div>
    )
}
