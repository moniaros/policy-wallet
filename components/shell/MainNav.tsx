"use client"

import React from 'react'
import type { NavigationGroup } from './AppShell'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'

export interface MainNavProps {
    navigation: NavigationGroup[]
    onNavigate?: (href: string) => void
}

export function MainNav({ navigation, onNavigate }: MainNavProps) {
    const { t } = useLanguage()
    return (
        <nav className="px-3 space-y-6">
            {navigation.map((group, groupIndex) => (
                <div key={groupIndex}>
                    {group.title && (
                        <div className="px-3 mb-2 text-[10px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-[0.22em]">
                            {group.title}
                        </div>
                    )}
                    <ul className="space-y-1">
                        {group.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                                <button
                                    onClick={() => onNavigate?.(item.href)}
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold
                    transition-all duration-300 group relative isolate
                    ${item.isActive
                                            ? 'text-black'
                                            : 'text-black/60 dark:text-white/65 hover:text-black dark:hover:text-white'
                                        }
                    ${item.isLocked ? 'opacity-70 grayscale-[0.5]' : ''}
                  `}
                                >
                                    {/* Liquid Background for Active Item */}
                                    {item.isActive && (
                                        <motion.div
                                            layoutId="activeNav"
                                            className="absolute inset-0 bg-[#1FDC86] rounded-2xl shadow-xl -z-10"
                                            transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                        />
                                    )}

                                    {/* Hover State Background */}
                                    <div className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-20" />

                                    {item.icon && (
                                        <span className={`flex-shrink-0 w-5 h-5 transition-all duration-300 group-hover:scale-110 ${item.isActive ? 'text-black' : 'text-black/45 dark:text-white/55 group-hover:text-black dark:group-hover:text-[#1FDC86]'}`}>
                                            {item.icon}
                                        </span>
                                    )}

                                    <span className="flex-1 text-left truncate tracking-tight">{item.label}</span>

                                    {/* Badges */}
                                    {item.variant === 'pro' && !item.isLocked && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-black text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                            Pro
                                        </span>
                                    )}

                                    {item.variant === 'plus' && !item.isLocked && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-[#1FDC86]/20 text-black dark:text-[#1FDC86] text-[10px] font-bold uppercase tracking-widest border border-[#1FDC86]/30">
                                            Plus
                                        </span>
                                    )}

                                    {item.isLocked && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-bold text-black/60 dark:text-white/60 uppercase tracking-wider border border-black/10 dark:border-white/15">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            {item.variant === 'pro' ? 'Pro' : 'Lock'}
                                        </span>
                                    )}

                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span
                                            className={`
                        flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full
                        ${item.isActive
                                                    ? 'bg-black/20 text-black'
                                                    : 'bg-[#1FDC86]/15 text-black dark:text-[#1FDC86]'
                                                }
                      `}
                                        >
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            {/* Persistent Help Link */}
            <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/15">
                <button
                    onClick={() => onNavigate?.('/help')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-black/55 hover:text-black dark:text-white/60 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t.common.needHelp}</span>
                </button>
            </div>
        </nav>
    )
}
