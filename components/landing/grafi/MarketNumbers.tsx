import { MARKET_NUMBERS } from "@/lib/marketing/market-numbers"
import { pick, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * Market numbers with sources (§6). Exactly the claims `market-numbers.ts`
 * holds — two today, because only two resolve to a primary source the repo
 * has read. Each card carries its caveat and a named, dated, linked source
 * (§7: sources are named and dated); the number never renders without them.
 *
 * Tabular lining numerals on every figure (§4.3).
 */
export function MarketNumbers({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    return (
        <section
            aria-labelledby="market-numbers-heading"
            className="[padding-block:var(--space-section)]"
        >
            <div className="mx-auto max-w-[1180px] px-g-6 md:px-g-8">
                <p className="text-g-label font-semibold uppercase tracking-[0.1em] text-fg-brand">
                    {t("Γιατί τώρα", "Why now")}
                </p>
                <h2
                    id="market-numbers-heading"
                    className="mt-g-3 max-w-[26ch] text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary"
                >
                    {t(
                        "Δύο αριθμοί που αξίζει να ξέρετε.",
                        "Two numbers worth knowing.",
                    )}
                </h2>

                <div className="mt-g-10 grid gap-g-5 md:grid-cols-2">
                    {MARKET_NUMBERS.map((n) => (
                        <article
                            key={n.id}
                            className="flex flex-col rounded-g-lg border border-border-subtle bg-surface-raised p-g-6"
                        >
                            <p
                                className="text-g-display-xl font-extrabold text-fg-brand"
                                style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                            >
                                {n.value}
                            </p>
                            <p className="mt-g-2 text-g-display-sm font-semibold text-fg-primary">
                                {pick(n.label, locale)}
                            </p>
                            <p className="mt-g-2 text-g-body-sm text-fg-secondary">
                                {pick(n.caveat, locale)}
                            </p>
                            <p className="mt-auto pt-g-5 text-g-caption text-fg-secondary">
                                {t("Πηγή: ", "Source: ")}
                                <a
                                    href={n.source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline decoration-border-strong underline-offset-4 hover:text-fg-primary"
                                >
                                    {pick(n.source.name, locale)}
                                </a>
                                {" · "}
                                <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>{n.source.dated}</span>
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
