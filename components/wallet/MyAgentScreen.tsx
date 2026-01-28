"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { ChatIcon, ChevronRightIcon } from '@/components/icons/PolicyIcons'
import Image from 'next/image'

interface Agent {
    id: string
    name: string
    phone: string
    email: string
    company?: string
    photoUrl?: string
    isOnline?: boolean
}

interface RecentCommunication {
    id: string
    agentName: string
    agentPhotoUrl?: string
    date: string
    preview: string
    unread?: boolean
}

interface MyAgentScreenProps {
    agent?: Agent
    recentCommunications?: RecentCommunication[]
    onCall?: () => void
    onEmail?: () => void
    onChat?: () => void
    onViewCommunication?: (id: string) => void
}

export function MyAgentScreen({
    agent,
    recentCommunications = [],
    onCall,
    onEmail,
    onChat,
    onViewCommunication
}: MyAgentScreenProps) {
    const { language } = useLanguage()

    return (
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-stone-900 dark:to-stone-800">
            {/* Header */}
            <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4">
                    <h1 className="text-2xl font-black text-stone-900 dark:text-white">
                        PolicyWallet
                    </h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                        {language === 'el' ? 'Ο Πράκτοράς Μου' : 'My Agent'}
                    </p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
                {agent ? (
                    <>
                        {/* Agent Profile Card */}
                        <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 border-2 border-stone-200 dark:border-stone-700 shadow-sm">
                            {/* Agent Photo */}
                            <div className="flex justify-center mb-4">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700">
                                        {agent.photoUrl ? (
                                            <Image
                                                src={agent.photoUrl}
                                                alt={agent.name}
                                                width={96}
                                                height={96}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-12 h-12 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    {agent.isOnline && (
                                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-stone-800 rounded-full"></div>
                                    )}
                                </div>
                            </div>

                            {/* Agent Info */}
                            <h2 className="text-xl font-black text-stone-900 dark:text-white text-center mb-1">
                                {agent.name}
                            </h2>
                            <p className="text-sm text-stone-600 dark:text-stone-400 text-center mb-1">
                                {agent.phone}
                            </p>
                            {agent.company && (
                                <p className="text-sm text-stone-600 dark:text-stone-400 text-center mb-4">
                                    {agent.company}
                                </p>
                            )}
                            <p className="text-sm text-stone-600 dark:text-stone-400 text-center mb-6">
                                {agent.email}
                            </p>

                            {/* Contact Buttons */}
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={onCall}
                                    className="flex flex-col items-center gap-2 p-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-all active:scale-[0.98]"
                                    aria-label={language === 'el' ? 'Κλήση' : 'Call'}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-xs font-bold">{language === 'el' ? 'Κλήση' : 'Call'}</span>
                                </button>

                                <button
                                    onClick={onEmail}
                                    className="flex flex-col items-center gap-2 p-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-all active:scale-[0.98]"
                                    aria-label="Email"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-bold">Email</span>
                                </button>

                                <button
                                    onClick={onChat}
                                    className="flex flex-col items-center gap-2 p-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-all active:scale-[0.98]"
                                    aria-label="Chat"
                                >
                                    <ChatIcon className="w-6 h-6" />
                                    <span className="text-xs font-bold">Chat</span>
                                </button>
                            </div>
                        </div>

                        {/* Recent Communications */}
                        {recentCommunications.length > 0 && (
                            <div>
                                <h3 className="text-lg font-black text-stone-900 dark:text-white mb-3">
                                    {language === 'el' ? 'Πρόσφατες Επικοινωνίες' : 'Recent Communications'}
                                </h3>
                                <div className="space-y-3">
                                    {recentCommunications.map(comm => (
                                        <button
                                            key={comm.id}
                                            onClick={() => onViewCommunication?.(comm.id)}
                                            className="w-full bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all active:scale-[0.98] text-left"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700">
                                                    {comm.agentPhotoUrl ? (
                                                        <Image
                                                            src={comm.agentPhotoUrl}
                                                            alt={comm.agentName}
                                                            width={48}
                                                            height={48}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-bold text-stone-900 dark:text-white">
                                                            {comm.agentName}
                                                        </h4>
                                                        <span className="text-xs text-stone-500 dark:text-stone-400">
                                                            {comm.date}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-stone-600 dark:text-stone-400 truncate">
                                                        {comm.preview}
                                                    </p>
                                                </div>
                                                {comm.unread && (
                                                    <div className="flex-shrink-0 w-3 h-3 bg-teal-500 rounded-full"></div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-stone-400 dark:text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
                            {language === 'el' ? 'Δεν έχετε πράκτορα' : 'No agent assigned'}
                        </h3>
                        <p className="text-stone-600 dark:text-stone-400">
                            {language === 'el'
                                ? 'Επικοινωνήστε μαζί μας για να σας αναθέσουμε έναν πράκτορα'
                                : 'Contact us to get assigned an agent'}
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 safe-area-inset-bottom">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-around">
                    <button className="flex flex-col items-center gap-1 text-stone-400 dark:text-stone-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Αρχή' : 'Home'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-stone-400 dark:text-stone-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Συμβόλαια' : 'Policies'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-stone-900 dark:text-white">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Πράκτορας' : 'Agent'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-stone-400 dark:text-stone-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Προφίλ' : 'Profile'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
