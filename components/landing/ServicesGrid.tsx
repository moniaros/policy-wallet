// No "use client": purely static markup, server-rendered on the landing.
import { BASIC_WHEN } from "@/lib/renewals/reminder-copy"
import { FolderOpen, ScanSearch, Bell, MessageCircle, Users } from "lucide-react"

interface ServicesGridProps {
    isGreek: boolean
}

/**
 * Each card answers a question a real person asks out loud, in the words they
 * would use. Titles are the question, not the feature name: "Digital Portfolio"
 * and "Policy AI Q&A" told the visitor what we built; these tell them what they
 * find out.
 *
 * Nothing here leads with the machinery. The reader is told the outcome first
 * and, at most, how it happens second — never "our AI engine extracts…" before
 * "you find out what you are missing".
 */
const services = [
    {
        Icon: ScanSearch,
        titleEl: "Τι χρειάζεται έλεγχο;",
        titleEn: "What needs checking?",
        // Gap findings are Family — the tier is named, same rule as the
        // advisor-sharing card below.
        descEl: "Με το Family, δείτε σημεία που χρειάζονται προσοχή στα έγγραφά σας. Επιβεβαιώστε τα με το ασφαλιστήριο και τον ασφαλιστή σας.",
        descEn: "With Family, see points that need attention in your documents. Confirm them against the policy and with your adviser.",
        benefitEl: "Προετοιμαστείτε για τη συζήτηση",
        benefitEn: "You find out today, not later",
        wide: true,
    },
    {
        Icon: FolderOpen,
        titleEl: "Τι ακριβώς έχετε;",
        titleEn: "What exactly do you have?",
        descEl: "Ανεβάστε τα έγγραφά σας και κρατήστε τα ασφαλιστήρια από διαφορετικές εταιρείες σε ένα μέρος.",
        descEn: "Upload your documents and keep policies from different insurers in one place.",
        benefitEl: "Τέλος τα χαρτιά στο συρτάρι",
        benefitEn: "No more papers in a drawer",
        wide: true,
    },
    {
        Icon: Bell,
        titleEl: "Πότε λήγει;",
        titleEn: "When does it run out?",
        // Only promises what the product can do from documents: expiry
        // reminders and re-analysis findings — not price-change feeds.
        descEl: `Σας ειδοποιούμε με email πριν λήξει κάτι — μία υπενθύμιση ${BASIC_WHEN.el} σε όλα τα πλάνα, περισσότερες στα Plus και Family — και όταν βρούμε κάτι νέο στα έγγραφά σας, με το Family.`,
        descEn: `We email you before something runs out — one reminder ${BASIC_WHEN.en} on every plan, more on Plus and Family — and when we find something new in your documents, with Family.`,
        benefitEl: "Έχετε τις ημερομηνίες μπροστά σας",
        benefitEn: "Keep track of the dates",
        wide: false,
    },
    {
        Icon: MessageCircle,
        titleEl: "Τι σημαίνει αυτό;",
        titleEn: "What does this mean?",
        // Policy Q&A is Family — same naming rule.
        descEl: "Με το Family, κάντε ερωτήσεις για το ασφαλιστήριό σας και δείτε απαντήσεις που βασίζονται στο έγγραφο. Ελέγξτε τις σημαντικές πληροφορίες στο πρωτότυπο.",
        descEn: "With Family, ask about your policy and see answers based on the document. Check important information in the original.",
        benefitEl: "Καταλαβαίνετε τι υπογράψατε",
        benefitEn: "You understand what you signed",
        wide: false,
    },
    {
        Icon: Users,
        titleEl: "Ποιος μπορεί να βοηθήσει;",
        titleEn: "Who can help you?",
        // Advisor sharing is a paid feature — the tier is named so the card
        // never promises on Free what only Family delivers.
        descEl: "Δείξτε ό,τι θέλετε στον ασφαλιστή σας, όποτε θέλετε — διαθέσιμο με το πλάνο Family.",
        descEn: "Show your agent whatever you choose, with one click — available on the Family plan.",
        benefitEl: "Εσείς αποφασίζετε τι βλέπει",
        benefitEn: "You decide what they see",
        wide: false,
    },
]

function ServiceCard({
    service: s,
    isGreek,
}: {
    service: (typeof services)[0]
    isGreek: boolean
}) {
    const t = (el: string, en: string) => (isGreek ? el : en)
    return (
        <div className="group flex flex-col rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A7F3D0] hover:shadow-[0_8px_24px_rgba(41,104,91,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-status-success-tint">
                <s.Icon aria-hidden className="h-5 w-5 text-primary dark:text-brand-accent" />
            </div>
            <h3 className="mb-2 text-body-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                {t(s.titleEl, s.titleEn)}
            </h3>
            <p className="mb-5 flex-1 text-body leading-relaxed text-neutral-600 dark:text-slate-300">
                {t(s.descEl, s.descEn)}
            </p>
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary-tint dark:bg-brand-green/15 px-3 py-1 text-caption font-semibold text-primary dark:text-brand-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green dark:bg-[#A7F3D0]" />
                {t(s.benefitEl, s.benefitEn)}
            </div>
        </div>
    )
}

export function ServicesGrid({ isGreek }: ServicesGridProps) {
    const wideServices = services.filter((s) => s.wide)
    const narrowServices = services.filter((s) => !s.wide)

    return (
        <div className="space-y-4">
            {/* Row 1: 2 equal wide cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {wideServices.map((s) => (
                    <ServiceCard key={s.titleEn} service={s} isGreek={isGreek} />
                ))}
            </div>
            {/* Row 2: 3 equal narrow cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {narrowServices.map((s) => (
                    <ServiceCard key={s.titleEn} service={s} isGreek={isGreek} />
                ))}
            </div>
        </div>
    )
}
