"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

interface PolicyQaPrefillValue {
    /** The question to drop into the Q&A input, or null if nothing is pending. */
    prefill: string | null
    /** Prefill the Q&A box with `question` and scroll it into view. */
    ask: (question: string) => void
}

/**
 * Imperative bridge from anywhere on the policy detail page into PolicyQA.
 *
 * Branch pages deep-link with `?q=…#policy-qa`, which PolicyQA reads in an
 * effect keyed on `searchParams`. That works across navigations but is a
 * silent no-op on the page you are already on — the URL never changes, so the
 * effect never refires. This context is the same-page path.
 *
 * The provider bumps an internal counter on every `ask()`, so the context
 * value gets a fresh identity even when the SAME question is asked twice;
 * consumers keying an effect on the context value therefore always refire.
 */
const PolicyQaPrefillContext = createContext<PolicyQaPrefillValue>({
    prefill: null,
    ask: () => {},
})

export function PolicyQaPrefillProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{ question: string | null; nonce: number }>({
        question: null,
        nonce: 0,
    })

    const ask = useCallback((question: string) => {
        setState((prev) => ({ question, nonce: prev.nonce + 1 }))
        if (typeof document !== "undefined") {
            document.getElementById("policy-qa")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, [])

    // `state` is a new object per ask() — identity change is the refire signal.
    const value = useMemo<PolicyQaPrefillValue>(() => ({ prefill: state.question, ask }), [state, ask])

    return <PolicyQaPrefillContext.Provider value={value}>{children}</PolicyQaPrefillContext.Provider>
}

export function usePolicyQaPrefill(): PolicyQaPrefillValue {
    return useContext(PolicyQaPrefillContext)
}
