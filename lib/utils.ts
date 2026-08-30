import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge only knows Tailwind's OWN scale. This design system defines
 * its own named type ladder in app/globals.css (--text-display … --text-micro),
 * and merge treated those as unknown classes — so `cn("text-caption", …)` could
 * silently DROP the size and fall back to the browser default. That is how the
 * auth language switcher ended up rendering at 16px in a 24px box while the
 * public header's rendered at 13px.
 *
 * Registering the ladder makes merge resolve conflicts within it instead of
 * discarding it, and keeps a later size in `className` correctly overriding an
 * earlier one in the base string.
 *
 * The Grafí tier repeats the lesson: `text-g-*` is its generated type ladder
 * and `text-fg-*` / `text-state-*` are its COLOR roles. Unregistered, merge
 * threw them into one group and deleted whichever came first — the hero's
 * primary Button shipped dark-on-green at 2.74:1 because `text-g-body-sm`
 * (the md size) silently removed `text-fg-on-brand` (the color). Lighthouse
 * caught it; this registration is the fix, not the component.
 */
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [
                {
                    text: [
                        "display",
                        "h1",
                        "h2",
                        "h3",
                        "title",
                        "lead",
                        "body-lg",
                        "body",
                        "body-sm",
                        "caption",
                        "kicker",
                        "micro",
                        // The generated Grafí ladder (text-g-display-xl … text-g-label)
                        (value: string) => value.startsWith("g-"),
                    ],
                },
            ],
            "text-color": [
                {
                    // Grafí colour roles: text-fg-primary/-secondary/-brand/-on-brand,
                    // text-state-covered/-gap/-review, text-surface-* (on-inverse text).
                    text: [
                        (value: string) => value.startsWith("fg-"),
                        (value: string) => value.startsWith("state-"),
                        (value: string) => value.startsWith("surface-"),
                    ],
                },
            ],
            // Application tier (G2): purpose-named radii (rounded-g-card …), the two
            // elevations (shadow-g-raised/-overlay) and the eases (ease-g-out/-spring).
            // Unregistered, merge would treat `shadow-g-raised` as a shadow COLOUR and
            // `rounded-g-card` as an unknown — the same silent deletion that shipped a
            // 2.74:1 CTA. Registered here first, then used.
            rounded: [{ rounded: [(value: string) => value.startsWith("g-")] }],
            shadow: [{ shadow: [(value: string) => value.startsWith("g-")] }],
            ease: [{ ease: [(value: string) => value.startsWith("g-")] }],
        },
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
