import Link from "next/link"
import { localizeHref } from "@/lib/seo/locale-links"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"

/**
 * /platform — how the analysis actually works.
 *
 * Same rule as /trust: every sentence describes something the code does today,
 * and the citation lives in the comment beside it.
 *
 * Two things this page deliberately does NOT say:
 *
 *  • It does not claim the rules cover every kind of coverage gap. They cover
 *    what someone has written a rule for, and that is a short list today
 *    (docs/audits/phase3-gap-engine-findings-2026-08.md). Saying "we check your
 *    policy against our rules" without that qualifier would be the same
 *    over-claim the rewrite existed to remove.
 *  • It does not describe the Greek insurer reference data as a proprietary
 *    asset. It is an internally compiled research draft, partially checked
 *    against the Bank of Greece register, used to populate a dropdown
 *    (prisma/greek-insurers.json `_meta.important_caveat` says so itself).
 *
 * CITATIONS
 *  envelope    — lib/schemas/acord-data.ts (AcordDataSchema v3): coverages,
 *                limits, deductibles, exclusions, conditions, per-branch
 *                sections, bilingual, one shape for every insurer
 *  conditions  — lib/schemas/acord-data.ts:295-300 `breachEffect`
 *                (voids_cover | suspends_cover | reduces_claim | unknown)
 *  rules       — lib/gap-detection.ts decideGapsForPolicy / evaluateGapLogic;
 *                severity from GapDefinition, never from the model
 *  provenance  — prisma/schema.prisma GapInstance.ruleId / ruleInputs /
 *                engineVersion
 *  bounded-ai  — lib/services/ai/ai-service.interface.ts (no isDetected, no
 *                severity field exists for a model to fill)
 *  unknown     — lib/gap-detection.ts evaluateAcordFieldCheck: for is_false and
 *                all_false only an explicit `false` counts as absence, so an
 *                unextracted field yields no finding. The separate `missing`
 *                operator DOES fire on an unextracted field — it asks whether a
 *                value was recorded, not whether cover exists — which is why step
 *                04 distinguishes "not recorded" from "not covered" instead of
 *                claiming a gap only ever appears when the policy says so.
 *                Live example: prisma/seed.ts missing_coordination_centre.
 *  portable    — app/api/v1/me/data-export/route.ts (structured, self-service)
 */

type Locale = "el" | "en"
const t = (locale: Locale, el: string, en: string) => (locale === "el" ? el : en)

const STEPS: { n: string; title: { el: string; en: string }; body: { el: string; en: string } }[] = [
    {
        n: "01",
        title: {
            el: "Το έγγραφο γίνεται δομημένα δεδομένα",
            en: "The document becomes structured data",
        },
        body: {
            el: "Ένα ασφαλιστήριο είναι PDF γραμμένο όπως θέλει η κάθε εταιρεία. Το διαβάζουμε σε ένα κοινό σχήμα: καλύψεις, όρια, απαλλαγές, εξαιρέσεις και οι όροι που μπορούν να ακυρώσουν μια κάλυψη αν δεν τηρηθούν. Το ίδιο σχήμα για κάθε ασφαλιστική, στα ελληνικά και στα αγγλικά.",
            en: "A policy is a PDF written however each company likes. We read it into one common shape: coverages, limits, deductibles, exclusions, and the conditions that can void a cover if they are not met. The same shape for every insurer, in Greek and English.",
        },
    },
    {
        n: "02",
        title: {
            el: "Κανόνες ελέγχουν τα δεδομένα",
            en: "Rules check that data",
        },
        body: {
            el: "Ό,τι σας παρουσιάζουμε ως κενό κάλυψης το βρήκε κανόνας που κοίταξε συγκεκριμένα πεδία του ασφαλιστηρίου σας — όχι ένα μοντέλο που σχημάτισε γνώμη. Κάθε εύρημα κρατά ποιος κανόνας το έβγαλε και τι τιμές διάβασε, ώστε να μπορεί να ελεγχθεί και να αμφισβητηθεί.",
            en: "Anything we show you as a coverage gap was found by a rule that looked at specific fields of your policy — not by a model forming an opinion. Every finding keeps which rule produced it and what values that rule read, so it can be checked and argued with.",
        },
    },
    {
        n: "03",
        title: {
            el: "Η τεχνητή νοημοσύνη το εξηγεί",
            en: "The AI puts it into words",
        },
        body: {
            el: "Αφού αποφασίσουν οι κανόνες, η τεχνητή νοημοσύνη εξηγεί το εύρημα σε απλά ελληνικά. Δεν μπορεί να προσθέσει κενό που δεν βρήκαν οι κανόνες, ούτε να κρίνει πόσο σοβαρό είναι — τα πεδία αυτά δεν υπάρχουν καν στη διεπαφή που της δίνουμε.",
            en: "Once the rules have decided, the AI explains the finding in plain language. It cannot add a gap the rules did not find, and it cannot judge how serious one is — those fields do not exist in the interface we give it.",
        },
    },
    {
        n: "04",
        title: {
            el: "«Δεν ξέρω» δεν σημαίνει «δεν καλύπτεσαι»",
            en: "“Unknown” does not mean “not covered”",
        },
        body: {
            el: "Αν το έγγραφο δεν λέει τίποτα για μια κάλυψη, δεν συμπεραίνουμε ότι λείπει: η σιωπή δεν είναι απόδειξη απουσίας και ένα εύρημα που στηρίζεται σε σιωπή είναι λάθος που κοστίζει. Όπου ένας κανόνας ελέγχει αν κάτι έχει καταγραφεί, το εύρημα το λέει ακριβώς έτσι — «δεν έχει καταγραφεί», όχι «δεν καλύπτεστε».",
            en: "If the document says nothing about a cover, we do not conclude it is missing: silence is not evidence of absence, and a finding built on silence is the expensive kind of wrong. Where a rule checks whether something was recorded at all, the finding says exactly that — “not recorded”, never “not covered”.",
        },
    },
]

export function PlatformSections({ locale }: { locale: Locale }) {
    const l = (href: string) => localizeHref(href, locale)

    return (
        <div className="min-h-screen bg-white dark:bg-[#0B1220]">
            <PublicHeader locale={locale} />
            <main id="main-content">
                <section className="mx-auto max-w-form px-4 pt-16 pb-10 text-center sm:pt-24">
                    <p className="text-kicker uppercase tracking-wide text-[#29685B] dark:text-[#A7F3D0]">
                        {t(locale, "Πώς δουλεύει", "How it works")}
                    </p>
                    <h1 className="mt-3 text-display font-semibold text-balance text-[#0F172A] dark:text-white">
                        {t(
                            locale,
                            "Γιατί να εμπιστευτείτε την απάντηση",
                            "Why the answer is worth trusting"
                        )}
                    </h1>
                    <p className="mx-auto mt-5 max-w-[560px] text-body-lg leading-relaxed text-[#334155] dark:text-slate-200">
                        {t(
                            locale,
                            "Το ασφαλιστήριό σας γίνεται δεδομένα, οι κανόνες αποφασίζουν, και η τεχνητή νοημοσύνη το εξηγεί. Με αυτή τη σειρά.",
                            "Your policy becomes data, rules decide, and the AI explains. In that order."
                        )}
                    </p>
                </section>

                <section className="mx-auto max-w-form px-4 pb-12">
                    <ol className="flex flex-col gap-8">
                        {STEPS.map((step) => (
                            <li key={step.n} className="flex gap-4">
                                <span
                                    aria-hidden="true"
                                    className="text-h4 font-semibold tabular-nums text-[#29685B] dark:text-[#A7F3D0]"
                                >
                                    {step.n}
                                </span>
                                <div>
                                    <h2 className="text-h4 font-semibold text-[#0F172A] dark:text-white">
                                        {t(locale, step.title.el, step.title.en)}
                                    </h2>
                                    <p className="mt-2 text-body-lg leading-relaxed text-[#334155] dark:text-slate-200">
                                        {t(locale, step.body.el, step.body.en)}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* The limit, stated by us before a reader finds it. A page that
                    explains a method and hides its boundary is an advert. */}
                <section className="mx-auto max-w-form px-4 pb-16">
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 dark:border-white/10 dark:bg-white/5">
                        <h2 className="text-h4 font-semibold text-[#0F172A] dark:text-white">
                            {t(locale, "Τι δεν κάνει αυτό", "What this does not do")}
                        </h2>
                        <p className="mt-3 text-body leading-relaxed text-[#334155] dark:text-slate-200">
                            {t(
                                locale,
                                "Οι κανόνες καλύπτουν όσα έχει γράψει κάποιος ως κανόνα — όχι κάθε πιθανό κενό σε κάθε κλάδο. Εκεί που δεν υπάρχει κανόνας, δεν σας δείχνουμε εύρημα· προτιμούμε το κενό στην οθόνη από ένα εύρημα που δεν στηρίζεται.",
                                "The rules cover what someone has written a rule for — not every possible gap in every branch. Where there is no rule, we show you no finding: we would rather leave the screen empty than fill it with something we cannot stand behind."
                            )}
                        </p>
                        <p className="mt-3 text-body leading-relaxed text-[#334155] dark:text-slate-200">
                            {t(
                                locale,
                                "Η ανάλυση δεν είναι ασφαλιστική συμβουλή και δεν υποκαθιστά το ίδιο το ασφαλιστήριο ούτε τον αδειοδοτημένο διαμεσολαβητή σας.",
                                "The analysis is not insurance advice and does not replace the policy document itself or your licensed intermediary."
                            )}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-body-sm">
                            <Link className="underline" href={l("/trust")}>
                                {t(locale, "Τι γίνεται με τα δεδομένα σας", "What happens to your data")}
                            </Link>
                            <Link className="underline" href={l("/product")}>
                                {t(locale, "Τι βλέπετε στην πράξη", "What you actually see")}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <PublicMegaFooter locale={locale} />
        </div>
    )
}

/** Extractable answers, rendered verbatim above. */
export const PLATFORM_FAQS: { q: { el: string; en: string }; a: { el: string; en: string } }[] = [
    {
        q: {
            el: "Αποφασίζει η τεχνητή νοημοσύνη αν έχω κενό κάλυψης;",
            en: "Does the AI decide whether I have a coverage gap?",
        },
        a: STEPS[2].body,
    },
    {
        q: {
            el: "Τι γίνεται αν το ασφαλιστήριο δεν αναφέρει κάτι;",
            en: "What happens if my policy does not mention something?",
        },
        a: STEPS[3].body,
    },
]
