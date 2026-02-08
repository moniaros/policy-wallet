"use client"

import React, { useState } from 'react'
import type { UserRole } from './AppShell'
import { CheckCircle2 } from 'lucide-react'

export interface RoleSwitcherProps {
    currentRole: UserRole
    availableRoles: UserRole[]
    onRoleSwitch?: (role: UserRole) => void
}

export function RoleSwitcher({ currentRole, availableRoles, onRoleSwitch }: RoleSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200/50 dark:border-stone-700/50 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all group"
            >
                <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-500 transition-colors">
                        Viewing as
                    </span>
                    <span className="text-xs font-black text-stone-900 dark:text-stone-100 truncate tracking-tight">
                        {currentRole.label}
                    </span>
                </div>
                <div className={`p-1 rounded-lg bg-stone-200/50 dark:bg-stone-700/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-3 z-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-stone-200/50 dark:border-stone-700/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        {availableRoles.map((role) => (
                            <button
                                key={role.role}
                                onClick={() => {
                                    onRoleSwitch?.(role)
                                    setIsOpen(false)
                                }}
                                className={`
                                    w-full px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest transition-all
                                    ${role.role === currentRole.role
                                        ? 'bg-teal-500 text-white'
                                        : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
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
