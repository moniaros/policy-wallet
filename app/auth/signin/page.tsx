"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, CheckCircle } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { useLanguage } from "@/contexts/LanguageContext"

export default function SignInPage() {
    const router = useRouter()
    const { language, setLanguage } = useLanguage()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showResendVerification, setShowResendVerification] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendMessage, setResendMessage] = useState<string | null>(null)

    const copy = {
        title: language === "el" ? "Καλώς ήρθατε πίσω" : "Welcome back",
        subtitle: language === "el" ? "Συνδεθείτε για να διαχειριστείτε το ασφαλιστικό σας πορτοφόλι." : "Sign in to manage your insurance portfolio.",
        email: language === "el" ? "Διεύθυνση email" : "Email address",
        password: language === "el" ? "Κωδικός" : "Password",
        forgot: language === "el" ? "Ξέχασα τον κωδικό" : "Forgot password?",
        signIn: language === "el" ? "Σύνδεση" : "Sign In",
        signingIn: language === "el" ? "Σύνδεση..." : "Signing in...",
        noAccount: language === "el" ? "Δεν έχετε λογαριασμό;" : "Don't have an account?",
        createAccount: language === "el" ? "Δημιουργία λογαριασμού" : "Create account",
        unverified: language === "el" ? "Το email σας δεν έχει επιβεβαιωθεί ακόμη." : "Your email address has not been verified yet.",
        checkEmail: language === "el" ? "Ελέγξτε τα εισερχόμενα. Δεν το βρήκατε;" : "Check your inbox. Missing it?",
        resend: language === "el" ? "Επανάληψη αποστολής email επιβεβαίωσης" : "Resend verification email",
        sending: language === "el" ? "Αποστολή..." : "Sending...",
        resendSent: language === "el" ? "Το email επιβεβαίωσης εστάλη." : "Verification email sent! Please check your inbox.",
        genericError: language === "el" ? "Προέκυψε σφάλμα. Δοκιμάστε ξανά." : "Something went wrong. Please try again.",
        orContinue: language === "el" ? "Ή συνεχίστε με" : "Or continue with",
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] animate-pulse-slow delay-700" />
            </div>

            <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-7">
                    <Link href="/" className="inline-block group mb-5">
                        <PolicyWalletLogo size="md" variant="light" />
                    </Link>
                    <h2 className="text-xl font-bold text-white mb-2">{copy.title}</h2>
                    <p className="text-slate-400 text-sm">{copy.subtitle}</p>
                    <div className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-800/70 p-1 border border-slate-700">
                        <button
                            type="button"
                            onClick={() => setLanguage("el")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${language === "el" ? "bg-slate-700 text-emerald-300" : "text-slate-400 hover:text-white"}`}
                        >
                            EL
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage("en")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${language === "en" ? "bg-slate-700 text-emerald-300" : "text-slate-400 hover:text-white"}`}
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
                                <p className="text-sm text-red-400 font-medium">{error}</p>
                            </div>

                            {showResendVerification && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                                    <p className="text-sm text-emerald-200/80">{copy.checkEmail}</p>
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={isResending}
                                        className="w-full py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-bold transition-all border border-emerald-500/30 flex items-center justify-center gap-2"
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
                            <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{copy.email}</label>
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
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-bold sm:text-sm"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{copy.password}</label>
                                <Link href="/auth/forgot-password" className="text-xs font-bold text-emerald-500 hover:text-emerald-400 hover:underline transition-all">
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
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-bold sm:text-sm"
                                    placeholder="********"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-slate-900 px-3 text-slate-500 font-medium rounded-full">{copy.orContinue}</span>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-slate-400">
                        {copy.noAccount}{" "}
                        <Link href="/auth/signup" className="font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                            {copy.createAccount}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
