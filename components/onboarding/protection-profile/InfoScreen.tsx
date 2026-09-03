"use client"

import { forwardRef } from "react"
import type { LucideIcon } from "lucide-react"

/** Orientation only: what the next minutes are, in the person's own terms. */
export const InfoScreen = forwardRef<HTMLHeadingElement, {
    title: string
    body1: string
    body2: string
    chips: Array<{ icon: LucideIcon; label: string }>
    cta: { label: string; onClick: () => void }
}>(function InfoScreen({ title, body1, body2, chips, cta }, headingRef) {
    return (
        <section>
            <h1 ref={headingRef} tabIndex={-1} className="text-h3 font-semibold tracking-tight text-foreground outline-none">
                {title}
            </h1>
            <p className="mt-3 text-body-lg leading-relaxed text-foreground">{body1}</p>
            <p className="mt-2 text-body-lg leading-relaxed text-muted-foreground">{body2}</p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label={title}>
                {chips.map(({ icon: Icon, label }) => (
                    <li key={label} className="pw-subcard flex items-center gap-2 px-3 py-2 text-caption font-medium text-foreground">
                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {label}
                    </li>
                ))}
            </ul>
            <div className="mt-6">
                <button type="button" onClick={cta.onClick} className="pw-primary-button w-full sm:w-auto">
                    {cta.label}
                </button>
            </div>
        </section>
    )
})
