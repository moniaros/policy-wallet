"use client"

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import 'swagger-ui-react/swagger-ui.css'
import { Loader2 } from 'lucide-react'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
    )
})

export default function ApiDocsPage() {
    // Force mount on client
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-white">
            <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
                <h1 className="text-xl font-bold text-stone-900">API Documentation</h1>
                <p className="text-sm text-stone-500 mt-1">
                    Specification for PolicyWallet internal and external APIs.
                </p>
            </div>
            <div className="swagger-container">
                <SwaggerUI url="/api/doc" />
            </div>
        </div>
    )
}
