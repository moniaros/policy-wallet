/** The unread count on the bell — saturates at «9+» like every badge site (count-keys.ts). */
export function CountBadge({ count, saturated }: { count: number; saturated: string }) {
    if (count <= 0) return null
    return (
        <span
            data-count="notification.unreadCount"
            className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-g-pill bg-state-gap px-1 text-g-app-label font-semibold tabular-nums text-fg-on-brand"
        >
            {count > 9 ? saturated : count}
        </span>
    )
}
