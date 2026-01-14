"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SignInPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
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


    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-teal-100/30 dark:bg-teal-900/10 blur-3xl opacity-60" />
                <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/30 dark:bg-blue-900/10 blur-3xl opacity-50" />
            </div>

            <div className="w-full max-w-md space-y-8 rounded-3xl bg-white/80 dark:bg-stone-900/50 backdrop-blur-xl p-10 shadow-2xl border border-white/50 dark:border-white/5 relative z-10 transition-all duration-300 hover:shadow-teal-900/5">
                <div className="text-center">
                    <Link href="/" className="inline-block relative group">
                        <span className="sr-only">PolicyWallet</span>
                        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">
                            Policy<span className="text-teal-600 dark:text-teal-400">Wallet</span>
                        </h1>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-teal-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <h2 className="mt-8 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Welcome back</h2>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 font-medium">
                        Sign in to your neutral insurance wallet
                    </p>
                </div>

                <div className="mt-8">
                    <form onSubmit={handleSubmit} className="space-y-5" method="post">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold animate-pulse">
                                {error}
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wider">
                                Email address
                            </label>
                            <input
                                name="email"
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 bg-white/50 dark:bg-stone-800/50 text-stone-900 dark:text-white focus:bg-white dark:focus:bg-stone-800 transition-colors focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:focus:ring-teal-500/20 focus:outline-none sm:text-sm"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="password" className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    Password
                                </label>
                                <Link href="#" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                name="password"
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 bg-white/50 dark:bg-stone-800/50 text-stone-900 dark:text-white focus:bg-white dark:focus:bg-stone-800 transition-colors focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:focus:ring-teal-500/20 focus:outline-none sm:text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full items-center justify-center rounded-xl bg-teal-600 dark:bg-teal-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 dark:shadow-teal-900/20 transition-all hover:bg-teal-700 dark:hover:bg-teal-600 hover:shadow-teal-600/40 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Signing In...
                                    </span>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-stone-200 dark:border-stone-800" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm px-2 text-stone-500 dark:text-stone-400 font-medium">Or continue with</span>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-sm text-stone-600 dark:text-stone-400">
                        Don't have an account?{" "}
                        <Link href="/auth/signup" className="font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 transition-colors">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
