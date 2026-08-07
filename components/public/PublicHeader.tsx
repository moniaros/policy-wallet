"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { SolutionsDropdown, SolutionsMobileGroup } from "@/components/landing/SolutionsDropdown"
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import { normalizeHeaderPath } from "@/lib/nav/header-path"
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

    // During static prerender of the ROOT route, usePathname() reports the
    // emitted filename rather than the URL, so the language toggle derived
    // dead index-suffixed hrefs (a sign-in redirect, and a 404).
    // Only surfaced once the homepage stopped rendering inside a Suspense
    // boundary, which moved this header into the server prerender.
    const pathname = normalizeHeaderPath(usePathname())
    // Normalise to the Greek path so active-state + the language toggle work
    // regardless of the locale tree we are currently in.
    const elPath = pathname === "/en" ? "/" : pathname.startsWith("/en/") ? pathname.slice(3) : pathname
    const enPath = elPath === "/" ? "/en" : `/en${elPath}`
    const isActive = (href: string) => elPath === href || elPath.startsWith(`${href}/`)

    // authHref, not localizeHref: there is no /en/auth mirror, so the locale
    // rides as ?lang= and the auth tree pins itself to it. Without this the
    // English header dropped a visitor into a Greek signup form.
    const primaryHref = authHref(
        ctaSource ? `${PRIMARY_CTA.href}&source=${ctaSource}` : PRIMARY_CTA.href,
        locale
    )
    const secondaryHref = authHref(
        ctaSource ? `${SECONDARY_CTA.href}?source=${ctaSource}_login` : SECONDARY_CTA.href,
        locale
    )

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

    // One way to close, so the two paths cannot drift apart again. Escape used
    // to call setOpen(false) on its own and skip the focus restore the Close
    // button did, dropping focus onto document.body — the ring vanished and a
    // screen reader lost its place, which is exactly what the dialog pattern
    // requires closing to avoid.
    const closeMenu = useCallback(() => {
        setOpen(false)
        triggerRef.current?.focus()
    }, [])

    // Open dialog: lock scroll, move focus in, ESC closes. Restore on cleanup.
    useEffect(() => {
        if (!open) return
        document.body.style.overflow = "hidden"
        closeRef.current?.focus()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenu()
        }
        document.addEventListener("keydown", onKey)
        return () => {
            document.body.style.overflow = "unset"
            document.removeEventListener("keydown", onKey)
        }
    }, [open, closeMenu])

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
                className="sr-only rounded-lg bg-[#29685B] px-4 text-body font-semibold text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:inline-flex focus:min-h-11 focus:items-center"
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
                    <Link href={l("/")} className="inline-flex min-h-11 items-center text-title font-bold tracking-tight">
                        <span className="text-[#0F172A] dark:text-white">Policy</span>
                        <span className="text-[#5B6A7A] dark:text-slate-400">Wallet</span>
                    </Link>

                    <nav aria-label={t("Κύρια πλοήγηση", "Main navigation")} className="hidden items-center gap-8 text-body font-medium text-[#475569] lg:flex dark:text-slate-300">
                        {PUBLIC_NAV_ITEMS.map((item) =>
                            item.kind === "dropdown" ? (
                                <SolutionsDropdown key={item.key} language={locale} />
                            ) : (
                                <Link
                                    key={item.key}
                                    href={l(item.href)}
                                    aria-current={isActive(item.href) ? "page" : undefined}
                                    className={`inline-flex min-h-11 items-center transition-colors duration-150 hover:text-[#0F172A] dark:hover:text-white ${
                                        isActive(item.href) ? "text-[#0F172A] dark:text-white" : ""
                                    }`}
                                >
                                    {item.label[locale]}
                                </Link>
                            )
                        )}
                    </nav>

                    <div className="hidden items-center gap-5 lg:flex">
                        <div className="flex items-center gap-1.5" role="group" aria-label={t("Γλώσσα", "Language")}>
                            <Link
                                href={elPath}
                                aria-current={isGreek ? "true" : undefined}
                                className={`inline-flex min-h-11 items-center px-1 text-body-sm font-semibold transition-colors ${elActive ? "text-[#0F172A] dark:text-white" : "text-[#5B6A7A] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"}`}
                            >
                                ΕΛ
                            </Link>
                            <span className="select-none text-[#E2E8F0] dark:text-slate-700">|</span>
                            <Link
                                href={enPath}
                                aria-current={!isGreek ? "true" : undefined}
                                className={`inline-flex min-h-11 items-center px-1 text-body-sm font-semibold transition-colors ${enActive ? "text-[#0F172A] dark:text-white" : "text-[#5B6A7A] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"}`}
                            >
                                EN
                            </Link>
                        </div>
                        {/* The toggle itself renders a 36px control; the
                            wrapper alone does not resize the control, so the
                            size is applied to the child button from here:
                            presentation only, and the shared component (used by
                            the authenticated app too) is left alone. */}
                        <span className="inline-flex items-center [&>button]:inline-flex [&>button]:min-h-11 [&>button]:min-w-11 [&>button]:items-center [&>button]:justify-center">
                            <ThemeToggle />
                        </span>
                        <Link
                            href={secondaryHref}
                            className="inline-flex min-h-11 items-center text-body font-medium text-[#0F172A] transition-colors hover:text-[#29685B] dark:text-white"
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
                        className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-gray-100 lg:hidden dark:text-white dark:hover:bg-slate-800"
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
                // `aria-hidden`/`inert` while closed: `pointer-events-none`
                // stops the mouse but leaves every link focusable and readable
                // by assistive tech.
                aria-hidden={!open}
                inert={!open}
                // `lg:hidden` — the trigger below is lg:hidden, so the drawer
                // must be too; it has no way to open on desktop.
                // `overflow-y-auto` — the content is centre-justified and
                // taller than this viewport-height box, so it used to spill out
                // BOTH ends. Closing only translates the box by its own height,
                // which dragged the spill-over (the full-width CTA) back into
                // view under the header. Containing the overflow is what makes
                // the closed state genuinely hidden.
                className={`fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#29685B] text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
                    open ? "translate-y-0" : "pointer-events-none -translate-y-full"
                }`}
            >
                <div className="mx-auto flex h-16 w-full max-w-page-wide items-center justify-between px-6 pt-4">
                    <Link href={l("/")} className="inline-flex min-h-11 items-center text-title font-bold tracking-tight" onClick={closeMenu}>
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

                    {/* The language switcher lived only in the desktop bar, so
                        on a phone — the viewport most people arrive on — an
                        English speaker landing on the Greek site had no way to
                        reach the English tree at all. */}
                    <div
                        role="group"
                        aria-label={t("Γλώσσα", "Language")}
                        className="mb-8 flex items-center gap-2 border-t border-white/20 pt-6"
                    >
                        <Link
                            href={elPath}
                            aria-current={isGreek ? "true" : undefined}
                            onClick={closeMenu}
                            className={`inline-flex min-h-11 items-center rounded-full px-4 text-body font-semibold transition-colors ${
                                elActive ? "bg-white text-[#29685B]" : "text-white/80 hover:text-white"
                            }`}
                        >
                            Ελληνικά
                        </Link>
                        <Link
                            href={enPath}
                            aria-current={!isGreek ? "true" : undefined}
                            onClick={closeMenu}
                            className={`inline-flex min-h-11 items-center rounded-full px-4 text-body font-semibold transition-colors ${
                                enActive ? "bg-white text-[#29685B]" : "text-white/80 hover:text-white"
                            }`}
                        >
                            English
                        </Link>
                    </div>

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
