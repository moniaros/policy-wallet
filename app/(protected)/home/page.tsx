import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import {
    AlertCircle,
    Car,
    CalendarClock,
    CircleHelp,
    FileText,
    HeartPulse,
    House,
    Landmark,
    PawPrint,
    Shield,
    Ship,
    Sparkles,
    Stethoscope,
    Upload,
    Users,
    Wallet,
} from "lucide-react"

function daysUntil(date: Date) {
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatCurrencyValue(amount: unknown, currency: string = "EUR") {
    if (amount == null) return null
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount)) return null

    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency || "EUR",
        maximumFractionDigits: 0,
    }).format(numericAmount)
}

function getLineOfBusinessMeta(lineOfBusiness: string) {
    const key = (lineOfBusiness || "").toLowerCase()

    if (key.includes("motor") || key.includes("auto")) return { icon: Car, label: "Motor" }
    if (key.includes("health")) return { icon: HeartPulse, label: "Health" }
    if (key.includes("home") || key.includes("property")) return { icon: House, label: "Home" }
    if (key.includes("life") || key.includes("investment")) return { icon: Landmark, label: "Life" }
    if (key.includes("pet")) return { icon: PawPrint, label: "Pet" }
    if (key.includes("doctor") || key.includes("liability")) return { icon: Stethoscope, label: "Doctor Liability" }
    if (key.includes("marine") || key.includes("yacht")) return { icon: Ship, label: "Marine" }

    return { icon: Shield, label: "Other" }
}

export default async function PolicyholderHomePage() {
    const { dbUser } = await getAuthenticatedUser()
    const roles = (dbUser.roles || "policyholder").split(",")
    const role = roles[0]

    if (role !== "policyholder") {
        if (role === "agent") redirect("/dashboard")
        if (role === "admin") redirect("/admin/dashboard")
    }

    const isGreek = (dbUser.preferredLanguage || "en") === "el"
    const t = (el: string, en: string) => fixMojibakeText(isGreek ? el : en)

    const policies = await db.policy.findMany({
        where: { ownerUserId: dbUser.id },
        include: { documents: true },
        orderBy: { endDate: "asc" },
    })

    const customerRelationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: dbUser.id,
            status: "active",
        },
        include: { agent: true },
    })

    const now = new Date()
    const activePolicies = policies.filter((policy) => policy.status === "active")
    const upcomingRenewals = policies
        .filter((policy) => policy.endDate > now)
        .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
        .slice(0, 3)

    const recentDocuments = policies
        .flatMap((policy) =>
            policy.documents.map((document) => ({
                id: document.id,
                policyId: policy.id,
                fileName: document.fileName,
                uploadedAt: document.uploadedAt,
                insurerName: policy.insurerName,
            }))
        )
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, 5)

    const hasHealthPolicy = policies.some((policy) => policy.lineOfBusiness === "health")
    const duplicatePolicyLines = new Set<string>()
    for (const policy of policies) {
        const sameLineCount = policies.filter((p) => p.lineOfBusiness === policy.lineOfBusiness).length
        if (sameLineCount > 1) duplicatePolicyLines.add(policy.lineOfBusiness)
    }

    const savingsEstimate = duplicatePolicyLines.size * 35
    const openGapCount = await db.gapInstance.count({
        where: {
            policy: { ownerUserId: dbUser.id },
            status: { in: ["open", "detected", "acknowledged"] },
        },
    })
    const healthScore = policies.length === 0 ? 0 : Math.max(0, Math.min(100, Math.round((activePolicies.length / policies.length) * 100)))

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                        {t("Αρχική", "Home")}
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900 dark:text-white">
                        {t("Πίνακας προστασίας", "Protection dashboard")}
                    </h1>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                        {t("Η συνολική εικόνα των ασφαλίσεών σου σε ένα σημείο.", "Your complete insurance overview in one place.")}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/wallet"
                        className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Ενεργά συμβόλαια", "Active policies")}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-4xl font-black text-stone-900 dark:text-white">{activePolicies.length}</p>
                            <Wallet className="h-6 w-6 text-teal-600" />
                        </div>
                    </Link>

                    <Link
                        href="/coverage-insights"
                        className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Κύκλος κάλυψης", "Coverage progress")}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                            <div className="relative h-14 w-14">
                                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                                    <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" className="stroke-stone-200 dark:stroke-stone-700" strokeWidth="3" />
                                    <path
                                        d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                                        fill="none"
                                        className="stroke-teal-600"
                                        strokeWidth="3"
                                        strokeDasharray={`${healthScore}, 100`}
                                    />
                                </svg>
                                <span className="absolute inset-0 grid place-items-center text-xs font-black text-stone-900 dark:text-white">
                                    {healthScore}%
                                </span>
                            </div>
                            <p className="text-sm text-stone-600 dark:text-stone-300">
                                {t("Άνοιγμα AI Insights", "Open AI Insights")}
                            </p>
                        </div>
                    </Link>

                    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Ανανεώσεις σύντομα", "Upcoming renewals")}
                        </p>
                        <div className="mt-3">
                            {upcomingRenewals.length === 0 ? (
                                <p className="text-sm text-stone-500">{t("Δεν υπάρχουν ανανεώσεις.", "No upcoming renewals.")}</p>
                            ) : (
                                <div className="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-1">
                                    {upcomingRenewals.map((policy) => {
                                        const { icon: PolicyIcon, label } = getLineOfBusinessMeta(policy.lineOfBusiness)
                                        const premiumLabel = formatCurrencyValue(policy.premiumAmount, policy.premiumCurrency || "EUR")

                                        return (
                                            <div
                                                key={policy.id}
                                                className="min-w-[220px] snap-start rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="inline-flex items-center gap-2">
                                                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-teal-600 dark:bg-stone-900">
                                                            <PolicyIcon className="h-4 w-4" />
                                                        </span>
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase tracking-wide text-stone-500">{label}</p>
                                                            <p className="truncate text-xs font-bold text-stone-900 dark:text-white">{policy.insurerName}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                                        {daysUntil(policy.endDate)} {t("ημ.", "days")}
                                                    </p>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between text-xs">
                                                    <p className="text-stone-600 dark:text-stone-300">
                                                        {policy.endDate.toLocaleDateString(isGreek ? "el-GR" : "en-GB")}
                                                    </p>
                                                    <p className="font-black text-stone-900 dark:text-white">
                                                        {premiumLabel || t("χωρίς premium", "premium n/a")}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/coverage-insights"
                        className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("AI Insight", "AI Insight")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <Sparkles className="mt-0.5 h-5 w-5 text-violet-600" />
                            <p className="text-sm text-stone-700 dark:text-stone-200">
                                {openGapCount > 0
                                    ? t(`Εντοπίστηκαν ${openGapCount} σημεία που αξίζουν έλεγχο.`, `${openGapCount} coverage points need review.`)
                                    : t("Η κάλυψή σου φαίνεται σταθερή σήμερα.", "Your coverage looks stable today.")}
                            </p>
                        </div>
                    </Link>

                    <Link
                        href="/wallet/add"
                        className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Γρήγορο Upload", "Quick upload")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white">
                                <Upload className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-stone-700 dark:text-stone-200">
                                {t("Πρόσθεσε νέο συμβόλαιο", "Add a new policy")}
                            </p>
                        </div>
                    </Link>

                    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Πρόσφατα έγγραφα", "Recent documents")}
                        </p>
                        <div className="mt-3">
                            {recentDocuments.length === 0 ? (
                                <p className="text-sm text-stone-500">{t("Δεν βρέθηκαν έγγραφα.", "No documents yet.")}</p>
                            ) : (
                                <div className="-mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-1">
                                    {recentDocuments.map((document) => (
                                        <Link
                                            key={document.id}
                                            href={`/wallet/${document.policyId}`}
                                            className="min-w-[220px] snap-start rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-xs font-semibold text-stone-900 dark:text-white">{document.fileName}</span>
                                                <FileText className="h-4 w-4 flex-shrink-0 text-stone-500" />
                                            </div>
                                            <p className="mt-2 truncate text-[11px] text-stone-500 dark:text-stone-300">
                                                {document.insurerName}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Link
                        href="/agent"
                        className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Κατάσταση συμβούλου", "Agent link status")}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <span
                                className={`inline-block h-2.5 w-2.5 rounded-full ${
                                    customerRelationship ? "bg-emerald-500" : "bg-stone-400"
                                }`}
                            />
                            <p className="text-sm text-stone-700 dark:text-stone-200">
                                {customerRelationship
                                    ? t(`Συνδεδεμένος: ${customerRelationship.agent.name || customerRelationship.agent.email}`, `Connected: ${customerRelationship.agent.name || customerRelationship.agent.email}`)
                                    : t("Δεν υπάρχει σύνδεση συμβούλου.", "No agent connected yet.")}
                            </p>
                        </div>
                    </Link>

                    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Υπενθύμιση check-up", "Health check-up reminder")}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                            <HeartPulse className="mt-0.5 h-5 w-5 text-rose-600" />
                            <p className="text-sm text-stone-700 dark:text-stone-200">
                                {hasHealthPolicy
                                    ? t("Το ετήσιο check-up σου είναι διαθέσιμο.", "Your annual check-up benefit is available.")
                                    : t("Πρόσθεσε health policy για προληπτικές υπενθυμίσεις.", "Add a health policy to unlock preventive reminders.")}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/coverage-insights"
                        className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">
                            {t("Ευκαιρίες εξοικονόμησης", "Savings opportunities")}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-stone-700 dark:text-stone-200">
                                {savingsEstimate > 0
                                    ? t(`Πιθανή εξοικονόμηση €${savingsEstimate}/έτος`, `Potential savings €${savingsEstimate}/year`)
                                    : t("Δεν υπάρχουν άμεσες ευκαιρίες σήμερα.", "No immediate savings opportunities today.")}
                            </p>
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                €
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="mt-4">
                    <Link
                        href="/help"
                        className="flex items-center justify-between rounded-3xl border border-stone-200 bg-white px-6 py-4 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                    >
                        <div className="flex items-center gap-3">
                            <CircleHelp className="h-5 w-5 text-stone-600" />
                            <p className="text-sm font-semibold text-stone-900 dark:text-white">
                                {t("Βοήθεια και υποστήριξη", "Help and support")}
                            </p>
                        </div>
                        <p className="text-xs text-stone-500">
                            {t("Άνοιγμα Help Center", "Open Help Center")}
                        </p>
                    </Link>
                </div>
            </div>

            <Link
                href="/wallet/add"
                className="fixed bottom-24 left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-2xl bg-teal-600 text-white shadow-xl transition hover:bg-teal-500 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
                aria-label={t("Γρήγορο upload", "Quick upload")}
            >
                <Upload className="h-6 w-6" />
            </Link>

            {!customerRelationship && (
                <div className="fixed bottom-24 left-6 hidden items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 shadow-md lg:flex">
                    <AlertCircle className="h-4 w-4" />
                    {t("Συνδέσου με σύμβουλο για ταχύτερη υποστήριξη.", "Connect with an agent for faster support.")}
                    <Link href="/agent" className="underline">
                        {t("Σύνδεση", "Connect")}
                    </Link>
                </div>
            )}

            <div className="fixed bottom-6 left-6 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-md lg:flex dark:bg-stone-900 dark:text-stone-100">
                <CalendarClock className="h-4 w-4 text-teal-600" />
                {t("Προτεραιότητα: επόμενη ανανέωση", "Priority: next renewal")}
            </div>

            <div className="fixed bottom-6 right-24 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-md lg:flex dark:bg-stone-900 dark:text-stone-100">
                <Users className="h-4 w-4 text-teal-600" />
                {t("My Agent και οικογένεια από Settings", "My Agent and family controls in Settings")}
            </div>
        </div>
    )
}


