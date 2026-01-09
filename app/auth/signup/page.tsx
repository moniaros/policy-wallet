"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { registerUser } from "../actions"
import { useLanguage } from "@/contexts/LanguageContext"

function SignUpForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { t, language } = useLanguage()
    const urlRole = searchParams.get("role")

    // Default role logic can be overridden by subdomain check
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [role, setRole] = useState(urlRole === "agent" ? "agent" : "policyholder")
    const [isRoleLocked, setIsRoleLocked] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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

        try {
            const result = await registerUser(formData)

            if (result.success) {
                // Redirect to confirmation page
                router.push(`/auth/signup/confirmation?email=${encodeURIComponent(result.email || email)}&role=${result.role || role}`)
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-teal-50/50 blur-3xl opacity-60" />
                <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-50/50 blur-3xl opacity-50" />
            </div>

            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/80 backdrop-blur-xl p-10 shadow-2xl border border-white/50 relative z-10 transition-all duration-300 hover:shadow-teal-900/5">
                <div className="text-center">
                    <Link href="/" className="inline-block">
                        <span className="sr-only">PolicyWallet</span>
                        <h1 className="text-3xl font-extrabold tracking-tight text-teal-700">
                            PolicyWallet
                        </h1>
                    </Link>
                    <h2 className="mt-6 text-2xl font-bold tracking-tight text-stone-900">
                        Join as {role === 'agent' ? 'Agent' : 'Policyholder'}
                    </h2>
                    <p className="mt-2 text-sm text-stone-600">
                        Create your account to get started
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5" method="post">
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                            <input
                                name="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full rounded-lg border border-stone-300 px-4 py-3 bg-white/50 focus:bg-white transition-colors focus:border-teal-500 focus:ring-teal-500/20 focus:outline-none focus:ring-4 sm:text-sm"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Email address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-lg border border-stone-300 px-4 py-3 bg-white/50 focus:bg-white transition-colors focus:border-teal-500 focus:ring-teal-500/20 focus:outline-none focus:ring-4 sm:text-sm"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-lg border border-stone-300 px-4 py-3 bg-white/50 focus:bg-white transition-colors focus:border-teal-500 focus:ring-teal-500/20 focus:outline-none focus:ring-4 sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Confirm</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full rounded-lg border border-stone-300 px-4 py-3 bg-white/50 focus:bg-white transition-colors focus:border-teal-500 focus:ring-teal-500/20 focus:outline-none focus:ring-4 sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    {!isRoleLocked && (
                        <div className="flex items-center justify-center gap-6 pt-2">
                            <div className="flex items-center">
                                <span className="mr-3 text-sm font-medium text-stone-700">I am a:</span>
                                <div className="flex bg-stone-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setRole('policyholder')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${role === 'policyholder'
                                            ? 'bg-white text-teal-700 shadow-sm'
                                            : 'text-stone-500 hover:text-stone-900'
                                            }`}
                                    >
                                        Policyholder
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('agent')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${role === 'agent'
                                            ? 'bg-white text-teal-700 shadow-sm'
                                            : 'text-stone-500 hover:text-stone-900'
                                            }`}
                                    >
                                        Agent
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-teal-600/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating Account...
                                </span>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-sm text-stone-600">
                    {t.auth.alreadyHaveAccount}{" "}
                    <Link href="/auth/signin" className="font-semibold text-teal-600 hover:text-teal-500 transition-colors">
                        {t.auth.signIn}
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignUpForm />
        </Suspense>
    )
}
