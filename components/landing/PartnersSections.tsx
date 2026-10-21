import Link from "next/link"
import { LoBPageShell } from "@/components/landing/LoBPageShell"
import { NEUTRALITY_STATEMENT, pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { localizeHref } from "@/lib/seo/locale-links"

/**
 * /en/solutions/partners (EN source) and /solutions/synergates (EL mirror) — the
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
                "Πριν σταλεί έγγραφο για ανάλυση με τεχνητή νοημοσύνη, η εφαρμογή ελέγχει τη σχετική συγκατάθεση. Η πρόσβαση συνεργατών ελέγχεται ξεχωριστά.",
                "Before sending a document for AI analysis, the application checks the relevant consent. Partner access is checked separately.",
            ],
        },
        {
            title: ["Κατανόηση καλύψεων", "Coverage understanding"],
            body: [
                "Η εφαρμογή διαβάζει το έγγραφο και οργανώνει τις πληροφορίες του: τι καλύπτεται, έως ποιο ποσό, τι πληρώνει ο ασφαλισμένος και ποιες εξαιρέσεις αναφέρονται.",
                "The application reads the document and organises its information: cover, limits, the policyholder's share and stated exclusions.",
            ],
        },
        {
            title: ["Εντοπισμός κενών", "Gap detection"],
            body: [
                "Προκαθορισμένοι έλεγχοι αναζητούν συγκεκριμένα στοιχεία στο έγγραφο. Η τεχνητή νοημοσύνη βοηθά στην ανάγνωση και στην εξήγηση. Τα αποτελέσματα χρειάζονται επαγγελματική αξιολόγηση.",
                "Predefined checks look for specific information in the document. AI helps read and explain it. Results require professional assessment.",
            ],
        },
        {
            title: ["Ενσωμάτωση", "Embedded where you work"],
            body: [
                "Συζητήστε μαζί μας πώς μπορεί να ενταχθεί η υπηρεσία στα εργαλεία σας. Η πρόσβαση εξαρτάται από τον ρόλο, τη σχέση με τον πελάτη και τα δικαιώματα κάθε χρήστη.",
                "Discuss with us how the service could fit into your tools. Access depends on each user's role, client relationship and permissions.",
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
                "Τα στοιχεία υγείας χρειάζονται ιδιαίτερη προστασία και κατάλληλη νομική βάση. Η εφαρμογή καταγράφει τη συγκατάθεση για ανάλυση με τεχνητή νοημοσύνη. Ο φορέας που διαχειρίζεται στοιχεία άλλων προσώπων οφείλει να εξασφαλίζει ότι έχει δικαίωμα να τα χρησιμοποιεί.",
                "Health information needs special protection and an appropriate legal basis. The application records consent for AI analysis. An organisation handling other people's data must establish its right to use it.",
            ],
        },
        {
            title: ["AI Act — οριοθέτηση", "AI Act — scoping"],
            body: [
                "Η τεχνητή νοημοσύνη βοηθά στην ανάγνωση και εξήγηση εγγράφων. Τα αποτελέσματα μπορεί να έχουν λάθη. Η αξιολόγηση των υποχρεώσεων κάθε συνεργάτη εξαρτάται από τον τρόπο που χρησιμοποιεί την υπηρεσία.",
                "AI helps read and explain documents. Results may contain errors. Each partner's obligations depend on how they use the service.",
            ],
        },
        {
            title: ["DORA — αξιολόγηση τεχνικού παρόχου", "DORA — assessing a technical provider"],
            body: [
                "Δείτε τους τεχνικούς παρόχους και τις πληροφορίες απορρήτου. Για πρόσθετα στοιχεία που χρειάζεται ο έλεγχός σας, επικοινωνήστε μαζί μας.",
                "Review our technical providers and privacy information. Contact us for additional information needed for your assessment.",
            ],
        },
    ]

    return (
        <LoBPageShell activeNav="none" locale={locale}>
            <section className="px-g-6 md:px-g-8">
                <div className="mx-auto max-w-[820px] text-center">
                    <h1 className="mt-g-4 text-g-display-xl font-extrabold tracking-[-0.024em] text-fg-primary text-balance">
                        {t("Εξηγήστε τις καλύψεις μέσα από τη δική σας υπηρεσία.", "Explain coverage within your own service.")}
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
                            "Δεν λαμβάνουμε προμήθεια για πωλήσεις ασφαλιστηρίων. Αυτό δεν αποκλείει λάθη στην ανάλυση: ελέγχετε πάντοτε το αποτέλεσμα με το πρωτότυπο έγγραφο.",
                            "We receive no commission on insurance sales. This does not rule out analysis errors: always check results against the original document.",
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
                        {t("Τα αρχεία αποθηκεύονται κρυπτογραφημένα στην ΕΕ. Για την ανάλυση και τη λειτουργία της υπηρεσίας χρησιμοποιούνται και πάροχοι που μπορεί να επεξεργάζονται στοιχεία εκτός ΕΕ. ",
                           "Files are stored encrypted in the EU. Analysis and service operation also use providers that may process data outside the EU. ")}
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
