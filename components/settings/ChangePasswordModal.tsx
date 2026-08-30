"use client"

import { useEffect, useId, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Modal } from "@/components/ui/Modal"
import { useLanguage } from "@/contexts/LanguageContext"
import { changePassword } from "@/app/(protected)/me/security-actions"

/**
 * Change password.
 *
 * The server action behind this existed for months with no way to reach it.
 * Every failure mode gets its own message beside the field that caused it —
 * "something went wrong" for a wrong current password would send people to the
 * reset-by-email flow they do not need.
 */
export function ChangePasswordModal({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useLanguage()
    const copy = t.settings.security
    const baseId = useId()

    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [confirm, setConfirm] = useState("")
    const [error, setError] = useState<{ field: "current" | "next" | "confirm"; message: string } | null>(null)
    const [pending, setPending] = useState(false)

    useEffect(() => {
        if (open) return
        setCurrent("")
        setNext("")
        setConfirm("")
        setError(null)
        setPending(false)
    }, [open])

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (next.length < 8) {
            setError({ field: "next", message: copy.passwordTooShort })
            return
        }
        if (next !== confirm) {
            setError({ field: "confirm", message: copy.passwordMismatch })
            return
        }
        if (next === current) {
            setError({ field: "next", message: copy.passwordSame })
            return
        }

        setError(null)
        setPending(true)
        const result = await changePassword(current, next)
        setPending(false)

        if ("success" in result) {
            toast.success(copy.passwordChanged)
            onOpenChange(false)
            return
        }

        switch (result.error) {
            case "WRONG_PASSWORD":
                setError({ field: "current", message: copy.passwordWrong })
                break
            case "WEAK_PASSWORD":
                setError({ field: "next", message: copy.passwordTooShort })
                break
            case "SAME_PASSWORD":
                setError({ field: "next", message: copy.passwordSame })
                break
            case "RATE_LIMITED":
                toast.error(copy.passwordRateLimited)
                break
            default:
                toast.error(copy.passwordFailed)
        }
    }

    const fieldError = (field: "current" | "next" | "confirm") =>
        error?.field === field ? error.message : null

    const renderField = (
        field: "current" | "next" | "confirm",
        label: string,
        value: string,
        onChange: (value: string) => void,
        autoComplete: string,
        hint?: string
    ) => {
        const id = `${baseId}-${field}`
        const message = fieldError(field)
        return (
            <div className="space-y-1.5">
                <label htmlFor={id} className="ml-1 block text-caption font-medium text-muted-foreground">
                    {label}
                </label>
                <input
                    id={id}
                    type="password"
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(event) => {
                        onChange(event.target.value)
                        if (error?.field === field) setError(null)
                    }}
                    disabled={pending}
                    required
                    aria-invalid={message ? true : undefined}
                    aria-describedby={message ? `${id}-error` : hint ? `${id}-hint` : undefined}
                    className="pw-input pw-input-sm min-h-11 w-full"
                />
                {message ? (
                    <p
                        id={`${id}-error`}
                        role="alert"
                        className="ml-1 text-caption font-semibold text-red-700 dark:text-red-400"
                    >
                        {message}
                    </p>
                ) : hint ? (
                    <p id={`${id}-hint`} className="ml-1 text-caption text-muted-foreground">
                        {hint}
                    </p>
                ) : null}
            </div>
        )
    }

    return (
        <Modal
            isOpen={open}
            onClose={() => {
                if (!pending) onOpenChange(false)
            }}
            ariaLabelledBy={`${baseId}-title`}
            closeLabel={t.common.close}
        >
            <form onSubmit={submit} className="p-6 md:p-8">
                <h2 id={`${baseId}-title`} className="text-lead font-semibold text-foreground">
                    {copy.changePassword}
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">{copy.passwordDesc}</p>

                <div className="mt-5 space-y-4">
                    {renderField("current", copy.currentPassword, current, setCurrent, "current-password")}
                    {renderField(
                        "next",
                        copy.newPassword,
                        next,
                        setNext,
                        "new-password",
                        copy.passwordRules
                    )}
                    {renderField("confirm", copy.confirmPassword, confirm, setConfirm, "new-password")}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={pending}
                        className="pw-secondary-button pw-btn-sm disabled:opacity-60"
                    >
                        {t.common.cancel}
                    </button>
                    <button type="submit" disabled={pending} className="pw-primary-button pw-btn-sm disabled:opacity-60">
                        {pending && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
                        {pending ? t.common.saving : copy.changePassword}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
