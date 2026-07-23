"use client"

import { useCallback, useId, useMemo, useRef, type KeyboardEvent } from "react"

/**
 * Wiring for an accessible tablist — the WAI-ARIA tabs pattern.
 *
 * Two agent screens (the client detail view and the agent landing page) rendered
 * their tabs as plain <button>s in a <div>: a screen reader announced unrelated
 * buttons, there was no arrow-key navigation, and the selected tab was not tied
 * to the panel it controlled. Rather than reimplement roving focus twice, both
 * use this: it hands each tab its id/aria props and the panel its matching ids,
 * and provides Left/Right/Home/End that move focus AND selection together.
 *
 * Selection state stays with the caller (it usually already has an `activeTab`
 * wired to conditional content) — this only owns the ARIA and keyboard glue.
 */
export function useTabs<T extends string>(ids: readonly T[], active: T, onSelect: (id: T) => void) {
    const base = useId()
    const refs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({})

    const tabId = useCallback((id: T) => `${base}-tab-${id}`, [base])
    const panelId = useCallback((id: T) => `${base}-panel-${id}`, [base])

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const i = ids.indexOf(active)
            if (i < 0) return
            const target: Record<string, number> = {
                ArrowRight: (i + 1) % ids.length,
                ArrowLeft: (i - 1 + ids.length) % ids.length,
                Home: 0,
                End: ids.length - 1,
            }
            const next = target[e.key]
            if (next === undefined) return
            e.preventDefault()
            const nextId = ids[next]
            onSelect(nextId)
            refs.current[nextId]?.focus()
        },
        [ids, active, onSelect]
    )

    /** Props for each <button role="tab">. */
    const tabProps = useCallback(
        (id: T) => ({
            role: "tab" as const,
            id: tabId(id),
            "aria-selected": id === active,
            "aria-controls": panelId(id),
            tabIndex: id === active ? 0 : -1,
            ref: (el: HTMLButtonElement | null) => {
                refs.current[id] = el
            },
            onKeyDown,
            onClick: () => onSelect(id),
        }),
        [active, tabId, panelId, onKeyDown, onSelect]
    )

    /** Props for the single <div role="tabpanel"> showing the active tab. */
    const panelProps = useMemo(
        () => ({
            role: "tabpanel" as const,
            id: panelId(active),
            "aria-labelledby": tabId(active),
            tabIndex: 0,
        }),
        [active, panelId, tabId]
    )

    return { tabProps, panelProps }
}
