import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default function AuthCodeErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
            {/* Emerald/Red Liquid Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-slow delay-700" />
            </div>

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500 hover:shadow-red-500/5 transition-all text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-3">Authentication Failed</h1>
                <p className="text-slate-400 mb-2">There was a problem signing you in.</p>
                <p className="text-sm text-slate-500 mb-8">The sign-in link may have expired or is invalid.</p>

                <Link
                    href="/auth/signin"
                    className="block w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                >
                    Return to Sign In
                </Link>
            </div>
        </div>
    )
}
