"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
    // The single door used to open onto the Greek homepage from everywhere,
    // including /en/*: an English visitor who mistyped a URL was moved to the
    // Greek site and had to notice the EN toggle to get back. The path is the
    // only locale signal available above the LanguageProvider, so use it.
    const pathname = usePathname()
    const isEnglishTree = pathname === "/en" || pathname?.startsWith("/en/")
    const homeHref = isEnglishTree ? "/en" : "/"

    return (
        // A 404 still needs a main landmark: without one, screen-reader users
        // have no "skip to content" destination and no way to jump past the
        // chrome on the one page where they are already lost.
        <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-900">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint dark:bg-primary/15">
                <ShieldAlert className="h-10 w-10 text-primary dark:text-mint" aria-hidden="true" />
            </div>

            <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                Η σελίδα δεν βρέθηκε
            </h1>
            <p className="mb-2 max-w-md text-center text-lg text-neutral-600 dark:text-neutral-400">
                Η σελίδα ή το ασφαλιστήριο που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί.
            </p>
            <p className="mb-10 max-w-md text-center text-sm text-neutral-500 dark:text-neutral-400">
                The page or policy you are looking for doesn’t exist or has been moved.
            </p>

            {/* Bilingual label either way — the destination is what changes. */}
            <Link href={homeHref} className="pw-primary-button justify-center">
                {isEnglishTree ? "Home · Αρχική" : "Αρχική · Home"}
            </Link>
        </main>
    )
}
