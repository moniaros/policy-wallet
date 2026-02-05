"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronRightIcon } from '@/components/icons/PolicyIcons'
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
            icon: <User className="w-6 h-6" />,
            label: language === 'el' ? 'Προσωπικά Στοιχεία' : 'Personal Profile',
            sublabel: user?.name || '',
            onClick: onEditProfile
        },
        {
            icon: <CreditCard className="w-6 h-6" />,
            label: language === 'el' ? 'Μέθοδοι Πληρωμής' : 'Payment Methods',
            sublabel: language === 'el' ? 'Διαχείριση καρτών' : 'Manage cards',
            onClick: onPaymentMethods
        },
        {
            icon: <Settings className="w-6 h-6" />,
            label: language === 'el' ? 'Ρυθμίσεις' : 'System Settings',
            sublabel: language === 'el' ? 'Γλώσσα & Ειδοποιήσεις' : 'Language & Notifications',
            onClick: onSettings
        },
        {
            icon: <HelpCircle className="w-6 h-6" />,
            label: language === 'el' ? 'Βοήθεια' : 'Support Center',
            sublabel: language === 'el' ? 'Επικοινωνία με υποστήριξη' : 'Contact support',
            onClick: onHelp
        },
        {
            icon: <LogOut className="w-6 h-6" />,
            label: language === 'el' ? 'Αποσύνδεση' : 'Sign Out',
            sublabel: language === 'el' ? 'Τερματισμός συνεδρίας' : 'End session',
            onClick: onLogout,
            danger: true
        }
    ]

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            {/* Branded Header */}
            <div className="px-6 pt-12 pb-8 flex items-center justify-between sticky top-0 z-20 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-md">
                <div className="flex items-center gap-0.5">
                    <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                    <span className="text-2xl font-black tracking-tight text-teal-600">Wallet</span>
                </div>
            </div>

            <div className="px-6 pb-12">
                <div className="flex items-center gap-6 mb-8">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-white dark:bg-stone-800 border-4 border-white dark:border-stone-800 shadow-2xl transition-transform active:scale-95">
                            {user?.photoUrl ? (
                                <Image
                                    src={user.photoUrl}
                                    alt={user.name}
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-teal-600 text-white">
                                    <span className="text-3xl font-black">{(user?.name || 'U')[0]}</span>
                                </div>
                            )}
                        </div>
                        {user?.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-stone-50 dark:border-stone-900 rounded-full"></div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-tight">
                            {user?.name || (language === 'el' ? 'Χρήστης' : 'User')}
                        </h1>
                        <p className="text-stone-500 font-bold text-sm tracking-tight">{user?.email}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`w-full flex items-center gap-4 p-5 bg-white dark:bg-stone-900 rounded-[28px] border border-stone-50 dark:border-stone-800/50 shadow-sm transition-all active:scale-[0.98] group ${item.danger ? 'hover:border-red-100 dark:hover:border-red-900/30' : 'hover:border-teal-100 dark:hover:border-teal-900/30'
                                }`}
                        >
                            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${item.danger
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600'
                                : 'bg-stone-50 dark:bg-stone-800 text-stone-400 group-hover:bg-teal-50 group-hover:text-teal-600'
                                }`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className={`text-base font-black tracking-tight ${item.danger ? 'text-red-600' : 'text-stone-900 dark:text-white'}`}>
                                    {item.label}
                                </h3>
                                <p className="text-xs font-bold text-stone-400">
                                    {item.sublabel}
                                </p>
                            </div>
                            <ChevronRightIcon className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${item.danger ? 'text-red-300' : 'text-stone-300'}`} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
