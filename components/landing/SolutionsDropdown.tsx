"use client"

import Link from "next/link"
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
    const firstItemRef = useRef<HTMLAnchorElement | null>(null)

    const t = (el: string, en: string) => (language === "el" ? el : en)
    const label = t("Λύσεις", "Solutions")
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
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => setIsOpen((prev) => !prev)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                        event.preventDefault()
                        setIsOpen(true)
                    }
                    if (event.key === "Escape") {
                        setIsOpen(false)
                    }
                }}
                className="inline-flex min-h-11 items-center gap-1 transition-colors hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:text-white"
            >
                <span>{label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label={label}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setIsOpen(false)
                        }
                    }}
                    className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                >
                    <Link
                        ref={firstItemRef}
                        role="menuitem"
                        href={localizeHref("/product", language)}
                        onClick={() => setIsOpen(false)}
                        className="flex min-h-11 items-center rounded-lg px-3 text-body font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        {individualsLabel}
                    </Link>
                    <Link
                        role="menuitem"
                        href={localizeHref("/solutions/agents", language)}
                        onClick={() => setIsOpen(false)}
                        className="flex min-h-11 items-center rounded-lg px-3 text-body font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        {agentsLabel}
                    </Link>
                </div>
            )}
        </div>
    )
}

export function SolutionsMobileGroup({ language, onNavigate, className = "" }: SolutionsMobileGroupProps) {
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const label = t("Λύσεις", "Solutions")
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
