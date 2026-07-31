import Link from "next/link"
import { ShieldCheck, KeyRound, Eye, Download, Trash2, Clock, FileLock2, Brain } from "lucide-react"
import type { Language } from "@/lib/i18n"

/**
 * The public trust page.
 *
 * The product had no `/security` or `/trust` page at all: its security posture
 * was asserted only by a chip row (`TrustStrip`) that said "AES-256" with
 * nothing to link to. Meanwhile the platform genuinely does the hard parts —
 * per-policy revocable agent access, a self-service Art. 15 export, erasure, an
 * automated retention job, documents served only through an authorizing route —
 * and none of it was visible to the people it was built for.
 *
 * EVERY claim below is traceable to a shipped feature verified in the code. No
 * certifications, no aspirational language, no "bank-grade" adjectives. A trust
 * page that overstates is worse than none: it is the one page a reader will
 * check against reality.
 */

type Section = {
    icon: typeof ShieldCheck
    title: { el: string; en: string }
    body: { el: string; en: string }
}

const SECTIONS: Section[] = [
    {
        icon: KeyRound,
        title: { el: "Η πρόσβαση δίνεται από εσάς, ανά ασφαλιστήριο", en: "Access is granted by you, per policy" },
        body: {
            el: "Ο ασφαλιστής σας δεν βλέπει αυτόματα το χαρτοφυλάκιό σας. Βλέπει ένα ασφαλιστήριο μόνο αν το ανέβασε ο ίδιος για εσάς ή αν του δώσατε ρητά πρόσβαση σε αυτό. Η πρόσβαση είναι ανά ασφαλιστήριο, όχι συνολική, και ανακαλείται.",
            en: "Your agent does not automatically see your portfolio. They see a policy only if they uploaded it for you or if you explicitly granted access to that policy. Access is per policy, not blanket, and it is revocable.",
        },
    },
    {
        icon: Eye,
        title: { el: "Κάθε ενέργεια καταγράφεται", en: "Every action is recorded" },
        body: {
            el: "Οι ενέργειες στον λογαριασμό σας καταγράφονται σε αρχείο ελέγχου. Καταγράφεται το αναγνωριστικό του χρήστη, όχι το email του — αρχή ελαχιστοποίησης δεδομένων: το αρχείο ελέγχου δεν πρέπει να γίνεται δεύτερο αντίγραφο των προσωπικών σας στοιχείων.",
            en: "Actions on your account are written to an audit log. It records the user identifier, not the email address — data minimisation: an audit trail should not become a second copy of your personal details.",
        },
    },
    {
        icon: Brain,
        title: { el: "Η ανάλυση AI χρειάζεται ξεχωριστή συγκατάθεση", en: "AI analysis needs its own consent" },
        body: {
            el: "Τα ασφαλιστήρια μπορεί να περιέχουν δεδομένα υγείας. Γι' αυτό η επεξεργασία με τεχνητή νοημοσύνη απαιτεί δική της, ρητή συγκατάθεση — ξεχωριστή από τη σύνδεση με ασφαλιστή. Χωρίς αυτήν, κανένα byte του εγγράφου δεν φτάνει σε μοντέλο.",
            en: "Policies can contain health data. AI processing therefore requires its own explicit consent, separate from connecting with an agent. Without it, no byte of the document reaches a model.",
        },
    },
    {
        icon: FileLock2,
        title: { el: "Τα έγγραφά σας δεν έχουν δημόσιο σύνδεσμο", en: "Your documents have no public link" },
        body: {
            el: "Δεν εμφανίζεται πουθενά απευθείας διεύθυνση αρχείου. Κάθε λήψη περνά από έλεγχο δικαιώματος τη στιγμή του αιτήματος και οδηγεί σε σύνδεσμο περιορισμένης διάρκειας. Ένας σύνδεσμος που τυχόν διέρρευσε παύει να λειτουργεί από μόνος του.",
            en: "No direct file address is ever exposed. Every download is authorised at request time and resolves to a short-lived link, so a link that leaks stops working on its own.",
        },
    },
    {
        icon: Download,
        title: { el: "Πάρτε τα δεδομένα σας, χωρίς να ρωτήσετε κανέναν", en: "Take your data without asking anyone" },
        body: {
            el: "Μπορείτε να εξαγάγετε το σύνολο των δεδομένων που τηρούμε για εσάς μέσα από την εφαρμογή (άρθρα 15 και 20 ΓΚΠΔ). Δεν χρειάζεται email, αίτημα ή αναμονή σε ουρά υποστήριξης.",
            en: "You can export everything we hold about you from inside the app (GDPR Articles 15 and 20). No email, no request form, no support queue.",
        },
    },
    {
        icon: Trash2,
        title: { el: "Και διαγράψτε τα", en: "And delete it" },
        body: {
            el: "Η διαγραφή λογαριασμού και δεδομένων (άρθρο 17) είναι υλοποιημένη διαδικασία με καταγεγραμμένα στάδια, όχι χειροκίνητη εξυπηρέτηση. Η διαδικασία έχει δοκιμαστεί από άκρη σε άκρη με τεκμηρίωση.",
            en: "Account and data erasure (Article 17) is an implemented process with recorded stages, not a manual favour. The procedure has been drilled end to end with evidence.",
        },
    },
    {
        icon: Clock,
        title: { el: "Δεν κρατάμε δεδομένα για πάντα", en: "We do not keep data forever" },
        body: {
            el: "Η πολιτική διακράτησης εφαρμόζεται αυτοματοποιημένα, όχι όποτε θυμηθεί κάποιος. Δεδομένα που δεν χρειάζονται πλέον αφαιρούνται από προγραμματισμένη εργασία.",
            en: "The retention policy is applied automatically, not whenever someone remembers. Data that is no longer needed is removed by a scheduled job.",
        },
    },
    {
        icon: ShieldCheck,
        title: { el: "Η AI βοηθά· δεν συμβουλεύει", en: "AI assists; it does not advise" },
        body: {
            el: "Οι αναλύσεις είναι υποστηρικτική πληροφόρηση, όχι νομική ή ασφαλιστική συμβουλή — και το λέμε πάνω σε κάθε οθόνη που τις εμφανίζει, όχι μόνο εδώ. Για κρίσιμες αποφάσεις απευθυνθείτε σε αδειοδοτημένο επαγγελματία.",
            en: "Analyses are informational support, not legal or insurance advice — and we say so on every screen that shows them, not only here. For decisions that matter, consult a licensed professional.",
        },
    },
]

const COPY = {
    kicker: { el: "Εμπιστοσύνη", en: "Trust" },
    heading: { el: "Πώς προστατεύουμε τα δεδομένα σας", en: "How we protect your data" },
    lede: {
        el: "Τα ασφαλιστήριά σας περιέχουν όνομα, ΑΦΜ, διεύθυνση, πινακίδες — μερικές φορές και στοιχεία υγείας. Παρακάτω είναι τι κάνει η πλατφόρμα σήμερα. Κάθε σημείο αντιστοιχεί σε λειτουργία που υπάρχει, όχι σε πρόθεση.",
        en: "Your policies carry your name, tax number, address, plate numbers — sometimes health details. Below is what the platform does today. Every point maps to a feature that exists, not to an intention.",
    },
    subprocessorsLink: { el: "Ποιοι επεξεργάζονται δεδομένα για λογαριασμό μας", en: "Who processes data on our behalf" },
    privacyLink: { el: "Πολιτική απορρήτου", en: "Privacy Policy" },
    contactLead: {
        el: "Ερώτηση για τα δεδομένα σας ή αναφορά ζητήματος ασφάλειας;",
        en: "A question about your data, or a security issue to report?",
    },
    contactLink: { el: "Επικοινωνήστε μαζί μας", en: "Contact us" },
}

export function TrustPage({ language }: { language: Language }) {
    const lang: "el" | "en" = language === "el" ? "el" : "en"
    const prefix = lang === "en" ? "/en" : ""

    return (
        <main className="mx-auto max-w-reading px-4 py-12 sm:px-6 lg:px-8">
            <p className="pw-kicker">{COPY.kicker[lang]}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                {COPY.heading[lang]}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{COPY.lede[lang]}</p>

            <div className="mt-10 space-y-8">
                {SECTIONS.map((section) => {
                    const Icon = section.icon
                    return (
                        <section key={section.title.en} className="flex gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15">
                                <Icon className="h-5 w-5 text-primary dark:text-mint" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold">{section.title[lang]}</h2>
                                <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                                    {section.body[lang]}
                                </p>
                            </div>
                        </section>
                    )
                })}
            </div>

            <div className="mt-12 space-y-3 border-t border-border pt-8 text-base">
                <p>
                    <Link href={`${prefix}/subprocessors`} className="font-semibold text-primary underline">
                        {COPY.subprocessorsLink[lang]}
                    </Link>
                </p>
                <p>
                    <Link href={`${prefix}/privacy`} className="font-semibold text-primary underline">
                        {COPY.privacyLink[lang]}
                    </Link>
                </p>
                <p className="text-muted-foreground">
                    {COPY.contactLead[lang]}{" "}
                    <Link href={`${prefix}/contact`} className="font-semibold text-primary underline">
                        {COPY.contactLink[lang]}
                    </Link>
                </p>
            </div>
        </main>
    )
}
