"use client"

import { cn } from '@/lib/utils'
import type { StatusTone } from '@/lib/wallet/policy-status-view'
import { TONE_PILL } from '@/lib/wallet/policy-status-view'
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Loader2, MinusCircle } from 'lucide-react'

const TONE_ICON: Record<StatusTone, React.ElementType> = {
    positive: CheckCircle2,
    warning: AlertTriangle,
    critical: Clock,
    neutral: MinusCircle,
    info: Loader2,
}

/**
 * The one status pill in the wallet. Callers pass a tone + label from
 * `getPolicyStatusView` — they never pick colours themselves, which is what let
 * the same policy render green on one breakpoint and red on another.
 */
export function StatusPill({
    tone,
    label,
    icon = true,
    className,
}: {
    tone: StatusTone
    label: string
    icon?: boolean
    className?: string
}) {
    const Icon = tone === 'neutral' && !label ? HelpCircle : TONE_ICON[tone]

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                TONE_PILL[tone],
                className
            )}
        >
            {icon && <Icon className={cn('h-3 w-3', tone === 'info' && 'animate-spin')} />}
            {label}
        </span>
    )
}
