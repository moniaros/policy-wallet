import { cn } from "@/lib/utils"

/**
 * PlatformNote (§5.3, §6): the «Σημείωση» block in the PRODUCT's voice (not
 * the analyst's) — one style, on every screen that shows an AI output. It is
 * the Article 50 transparency line and the Terms alignment line in one place:
 * what I read, that AI read it, that it may be wrong, that every element is
 * visible to check, and that it is not insurance advice.
 *
 * The disclosure guard (tests/unit/ai-output-carries-the-disclosure.test.ts)
 * recognises this component by name beside the legacy `AiDisclaimer`.
 */
export function PlatformNote({ title, body, extra, className }: { title: string; body: string; extra?: string; className?: string }) {
    return (
        <aside role="note" aria-label={title} className={cn("rounded-g-card border border-border-subtle bg-surface-sunken px-g-4 py-g-3", className)}>
            <p className="text-g-app-label font-semibold uppercase tracking-[0.06em] text-fg-faint">{title}</p>
            <p className="mt-g-1 text-g-app-body-sm text-fg-secondary">{body}</p>
            {extra && <p className="mt-g-1 text-g-app-body-sm text-fg-secondary">{extra}</p>}
        </aside>
    )
}
