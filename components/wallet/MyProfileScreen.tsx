"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronRightIcon } from '@/components/icons/PolicyIcons'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import Image from 'next/image'
import { User, CreditCard, Settings, HelpCircle, LogOut } from 'lucide-react'

interface UserData {
    id: string
    name: string
    email: string
    photoUrl?: string
    isOnline?: boolean
}

interface MyProfileScreenProps {
    user?: UserData
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
            icon: <User className="w-5 h-5" />,
            label: language === 'el' ? 'Προσωπικά στοιχεία' : 'Personal profile',
            sublabel: user?.name || '',
            onClick: onEditProfile
        },
        {
            icon: <CreditCard className="w-5 h-5" />,
            label: language === 'el' ? 'Μέθοδοι πληρωμής' : 'Payment methods',
            sublabel: language === 'el' ? 'Κάρτες και χρεώσεις' : 'Cards and billing',
            onClick: onPaymentMethods
        },
        {
            icon: <Settings className="w-5 h-5" />,
            label: language === 'el' ? 'Ρυθμίσεις' : 'Settings',
            sublabel: language === 'el' ? 'Γλώσσα και ειδοποιήσεις' : 'Language and notifications',
            onClick: onSettings
        },
        {
            icon: <HelpCircle className="w-5 h-5" />,
            label: language === 'el' ? 'Βοήθεια' : 'Help',
            sublabel: language === 'el' ? 'Υποστήριξη και οδηγοί' : 'Support and guides',
            onClick: onHelp
        },
        {
            icon: <LogOut className="w-5 h-5" />,
            label: language === 'el' ? 'Αποσύνδεση' : 'Sign out',
            sublabel: language === 'el' ? 'Τερματισμός συνεδρίας' : 'End session',
            onClick: onLogout,
            danger: true
        }
    ]

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-28">
            <div className="px-5 pt-6 pb-6 sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-black/10 dark:border-white/15">
                <PolicyWalletLogo size="sm" language={language} />
            </div>

            <div className="px-5 pb-10">
                <div className="flex items-center gap-4 mb-6 mt-2">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white dark:bg-black border border-black/10 dark:border-white/15">
                            {user?.photoUrl ? (
                                <Image
                                    src={user.photoUrl}
                                    alt={user.name}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#1FDC86] text-white">
                                    <span className="text-2xl font-black">{(user?.name || 'U')[0]}</span>
                                </div>
                            )}
                        </div>
                        {user?.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#1FDC86] border-2 border-white dark:border-black rounded-full" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <h1 className="text-2xl font-black text-black dark:text-white tracking-tight truncate">
                            {user?.name || (language === 'el' ? 'Χρήστης' : 'User')}
                        </h1>
                        <p className="text-black/55 dark:text-white/65 text-sm truncate">{user?.email}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`w-full flex items-center gap-4 p-4 bg-white dark:bg-black rounded-2xl border border-black/10 dark:border-white/15 transition-all active:scale-[0.98] text-left cursor-pointer ${item.danger ? 'hover:border-red-300 dark:hover:border-red-800' : 'hover:border-[#1FDC86]/35'}`}
                        >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.danger ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-black/5 dark:bg-black text-[#1FDC86]'}`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-black tracking-tight ${item.danger ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                                    {item.label}
                                </h3>
                                <p className="text-xs text-black/55 dark:text-white/65 truncate">{item.sublabel}</p>
                            </div>
                            <ChevronRightIcon className={`w-4 h-4 ${item.danger ? 'text-red-300' : 'text-black/45 dark:text-white/55'}`} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
