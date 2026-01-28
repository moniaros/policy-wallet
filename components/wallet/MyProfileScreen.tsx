"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronRightIcon } from '@/components/icons/PolicyIcons'
import Image from 'next/image'

interface User {
    id: string
    name: string
    email: string
    photoUrl?: string
    isOnline?: boolean
}

interface MyProfileScreenProps {
    user?: User
    onEditProfile?: () => void
    onPaymentMethods?: () => void
    onSettings?: () => void
    onHelp?: () => void
    onLogout?: () => void
}

export function MyProfileScreen({
    user,
    onEditProfile,
    onPaymentMethods,
    onSettings,
    onHelp,
    onLogout
}: MyProfileScreenProps) {
    const { language } = useLanguage()

    const menuItems = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            label: language === 'el' ? 'Προσωπικά Στοιχεία' : 'Personal Information',
            sublabel: user?.name || '',
            onClick: onEditProfile
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            ),
            label: language === 'el' ? 'Μέθοδοι Πληρωμής' : 'Payment Methods',
            sublabel: language === 'el' ? 'Μέθοδοι Πληρωμής' : 'Payment Methods',
            onClick: onPaymentMethods
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            label: language === 'el' ? 'Ρυθμίσεις' : 'Settings',
            sublabel: language === 'el' ? 'Ρυθμίσεις' : 'Settings',
            onClick: onSettings
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            label: language === 'el' ? 'Βοήθεια' : 'Help',
            sublabel: language === 'el' ? 'Βοήθεια' : 'Help',
            onClick: onHelp
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            ),
            label: language === 'el' ? 'Αποσύνδεση' : 'Logout',
            sublabel: language === 'el' ? 'Αποσύνδεση' : 'Logout',
            onClick: onLogout,
            danger: true
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-stone-900 dark:to-stone-800">
            {/* Header */}
            <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4">
                    <h1 className="text-2xl font-black text-stone-900 dark:text-white">
                        PolicyWallet
                    </h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                        {language === 'el' ? 'Το Προφίλ Μου' : 'My Profile'}
                    </p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700">
                            {user?.photoUrl ? (
                                <Image
                                    src={user.photoUrl}
                                    alt={user.name}
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
                        {user?.isOnline && (
                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-stone-800 rounded-full"></div>
                        )}
                    </div>
                    <h2 className="text-xl font-black text-stone-900 dark:text-white mb-1">
                        {user?.name || (language === 'el' ? 'Χρήστης' : 'User')}
                    </h2>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        {user?.email || ''}
                    </p>
                </div>

                {/* Menu Items */}
                <div className="space-y-2">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`w-full flex items-center gap-4 p-4 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all active:scale-[0.98] ${item.danger ? 'hover:border-red-300 dark:hover:border-red-700' : ''
                                }`}
                        >
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${item.danger
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                    : 'bg-stone-50 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
                                }`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className={`font-bold ${item.danger
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-stone-900 dark:text-white'
                                    }`}>
                                    {item.label}
                                </h3>
                                {item.sublabel && item.sublabel !== item.label && (
                                    <p className="text-sm text-stone-600 dark:text-stone-400">
                                        {item.sublabel}
                                    </p>
                                )}
                            </div>
                            <ChevronRightIcon className={`w-5 h-5 flex-shrink-0 ${item.danger
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-stone-400 dark:text-stone-500'
                                }`} />
                        </button>
                    ))}
                </div>
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
                    <button className="flex flex-col items-center gap-1 text-stone-400 dark:text-stone-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Πράκτορας' : 'Agent'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-stone-900 dark:text-white">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Προφίλ' : 'Profile'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
