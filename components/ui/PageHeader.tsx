"use client"

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageHeaderProps {
    title: string
    subtitle?: string
    actions?: ReactNode
    sticky?: boolean
    className?: string
}

export function PageHeader({
    title,
    subtitle,
    actions,
    sticky = true,
    className = ''
}: PageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                ${sticky ? 'sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800' : 'bg-white dark:bg-stone-950'}
                ${className}
            `}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-2 text-base text-stone-600 dark:text-stone-400 leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex-shrink-0">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
