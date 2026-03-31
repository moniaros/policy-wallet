"use client"

import { FolderOpen, ScanSearch, Bell, MessageCircle, Users } from "lucide-react"

interface ServicesGridProps {
    isGreek: boolean
}

const services = [
    {
        Icon: FolderOpen,
        titleEl: "Ψηφιακό Χαρτοφυλάκιο",
        titleEn: "Digital Portfolio",
        descEl: "Ανεβάστε PDF ή φωτογραφία. Η AI εξάγει αυτόματα τα δεδομένα σε δευτερόλεπτα — από οποιαδήποτε εταιρεία.",
        descEn: "Upload a PDF or photo. AI automatically extracts the data in seconds — from any insurer.",
        benefitEl: "Τέλος στους φακέλους",
        benefitEn: "No more paper folders",
        wide: true,
    },
    {
        Icon: ScanSearch,
        titleEl: "Ανάλυση Κενών AI",
        titleEn: "AI Gap Analysis",
        descEl: "Σύγκριση καλύψεων βάσει του προφίλ σας. Εντοπίζει τι λείπει πριν το χρειαστείτε.",
        descEn: "Coverage comparison based on your profile. Finds what is missing before you need it.",
        benefitEl: "Μαθαίνετε τι δεν καλύπτεστε",
        benefitEn: "Know your blind spots early",
        wide: true,
    },
    {
        Icon: Bell,
        titleEl: "Έξυπνες Ειδοποιήσεις",
        titleEn: "Smart Alerts",
        descEl: "Αυτόματες υπενθυμίσεις για λήξεις, αλλαγές τιμών και νέες παροχές.",
        descEn: "Automatic reminders for renewals, price changes and new benefits.",
        benefitEl: "Δεν χάνετε ποτέ ανανέωση",
        benefitEn: "Never miss a renewal",
        wide: false,
    },
    {
        Icon: MessageCircle,
        titleEl: "AI Q&A Συμβολαίου",
        titleEn: "Policy AI Q&A",
        descEl: "Ρωτήστε με απλά λόγια. Η AI απαντά άμεσα από το ίδιο το κείμενο του συμβολαίου σας.",
        descEn: "Ask in plain language. AI answers instantly from your actual policy text.",
        benefitEl: "Καταλαβαίνετε τι υπογράψατε",
        benefitEn: "Understand what you signed",
        wide: false,
    },
    {
        Icon: Users,
        titleEl: "Σύνδεση Πράκτορα",
        titleEn: "Agent Connect",
        descEl: "Κοινοποίηση συμβολαίων, μηνύματα και προτάσεις με τον σύμβουλό σας — στο ίδιο μέρος.",
        descEn: "Share policies, messages, and proposals with your advisor — all in one place.",
        benefitEl: "Λιγότερα τηλέφωνα",
        benefitEn: "Less back-and-forth",
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
        <div className="group flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A7F3D0] hover:shadow-[0_8px_24px_rgba(41,104,91,0.08)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECFDF5]">
                <s.Icon className="h-5 w-5 text-[#29685B]" />
            </div>
            <h3 className="mb-2 text-[16px] font-semibold tracking-tight text-[#0F172A]">
                {t(s.titleEl, s.titleEn)}
            </h3>
            <p className="mb-5 flex-1 text-[14px] leading-relaxed text-[#475569]">
                {t(s.descEl, s.descEn)}
            </p>
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#F0FDF4] px-3 py-1 text-[12px] font-semibold text-[#29685B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#29685B]" />
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
