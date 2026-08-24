"use client"

import React, { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getRoleCopy } from '@/lib/i18n/role-copy'
import type { UserRole } from './AppShell'
import { CheckCircle2 } from 'lucide-react'

export interface RoleSwitcherProps {
    currentRole: UserRole
    availableRoles: UserRole[]
    onRoleSwitch?: (role: UserRole) => void
}

export function RoleSwitcher({ currentRole, availableRoles, onRoleSwitch }: RoleSwitcherProps) {
    const { language } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const [isOpen, setIsOpen] = useState(false)
    const menuTriggerRef = useRef<HTMLButtonElement>(null)
    const menuId = useId()

    // Escape-to-close with focus return; the dropdown had neither.
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            setIsOpen(false)
            menuTriggerRef.current?.focus()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen])

    return (
        <div className="relative">
            <button
                ref={menuTriggerRef}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full min-h-11 flex items-center justify-between px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 hover:bg-black/10 dark:hover:bg-white/10 transition-all group"
            >
                <div className="flex flex-col items-start min-w-0">
                    <span className="text-kicker font-bold uppercase tracking-widest text-muted-foreground group-hover:text-black/65 dark:group-hover:text-white/75 transition-colors">
                        {roleCopy.shell.roleViewingAsLabel}
                    </span>
                    <span className="text-xs font-semibold text-black dark:text-white truncate tracking-tight">
                        {currentRole.label}
                    </span>
                </div>
                <div className={`p-1 rounded-lg bg-black/10 dark:bg-white/10 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-3.5 h-3.5 text-black/60 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <>
                    <div
                        aria-hidden="true"
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div id={menuId} role="menu" className="absolute top-full left-0 right-0 mt-3 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-black/10 dark:border-white/15 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        {availableRoles.map((role) => (
                            <button
                                key={role.role}
                                onClick={() => {
                                    onRoleSwitch?.(role)
                                    setIsOpen(false)
                                }}
                                className={`
                                    w-full min-h-11 px-5 py-3 text-left text-micro font-bold uppercase tracking-widest transition-all
                                    ${role.role === currentRole.role
                                        ? 'bg-primary text-white dark:text-[#1A2420]'
                                        : 'text-black/60 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10'
                                    }
                                `}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{role.label}</span>
                                    {role.role === currentRole.role && (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
