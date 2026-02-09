"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { registerUser } from "../actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { User, Mail, Lock, Building, FileBadge, ArrowRight, Loader2, Briefcase } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"

function SignUpForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { t, language } = useLanguage()
    const urlRole = searchParams.get("role")
    const urlSource = searchParams.get("source") || "signup_direct"
    const urlEmail = searchParams.get("email")
    const urlToken = searchParams.get("token")

    // Default role logic can be overridden by subdomain check
    const [name, setName] = useState("")
    const [email, setEmail] = useState(urlEmail || "")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [role, setRole] = useState(urlRole === "agent" ? "agent" : "policyholder")
    const [isRoleLocked, setIsRoleLocked] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Agent-specific fields
    const [licenseNumber, setLicenseNumber] = useState("")
    const [agencyName, setAgencyName] = useState("")

    // Compliance
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [marketingConsent, setMarketingConsent] = useState(false)

    useEffect(() => {
        // Domain-based Role Locking
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

        if (role === 'agent') {
            formData.append("licenseNumber", licenseNumber)
            formData.append("agencyName", agencyName)
        }

        if (urlToken) formData.append("token", urlToken)

        try {
            trackLandingEvent("signup_start", {
                role,
                source: urlSource,
                locale: language,
            })

            const result = await registerUser(formData)

            if (result.success) {
                trackLandingEvent("signup_complete", {
                    role,
                    source: urlSource,
                    locale: language,
                })

                if (result.redirect) {
                    router.push(result.redirect)
                } else {
                    // Fallback to confirmation page if no redirect provided (legacy behavior)
                    router.push(`/auth/signup/confirmation?email=${encodeURIComponent(email)}&role=${role}`)
                }
            } else {
                if (typeof result.error === 'string') {
                    setError(result.error)
                } else {
                    // It's a Zod error object { field: [messages] }
                    const errorObj = result.error as Record<string, string[]>
                    const messages = Object.values(errorObj || {}).flat().join(", ")
                    setError(messages || t.errors.somethingWentWrong)
                }
            }
        } catch (err) {
            setError(t.errors.somethingWentWrong)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
            {/* Liquid Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[0%] left-[10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] animate-pulse-slow delay-700" />
            </div>

            <div className="w-full max-w-xl bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500 hover:shadow-emerald-500/5 transition-all">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block group mb-6">
                        <PolicyWalletLogo size="md" variant="light" />
                    </Link>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Join as {role === 'agent' ? 'Agent' : 'Policyholder'}
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Create your {role === 'agent' ? 'professional' : 'personal'} account to get started
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-800/70 p-1 border border-slate-700">
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.setItem("language", "el")
                                window.location.href = "/"
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${language === "el" ? "bg-slate-700 text-emerald-300" : "text-slate-400 hover:text-white"}`}
                        >
                            EL
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.setItem("language", "en")
                                window.location.href = "/en"
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${language === "en" ? "bg-slate-700 text-emerald-300" : "text-slate-400 hover:text-white"}`}
                        >
                            EN
                        </button>
                    </div>
                </div>

                {!isRoleLocked && (
                    <div className="flex justify-center mb-8">
                        {role === "policyholder" ? (
                            <div className="text-sm text-slate-400">
                                <span>Policyholder signup selected. </span>
                                <button
                                    type="button"
                                    onClick={() => setRole("agent")}
                                    className="font-bold text-teal-400 hover:text-teal-300 underline underline-offset-2"
                                >
                                    I am an insurance agent
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setRole("policyholder")}
                                className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                            >
                                Continue as policyholder instead
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-3 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
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
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email address</label>
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
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
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
                                        className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm</label>
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
                                        className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Agent-specific fields */}
                        {role === 'agent' && (
                            <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700 space-y-5 animate-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center gap-2 text-teal-400 mb-1">
                                    <Briefcase className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Agency Details</span>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        License Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileBadge className="h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                                        </div>
                                        <input
                                            name="licenseNumber"
                                            type="text"
                                            required={role === 'agent'}
                                            value={licenseNumber}
                                            onChange={(e) => setLicenseNumber(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium sm:text-sm"
                                            placeholder="e.g., AG-12345"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Agency Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building className="h-5 w-5 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                                        </div>
                                        <input
                                            name="agencyName"
                                            type="text"
                                            required={role === 'agent'}
                                            value={agencyName}
                                            onChange={(e) => setAgencyName(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-medium sm:text-sm"
                                            placeholder="Your Agency Name"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Terms & Conditions */}
                        <div className="space-y-3 pt-2">
                            <label className="flex items-start cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        id="termsAccepted"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="peer h-5 w-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all"
                                        required
                                    />
                                </div>
                                <span className="ml-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                                    I agree to the{" "}
                                    <Link href="/terms" target="_blank" className="font-bold text-emerald-500 hover:text-emerald-400 hover:underline">
                                        Terms & Conditions
                                    </Link>{" "}
                                    and{" "}
                                    <Link href="/privacy" target="_blank" className="font-bold text-emerald-500 hover:text-emerald-400 hover:underline">
                                        Privacy Policy
                                    </Link>
                                    <span className="text-red-500 ml-1">*</span>
                                </span>
                            </label>

                            <label className="flex items-start cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        id="marketingConsent"
                                        checked={marketingConsent}
                                        onChange={(e) => setMarketingConsent(e.target.checked)}
                                        className="peer h-5 w-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all"
                                    />
                                </div>
                                <span className="ml-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                                    I consent to receive marketing communications and updates
                                </span>
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating Account...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Create Account <ArrowRight className="w-4 h-4 opacity-80" />
                            </span>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-700/50 text-center">
                    <p className="text-sm text-slate-400">
                        {t.auth.alreadyHaveAccount}{" "}
                        <Link href="/auth/signin" className="font-bold text-emerald-500 hover:text-emerald-400 hover:underline transition-colors">
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
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        }>
            <SignUpForm />
        </Suspense>
    )
}
