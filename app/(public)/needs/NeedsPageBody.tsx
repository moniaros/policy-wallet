import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { NeedsCheck } from "@/components/needs/NeedsCheck"
// Derived, not typed. The headline used to count the wrong thing — it named a
// number of QUESTIONS when there are twelve of them, spread across the steps
// below. A count in copy has to come from the source, not from memory.
import { NEEDS_STEPS } from "@/lib/needs/questions"

/**
 * The one thing on this site a stranger can use before deciding anything.
 *
 * Everything else asks for a policy PDF first, which is the highest-friction
 * possible opening move: it cannot be done from a phone on a bus, and it asks
 * for a document before the visitor believes the product is worth anything.
 * This page asks for six facts they already know and gives back something they
 * can act on without an account.
 *
 * Server component down to `NeedsCheck` — the heading and the framing never
 * ship as JavaScript, so the page is readable and indexable on first paint and
 * the interactive part hydrates underneath it.
 *
 * Wrapped in `LoBPageShell`, like every other public page. It shipped without
 * it and therefore without a header or a footer at all: no logo home, no nav,
 * no language toggle, no theme toggle, and — the part that actually matters —
 * no route to the terms, privacy and cookie pages, which have to be reachable
 * from anywhere on the site. A page whose whole job is to earn a signup was
 * also the one page with no way to reach the rest of the product.
 */
export function NeedsPageBody({ locale }: { locale: "el" | "en" }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    return (
        <LoBPageShell locale={locale}>
        <section className="px-6 pb-24 lg:px-12">
            <div className="mx-auto max-w-page">
                <div className="mx-auto mb-12 max-w-[760px]">
                    <h1 className="mb-4 text-h1 font-semibold leading-[1.05] tracking-[-0.03em] text-[#0F172A] lg:text-display dark:text-white">
                        {t(
                            `${NEEDS_STEPS.length} σύντομα βήματα. Μετά ξέρετε τι να ελέγξετε.`,
                            `${NEEDS_STEPS.length} short steps. Then you know what to check.`,
                        )}
                    </h1>
                    <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Δεν χρειάζεται λογαριασμός ή ασφαλιστήριο. Απαντήστε σε λίγες ερωτήσεις για την καθημερινότητά σας. Θα δείτε μια λίστα με θέματα που μπορείτε να ελέγξετε, όχι πρόταση αγοράς ασφάλισης.",
                            "No account or policy is needed. Answer a few questions about everyday life to see topics you can check, not a recommendation to buy insurance.",
                        )}
                    </p>
                </div>

                <NeedsCheck locale={locale} />
            </div>
        </section>
        </LoBPageShell>
    )
}
