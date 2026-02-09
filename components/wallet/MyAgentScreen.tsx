"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { ChatIcon } from '@/components/icons/PolicyIcons'
import { PolicyWalletLogo } from '@/components/branding/Logo'
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

    const copy = {
        title: language === 'el' ? 'Ο Σύμβουλός Μου' : 'My Advisor',
        noAgentTitle: language === 'el' ? 'Δεν έχει οριστεί σύμβουλος' : 'No advisor assigned',
        noAgentDescription: language === 'el' ? 'Μπορείς να κοινοποιήσεις ένα ασφαλιστήριο για να ξεκινήσεις συνεργασία.' : 'Share a policy to start collaborating with an advisor.',
        call: language === 'el' ? 'Κλήση' : 'Call',
        email: language === 'el' ? 'Email' : 'Email',
        chat: language === 'el' ? 'Συνομιλία' : 'Chat',
        recent: language === 'el' ? 'Πρόσφατη επικοινωνία' : 'Recent communication',
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-stone-950 dark:to-stone-900 pb-28">
            <div className="bg-white/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-10 backdrop-blur-md">
                <div className="max-w-md mx-auto px-4 py-4">
                    <PolicyWalletLogo size="sm" language={language} />
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{copy.title}</p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-5">
                {agent ? (
                    <>
                        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm">
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
                                            <div className="w-full h-full flex items-center justify-center text-stone-500 dark:text-stone-300 font-black text-2xl">
                                                {agent.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    {agent.isOnline && (
                                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-stone-900 rounded-full" />
                                    )}
                                </div>
                            </div>

                            <h2 className="text-xl font-black text-stone-900 dark:text-white text-center mb-1">{agent.name}</h2>
                            {agent.company && (
                                <p className="text-sm text-stone-500 dark:text-stone-400 text-center mb-1">{agent.company}</p>
                            )}
                            <p className="text-sm text-stone-500 dark:text-stone-400 text-center">{agent.phone}</p>
                            <p className="text-sm text-stone-500 dark:text-stone-400 text-center mb-5">{agent.email}</p>

                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={onCall}
                                    className="flex flex-col items-center gap-1.5 p-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                                    aria-label={copy.call}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-xs font-bold">{copy.call}</span>
                                </button>

                                <button
                                    onClick={onEmail}
                                    className="flex flex-col items-center gap-1.5 p-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                                    aria-label={copy.email}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-bold">{copy.email}</span>
                                </button>

                                <button
                                    onClick={onChat}
                                    className="flex flex-col items-center gap-1.5 p-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                                    aria-label={copy.chat}
                                >
                                    <ChatIcon className="w-5 h-5" />
                                    <span className="text-xs font-bold">{copy.chat}</span>
                                </button>
                            </div>
                        </div>

                        {recentCommunications.length > 0 && (
                            <div>
                                <h3 className="text-base font-black text-stone-900 dark:text-white mb-3">{copy.recent}</h3>
                                <div className="space-y-3">
                                    {recentCommunications.map((comm) => (
                                        <button
                                            key={comm.id}
                                            onClick={() => onViewCommunication?.(comm.id)}
                                            className="w-full bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 transition-all active:scale-[0.98] text-left cursor-pointer"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-bold text-stone-900 dark:text-white">{comm.agentName}</h4>
                                                        <span className="text-xs text-stone-500 dark:text-stone-400">{comm.date}</span>
                                                    </div>
                                                    <p className="text-sm text-stone-600 dark:text-stone-400 truncate">{comm.preview}</p>
                                                </div>
                                                {comm.unread && <span className="w-2.5 h-2.5 rounded-full bg-teal-500 mt-1" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
                        <div className="w-16 h-16 mx-auto mb-5 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2">{copy.noAgentTitle}</h3>
                        <p className="text-stone-600 dark:text-stone-400 text-sm max-w-[260px] mx-auto">{copy.noAgentDescription}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
