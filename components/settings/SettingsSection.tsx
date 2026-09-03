"use client"

import { useId, type ReactNode } from "react"
import { Settings2, type LucideIcon } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"

interface SettingsSectionProps {
    title: string
    /** One line saying what this group of controls is for. */
    description?: ReactNode
    /** Optional right-aligned control in the heading row. */
    action?: ReactNode
    /**
     * "danger" is reserved for irreversible actions. It is a visual separation,
     * not a decoration — the section it marks must also confirm before acting.
     */
    tone?: "default" | "danger"
    /** The card head's icon — this card's own glyph, not the page's. */
    icon?: LucideIcon
    children: ReactNode
    className?: string
}

/**
 * A settings card.
 *
 * The old settings tab set every heading in `text-kicker font-black uppercase
 * tracking-widest`, so a section title, a field label and a table header all
 * shouted at the same volume and nothing led the eye. Here nothing is
 * uppercase and the title is the largest thing in the card.
 */
export function SettingsSection({
    title,
    description,
    action,
    tone = "default",
    icon,
    children,
    className = "",
}: SettingsSectionProps) {
    const headingId = useId()
    // One card head for every card in the app (Direction A). Each card names
    // its OWN glyph: a chip that repeated the page's icon down the column was
    // ornament — it could not tell one card from the next.
    const Icon = icon ?? Settings2

    return (
        <section
            aria-labelledby={headingId}
            className={`pw-card pw-pad ${
                tone === "danger" ? "border-status-danger-edge [&_h2]:text-status-danger" : ""
            } ${className}`}
        >
            <CardHead icon={Icon} title={title} id={headingId} meta={action} />
            {description && (
                <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{description}</p>
            )}

            <div className="mt-4">{children}</div>
        </section>
    )
}

/** Rows inside a section, separated the way the policy brief separates its rows. */
export function SettingsRowList({ children }: { children: ReactNode }) {
    return <div className="divide-y divide-border">{children}</div>
}
