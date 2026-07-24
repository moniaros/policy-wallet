"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"
import { localizeHref } from "@/lib/seo/locale-links"
import {
    PRIMARY_CTA,
    PUBLIC_NAV_ITEMS,
    SECONDARY_CTA,
    SKIP_LINK_TARGET_ID,
} from "@/lib/nav/public-nav"

interface PublicHeaderProps {
    locale: "el" | "en"
    /** Appended as `?source=<ctaSource>` to CTAs for attribution (optional). */
    ctaSource?: string
    /** Fired when the primary CTA is clicked (landing analytics, optional). */
    onPrimaryCtaClick?: () => void
}

/**
 * The single public-site header. Consumes lib/nav/public-nav.ts so every public
 * page renders the same items, order, labels, destinations and CTA treatment.
 * Provider-independent: locale comes in as a prop and the language toggle links
 * to the current page's counterpart route (computed from the pathname), so it
 * works on the homepage (no LanguageContext) and inside the app shell alike.
 */
export function PublicHeader({ locale, ctaSource, onPrimaryCtaClick }: PublicHeaderProps) {
    const isGreek = locale === "el"
    const elActive = isGreek
    const enActive = !isGreek
    const t = (el: string, en: string) => (isGreek ? el : en)
    const l = (href: string) => localizeHref(href, locale)

    const pathname = usePathname() || "/"
    // Normalise to the Greek path so active-state + the language toggle work
    // regardless of the locale tree we are currently in.
    const elPath = pathname === "/en" ? "/" : pathname.startsWith("/en/") ? pathname.slice(3) : pathname
    const enPath = elPath === "/" ? "/en" : `/en${elPath}`
    const isActive = (href: string) => elPath === href || elPath.startsWith(`${href}/`)

    const primaryHref = ctaSource ? `${PRIMARY_CTA.href}&source=${ctaSource}` : PRIMARY_CTA.href
    const secondaryHref = ctaSource ? `${SECONDARY_CTA.href}?source=${ctaSource}_login` : SECONDARY_CTA.href

    const [open, setOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const menuId = useId()
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const closeRef = useRef<HTMLButtonElement | null>(null)
    const dialogRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    // Open dialog: lock scroll, move focus in, ESC closes. Restore on cleanup.
    useEffect(() => {
        if (!open) return
        document.body.style.overflow = "hidden"
        closeRef.current?.focus()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false)
        }
        document.addEventListener("keydown", onKey)
        return () => {
            document.body.style.overflow = "unset"
            document.removeEventListener("keydown", onKey)
        }
    }, [open])

    const closeMenu = () => {
        setOpen(false)
        triggerRef.current?.focus()
    }

    // Keep Tab focus inside the open dialog (lightweight trap).
    const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab") return
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }

    return (
        <>
            {/* Skip link — first focusable element on every public page. */}
            <a
                href={`#${SKIP_LINK_TARGET_ID}`}
                className="sr-only rounded-lg bg-[#29685B] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200]"
            >
                {t("Μετάβαση στο περιεχόμενο", "Skip to content")}
            </a>

            {/* ── DESKTOP / TABLET NAV ─────────────────────────────── */}
            <header className="fixed left-4 right-4 top-4 z-50">
                <div
                    className={`mx-auto flex h-14 max-w-page-wide items-center justify-between rounded-full border px-6 backdrop-blur-xl transition-all duration-300 ${
                        scrolled
                            ? "border-gray-200/60 bg-white/90 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/90"
                            : "border-gray-200/50 bg-white/80 shadow-sm dark:border-slate-800/50 dark:bg-slate-900/80"
                    }`}
                >
                    <Link href={l("/")} className="inline-flex items-center text-title font-bold tracking-tight">
                        <span className="text-[#0F172A] dark:text-white">Policy</span>
                        <span className="text-[#5B6A7A]">Wallet</span>
                    </Link>

                    <nav aria-label={t("Κύρια πλοήγηση", "Main navigation")} className="hidden items-center gap-8 text-body font-medium text-[#475569] md:flex dark:text-slate-300">
                        {PUBLIC_NAV_ITEMS.map((item) =>
                            item.kind === "dropdown" ? (
                                <SolutionsDropdown key={item.key} language={locale} />
                            ) : (
                                <Link
                                    key={item.key}
                                    href={l(item.href)}
                                    aria-current={isActive(item.href) ? "page" : undefined}
                                    className={`transition-colors duration-150 hover:text-[#0F172A] dark:hover:text-white ${
                                        isActive(item.href) ? "text-[#0F172A] dark:text-white" : ""
                                    }`}
                                >
                                    {item.label[locale]}
                                </Link>
                            )
                        )}
                    </nav>

                    <div className="hidden items-center gap-5 md:flex">
                        <div className="flex items-center gap-1.5" role="group" aria-label={t("Γλώσσα", "Language")}>
                            <Link
                                href={elPath}
                                aria-current={isGreek ? "true" : undefined}
                                className={`text-xs font-semibold transition-colors ${elActive ? "text-[#0F172A] dark:text-white" : "text-[#5B6A7A] hover:text-[#0F172A] dark:hover:text-white"}`}
                            >
                                ΕΛ
                            </Link>
                            <span className="select-none text-[#E2E8F0] dark:text-slate-700">|</span>
                            <Link
                                href={enPath}
                                aria-current={!isGreek ? "true" : undefined}
                                className={`text-xs font-semibold transition-colors ${enActive ? "text-[#0F172A] dark:text-white" : "text-[#5B6A7A] hover:text-[#0F172A] dark:hover:text-white"}`}
                            >
                                EN
                            </Link>
                        </div>
                        <ThemeToggle />
                        <Link
                            href={secondaryHref}
                            className="text-body font-medium text-[#0F172A] transition-colors hover:text-[#29685B] dark:text-white"
                        >
                            {SECONDARY_CTA.label[locale]}
                        </Link>
                        <Link href={primaryHref} onClick={onPrimaryCtaClick} className="pw-primary-button pw-btn-sm">
                            {PRIMARY_CTA.label[locale]}
                        </Link>
                    </div>

                    <button
                        ref={triggerRef}
                        type="button"
                        className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-gray-100 md:hidden dark:text-white dark:hover:bg-slate-800"
                        onClick={() => setOpen(true)}
                        aria-label={t("Άνοιγμα μενού", "Open menu")}
                        aria-expanded={open}
                        aria-controls={menuId}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* ── MOBILE MENU (dialog) ─────────────────────────────── */}
            <div
                ref={dialogRef}
                id={menuId}
                role="dialog"
                aria-modal="true"
                aria-label={t("Μενού", "Menu")}
                onKeyDown={onDialogKeyDown}
                className={`fixed inset-0 z-[100] flex flex-col bg-[#29685B] text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "translate-y-0" : "pointer-events-none -translate-y-full"
                }`}
            >
                <div className="mx-auto flex h-16 w-full max-w-page-wide items-center justify-between px-6 pt-4">
                    <Link href={l("/")} className="inline-flex items-center text-title font-bold tracking-tight" onClick={closeMenu}>
                        <span className="text-white">Policy</span>
                        <span className="text-white/80">Wallet</span>
                    </Link>
                    <button
                        ref={closeRef}
                        type="button"
                        className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                        onClick={closeMenu}
                        aria-label={t("Κλείσιμο μενού", "Close menu")}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mx-auto flex w-full max-w-page-wide flex-1 flex-col justify-center px-8 pb-24 sm:px-12">
                    <nav aria-label={t("Πλοήγηση", "Navigation")} className="mb-12 flex flex-col gap-6 text-h1 font-medium leading-tight tracking-tight sm:text-display">
                        {PUBLIC_NAV_ITEMS.map((item) =>
                            item.kind === "dropdown" ? (
                                <SolutionsMobileGroup key={item.key} language={locale} onNavigate={closeMenu} className="text-title" />
                            ) : (
                                <Link
                                    key={item.key}
                                    href={l(item.href)}
                                    aria-current={isActive(item.href) ? "page" : undefined}
                                    className="text-white transition-colors hover:text-white/80"
                                    onClick={closeMenu}
                                >
                                    {item.label[locale]}
                                </Link>
                            )
                        )}
                    </nav>

                    <div className="mt-auto flex flex-col gap-4">
                        <Link href={secondaryHref} className="pw-secondary-button-inverse pw-btn-lg w-full" onClick={closeMenu}>
                            {SECONDARY_CTA.label[locale]}
                        </Link>
                        <Link
                            href={primaryHref}
                            className="pw-primary-button-inverse pw-btn-lg w-full"
                            onClick={() => {
                                onPrimaryCtaClick?.()
                                closeMenu()
                            }}
                        >
                            {PRIMARY_CTA.label[locale]}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    )
}
