import Link from "next/link"
import { LEGAL_ENTITY } from "@/lib/legal/entity-placeholders"
import { localizeHref } from "@/lib/seo/locale-links"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"

/**
 * /trust — what happens to a policy after you upload it.
 *
 * THE RULE FOR THIS FILE: every sentence here is backed by code that is true
 * today, and the citation is in the comment above it. A claim without one does
 * not ship — it goes in the audit as blocked, and the page stays quiet about it.
 * That is why there is no DPIA section (none has been carried out), no
 * certification badge, and no "bank-grade" anything.
 *
 * The wording is also deliberately narrower than a reader might expect in two
 * places — the access-control section says "application layer" rather than
 * implying the database enforces it, and the export section says what does NOT
 * come out. Both are less impressive and both are true.
 */

type Locale = "el" | "en"
const t = (locale: Locale, el: string, en: string) => (locale === "el" ? el : en)

interface Section {
    id: string
    title: { el: string; en: string }
    body: { el: string; en: string }[]
}

/**
 * Citations, kept next to the claim they license:
 *
 *  pledge        — lib/legal/legal-content.ts §3 `data_neutrality` (both locales),
 *                  a contractual term, not only marketing copy
 *  no-commission — lib/pricing/plan-defaults.ts (subscription prices only; no
 *                  commission field exists anywhere in the billing model)
 *  encryption    — lib/legal/legal-content.ts:356 / :827 (TLS in transit, at rest).
 *                  This one rests on Supabase's platform guarantee; nothing in
 *                  this repo can evidence at-rest encryption by itself.
 *  residency     — lib/legal/legal-content.ts:308 / :779, corroborated by the
 *                  actual pooler host (aws-*-eu-west-3) in DATABASE_URL
 *  no-training   — lib/legal/legal-content.ts:281 / :743 (provider API terms)
 *  ai-consent    — prisma/schema.prisma ConsentType.ai_processing. BOTH paths
 *                  that send bytes to a provider are gated:
 *                  policy-analysis-orchestrator.service.ts (deep run) AND
 *                  app/api/policies/extract/route.ts (upload-time extraction,
 *                  incl. bulk upload). The extract route was ungated until
 *                  2026-08-20 — this sentence was false for the bulk path.
 *  access        — lib/policy-access.ts (single decision function) +
 *                  tests/unit/policy-authorization-single-path.test.ts. Scope is
 *                  app/api only, matched per FILE not per handler — hence the
 *                  copy says "scans the API routes", not "any route anywhere".
 *  agent-access  — lib/agent-visibility.ts (both arms require a living
 *                  relationship; termination ends visibility)
 *  documents     — app/api/v1/policies/[id]/documents/[docId]/route.ts:21-23
 *                  (every open re-authorizes; short-lived signed URL, no caching)
 *  admin-audit   — lib/admin/admin-guard.ts `logAdminRead` (actor, subject,
 *                  field scope) + tests/unit/admin-reads-are-audited.test.ts
 *  retention     — app/api/v1/jobs/privacy-retention/route.ts:41,43 (5 years /
 *                  12 months) + tests/unit/privacy-retention-job.test.ts
 *  export        — app/api/v1/me/data-export/route.ts (immediate, self-service)
 *  deletion      — app/(protected)/admin/actions.ts executeDeletionRequest
 *                  (admin-executed; Art. 12(3) one month)
 *  rules-decide  — lib/gap-detection.ts decideGapsForPolicy (detection and
 *                  severity are rule decisions; the model explains only)
 */
const SECTIONS: Section[] = [
    {
        id: "pledge",
        title: {
            el: "Πού δεν πηγαίνουν τα δεδομένα σας",
            en: "Where your data does not go",
        },
        body: [
            {
                el: "Δεν πουλάμε, δεν μοιραζόμαστε και δεν διαβιβάζουμε δεδομένα ασφαλισμένων ή χαρτοφυλακίου σε ασφαλιστικές εταιρείες, τράπεζες ή τρίτα ασφαλιστικά πρακτορεία.",
                en: "We do not sell, share, or transfer policyholder or portfolio data to insurers, banks, or third-party agencies.",
            },
            {
                el: "Αυτό δεν είναι υπόσχεση μάρκετινγκ: είναι όρος στη σύμβασή μας μαζί σας (§3 των όρων χρήσης), οπότε δεσμευόμαστε νομικά.",
                en: "That is not a marketing promise: it is a clause in our contract with you (Terms of Service, §3), so it binds us legally.",
            },
            {
                el: "Η μόνη εξαίρεση είναι όποια δημιουργείτε εσείς. Αν συνδέσετε τον δικό σας ασφαλιστή, βλέπει ακριβώς όσα του δώσατε — και του τα αφαιρείτε όποτε θέλετε.",
                en: "The only exception is the one you create. If you connect your own advisor, they see exactly what you granted them — and you can take it back whenever you want.",
            },
            {
                el: "Δεν παίρνουμε προμήθεια από ασφαλιστικές εταιρείες. Πληρωνόμαστε μόνο από συνδρομές, άρα δεν κερδίζουμε τίποτα από το τι λέει η ανάλυσή σας.",
                en: "We take no commission from insurance companies. We are paid only by subscription, so we gain nothing from what your analysis says.",
            },
        ],
    },
    {
        id: "documents",
        title: {
            el: "Τα έγγραφά σας",
            en: "Your documents",
        },
        body: [
            {
                el: "Τα αρχεία σας κρυπτογραφούνται κατά τη μεταφορά (TLS) και κατά την αποθήκευση, και φυλάσσονται σε υποδομή στην Ευρωπαϊκή Ένωση — συγκεκριμένα στην περιοχή eu-west-3 (Παρίσι).",
                en: "Your files are encrypted in transit (TLS) and at rest, and stored on infrastructure inside the European Union — specifically the eu-west-3 region (Paris).",
            },
            {
                el: "Δεν υπάρχει δημόσιος σύνδεσμος προς ένα ασφαλιστήριο. Κάθε φορά που ανοίγει ένα έγγραφο, ελέγχεται ξανά αν επιτρέπεται και δημιουργείται σύνδεσμος που λήγει σε λίγα λεπτά.",
                en: "There is no public link to a policy document. Every time one is opened, permission is checked again and a link is created that expires within minutes.",
            },
        ],
    },
    {
        id: "ai",
        title: {
            el: "Τι κάνει η τεχνητή νοημοσύνη — και τι δεν αποφασίζει",
            en: "What the AI does — and what it does not decide",
        },
        body: [
            {
                el: "Η ανάλυση ξεκινά μόνο αφού δώσετε ρητή συγκατάθεση. Χωρίς αυτήν, το έγγραφο δεν φεύγει ποτέ προς πάροχο μοντέλου.",
                en: "Analysis starts only after you give explicit consent. Without it, the document never leaves for a model provider.",
            },
            {
                el: "Οι όροι επεξεργασίας των παρόχων AI δεν επιτρέπουν τη χρήση των δεδομένων σας για εκπαίδευση των μοντέλων τους.",
                en: "The AI providers' data-processing terms do not permit your data to be used to train their models.",
            },
            {
                el: "Η τεχνητή νοημοσύνη διαβάζει το έγγραφο και το εξηγεί. Δεν αποφασίζει αυτή ποια κενά κάλυψης έχετε: αυτό το κρίνουν κανόνες που ελέγχουν τα δεδομένα του συμβολαίου σας, και κάθε εύρημα καταγράφει ποιος κανόνας το βρήκε και τι διάβασε.",
                en: "The AI reads your document and explains it. It does not decide which coverage gaps you have: rules do that, checking the data extracted from your policy, and every finding records which rule found it and what that rule read.",
            },
        ],
    },
    {
        id: "access",
        title: {
            el: "Ποιος μπορεί να δει τι",
            en: "Who can see what",
        },
        body: [
            {
                el: "Κάθε ανάγνωση ενός συμβολαίου περνά από ένα σημείο ελέγχου στην εφαρμογή, που ρωτά το ίδιο πράγμα κάθε φορά: το κατέχετε εσείς, ή σας το έχει μοιραστεί ρητά κάποιος; Δοκιμή στο CI σαρώνει τις διαδρομές του API και αποτυγχάνει αν κάποια νέα δεν περνά από εκεί.",
                en: "Every read of a policy goes through one checkpoint in the application, which asks the same question every time: do you own it, or has someone explicitly shared it with you? A CI test scans the API routes and fails if a new one does not go through it.",
            },
            {
                el: "Η πρόσβαση ενός ασφαλιστή τελειώνει μαζί με τη σχέση σας. Αν τη διακόψετε, παύει να βλέπει και τα συμβόλαια που ανέβασε ο ίδιος για εσάς.",
                en: "An advisor's access ends with your relationship. If you end it, they stop seeing even the policies they uploaded for you themselves.",
            },
            {
                el: "Όταν διαχειριστής μας ανοίγει τον λογαριασμό σας, καταγράφεται ποιος τον άνοιξε, ποιανού λογαριασμός ήταν και ποια κατηγορία στοιχείων είδε. Τα αρχεία ενεργειών διαχειριστή κρατούνται πέντε χρόνια· τα συνηθισμένα αρχεία χρήσης διαγράφονται μετά από δώδεκα μήνες.",
                en: "When one of our administrators opens your account, we record who opened it, whose account it was, and which category of information they saw. Administrator records are kept for five years; ordinary usage logs are deleted after twelve months.",
            },
        ],
    },
    {
        id: "portability",
        title: {
            el: "Παίρνετε τα δεδομένα σας μαζί σας",
            en: "Taking your data with you",
        },
        body: [
            {
                el: "Κατεβάζετε αντίγραφο των δεδομένων σας όποτε θέλετε, μόνοι σας, χωρίς να το ζητήσετε από κανέναν. Είναι δομημένο αρχείο, όχι στιγμιότυπα οθόνης.",
                en: "You can download a copy of your data whenever you want, yourself, without asking anyone. It is a structured file, not screenshots.",
            },
            {
                el: "Λίγα στοιχεία δεν περιλαμβάνονται σε αυτό το αντίγραφο και δίνονται κατόπιν αιτήματος: στοιχεία τρόπου πληρωμής, αρχεία συνεδριών και ασφάλειας, το ιστορικό του ποιος είδε τα δεδομένα σας, μετρήσεις χρήσης, και τα ελεύθερα σημειώματα που έγραψε για εσάς ο διαμεσολαβητής σας. Η δομημένη αξιολόγησή του για εσάς περιλαμβάνεται.",
                en: "A few things are not in that copy and are provided on request: payment-method details, session and security records, the history of who viewed your data, usage metering, and the free-text notes your advisor wrote about you. Their structured assessment of you is included.",
            },
            {
                el: "Τη διαγραφή τη ζητάτε με ένα κλικ· την εκτελεί άνθρωπος και ολοκληρώνεται το αργότερο εντός ενός μήνα. Ό,τι μας υποχρεώνει ο νόμος να κρατήσουμε — για παράδειγμα τιμολόγια για πέντε χρόνια — παραμένει σε ανωνυμοποιημένη μορφή.",
                en: "Deletion you ask for with one click; a person carries it out and it completes within one month at the latest. Anything the law requires us to keep — invoices for five years, for example — remains in anonymized form.",
            },
        ],
    },
]

export function TrustSections({ locale }: { locale: Locale }) {
    const entity = LEGAL_ENTITY[locale]
    const l = (href: string) => localizeHref(href, locale)

    return (
        <div className="min-h-screen bg-white dark:bg-[#0B1220]">
            <PublicHeader locale={locale} />
            <main id="main-content">
                <section className="mx-auto max-w-form px-4 pt-16 pb-10 text-center sm:pt-24">
                    <p className="text-kicker uppercase tracking-wide text-[#29685B] dark:text-[#A7F3D0]">
                        {t(locale, "Εμπιστοσύνη", "Trust")}
                    </p>
                    <h1 className="mt-3 text-display font-semibold text-balance text-[#0F172A] dark:text-white">
                        {t(
                            locale,
                            "Τι γίνεται με το συμβόλαιό σας αφού το ανεβάσετε",
                            "What happens to your policy after you upload it"
                        )}
                    </h1>
                    <p className="mx-auto mt-5 max-w-[560px] text-body-lg leading-relaxed text-[#334155] dark:text-slate-200">
                        {t(
                            locale,
                            "Χωρίς γενικότητες. Κάθε πρόταση εδώ περιγράφει κάτι που κάνει ο κώδικας σήμερα.",
                            "No generalities. Every sentence here describes something the code does today."
                        )}
                    </p>
                </section>

                <section className="mx-auto max-w-form px-4 pb-16">
                    <div className="flex flex-col gap-10">
                        {SECTIONS.map((section) => (
                            <div key={section.id} id={section.id}>
                                <h2 className="text-h3 font-semibold text-[#0F172A] dark:text-white">
                                    {t(locale, section.title.el, section.title.en)}
                                </h2>
                                <div className="mt-3 flex flex-col gap-3">
                                    {section.body.map((paragraph) => (
                                        <p
                                            key={paragraph.en}
                                            className="text-body-lg leading-relaxed text-[#334155] dark:text-slate-200"
                                        >
                                            {t(locale, paragraph.el, paragraph.en)}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Who is accountable for all of the above — the entity, named,
                        the same values the footer and the legal documents render. */}
                    <div className="mt-12 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 dark:border-white/10 dark:bg-white/5">
                        <h2 className="text-h4 font-semibold text-[#0F172A] dark:text-white">
                            {t(locale, "Ποιος ευθύνεται", "Who is accountable")}
                        </h2>
                        <p className="mt-3 text-body leading-relaxed text-[#334155] dark:text-slate-200">
                            {t(
                                locale,
                                `Υπεύθυνος επεξεργασίας των δεδομένων σας είναι η εταιρεία ${entity.company}, ΓΕΜΗ ${entity.gemi}, ${entity.vat}, έδρα ${entity.address}.`,
                                `The controller of your data is ${entity.company}, GEMI ${entity.gemi}, ${entity.vat}, registered seat ${entity.address}.`
                            )}
                        </p>
                        <p className="mt-2 text-body leading-relaxed text-[#334155] dark:text-slate-200">
                            {t(
                                locale,
                                "Για κάθε ερώτημα σχετικά με τα δεδομένα σας: ",
                                "For any question about your data: "
                            )}
                            <a className="underline" href={`mailto:${entity.dpoEmail}`}>
                                {entity.dpoEmail}
                            </a>
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-body-sm">
                            <Link className="underline" href={l("/privacy")}>
                                {t(locale, "Πολιτική απορρήτου", "Privacy policy")}
                            </Link>
                            <Link className="underline" href={l("/terms")}>
                                {t(locale, "Όροι χρήσης", "Terms of service")}
                            </Link>
                            <Link className="underline" href={l("/subprocessors")}>
                                {t(locale, "Υπο-εκτελούντες επεξεργασίας", "Subprocessors")}
                            </Link>
                            <Link className="underline" href={l("/platform")}>
                                {t(locale, "Πώς δουλεύει η ανάλυση", "How the analysis works")}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <PublicMegaFooter locale={locale} />
        </div>
    )
}

/** Answer-engine pairs — rendered verbatim above, so markup cannot outrun the page. */
export const TRUST_FAQS: { q: { el: string; en: string }; a: { el: string; en: string } }[] = [
    { q: { el: "Μοιράζεται το PolicyWallet τα δεδομένα μου με ασφαλιστικές εταιρείες;", en: "Does PolicyWallet share my data with insurance companies?" }, a: SECTIONS[0].body[0] },
    { q: { el: "Χρησιμοποιούνται τα έγγραφά μου για εκπαίδευση μοντέλων AI;", en: "Are my documents used to train AI models?" }, a: SECTIONS[2].body[1] },
    { q: { el: "Μπορώ να πάρω τα δεδομένα μου και να τα διαγράψω;", en: "Can I take my data out and delete it?" }, a: SECTIONS[4].body[0] },
]
