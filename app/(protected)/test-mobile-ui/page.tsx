"use client"

import { useState } from 'react'
import { MyPoliciesScreen, MyAgentScreen, MyProfileScreen } from '@/components/wallet'
import type { Policy } from '@/components/wallet/types'

// Mock data for testing
const mockPolicies: Policy[] = [
    {
        id: '1',
        userId: 'test',
        insurerName: 'Ζωή',
        insurerLogo: null,
        policyNumber: '2100000',
        lineOfBusiness: 'health',
        status: 'active',
        startDate: '2024-01-21',
        endDate: '2028-01-21',
        lastUpdated: new Date().toISOString(),
        sharedWithAgents: [],
        coverageHighlights: [],
        documents: [],
        acordData: { coverageAmount: 50000 }
    },
    {
        id: '2',
        userId: 'test',
        insurerName: 'Αυτοκίνητο',
        insurerLogo: null,
        policyNumber: '2100005',
        lineOfBusiness: 'motor',
        status: 'active',
        startDate: '2024-01-21',
        endDate: '2028-01-21',
        lastUpdated: new Date().toISOString(),
        sharedWithAgents: [],
        coverageHighlights: [],
        documents: [],
        acordData: { coverageAmount: 30000 }
    },
    {
        id: '3',
        userId: 'test',
        insurerName: 'Σπίτι',
        insurerLogo: null,
        policyNumber: '2100007',
        lineOfBusiness: 'home',
        status: 'expiring_soon',
        startDate: '2024-01-21',
        endDate: '2028-01-21',
        lastUpdated: new Date().toISOString(),
        sharedWithAgents: [],
        coverageHighlights: [],
        documents: [],
        acordData: { coverageAmount: 100000 }
    }
]

const mockAgent = {
    id: '1',
    name: 'Γιώργος Παπαδόπουλος',
    phone: '+1570 32 56780',
    email: 'infogram@email.com',
    company: 'Γιώργος Παπάδοιος',
    isOnline: true
}

const mockCommunications = [
    {
        id: '1',
        agentName: 'Γιώργος Παπαδόπουλος',
        date: '23 ηον',
        preview: 'Σχετικά με την ασφάλειά σας...',
        unread: true
    }
]

const mockUser = {
    id: '1',
    name: 'Μαρία Οικονόμου',
    email: 'maria@example.com',
    isOnline: true
}

export default function MobileUITestPage() {
    const [activeScreen, setActiveScreen] = useState<'policies' | 'agent' | 'profile'>('policies')

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-900">
            {/* Screen Selector */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-stone-800 border-b border-stone-300 dark:border-stone-700 p-4">
                <div className="max-w-md mx-auto flex gap-2">
                    <button
                        onClick={() => setActiveScreen('policies')}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${activeScreen === 'policies'
                            ? 'bg-teal-600 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                    >
                        My Policies
                    </button>
                    <button
                        onClick={() => setActiveScreen('agent')}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${activeScreen === 'agent'
                            ? 'bg-teal-600 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                    >
                        My Agent
                    </button>
                    <button
                        onClick={() => setActiveScreen('profile')}
                        className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${activeScreen === 'profile'
                            ? 'bg-teal-600 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                    >
                        My Profile
                    </button>
                </div>
            </div>

            {/* Screen Content */}
            <div className="pt-20">
                {activeScreen === 'policies' && (
                    <MyPoliciesScreen
                        policies={mockPolicies}
                        onViewPolicy={(id) => console.log('View policy:', id)}
                        onAddPolicy={() => console.log('Add policy')}
                    />
                )}

                {activeScreen === 'agent' && (
                    <MyAgentScreen
                        agent={mockAgent}
                        recentCommunications={mockCommunications}
                        onCall={() => console.log('Call agent')}
                        onEmail={() => console.log('Email agent')}
                        onChat={() => console.log('Chat with agent')}
                        onViewCommunication={(id) => console.log('View communication:', id)}
                    />
                )}

                {activeScreen === 'profile' && (
                    <MyProfileScreen
                        user={mockUser}
                        onEditProfile={() => console.log('Edit profile')}
                        onPaymentMethods={() => console.log('Payment methods')}
                        onSettings={() => console.log('Settings')}
                        onHelp={() => console.log('Help')}
                        onLogout={() => console.log('Logout')}
                    />
                )}
            </div>
        </div>
    )
}
