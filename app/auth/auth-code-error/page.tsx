import Link from "next/link"

export default function AuthCodeErrorPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
            <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
            <p className="mt-2 text-gray-600">There was a problem signing you in.</p>
            <p className="mt-2 text-gray-500 text-sm">The sign-in link may have expired or is invalid.</p>
            <Link
                href="/auth/signin"
                className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
                Return to Sign In
            </Link>
        </div>
    )
}
