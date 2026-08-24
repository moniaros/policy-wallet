"use client"

import React from 'react'
import Link from 'next/link'
import type { NavigationGroup } from './AppShell'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'

export interface MainNavProps {
    navigation: NavigationGroup[]
    /** Fired alongside navigation (analytics, closing the mobile drawer). */
    onNavigate?: (href: string) => void
}

/** Shared classes for every nav row, so the <Link> and the '#' <button> match.
 *  min-h-11: py-3 + text-sm happens to reach 44px today, but the touch floor
 *  must not depend on a line-height staying put — the explicit token is what
 *  tests/unit/shell-chrome-invariants.test.tsx checks. */
const ROW_CLASSES = `
    w-full min-h-11 flex items-center gap-2.5 px-3 py-3 rounded-2xl text-sm font-semibold
    xl:gap-3 xl:px-4
    transition-all duration-300 group relative isolate
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
`

export function MainNav({ navigation, onNavigate }: MainNavProps) {
    const { t } = useLanguage()
    return (
        <nav aria-label={t.nav.primaryNavigation} className="px-3 space-y-6">
            {navigation.map((group, groupIndex) => (
                <div key={groupIndex}>
                    {group.title && (
                        <div className="px-3 mb-2 text-kicker font-semibold text-muted-foreground uppercase tracking-[0.22em]">
                            {group.title}
                        </div>
                    )}
                    <ul className="space-y-1">
                        {group.items.map((item, itemIndex) => {
                            const rowClassName = `${ROW_CLASSES}
                    ${item.isActive
                                    ? 'text-white dark:text-[#1A2420]'
                                    : 'text-black/60 dark:text-white/65 hover:text-black dark:hover:text-white'
                                }
                    ${item.isLocked ? 'opacity-70 grayscale-[0.5]' : ''}`

                            const rowContent = (
                                <>
                                    {/* Liquid Background for Active Item */}
                                    {item.isActive && (
                                        <motion.div
                                            layoutId="activeNav"
                                            className="absolute inset-0 bg-primary rounded-2xl shadow-xl -z-10"
                                            transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                        />
                                    )}

                                    {/* Hover State Background */}
                                    <div className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-20" />

                                    {item.icon && (
                                        <span className={`flex-shrink-0 w-5 h-5 transition-all duration-300 group-hover:scale-110 ${item.isActive ? 'text-white dark:text-[#1A2420]' : 'text-muted-foreground group-hover:text-black dark:group-hover:text-mint'}`}>
                                            {item.icon}
                                        </span>
                                    )}

                                    {/* Wraps rather than truncates. At the lg band the row has ~100px for
                                        text while a plan badge takes 43px, so "Ανάλυση Κάλυψης"
                                        was rendering as "Ανάλυση…". An ellipsis in PRIMARY navigation
                                        hides where a link goes; a second line costs 20px and hides
                                        nothing. */}
                                    <span className="min-w-0 flex-1 text-left tracking-tight">{item.label}</span>

                                    {/* Badges */}
                                    {item.variant === 'pro' && !item.isLocked && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-black text-white text-kicker font-bold uppercase tracking-widest shadow-sm">
                                            Plus
                                        </span>
                                    )}

                                    {item.variant === 'plus' && !item.isLocked && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary dark:text-mint text-kicker font-bold uppercase tracking-widest border border-primary/30">
                                            Starter
                                        </span>
                                    )}

                                    {item.isLocked && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-kicker font-bold text-black/60 dark:text-white/60 uppercase tracking-wider border border-black/10 dark:border-white/15">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            {item.variant === 'pro' ? 'Plus' : 'Lock'}
                                        </span>
                                    )}

                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span
                                            className={`
                        flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full
                        ${item.isActive
                                                    ? 'bg-white/20 text-white dark:bg-black/15 dark:text-[#1A2420]'
                                                    : 'bg-primary/15 text-primary dark:text-mint'
                                                }
                      `}
                                        >
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )

                            return (
                                <li key={itemIndex}>
                                    {/* Real links: middle-click, open-in-new-tab and the SR "link,
                                        N of M" semantics all depend on an <a>. Non-route hrefs
                                        ('#logout') stay buttons, which is what they actually are. */}
                                    {item.href.startsWith('#') ? (
                                        <button
                                            type="button"
                                            onClick={() => onNavigate?.(item.href)}
                                            className={rowClassName}
                                        >
                                            {rowContent}
                                        </button>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            onClick={() => onNavigate?.(item.href)}
                                            aria-current={item.isActive ? 'page' : undefined}
                                            className={rowClassName}
                                        >
                                            {rowContent}
                                        </Link>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}

            {/* Persistent Help Link */}
            <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/15">
                <Link
                    href="/help"
                    onClick={() => onNavigate?.('/help')}
                    // min-h-11: py-2 + text-sm rendered ~36px — under the 44px touch
                    // floor the rest of the shell chrome holds.
                    className="w-full min-h-11 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-black/55 hover:text-black dark:text-white/60 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t.common.needHelp}</span>
                </Link>
            </div>
        </nav>
    )
}
