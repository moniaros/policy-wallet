"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, CheckCircle } from "lucide-react"

export default function SignInPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showResendVerification, setShowResendVerification] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendMessage, setResendMessage] = useState<string | null>(null)

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
                    setError("Your email address has not been verified yet.")
                    setShowResendVerification(true)
                } else {
                    setError(error.message)
                }
            } else {
                router.refresh()
                router.push("/wallet")
            }
        } catch (error) {
            setError("Something went wrong. Please try again.")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendVerification = async () => {
        setIsResending(true)
        setResendMessage(null)

        try {
            const { resendVerificationEmail } = await import("../actions")
            const result = await resendVerificationEmail(email, 'en')

            if (result.success) {
                setResendMessage("Verification email sent! Please check your inbox.")
            } else {
                setResendMessage(result.error || "Failed to send email")
            }
        } catch (error) {
            setResendMessage("An error occurred. Please try again.")
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
            {/* Liquid Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] animate-pulse-slow delay-700" />
            </div>

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500 hover:shadow-amber-500/5 transition-all">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block group mb-6">
                        <h1 className="text-3xl font-black tracking-tighter text-white">
                            Policy<span className="text-amber-500">Wallet</span>
                        </h1>
                    </Link>
                    <h2 className="text-xl font-bold text-white mb-2">Welcome Back</h2>
                    <p className="text-slate-400 text-sm">
                        Sign in to manage your insurance portfolio
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="text-red-400 font-medium">{error}</p>
                                </div>
                            </div>

                            {showResendVerification && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                                    <p className="text-sm text-amber-200/80">
                                        Check your email for the verification link. Missing it?
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={isResending}
                                        className="w-full py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-bold transition-all border border-amber-500/30 flex items-center justify-center gap-2"
                                    >
                                        {isResending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            "Resend Verification Email"
                                        )}
                                    </button>
                                    {resendMessage && (
                                        <div className="flex items-center gap-2 justify-center text-sm">
                                            {resendMessage.includes('sent') ?
                                                <CheckCircle className="w-4 h-4 text-green-500" /> :
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            }
                                            <span className={resendMessage.includes('sent') ? 'text-green-400' : 'text-red-400'}>
                                                {resendMessage}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium sm:text-sm"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Password
                                </label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline transition-all"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-amber-500/20 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Signing In...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Sign In <ArrowRight className="w-4 h-4 opacity-80" />
                            </span>
                        )}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-slate-900 px-3 text-slate-500 font-medium rounded-full">Or continue with</span>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-slate-400">
                        Don't have an account?{" "}
                        <Link href="/auth/signup" className="font-bold text-amber-500 hover:text-amber-400 transition-colors">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
