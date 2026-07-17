"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible-dialog behavior for a modal container.
 *
 * The agent modals are hand-rolled `fixed inset-0` divs with no dialog
 * semantics — keyboard and screen-reader users could not escape or tab within
 * them, and focus was never returned to the trigger. Attach the returned ref to
 * the modal's overlay/panel element (also give it `role="dialog"
 * aria-modal="true" tabIndex={-1}`) and this hook provides:
 *   • Escape-to-close
 *   • a focus trap (Tab / Shift+Tab cycle inside the dialog)
 *   • initial focus into the dialog on open
 *   • focus return to the previously-focused element (the trigger) on close
 *
 * Pass `isOpen` when the component stays mounted and toggles; for the common
 * mount-conditional modals it defaults to true.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(
    onClose: () => void,
    isOpen: boolean = true
) {
    const ref = useRef<T>(null)
    const previouslyFocused = useRef<HTMLElement | null>(null)
    // Keep the latest onClose without re-running the focus effect on every
    // render — updated in an effect (never during render).
    const onCloseRef = useRef(onClose)
    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        if (!isOpen) return
        const node = ref.current
        previouslyFocused.current = document.activeElement as HTMLElement | null

        const getFocusable = () =>
            node
                ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
                  )
                : []

        // Initial focus: first focusable inside, else the dialog container.
        const initial = getFocusable()[0]
        ;(initial ?? node)?.focus()

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.stopPropagation()
                onCloseRef.current()
                return
            }
            if (e.key !== "Tab" || !node) return
            const items = getFocusable()
            if (items.length === 0) {
                e.preventDefault()
                node.focus()
                return
            }
            const first = items[0]
            const last = items[items.length - 1]
            const active = document.activeElement as HTMLElement | null
            if (e.shiftKey) {
                if (active === first || !node.contains(active)) {
                    e.preventDefault()
                    last.focus()
                }
            } else if (active === last || !node.contains(active)) {
                e.preventDefault()
                first.focus()
            }
        }

        document.addEventListener("keydown", onKeyDown, true)
        return () => {
            document.removeEventListener("keydown", onKeyDown, true)
            // Return focus to whatever was focused before the dialog opened.
            previouslyFocused.current?.focus?.()
        }
    }, [isOpen])

    return ref
}
