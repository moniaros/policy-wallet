import { notFound } from "next/navigation"
import { StyleguideSheets } from "./StyleguideSheets"

/**
 * /styleguide — Grafí's living documentation. DEV-ONLY: 404s in production.
 *
 * This page is also the token pipeline's PROOF OF USE: Tailwind emits the
 * `@theme inline` utilities (bg-surface-*, text-fg-*, bg-state-*) only when a
 * source file uses them, so a token layer with no consumer looks generated and
 * is actually inert. The swatches below are that consumer, and
 * tests/unit/grafi-tokens.test.ts asserts this file exists and uses the core
 * roles — deleting the styleguide would silently de-generate the utilities.
 *
 * G2 (application tier): every sheet renders TWICE — once on the page's theme
 * and once inside a `.dark` wrapper — so both themes are verified side by side
 * without touching the user's preference. The class names below are pinned by
 * the guard: bg-surface-base, text-fg-primary, bg-state-gap-fill,
 * text-state-gap, bg-action-primary-bg, rounded-g-pill.
 */
export default function Styleguide() {
    if (process.env.NODE_ENV === "production") notFound()

    const roles = [
        "surface-base", "surface-raised", "surface-sunken", "surface-wash", "surface-inverse", "surface-overlay", "surface-blur",
        "fg-primary", "fg-secondary", "fg-faint", "fg-disabled", "fg-brand", "fg-on-brand",
        "border-subtle", "border-strong", "border-focus", "border-hair",
        "state-covered", "state-gap", "state-review",
        "action-primary-bg", "action-primary-hover", "action-secondary-bg", "action-secondary-border", "action-danger", "action-danger-hover",
    ] as const

    return (
        <main className="min-h-screen bg-surface-base p-g-6 text-fg-primary md:p-g-10">
            <h1 className="font-display text-g-title-lg">Grafí — tokens &amp; components</h1>
            <p className="mt-2 max-w-[66ch] text-fg-secondary">
                Generated from <code>tokens/*.json</code> via <code>npm run tokens</code>. Each sheet renders
                on the current theme and again inside a <code>.dark</code> wrapper.
            </p>
            <div className="mt-g-8 grid gap-g-8 lg:grid-cols-2">
                <section data-sheet="light" className="rounded-g-card border border-border-subtle bg-surface-base p-g-4">
                    <StyleguideSheets theme="light" />
                </section>
                <section data-sheet="dark" className="dark rounded-g-card border border-border-subtle bg-surface-base p-g-4 text-fg-primary">
                    <StyleguideSheets theme="dark" />
                </section>
            </div>
            <span className="sr-only">{roles.join(" ")}</span>
            {/* pinned consumers */}
            <span className="sr-only rounded-g-pill bg-state-gap-fill text-state-gap bg-action-primary-bg">pinned</span>
        </main>
    )
}
