"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"
import { ArrowRight, Facebook, Instagram, Linkedin, Mail, ShieldCheck, Twitter, type LucideIcon } from "lucide-react"
import { LEGAL_ENTITY } from "@/lib/legal/entity-placeholders"
import { CATEGORY, CATEGORY_NAME } from "@/lib/marketing/positioning"
import { productCategories } from "@/lib/product/catalog"
import { localizeHref } from "@/lib/seo/locale-links"
import { getSocialProfiles, siteConfig } from "@/lib/seo/site"

interface PublicMegaFooterProps {
    locale: "el" | "en"
}

type NewsletterStatus = "idle" | "loading" | "success" | "error"

/** Brand icons for the env-gated social links (labels from getSocialProfiles). */
const SOCIAL_ICONS: Record<string, LucideIcon> = {
    LinkedIn: Linkedin,
    Facebook: Facebook,
    Instagram: Instagram,
    X: Twitter,
}

export function PublicMegaFooter({ locale }: PublicMegaFooterProps) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    // EN context navigates within the /en tree (unmirrored targets stay Greek).
    const l = (href: string) => localizeHref(href, locale)

    const [email, setEmail] = useState("")
    const [status, setStatus] = useState<NewsletterStatus>("idle")
    const [statusMessage, setStatusMessage] = useState("")
    // Honeypot — hidden from humans, irresistible to bots. Filled = silently dropped server-side.
    const [honeypot, setHoneypot] = useState("")

    const productLinks = useMemo(
        () =>
            productCategories.map((category) => ({
                href: l(category.href),
                label: t(category.labelEl, category.labelEn),
            })),
        [isGreek]
    )

    const solutionLinks = [
        { href: l("/product"), label: t("Για ιδιώτες", "For individuals") },
        { href: l("/solutions/agents"), label: t("Για ασφαλιστές", "For insurance agents") },
        { href: l("/compare"), label: t("Σύγκριση με τις άλλες επιλογές", "How we compare") },
        { href: l("/pricing?audience=agent"), label: t("Πλάνα ασφαλιστών", "Agent plans") },
        { href: l("/pricing#pricing-faq"), label: t("Ερωτήσεις για τις τιμές", "Questions about pricing") },
    ]

    const companyLinks = [
        { href: l("/company"), label: t("Εταιρεία", "Company") },
        { href: l("/guides"), label: t("Οδηγοί ασφάλισης", "Insurance guides") },
        { href: l("/lexiko"), label: t("Ασφαλιστικό λεξικό", "Insurance glossary") },
        { href: l("/contact"), label: t("Επικοινωνία", "Contact") },
        { href: l("/privacy"), label: t("Πολιτική απορρήτου", "Privacy policy") },
        { href: l("/terms"), label: t("Όροι χρήσης", "Terms of service") },
        { href: l("/cookies"), label: t("Πολιτική cookies", "Cookie policy") },
        { href: l("/subprocessors"), label: t("Υπο-εκτελούντες επεξεργασίας", "Subprocessors") },
    ]

    // Legal-identity block (Greek corporate sites must display ΓΕΜΗ — ν. 3419/2005).
    // Shares one source of truth with the terms/privacy documents so the footer
    // and the legal pages can never drift apart on the corporate details.
    const entity = LEGAL_ENTITY[locale]

    // Real profiles only (from NEXT_PUBLIC_SOCIAL_*) — no placeholder links.
    const socialProfiles = getSocialProfiles()

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const normalizedEmail = email.trim().toLowerCase()
        if (!isValidEmail(normalizedEmail)) {
            setStatus("error")
            setStatusMessage(
                t("Αυτό το email δεν φαίνεται σωστό. Ελέγξτε το.", "That email does not look right. Have another look.")
            )
            return
        }

        setStatus("loading")
        setStatusMessage("")

        try {
            const response = await fetch("/api/v1/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: normalizedEmail,
                    locale,
                    source: "footer_newsletter",
                    company: honeypot,
                }),
            })

            // Checking response.ok alone is not enough: a proxy redirect to the
            // sign-in page also answers 200, which is how this form used to report
            // "subscribed" while nothing was stored. Require the success envelope.
            const payload = (await response.json().catch(() => null)) as
                | { data?: { subscribed?: boolean } | null }
                | null

            if (!response.ok || !payload?.data?.subscribed) {
                throw new Error("newsletter_submit_failed")
            }

            setStatus("success")
            setStatusMessage(
                t(
                    "Έγινε. Θα σας στέλνουμε πρακτικές συμβουλές, όχι διαφημίσεις.",
                    "Done. We will send you practical advice, not adverts."
                )
            )
            setEmail("")
        } catch {
            setStatus("error")
            setStatusMessage(
                t(
                    `Δεν καταφέραμε να σας γράψουμε στη λίστα. Δοκιμάστε ξανά ή γράψτε μας στο ${siteConfig.contactEmail}.`,
                    `We could not add you to the list. Try again, or write to us at ${siteConfig.contactEmail}.`
                )
            )
        }
    }

    return (
        <footer className="border-t border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-6 pb-14 pt-12 lg:px-12">
                <div className="mx-auto max-w-page-wide rounded-3xl border border-[#DCEBDA] dark:border-[#29685B]/40 bg-[#F0FDF4] dark:bg-[#29685B]/15 px-6 py-7 md:px-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="mb-1 text-caption font-semibold uppercase tracking-widest text-[#29685B] dark:text-[#A7F3D0]">
                                {t("Ξεκινήστε", "Get started")}
                            </p>
                            <h3 className="text-h3 font-medium leading-tight tracking-tight text-[#0F172A] dark:text-white">
                                {t(
                                    "Ασφαλίζεστε ή ασφαλίζετε άλλους;",
                                    "Are you insured, or do you insure others?"
                                )}
                            </h3>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link href={l("/product")} className="pw-secondary-button pw-btn-sm">
                                {t("Είμαι ασφαλισμένος", "I am insured")}
                            </Link>
                            <Link href={l("/solutions/agents")} className="pw-primary-button pw-btn-sm">
                                {t("Είμαι ασφαλιστής", "I am an insurance agent")}
                                <ArrowRight aria-hidden className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-12 lg:px-12">
                <div className="mx-auto grid max-w-page-wide gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1.25fr]">
                    <div>
                        <Link href={l("/")} className="inline-flex min-h-11 items-center text-title font-bold tracking-tight">
                            <span className="text-[#0F172A] dark:text-white">Policy</span>
                            <span className="text-[#5B6A7A] dark:text-slate-400">Wallet</span>
                        </Link>
                        <p className="mt-4 max-w-[320px] text-body leading-relaxed text-[#475569] dark:text-slate-300">
                            {t(
                                "Η ζωή σας αλλάζει και τα ρίσκα σας μαζί της. Σας λέμε αν η ασφάλειά σας κράτησε τον ρυθμό. Δεν πουλάμε ασφάλειες.",
                                "Your life changes and your risks change with it. We tell you whether your insurance kept up. We do not sell insurance."
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="mb-4 text-body-sm font-semibold uppercase tracking-wider text-[#0F172A] dark:text-white">
                            {t("Προϊόντα", "Products")}
                        </p>
                        <ul className="space-y-2.5">
                            {productLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="inline-flex min-h-11 items-center text-body text-[#475569] dark:text-slate-300 transition-colors hover:text-[#0F172A] dark:hover:text-white"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="mb-4 text-body-sm font-semibold uppercase tracking-wider text-[#0F172A] dark:text-white">
                            {t("Λύσεις", "Solutions")}
                        </p>
                        <ul className="space-y-2.5">
                            {solutionLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="inline-flex min-h-11 items-center text-body text-[#475569] dark:text-slate-300 transition-colors hover:text-[#0F172A] dark:hover:text-white"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-caption leading-relaxed text-[#5B6A7A] dark:text-slate-400">
                            {t(
                                "Οι σελίδες που βοηθούν να αποφασίσετε.",
                                "The pages that help you decide."
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="mb-4 text-body-sm font-semibold uppercase tracking-wider text-[#0F172A] dark:text-white">
                            {t("Εταιρεία", "Company")}
                        </p>
                        <ul className="space-y-2.5">
                            {companyLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="inline-flex min-h-11 items-center text-body text-[#475569] dark:text-slate-300 transition-colors hover:text-[#0F172A] dark:hover:text-white"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="mb-3 text-body-sm font-semibold uppercase tracking-wider text-[#0F172A] dark:text-white">
                            {t("Ενημερώσεις", "Newsletter")}
                        </p>
                        <p className="mb-4 text-body leading-relaxed text-[#475569] dark:text-slate-300">
                            {t(
                                "Τι αλλάζει στην ασφάλιση και τι σημαίνει για εσάς. Λίγα email, χωρίς πωλήσεις.",
                                "What changes in insurance, and what it means for you. Few emails, no selling."
                            )}
                        </p>
                        <form noValidate onSubmit={handleSubmit} className="space-y-3">
                            <label htmlFor="footer-newsletter-email" className="sr-only">
                                {t("Email για ενημερώσεις", "Newsletter email")}
                            </label>
                            <input
                                type="text"
                                name="company"
                                value={honeypot}
                                onChange={(event) => setHoneypot(event.target.value)}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                className="absolute left-[-9999px] h-0 w-0 opacity-0"
                            />
                            {/* Stacked until xl: in the five-column footer the side-by-side
                                    layout clipped the placeholder to "Το email σα". */}
                            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                                <input
                                    id="footer-newsletter-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    aria-invalid={status === "error" ? true : undefined}
                                    aria-describedby={status === "error" ? "footer-newsletter-status" : undefined}
                                    placeholder={t("Το email σας", "Your email")}
                                    className="pw-input pw-input-sm text-[#0F172A] dark:text-white"
                                    autoComplete="email"
                                />
                                <button
                                    type="submit"
                                    disabled={status === "loading"}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#29685B] px-4 py-2.5 text-body font-semibold text-white transition-colors hover:bg-[#1C4E44] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <Mail className="h-4 w-4" />
                                    {status === "loading" ? t("Το στέλνουμε…", "Sending it…") : t("Εγγραφή", "Subscribe")}
                                </button>
                            </div>
                            {statusMessage ? (
                                <p
                                    id="footer-newsletter-status"
                                    className={`text-body-sm ${
                                        status === "success" ? "text-[#166534] dark:text-[#A7F3D0]" : "text-[#B91C1C]"
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

            <div className="border-t border-[#E2E8F0] dark:border-slate-800 px-6 py-5 lg:px-12">
                <div className="mx-auto max-w-page-wide pb-4 text-body-sm leading-relaxed text-[#5B6A7A] dark:text-slate-400">
                    {/* Category identity line — the one place EVERY page names
                        the category and decodes it in the same breath. */}
                    <p className="mb-2 font-semibold text-[#0F172A] dark:text-white">
                        PolicyWallet — {t("η", "the")} {t(CATEGORY_NAME.el, CATEGORY_NAME.en)}.{" "}
                        <span className="font-normal text-[#5B6A7A] dark:text-slate-400">
                            {t(CATEGORY.el, CATEGORY.en)}
                        </span>
                    </p>
                    <p>
                        {t(
                            "Η πλατφόρμα PolicyWallet λειτουργεί από ελληνική εταιρεία.",
                            "The PolicyWallet platform is operated by a Greek company."
                        )}{" "}
                        {entity.detailsComingSoon}
                    </p>
                </div>
                <div className="mx-auto flex max-w-page-wide flex-col gap-3 text-body-sm text-[#5B6A7A] dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © {new Date().getFullYear()} PolicyWallet.{" "}
                        {t("Με επιφύλαξη παντός δικαιώματος.", "All rights reserved.")}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                        {socialProfiles.map((profile) => {
                            const Icon = SOCIAL_ICONS[profile.label]
                            return (
                                <a
                                    key={profile.url}
                                    href={profile.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    aria-label={profile.label}
                                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#0F172A] dark:hover:text-white"
                                >
                                    {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
                                    {profile.label}
                                </a>
                            )
                        })}
                        <Link href={l("/privacy")} className="inline-flex min-h-11 items-center transition-colors hover:text-[#0F172A] dark:hover:text-white">
                            {t("Απόρρητο", "Privacy")}
                        </Link>
                        <Link href={l("/terms")} className="inline-flex min-h-11 items-center transition-colors hover:text-[#0F172A] dark:hover:text-white">
                            {t("Όροι", "Terms")}
                        </Link>
                        <Link href={l("/contact")} className="inline-flex min-h-11 items-center transition-colors hover:text-[#0F172A] dark:hover:text-white">
                            {t("Επικοινωνία", "Contact")}
                        </Link>
                        <span className="inline-flex items-center gap-1.5 text-[#29685B] dark:text-[#A7F3D0]">
                            <ShieldCheck className="h-4 w-4" />
                            {t("GDPR & AES-256", "GDPR & AES-256")}
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
