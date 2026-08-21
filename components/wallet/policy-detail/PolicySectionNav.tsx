"use client"

export interface PolicySectionNavItem {
    id: string
    label: string
}

/**
 * Horizontal anchor navigation for the policy detail page sections.
 * Each target section must set `scroll-mt-*` so anchors land below the header.
 */
export function PolicySectionNav({ items, ariaLabel }: { items: PolicySectionNavItem[]; ariaLabel: string }) {
    if (items.length === 0) return null

    return (
        <nav aria-label={ariaLabel} className="mt-5">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.map((item) => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-black/70 transition-colors hover:border-primary/40 hover:text-primary dark:border-white/15 dark:bg-black dark:text-white/75 dark:hover:border-mint/40 dark:hover:text-mint"
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </nav>
    )
}
