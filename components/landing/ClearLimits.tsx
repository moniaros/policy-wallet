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
                "Εξηγούμε τι αναφέρουν τα έγγραφά σας και σημειώνουμε όσα χρειάζονται έλεγχο. Για το αν μια ασφάλιση ταιριάζει στις ανάγκες σας, μιλήστε με τον ασφαλιστή σας.",
                "We explain what your documents say and flag points to check. Speak to your insurance adviser about whether cover suits your needs.",
            ),
        },
        {
            title: t("Διαβάζουμε μόνο ό,τι είναι γραμμένο", "We only read what is written"),
            body: t(
                "Η ανάλυση βασίζεται στα έγγραφα που ανεβάζετε. Αν υπάρχει διαφορετική συμφωνία ή μεταγενέστερη αλλαγή, ζητήστε γραπτή επιβεβαίωση από την ασφαλιστική σας.",
                "The analysis uses the documents you upload. If there is another agreement or a later change, ask your insurer for written confirmation.",
            ),
        },
        {
            title: t("Ελέγχετε την κοινοποίηση των στοιχείων σας", "You control how you share your information"),
            body: t(
                "Επιλέγετε τι μοιράζεστε με τον ασφαλιστή σας. Τεχνικοί πάροχοι επεξεργάζονται στοιχεία για να λειτουργεί η υπηρεσία, όπως εξηγούμε στην Πολιτική Απορρήτου.",
                "You choose what to share with your adviser. Technical providers process data to operate the service, as explained in our Privacy Policy.",
            ),
        },
        {
            title: t("Δεν σας βαθμολογούμε στα τυφλά", "We do not grade you blind"),
            body: t(
                "Όταν λείπει μια πληροφορία, αυτό δεν σημαίνει ότι λείπει και η κάλυψη. Το αποτέλεσμα χρειάζεται έλεγχο μαζί με το ασφαλιστήριο.",
                "Missing information does not mean missing cover. Check the result against the policy.",
            ),
        },
    ]

    return (
        <section
            id="limits"
            aria-labelledby="limits-heading"
            className="scroll-mt-28 border-y border-neutral-200 bg-neutral-50 px-6 py-20 lg:scroll-mt-36 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mx-auto max-w-[760px]">
                <h2
                    id="limits-heading"
                    className="mb-4 text-center text-h2 font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-neutral-900 lg:text-h1 dark:text-white"
                >
                    {t("Ξεκάθαρα όρια.", "Clear limits.")}
                </h2>
                <p className="mx-auto mb-14 max-w-[560px] text-center text-lead leading-relaxed text-neutral-600 dark:text-slate-300">
                    {t(
                        "Τι δεν κάνουμε, γραμμένο πριν μας δώσετε το email σας.",
                        "What we do not do, written down before you give us your email.",
                    )}
                </p>

                {/* A list, not cards. Four bordered boxes would make these read
                    as features, which is the opposite of what they are. */}
                <dl className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-slate-800 dark:border-slate-800">
                    {limits.map((limit) => (
                        <div key={limit.title} className="py-7">
                            <dt className="mb-2 text-title font-semibold tracking-tight text-neutral-900 dark:text-white">
                                {limit.title}
                            </dt>
                            <dd className="text-body-lg leading-relaxed text-neutral-600 dark:text-slate-300">
                                {limit.body}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    )
}
