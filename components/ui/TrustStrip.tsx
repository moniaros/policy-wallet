import { Globe, Lock, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Security/trust chip row (AES-256 · EU servers · GDPR). Shared between the
 * marketing hero and in-app trust surfaces — real icons, never emoji
 * (MASTER anti-pattern). Icons resolve from the item kind inside this
 * component so server pages can render it without passing component props.
 */
export type TrustItemKind = 'encryption' | 'eu' | 'gdpr' | 'generic'

const TRUST_ICONS: Record<TrustItemKind, LucideIcon> = {
    encryption: Lock,
    eu: Globe,
    gdpr: ShieldCheck,
    generic: ShieldCheck,
}

export interface TrustStripItem {
    kind: TrustItemKind
    label: string
}

export function TrustStrip({ items, className }: { items: TrustStripItem[]; className?: string }) {
    return (
        <div className={cn('flex flex-wrap items-center justify-center gap-3', className)}>
            {items.map((item) => {
                const Icon = TRUST_ICONS[item.kind]
                return (
                    <div
                        key={item.label}
                        /* Was three raw hexes with NO dark: variants at all, so on a
                           dark surface this rendered as a white chip with dark text —
                           the one component whose whole job is to look trustworthy.
                           Now on tokens, which flip. */
                        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground"
                    >
                        <Icon className="h-3.5 w-3.5 text-primary dark:text-mint" aria-hidden />
                        {item.label}
                    </div>
                )
            })}
        </div>
    )
}
