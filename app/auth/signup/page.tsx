"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { registerUser } from "../actions"
import { signIn } from "next-auth/react"

function SignUpForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const defaultRole = searchParams.get("role") === "agent" ? "agent" : "policyholder"

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState(defaultRole)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append("name", name)
        formData.append("email", email)
        formData.append("password", password)
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
        <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl border border-stone-100">
                <div className="text-center">
                    <Link href="/" className="inline-block font-bold text-2xl text-teal-700 mb-6">
                        PolicyWallet
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight text-stone-900">
                        Join as {role === 'agent' ? 'Agent' : 'Policyholder'}
                    </h2>
                    <p className="mt-2 text-stone-600">
                        Create your account to get started
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-stone-700">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-3 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700">Email address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-3 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-3 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    {/* Hidden role selector or explicit toggle if needed */}
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-stone-500">I am a:</span>
                        <button
                            type="button"
                            onClick={() => setRole('policyholder')}
                            className={`font-medium ${role === 'policyholder' ? 'text-teal-600 underline' : 'text-stone-400'}`}
                        >
                            Policyholder
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('agent')}
                            className={`font-medium ${role === 'agent' ? 'text-teal-600 underline' : 'text-stone-400'}`}
                        >
                            Agent
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm font-medium text-stone-500">
                    Or continue with
                </div>

                <div className="mt-4">
                    <button
                        onClick={() => signIn("google", { callbackUrl: role === 'agent' ? '/dashboard' : '/wallet' })}
                        className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-500"
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
                </div>

                <p className="mt-8 text-center text-sm text-stone-500">
                    Already have an account?{" "}
                    <Link href="/auth/signin" className="text-teal-600 hover:underline">
                        Sign In
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
