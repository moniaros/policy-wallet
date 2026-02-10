"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { IBM_Plex_Sans } from "next/font/google"
import { updateUserPassword } from "../actions"
import { Lock, Eye, EyeOff, CheckCircle, Loader2, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setIsLoading(true)

        try {
            const result = await updateUserPassword(password)
            if (result.success) {
                setIsSuccess(true)
                setTimeout(() => {
                    router.push("/wallet")
                }, 2000)
            } else {
                setError(result.error || "Failed to update password")
            }
        } catch {
            setError("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={`${ibmPlexSans.className} flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 px-4 py-12 relative overflow-hidden`}>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-300/30 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/30 blur-[120px]" />
            </div>

            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-emerald-100 p-8 sm:p-10 relative z-10 dark:bg-slate-900/85 dark:border-slate-700">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block mb-5">
                        <PolicyWalletLogo size="md" />
                    </Link>
                    <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Reset password</h1>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Enter your new password below.
                    </p>
                </div>

                {isSuccess ? (
                    <div className="text-center space-y-6">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Password updated</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                Your password was reset successfully. Redirecting to wallet...
                            </p>
                        </div>
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                New password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
                                    placeholder="********"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Confirm password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-800/60 dark:border-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
                                    placeholder="********"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/20 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Update password
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <Link href="/auth/signin" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to sign in
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
