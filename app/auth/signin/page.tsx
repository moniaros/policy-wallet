"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, CheckCircle } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

export default function SignInPage() {
    const router = useRouter()
    const { language, setLanguage, t } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showResendVerification, setShowResendVerification] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendMessage, setResendMessage] = useState<string | null>(null)

    const copy = {
        title: t.auth.welcomeBack,
        subtitle: roleCopy.auth.signInSubtitle,
        email: t.auth.emailAddress,
        password: t.auth.password,
        forgot: roleCopy.auth.forgotPassword,
        signIn: t.auth.signIn,
        signingIn: `${t.auth.signIn}...`,
        noAccount: roleCopy.auth.noAccount,
        createAccount: t.auth.createAccount,
        unverified: roleCopy.auth.unverified,
        checkEmail: roleCopy.auth.checkInbox,
        resend: roleCopy.auth.resendVerification,
        sending: `${t.common.loading}`,
        resendSent: roleCopy.auth.resendSent,
        genericError: t.errors.somethingWentWrong,
        orContinue: roleCopy.auth.orContinueWith,
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setShowResendVerification(false)
        setResendMessage(null)

        const supabase = createClient()

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                if (error.message.toLowerCase().includes('email not confirmed') ||
                    error.message.toLowerCase().includes('confirm your email')) {
                    setError(copy.unverified)
                    setShowResendVerification(true)
                } else {
                    setError(error.message)
                }
            } else {
                router.refresh()
                router.push("/wallet")
            }
        } catch (err) {
            setError(copy.genericError)
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendVerification = async () => {
        setIsResending(true)
        setResendMessage(null)

        try {
            const { resendVerificationEmail } = await import("../actions")
            const result = await resendVerificationEmail(email, language)

            if (result.success) {
                setResendMessage(copy.resendSent)
            } else {
                setResendMessage(result.error || copy.genericError)
            }
        } catch {
            setResendMessage(copy.genericError)
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className={`${ibmPlexSans.className} flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 px-4 py-10 relative overflow-hidden`}>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-300/30 blur-[120px]" />
                <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-teal-300/30 blur-[120px]" />
            </div>

            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in duration-500 dark:bg-slate-900/85 dark:border-slate-700">
                <div className="text-center mb-7">
                    <Link href="/" className="inline-block group mb-5">
                        <PolicyWalletLogo size="md" language={language} />
                    </Link>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{copy.title}</h2>
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

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                            </div>

                            {showResendVerification && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                                    <p className="text-sm text-emerald-800 dark:text-emerald-200/90">{copy.checkEmail}</p>
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={isResending}
                                        className="w-full py-2.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-300 text-sm font-bold transition-all border border-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isResending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {copy.sending}
                                            </>
                                        ) : copy.resend}
                                    </button>
                                    {resendMessage && (
                                        <div className="flex items-center gap-2 justify-center text-sm">
                                            {resendMessage === copy.resendSent
                                                ? <CheckCircle className="w-4 h-4 text-green-500" />
                                                : <AlertCircle className="w-4 h-4 text-red-500" />}
                                            <span className={resendMessage === copy.resendSent ? 'text-green-400' : 'text-red-400'}>
                                                {resendMessage}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{copy.email}</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-bold sm:text-sm"
                                    placeholder={roleCopy.auth.emailPlaceholder}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{copy.password}</label>
                                <Link href="/auth/forgot-password" className="text-xs font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-all">
                                    {copy.forgot}
                                </Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-bold sm:text-sm"
                                    placeholder={roleCopy.auth.passwordPlaceholder}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {copy.signingIn}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                {copy.signIn} <ArrowRight className="w-4 h-4 opacity-80" />
                            </span>
                        )}
                    </button>
                </form>

                <div className="relative my-7">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 font-medium rounded-full">{copy.orContinue}</span>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {copy.noAccount}{" "}
                        <Link href="/auth/signup" className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
                            {copy.createAccount}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
