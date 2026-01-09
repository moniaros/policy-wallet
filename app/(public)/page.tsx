import Link from "next/link"

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-stone-50 text-stone-900">
            <header className="px-6 py-4 flex justify-between items-center border-b border-stone-200 bg-white">
                <div className="font-bold text-xl text-teal-700">PolicyWallet</div>
                <nav className="flex gap-4">
                    <Link href="/auth/signin" className="px-4 py-2 font-medium hover:text-teal-600">
                        Sign In
                    </Link>
                    <Link href="/auth/signin" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
                        Get Started
                    </Link>
                </nav>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
                    Your Insurance, <span className="text-teal-600">Consolidated</span>.
                </h1>
                <p className="text-xl md:text-2xl text-stone-600 max-w-2xl mb-10">
                    The neutral wallet to manage all your policies in one place. No spam, just clarity.
                </p>
                <div className="flex gap-4">
                    <Link href="https://app.policywallet.gr/auth/signup" className="px-8 py-3 bg-teal-600 text-white rounded-lg text-lg font-bold shadow-lg hover:bg-teal-700 transition-all">
                        Join as Policyholder
                    </Link>
                    <Link href="https://agent.policywallet.gr/auth/signup" className="px-8 py-3 bg-amber-500 text-white rounded-lg text-lg font-bold shadow-lg hover:bg-amber-600 transition-all">
                        For Agents
                    </Link>
                </div>
            </main>

            <footer className="py-6 text-center text-stone-500 text-sm">
                &copy; {new Date().getFullYear()} PolicyWallet. All rights reserved.
            </footer>
        </div>
    )
}
