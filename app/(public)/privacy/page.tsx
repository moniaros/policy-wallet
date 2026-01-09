import Link from "next/link"

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                <div className="mb-8 border-b border-stone-100 pb-4">
                    <Link href="/" className="inline-block font-bold text-xl text-teal-700 mb-2">
                        PolicyWallet
                    </Link>
                    <h1 className="text-3xl font-bold text-stone-900">Privacy Policy</h1>
                    <p className="text-stone-500 mt-2">Last updated: January 2026</p>
                </div>

                <div className="prose prose-stone max-w-none text-stone-600">
                    <p>
                        Your privacy is important to us. It is PolicyWallet's policy to respect your privacy regarding any information we may collect from you across our website.
                    </p>

                    <h3>1. Information We Collect</h3>
                    <p>
                        We collect information you plainly provide to us, such as your name, email address, and policy documents you choose to upload.
                    </p>

                    <h3>2. How We Use Information</h3>
                    <p>
                        We use the information to provide, operate, and maintain our website, allowing you to view and manage your policies in one place. We do not sell your personal data to extensive third-party lists.
                    </p>

                    <h3>3. Security</h3>
                    <p>
                        We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it.
                    </p>

                    <h3>4. Third-Party Services</h3>
                    <p>
                        Our service may contain links to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites.
                    </p>

                    <h3>5. Contact Us</h3>
                    <p>
                        If you have any questions about our Privacy Policy, please contact us at support@policywallet.gr.
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
