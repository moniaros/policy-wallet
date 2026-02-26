"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
    ArrowRight,
    Car,
    Home,
    Heart,
    ShieldCheck,
    Users,
    TrendingUp,
    PawPrint,
    Upload,
    Sparkles,
    Bell,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { LoBPageShell } from "@/components/landing/LoBPageShell"

// ─── DATA ────────────────────────────────────────────────────────────────────
const LOBs = [
    {
        id: "motor",
        href: "/product/motor",
        icon: Car,
        labelEl: "Αυτοκίνητο",
        labelEn: "Motor",
        tagEl: "Οχήματα",
        tagEn: "Vehicles",
        headlineEl: "Έλεγχος αγοραίας αξίας και κενών οδικής βοήθειας.",
        headlineEn: "Real-time market value tracking and roadside gap detection.",
        descEl: "Παρακολουθήστε αν η ασφαλιστική αποζημίωση ακολουθεί την αξία του οχήματός σας και εντοπίστε κενά πριν τα χρειαστείτε.",
        descEn: "Know exactly if your payout keeps pace with your car's real value—and catch dangerous roadside gaps before a breakdown.",
        surface: "bg-[#D7E4ED]",
        border: "border-[#C1D5E0]",
        tagBg: "bg-[#C1D5E0] text-[#1A3A4A]",
    },
    {
        id: "property",
        href: "/product/property",
        icon: Home,
        labelEl: "Ακίνητο",
        labelEn: "Property",
        tagEl: "Περιουσία",
        tagEn: "Real estate",
        headlineEl: "Rebuild Cost Guard και ΕΝΦΙΑ compliance σε δευτερόλεπτα.",
        headlineEn: "Rebuild Cost Guard and ENFIA tax compliance in seconds.",
        descEl: "Εντοπίστε υπο-ασφάλιση ακκινήτου πριν καταστροφή σβήσει την αξία που χτίσατε χρόνια.",
        descEn: "Catch under-coverage before a disaster erases the equity you spent years building.",
        surface: "bg-[#DCEBDA]",
        border: "border-[#C3D9C1]",
        tagBg: "bg-[#C3D9C1] text-[#1A3A1A]",
    },
    {
        id: "health",
        href: "/product/health",
        icon: Heart,
        labelEl: "Υγεία",
        labelEn: "Health",
        tagEl: "Ζωή & Υγεία",
        tagEn: "Life & Health",
        headlineEl: "Out-of-Pocket αποτύπωση και direct-billing κατευθύνσεις.",
        headlineEn: "Out-of-pocket caps and direct-billing hospital linkups.",
        descEl: "Ξέρτε πόσο θα πληρώσετε πριν μπείτε σε νοσοκομείο—όχι αφού λάβετε τον λογαριασμό.",
        descEn: "Know your maximum exposure before you walk into a hospital—not after the bill arrives.",
        surface: "bg-[#EBE5D9]",
        border: "border-[#D9CFC3]",
        tagBg: "bg-[#D9CFC3] text-[#3A2A1A]",
    },
    {
        id: "cyber",
        href: "/product/cyber",
        icon: ShieldCheck,
        labelEl: "Κυβερνοασφάλεια",
        labelEn: "Cyber",
        tagEl: "Ψηφιακή Ασφάλεια",
        tagEn: "Digital security",
        headlineEl: "Ransomware κάλυψη και Business Interruption ανάλυση.",
        headlineEn: "Ransomware coverage verified, Business Interruption tracked.",
        descEl: "Η ομάδα αντιμετώπισης περιστατικών είναι πάντα ένα tap μακριά. Χωρίς αναζήτηση σε λήξαντα έγγραφα.",
        descEn: "Your incident response team, one tap away. No more hunting through expired PDFs during a breach.",
        surface: "bg-[#E8E4F0]",
        border: "border-[#D0CBDF]",
        tagBg: "bg-[#D0CBDF] text-[#2A1A3A]",
    },
    {
        id: "group-health",
        href: "/product/group-health",
        icon: Users,
        labelEl: "Ομαδική Υγεία",
        labelEn: "Group Health",
        tagEl: "Εταιρικό",
        tagEn: "Corporate",
        headlineEl: "Συντονισμός εταιρικών παροχών με ατομική κάλυψη.",
        headlineEn: "Coordinate corporate benefits with personal coverage.",
        descEl: "Σταματήστε να πληρώνετε δύο φορές για το ίδιο πράγμα. Χαρτογραφήστε τα κενά ανάμεσα σε εταιρικό και ατομικό.",
        descEn: "Stop double-paying for overlapping benefits. Map blind spots between your employer plan and personal policy.",
        surface: "bg-[#F2E3DF]",
        border: "border-[#E2C9C3]",
        tagBg: "bg-[#E2C9C3] text-[#3A1A1A]",
    },
    {
        id: "group-pension",
        href: "/product/group-pension",
        icon: TrendingUp,
        labelEl: "Ομαδική Σύνταξη",
        labelEn: "Group Pension",
        tagEl: "Συνταξιοδότηση",
        tagEn: "Retirement",
        headlineEl: "Φορολογικές εκπτώσεις και προβολές αποταμίευσης.",
        headlineEn: "Tax deductions and fund performance projections.",
        descEl: "Ξέρτε πότε να αποχωρήσετε, πόσα έχετε συγκεντρώσει και τι φορολογικές εκπτώσεις σας ανήκουν.",
        descEn: "Know when to retire, how much you've vested, and exactly what tax deductions you're entitled to.",
        surface: "bg-[#E7EDD7]",
        border: "border-[#D0DAB9]",
        tagBg: "bg-[#D0DAB9] text-[#2A3A1A]",
    },
    {
        id: "pet",
        href: "/product/pet",
        icon: PawPrint,
        labelEl: "Κατοικίδια",
        labelEn: "Pet",
        tagEl: "Ζώα Συντροφιάς",
        tagEn: "Companion animals",
        headlineEl: "Έλεγχος Leishmania και εξαιρούμενων προϋπάρχουσων παθήσεων.",
        headlineEn: "Leishmania verification and pre-existing condition exclusion audit.",
        descEl: "Ξέρτε ακριβώς τι καλύπτεται—και τι δεν καλύπτεται—πριν ο κτηνίατρος σας δώσει τον λογαριασμό.",
        descEn: "Know exactly what's covered—and what isn't—before the vet hands you the bill.",
        surface: "bg-[#D7E4ED]",
        border: "border-[#C1D5E0]",
        tagBg: "bg-[#C1D5E0] text-[#1A3A4A]",
    },
]

const STEPS = [
    {
        n: "01",
        icon: Upload,
        titleEl: "Ανεβάστε τα ασφαλιστήριά σας",
        titleEn: "Upload your policies",
        descEl: "Φωτογράψτε ή μεταφορτώστε οποιοδήποτε PDF. Η AI μας εξάγει αυτόματα όλους τους βασικούς όρους.",
        descEn: "Snap a photo or upload any PDF. Our AI automatically extracts every key term for you.",
    },
    {
        n: "02",
        icon: Sparkles,
        titleEl: "Αφήστε την AI να εργαστεί",
        titleEn: "Let the AI work",
        descEl: "Ανάλυση κενών, σύγκριση καλύψεων, επισήμανση κινδύνων—σε δευτερόλεπτα, σε γλώσσα που καταλαβαίνετε.",
        descEn: "Gap analysis, coverage comparison, risk flagging—in seconds, in plain language you actually understand.",
    },
    {
        n: "03",
        icon: Bell,
        titleEl: "Μείνετε ένα βήμα μπροστά",
        titleEn: "Stay one step ahead",
        descEl: "Λαμβάνετε έξυπνες υπενθυμίσεις ανανέωσης, ειδοποιήσεις αλλαγής τιμών και νέες συστάσεις κάλυψης.",
        descEn: "Receive smart renewal reminders, price-change alerts, and new coverage recommendations.",
    },
]

const STATS = [
    { valueEl: "7 κατηγορίες", valueEn: "7 categories", labelEl: "ασφάλισης σε μία πλατφόρμα", labelEn: "of insurance in one place" },
    { valueEl: "< 30''", valueEn: "< 30s", labelEl: "για ανάλυση κάθε πολίτικας", labelEn: "to analyze any policy" },
    { valueEl: "100%", valueEn: "100%", labelEl: "δεδομένα υπό τον έλεγχό σας", labelEn: "of your data under your control" },
]

const FAQS = [
    {
        qEl: "Πού αποθηκεύονται τα έγγραφά μου;",
        qEn: "Where are my documents stored?",
        aEl: "Τα έγγραφά σας αποθηκεύονται σε κρυπτογραφημένα, ευρωπαϊκά servers. Δεν τα μοιραζόμαστε ποτέ χωρίς τη ρητή σας συγκατάθεση.",
        aEn: "Your documents are stored on encrypted, EU-based servers. We never share them without your explicit consent.",
    },
    {
        qEl: "Λειτουργεί με όλες τις ασφαλιστικές εταιρείες;",
        qEn: "Does it work with all insurance companies?",
        aEl: "Ναι. Εφόσον έχετε το ασφαλιστήριο σε PDF, η AI μας μπορεί να το αναλύσει—ανεξάρτητα από ασφαλιστή ή μεσίτη.",
        aEn: "Yes. As long as you have the policy PDF, our AI can analyze it—regardless of insurer or broker.",
    },
    {
        qEl: "Υπάρχει δωρεάν πρόβαση;",
        qEn: "Is there a free tier?",
        aEl: "Ναι, μπορείτε να ξεκινήσετε δωρεάν. Ανεβάστε μέχρι 2 ασφαλιστήρια και δοκιμάστε την AI ανάλυση χωρίς πιστωτική κάρτα.",
        aEn: "Yes, you can start for free. Upload up to 2 policies and try the AI analysis without a credit card.",
    },
]

// ─── FAQ ITEM COMPONENT ──────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className={`border-b border-[#E5E7EB] transition-colors duration-150 ${open ? "bg-white" : ""}`}>
            <button
                className="w-full flex items-center justify-between py-5 px-1 text-left cursor-pointer group"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
            >
                <span className="text-[17px] font-medium text-[#0F172A] group-hover:text-[#29685B] transition-colors duration-150">
                    {q}
                </span>
                {open
                    ? <ChevronUp className="w-5 h-5 text-[#29685B] flex-shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-[#64748B] flex-shrink-0 group-hover:text-[#29685B] transition-colors duration-150" />
                }
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-[300px] pb-5" : "max-h-0"}`}>
                <p className="text-[16px] leading-relaxed text-[#475569] px-1">{a}</p>
            </div>
        </div>
    )
}

// ─── COUNTER HOOK ────────────────────────────────────────────────────────────
function useCountUp(target: string, isVisible: boolean): string {
    const [count, setCount] = useState("0")
    useEffect(() => {
        if (!isVisible) return
        const num = parseFloat(target.replace(/[^0-9.]/g, ""))
        if (isNaN(num)) { setCount(target); return }
        const step = num / 40
        let current = 0
        const timer = setInterval(() => {
            current = Math.min(current + step, num)
            const formatted = target.replace(/[0-9.]+/, Math.round(current).toString())
            setCount(formatted)
            if (current >= num) clearInterval(timer)
        }, 30)
        return () => clearInterval(timer)
    }, [isVisible, target])
    return count
}

// ─── STAT ITEM ───────────────────────────────────────────────────────────────
function StatItem({ value, label, visible }: { value: string; label: string; visible: boolean }) {
    const animated = useCountUp(value, visible)
    return (
        <div className="text-center">
            <div className="text-[42px] lg:text-[52px] font-medium tracking-tight text-[#0F172A] leading-none mb-2">
                {animated}
            </div>
            <div className="text-[15px] text-[#475569] leading-snug max-w-[180px] mx-auto">{label}</div>
        </div>
    )
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function ProductPage() {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const statsRef = useRef<HTMLDivElement>(null)
    const [statsVisible, setStatsVisible] = useState(false)

    useEffect(() => {
        trackLandingEvent("page_view_product", { locale: language as any })
    }, [language])

    useEffect(() => {
        const el = statsRef.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect() } },
            { threshold: 0.3 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <LoBPageShell activeNav="product">

            {/* ─── HERO ─── */}
            <section className="px-6 md:px-12 text-center">
                <div className="mx-auto max-w-[860px]">
                    <div className="inline-flex items-center gap-2 bg-[#DCEBDA] text-[#1A4A1A] px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-wide uppercase mb-8 select-none">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        {t("Διαθέσιμο τώρα", "Available now")}
                    </div>

                    <h1 className="text-[48px] md:text-[68px] lg:text-[78px] leading-[1.02] tracking-[-0.045em] font-medium text-[#0F172A] mb-6">
                        {t(
                            "Όλες οι ασφαλίσεις σας. Ένα έξυπνο πορτοφόλι.",
                            "All your insurance. One intelligent wallet."
                        )}
                    </h1>

                    <p className="text-[19px] md:text-[23px] leading-[1.55] text-[#475569] mb-10 max-w-[640px] mx-auto">
                        {t(
                            "Μεγιστοποιήστε τα ασφαλιστικά σας οφέλη με έξυπνες αναλύσεις, εντοπισμό κενών και υπενθυμίσεις πρόληψης—όλα σε ένα μέρος.",
                            "Maximize your insurance benefits with intelligent insights, gap detection, and preventive care reminders—all in one place."
                        )}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/auth/signup"
                            className="w-full sm:w-auto rounded-[4px] bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors duration-150 hover:bg-[#1C4E44] inline-flex items-center justify-center gap-2"
                        >
                            {t("Ξεκινήστε δωρεάν", "Get started free")}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="w-full sm:w-auto rounded-[4px] border border-[#E2E8F0] bg-white px-8 py-3.5 text-[16px] font-medium text-[#0F172A] transition-colors duration-150 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] inline-flex items-center justify-center"
                        >
                            {t("Πώς λειτουργεί", "See how it works")}
                        </Link>
                    </div>
                </div>
            </section>



            {/* ─── PLATFORM CAPABILITIES (Arc-style intro copy) ─── */}
            <section className="px-6 md:px-12 py-20 mx-auto max-w-[1240px]">
                <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
                    <div>
                        <p className="text-[13px] font-semibold text-[#29685B] uppercase tracking-widest mb-4">{t("Το Πορτοφόλι σας", "Your wallet")}</p>
                        <h2 className="text-[36px] lg:text-[44px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0F172A] mb-6">
                            {t(
                                "Τα απαραίτητα για να διαχειρίζεστε τις ασφαλίσεις σας αβίαστα.",
                                "The essentials to manage your insurance effortlessly."
                            )}
                        </h2>
                        <p className="text-[18px] text-[#475569] leading-relaxed mb-8">
                            {t(
                                "Αποκτήστε εξατομικευμένες συστάσεις για να βελτιστοποιήσετε τις καλύψεις σας, να κλείσετε κενά και να εξοικονομήσετε χρήματα.",
                                "Get personalized recommendations to optimize your coverage, close dangerous gaps, and save money on premiums."
                            )}
                        </p>
                        <ul className="space-y-3">
                            {[
                                [t("Ανάλυση εγγράφων σε δευτερόλεπτα", "Document analysis in seconds")],
                                [t("Εντοπισμός κενών και επικαλύψεων", "Gap and overlap detection")],
                                [t("Υπενθυμίσεις ανανέωσης και ειδοποιήσεις", "Renewal reminders and alerts")],
                                [t("Κοινοποίηση με ασφαλιστές και μεσίτες", "Sharing with insurers and brokers")],
                            ].map(([item], i) => (
                                <li key={i} className="flex items-start gap-3 text-[16px] text-[#0F172A]">
                                    <CheckCircle2 className="w-5 h-5 text-[#29685B] flex-shrink-0 mt-0.5" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Fake dashboard card */}
                    <div className="relative">
                        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-[0_24px_48px_rgba(0,0,0,0.08)] p-6 lg:p-8">
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#F0F0F0]">
                                <div>
                                    <p className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mb-1">{t("Πύλη Ασφάλισης", "Insurance Hub")}</p>
                                    <p className="text-[18px] font-semibold text-[#0F172A]">{t("Γεια σου, Νίκο 👋", "Welcome back, Nick")}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#29685B] flex items-center justify-center text-white font-bold text-[14px]">N</div>
                            </div>

                            {/* Policy rows */}
                            <div className="space-y-3 mb-6">
                                {[
                                    { icon: Car, nameEl: "Ασφάλεια Αυτοκινήτου", nameEn: "Motor Insurance", status: "ok", expEl: "Λήγει 15 Ιουν", expEn: "Expires Jun 15" },
                                    { icon: Home, nameEl: "Ασφάλεια Κατοικίας", nameEn: "Home Insurance", status: "warn", expEl: "Λήγει 3 Μαρ", expEn: "Expires Mar 3" },
                                    { icon: Heart, nameEl: "Ατομική Υγεία", nameEn: "Health Plan", status: "ok", expEl: "Λήγει 1 Ιαν", expEn: "Expires Jan 1" },
                                ].map(({ icon: Icon, nameEl, nameEn, status, expEl, expEn }) => (
                                    <div key={nameEn} className={`flex items-center gap-3 p-3.5 rounded-[12px] border ${status === "warn" ? "bg-amber-50 border-amber-100" : "bg-[#F8FAFC] border-transparent"}`}>
                                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${status === "warn" ? "bg-amber-100" : "bg-[#DCEBDA]"}`}>
                                            <Icon className={`w-4.5 h-4.5 ${status === "warn" ? "text-amber-600" : "text-[#29685B]"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-medium text-[#0F172A] truncate">{t(nameEl, nameEn)}</p>
                                            <p className={`text-[12px] ${status === "warn" ? "text-amber-600" : "text-[#64748B]"}`}>{t(expEl, expEn)}</p>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "ok" ? "bg-[#29685B]" : "bg-amber-400"}`} />
                                    </div>
                                ))}
                            </div>

                            {/* AI Insight pill */}
                            <div className="bg-[#29685B] text-white px-4 py-3.5 rounded-[12px] text-[13px] leading-snug">
                                <p className="font-bold mb-0.5 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> {t("AI Σύσταση", "AI Recommendation")}</p>
                                <p className="text-white/80">{t("Η κατοικία σας υπο-ασφαλίζεται κατά 12%. Ανεβάστε τιμή rebuild cost.", "Your home is under-insured by 12%. Update your rebuild cost coverage.")}</p>
                            </div>
                        </div>

                        {/* Floating badge */}
                        <div className="absolute -top-4 -right-4 bg-[#29685B] text-white text-[12px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                            AI Powered
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── PRODUCT LoB GRID ─── */}
            <section className="bg-[#F8FAFC] py-24 px-6 md:px-12">
                <div className="mx-auto max-w-[1240px]">
                    {/* Section header */}
                    <div className="mb-14">
                        <p className="text-[13px] font-semibold text-[#29685B] uppercase tracking-widest mb-3">{t("Κατηγορίες", "Categories")}</p>
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <h2 className="text-[36px] lg:text-[44px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0F172A] max-w-[500px]">
                                {t("Κάθε ασφάλεια που χρειάζεστε, αναλυμένη για εσάς.", "Every policy you need, analyzed for you.")}
                            </h2>
                            <Link href="/auth/signup" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#29685B] hover:text-[#1C4E44] transition-colors duration-150 cursor-pointer self-start md:self-auto flex-shrink-0">
                                {t("Δείτε όλα", "Explore all")} <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Card grid — 3 cols on lg, 2 on md, 1 on sm */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {LOBs.map((lob) => {
                            const Icon = lob.icon
                            return (
                                <Link
                                    key={lob.id}
                                    href={lob.href}
                                    className={`group flex flex-col rounded-[20px] p-8 border ${lob.surface} ${lob.border} cursor-pointer transition-all duration-200 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5`}
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-11 h-11 bg-white/80 backdrop-blur-sm rounded-[12px] shadow-sm flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-[#0F172A]" />
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${lob.tagBg}`}>
                                            {t(lob.tagEl, lob.tagEn)}
                                        </span>
                                    </div>

                                    <h3 className="text-[22px] font-medium tracking-tight text-[#0F172A] mb-3 leading-[1.2]">
                                        {t(lob.labelEl, lob.labelEn)}
                                    </h3>
                                    <p className="text-[14px] font-semibold text-[#0F172A] leading-snug mb-3">
                                        {t(lob.headlineEl, lob.headlineEn)}
                                    </p>
                                    <p className="text-[14px] text-[#475569] leading-relaxed mb-6 flex-1">
                                        {t(lob.descEl, lob.descEn)}
                                    </p>

                                    <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#0F172A] group-hover:gap-2.5 transition-all duration-150">
                                        {t("Μάθετε περισσότερα", "Learn more")}
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section id="how-it-works" className="py-24 px-6 md:px-12 mx-auto max-w-[1240px]">
                <div className="text-center mb-16">
                    <p className="text-[13px] font-semibold text-[#29685B] uppercase tracking-widest mb-3">{t("Η Διαδικασία", "The process")}</p>
                    <h2 className="text-[36px] lg:text-[44px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0F172A] max-w-[560px] mx-auto">
                        {t("Τρία βήματα για τον πλήρη έλεγχο των ασφαλίσεών σας.", "Three steps to full control of your insurance.")}
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                    {STEPS.map((step) => {
                        const Icon = step.icon
                        return (
                            <div key={step.n} className="relative flex flex-col">
                                {/* Step number */}
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-[11px] font-bold text-[#29685B] bg-[#DCEBDA] px-2.5 py-1 rounded-full tracking-widest">{step.n}</span>
                                    <div className="h-px flex-1 bg-[#E5E7EB]" />
                                </div>
                                <div className="w-12 h-12 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[14px] flex items-center justify-center mb-5 shadow-sm">
                                    <Icon className="w-5 h-5 text-[#29685B]" />
                                </div>
                                <h3 className="text-[20px] font-semibold text-[#0F172A] mb-3 tracking-tight leading-snug">
                                    {t(step.titleEl, step.titleEn)}
                                </h3>
                                <p className="text-[15px] text-[#475569] leading-relaxed">
                                    {t(step.descEl, step.descEn)}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ─── TESTIMONIAL ─── */}
            <section className="bg-[#F8FAFC] py-24 px-6 md:px-12">
                <div className="mx-auto max-w-[780px] text-center">
                    <div className="flex items-center justify-center gap-1 mb-8">
                        {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-5 h-5 text-[#29685B] fill-[#29685B]" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                        ))}
                    </div>
                    <blockquote className="text-[22px] md:text-[28px] font-medium tracking-[-0.02em] leading-[1.4] text-[#0F172A] mb-8">
                        {t(
                            "«Ανακάλυψα ότι το σπίτι μου ήταν ανασφάλιστο κατά €40.000 σε rebuild cost. Η πλατφόρμα το εντόπισε σε 2 λεπτά.»",
                            '"I discovered my home was under-insured by €40,000 in rebuild cost. The platform caught it in 2 minutes."'
                        )}
                    </blockquote>
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#29685B] flex items-center justify-center text-white font-bold text-[14px]">Μ</div>
                        <div className="text-left">
                            <p className="text-[15px] font-semibold text-[#0F172A]">{t("Μαρία Π.", "Maria P.")}</p>
                            <p className="text-[13px] text-[#64748B]">{t("Ιδιοκτήτρια κατοικίας, Αθήνα", "Homeowner, Athens")}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section className="py-24 px-6 md:px-12 mx-auto max-w-[860px]">
                <div className="text-center mb-12">
                    <p className="text-[13px] font-semibold text-[#29685B] uppercase tracking-widest mb-3">{t("Ερωτήσεις", "FAQs")}</p>
                    <h2 className="text-[32px] lg:text-[40px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0F172A]">
                        {t("Συχνές ερωτήσεις", "Frequently asked questions")}
                    </h2>
                </div>

                <div className="border-t border-[#E5E7EB]">
                    {FAQS.map((faq, i) => (
                        <FAQItem
                            key={i}
                            q={t(faq.qEl, faq.qEn)}
                            a={t(faq.aEl, faq.aEn)}
                        />
                    ))}
                </div>
            </section>

            {/* ─── BOTTOM CTA ─── */}
            <section className="bg-[#1A2420] text-white py-28 px-6 md:px-12">
                <div className="mx-auto max-w-[860px] text-center">
                    <h2 className="text-[36px] md:text-[52px] lg:text-[60px] font-medium tracking-[-0.04em] leading-[1.05] text-white mb-6">
                        {t(
                            "Αποκτήστε πρόσβαση στο PolicyWallet για ιδιώτες, ομάδες και επαγγελματίες.",
                            "Get access to the PolicyWallet platform for individuals, teams, and professionals."
                        )}
                    </h2>
                    <p className="text-[18px] text-white/60 mb-10 max-w-[540px] mx-auto leading-relaxed">
                        {t(
                            "Ξεκινήστε δωρεάν. Χωρίς πιστωτική κάρτα.",
                            "Start for free. No credit card required."
                        )}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/auth/signup"
                            className="w-full sm:w-auto rounded-[4px] bg-[#89D9B2] px-8 py-4 text-[16px] font-bold text-[#0F172A] transition-opacity duration-150 hover:opacity-90 inline-flex items-center justify-center gap-2"
                        >
                            {t("Ξεκινήστε δωρεάν", "Get started free")}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/pricing"
                            className="w-full sm:w-auto rounded-[4px] border border-white/20 bg-white/5 px-8 py-4 text-[16px] font-medium text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white inline-flex items-center justify-center"
                        >
                            {t("Δείτε τις τιμές", "View pricing")}
                        </Link>
                    </div>
                </div>
            </section>

        </LoBPageShell>
    )
}
