"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { AuthShell } from "@/components/auth/AuthShell"
import { PasswordField } from "@/components/auth/PasswordField"
import { AUTH_NOTICE_COVERED_CLASS, AUTH_NOTICE_GAP_CLASS, AUTH_SECONDARY_LINK_CLASS } from "@/components/auth/FormField"
import { Button } from "@/src/design-system"
import { authHref } from "@/lib/seo/locale-links"
import { resetPasswordWithToken } from "../actions"

// Lang-aware so the Zod messages the form renders (errors.*.message) are
// localised — they were hardcoded English, so a Greek user resetting their
// password saw "Use at least 8 characters" / "Passwords do not match" in
// English. lint:i18n-changed doesn't inspect Zod message args.
function buildResetSchema(msgs: { minChars: string; mismatch: string }) {
    return z.object({
        password: z.string().min(8, msgs.minChars),
        confirmPassword: z.string().min(8, msgs.minChars),
    }).refine((data) => data.password === data.confirmPassword, {
        message: msgs.mismatch,
        path: ["confirmPassword"],
    })
}

type ResetValues = { password: string; confirmPassword: string }

/**
 * The two password fields are the shared PasswordField (signup's): a bound
 * label, the reveal toggle, the rule in words and the labelled meter. The
 * hand-rolled pair this replaced had `<label>`s with no `htmlFor`, so neither
 * field had an accessible name, and a three-segment meter that told a
 * screen-reader user nothing.
 */
function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { language } = useLanguage()
    // Internal auth links must carry the pinned language; a bare href
    // dropped an English visitor onto the Greek sign-in page.
    const authLocale: "el" | "en" = language === "el" ? "el" : "en"
    const isGreek = language === "el"
    const lang = isGreek ? "el" : "en"

    const token = searchParams.get("token")?.trim() || ""
    const email = searchParams.get("email")?.trim().toLowerCase() || ""

    const [serverError, setServerError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const copy = {
        title: COPY.setNewPassword[lang],
        subtitle: isGreek
            ? "Ολοκλήρωσε την επαναφορά με έναν νέο ασφαλή κωδικό."
            : "Complete your recovery by setting a secure new password.",
        invalidLink: isGreek
            ? "Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος."
            : "This reset link is invalid.",
        password: COPY.newPasswordLabel[lang],
        confirm: COPY.confirmPasswordLabel[lang],
        submit: COPY.saveNewPassword[lang],
        submitting: COPY.saving[lang],
        successTitle: COPY.passwordUpdated[lang],
        successBody: isGreek
            ? "Η επαναφορά ολοκληρώθηκε. Μπορείς να συνδεθείς με τον νέο κωδικό."
            : "Your password was reset. You can now sign in with the new password.",
        backToSignIn: COPY.goToSignIn[lang],
    }

    const resetSchema = useMemo(
        () => buildResetSchema({
            minChars: COPY.passwordMinChars[lang],
            mismatch: COPY.passwordsDoNotMatch[lang],
        }),
        [lang],
    )

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<ResetValues>({
        resolver: zodResolver(resetSchema),
        defaultValues: { password: "", confirmPassword: "" },
        mode: "onChange",
    })

    const passwordValue = useWatch({ control, name: "password" }) || ""

    const canSubmit = useMemo(() => Boolean(token && email), [email, token])

    const onSubmit = async (values: ResetValues) => {
        if (!canSubmit) return
        setSubmitting(true)
        setServerError(null)

        const result = await resetPasswordWithToken({
            email,
            token,
            password: values.password,
            language,
        })

        setSubmitting(false)
        if (!result.success) {
            setServerError(result.error || (COPY.updateFailed[lang]))
            return
        }

        setSuccess(true)
        setTimeout(() => {
            router.push("/auth/signin")
        }, 1200)
    }

    return (
        <AuthShell>
            <div className="mb-g-5 flex items-center justify-between text-g-caption font-semibold text-fg-secondary">
                <span className="rounded-g-pill bg-surface-sunken px-g-3 py-g-1">{COPY.secureReset[lang]}</span>
                <span className="inline-flex items-center gap-g-1">
                    <ShieldCheck aria-hidden className="size-3.5 text-fg-brand" />
                    {COPY.encryptedFlow[lang]}
                </span>
            </div>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">{copy.title}</h1>
            <p className="mt-g-3 text-g-body text-fg-secondary">{copy.subtitle}</p>

            <div className="mt-g-6">
                {!canSubmit ? (
                    <div className="flex flex-col gap-g-4">
                        <div role="alert" className={AUTH_NOTICE_GAP_CLASS}>
                            <AlertCircle aria-hidden className="mt-0.5 size-4 flex-shrink-0" />
                            {copy.invalidLink}
                        </div>
                        <Link href={authHref("/auth/forgot-password", authLocale)} className={AUTH_SECONDARY_LINK_CLASS}>
                            <ArrowLeft aria-hidden className="size-4" />
                            {COPY.requestNewLink[lang]}
                        </Link>
                    </div>
                ) : success ? (
                    <div className="flex flex-col gap-g-4">
                        <div role="status" className={AUTH_NOTICE_COVERED_CLASS}>
                            <CheckCircle2 aria-hidden className="mt-0.5 size-4 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="font-semibold">{copy.successTitle}</p>
                                <p className="mt-g-1">{copy.successBody}</p>
                            </div>
                        </div>
                        <Loader2 aria-hidden className="mx-auto size-5 animate-spin text-fg-brand" />
                    </div>
                ) : (
                    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-g-5">
                        <AnimatePresence>
                            {serverError ? (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={AUTH_NOTICE_GAP_CLASS} role="alert">
                                    <AlertCircle aria-hidden className="mt-0.5 size-4 flex-shrink-0" />
                                    <span>{serverError}</span>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <PasswordField
                            id="reset-password"
                            locale={lang}
                            label={copy.password}
                            error={errors.password?.message ?? null}
                            value={passwordValue}
                            inputProps={{ autoComplete: "new-password", ...register("password") }}
                        />

                        <PasswordField
                            id="reset-confirm"
                            locale={lang}
                            label={copy.confirm}
                            error={errors.confirmPassword?.message ?? null}
                            value=""
                            showMeter={false}
                            showRule={false}
                            inputProps={{ autoComplete: "new-password", ...register("confirmPassword") }}
                        />

                        <Button type="submit" size="lg" loading={submitting} className="w-full">
                            {submitting ? copy.submitting : copy.submit}
                        </Button>

                        <Link href={authHref("/auth/signin", authLocale)} className={AUTH_SECONDARY_LINK_CLASS}>
                            <ArrowLeft aria-hidden className="size-4" />
                            {copy.backToSignIn}
                        </Link>
                    </form>
                )}
            </div>
        </AuthShell>
    )
}

/** Page copy in the `{el, en}[locale]` shape used across the auth pages. */
const COPY = {
    setNewPassword: { el: "Νέος κωδικός", en: "Set a new password" },
    newPasswordLabel: { el: "Νέος κωδικός", en: "New password" },
    confirmPasswordLabel: { el: "Επιβεβαίωση κωδικού", en: "Confirm password" },
    saveNewPassword: { el: "Αποθήκευση νέου κωδικού", en: "Save new password" },
    saving: { el: "Αποθήκευση...", en: "Saving..." },
    passwordUpdated: { el: "Ο κωδικός ενημερώθηκε", en: "Password updated" },
    goToSignIn: { el: "Μετάβαση στη σύνδεση", en: "Go to sign in" },
    updateFailed: { el: "Η ενημέρωση απέτυχε.", en: "Could not update password." },
    secureReset: { el: "Επαναφορά ασφαλείας", en: "Secure reset" },
    encryptedFlow: { el: "Κρυπτογραφημένη ροή", en: "Encrypted flow" },
    requestNewLink: { el: "Ζήτα νέο σύνδεσμο", en: "Request a new link" },
    passwordMinChars: { el: "Χρησιμοποίησε τουλάχιστον 8 χαρακτήρες", en: "Use at least 8 characters" },
    passwordsDoNotMatch: { el: "Οι κωδικοί δεν ταιριάζουν", en: "Passwords do not match" },
} as const

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-surface-base"><Loader2 aria-hidden className="size-7 animate-spin text-fg-brand" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}
