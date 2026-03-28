"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"
import { ArrowRight, Mail, ShieldCheck } from "lucide-react"
import { productCategories } from "@/lib/product/catalog"

interface PublicMegaFooterProps {
    locale: "el" | "en"
}

type NewsletterStatus = "idle" | "loading" | "success" | "error"

function getDeviceType() {
    if (typeof window === "undefined") return "desktop"
    if (window.innerWidth < 768) return "mobile"
    if (window.innerWidth < 1024) return "tablet"
    return "desktop"
}

export function PublicMegaFooter({ locale }: PublicMegaFooterProps) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const [email, setEmail] = useState("")
    const [status, setStatus] = useState<NewsletterStatus>("idle")
    const [statusMessage, setStatusMessage] = useState("")

    const productLinks = useMemo(
        () =>
            productCategories.map((category) => ({
                href: category.href,
                label: t(category.labelEl, category.labelEn),
            })),
        [isGreek]
    )

    const solutionLinks = [
        { href: "/product", label: t("Για Ιδιώτες", "For Individuals") },
        { href: "/solutions/agents", label: t("Για Ασφαλιστές", "For Insurance Agents") },
        { href: "/pricing?audience=agent", label: t("Business Τιμολόγηση", "Business Pricing") },
        { href: "/pricing#pricing-faq", label: t("FAQ Τιμολόγησης", "Pricing FAQ") },
        { href: "/product#product-faq", label: t("FAQ Προϊόντος", "Product FAQ") },
    ]

    const companyLinks = [
        { href: "/company", label: t("Εταιρεία", "Company") },
        { href: "/contact", label: t("Επικοινωνία", "Contact") },
        { href: "/privacy", label: t("Πολιτική Απορρήτου", "Privacy Policy") },
        { href: "/terms", label: t("Όροι Χρήσης", "Terms of Service") },
    ]

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const normalizedEmail = email.trim().toLowerCase()
        if (!isValidEmail(normalizedEmail)) {
            setStatus("error")
            setStatusMessage(
                t("Παρακαλώ δώστε έγκυρο email.", "Please enter a valid email address.")
            )
            return
        }

        setStatus("loading")
        setStatusMessage("")

        try {
            const response = await fetch("/api/v1/landing/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: normalizedEmail,
                    profile_type: "individual",
                    waitlist_intent: "organize_policies",
                    source_context: "footer_newsletter",
                    referrer_source: "direct",
                    device_type: getDeviceType(),
                    time_on_page: Math.max(0, Math.floor(performance.now() / 1000)),
                    primary_cta_interacted: true,
                    locale,
                }),
            })

            if (!response.ok) {
                throw new Error("newsletter_submit_failed")
            }

            setStatus("success")
            setStatusMessage(
                t(
                    "Εγγραφήκατε επιτυχώς. Θα λάβετε νέα και πρακτικά tips.",
                    "You are subscribed. You will receive updates and practical tips."
                )
            )
            setEmail("")
        } catch {
            setStatus("error")
            setStatusMessage(
                t(
                    "Η εγγραφή δεν ολοκληρώθηκε. Δοκιμάστε ξανά ή επικοινωνήστε στο hello@policywallet.com.",
                    "Subscription failed. Try again or contact hello@policywallet.com."
                )
            )
        }
    }

    return (
        <footer className="border-t border-[#E2E8F0] bg-white">
            <div className="px-6 pb-14 pt-12 lg:px-12">
                <div className="mx-auto max-w-[1400px] rounded-[24px] border border-[#CFE3DA] bg-[#EAF6F1] px-6 py-7 md:px-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-[#29685B]">
                                {t("Επιλέξτε λύση", "Choose your path")}
                            </p>
                            <h3 className="text-[28px] font-medium leading-tight tracking-tight text-[#0F172A]">
                                {t(
                                    "Ξεκινήστε από τη λύση που ταιριάζει στο προφίλ σας.",
                                    "Start with the solution that fits your profile."
                                )}
                            </h3>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/product"
                                className="inline-flex items-center justify-center rounded-full border border-[#BBD6CA] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                            >
                                {t("Για Ιδιώτες", "For Individuals")}
                            </Link>
                            <Link
                                href="/solutions/agents"
                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#29685B] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1C4E44]"
                            >
                                {t("Για Ασφαλιστές", "For Insurance Agents")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-12 lg:px-12">
                <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1.25fr]">
                    <div>
                        <Link href="/" className="inline-flex items-center text-[22px] font-bold tracking-tight">
                            <span className="text-[#0F172A]">Policy</span>
                            <span className="text-[#64748B]">Wallet</span>
                        </Link>
                        <p className="mt-4 max-w-[320px] text-[14px] leading-relaxed text-[#475569]">
                            {t(
                                "Οργανώστε όλα τα ασφαλιστήριά σας, εντοπίστε κενά κάλυψης και δράστε έγκαιρα με AI insights.",
                                "Organize all your policies, detect coverage gaps, and act early with AI insights."
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#0F172A]">
                            {t("Προϊόντα", "Products")}
                        </p>
                        <ul className="space-y-2.5">
                            {productLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-[14px] text-[#475569] transition-colors hover:text-[#0F172A]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#0F172A]">
                            {t("Λύσεις & Πλοήγηση", "Solutions & Browse")}
                        </p>
                        <ul className="space-y-2.5">
                            {solutionLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-[14px] text-[#475569] transition-colors hover:text-[#0F172A]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-[12px] leading-relaxed text-[#64748B]">
                            {t(
                                "Συντομεύσεις για γρήγορη πρόσβαση σε FAQ και κρίσιμες σελίδες αξιολόγησης.",
                                "Shortcuts for quick access to FAQs and key decision pages."
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#0F172A]">
                            {t("Εταιρεία", "Company")}
                        </p>
                        <ul className="space-y-2.5">
                            {companyLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-[14px] text-[#475569] transition-colors hover:text-[#0F172A]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#0F172A]">
                            {t("Newsletter", "Newsletter")}
                        </p>
                        <p className="mb-4 text-[14px] leading-relaxed text-[#475569]">
                            {t(
                                "Λάβετε tips για renewals, συγκρίσεις καλύψεων και πρακτικούς οδηγούς.",
                                "Get renewal tips, coverage comparisons, and practical insurance guides."
                            )}
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <label htmlFor="footer-newsletter-email" className="sr-only">
                                {t("Email για newsletter", "Newsletter email")}
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    id="footer-newsletter-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder={t("Το email σας", "Your email")}
                                    className="w-full rounded-[12px] border border-[#CBD5E1] px-3.5 py-2.5 text-[14px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#29685B]"
                                    autoComplete="email"
                                />
                                <button
                                    type="submit"
                                    disabled={status === "loading"}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-[12px] bg-[#29685B] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1C4E44] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <Mail className="h-4 w-4" />
                                    {status === "loading" ? t("Αποστολή...", "Submitting...") : t("Εγγραφή", "Subscribe")}
                                </button>
                            </div>
                            {statusMessage ? (
                                <p
                                    className={`text-[13px] ${
                                        status === "success" ? "text-[#166534]" : "text-[#B91C1C]"
                                    }`}
                                    role={status === "error" ? "alert" : "status"}
                                >
                                    {statusMessage}
                                </p>
                            ) : null}
                        </form>
                    </div>
                </div>
            </div>

            <div className="border-t border-[#E2E8F0] px-6 py-5 lg:px-12">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-3 text-[13px] text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        (c) {new Date().getFullYear()} PolicyWallet.{" "}
                        {t("Με επιφύλαξη παντός δικαιώματος.", "All rights reserved.")}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/privacy" className="transition-colors hover:text-[#0F172A]">
                            {t("Privacy", "Privacy")}
                        </Link>
                        <Link href="/terms" className="transition-colors hover:text-[#0F172A]">
                            {t("Terms", "Terms")}
                        </Link>
                        <Link href="/contact" className="transition-colors hover:text-[#0F172A]">
                            {t("Επικοινωνία", "Contact")}
                        </Link>
                        <span className="inline-flex items-center gap-1.5 text-[#29685B]">
                            <ShieldCheck className="h-4 w-4" />
                            {t("GDPR & AES-256", "GDPR & AES-256")}
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
