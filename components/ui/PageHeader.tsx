"use client"

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { PageContainer, type PageContainerWidth } from './PageContainer'

interface PageHeaderProps {
    title: string
    subtitle?: string
    actions?: ReactNode
    sticky?: boolean
    className?: string
    /** Must match the width of the page body this header sits above. */
    width?: PageContainerWidth
}

export function PageHeader({
    title,
    subtitle,
    actions,
    sticky = true,
    className = '',
    width = 'default'
}: PageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                ${sticky ? 'sticky top-0 z-40 backdrop-blur-xl bg-white/95 dark:bg-black/95 border-b border-black/10 dark:border-white/10' : 'bg-white dark:bg-black'}
                ${className}
            `}
        >
            <PageContainer width={width} className="py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-semibold text-black dark:text-white tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-2 text-base text-black/60 dark:text-white/70 leading-relaxed">
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
            </PageContainer>
        </motion.div>
    )
}
