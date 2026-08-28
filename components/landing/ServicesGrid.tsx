// No "use client": purely static markup, server-rendered on the landing.
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
        titleEl: "Τι δεν καλύπτεστε;",
        titleEn: "What are you not covered for?",
        // Gap detection is Plus-only — the tier is named, same rule as the
        // advisor-sharing card below.
        descEl: "Βρίσκουμε τι λείπει από την κάλυψή σας πριν το χρειαστείτε — με το πλάνο Family. Διαβάζουμε κάθε σελίδα για εσάς.",
        descEn: "We find what your cover is missing before you need it — on the Family plan. We read every page for you.",
        benefitEl: "Το μαθαίνετε σήμερα, όχι μετά",
        benefitEn: "You find out today, not later",
        wide: true,
    },
    {
        Icon: FolderOpen,
        titleEl: "Τι ακριβώς έχετε;",
        titleEn: "What exactly do you have?",
        descEl: "Όλες οι ασφάλειές σας μαζεύονται σε ένα μέρος. Αρκεί να στείλετε ένα αρχείο ή μια φωτογραφία.",
        descEn: "All your insurance ends up in one place. Just send a file or a photo.",
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
        descEl: "Σας ειδοποιούμε πριν λήξει κάτι — από το πλάνο Plus — και όταν βρούμε κάτι νέο στα έγγραφά σας, με το Family.",
        descEn: "We warn you before something runs out — from the Plus plan — and when we find something new in your documents, with Family.",
        benefitEl: "Δεν σας πιάνει ποτέ απροετοίμαστους",
        benefitEn: "It never catches you out",
        wide: false,
    },
    {
        Icon: MessageCircle,
        titleEl: "Τι σημαίνει αυτό;",
        titleEn: "What does this mean?",
        // Policy Q&A is Plus-only — same naming rule.
        descEl: "Ρωτήστε με απλά λόγια. Απαντάμε από το ίδιο σας το συμβόλαιο, όχι από γενικές πληροφορίες — με το πλάνο Family.",
        descEn: "Ask in plain words. We answer from your own policy, not from general information — on the Family plan.",
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
        descEl: "Δείξτε ό,τι θέλετε στον ασφαλιστή σας, με ένα κλικ — διαθέσιμο με το πλάνο Family.",
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
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECFDF5] dark:bg-[#29685B]/15">
                <s.Icon aria-hidden className="h-5 w-5 text-primary dark:text-[#A7F3D0]" />
            </div>
            <h3 className="mb-2 text-body-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                {t(s.titleEl, s.titleEn)}
            </h3>
            <p className="mb-5 flex-1 text-body leading-relaxed text-neutral-600 dark:text-slate-300">
                {t(s.descEl, s.descEn)}
            </p>
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary-tint dark:bg-[#29685B]/15 px-3 py-1 text-caption font-semibold text-primary dark:text-[#A7F3D0]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#29685B] dark:bg-[#A7F3D0]" />
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
