"use client"

import { FormEvent, useState } from "react"
import { Clock3, Mail, MapPin, Phone, Send } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { hasCompleteAddress, siteConfig } from "@/lib/seo/site"

/**
 * /contact.
 *
 * Two things were wrong here and neither was visible from the Greek page:
 *
 *  - The English route served a fully Greek page. The component accepted a
 *    `locale` prop and then ignored it: every label, every option, every
 *    validation message was a Greek string literal. An English visitor
 *    reached a form they could not read.
 *  - **The form was unusable in dark mode.** The inputs carried a border and
 *    padding but no background or text colour. Tailwind's preflight sets
 *    `color: inherit` on form controls, and the page root sets
 *    `dark:text-white`, so the text rendered white on the browser's default
 *    white control background. They now use the `.pw-input` recipe, which
 *    declares both.
 *
 * The subject VALUES stay Greek on purpose: /api/contact validates them with
 * `z.enum` against those exact strings. The English visitor sees English
 * labels; the wire format is unchanged.
 */

const SUBJECT_OPTIONS = [
    { value: "Γενική Ερώτηση", el: "Γενική ερώτηση", en: "General question" },
    { value: "Συνεργασία", el: "Συνεργασία", en: "Partnership" },
    { value: "Τεχνική Υποστήριξη", el: "Τεχνική υποστήριξη", en: "Technical support" },
    { value: "Τιμολόγηση", el: "Τιμές και πλάνα", en: "Pricing and plans" },
] as const

type SubjectValue = (typeof SUBJECT_OPTIONS)[number]["value"]

interface ContactFormState {
    name: string
    email: string
    phone: string
    subject: SubjectValue | ""
    message: string
}

type ContactField = keyof ContactFormState
type ContactErrors = Partial<Record<ContactField, string>>

const INITIAL_FORM: ContactFormState = {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
}

/** Every message the form can show, in both languages. */
const COPY = {
    kicker: { el: "Επικοινωνία", en: "Contact" },
    title: { el: "Πείτε μας πώς μπορούμε να βοηθήσουμε.", en: "Tell us how we can help." },
    intro: {
        el: "Συμπληρώστε τη φόρμα και θα σας απαντήσουμε. Διαβάζουμε κάθε μήνυμα.",
        en: "Fill in the form and we will get back to you. We read every message.",
    },
    name: { el: "Ονοματεπώνυμο", en: "Full name" },
    email: { el: "Email", en: "Email" },
    phone: { el: "Τηλέφωνο (προαιρετικό)", en: "Phone (optional)" },
    subject: { el: "Θέμα", en: "Subject" },
    subjectPlaceholder: { el: "Διαλέξτε θέμα", en: "Choose a subject" },
    message: { el: "Μήνυμα", en: "Message" },
    submit: { el: "Στείλτε το μήνυμα", en: "Send your message" },
    submitting: { el: "Στέλνουμε…", en: "Sending…" },
    success: {
        el: "Το μήνυμά σας στάλθηκε. Θα σας απαντήσουμε σύντομα.",
        en: "Your message is on its way. We will get back to you soon.",
    },
    submitFailed: {
        el: "Το μήνυμα δεν στάλθηκε. Δοκιμάστε ξανά.",
        en: "The message did not go through. Please try again.",
    },
    networkFailed: {
        el: "Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.",
        en: "Something went wrong. Please try again in a moment.",
    },
    errName: { el: "Γράψτε το όνομά σας.", en: "Please write your name." },
    errNameShort: {
        el: "Το όνομα πρέπει να έχει τουλάχιστον 2 γράμματα.",
        en: "Your name needs at least 2 letters.",
    },
    errEmail: { el: "Γράψτε το email σας.", en: "Please write your email." },
    errEmailInvalid: { el: "Αυτό το email δεν φαίνεται σωστό.", en: "That email does not look right." },
    errPhone: { el: "Αυτό το τηλέφωνο δεν φαίνεται σωστό.", en: "That phone number does not look right." },
    errSubject: { el: "Διαλέξτε θέμα.", en: "Please choose a subject." },
    errMessage: { el: "Γράψτε μας το μήνυμά σας.", en: "Please write your message." },
    errMessageShort: {
        el: "Γράψτε λίγο περισσότερα — τουλάχιστον 20 χαρακτήρες.",
        en: "Please write a little more — at least 20 characters.",
    },
    detailsTitle: { el: "Πώς αλλιώς να μας βρείτε", en: "Other ways to reach us" },
    phoneLabel: { el: "Τηλέφωνο", en: "Phone" },
    addressLabel: { el: "Διεύθυνση", en: "Address" },
    hoursLabel: { el: "Ώρες που απαντάμε", en: "When we answer" },
    hoursValue: { el: "Δευτέρα – Παρασκευή, 09:00 – 18:00", en: "Monday – Friday, 09:00 – 18:00" },
} as const

export default function ContactPage({ locale = "el" }: { locale?: "el" | "en" }) {
    const t = (key: keyof typeof COPY) => (locale === "el" ? COPY[key].el : COPY[key].en)

    const [form, setForm] = useState<ContactFormState>(INITIAL_FORM)
    const [errors, setErrors] = useState<ContactErrors>({})
    // Honeypot — hidden from humans, irresistible to bots. Filled = silently dropped server-side.
    const [honeypot, setHoneypot] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const validate = (values: ContactFormState): ContactErrors => {
        const next: ContactErrors = {}
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phonePattern = /^\+?[0-9()\-\s]{7,20}$/

        if (!values.name.trim()) next.name = t("errName")
        else if (values.name.trim().length < 2) next.name = t("errNameShort")

        if (!values.email.trim()) next.email = t("errEmail")
        else if (!emailPattern.test(values.email.trim())) next.email = t("errEmailInvalid")

        if (values.phone.trim() && !phonePattern.test(values.phone.trim())) next.phone = t("errPhone")

        if (!values.subject) next.subject = t("errSubject")

        if (!values.message.trim()) next.message = t("errMessage")
        else if (values.message.trim().length < 20) next.message = t("errMessageShort")

        return next
    }

    const setField = <K extends ContactField>(field: K, value: ContactFormState[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: undefined }))
        setSuccessMessage(null)
        setSubmitError(null)
    }

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccessMessage(null)
        setSubmitError(null)

        const nextErrors = validate(form)
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors)
            // Without this, a screen-reader user who activates submit hears
            // NOTHING: the fields get aria-invalid but focus stays on the
            // button and no live region fires. Moving focus to the first
            // invalid control both announces its error (via aria-describedby)
            // and puts the keyboard where the work is.
            const firstInvalid = (event.currentTarget as HTMLFormElement).querySelector<HTMLElement>(
                '[aria-invalid="true"], input[id], textarea[id]'
            )
            requestAnimationFrame(() => {
                const target = document.querySelector<HTMLElement>('[aria-invalid="true"]')
                ;(target ?? firstInvalid)?.focus()
            })
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim(),
                    subject: form.subject,
                    message: form.message.trim(),
                    website_url: honeypot,
                }),
            })

            const payload = (await response.json()) as {
                success?: boolean
                message?: string
                errors?: Partial<Record<ContactField, string>>
            }

            if (!response.ok || !payload.success) {
                // The API answers in Greek. Use only WHICH fields it rejected
                // and supply the wording in the visitor's own language.
                if (payload.errors) {
                    const localized = validate(form)
                    const flagged: ContactErrors = {}
                    for (const field of Object.keys(payload.errors) as ContactField[]) {
                        flagged[field] = localized[field] ?? t("submitFailed")
                    }
                    setErrors(flagged)
                }
                setSubmitError(t("submitFailed"))
                return
            }

            setForm(INITIAL_FORM)
            setErrors({})
            setSuccessMessage(t("success"))
        } catch {
            setSubmitError(t("networkFailed"))
        } finally {
            setIsSubmitting(false)
        }
    }

    // min-h-11: pw-input-sm's padding computes to 39px, which is under the
    // comfortable touch minimum — and a <select> is the one control here that
    // cannot be hit anywhere but on itself.
    const fieldClass = (hasError: boolean) =>
        `pw-input pw-input-sm min-h-11 text-[#0F172A] dark:text-white ${hasError ? "ring-2 ring-red-500/40" : ""}`

    return (
        <LoBPageShell activeNav="none" locale={locale}>
            <section className="px-6 pb-20 md:px-12">
                <div className="mx-auto max-w-page">
                    <div className="mb-10">
                        <p className="mb-3 text-caption font-semibold tracking-widest uppercase text-[#29685B] dark:text-[#A7F3D0]">
                            {t("kicker")}
                        </p>
                        <h1 className="mb-4 text-h1 leading-[1.05] font-semibold tracking-[-0.03em] text-[#0F172A] md:text-display dark:text-white">
                            {t("title")}
                        </h1>
                        <p className="max-w-[720px] text-lead text-[#475569] dark:text-slate-300">{t("intro")}</p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
                        <form
                            onSubmit={onSubmit}
                            noValidate
                            className="rounded-[14px] border border-[#E2E8F0] bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900"
                        >
                            {/* Honeypot: "website_url" is not a browser-autofill
                                token (unlike the old name="company", which
                                autofill profiles silently filled, getting real
                                messages dropped as bot traffic). */}
                            <input
                                type="text"
                                name="website_url"
                                value={honeypot}
                                onChange={(event) => setHoneypot(event.target.value)}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                className="absolute left-[-9999px] h-0 w-0 opacity-0"
                            />

                            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-body-sm font-medium text-[#0F172A] dark:text-white">
                                        {t("name")}
                                    </span>
                                    <input
                                        type="text"
                                        autoComplete="name"
                                        required
                                        value={form.name}
                                        onChange={(event) => setField("name", event.target.value)}
                                        className={fieldClass(Boolean(errors.name))}
                                        aria-invalid={Boolean(errors.name)}
                                        aria-describedby={errors.name ? "contact-name-error" : undefined}
                                    />
                                    {errors.name ? (
                                        <p id="contact-name-error" className="mt-1 text-body-sm text-[#B91C1C] dark:text-red-300">
                                            {errors.name}
                                        </p>
                                    ) : null}
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-body-sm font-medium text-[#0F172A] dark:text-white">
                                        {t("email")}
                                    </span>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={form.email}
                                        onChange={(event) => setField("email", event.target.value)}
                                        className={fieldClass(Boolean(errors.email))}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                                    />
                                    {errors.email ? (
                                        <p id="contact-email-error" className="mt-1 text-body-sm text-[#B91C1C] dark:text-red-300">
                                            {errors.email}
                                        </p>
                                    ) : null}
                                </label>
                            </div>

                            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-body-sm font-medium text-[#0F172A] dark:text-white">
                                        {t("phone")}
                                    </span>
                                    <input
                                        type="tel"
                                        autoComplete="tel"
                                        value={form.phone}
                                        onChange={(event) => setField("phone", event.target.value)}
                                        className={fieldClass(Boolean(errors.phone))}
                                        aria-invalid={Boolean(errors.phone)}
                                        aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                                    />
                                    {errors.phone ? (
                                        <p id="contact-phone-error" className="mt-1 text-body-sm text-[#B91C1C] dark:text-red-300">
                                            {errors.phone}
                                        </p>
                                    ) : null}
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-body-sm font-medium text-[#0F172A] dark:text-white">
                                        {t("subject")}
                                    </span>
                                    <select
                                        required
                                        value={form.subject}
                                        onChange={(event) => setField("subject", event.target.value as SubjectValue | "")}
                                        className={fieldClass(Boolean(errors.subject))}
                                        aria-invalid={Boolean(errors.subject)}
                                        aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                                    >
                                        <option value="">{t("subjectPlaceholder")}</option>
                                        {SUBJECT_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {locale === "el" ? option.el : option.en}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.subject ? (
                                        <p id="contact-subject-error" className="mt-1 text-body-sm text-[#B91C1C] dark:text-red-300">
                                            {errors.subject}
                                        </p>
                                    ) : null}
                                </label>
                            </div>

                            <label className="mb-6 block">
                                <span className="mb-2 block text-body-sm font-medium text-[#0F172A] dark:text-white">
                                    {t("message")}
                                </span>
                                <textarea
                                    required
                                    value={form.message}
                                    onChange={(event) => setField("message", event.target.value)}
                                    rows={7}
                                    className={`${fieldClass(Boolean(errors.message))} resize-y`}
                                    aria-invalid={Boolean(errors.message)}
                                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                                />
                                {errors.message ? (
                                    <p id="contact-message-error" className="mt-1 text-body-sm text-[#B91C1C] dark:text-red-300">
                                        {errors.message}
                                    </p>
                                ) : null}
                            </label>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="pw-primary-button disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Send aria-hidden className="h-4 w-4" />
                                    {isSubmitting ? t("submitting") : t("submit")}
                                </button>
                                {/* Announced, not just painted: without a live
                                    region a screen-reader user submits the form
                                    and hears nothing at all. */}
                                <p role="status" aria-live="polite" className="text-body-sm text-[#166534] dark:text-[#A7F3D0]">
                                    {successMessage}
                                </p>
                                {submitError ? (
                                    <p role="alert" className="text-body-sm text-[#B91C1C] dark:text-red-300">
                                        {submitError}
                                    </p>
                                ) : null}
                            </div>
                        </form>

                        <aside className="rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="mb-6 text-h3 font-semibold text-[#0F172A] dark:text-white">
                                {t("detailsTitle")}
                            </h2>

                            <div className="space-y-5 text-body text-[#334155] dark:text-slate-300">
                                <div className="flex items-start gap-3">
                                    <Mail aria-hidden className="mt-0.5 h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                    <div>
                                        <p className="font-medium text-[#0F172A] dark:text-white">{t("email")}</p>
                                        {/* Plain-text address so AI crawlers and answer engines
                                            can read it (Cloudflare obfuscation hides mailto). */}
                                        <p>{siteConfig.contactEmail}</p>
                                    </div>
                                </div>

                                {siteConfig.contactPhone ? (
                                    <div className="flex items-start gap-3">
                                        <Phone aria-hidden className="mt-0.5 h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                        <div>
                                            <p className="font-medium text-[#0F172A] dark:text-white">{t("phoneLabel")}</p>
                                            <p>{siteConfig.contactPhone}</p>
                                        </div>
                                    </div>
                                ) : null}

                                {hasCompleteAddress() ? (
                                    <div className="flex items-start gap-3">
                                        <MapPin aria-hidden className="mt-0.5 h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                        <div>
                                            <p className="font-medium text-[#0F172A] dark:text-white">{t("addressLabel")}</p>
                                            <p>
                                                {siteConfig.address.streetAddress},{" "}
                                                {siteConfig.address.postalCode}{" "}
                                                {siteConfig.address.addressLocality}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex items-start gap-3">
                                    <Clock3 aria-hidden className="mt-0.5 h-5 w-5 text-[#29685B] dark:text-[#A7F3D0]" />
                                    <div>
                                        <p className="font-medium text-[#0F172A] dark:text-white">{t("hoursLabel")}</p>
                                        <p>{t("hoursValue")}</p>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </LoBPageShell>
    )
}
