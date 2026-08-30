import Link from "next/link"
import { productCategories } from "@/lib/product/catalog"
import { localizeHref } from "@/lib/seo/locale-links"
import type { MarketingLocale } from "@/lib/marketing/positioning"

/**
 * The coverage-lines ticker (§6): every line the product reads, rolling once
 * across the viewport. The ONE looping animation the motion system allows
 * (§4.5) — it pauses on hover/focus, and under `prefers-reduced-motion` the
 * track stands still and wraps instead (the CSS lives in globals.css as
 * `.g-ticker*`; every item stays reachable, nothing is hidden).
 *
 * Content comes from `productCategories` — the taxonomy-joined catalogue the
 * G1 guard watches — so a renamed or added line appears here without anyone
 * remembering this file exists. The second copy of the list is aria-hidden
 * and unfocusable: it exists only so the loop has no visible seam.
 *
 * Server component: the loop is pure CSS, no JS shipped.
 */
export function CoverageTicker({ locale }: { locale: MarketingLocale }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const items = (hidden: boolean) => (
        <ul
            aria-hidden={hidden || undefined}
            className="g-ticker-list flex items-center gap-g-3 pe-g-3"
        >
            {productCategories.map((cat) => (
                <li key={cat.id} className="flex-none">
                    <Link
                        href={localizeHref(cat.href, locale)}
                        tabIndex={hidden ? -1 : undefined}
                        className="flex h-11 items-center gap-g-2 rounded-g-pill border border-border-subtle bg-surface-raised px-g-4 text-g-body-sm font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-border-focus"
                    >
                        <cat.icon aria-hidden className="h-4 w-4 text-fg-brand" />
                        {isGreek ? cat.labelEl : cat.labelEn}
                    </Link>
                </li>
            ))}
        </ul>
    )

    return (
        <section aria-label={t("Κλάδοι ασφάλισης που διαβάζουμε", "Insurance lines we read")}>
            <div className="g-ticker relative overflow-hidden py-g-5">
                <div className="g-ticker-track flex w-max">
                    {items(false)}
                    {items(true)}
                </div>
            </div>
        </section>
    )
}
