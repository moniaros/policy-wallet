"use client"

import React from 'react'
import type { NavigationGroup } from './AppShell'

export interface MainNavProps {
    navigation: NavigationGroup[]
    onNavigate?: (href: string) => void
}

export function MainNav({ navigation, onNavigate }: MainNavProps) {
    return (
        <nav className="px-3 space-y-6">
            {navigation.map((group, groupIndex) => (
                <div key={groupIndex}>
                    {group.title && (
                        <div className="px-3 mb-2 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                            {group.title}
                        </div>
                    )}
                    <ul className="space-y-1">
                        {group.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                                <button
                                    onClick={() => onNavigate?.(item.href)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 group relative
                    ${item.isActive
                                            ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                                        }
                    ${item.isLocked ? 'opacity-70 grayscale-[0.5]' : ''}
                  `}
                                >
                                    {item.icon && (
                                        <span className={`flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110 ${item.isActive ? 'text-white' : 'text-stone-400 dark:text-stone-500 group-hover:text-teal-600 dark:group-hover:text-teal-400'}`}>
                                            {item.icon}
                                        </span>
                                    )}

                                    <span className="flex-1 text-left truncate">{item.label}</span>

                                    {/* Badges */}
                                    {item.variant === 'pro' && !item.isLocked && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-200 to-yellow-400 text-[10px] font-black text-amber-900 uppercase tracking-widest shadow-sm">
                                            Pro
                                        </span>
                                    )}

                                    {item.variant === 'plus' && !item.isLocked && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                                            Plus
                                        </span>
                                    )}

                                    {item.isLocked && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-bold text-stone-500 uppercase tracking-wider border border-stone-200 dark:border-stone-700">
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
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
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
        </nav>
    )
}
