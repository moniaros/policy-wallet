"use client"

import Link from "next/link"
import { productCategories } from "@/lib/product/catalog"
import { ChevronDown } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { localizeHref } from "@/lib/seo/locale-links"

interface SolutionsDropdownProps {
    language: "el" | "en"
    className?: string
}

interface SolutionsMobileGroupProps {
    language: "el" | "en"
    onNavigate?: () => void
    className?: string
}

export function SolutionsDropdown({ language, className = "" }: SolutionsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuId = useId()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const firstItemRef = useRef<HTMLAnchorElement | null>(null)

    /**
     * Close and put focus back where it came from.
     *
     * Escape used to call `setIsOpen(false)` and nothing else. That unmounts
     * the panel — including the element that had focus — so the browser
     * reset focus to <body>: measured `document.activeElement === document.body`
     * with zero `:focus-visible` matches anywhere on a page with ~75 tab stops.
     * A keyboard user who opened the menu and changed their mind lost their
     * place entirely (WCAG 2.4.3).
     */
    const close = (returnFocus: boolean) => {
        setIsOpen(false)
        if (returnFocus) triggerRef.current?.focus()
    }

    const t = (el: string, en: string) => (language === "el" ? el : en)
    const label = t("Προϊόντα", "Products")
    const individualsLabel = t("Για ιδιώτες", "For individuals")
    const agentsLabel = t("Για ασφαλιστές", "For insurance agents")

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", onPointerDown)
        return () => document.removeEventListener("mousedown", onPointerDown)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => firstItemRef.current?.focus(), 0)
        }
    }, [isOpen])

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
            /* Tabbing past the last link used to leave the panel mounted and
               painted over the hero — the only auto-close was a mousedown
               listener, which a keyboard user never fires. `relatedTarget` is
               null when focus leaves the document entirely (browser chrome);
               closing on that would be surprising, so only an in-page move
               outside the container counts. */
            onBlur={(event) => {
                const next = event.relatedTarget as Node | null
                if (next && !containerRef.current?.contains(next)) setIsOpen(false)
            }}
        >
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => setIsOpen((prev) => !prev)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                        event.preventDefault()
                        setIsOpen(true)
                    }
                    if (event.key === "Escape") {
                        close(true)
                    }
                }}
                className="inline-flex min-h-11 items-center gap-1 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:focus-visible:outline-[#A7F3D0] dark:hover:text-white"
            >
                <span>{label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                /* Not role="menu". It declared the APG menu pattern and
                   implemented none of it: all 18 links reported tabIndex 0
                   (no roving tabindex), and ArrowDown/ArrowRight/Home/End each
                   left document.activeElement unchanged. Announcing a keyboard
                   model that does not exist is worse than announcing none, and
                   these are plain links that already work with Tab — so this
                   is an ordinary labelled disclosure. */
                <div
                    id={menuId}
                    aria-label={label}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            close(true)
                        }
                    }}
                    className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,640px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                >
                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                    <div>
                        <p className="mb-1 px-3 text-kicker font-semibold uppercase tracking-widest text-muted-foreground dark:text-slate-400">
                            {t("Για ποιον", "Who it is for")}
                        </p>
                    <Link
                        ref={firstItemRef}
                        href={localizeHref("/product", language)}
                        onClick={() => setIsOpen(false)}
                        className="flex min-h-11 items-center rounded-lg px-3 text-body font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:focus-visible:outline-[#A7F3D0] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        {individualsLabel}
                    </Link>
                    <Link
                        href={localizeHref("/solutions/agents", language)}
                        onClick={() => setIsOpen(false)}
                        className="flex min-h-11 items-center rounded-lg px-3 text-body font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:focus-visible:outline-[#A7F3D0] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        {agentsLabel}
                    </Link>
                    </div>

                    {/* Every branch we actually read, straight from the product
                        catalog. It was reachable only by landing on /product
                        first and scrolling — sixteen pages behind two clicks and
                        a scroll. Sourced from the catalog rather than retyped,
                        so a new branch appears here the day it is added. */}
                    <div>
                        <p className="mb-1 px-3 text-kicker font-semibold uppercase tracking-widest text-muted-foreground dark:text-slate-400">
                            {t("Κλάδοι", "Branches")}
                        </p>
                        <div className="grid grid-cols-2 gap-x-2">
                            {productCategories.map((category) => (
                                <Link
                                    key={category.id}
                                    href={localizeHref(category.href, language)}
                                    onClick={() => setIsOpen(false)}
                                    className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-body-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:outline-[#A7F3D0]"
                                >
                                    <category.icon aria-hidden className="h-4 w-4 flex-shrink-0 text-primary dark:text-[#A7F3D0]" />
                                    <span className="truncate">
                                        {language === "el" ? category.labelEl : category.labelEn}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export function SolutionsMobileGroup({ language, onNavigate, className = "" }: SolutionsMobileGroupProps) {
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const label = t("Προϊόντα", "Products")
    const individualsLabel = t("Για ιδιώτες", "For individuals")
    const agentsLabel = t("Για ασφαλιστές", "For insurance agents")

    return (
        <div className={`space-y-3 ${className}`}>
            <p className="text-body-sm font-semibold uppercase tracking-widest text-white/75">{label}</p>
            <Link href={localizeHref("/product", language)} className="flex min-h-11 items-center text-white transition-colors hover:text-white/80" onClick={onNavigate}>
                {individualsLabel}
            </Link>
            <Link href={localizeHref("/solutions/agents", language)} className="flex min-h-11 items-center text-white transition-colors hover:text-white/80" onClick={onNavigate}>
                {agentsLabel}
            </Link>
        </div>
    )
}
