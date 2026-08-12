import type { MarketingLocale } from "@/lib/marketing/positioning"

/**
 * What PolicyWallet does not do.
 *
 * The honesty content was already scattered across the site — a line in the
 * FAQ, a clause on /company, a disclaimer under an analysis. Nowhere did a
 * visitor find the boundaries stated together, before signing up, as a
 * deliberate section rather than as fine print they had to hunt for.
 *
 * Stating limits plainly is not a weakness on a page like this: the product's
 * entire claim is that nobody pays us to tell you a particular thing, and a
 * page that only lists strengths reads exactly like every page written by
 * someone who IS being paid. This section is the proof of the posture.
 *
 * Everything here is verifiable against the product. Nothing is aspirational.
 */
export function ClearLimits({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    const limits = [
        {
            title: t("Δεν είμαστε ο σύμβουλός σας", "We are not your adviser"),
            body: t(
                "Σας λέμε τι γράφει το ασφαλιστήριό σας και τι λείπει από αυτό. Δεν είναι ρυθμιζόμενη ασφαλιστική συμβουλή, και δεν αντικαθιστά τον ασφαλιστή σας — τον κάνει πιο χρήσιμο, γιατί πηγαίνετε ξέροντας τι να ρωτήσετε.",
                "We tell you what your policy says and what is missing from it. That is not regulated insurance advice, and it does not replace your agent — it makes them more useful, because you arrive knowing what to ask.",
            ),
        },
        {
            title: t("Διαβάζουμε μόνο ό,τι είναι γραμμένο", "We only read what is written"),
            body: t(
                "Αν κάτι σας το υποσχέθηκαν προφορικά αλλά δεν μπήκε στο συμβόλαιο, δεν μπορούμε να το δούμε — και δεν θα το δει ούτε η ασφαλιστική την ώρα της αποζημίωσης.",
                "If something was promised to you verbally but never made it into the contract, we cannot see it — and neither will the insurer at the moment of a claim.",
            ),
        },
        {
            title: t("Δεν στέλνουμε τα δεδομένα σας πουθενά", "We send your data nowhere"),
            body: t(
                "Καμία ασφαλιστική δεν βλέπει τι ανεβάσατε. Κανένας ασφαλιστής δεν βλέπει τον φάκελό σας αν δεν του δώσετε εσείς πρόσβαση, και μπορείτε να την πάρετε πίσω όποτε θέλετε.",
                "No insurance company sees what you uploaded. No agent sees your file unless you give them access, and you can take it back whenever you want.",
            ),
        },
        {
            title: t("Δεν σας βαθμολογούμε στα τυφλά", "We do not grade you blind"),
            body: t(
                "Όταν δεν ξέρουμε κάτι, το λέμε αντί να το μαντέψουμε. Ένας κίνδυνος που εξαρτάται από στοιχεία που δεν μας έχετε δώσει μένει «χρειάζεται έλεγχος» — δεν γίνεται κενό που δεν επιβεβαιώσαμε ποτέ.",
                "When we do not know something, we say so instead of guessing. A risk that depends on facts you have not given us stays “needs review” — it does not become a gap we never confirmed.",
            ),
        },
    ]

    return (
        <section
            id="limits"
            aria-labelledby="limits-heading"
            className="scroll-mt-28 border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mx-auto max-w-[760px]">
                <h2
                    id="limits-heading"
                    className="mb-4 text-center text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[#0F172A] lg:text-h1 dark:text-white"
                >
                    {t("Ξεκάθαρα όρια.", "Clear limits.")}
                </h2>
                <p className="mx-auto mb-14 max-w-[560px] text-center text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                    {t(
                        "Τι δεν κάνουμε, γραμμένο πριν μας δώσετε το email σας.",
                        "What we do not do, written down before you give us your email.",
                    )}
                </p>

                {/* A list, not cards. Four bordered boxes would make these read
                    as features, which is the opposite of what they are. */}
                <dl className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0] dark:divide-slate-800 dark:border-slate-800">
                    {limits.map((limit) => (
                        <div key={limit.title} className="py-7">
                            <dt className="mb-2 text-title font-semibold tracking-tight text-[#0F172A] dark:text-white">
                                {limit.title}
                            </dt>
                            <dd className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                {limit.body}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    )
}
