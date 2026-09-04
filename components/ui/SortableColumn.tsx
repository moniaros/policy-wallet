"use client"

import { useCallback, useId, useState } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

/**
 * Sortable table columns for the agent's operational screens.
 *
 * None of the agent tables — renewals, opportunities, commissions, team,
 * questionnaires — let you sort by a column. Each arrives in one fixed server
 * order and that is the only order you can ever see it in. On a renewals desk
 * that means an agent who wants to work the largest premiums first, or find a
 * particular client in a long list, has no way to get there: the data is on
 * screen but not reachable in the order the job needs.
 *
 * The header is a real <button> inside the <th> with `aria-sort` on the cell, so
 * the sort state is announced rather than only drawn as an arrow. The arrow is
 * `aria-hidden` — it duplicates what aria-sort already says.
 */

export type SortDirection = "asc" | "desc"
export type SortState<K extends string> = { key: K; direction: SortDirection } | null

export function useTableSort<K extends string>(initial: SortState<K> = null) {
    const [sort, setSort] = useState<SortState<K>>(initial)

    const toggle = useCallback((key: K) => {
        setSort((current) => {
            if (!current || current.key !== key) return { key, direction: "asc" }
            // asc -> desc -> back to the server's default order. That third state
            // matters here: the default IS meaningful (renewals arrive by expiry
            // date), so a user must be able to get back to it.
            if (current.direction === "asc") return { key, direction: "desc" }
            return null
        })
    }, [])

    return { sort, toggle, setSort }
}

/**
 * Applies a sort state to a list. `accessors` maps a column key to a comparable
 * value; `null`/`undefined` always sort last regardless of direction, because a
 * missing premium is not "cheapest" and a missing date is not "soonest".
 */
export function applySort<T, K extends string>(
    rows: T[],
    sort: SortState<K>,
    accessors: Record<K, (row: T) => string | number | Date | null | undefined>
): T[] {
    if (!sort) return rows
    const get = accessors[sort.key]
    if (!get) return rows

    const factor = sort.direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
        const av = get(a)
        const bv = get(b)
        const aMissing = av === null || av === undefined || av === ""
        const bMissing = bv === null || bv === undefined || bv === ""
        if (aMissing && bMissing) return 0
        if (aMissing) return 1
        if (bMissing) return -1

        if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor
        if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * factor
        // localeCompare with 'el' so Greek names order correctly — the default
        // collation puts accented characters after z.
        return String(av).localeCompare(String(bv), "el", { sensitivity: "base" }) * factor
    })
}

export function SortableColumn<K extends string>({
    columnKey,
    sort,
    onSort,
    label,
    align = "left",
    className = "",
}: {
    columnKey: K
    sort: SortState<K>
    onSort: (key: K) => void
    label: string
    align?: "left" | "right" | "center"
    className?: string
}) {
    const active = sort?.key === columnKey
    const ariaSort = active ? (sort!.direction === "asc" ? "ascending" : "descending") : "none"
    const Icon = active ? (sort!.direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown
    const justify =
        align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"

    return (
        <th aria-sort={ariaSort} className={`px-4 py-3 text-${align} ${className}`}>
            <button
                type="button"
                onClick={() => onSort(columnKey)}
                className={`group inline-flex w-full items-center gap-1 ${justify} text-caption font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
            >
                {label}
                <Icon
                    aria-hidden="true"
                    className={`h-3 w-3 shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60"}`}
                />
            </button>
        </th>
    )
}

/**
 * Sorting for the stacked-card view.
 *
 * Below 1024px `.pw-stacked-table` turns each row into a card and makes `thead`
 * `sr-only` — so the sortable headers above are invisible on a phone, and worse,
 * still focusable, meaning keyboard focus would disappear off-screen. An agent
 * on mobile had no way to sort at all.
 *
 * A native <select> rather than a custom menu: it gets the platform picker, and
 * the base-layer mobile floor already gives it 16px text (no iOS zoom) and a
 * 44px target. Same sort state as the headers, so the two views cannot disagree.
 */
export function MobileSortControl<K extends string>({
    sort,
    onSort,
    onClear,
    columns,
    label,
    defaultLabel,
    className = "",
}: {
    sort: SortState<K>
    onSort: (key: K) => void
    /** Restores the server's default order (pass the hook's `setSort` bound to null). */
    onClear: () => void
    columns: { key: K; label: string }[]
    /** Accessible name for the control, e.g. "Ταξινόμηση". */
    label: string
    /** Option representing the server's default order. */
    defaultLabel: string
    className?: string
}) {
    // Generated, not hardcoded: two sortable tables on one page would otherwise
    // share an id and the second label would point at the first control.
    const id = useId()
    const current = sort?.key ?? ""

    return (
        <div className={`flex items-center gap-2 lg:hidden ${className}`}>
            <label className="sr-only" htmlFor={id}>{label}</label>
            <select
                id={id}
                className="pw-input pw-input-sm flex-1"
                value={current}
                onChange={(e) => {
                    const next = e.target.value as K | ""
                    if (!next) onClear()
                    else if (next !== sort?.key) onSort(next)
                }}
            >
                <option value="">{defaultLabel}</option>
                {columns.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                ))}
            </select>
            {sort && (
                <button
                    type="button"
                    onClick={() => onSort(sort.key)}
                    aria-label={`${label} — ${sort.direction === "asc" ? "↑" : "↓"}`}
                    aria-pressed={sort.direction === "desc"}
                    className="pw-soft-button shrink-0"
                >
                    {sort.direction === "asc"
                        ? <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        : <ArrowDown className="h-4 w-4" aria-hidden="true" />}
                </button>
            )}
        </div>
    )
}
