"use client"

import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

export interface CommandSearchItem {
    id: string
    /** What the row shows — the insurer, as the customer knows the policy. */
    title: string
    /** Branch · number, so two policies at one insurer stay distinguishable. */
    subtitle?: string
    href: string
    /** Extra searchable text (raw insurer name, raw number) never rendered. */
    keywords?: string
}

export interface CommandSearchLabels {
    placeholder: string
    ariaLabel: string
    noResults: string
    resultsLabel: string
}

/**
 * Accent-insensitive, case-insensitive matching. «Εθνικη» must find «Εθνική
 * Ασφαλιστική»: Greek is typed without accents on most phone keyboards and
 * every insurer name carries at least one.
 */
function fold(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/ς/g, "σ")
        .toLowerCase()
}

const MAX_RESULTS = 8

/**
 * The top bar's one control: search across the policies already loaded for
 * this account. Client-side only — the list arrives from the protected
 * layout, the same rows the wallet renders — so there is no new endpoint and
 * nothing to rate-limit. ⌘K / Ctrl+K focuses it from anywhere in the app.
 *
 * A combobox in the WAI-ARIA sense: the input owns a listbox, arrow keys move
 * the active option, Enter opens it, Escape clears. Options are real links so
 * a mouse (and middle-click) works without the keyboard path.
 */
export function CommandSearch({ items, labels, className = "" }: { items: CommandSearchItem[]; labels: CommandSearchLabels; className?: string }) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const listId = useId()
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    // The shortcut hint is platform-specific; render it only after mount so
    // the server and the client agree on the first paint.
    const [shortcut, setShortcut] = useState<string | null>(null)

    useEffect(() => {
        const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
        setShortcut(isMac ? "⌘K" : "Ctrl K")
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                inputRef.current?.focus()
                inputRef.current?.select()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    const results = useMemo(() => {
        const needle = fold(query.trim())
        if (!needle) return []
        return items
            .filter((item) => fold(`${item.title} ${item.subtitle ?? ""} ${item.keywords ?? ""}`).includes(needle))
            .slice(0, MAX_RESULTS)
    }, [items, query])

    const expanded = open && query.trim().length > 0
    const activeId = expanded && results[active] ? `${listId}-opt-${active}` : undefined

    const go = (item: CommandSearchItem | undefined) => {
        if (!item) return
        setOpen(false)
        setQuery("")
        router.push(item.href)
    }

    return (
        <div className={`relative ${className}`}>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-label={labels.ariaLabel}
                aria-expanded={expanded}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                autoComplete="off"
                spellCheck={false}
                placeholder={labels.placeholder}
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value)
                    setActive(0)
                    setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                        event.preventDefault()
                        setOpen(true)
                        setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
                    } else if (event.key === "ArrowUp") {
                        event.preventDefault()
                        setActive((index) => Math.max(index - 1, 0))
                    } else if (event.key === "Enter" && expanded) {
                        event.preventDefault()
                        go(results[active] ?? results[0])
                    } else if (event.key === "Escape") {
                        if (query) {
                            event.preventDefault()
                            setQuery("")
                        }
                        setOpen(false)
                    }
                }}
                // 16px on touch so iOS never zooms the field; 14px from sm up.
                className="h-11 w-full rounded-xl border border-transparent bg-muted pl-10 pr-16 text-base text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
            />
            {shortcut && !query && (
                <kbd
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-micro font-semibold text-muted-foreground"
                >
                    {shortcut}
                </kbd>
            )}

            {/* The listbox stays mounted (empty) so aria-controls always resolves. */}
            <ul
                id={listId}
                role="listbox"
                aria-label={labels.resultsLabel}
                hidden={!expanded}
                className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl"
            >
                {expanded && results.length === 0 && (
                    <li role="option" aria-selected={false} aria-disabled="true" className="px-3 py-2.5 text-sm text-muted-foreground">
                        {labels.noResults}
                    </li>
                )}
                {results.map((item, index) => (
                    <li
                        key={item.id}
                        id={`${listId}-opt-${index}`}
                        role="option"
                        aria-selected={index === active}
                        onMouseEnter={() => setActive(index)}
                    >
                        <Link
                            href={item.href}
                            tabIndex={-1}
                            // mousedown would blur the input and close the list
                            // before the click lands; keep focus where it is.
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                setOpen(false)
                                setQuery("")
                            }}
                            className={`flex min-h-11 flex-col justify-center rounded-lg px-3 py-2 ${index === active ? "bg-muted" : ""}`}
                        >
                            <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                            {item.subtitle && <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
