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
                    transition-colors duration-150
                    ${item.isActive
                                            ? 'bg-teal-600 text-white'
                                            : 'text-stone-700 dark:text-stone-300 hover:bg-teal-50 dark:hover:bg-stone-700'
                                        }
                  `}
                                >
                                    {item.icon && (
                                        <span className="flex-shrink-0 w-5 h-5">
                                            {item.icon}
                                        </span>
                                    )}
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span
                                            className={`
                        flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full
                        ${item.isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
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
