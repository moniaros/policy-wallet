"use client"

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import 'swagger-ui-react/swagger-ui.css'
import { Loader2, ArrowUpRight } from 'lucide-react'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center min-h-[320px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-mint" />
        </div>
    )
})

const appMenuRoutes = [
    { name: 'Home', path: '/home', apis: ['GET /api/v1/policies', 'GET /api/v1/gaps/[id]/acknowledge'] },
    { name: 'MyWallet', path: '/wallet', apis: ['POST /api/policies/extract', 'POST /api/policies/batch-create', 'GET /api/v1/policies/[id]'] },
    { name: 'AIInsights', path: '/coverage-insights', apis: ['GET /api/v1/policies/[id]/gaps', 'POST /api/v1/gaps/[id]/acknowledge'] },
    { name: 'Agent', path: '/agent', apis: ['GET /api/v1/access-grants', 'POST /api/v1/policies/share'] },
    { name: 'Settings', path: '/account', apis: ['GET /api/v1/me', 'GET /api/v1/me/subscription', 'POST /api/v1/notifications/preferences'] },
]

const policyholderApiGroups = [
    {
        title: 'Policies & Wallet',
        description: 'Policy ingestion, extraction, policy record updates, and wallet pass export.',
        routes: [
            'POST /api/policies/extract',
            'POST /api/policies/batch-create',
            'GET|POST /api/v1/policies',
            'GET|PATCH|DELETE /api/v1/policies/[id]',
            'GET|POST /api/v1/policies/[id]/documents',
        ],
    },
    {
        title: 'Insights, Gaps & Collaboration',
        description: 'Gap detection outputs, acknowledgements, sharing access, and conversation threads.',
        routes: [
            'GET /api/v1/policies/[id]/gaps',
            'POST /api/v1/gaps/[id]/acknowledge',
            'GET|POST /api/v1/access-grants',
            'GET|POST /api/v1/collaboration/threads',
            'GET|POST /api/v1/collaboration/threads/[id]/messages',
        ],
    },
    {
        title: 'Notifications & Account',
        description: 'Notification center history/preferences and account/subscription data for policyholders.',
        routes: [
            'GET /api/v1/notifications',
            'GET|POST /api/v1/notifications/preferences',
            'POST /api/v1/notifications/device-token',
            'GET /api/v1/me',
            'GET /api/v1/me/subscription',
            'GET /api/v1/me/credits',
            'POST /api/v1/billing/checkout',
        ],
    },
]

export default function ApiDocsPage() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section className="rounded-[24px] bg-black text-white p-6 sm:p-8 shadow-2xl">
                    <p className="pw-kicker text-white/60">PolicyWallet Developer Surface</p>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Policyholder API Routes & Menu Coverage</h1>
                    <p className="mt-3 text-sm sm:text-base text-white/75 max-w-3xl">
                        JoinArc-aligned reference for policyholder app-menu pages and the API endpoints that back each surface.
                    </p>
                </section>

                <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    {appMenuRoutes.map((item) => (
                        <article key={item.name} className="pw-card rounded-2xl p-4">
                            <p className="pw-kicker">{item.name}</p>
                            <p className="mt-1 text-sm font-semibold text-black dark:text-white">{item.path}</p>
                            <div className="mt-3 space-y-2">
                                {item.apis.map((api) => (
                                    <div key={api} className="rounded-lg border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 px-2.5 py-2 text-[11px] font-medium text-black/80 dark:text-white/80">
                                        {api}
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </section>

                <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {policyholderApiGroups.map((group) => (
                        <article key={group.title} className="pw-card rounded-2xl p-5">
                            <h2 className="text-lg font-semibold text-black dark:text-white">{group.title}</h2>
                            <p className="mt-1 text-sm text-black/60 dark:text-white/65">{group.description}</p>
                            <ul className="mt-4 space-y-2">
                                {group.routes.map((route) => (
                                    <li key={route} className="text-xs rounded-lg border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 px-3 py-2 text-black/80 dark:text-white/80">
                                        {route}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>

                <section className="mt-6 pw-card rounded-2xl overflow-hidden">
                    <div className="border-b border-black/10 dark:border-white/15 px-5 py-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-black dark:text-white">OpenAPI Reference</h2>
                            <p className="text-sm text-black/60 dark:text-white/65">Live schema rendered from `/api/doc`.</p>
                        </div>
                        <a href="/api/doc" target="_blank" rel="noreferrer" className="pw-primary-button text-xs whitespace-nowrap">
                            Raw Spec
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                    <div className="swagger-container bg-white dark:bg-black p-2 sm:p-4">
                        <SwaggerUI url="/api/doc" />
                    </div>
                </section>
            </div>
        </div>
    )
}
