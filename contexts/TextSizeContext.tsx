"use client"

import * as React from "react"
import {
    DEFAULT_TEXT_SIZE,
    TEXT_SIZE_ATTRIBUTE,
    TEXT_SIZE_STORAGE_KEY,
    normalizeTextSize,
    type TextSize,
} from "@/lib/a11y/text-size"

interface TextSizeContextValue {
    textSize: TextSize
    setTextSize: (size: TextSize) => void
}

const TextSizeContext = React.createContext<TextSizeContextValue | undefined>(undefined)

/**
 * Reading-size preference, shared with the blocking script in the layout head.
 *
 * The script is what actually applies the size before first paint; this reads
 * back what it set rather than reading localStorage a second time, so there is
 * one source of truth for "what size is the page currently at".
 *
 * Initial state is the default on both server and first client render — reading
 * storage during render would produce different HTML on the two sides and
 * hydration would throw. The real value lands in the effect, one tick later,
 * against a page the script has already sized correctly.
 */
export function TextSizeProvider({ children }: { children: React.ReactNode }) {
    const [textSize, setSize] = React.useState<TextSize>(DEFAULT_TEXT_SIZE)

    React.useEffect(() => {
        const applied = document.documentElement.getAttribute(TEXT_SIZE_ATTRIBUTE)
        setSize(normalizeTextSize(applied))
    }, [])

    const setTextSize = React.useCallback((size: TextSize) => {
        const next = normalizeTextSize(size)
        setSize(next)

        const root = document.documentElement
        if (next === DEFAULT_TEXT_SIZE) {
            root.removeAttribute(TEXT_SIZE_ATTRIBUTE)
        } else {
            root.setAttribute(TEXT_SIZE_ATTRIBUTE, next)
        }

        // Private browsing and storage-blocking extensions throw here. A
        // preference that fails to persist is a small loss; a settings page
        // that throws on click is not.
        try {
            window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, next)
        } catch {
            /* preference stays for this session only */
        }
    }, [])

    const value = React.useMemo(() => ({ textSize, setTextSize }), [textSize, setTextSize])

    return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>
}

/**
 * Falls back to the default rather than throwing when no provider is mounted,
 * so a component rendered outside the app shell (or in a test) still works.
 */
export function useTextSize(): TextSizeContextValue {
    const ctx = React.useContext(TextSizeContext)
    return ctx ?? { textSize: DEFAULT_TEXT_SIZE, setTextSize: () => {} }
}
