"use client"

import React from 'react'
import Link from 'next/link'
import type { NavigationGroup } from './AppShell'
import { useLanguage } from '@/contexts/LanguageContext'
import { planTierName } from '@/lib/subscription-copy'

export interface MainNavProps {
    navigation: NavigationGroup[]
    /** Fired alongside navigation (analytics, closing the mobile drawer). */
    onNavigate?: (href: string) => void
}

/** Shared classes for every nav row, so the <Link> and the '#' <button> match.
 *  min-h-11: py-2.5 + text-sm happens to reach 44px today, but the touch floor
 *  must not depend on a line-height staying put — the explicit token is what
 *  tests/unit/shell-chrome-invariants.test.tsx checks. */
const ROW_CLASSES = `
    w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
    transition-colors group relative
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
`

/**
 * The sidebar's navigation. Direction A (2026-09-03): the active row is a
 * 3px brand bar at the sidebar's edge plus weight and a faint tint — not the
 * filled pill it used to be, which was the most saturated block on every page
 * and competed with the page's one primary button. Group titles are
 * sentence-case captions (Greek capitals drop their accents), and the help
 * entry is a quiet panel at the foot rather than one more row.
 */
export function MainNav({ navigation, onNavigate }: MainNavProps) {
    const { t, language } = useLanguage()
    return (
        <nav aria-label={t.nav.primaryNavigation} className="flex h-full flex-col px-3">
            <div className="space-y-5">
                {navigation.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {group.title && (
                            <p className="mb-1.5 px-3 text-caption font-semibold text-muted-foreground">
                                {group.title}
                            </p>
                        )}
                        <ul className="space-y-0.5">
                            {group.items.map((item, itemIndex) => {
                                const rowClassName = `${ROW_CLASSES}
                        ${item.isActive
                                        ? 'bg-primary/8 font-semibold text-foreground dark:bg-primary/15'
                                        : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }
                        ${item.isLocked ? 'opacity-70 grayscale-[0.5]' : ''}`

                                const rowContent = (
                                    <>
                                        {/* The active mark: a bar on the sidebar's own
                                            edge, outside the row's rounded box. */}
                                        {item.isActive && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-primary"
                                            />
                                        )}

                                        {item.icon && (
                                            <span className={`flex-shrink-0 w-5 h-5 transition-colors ${item.isActive ? 'text-primary dark:text-mint' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                {item.icon}
                                            </span>
                                        )}

                                        {/* Wraps rather than truncates. At the lg band the row has ~100px for
                                            text while a plan badge takes 43px, so "Ανάλυση Κάλυψης"
                                            was rendering as "Ανάλυση…". An ellipsis in PRIMARY navigation
                                            hides where a link goes; a second line costs 20px and hides
                                            nothing. */}
                                        <span className="min-w-0 flex-1 text-left">{item.label}</span>

                                        {/* Badges */}
                                        {item.variant === 'pro' && !item.isLocked && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-foreground text-background text-kicker font-bold uppercase tracking-widest">
                                                {planTierName('pro', language)}
                                            </span>
                                        )}

                                        {item.variant === 'plus' && !item.isLocked && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary dark:text-mint text-kicker font-bold uppercase tracking-widest border border-primary/30">
                                                {planTierName('plus', language)}
                                            </span>
                                        )}

                                        {item.isLocked && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-kicker font-bold text-muted-foreground uppercase tracking-wider border border-border">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                {item.variant === 'pro' ? 'Plus' : 'Lock'}
                                            </span>
                                        )}

                                        {item.badge !== undefined && item.badge > 0 && (
                                            /* Saturated at «9+» like every other badge site — the
                                               header bell and the tab bar cap there, and two
                                               renders of one count must not disagree on screen. */
                                            <span className="flex-shrink-0 rounded-full bg-primary px-2 py-0.5 text-micro font-bold text-primary-foreground tabular-nums">
                                                {item.badge > 9 ? '9+' : item.badge}
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
            </div>

            {/* Help — a quiet panel at the foot of the column, the reference's
                "Need help?" block. One link, 44px tall, sentence-case. */}
            <div className="mt-auto pt-6">
                <div className="rounded-xl bg-muted p-4">
                    <p className="text-sm font-semibold text-foreground">{t.common.needHelp}</p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{t.common.needHelpBody}</p>
                    <Link
                        href="/help"
                        onClick={() => onNavigate?.('/help')}
                        className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-mint"
                    >
                        {t.common.needHelpLink}
                    </Link>
                </div>
            </div>
        </nav>
    )
}
