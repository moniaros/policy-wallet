import { notFound } from "next/navigation"
import { StyleguideAuthDemo } from "@/components/auth/StyleguideAuthDemo"
import { TrustPanel } from "@/components/auth/TrustPanel"

/**
 * /styleguide — Grafí's living documentation. DEV-ONLY: 404s in production.
 *
 * This page is also the token pipeline's PROOF OF USE: Tailwind emits the
 * `@theme inline` utilities (bg-surface-*, text-fg-*, bg-state-*) only when a
 * source file uses them, so a token layer with no consumer looks generated and
 * is actually inert. The swatches below are that consumer, and
 * tests/unit/grafi-tokens.test.ts asserts this file exists and uses the core
 * roles — deleting the styleguide would silently de-generate the utilities.
 */
export default function Styleguide() {
    if (process.env.NODE_ENV === "production") notFound()

    const roles = [
        "surface-base", "surface-raised", "surface-sunken", "surface-wash", "surface-inverse",
    ] as const

    return (
        <main className="min-h-screen bg-surface-base p-g-10 text-fg-primary">
            <h1 className="text-2xl font-bold">Grafí — tokens</h1>
            <p className="mt-2 text-fg-secondary">
                Generated from <code>tokens/*.json</code> via <code>npm run tokens</code>.
                Toggle <code>.dark</code> on &lt;html&gt; to see the second theme.
            </p>

            <h2 className="mt-g-8 font-semibold">Surfaces</h2>
            <div className="mt-g-3 flex flex-wrap gap-g-3">
                <div className="rounded-g-md border border-border-subtle bg-surface-base p-g-4">surface-base</div>
                <div className="rounded-g-md border border-border-subtle bg-surface-raised p-g-4">surface-raised</div>
                <div className="rounded-g-md border border-border-strong bg-surface-sunken p-g-4">surface-sunken</div>
                <div className="rounded-g-md bg-surface-wash p-g-4">surface-wash</div>
                <div className="rounded-g-md bg-surface-inverse p-g-4 text-fg-on-brand">surface-inverse</div>
            </div>

            <h2 className="mt-g-8 font-semibold">Text</h2>
            <p className="text-fg-primary">fg-primary — body text</p>
            <p className="text-fg-secondary">fg-secondary — supporting text</p>
            <p className="text-fg-brand font-semibold">fg-brand — the anchor green</p>

            <h2 className="mt-g-8 font-semibold">The three states — never a traffic light</h2>
            <div className="mt-g-3 flex flex-wrap gap-g-3">
                <span className="rounded-g-pill bg-state-covered-fill px-g-4 py-g-2 font-semibold text-state-covered">✓ Καλυμμένο</span>
                <span className="rounded-g-pill border border-state-gap-border bg-state-gap-fill px-g-4 py-g-2 font-semibold text-state-gap">◆ Κενό κάλυψης</span>
                <span className="rounded-g-pill bg-state-review-fill px-g-4 py-g-2 font-semibold text-state-review">? Χρειάζεται έλεγχο</span>
            </div>

            <h2 className="mt-g-8 font-semibold">Action</h2>
            <button className="rounded-g-pill bg-action-primary-bg px-g-6 py-g-3 font-semibold text-fg-on-brand transition-colors duration-200 hover:bg-action-primary-hover focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus">
                Primary action
            </button>
            <h2 className="mt-g-8 font-semibold">Auth components (brief A1)</h2>
            <p className="mt-2 max-w-[66ch] text-g-body-sm text-fg-secondary">
                AuthShell (split/single) is a full-viewport shell — see it live at /auth/signup/policyholder
                and /auth/signup/agent. Below: the form atoms in every state, the social buttons for all
                registered providers, and both TrustPanel variants on the brand fill.
            </p>
            <div className="mt-g-4">
                <StyleguideAuthDemo />
            </div>
            <div className="mt-g-6 grid max-w-[1100px] gap-g-6 lg:grid-cols-2">
                <div className="flex items-start justify-center rounded-g-lg bg-action-primary-bg p-g-6">
                    <TrustPanel variant="policyholder" />
                </div>
                <div className="flex items-start justify-center rounded-g-lg bg-action-primary-bg p-g-6">
                    <TrustPanel variant="agent" />
                </div>
            </div>
            <span className="sr-only">{roles.join(" ")}</span>
        </main>
    )
}
