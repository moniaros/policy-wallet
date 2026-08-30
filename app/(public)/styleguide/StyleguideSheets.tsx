import { StatusChip, Button } from "@/src/design-system"
import { StyleguideInteractive } from "./StyleguideInteractive"
import { StyleguideProduct } from "./StyleguideProduct"

/**
 * The token sheets, rendered once per theme by the page. Server component —
 * nothing here needs state. Sample content is stamped as a sample.
 */
export function StyleguideSheets({ theme }: { theme: "light" | "dark" }) {
    return (
        <div className="flex flex-col gap-g-8">
            <p className="text-g-app-label uppercase tracking-[0.06em] text-fg-faint">{theme} · ΔΕΙΓΜΑ</p>

            <Sheet title="Surfaces">
                <div className="flex flex-wrap gap-g-3">
                    <Swatch className="border border-border-subtle bg-surface-base">surface-base</Swatch>
                    <Swatch className="border border-border-subtle bg-surface-raised">surface-raised</Swatch>
                    <Swatch className="border border-border-strong bg-surface-sunken">surface-sunken</Swatch>
                    <Swatch className="bg-surface-wash">surface-wash</Swatch>
                    <Swatch className="bg-surface-inverse text-fg-on-brand">surface-inverse</Swatch>
                    <Swatch className="bg-surface-overlay text-fg-on-brand">surface-overlay</Swatch>
                    <Swatch className="border border-border-hair bg-surface-blur backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]">surface-blur</Swatch>
                </div>
            </Sheet>

            <Sheet title="Text">
                <p className="text-fg-primary">fg-primary — body text</p>
                <p className="text-fg-secondary">fg-secondary — supporting text</p>
                <p className="text-fg-faint">fg-faint — captions, sources, timestamps (still AA)</p>
                <p className="text-fg-disabled">fg-disabled — an inactive control (exempt, recorded)</p>
                <p className="font-semibold text-fg-brand">fg-brand — the anchor green</p>
            </Sheet>

            <Sheet title="The three states — never a traffic light">
                <div className="flex flex-wrap gap-g-3">
                    <StatusChip state="covered">Καλύπτεται</StatusChip>
                    <StatusChip state="gap">Κενό</StatusChip>
                    <StatusChip state="review">Για έλεγχο</StatusChip>
                </div>
                <div className="mt-g-3 flex flex-wrap gap-g-3">
                    <span className="rounded-g-pill bg-state-covered-fill px-g-4 py-g-2 font-semibold text-state-covered">✓ Καλυμμένο</span>
                    <span className="rounded-g-pill border border-state-gap-border bg-state-gap-fill px-g-4 py-g-2 font-semibold text-state-gap">◆ Κενό κάλυψης</span>
                    <span className="rounded-g-pill bg-state-review-fill px-g-4 py-g-2 font-semibold text-state-review">? Χρειάζεται έλεγχο</span>
                </div>
            </Sheet>

            <Sheet title="Actions">
                <div className="flex flex-wrap items-center gap-g-3">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <button className="inline-flex min-h-11 items-center rounded-g-pill bg-action-danger px-g-6 font-semibold text-fg-on-brand hover:bg-action-danger-hover">Danger</button>
                    <button className="inline-flex min-h-11 items-center rounded-g-pill bg-action-primary-bg px-g-6 font-semibold text-fg-on-brand opacity-50" disabled>Disabled</button>
                </div>
            </Sheet>

            <Sheet title="Type ladder (app tier)">
                <p className="font-display text-g-title-lg">Η προστασία σας</p>
                <p className="font-display text-g-title">Σας καλύπτουν 22 από τα 30.</p>
                <p className="text-g-heading">Να το δείτε τώρα</p>
                <p className="text-g-row">Toyota Yaris · ΙΚΖ-4821</p>
                <p className="text-g-app-body">Το ΙΚΖ-4821 λήγει σε 8 ημέρες. Από τις 8 Σεπτεμβρίου κυκλοφορεί ανασφάλιστο.</p>
                <p className="text-g-app-body-sm text-fg-secondary">Πού το είδα: Ασφαλιστήριο αυτοκινήτου · σελ. 1</p>
                <p className="text-g-app-caption text-fg-faint">Διαβάστηκε 30 Αυγ 2026</p>
                <p className="text-g-app-label uppercase tracking-[0.06em] text-fg-faint">Σεπτέμβριος</p>
                <p className="text-g-app-body tabular-nums lining-nums">8.224 € · 1,3 εκ. € · 84 €</p>
            </Sheet>

            <Sheet title="Radius · elevation · hairline">
                <div className="flex flex-wrap gap-g-3">
                    <Swatch className="rounded-g-control border border-border-strong bg-surface-raised">control 12</Swatch>
                    <Swatch className="rounded-g-card border border-border-subtle bg-surface-raised shadow-g-raised">card 16 · raised</Swatch>
                    <Swatch className="rounded-g-sheet bg-surface-raised shadow-g-overlay">sheet 20 · overlay</Swatch>
                    <Swatch className="rounded-g-hero bg-surface-wash">hero 26</Swatch>
                </div>
                <ul className="mt-g-3 rounded-g-card border border-border-subtle bg-surface-raised">
                    <li className="min-h-16 px-g-4 py-g-3">Row one</li>
                    <li className="min-h-16 border-t border-border-hair px-g-4 py-g-3 [border-top-width:0.5px]">Row two — 0.5px hairline</li>
                    <li className="min-h-16 border-t border-border-hair px-g-4 py-g-3 [border-top-width:0.5px]">Row three</li>
                </ul>
            </Sheet>

            <Sheet title="Components — every state">
                <StyleguideInteractive />
            </Sheet>

            <Sheet title="Product components — ΔΕΙΓΜΑ">
                <StyleguideProduct />
            </Sheet>

            <Sheet title="Motion">
                <div className="g-screen-enter flex flex-wrap gap-g-3">
                    <Swatch className="bg-surface-raised shadow-g-raised">rise 1</Swatch>
                    <Swatch className="bg-surface-raised shadow-g-raised">rise 2</Swatch>
                    <Swatch className="bg-surface-raised shadow-g-raised">rise 3</Swatch>
                </div>
                <button className="g-row-press mt-g-3 min-h-11 rounded-g-control border border-border-strong bg-surface-raised px-g-4 ease-g-spring">row-press (spring)</button>
                <p className="mt-g-2 text-g-app-caption text-fg-faint">ease-g-out for everything else · nothing loops · final state under reduced motion</p>
            </Sheet>
        </div>
    )
}

function Sheet({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-g-heading">{title}</h2>
            <div className="mt-g-3">{children}</div>
        </section>
    )
}

function Swatch({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={`rounded-g-md p-g-4 text-sm ${className ?? ""}`}>{children}</div>
}
