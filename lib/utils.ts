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
                    ],
                },
            ],
        },
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
