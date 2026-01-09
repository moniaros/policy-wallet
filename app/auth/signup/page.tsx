"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { registerUser } from "../actions"
import { signIn } from "next-auth/react"

function SignUpForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
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

        try {
            const result = await registerUser(formData)

            if (result.success) {
                // Auto login after success
                const loginResult = await signIn("credentials", {
                    email,
                    password,
                    redirect: false
                })

                if (loginResult?.ok) {
                    router.push(role === 'agent' ? '/dashboard' : '/wallet')
                } else {
                    router.push('/auth/signin?success=true')
                }
            } else {
                if (typeof result.error === 'string') {
                    setError(result.error)
                } else {
                    setError("Please check your input")
                }
            }
        } catch (err) {
            setError("Something went wrong")
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

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                            <input
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

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-stone-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white/80 backdrop-blur-sm px-2 text-stone-500">Or continue with</span>
                    </div>
                </div>

                <div>
                    <button
                        onClick={() => signIn("google", { callbackUrl: role === 'agent' ? '/dashboard' : '/wallet' })}
                        className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google
                    </button>
                    <p className="mt-8 text-center text-xs text-stone-500">
                        By signing up, you agree to our{" "}
                        <Link href="/terms" className="font-medium text-teal-600 hover:text-teal-500">Terms of Service</Link>
                        {" "}and{" "}
                        <Link href="/privacy" className="font-medium text-teal-600 hover:text-teal-500">Privacy Policy</Link>.
                    </p>
                    <p className="mt-4 text-center text-sm text-stone-600">
                        Already have an account?{" "}
                        <Link href="/auth/signin" className="font-semibold text-teal-600 hover:text-teal-500 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
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
