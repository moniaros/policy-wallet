import { ReactNode, ElementType } from 'react'
import { cn } from '@/lib/utils'

/**
 * The one page-width primitive.
 *
 * The app currently hand-rolls 8+ different max-widths (max-w-7xl, 6xl, 5xl,
 * 4xl, 3xl, [1200px], [1400px], [1240px]) against 3+ padding idioms, so two
 * adjacent pages rarely line up and admin pages have a flat non-responsive
 * gutter. Every new page should wrap its content in this; existing pages are
 * being migrated incrementally.
 *
 * The gutter (px-4 sm:px-6 lg:px-8) is deliberately the same at every width —
 * only the ceiling changes.
 */

const WIDTHS = {
    /** Standard app pages — dashboards, lists, admin tables. */
    default: 'max-w-7xl',
    /** Reading-width surfaces — forms, settings, single-column detail. */
    narrow: 'max-w-4xl',
    /** Dense data views that genuinely need the room. */
    wide: 'max-w-[1400px]',
    /** Opt out of the ceiling but keep the gutter. */
    full: 'max-w-none',
} as const

export type PageContainerWidth = keyof typeof WIDTHS

interface PageContainerProps {
    children: ReactNode
    width?: PageContainerWidth
    /** Render as a different element (e.g. "section", "header"). */
    as?: ElementType
    className?: string
}

export function PageContainer({
    children,
    width = 'default',
    as: Component = 'div',
    className,
}: PageContainerProps) {
    return (
        <Component className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', WIDTHS[width], className)}>
            {children}
        </Component>
    )
}
