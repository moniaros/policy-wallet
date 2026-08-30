/**
 * The Grafí logomark, inline so it recolours with `currentColor` and the
 * `--fg-brand` role in both themes (the SVG file in public/brand is the same
 * drawing — kept for favicons and OG images, where CSS cannot reach).
 */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            role={title ? "img" : undefined}
            aria-hidden={title ? undefined : true}
            aria-label={title}
            focusable="false"
        >
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M6 2.5 h12 A3.5 3.5 0 0 1 21.5 6 v12 a3.5 3.5 0 0 1 -3.5 3.5 H6 A3.5 3.5 0 0 1 2.5 18 V6 A3.5 3.5 0 0 1 6 2.5 Z M21.5 9 H15 a3 3 0 0 0 0 6 h6.5 Z"
            />
            <circle cx="16.4" cy="12" r="2" className="fill-fg-brand" />
        </svg>
    )
}
