/**
 * The single «ή» between the social row and the email form (brief §2.3).
 * Render it only when the social row rendered something — the caller checks
 * `liveProvidersFor(role).length`.
 */
export function AuthDivider({ label }: { label: string }) {
    return (
        <div role="separator" aria-label={label} className="flex items-center gap-g-4 py-g-2">
            <span aria-hidden className="h-px flex-1 bg-border-subtle" />
            <span className="text-g-caption font-medium text-fg-secondary">{label}</span>
            <span aria-hidden className="h-px flex-1 bg-border-subtle" />
        </div>
    )
}
