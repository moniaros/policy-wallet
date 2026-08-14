import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { NeedsCheck } from "@/components/needs/NeedsCheck"

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
                            "Έξι βήματα. Μετά ξέρετε τι να ελέγξετε.",
                            "Six steps. Then you know what to check.",
                        )}
                    </h1>
                    <p className="text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Δεν χρειάζεται λογαριασμό, ούτε να ανεβάσετε ασφαλιστήριο. Απαντήστε ό,τι ξέρετε απ' έξω και θα σας πούμε ποια σημεία έχουν σημασία για κάποιον στη δική σας κατάσταση — και τι ακριβώς να κοιτάξετε.",
                            "No account, no document to upload. Answer what you know off the top of your head and we will tell you which points matter for someone in your situation — and exactly what to look for.",
                        )}
                    </p>
                </div>

                <NeedsCheck locale={locale} />
            </div>
        </section>
        </LoBPageShell>
    )
}
