import Link from "next/link"

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                <div className="mb-8 border-b border-stone-100 pb-4">
                    <Link href="/" className="inline-block font-bold text-xl text-teal-700 mb-2">
                        PolicyWallet
                    </Link>
                    <h1 className="text-3xl font-bold text-stone-900">Terms of Service</h1>
                    <p className="text-stone-500 mt-2">Last updated: January 2026</p>
                </div>

                <div className="prose prose-stone max-w-none text-stone-600">
                    <p>
                        Welcome to PolicyWallet. By accessing or using our website and services, you agree to be bound by these Terms of Service.
                    </p>

                    <h3>1. Acceptance of Terms</h3>
                    <p>
                        By creating an account or using any part of our service, you agree to these legal terms. If you do not agree, strictly do not use the service.
                    </p>

                    <h3>2. Description of Service</h3>
                    <p>
                        PolicyWallet provides a digital platform for managing insurance policies. We act as a neutral wallet and aggregator; we are not an insurance provider.
                    </p>

                    <h3>3. User Accounts</h3>
                    <p>
                        You are responsible for maintaining the security of your account and password. PolicyWallet cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
                    </p>

                    <h3>4. Privacy</h3>
                    <p>
                        Your privacy is critical to us. Please review our <Link href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link> to understand how we collect and manage your data.
                    </p>

                    <h3>5. Modifications</h3>
                    <p>
                        We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.
                    </p>
                </div>

                <div className="mt-10 pt-6 border-t border-stone-100 flex justify-center">
                    <Link href="/" className="text-stone-500 hover:text-stone-900 font-medium">
                        &larr; Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
