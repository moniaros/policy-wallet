"use client"

import React, { useState } from 'react'
import {
    AgentPolicyList,
    ProtectionAnalysis
} from '@/components/agent-rise/Policymodules'
import {
    CustomerProfile,
    ShareCenter
} from '@/components/agent-rise/ProfileSharing'
import { PublicShareView } from '@/components/agent-rise/PublicShareView'
import { mockParty, mockPolicies, mockProfile, mockShareLinks } from './mockData'
import { ShareLink__EXT } from '@/components/agent-rise/types'
import Link from 'next/link'

export default function AgentRiseDemoPage() {
    const [viewMode, setViewMode] = useState<'agent' | 'public'>('agent')
    const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>('pol_2') // Default to the renewal/gap policy
    const [links, setLinks] = useState(mockShareLinks)

    // Interaction Handlers
    const handleAnalyze = (id: string) => {
        setSelectedPolicyId(id)
        // In a real app, this would fetch the new profile data for that policy
    }

    const handleCreateLink = (config: ShareLink__EXT) => {
        // Mock API call to create link
        console.log("creating link", config)
    }

    const handleRevokeLink = (uuid: string) => {
        setLinks(prev => prev.filter(l => l.uuid !== uuid))
    }

    // Toggle for Demo Context
    if (viewMode === 'public') {
        const demoMetadata = {
            insurerName: 'AXA Insurance',
            insurerLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/AXA_Logo.svg/1200px-AXA_Logo.svg.png',
            policyType: 'Commercial Property',
            expiresAt: '2024-02-10T23:59:59Z',
            requiresOtp: true
        }

        return (
            <div>
                <div className="fixed top-4 right-4 z-50">
                    <button
                        onClick={() => setViewMode('agent')}
                        className="px-4 py-2 bg-slate-800 text-white rounded shadow-lg text-sm font-bold opacity-50 hover:opacity-100 transition-opacity"
                    >
                        Back to Agent View
                    </button>
                </div>
                <PublicShareView linkMetadata={demoMetadata} />
            </div>
        )
    }

    // Agent View
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-20 font-sans">
            {/* Demo Navbar */}
            <nav className="bg-slate-900 text-white p-4 sticky top-0 z-40 border-b border-slate-700">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">AR</div>
                        <h1 className="font-bold text-lg tracking-tight">AgentRise <span className="text-slate-400 font-normal text-sm ml-2">v2.0 High Density</span></h1>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setViewMode('public')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-bold uppercase tracking-wider"
                        >
                            Test Public Link View
                        </button>
                        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">Exit Demo</Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* 1. Customer Context */}
                <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Customer Context</h2>
                    </div>
                    <CustomerProfile party={mockParty} />
                </section>

                {/* 2. Policy List */}
                <section className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Portfolio</h2>
                    </div>
                    <AgentPolicyList
                        policies={mockPolicies}
                        onAnalyze={handleAnalyze}
                    />
                </section>

                {/* 3. Deep Dive (Analysis & Sharing) */}
                {selectedPolicyId && (
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-150">
                        {/* Left: Analysis */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Coverage Intelligence</h2>
                                <span className="text-xs font-mono text-slate-400">{selectedPolicyId}</span>
                            </div>
                            {/* In a real app, mockProfile would be filtered by selectedPolicyId */}
                            <ProtectionAnalysis profile={mockProfile} />
                        </div>

                        {/* Right: Sharing */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Secure Client Access</h2>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 h-full">
                                <ShareCenter
                                    policyId={selectedPolicyId}
                                    activeLinks={links}
                                    onCreateLink={handleCreateLink}
                                    onRevokeLink={handleRevokeLink}
                                />
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
