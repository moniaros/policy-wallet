"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { IBM_Plex_Sans } from "next/font/google"
import { registerUser } from "../actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { User, Mail, Lock, Building, FileBadge, ArrowRight, Loader2, Briefcase, AlertCircle } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

function SignUpForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { t, language, setLanguage } = useLanguage()

    const urlRole = searchParams.get("role")
    const urlSource = searchParams.get("source") || "signup_direct"
    const urlEmail = searchParams.get("email")
    const urlToken = searchParams.get("token")

    const [name, setName] = useState("")
    const [email, setEmail] = useState(urlEmail || "")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [role, setRole] = useState(urlRole === "agent" ? "agent" : "policyholder")
    const [isRoleLocked, setIsRoleLocked] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [licenseNumber, setLicenseNumber] = useState("")
    const [agencyName, setAgencyName] = useState("")

    const [termsAccepted, setTermsAccepted] = useState(false)
    const [marketingConsent, setMarketingConsent] = useState(false)

    const copy = {
        title: "Create your account",
        subtitle: "Get started with PolicyWallet in under 2 minutes.",
        joinAs: "Join as",
        agent: "Agent",
        policyholder: "Policyholder",
        fullName: "Full name",
        email: "Email address",
        password: "Password",
        confirm: "Confirm password",
        creating: "Creating account...",
        cta: "Create account",
        agentDetails: "Agency details",
        license: "License number",
        agency: "Agency name",
        terms: "I agree to the",
        and: "and",
        marketing: "I consent to receive marketing updates.",
        alreadyHave: "Already have an account?",
        switchAgent: "I am an insurance agent",
        switchPolicyholder: "Continue as policyholder",
    }

    useEffect(() => {
        const hostname = window.location.hostname
        if (hostname.startsWith("app.")) {
            setRole("policyholder")
            setIsRoleLocked(true)
        } else if (hostname.startsWith("agent.")) {
            setRole("agent")
            setIsRoleLocked(true)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append("name", name)
        formData.append("email", email)
        formData.append("password", password)
        formData.append("confirmPassword", confirmPassword)
        formData.append("role", role)
        formData.append("language", language)
        formData.append("termsAccepted", String(termsAccepted))
        formData.append("marketingConsent", String(marketingConsent))

        if (role === "agent") {
            formData.append("licenseNumber", licenseNumber)
            formData.append("agencyName", agencyName)
        }

        if (urlToken) formData.append("token", urlToken)

        try {
            trackLandingEvent("signup_start", { role, source: urlSource, locale: language })

            const result = await registerUser(formData)

            if (result.success) {
                trackLandingEvent("signup_complete", { role, source: urlSource, locale: language })

                if (result.redirect) {
                    router.push(result.redirect)
                } else {
                    router.push(`/auth/signup/confirmation?email=${encodeURIComponent(email)}&role=${role}`)
                }
            } else if (typeof result.error === "string") {
                setError(result.error)
            } else {
                const errorObj = result.error as Record<string, string[]>
                const messages = Object.values(errorObj || {}).flat().join(", ")
                setError(messages || t.errors.somethingWentWrong)
            }
        } catch {
            setError(t.errors.somethingWentWrong)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={`${ibmPlexSans.className} flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 px-4 py-12 relative overflow-hidden`}>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-300/30 blur-[120px]" />
                <div className="absolute bottom-[0%] left-[10%] w-[50%] h-[50%] rounded-full bg-teal-300/30 blur-[120px]" />
            </div>

            <div className="w-full max-w-xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-emerald-100 p-8 sm:p-10 relative z-10 dark:bg-slate-900/85 dark:border-slate-700">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block mb-6">
                        <PolicyWalletLogo size="md" language={language} />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{copy.title}</h1>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">{copy.subtitle}</p>
                    <div className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setLanguage("el")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${language === "el" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                        >
                            EL
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage("en")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${language === "en" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                        >
                            EN
                        </button>
                    </div>
                </div>

                {!isRoleLocked && (
                    <div className="flex justify-center mb-8">
                        {role === "policyholder" ? (
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                <span>{copy.joinAs} {copy.policyholder}. </span>
                                <button type="button" onClick={() => setRole("agent")} className="font-bold text-teal-700 hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200 underline underline-offset-2 cursor-pointer">
                                    {copy.switchAgent}
                                </button>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setRole("policyholder")} className="text-sm font-bold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200 underline underline-offset-2 cursor-pointer">
                                {copy.switchPolicyholder}
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-3">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{copy.fullName}</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{copy.email}</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{copy.password}</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                        placeholder="********"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{copy.confirm}</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                        placeholder="********"
                                    />
                                </div>
                            </div>
                        </div>

                        {role === "agent" && (
                            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5">
                                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 mb-1">
                                    <Briefcase className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">{copy.agentDetails}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{copy.license} <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileBadge className="h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                                        </div>
                                        <input
                                            name="licenseNumber"
                                            type="text"
                                            required={role === "agent"}
                                            value={licenseNumber}
                                            onChange={(e) => setLicenseNumber(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium sm:text-sm"
                                            placeholder="AG-12345"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{copy.agency} <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building className="h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                                        </div>
                                        <input
                                            name="agencyName"
                                            type="text"
                                            required={role === "agent"}
                                            value={agencyName}
                                            onChange={(e) => setAgencyName(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium sm:text-sm"
                                            placeholder="Agency Name"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <label className="flex items-start cursor-pointer group">
                                <input
                                    type="checkbox"
                                    id="termsAccepted"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-0.5 h-5 w-5 rounded border-slate-400 bg-white text-emerald-500 dark:border-slate-600 dark:bg-slate-800 focus:ring-emerald-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all"
                                    required
                                />
                                <span className="ml-3 text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                                    {copy.terms}{" "}
                                    <Link href="/terms" target="_blank" className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline">Terms & Conditions</Link>{" "}
                                    {copy.and}{" "}
                                    <Link href="/privacy" target="_blank" className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline">Privacy Policy</Link>
                                    <span className="text-red-500 ml-1">*</span>
                                </span>
                            </label>

                            <label className="flex items-start cursor-pointer group">
                                <input
                                    type="checkbox"
                                    id="marketingConsent"
                                    checked={marketingConsent}
                                    onChange={(e) => setMarketingConsent(e.target.checked)}
                                    className="mt-0.5 h-5 w-5 rounded border-slate-400 bg-white text-emerald-500 dark:border-slate-600 dark:bg-slate-800 focus:ring-emerald-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all"
                                />
                                <span className="ml-3 text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                                    {copy.marketing}
                                </span>
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/20 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {copy.creating}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                {copy.cta} <ArrowRight className="w-4 h-4 opacity-80" />
                            </span>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700/50 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {copy.alreadyHave}{" "}
                        <Link href="/auth/signin" className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-colors">
                            {t.auth.signIn}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function SignUpPage() {
    return (
        <Suspense
            fallback={
                <div className={`${ibmPlexSans.className} min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 flex items-center justify-center`}>
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
            }
        >
            <SignUpForm />
        </Suspense>
    )
}

