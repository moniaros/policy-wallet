"use client"

import { uploadPolicyDocument } from "../actions"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"

function UploadButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
        >
            {pending ? "Uploading & Analyzing..." : "Upload & Analyze"}
        </button>
    )
}

export default function UploadPage() {
    const router = useRouter()

    return (
        <div className="max-w-xl mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Upload Policy Document</h1>
            <p className="text-stone-600 mb-8">
                Take a photo or upload a PDF of your insurance policy. AI will extract the details for you.
            </p>

            <form
                action={async (formData) => {
                    await uploadPolicyDocument(formData)
                    router.push('/wallet')
                }}
                className="bg-white p-8 rounded-lg shadow-sm border border-dashed border-stone-300"
            >
                <div className="mb-8">
                    <div className="mx-auto w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <input
                        name="file"
                        type="file"
                        accept=".pdf,image/*"
                        required
                        className="block w-full text-sm text-stone-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-teal-50 file:text-teal-700
              hover:file:bg-teal-100"
                    />
                </div>

                <UploadButton />
            </form>
        </div>
    )
}
