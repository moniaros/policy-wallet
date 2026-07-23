"use client"

import { FormEvent, useState } from "react"
import { Clock3, Mail, MapPin, Phone, Send } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { hasCompleteAddress, siteConfig } from "@/lib/seo/site"

const SUBJECT_OPTIONS = [
    "Γενική Ερώτηση",
    "Συνεργασία",
    "Τεχνική Υποστήριξη",
    "Τιμολόγηση",
] as const

type SubjectOption = (typeof SUBJECT_OPTIONS)[number]

interface ContactFormState {
    name: string
    email: string
    phone: string
    subject: SubjectOption | ""
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

function validateContactForm(form: ContactFormState): ContactErrors {
    const errors: ContactErrors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phonePattern = /^\+?[0-9()\-\s]{7,20}$/

    if (!form.name.trim()) {
        errors.name = "Το ονοματεπώνυμο είναι υποχρεωτικό."
    } else if (form.name.trim().length < 2) {
        errors.name = "Το ονοματεπώνυμο πρέπει να έχει τουλάχιστον 2 χαρακτήρες."
    }

    if (!form.email.trim()) {
        errors.email = "Το email είναι υποχρεωτικό."
    } else if (!emailPattern.test(form.email.trim())) {
        errors.email = "Συμπληρώστε έγκυρο email."
    }

    if (form.phone.trim() && !phonePattern.test(form.phone.trim())) {
        errors.phone = "Το τηλέφωνο δεν είναι έγκυρο."
    }

    if (!form.subject) {
        errors.subject = "Επιλέξτε θέμα επικοινωνίας."
    }

    if (!form.message.trim()) {
        errors.message = "Το μήνυμα είναι υποχρεωτικό."
    } else if (form.message.trim().length < 20) {
        errors.message = "Το μήνυμα πρέπει να έχει τουλάχιστον 20 χαρακτήρες."
    }

    return errors
}

export default function ContactPage({ locale = "el" }: { locale?: "el" | "en" }) {
    const [form, setForm] = useState<ContactFormState>(INITIAL_FORM)
    const [errors, setErrors] = useState<ContactErrors>({})
    // Honeypot — hidden from humans, irresistible to bots. Filled = silently dropped server-side.
    const [honeypot, setHoneypot] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

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

        const nextErrors = validateContactForm(form)
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors)
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
                errors?: ContactErrors
            }

            if (!response.ok || !payload.success) {
                if (payload.errors) {
                    setErrors(payload.errors)
                }
                setSubmitError(payload.message || "Η αποστολή απέτυχε. Παρακαλώ προσπαθήστε ξανά.")
                return
            }

            setForm(INITIAL_FORM)
            setErrors({})
            setSuccessMessage("Το μήνυμά σας στάλθηκε με επιτυχία. Θα επικοινωνήσουμε σύντομα μαζί σας.")
        } catch {
            setSubmitError("Παρουσιάστηκε τεχνικό πρόβλημα. Παρακαλώ προσπαθήστε ξανά σε λίγο.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <LoBPageShell activeNav="none" locale={locale}>
            <section className="px-6 pb-20 md:px-12">
                <div className="mx-auto max-w-[1200px]">
                    <div className="mb-10">
                        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#29685B]">Επικοινωνία</p>
                        <h1 className="mb-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-[56px]">
                            Πείτε μας πώς μπορούμε να βοηθήσουμε.
                        </h1>
                        <p className="max-w-[720px] text-[18px] text-[#475569]">
                            Συμπληρώστε τη φόρμα και η ομάδα μας θα επικοινωνήσει μαζί σας με τα επόμενα βήματα.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
                        <form onSubmit={onSubmit} className="rounded-[14px] border border-[#E2E8F0] bg-white p-6 shadow-sm md:p-8">
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
                                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">Ονοματεπώνυμο</span>
                                    <input
                                        type="text"
                                        autoComplete="name"
                                        value={form.name}
                                        onChange={(event) => setField("name", event.target.value)}
                                        className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${
                                            errors.name ? "border-[#DC2626]" : "border-[#CBD5E1] focus:border-[#29685B]"
                                        }`}
                                        aria-invalid={Boolean(errors.name)}
                                        aria-describedby={errors.name ? "contact-name-error" : undefined}
                                    />
                                    {errors.name ? (
                                        <p id="contact-name-error" className="mt-1 text-sm text-[#B91C1C]">
                                            {errors.name}
                                        </p>
                                    ) : null}
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">Email</span>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        value={form.email}
                                        onChange={(event) => setField("email", event.target.value)}
                                        className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${
                                            errors.email ? "border-[#DC2626]" : "border-[#CBD5E1] focus:border-[#29685B]"
                                        }`}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                                    />
                                    {errors.email ? (
                                        <p id="contact-email-error" className="mt-1 text-sm text-[#B91C1C]">
                                            {errors.email}
                                        </p>
                                    ) : null}
                                </label>
                            </div>

                            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">Τηλέφωνο (προαιρετικό)</span>
                                    <input
                                        type="tel"
                                        autoComplete="tel"
                                        value={form.phone}
                                        onChange={(event) => setField("phone", event.target.value)}
                                        className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${
                                            errors.phone ? "border-[#DC2626]" : "border-[#CBD5E1] focus:border-[#29685B]"
                                        }`}
                                        aria-invalid={Boolean(errors.phone)}
                                        aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                                    />
                                    {errors.phone ? (
                                        <p id="contact-phone-error" className="mt-1 text-sm text-[#B91C1C]">
                                            {errors.phone}
                                        </p>
                                    ) : null}
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">Θέμα</span>
                                    <select
                                        value={form.subject}
                                        onChange={(event) => setField("subject", event.target.value as SubjectOption | "")}
                                        className={`w-full rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${
                                            errors.subject ? "border-[#DC2626]" : "border-[#CBD5E1] focus:border-[#29685B]"
                                        }`}
                                        aria-invalid={Boolean(errors.subject)}
                                        aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                                    >
                                        <option value="">Επιλέξτε θέμα</option>
                                        {SUBJECT_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.subject ? (
                                        <p id="contact-subject-error" className="mt-1 text-sm text-[#B91C1C]">
                                            {errors.subject}
                                        </p>
                                    ) : null}
                                </label>
                            </div>

                            <label className="mb-6 block">
                                <span className="mb-2 block text-sm font-medium text-[#0F172A]">Μήνυμα</span>
                                <textarea
                                    value={form.message}
                                    onChange={(event) => setField("message", event.target.value)}
                                    rows={7}
                                    className={`w-full resize-y rounded-[10px] border px-4 py-3 text-[14px] outline-none transition-colors ${
                                        errors.message ? "border-[#DC2626]" : "border-[#CBD5E1] focus:border-[#29685B]"
                                    }`}
                                    aria-invalid={Boolean(errors.message)}
                                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                                />
                                {errors.message ? (
                                    <p id="contact-message-error" className="mt-1 text-sm text-[#B91C1C]">
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
                                    <Send className="h-4 w-4" />
                                    {isSubmitting ? "Αποστολή..." : "Αποστολή μηνύματος"}
                                </button>
                                {successMessage ? (
                                    <p className="text-sm text-[#166534]">{successMessage}</p>
                                ) : null}
                                {submitError ? <p className="text-sm text-[#B91C1C]">{submitError}</p> : null}
                            </div>
                        </form>

                        <aside className="rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-sm md:p-8">
                            <h2 className="mb-6 text-[24px] font-semibold text-[#0F172A]">Στοιχεία εταιρείας</h2>

                            <div className="space-y-5 text-[14px] text-[#334155]">
                                <div className="flex items-start gap-3">
                                    <Mail className="mt-0.5 h-5 w-5 text-[#29685B]" />
                                    <div>
                                        <p className="font-medium text-[#0F172A]">Email</p>
                                        {/* Plain-text address so AI crawlers and answer engines
                                            can read it (Cloudflare obfuscation hides mailto). */}
                                        <p>{siteConfig.contactEmail}</p>
                                    </div>
                                </div>

                                {siteConfig.contactPhone ? (
                                    <div className="flex items-start gap-3">
                                        <Phone className="mt-0.5 h-5 w-5 text-[#29685B]" />
                                        <div>
                                            <p className="font-medium text-[#0F172A]">Τηλέφωνο</p>
                                            <p>{siteConfig.contactPhone}</p>
                                        </div>
                                    </div>
                                ) : null}

                                {hasCompleteAddress() ? (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="mt-0.5 h-5 w-5 text-[#29685B]" />
                                        <div>
                                            <p className="font-medium text-[#0F172A]">Διεύθυνση</p>
                                            <p>
                                                {siteConfig.address.streetAddress},{" "}
                                                {siteConfig.address.postalCode}{" "}
                                                {siteConfig.address.addressLocality}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex items-start gap-3">
                                    <Clock3 className="mt-0.5 h-5 w-5 text-[#29685B]" />
                                    <div>
                                        <p className="font-medium text-[#0F172A]">Ώρες λειτουργίας</p>
                                        <p>Δευτέρα - Παρασκευή, 09:00 - 18:00</p>
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
