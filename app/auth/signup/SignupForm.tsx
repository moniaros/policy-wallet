"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { registerUser } from "../actions"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { authHref } from "@/lib/seo/locale-links"
import { useLanguage } from "@/contexts/LanguageContext"
import { AuthShell } from "@/components/auth/AuthShell"
import { TrustPanel, MobileTrustFacts } from "@/components/auth/TrustPanel"
import { SocialAuthRow } from "@/components/auth/SocialAuthRow"
import { AuthDivider } from "@/components/auth/AuthDivider"
import { FormField, AUTH_INPUT_CLASS } from "@/components/auth/FormField"
import { PasswordField } from "@/components/auth/PasswordField"
import { TermsCheckbox } from "@/components/auth/TermsCheckbox"
import { FormError } from "@/components/auth/FormError"
import { RoleSwitchLink } from "@/components/auth/RoleSwitchLink"
import { liveProvidersFor } from "@/lib/auth/social-providers"

/**
 * The two signup screens (brief §2.4/§2.5), on the split AuthShell:
 *
 *  - policyholder: email, password, terms — three fields, one checkbox;
 *  - agent: + full name.
 *
 * The phone field is GONE (docs/auth-audit.md §7): it was the synthetic login
 * identifier, which skipped verification and had no recovery. Email is the
 * identity for both roles now. Validation is inline, on blur, never on
 * keystroke; one message per field, phrased as what to do; server errors land
 * in the same slots — never a toast. Copy differs per role: the agent is
 * not storing their own policies.
 */

const zodErrors: Record<string, { el: string; en: string }> = {
    name_required: { el: "Γράψτε το ονοματεπώνυμό σας — το βλέπουν οι πελάτες σας.", en: "Enter your full name — your clients will see it." },
    email_required: { el: "Χρειάζομαι ένα email για να σας στέλνω τις υπενθυμίσεις.", en: "I need an email to send your reminders to." },
    email_invalid: { el: "Ελέγξτε τη διεύθυνση email — δεν φαίνεται πλήρης.", en: "Check the email address — it looks incomplete." },
    password_short: { el: "Χρησιμοποιήστε τουλάχιστον 8 χαρακτήρες.", en: "Use at least 8 characters." },
    terms_required: { el: "Για να συνεχίσετε, αποδεχθείτε τους όρους.", en: "To continue, accept the terms." },
}

function getZodError(message: string | undefined, language: "el" | "en"): string {
    if (!message) return ""
    const entry = zodErrors[message]
    return entry ? entry[language] : message
}

function buildSchema(role: "policyholder" | "agent") {
    return z.object({
        fullName: role === "agent" ? z.string().trim().min(1, "name_required") : z.string().optional(),
        email: z
            .string()
            .trim()
            .toLowerCase()
            .min(1, "email_required")
            .refine((value) => z.email().safeParse(value).success, "email_invalid"),
        password: z.string().min(8, "password_short"),
        termsAccepted: z.boolean().refine((value) => value, "terms_required"),
    })
}

type SignupFormValues = z.infer<ReturnType<typeof buildSchema>>

interface SignUpProps {
    fixedRole: "policyholder" | "agent"
    /** Resolved server-side from the ALLOW_REGISTRATIONS flag; see lib/auth/registration-gate.ts. */
    registrationsOpen: boolean
}

/**
 * What the signup URL shows while new registrations are paused.
 *
 * The last sentence is load-bearing, not politeness: an agent's invited
 * customer IS still allowed through, and some of them arrive here without the
 * token in the URL because they typed the address rather than following the
 * link. Without that line the product would be refusing people it has in fact
 * exempted, and they would have no way to find out.
 */
function RegistrationsClosed({ locale }: { locale: "el" | "en" }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    return (
        <AuthShell>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">
                {t("Οι νέες εγγραφές είναι προσωρινά κλειστές.", "New registrations are paused.")}
            </h1>
            <p className="mt-g-4 text-g-body text-fg-secondary">
                {t(
                    "Δεν δεχόμαστε νέους λογαριασμούς αυτή τη στιγμή. Αν έχετε ήδη λογαριασμό, μπορείτε να συνδεθείτε κανονικά.",
                    "We are not accepting new accounts right now. If you already have an account, you can still log in as usual.",
                )}
            </p>
            <p className="mt-g-3 text-g-body text-fg-secondary">
                {t(
                    "Αν σας προσκάλεσε ο ασφαλιστικός σας σύμβουλος, χρησιμοποιήστε τον σύνδεσμο της πρόσκλησης — αυτός εξακολουθεί να λειτουργεί.",
                    "If your insurance advisor invited you, use the link in their invitation — that still works.",
                )}
            </p>
            <div className="mt-g-6 border-t border-border-subtle pt-g-5">
                <Link
                    href={authHref("/auth/signin", locale)}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-g-pill bg-action-primary-bg px-g-6 py-g-3 text-base font-semibold text-fg-on-brand transition-colors duration-200 hover:bg-action-primary-hover focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                >
                    {t("Σύνδεση", "Log in")}
                </Link>
            </div>
        </AuthShell>
    )
}

function SignUpForm({ fixedRole, registrationsOpen }: SignUpProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const locale: "el" | "en" = language === "el" ? "el" : "en"

    const source = searchParams.get("source") || "signup_direct"
    const token = searchParams.get("token") || ""
    const selectedPlan = searchParams.get("plan") || ""
    const selectedBilling = searchParams.get("billing") || ""

    const role = fixedRole
    const otherRole = role === "policyholder" ? "agent" : "policyholder"
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [signupSuccess, setSignupSuccess] = useState(false)

    const schema = useMemo(() => buildSchema(role), [role])
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { fullName: "", email: "", password: "", termsAccepted: false },
        // Inline, on blur, never on keystroke (brief §2.4).
        mode: "onBlur",
        reValidateMode: "onBlur",
    })
    const passwordValue = useWatch({ control, name: "password" }) || ""

    useEffect(() => {
        trackLandingEvent("page_view_signup", { role, source, locale: language })
    }, [language, role, source])

    // An invited customer arrives with ?token=..., and the invite exemption in
    // lib/auth/registration-gate.ts means their signup genuinely will succeed —
    // so they keep the form. Everyone else gets the notice. This is presentation
    // only: registerUser is what actually decides, and it re-checks the address.
    if (!registrationsOpen && !token) {
        return <RegistrationsClosed locale={locale} />
    }

    // Copy per role (§2.5): the promise for the person; the workbench for the
    // professional. One H1 per page; the H1 is the promise, the button is the act.
    const copy =
        role === "policyholder"
            ? {
                  h1: t("Δείτε τι πραγματικά σας καλύπτει.", "See what actually covers you."),
                  sub: t(
                      "Ανεβάζετε τα ασφαλιστήριά σας και σας λέω τι καλύπτουν, τι δεν καλύπτουν και πότε λήγουν.",
                      "You upload your policies and I tell you what they cover, what they do not, and when they run out.",
                  ),
                  underCta: t(
                      "Δωρεάν για 3 ασφαλιστήρια. Χωρίς κάρτα. Διαγράφετε τα πάντα όποτε θέλετε.",
                      "Free for 3 policies. No card. Delete everything whenever you want.",
                  ),
              }
            : {
                  h1: t("Δείτε τι λείπει από τους πελάτες σας.", "See what your clients are missing."),
                  sub: t(
                      "Ο πελάτης σας μοιράζεται όσα θέλει. Εσείς βλέπετε κενά, λήξεις και τι αξίζει να ρωτήσετε.",
                      "Your client shares what they choose. You see gaps, expiries, and what is worth asking.",
                  ),
                  underCta: t("Δωρεάν δοκιμή με έναν πελάτη. Χωρίς κάρτα.", "Free trial with one client. No card."),
              }

    const oauthNext = role === "agent" ? "/onboarding/agent" : "/onboarding"
    const hasSocial = liveProvidersFor(role).length > 0
    const crossQuery = searchParams.toString()
    const crossHref = authHref(`/auth/signup/${otherRole}`, locale) + (crossQuery ? `${authHref(`/auth/signup/${otherRole}`, locale).includes("?") ? "&" : "?"}${crossQuery}` : "")

    const onSubmit = async (values: SignupFormValues) => {
        setServerError(null)
        setIsSubmitting(true)
        const sanitizedEmail = values.email.trim().toLowerCase()

        const formData = new FormData()
        formData.append("email", sanitizedEmail)
        formData.append("password", values.password)
        formData.append("confirmPassword", values.password)
        formData.append("name", role === "agent" ? (values.fullName || "").trim() : "")
        formData.append("role", role)
        formData.append("language", language)
        formData.append("termsAccepted", String(values.termsAccepted))
        formData.append("marketingConsent", "false")
        if (token) formData.append("token", token)
        if (selectedPlan) formData.append("selectedPlan", selectedPlan)
        if (selectedBilling) formData.append("selectedBilling", selectedBilling)

        try {
            trackLandingEvent("signup_started", { role, source, locale: language, identifier_type: "email" })
            trackLandingEvent("signup_start", { role, source, locale: language, identifier_type: "email" })
            const result = await registerUser(formData)

            if (!result.success) {
                const err =
                    typeof result.error === "string"
                        ? result.error
                        : Object.values((result.error || {}) as Record<string, string[]>).flat().join(", ") ||
                          t("Η εγγραφή απέτυχε", "Signup failed")
                setServerError(err)
                setIsSubmitting(false)
                return
            }

            trackLandingEvent("signup_completed", { role, source, locale: language, identifier_type: "email" })
            trackLandingEvent("signup_complete", { role, source, locale: language, identifier_type: "email" })
            setSignupSuccess(true)
            router.push(result.redirect || "/onboarding")
        } catch {
            setServerError(t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again."))
            setIsSubmitting(false)
        }
    }

    return (
        <AuthShell panel={<TrustPanel variant={role} />}>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">{copy.h1}</h1>
            <p className="mt-g-3 text-g-body text-fg-secondary">{copy.sub}</p>

            {hasSocial && (
                <div className="mt-g-6">
                    <SocialAuthRow role={role} locale={locale} next={oauthNext} showTermsNote />
                    <AuthDivider label={t("ή", "or")} />
                </div>
            )}

            <form noValidate onSubmit={handleSubmit(onSubmit)} className={`flex flex-col gap-g-5 ${hasSocial ? "" : "mt-g-6"}`}>
                {role === "agent" && (
                    <FormField id="signup-name" label={t("Ονοματεπώνυμο", "Full name")} error={getZodError(errors.fullName?.message, language) || null}>
                        <input
                            type="text"
                            autoComplete="name"
                            autoCapitalize="words"
                            placeholder={t("π.χ. Μαρία Παπαδοπούλου", "e.g. Maria Papadopoulou")}
                            className={AUTH_INPUT_CLASS}
                            {...register("fullName")}
                        />
                    </FormField>
                )}

                <FormField id="signup-email" label="Email" error={getZodError(errors.email?.message, language) || null}>
                    <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="name@example.com"
                        className={AUTH_INPUT_CLASS}
                        {...register("email")}
                    />
                </FormField>

                <PasswordField
                    id="signup-password"
                    locale={locale}
                    label={t("Κωδικός πρόσβασης", "Password")}
                    error={getZodError(errors.password?.message, language) || null}
                    value={passwordValue}
                    inputProps={{ autoComplete: "new-password", ...register("password") }}
                />

                <TermsCheckbox
                    locale={locale}
                    error={getZodError(errors.termsAccepted?.message, language) || null}
                    inputProps={register("termsAccepted")}
                />

                <FormError id="signup-server-error">{serverError}</FormError>

                <button
                    type="submit"
                    disabled={isSubmitting || signupSuccess}
                    aria-busy={isSubmitting || undefined}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-g-2 rounded-g-pill bg-action-primary-bg px-g-6 py-g-3 text-base font-semibold text-fg-on-brand transition-colors duration-200 hover:bg-action-primary-hover disabled:opacity-60 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                >
                    {(isSubmitting || signupSuccess) && <Loader2 aria-hidden className="size-4 animate-spin" />}
                    {signupSuccess
                        ? t("Ο λογαριασμός δημιουργήθηκε", "Account created")
                        : t("Δημιουργία λογαριασμού", "Create account")}
                </button>

                <p className="text-center text-g-caption text-fg-secondary">{copy.underCta}</p>
            </form>

            <div className="mt-g-6 flex flex-col gap-g-3 border-t border-border-subtle pt-g-5">
                <RoleSwitchLink locale={locale} target={otherRole} href={crossHref} />
                <p className="text-center text-g-body-sm text-fg-secondary">
                    {t("Έχετε ήδη λογαριασμό;", "Already have an account?")}{" "}
                    <Link
                        href={authHref("/auth/signin", locale)}
                        className="inline-block min-h-6 py-1 font-semibold text-fg-brand underline decoration-border-strong underline-offset-4 hover:decoration-current"
                    >
                        {t("Σύνδεση", "Log in")}
                    </Link>
                </p>
            </div>

            <MobileTrustFacts />
        </AuthShell>
    )
}

export function SignUpFormPage({ fixedRole, registrationsOpen }: SignUpProps) {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-dvh items-center justify-center bg-surface-base">
                    <Loader2 aria-hidden className="size-7 animate-spin text-fg-brand" />
                </div>
            }
        >
            <SignUpForm fixedRole={fixedRole} registrationsOpen={registrationsOpen} />
        </Suspense>
    )
}
