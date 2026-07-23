"use client"

import { useState } from "react"
import { Shield, Building, CreditCard, Save, CheckCircle, AlertCircle, ArrowUpRight, Percent } from "lucide-react"
import Link from "next/link"
import { updateAgentProfile } from "../actions"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"

const LOB_OPTIONS = [
    { key: "motor", en: "Motor", el: "Αυτοκίνητο" },
    { key: "home", en: "Home", el: "Κατοικία" },
    { key: "health", en: "Health", el: "Υγεία" },
    { key: "life", en: "Life", el: "Ζωή" },
    { key: "travel", en: "Travel", el: "Ταξίδι" },
    { key: "pet", en: "Pet", el: "Κατοικίδιο" },
    { key: "liability", en: "Liability", el: "Αστική Ευθύνη" },
    { key: "legal_expenses", en: "Legal Expenses", el: "Νομική Προστασία" },
] as const

const SETTINGS_COPY = {
    commissionRatesTitle: { el: "Ποσοστά Προμήθειας", en: "Commission Rates" },
    saveCommissions: { el: "Αποθήκευση Προμηθειών", en: "Save Commission Rates" },
    subscription: { el: "Συνδρομή", en: "Subscription" },
    customers: { el: "Πελάτες", en: "Customers" },
    aiAnalysesPerMo: { el: "AI Αναλύσεις/μήνα", en: "AI Analyses/mo" },
    upgradePlan: { el: "Αναβάθμιση πλάνου", en: "Upgrade plan" },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

interface Props {
    initialAgencyName?: string | null
    initialLicenseNumber?: string | null
    initialCommissionRates?: Record<string, number>
    verificationStatus?: string
    subscription?: {
        tier: string
        isPaid: boolean
        maxCustomers: number | null
        currentCustomers: number
        aiAnalysesPerMonth: number | null
    }
}

export function AgentSettingsClient({ initialAgencyName, initialLicenseNumber, initialCommissionRates, verificationStatus, subscription }: Props) {
    const [agencyName, setAgencyName] = useState(initialAgencyName || "")
    const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber || "")
    const [commissionRates, setCommissionRates] = useState<Record<string, number>>(initialCommissionRates || {})
    const [isSaving, setIsSaving] = useState(false)
    const { language } = useLanguage()
    const roleCopy = getRoleCopy(language)

    const handleCommissionChange = (lob: string, value: string) => {
        const num = parseFloat(value)
        if (value === "" || isNaN(num)) {
            const next = { ...commissionRates }
            delete next[lob]
            setCommissionRates(next)
        } else {
            setCommissionRates({ ...commissionRates, [lob]: Math.min(Math.max(num, 0), 100) })
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        const result = await updateAgentProfile({ agencyName, licenseNumber, commissionRates })
        setIsSaving(false)

        if (result.success) {
            toast.success(roleCopy.agentSettings.updatedSuccess)
        } else {
            toast.error(result.error || roleCopy.agentSettings.updatedError)
        }
    }

    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="mb-10 text-center sm:text-left">
                    <span className="pw-kicker inline-block mb-2">PREFERENCES</span>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                        {roleCopy.agentSettings.title}
                    </h1>
                    <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                        {roleCopy.agentSettings.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Navigation — only one real section exists today.
                        "Verification" and "Payouts" were dead buttons (no handler,
                        no matching pane), so they've been removed. */}
                    <div className="space-y-3">
                        <button className="w-full flex items-center gap-3 px-5 py-4 bg-neutral-900 text-white rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all shadow-xl shadow-neutral-900/10 dark:bg-neutral-100 dark:text-neutral-900">
                            <Building className="w-4 h-4" /> {roleCopy.agentSettings.agencyProfile}
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Verification Status Banner */}
                        <div className={`p-4 rounded-3xl border flex items-center gap-4 ${verificationStatus === 'verified'
                                ? 'bg-primary-soft border-primary/20 text-[#166534] dark:bg-primary/15 dark:border-primary/30 dark:text-mint'
                                : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                            }`}>
                            {verificationStatus === 'verified' ? (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            )}
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest">
                                    {roleCopy.agentSettings.status}: {verificationStatus || roleCopy.agentSettings.pending}
                                </p>
                                <p className="text-xs opacity-80 font-medium mt-0.5">
                                    {verificationStatus === 'verified'
                                        ? roleCopy.agentSettings.verifiedDescription
                                        : roleCopy.agentSettings.underReviewDescription}
                                </p>
                            </div>
                        </div>

                        {/* Agency Profile */}
                        <div className="pw-card p-8 space-y-8 border-t-4 border-t-primary">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">{roleCopy.agentSettings.agencyName}</label>
                                    <input
                                        type="text"
                                        value={agencyName}
                                        onChange={(e) => setAgencyName(e.target.value)}
                                        placeholder={roleCopy.agentSettings.agencyNamePlaceholder}
                                        className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-foreground placeholder:text-neutral-400 focus:ring-2 focus:ring-primary transition-all outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">{roleCopy.agentSettings.licenseNumber}</label>
                                    <input
                                        type="text"
                                        value={licenseNumber}
                                        onChange={(e) => setLicenseNumber(e.target.value)}
                                        placeholder={roleCopy.agentSettings.licenseNumberPlaceholder}
                                        className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-foreground placeholder:text-neutral-400 focus:ring-2 focus:ring-primary transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="arc-btn bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 w-full md:w-auto px-8 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? roleCopy.agentSettings.saving : roleCopy.agentSettings.saveChanges}
                                </button>
                            </div>
                        </div>

                        {/* Commission Rates */}
                        <div className="pw-card p-8 space-y-6 border-t-4 border-t-primary">
                            <div>
                                <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Percent className="w-4 h-4 text-primary dark:text-mint" />
                                    {pick(SETTINGS_COPY.commissionRatesTitle, language)}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {language === "el"
                                        ? "Ορίστε τα ποσοστά προμήθειας ανά κλάδο ασφάλισης"
                                        : "Set your commission percentage per line of business"}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {LOB_OPTIONS.map((lob) => (
                                    <div key={lob.key} className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl px-4 py-3">
                                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex-1">
                                            {language === "el" ? lob.el : lob.en}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                                value={commissionRates[lob.key] ?? ""}
                                                onChange={(e) => handleCommissionChange(lob.key, e.target.value)}
                                                placeholder="—"
                                                className="w-16 bg-white dark:bg-neutral-700 border-none rounded-lg px-2 py-1.5 text-sm font-bold text-center text-foreground placeholder:text-neutral-300 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-primary outline-none"
                                            />
                                            <span className="text-xs font-bold text-neutral-400">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="arc-btn bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] w-full md:w-auto px-8 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving
                                        ? roleCopy.agentSettings.saving
                                        : pick(SETTINGS_COPY.saveCommissions, language)}
                                </button>
                            </div>
                        </div>

                        {/* Subscription */}
                        {subscription && (
                            <div className="pw-card p-8 space-y-4 border-t-4 border-t-primary">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                                        {pick(SETTINGS_COPY.subscription, language)}
                                    </h3>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                        subscription.isPaid
                                            ? "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint"
                                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                    }`}>
                                        {subscription.tier.replace(/_/g, " ")}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                                            {pick(SETTINGS_COPY.customers, language)}
                                        </p>
                                        <p className="text-lg font-black text-foreground">
                                            {subscription.currentCustomers}
                                            <span className="text-sm font-medium text-neutral-400">
                                                /{subscription.maxCustomers ?? "∞"}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                                            {pick(SETTINGS_COPY.aiAnalysesPerMo, language)}
                                        </p>
                                        <p className="text-lg font-black text-foreground">
                                            {subscription.aiAnalysesPerMonth ?? "∞"}
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href="/agent/pricing"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-primary dark:text-mint hover:text-primary-hover dark:hover:text-mint transition-colors"
                                >
                                    {pick(SETTINGS_COPY.upgradePlan, language)}
                                    <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </div>
                        )}

                        {/* Danger Zone — account deactivation runs through the
                            real GDPR deletion flow on the account page; the button
                            here had no handler, so it links there instead of
                            being a dead (destructive) control. */}
                        <div className="pw-card p-8 border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10">
                            <h3 className="text-xs font-black text-rose-900 dark:text-rose-400 uppercase tracking-widest mb-2">{roleCopy.agentSettings.dangerZone}</h3>
                            <p className="text-sm text-rose-700/70 dark:text-rose-400/70 mb-6 font-medium">{roleCopy.agentSettings.dangerDescription}</p>
                            <Link href="/account" className="arc-btn bg-rose-600 hover:bg-rose-700 text-white transition-all inline-flex">
                                {roleCopy.agentSettings.deactivateAccount}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
