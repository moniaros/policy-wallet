"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"

/**
 * Root 404 — shown for any unknown URL, above the LanguageProvider, so it cannot
 * read the user's language and must carry both. It used to be English-only, in a
 * Greek-default product: the same "wall of English at the worst moment" the sibling
 * app/error.tsx was deliberately made bilingual to avoid. Greek leads (the app
 * default), English follows in muted text — matching app/error.tsx exactly so the
 * two error surfaces read as one product. The prototype-flavoured "Return to
 * Safety" and the invented "404_POLICY_MISSING" code are gone: a market-leading
 * insurer's 404 is calm and plain, not cute.
 */
export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-900">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint dark:bg-primary/15">
                <ShieldAlert className="h-10 w-10 text-primary dark:text-mint" aria-hidden="true" />
            </div>

            <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                Η σελίδα δεν βρέθηκε
            </h1>
            <p className="mb-2 max-w-md text-center text-lg text-neutral-600 dark:text-neutral-400">
                Η σελίδα ή το συμβόλαιο που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί.
            </p>
            <p className="mb-10 max-w-md text-center text-sm text-neutral-500 dark:text-neutral-400">
                The page or policy you are looking for doesn’t exist or has been moved.
            </p>

            <Link href="/" className="pw-primary-button justify-center">
                Αρχική · Home
            </Link>
        </div>
    )
}
