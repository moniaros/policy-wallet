import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { Verdict } from "@/components/landing/ComparisonVerdict"
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import { CATEGORY_NAME, COMPARISON_COLUMNS, COMPARISON_ROWS, PRIMARY_ACTION, pick, type Bilingual, type ComparisonVerdict, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * /compare — the honest answer to "why not just ask my agent?".
 *
 * It names no competing product. The real alternatives a Greek household has
 * are a folder in a drawer, the insurer that sold them the policy, and the
 * agent who earns a commission on it, so those are the columns. The last row
 * is the one that matters and the only one where the drawer beats the
 * professionals: a folder earns nothing from the answer it gives. Neither do we.
 *
 * Server component: static markup, no JS shipped.
 */


/**
 * The category defined by its EDGES: the five things PolicyWallet gets
 * mistaken for, each excluded with a reason. Single-sourced because the
 * rendered section AND the FAQPage JSON-LD on /compare both read this array —
 * structured data can never claim a question the page does not visibly answer.
 */
export const NOT_CONFUSABLES: readonly { q: Bilingual; a: Bilingual }[] = [
    {
        q: { el: "Εφαρμογή ασφαλιστικής εταιρείας;", en: "An insurer's portal?" },
        a: {
            el: "Μια εφαρμογή ασφαλιστικής συνήθως δείχνει τα ασφαλιστήρια που έχετε σε εκείνη. Στο PolicyWallet συγκεντρώνετε έγγραφα από διαφορετικές εταιρείες.",
            en: "An insurer's app usually shows the policies you hold with that insurer. PolicyWallet brings together documents from different companies.",
        },
    },
    {
        q: { el: "Ιστότοπος σύγκρισης τιμών;", en: "A price-comparison site?" },
        a: {
            el: "Οι ιστοσελίδες σύγκρισης βοηθούν να συγκρίνετε προσφορές. Το PolicyWallet εξηγεί τα ασφαλιστήρια που ήδη έχετε και δεν πουλά νέα ασφάλιση.",
            en: "Comparison websites help you compare offers. PolicyWallet explains policies you already hold and does not sell new insurance.",
        },
    },
    {
        q: { el: "Εφαρμογή αποθήκευσης εγγράφων;", en: "A document-storage app?" },
        a: {
            el: "Αποθηκεύετε τα έγγραφα και βλέπετε μια εξήγηση των καλύψεων, των ποσών και των ημερομηνιών που αναφέρουν.",
            en: "Store your documents and see an explanation of the cover, amounts and dates they describe.",
        },
    },
    {
        q: { el: "Ψηφιακό πορτοφόλι;", en: "A digital wallet?" },
        a: {
            el: "Δεν φυλάσσουμε χρήματα και δεν κάνουμε πληρωμές για λογαριασμό σας. Το «πορτοφόλι» εδώ είναι ο χώρος όπου οργανώνετε τα ασφαλιστήριά σας.",
            en: "We do not hold money or make payments on your behalf. Here, your wallet is the place where you organise your insurance policies.",
        },
    },
    {
        q: { el: "Εργαλείο διαχείρισης πελατών για ασφαλιστές;", en: "A CRM for insurance agencies?" },
        a: {
            el: "Υπάρχει χώρος για εσάς και εργαλεία για ασφαλιστές. Οι ασφαλιστές βλέπουν έγγραφα που διαχειρίζονται για πελάτες ή που τους κοινοποιείτε, ανάλογα με τη σχέση και τα δικαιώματά τους.",
            en: "There is a space for you and tools for advisers. Advisers see documents they manage for clients or that you share, depending on their relationship and permissions.",
        },
    },
]

/** The affirmative that closes the section — also the sixth FAQ entry. */
export const CATEGORY_ANSWER: { q: Bilingual; a: (locale: MarketingLocale) => string } = {
    q: { el: "Τι είναι τότε το PolicyWallet;", en: "What is PolicyWallet then?" },
    a: (locale) =>
        locale === "el"
            ? `Το PolicyWallet είναι μια ${CATEGORY_NAME.el}. Συγκεντρώνετε τα έγγραφά σας και καταλαβαίνετε πιο εύκολα τι αναφέρουν.`
            : `PolicyWallet is an ${CATEGORY_NAME.en}. Bring your documents together and understand more easily what they say.`,
}

export function CompareSections({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const l = (href: string) => localizeHref(href, locale)

    return (
        <LoBPageShell locale={locale}>
            <section className="px-6 pb-16 text-center lg:px-12">
                <div className="mx-auto max-w-[820px]">
                    <h1 className="mb-6 text-h1 leading-[1.05] font-semibold tracking-[-0.04em] text-[#0F172A] md:text-display dark:text-white text-balance">
                        {t("Γιατί να μη ρωτήσετε απλώς τον ασφαλιστή σας;", "Why not just ask your agent?")}
                    </h1>
                    <p className="mx-auto max-w-[640px] text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Ο ασφαλιστής σας μπορεί να εξηγήσει τους όρους και να σας συμβουλεύσει. Το PolicyWallet σάς βοηθά να έχετε τα έγγραφα και τις ερωτήσεις σας έτοιμα για αυτή τη συζήτηση.",
                            "Your insurance adviser can explain the terms and give advice. PolicyWallet helps you have your documents and questions ready for that conversation.",
                        )}
                    </p>
                </div>
            </section>

            <section
                aria-labelledby="compare-table-heading"
                className="px-6 pb-20 lg:px-12 lg:pb-28"
            >
                <div className="mx-auto max-w-page">
                    <h2
                        id="compare-table-heading"
                        className="mb-3 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white"
                    >
                        {t("Τι κάνει το καθένα", "What each one does")}
                    </h2>
                    <p className="mb-8 max-w-[640px] text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            `${COMPARISON_ROWS.length} πράγματα που θέλετε να ξέρετε για τις ασφάλειές σας, και ποιος σας τα δίνει.`,
                            `${COMPARISON_ROWS.length} things you want to know about your insurance, and who gives them to you.`,
                        )}
                    </p>

                    {/* A five-column table cannot fit a 320px screen honestly.
                        It scrolls sideways inside a labelled, focusable region
                        so keyboard users can reach the scroll too. */}
                    {/* Its own name, not the section's. Pointing both the
                        <section> and this scroller at compare-table-heading
                        exposed two nested regions called "Τι κάνει το καθένα",
                        so a screen-reader user landing in the inner one heard
                        the name they had just left. */}
                    <div
                        role="region"
                        aria-label={t("Πίνακας σύγκρισης", "Comparison table")}
                        tabIndex={0}
                        className="relative -mx-6 overflow-x-auto px-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] lg:mx-0 lg:px-0"
                    >
                        <table className="w-full min-w-[720px] border-collapse text-left">
                            <caption className="sr-only">
                                {t(
                                    "Σύγκριση: τι σας δίνει ο φάκελος στο συρτάρι, η ασφαλιστική σας, ο ασφαλιστής σας και το PolicyWallet.",
                                    "Comparison: what the folder in the drawer, your insurance company, your agent and PolicyWallet each give you.",
                                )}
                            </caption>
                            <thead>
                                <tr className="border-b border-[#E2E8F0] dark:border-slate-800">
                                    <th
                                        scope="col"
                                        className="w-[30%] py-4 pr-4 align-bottom text-body-sm font-semibold uppercase tracking-wider text-[#5B6A7A] dark:text-slate-400"
                                    >
                                        {t("Τι θέλετε να ξέρετε", "What you want to know")}
                                    </th>
                                    {COMPARISON_COLUMNS.map((column) => (
                                        <th
                                            key={column.key}
                                            scope="col"
                                            className={`py-4 pr-4 align-bottom ${
                                                column.key === "policywallet"
                                                    ? "text-[#29685B] dark:text-brand-accent"
                                                    : "text-[#0F172A] dark:text-white"
                                            }`}
                                        >
                                            <span className="block text-body-lg font-semibold">
                                                {pick(column.label, locale)}
                                            </span>
                                            <span className="mt-1 block text-body-sm font-normal text-[#5B6A7A] dark:text-slate-400">
                                                {pick(column.note, locale)}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON_ROWS.map((row) => (
                                    <tr
                                        key={row.job.en}
                                        className="border-b border-[#E2E8F0] last:border-0 dark:border-slate-800"
                                    >
                                        <th
                                            scope="row"
                                            className="py-4 pr-4 align-middle text-body-lg font-medium text-[#0F172A] dark:text-white"
                                        >
                                            {pick(row.job, locale)}
                                        </th>
                                        <td className="py-4 pr-4 align-middle">
                                            <Verdict value={row.folder} locale={locale} />
                                        </td>
                                        <td className="py-4 pr-4 align-middle">
                                            <Verdict value={row.insurer} locale={locale} />
                                        </td>
                                        <td className="py-4 pr-4 align-middle">
                                            <Verdict value={row.advisor} locale={locale} />
                                        </td>
                                        <td className="py-4 pr-4 align-middle">
                                            <Verdict value={row.policywallet} locale={locale} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-body-sm text-[#5B6A7A] lg:hidden dark:text-slate-400">
                        {t("Σύρετε τον πίνακα πλάγια για να δείτε όλες τις στήλες.", "Swipe the table sideways to see every column.")}
                    </p>
                </div>
            </section>

            <section
                aria-labelledby="compare-honest-heading"
                className="border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-20 lg:px-12 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="mx-auto max-w-[820px]">
                    <h2
                        id="compare-honest-heading"
                        className="mb-8 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white"
                    >
                        {t("Πώς συνεργάζεστε με τον ασφαλιστή σας", "Now the fair part")}
                    </h2>

                    <div className="space-y-6 text-lead leading-[1.7] text-[#334155] dark:text-slate-300">
                        <p>
                            {t(
                                "Ο ασφαλιστής σας γνωρίζει τις επιλογές της αγοράς και μπορεί να σας καθοδηγήσει όταν χρειάζεται να δηλώσετε ζημιά ή να αλλάξετε κάλυψη.",
                                "Your insurance adviser knows the market and can guide you when you need to report a loss or change cover.",
                            )}
                        </p>
                        <p>
                            {t(
                                "Αυτό που κάνουμε είναι διαφορετικό: σας δίνουμε τη δική σας εικόνα, γραμμένη στα δικά σας λόγια, πριν μπείτε σε οποιαδήποτε κουβέντα. Πάτε στον ασφαλιστή σας ξέροντας τι να ρωτήσετε.",
                                "What we do is different: we give you your own picture, written in your own words, before you walk into any conversation. You go to your agent knowing what to ask.",
                            )}
                        </p>
                        {/* The line here used to be "many agents already work
                            inside PolicyWallet" — a claim about adoption we
                            cannot evidence. What we CAN say is what we built. */}
                        <p className="font-semibold text-[#0F172A] dark:text-white">
                            {t(
                                "Γι' αυτό φτιάξαμε και εργαλεία για ασφαλιστές — για να δουλεύετε μαζί, πάνω στα ίδια στοιχεία.",
                                "That is why we also built tools for agents — so the two of you work together, on the same facts.",
                            )}
                        </p>
                    </div>

                    <div className="mt-10">
                        <Link
                            href={l("/solutions/agents")}
                            className="inline-flex min-h-11 items-center gap-1.5 text-body-lg font-semibold text-[#0F172A] underline-offset-4 hover:underline dark:text-white"
                        >
                            {t("Εργαλεία για ασφαλιστές", "I am an agent — show me")}
                            <ArrowRight aria-hidden className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── What we are NOT — the category defined by its edges. Each of
                the five things PolicyWallet gets mistaken for is named and
                excluded with a reason, so no reader (or answer engine) can
                file us under an existing shelf. */}
            <section aria-labelledby="compare-not-heading" className="px-6 py-20 lg:px-12 lg:py-28">
                <div className="mx-auto max-w-[820px]">
                    <h2
                        id="compare-not-heading"
                        className="mb-3 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white"
                    >
                        {t("Τι δεν είναι το PolicyWallet;", "What is PolicyWallet not?")}
                    </h2>
                    <p className="mb-10 text-lead leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Δείτε πώς σας βοηθά και πού σταματά ο ρόλος του.",
                            "See how it helps and where its role ends.",
                        )}
                    </p>

                    <div className="space-y-8">
                        {NOT_CONFUSABLES.map((item) => (
                            <div key={item.q.en}>
                                <h3 className="mb-2 text-title font-semibold text-[#0F172A] dark:text-white">
                                    {pick(item.q, locale)}
                                </h3>
                                <p className="text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                                    {pick(item.a, locale)}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* The turn from five denials to one assertion. The heading
                        is rendered, not just emitted: this pair is the sixth
                        FAQPage entry, and structured data may never carry a
                        question the reader cannot see on the page. */}
                    <div className="mt-10 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-7 dark:border-[#29685B]/50 dark:bg-[#29685B]/15">
                        <h3 className="mb-2 text-title font-semibold text-[#0F172A] dark:text-white">
                            {pick(CATEGORY_ANSWER.q, locale)}
                        </h3>
                        <p className="text-lead font-semibold leading-relaxed text-[#0F172A] dark:text-white">
                            {CATEGORY_ANSWER.a(locale)}
                        </p>
                    </div>
                </div>
            </section>

            {/* Deliberately short, and deliberately NOT repeating the free-tier
                line: LoBPageShell appends its own pricing band immediately
                below this, and the two together were saying "free for one policy"
                twice in a row, one on top of the other. */}
            <section className="px-6 py-20 text-center lg:px-12 lg:py-24">
                <div className="mx-auto max-w-[640px]">
                    <h2 className="mb-6 text-h2 leading-[1.1] font-semibold tracking-[-0.03em] text-[#0F172A] lg:text-h1 dark:text-white text-balance">
                        {t(
                            "Δείτε τι λέει το δικό σας ασφαλιστήριο.",
                            "The table tells one story. Your own policy tells yours.",
                        )}
                    </h2>
                    <Link
                        href={authHref("/auth/signup?role=policyholder&source=compare_cta", locale)}
                        className="pw-primary-button pw-btn-lg"
                    >
                        {pick(PRIMARY_ACTION, locale)}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </LoBPageShell>
    )
}
