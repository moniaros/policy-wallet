import Link from "next/link"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { NEUTRALITY_STATEMENT, pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { localizeHref } from "@/lib/seo/locale-links"

/**
 * /solutions/partners (EN source) and /solutions/synergates (EL mirror) — the
 * institutions page. Created NOINDEX and unlinked from every nav (A-04): the
 * Terms §3 consent qualification and the IDD opinion are still with legal, so
 * the page exists for direct conversations and review, not for crawlers.
 *
 * Hard rules this file answers to (§2, and the marketing run's decisions):
 *  - No institution names, no claimed or implied partnerships, no pilots.
 *  - No regulated-advice implication: the product understands and organises;
 *    demands-and-needs stays the intermediary's process, advice stays theirs.
 *  - No compliance self-verdicts: we offer documentation FOR the reader's own
 *    assessment — we never grade ourselves "compliant".
 *  - Data-location wording exact: EU storage; consent-gated AI analysis that
 *    may involve providers outside the EU under approved safeguards; no
 *    training on customer documents.
 *  - Early access (D3): no GA claim.
 */
export function PartnersSections({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)

    const CAPABILITIES: { title: [string, string]; body: [string, string] }[] = [
        {
            title: ["Συγκατάθεση πρώτα", "Consent-first ingestion"],
            body: [
                "Ο πελάτης ανεβάζει ή εξουσιοδοτεί· κάθε έγγραφο έχει τη δική του, ανακλητή συγκατάθεση. Χωρίς αυτήν, τίποτα δεν διαβάζεται και τίποτα δεν κοινοποιείται.",
                "The customer uploads or authorises; every document carries its own revocable consent. Without it, nothing is read and nothing is shared.",
            ],
        },
        {
            title: ["Κατανόηση καλύψεων", "Coverage understanding"],
            body: [
                "Κάθε συμβόλαιο, από όποιον κι αν εκδόθηκε, γίνεται δομημένα δεδομένα: καλύψεις, όρια, απαλλαγές, εξαιρέσεις, περίοδοι αναμονής — με παραπομπή στο ίδιο το έγγραφο.",
                "Every policy, whoever issued it, becomes structured data: covers, limits, deductibles, exclusions, waiting periods — anchored to the document itself.",
            ],
        },
        {
            title: ["Εντοπισμός κενών", "Gap detection"],
            body: [
                "Ντετερμινιστικοί κανόνες — όχι κρίση μοντέλου — εντοπίζουν τι λείπει. Το αποτέλεσμα διατυπώνεται ως ερωτήσεις για τον σύμβουλο, ποτέ ως σύσταση προϊόντος.",
                "Deterministic rules — not model judgement — surface what is missing. The output is phrased as questions for the adviser, never as a product recommendation.",
            ],
        },
        {
            title: ["Ενσωμάτωση", "Embedded where you work"],
            body: [
                "Στην εφαρμογή σας ή στα εργαλεία των συμβούλων σας, με τα δικαιώματα πρόσβασης να ακολουθούν πάντα τη συγκατάθεση του πελάτη.",
                "In your app or your advisers' tools, with access rights always following the customer's consent.",
            ],
        },
    ]

    const COMPLIANCE: { title: [string, string]; body: [string, string] }[] = [
        {
            title: ["IDD — απαιτήσεις και ανάγκες", "IDD — demands and needs"],
            body: [
                "Το τεκμηριωμένο χαρτοφυλάκιο του πελάτη και τα κενά του, ως δομημένα στοιχεία για τη δική σας διαδικασία απαιτήσεων και αναγκών (ν. 4583/2018). Η συμβουλή παραμένει του διαμεσολαβητή· το PolicyWallet δεν συστήνει προϊόντα.",
                "The customer's documented portfolio and its gaps, as structured inputs to your own demands-and-needs process (Greek law 4583/2018, transposing the IDD). Advice remains the intermediary's; PolicyWallet recommends no products.",
            ],
        },
        {
            title: ["GDPR — άρθρο 9", "GDPR — Article 9"],
            body: [
                "Τα δεδομένα υγείας είναι ειδικής κατηγορίας: η ανάλυση τρέχει μόνο με ρητή, χωριστή και ανακλητή συγκατάθεση, ανά πρόσωπο και ανά έγγραφο. Η κατάσταση συγκατάθεσης είναι ελέγξιμη.",
                "Health data is special-category: analysis runs only on explicit, separate, revocable consent, per person and per document. Consent state is auditable.",
            ],
        },
        {
            title: ["AI Act — οριοθέτηση", "AI Act — scoping"],
            body: [
                "Η τεχνητή νοημοσύνη χρησιμοποιείται για κατανόηση εγγράφων, με προέλευση για κάθε εξαγόμενο στοιχείο. Τεκμηρίωση μοντέλων και επεξεργασίας διαθέσιμη για τη δική σας αξιολόγηση.",
                "AI is used for document understanding, with provenance for every extracted fact. Model and processing documentation is available for your own assessment.",
            ],
        },
        {
            title: ["DORA — ετοιμότητα ελέγχου", "DORA — assessment readiness"],
            body: [
                "Υλικό για την αξιολόγηση τρίτων παρόχων ΤΠΕ: κατάλογος υποεπεξεργαστών, αποθήκευση στην ΕΕ, διαδικασία συμβάντων.",
                "Material for your ICT third-party assessment: subprocessor register, EU storage, incident process.",
            ],
        },
    ]

    return (
        <LoBPageShell activeNav="none" locale={locale}>
            <section className="px-g-6 md:px-g-8">
                <div className="mx-auto max-w-[820px] text-center">
                    <p className="text-g-label font-semibold uppercase tracking-[0.1em] text-fg-brand">
                        {t("Για τράπεζες και θεσμικούς συνεργάτες — πρώιμη διάθεση", "For banks and institutional partners — early access")}
                    </p>
                    <h1 className="mt-g-4 text-g-display-xl font-extrabold tracking-[-0.024em] text-fg-primary text-balance">
                        {t("Κατανόηση καλύψεων, ενσωματωμένη.", "Coverage understanding, embedded.")}
                    </h1>
                    <p className="mx-auto mt-g-5 max-w-[56ch] text-g-body-lg text-fg-secondary">
                        {t(
                            "Οι πελάτες σας έχουν ήδη ασφαλιστήρια. Με τη δική τους συγκατάθεση, γίνονται δομημένη εικόνα προστασίας — μέσα στα δικά σας κανάλια.",
                            "Your customers already hold policies. With their consent, those become a structured protection picture — inside your own channels.",
                        )}
                    </p>
                </div>
            </section>

            <section className="px-g-6 md:px-g-8 [padding-block:var(--space-section)]">
                <div className="mx-auto grid max-w-[1180px] gap-g-5 sm:grid-cols-2">
                    {CAPABILITIES.map((c, i) => (
                        <article key={i} className="rounded-g-lg border border-border-subtle bg-surface-raised p-g-6">
                            <h2 className="text-g-display-sm font-semibold text-fg-primary">{t(...c.title)}</h2>
                            <p className="mt-g-3 text-g-body-sm text-fg-secondary">{t(...c.body)}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* Neutrality as the data argument — the SAME statement the
                consumer site makes, because it survives partnership. */}
            <section className="bg-surface-wash px-g-6 md:px-g-8 [padding-block:var(--space-section)]">
                <div className="mx-auto max-w-[820px] text-center">
                    <h2 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">
                        {t("Η ουδετερότητα είναι το επιχείρημα των δεδομένων.", "Neutrality is the data argument.")}
                    </h2>
                    <p className="mx-auto mt-g-5 max-w-[62ch] text-g-body-lg text-fg-secondary">
                        {pick(NEUTRALITY_STATEMENT, locale)}
                    </p>
                    <p className="mx-auto mt-g-4 max-w-[62ch] text-g-body-sm text-fg-secondary">
                        {t(
                            "Γι' αυτό τα δεδομένα είναι αξιόπιστα: η ίδια ανάλυση για κάθε συμβόλαιο σημαίνει εικόνα χωρίς μεροληψία καναλιού.",
                            "That is why the data is trustworthy: the same analysis for every policy means a picture with no channel bias.",
                        )}
                    </p>
                </div>
            </section>

            <section className="px-g-6 md:px-g-8 [padding-block:var(--space-section)]">
                <div className="mx-auto max-w-[1180px]">
                    <h2 className="max-w-[26ch] text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">
                        {t("Φτιαγμένο για τον έλεγχό σας", "Built for your assessment")}
                    </h2>
                    <p className="mt-g-4 max-w-[62ch] text-g-body-sm text-fg-secondary">
                        {t(
                            "Δεν βαθμολογούμε τη συμμόρφωσή μας μόνοι μας — σας δίνουμε την τεκμηρίωση για να την αξιολογήσετε εσείς.",
                            "We do not grade our own compliance — we hand you the documentation to assess it yourself.",
                        )}
                    </p>
                    <div className="mt-g-8 grid gap-g-5 sm:grid-cols-2">
                        {COMPLIANCE.map((c, i) => (
                            <article key={i} className="rounded-g-lg border border-border-subtle bg-surface-raised p-g-6">
                                <h3 className="text-g-display-sm font-semibold text-fg-primary">{t(...c.title)}</h3>
                                <p className="mt-g-3 text-g-body-sm text-fg-secondary">{t(...c.body)}</p>
                            </article>
                        ))}
                    </div>
                    <p className="mt-g-6 text-g-caption text-fg-secondary">
                        {t("Αποθήκευση κρυπτογραφημένη στην ΕΕ. Η ανάλυση AI μπορεί να εμπλέκει παρόχους εκτός ΕΕ με εγκεκριμένες δικλείδες. Κανένας πάροχος δεν εκπαιδεύει μοντέλα στα έγγραφα πελατών. ",
                           "Storage is encrypted in the EU. AI analysis may involve providers outside the EU under approved safeguards. No provider trains models on customer documents. ")}
                        <Link href={localizeHref("/subprocessors", locale)} className="underline underline-offset-4">
                            {t("Κατάλογος υποεπεξεργαστών →", "Subprocessor register →")}
                        </Link>
                    </p>
                </div>
            </section>

            <section className="px-g-6 pb-24 md:px-g-8">
                <div className="mx-auto max-w-[820px] rounded-g-lg bg-surface-inverse p-g-10 text-center">
                    <h2 className="text-g-display-lg font-bold text-surface-base">
                        {t("Ας μιλήσουμε.", "Let's talk.")}
                    </h2>
                    <p className="mx-auto mt-g-3 max-w-[48ch] text-g-body-sm text-surface-wash">
                        {t(
                            "Σε πρώιμη διάθεση, με περιορισμένους συνεργάτες. Χωρίς ονόματα στη σελίδα — και το δικό σας δεν θα εμφανιστεί χωρίς να το εγκρίνετε.",
                            "In early access, with a limited set of partners. No names on this page — and yours will not appear without your sign-off.",
                        )}
                    </p>
                    <Link
                        href={localizeHref("/contact", locale)}
                        className="mt-g-6 inline-flex min-h-11 items-center rounded-g-pill bg-surface-base px-g-8 text-g-body-sm font-semibold text-fg-primary"
                    >
                        {t("Επικοινωνήστε μαζί μας", "Contact us")}
                    </Link>
                </div>
            </section>
        </LoBPageShell>
    )
}
