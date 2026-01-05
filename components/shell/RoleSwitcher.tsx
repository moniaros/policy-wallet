import React, { useState } from 'react'
import type { UserRole } from './AppShell'

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
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
            >
                <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                        Viewing as
                    </span>
                    <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                        {currentRole.label}
                    </span>
                </div>
                <svg
                    className={`w-4 h-4 text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                        {availableRoles.map((role) => (
                            <button
                                key={role.role}
                                onClick={() => {
                                    onRoleSwitch?.(role)
                                    setIsOpen(false)
                                }}
                                className={`
                  w-full px-3 py-2 text-left text-sm font-medium transition-colors
                  ${role.role === currentRole.role
                                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                                    }
                `}
                            >
                                {role.label}
                                {role.role === currentRole.role && (
                                    <svg className="inline-block w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
