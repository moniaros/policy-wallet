"use client"

import { useState, type FormEvent } from "react"
import { Send } from "lucide-react"

/**
 * The contact form, on the homepage.
 *
 * It posts to `/api/contact` — the same endpoint /contact has always used, not
 * a second one. That route already rate-limits, validates with zod, carries a
 * honeypot, persists to `form_submissions` BEFORE any network call, emails the
 * owner, emails a confirmation back, and now also stores the person as a Brevo
 * contact. Building a parallel endpoint for the homepage would have meant a
 * second set of all of that, drifting.
 *
 * `subject` is a fixed enum server-side, so the select renders exactly those
 * values: a free-text subject would be rejected with an error the visitor
 * could not act on.
 */

const SUBJECTS = ["Γενική Ερώτηση", "Συνεργασία", "Τεχνική Υποστήριξη", "Τιμολόγηση"] as const

const SUBJECT_LABELS: Record<(typeof SUBJECTS)[number], { el: string; en: string }> = {
    "Γενική Ερώτηση": { el: "Γενική ερώτηση", en: "General question" },
    Συνεργασία: { el: "Συνεργασία", en: "Partnership" },
    "Τεχνική Υποστήριξη": { el: "Τεχνική υποστήριξη", en: "Technical support" },
    Τιμολόγηση: { el: "Τιμολόγηση", en: "Pricing" },
}

export function HomeContact({ locale }: { locale: "el" | "en" }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("Γενική Ερώτηση")
    const [message, setMessage] = useState("")
    const [honeypot, setHoneypot] = useState("")
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const MIN_MESSAGE = 20

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)
        setSending(true)
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, subject, message, website_url: honeypot }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.success) {
                setError(
                    data?.message ??
                        t("Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.", "Something went wrong. Try again shortly."),
                )
                return
            }
            setSent(true)
        } catch {
            setError(t("Δεν φύγατε online. Ελέγξτε τη σύνδεσή σας.", "You went offline. Check your connection."))
        } finally {
            setSending(false)
        }
    }

    const field =
        "w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-body text-[#0F172A] transition-colors placeholder:text-[#94A3B8] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#29685B] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:outline-[#A7F3D0]"
    const label = "mb-1.5 block text-body-sm font-semibold text-[#0F172A] dark:text-white"

    return (
        <section
            id="contact"
            aria-labelledby="contact-heading"
            className="scroll-mt-28 border-t border-[#E2E8F0] px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800"
        >
            <div className="mx-auto max-w-[680px]">
                <h2
                    id="contact-heading"
                    className="mb-4 text-center text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[#0F172A] lg:text-h1 dark:text-white"
                >
                    {t("Πείτε μας πώς μπορούμε να βοηθήσουμε", "Tell us how we can help")}
                </h2>
                <p className="mx-auto mb-12 max-w-[560px] text-center text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                    {t(
                        "Θέλετε να μάθετε περισσότερα για την πλατφόρμα, έχετε κάποια πρόταση ή χρειάζεστε βοήθεια; Στείλτε μας μήνυμα και θα επικοινωνήσουμε σύντομα μαζί σας.",
                        "Want to know more about the platform, have a suggestion, or need help? Send us a message and we will get back to you shortly.",
                    )}
                </p>

                {sent ? (
                    <p
                        role="status"
                        className="rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] px-5 py-6 text-center text-body-lg text-[#166534] dark:border-[#29685B]/40 dark:bg-[#29685B]/15 dark:text-[#A7F3D0]"
                    >
                        {t(
                            "Το μήνυμά σας στάλθηκε. Θα σας απαντήσουμε σύντομα.",
                            "Your message is on its way. We will get back to you shortly.",
                        )}
                    </p>
                ) : (
                    <form onSubmit={onSubmit} className="space-y-5">
                        {/* Honeypot. Never named "company" — that is an autofill
                            token, and browsers filled it for real people. */}
                        <input
                            type="text"
                            name="website_url"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                            className="absolute left-[-9999px] h-px w-px opacity-0"
                        />

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="hc-name" className={label}>
                                    {t("Ονοματεπώνυμο", "Full name")}
                                </label>
                                <input
                                    id="hc-name"
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={field}
                                    autoComplete="name"
                                />
                            </div>
                            <div>
                                <label htmlFor="hc-email" className={label}>
                                    {t("Email", "Email")}
                                </label>
                                <input
                                    id="hc-email"
                                    type="email"
                                    required
                                    maxLength={180}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={field}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="hc-subject" className={label}>
                                {t("Θέμα", "Subject")}
                            </label>
                            <select
                                id="hc-subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
                                className={field}
                            >
                                {SUBJECTS.map((value) => (
                                    <option key={value} value={value}>
                                        {SUBJECT_LABELS[value][locale]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="hc-message" className={label}>
                                {t("Μήνυμα", "Message")}
                            </label>
                            <textarea
                                id="hc-message"
                                required
                                rows={5}
                                minLength={MIN_MESSAGE}
                                maxLength={4000}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                aria-describedby="hc-message-hint"
                                className={`${field} resize-y`}
                            />
                            {/* The server rejects anything shorter, so the
                                requirement is stated before it is enforced. */}
                            <p id="hc-message-hint" className="mt-1.5 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                                {t(
                                    `Τουλάχιστον ${MIN_MESSAGE} χαρακτήρες.`,
                                    `At least ${MIN_MESSAGE} characters.`,
                                )}
                            </p>
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-body-sm text-[#B91C1C] dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300"
                            >
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={sending} className="pw-primary-button pw-btn-lg w-full sm:w-auto">
                            <Send aria-hidden className="h-4 w-4" />
                            {sending ? t("Το στέλνουμε…", "Sending it…") : t("Αποστολή μηνύματος", "Send message")}
                        </button>
                    </form>
                )}
            </div>
        </section>
    )
}
