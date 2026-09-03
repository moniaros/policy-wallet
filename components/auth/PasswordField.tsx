"use client"

import { useState, type InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"
import { AUTH_INPUT_CLASS } from "@/components/auth/FormField"
import { FormError } from "@/components/auth/FormError"

/**
 * Password input with an accessible reveal toggle, the password rule stated in
 * TEXT («Τουλάχιστον 8 χαρακτήρες»), and a labelled — never blocking — strength
 * meter (brief §2.4). The old three unlabelled segments told a screen-reader
 * user nothing and told everyone else nothing about the actual rule.
 */
type Strength = { level: 0 | 1 | 2 | 3; el: string; en: string }

function assess(value: string): Strength {
    if (!value) return { level: 0, el: "", en: "" }
    if (value.length < 8) return { level: 1, el: "Αδύναμος — κάτω από 8 χαρακτήρες", en: "Weak — under 8 characters" }
    const classes =
        Number(/[a-zα-ωάέήίόύώϊϋΐΰ]/i.test(value)) +
        Number(/\d/.test(value)) +
        Number(/[^\p{L}\d\s]/u.test(value))
    if (value.length >= 12 && classes >= 2) return { level: 3, el: "Ισχυρός", en: "Strong" }
    return { level: 2, el: "Καλός", en: "Good" }
}

export function PasswordField({
    id,
    locale,
    label,
    error,
    value,
    showMeter = true,
    showRule = true,
    inputProps,
}: {
    id: string
    locale: "el" | "en"
    label: string
    error?: string | null
    /** Current value, for the meter only (pass the watched form value). */
    value: string
    /** Sign-in has no use for a meter; signup shows it. */
    showMeter?: boolean
    /** The «Τουλάχιστον 8 χαρακτήρες» line — off on a confirm field, where the field above already states it. */
    showRule?: boolean
    inputProps: InputHTMLAttributes<HTMLInputElement>
}) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const [revealed, setRevealed] = useState(false)
    const strength = assess(value)
    const errorId = `${id}-error`

    // NOT composed through FormField: its cloneElement would decorate the
    // relative WRAPPER div, leaving the label's htmlFor and the aria wiring
    // pointing at nothing (caught live on :3000 — the input rendered id="").
    return (
        <div>
            <label htmlFor={id} className="mb-g-2 block text-sm font-semibold text-fg-primary">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={revealed ? "text" : "password"}
                    autoComplete={inputProps.autoComplete ?? "new-password"}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={`${AUTH_INPUT_CLASS} pr-14`}
                    {...inputProps}
                />
                <button
                    type="button"
                    onClick={() => setRevealed((r) => !r)}
                    aria-label={t(revealed ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού", revealed ? "Hide password" : "Show password")}
                    aria-pressed={revealed}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-g-md text-fg-secondary hover:text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus"
                >
                    {revealed ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
                </button>
            </div>
            <FormError id={errorId}>{error ?? null}</FormError>
            {/* The rule, in words — the meter never blocks submission. */}
            {showRule && (
                <p className="mt-g-2 text-g-caption text-fg-secondary">{t("Τουλάχιστον 8 χαρακτήρες.", "At least 8 characters.")}</p>
            )}
            {showMeter && strength.level > 0 && (
                <div className="mt-g-2">
                    <div aria-hidden className="flex gap-g-1">
                        {[1, 2, 3].map((seg) => (
                            <span
                                key={seg}
                                className={`h-1 flex-1 rounded-g-pill ${
                                    seg <= strength.level
                                        ? strength.level === 1
                                            ? "bg-state-gap"
                                            : "bg-state-covered"
                                        : "bg-border-subtle"
                                }`}
                            />
                        ))}
                    </div>
                    <p className="mt-g-1 text-g-caption text-fg-secondary">
                        {t("Ισχύς κωδικού:", "Password strength:")} {t(strength.el, strength.en)}
                    </p>
                </div>
            )}
        </div>
    )
}
