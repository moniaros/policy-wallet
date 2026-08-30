import Link from "next/link"
import { cn } from "@/lib/utils"

/** LifeEventChips (§5.3, §8.10): the ten events as links into the re-check flow. */
export function LifeEventChips({ chips, className }: { chips: ReadonlyArray<{ id: string; label: string; href: string }>; className?: string }) {
    return (
        <ul className={cn("flex flex-wrap gap-g-2", className)}>
            {chips.map((c) => (
                <li key={c.id}>
                    <Link
                        href={c.href}
                        className="g-row-press inline-flex min-h-11 items-center rounded-g-pill border border-border-strong bg-surface-raised px-g-4 text-g-app-body-sm font-medium text-fg-primary hover:bg-surface-sunken focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus"
                    >
                        {c.label}
                    </Link>
                </li>
            ))}
        </ul>
    )
}
