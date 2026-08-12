/**
 * Where the answers live between the public page and the account.
 *
 * `localStorage`, not a server-side draft table. The reasoning:
 *
 *  - The whole point of the page is that it costs nothing to use, and writing
 *    an anonymous visitor's household facts to our database before they have
 *    agreed to anything is the opposite of the promise the rest of the site
 *    makes. Nothing leaves the browser until they create an account.
 *  - Signup happens in the same browser in the overwhelming majority of cases,
 *    including when Supabase sends a confirmation link — the link opens in the
 *    default browser, which is the one they were already using.
 *
 * The honest limit, stated here because it is invisible from the outside:
 * someone who fills the form on a phone and then confirms the email on a laptop
 * loses the answers and is asked again inside the product. That is a worse
 * outcome than a server draft would give, and a better one than storing a
 * stranger's data on the strength of a page view.
 *
 * The payload is versioned. A future question change must not hand a stale
 * shape to the risk API, so a mismatch is dropped rather than migrated.
 */

import type { NeedsAnswers } from "@/lib/needs/questions"

const KEY = "pw_needs_v1"
const VERSION = 1

/** Answers older than this are ignored — a stale household is worse than none. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30

interface StoredNeeds {
    version: number
    savedAt: number
    answers: NeedsAnswers
}

export function saveNeeds(answers: NeedsAnswers): void {
    if (typeof window === "undefined") return
    try {
        const payload: StoredNeeds = { version: VERSION, savedAt: Date.now(), answers }
        window.localStorage.setItem(KEY, JSON.stringify(payload))
    } catch {
        // Private mode, or the quota is full. The form still works; only the
        // carry-over to the account is lost, and the visitor is never told
        // about a failure they cannot act on.
    }
}

export function readNeeds(): NeedsAnswers | null {
    if (typeof window === "undefined") return null
    try {
        const raw = window.localStorage.getItem(KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredNeeds
        if (parsed?.version !== VERSION) return null
        if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS) return null
        return parsed.answers ?? null
    } catch {
        return null
    }
}

export function clearNeeds(): void {
    if (typeof window === "undefined") return
    try {
        window.localStorage.removeItem(KEY)
    } catch {
        /* nothing to recover from */
    }
}
