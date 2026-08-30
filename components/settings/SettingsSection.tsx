"use client"

import { useId, type ReactNode } from "react"

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
    children: ReactNode
    className?: string
}

/**
 * A settings card.
 *
 * The old settings tab set every heading in `text-kicker font-black uppercase
 * tracking-widest`, so a section title, a field label and a table header all
 * shouted at the same volume and nothing led the eye. Here the eyebrow is the
 * only uppercase element and the title is the largest thing in the card.
 */
export function SettingsSection({
    title,
    description,
    action,
    tone = "default",
    children,
    className = "",
}: SettingsSectionProps) {
    const headingId = useId()

    return (
        <section
            aria-labelledby={headingId}
            className={`pw-card pw-pad mx-g-4 tablet:mx-0 ${
                tone === "danger" ? "border-red-500/30 dark:border-red-500/25" : ""
            } ${className}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2
                        id={headingId}
                        className={`text-lead font-semibold tracking-tight ${
                            tone === "danger" ? "text-red-700 dark:text-red-300" : "text-black dark:text-white"
                        }`}
                    >
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{description}</p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            <div className="mt-4">{children}</div>
        </section>
    )
}

/** Rows inside a section, separated the way the policy brief separates its rows. */
export function SettingsRowList({ children }: { children: ReactNode }) {
    return <div className="divide-y divide-black/5 dark:divide-white/10">{children}</div>
}
