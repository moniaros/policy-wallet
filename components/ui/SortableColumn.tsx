"use client"

import { useCallback, useMemo, useState } from "react"
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
                className={`group inline-flex w-full items-center gap-1 ${justify} text-kicker font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:hover:text-white`}
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
