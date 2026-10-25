import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import { productCategories, type ProductCategoryId } from "@/lib/product/catalog"

interface ProductCategoryExplorerProps {
    currentCategoryId: ProductCategoryId
    /** Locale as a prop, not context — keeps this a Server Component. */
    locale: "el" | "en"
}

// NOTE ON COLOUR: `category.surface` is a FIXED light tint (bg-primary-soft and
// friends) declared in lib/product/catalog.tsx, which the authenticated app
// shares — it has no dark-mode variant. The card text used to carry
// `dark:text-white` / `dark:text-slate-300`, which in dark mode painted white
// text onto a pale green card: a serious contrast failure axe flagged on every
// one of the 15 product pages. The surface is light in BOTH themes, so the text
// on it stays dark in both themes.
export function ProductCategoryExplorer({
    currentCategoryId,
    locale,
}: ProductCategoryExplorerProps) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <section className="bg-neutral-50 dark:bg-slate-900 py-20 px-6 lg:px-12">
            <div className="mx-auto max-w-page">
                <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-[720px]">
                        <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900 dark:text-white">
                            {t(
                                "Δείτε και τις υπόλοιπες ασφαλιστικές κατηγορίες.",
                                "Browse the rest of the insurance categories."
                            )}
                        </h2>
                        <p className="mt-4 text-body-lg leading-relaxed text-neutral-600 dark:text-slate-300">
                            {t(
                                "Δείτε πώς διαβάζουμε τα έγγραφα κάθε κατηγορίας.",
                                "See how we read documents in each category."
                            )}
                        </p>
                    </div>

                    <Link
                        href={localizeHref("/product", locale)}
                        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-[#D5DEE8] bg-white px-5 py-3 text-body font-semibold text-neutral-900 transition-colors duration-150 hover:border-neutral-300 hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    >
                        {t("Όλες οι κατηγορίες", "All categories")}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>

                {/* TITLES ONLY. Each /product/{category} page used to re-list all 16
                    categories with their full descriptions — sixteen description
                    blocks on seventeen pages per locale (metric M-X1). The
                    descriptions live on /product alone; here a category is a
                    label, its tag and a link. The current one is not a link. */}
                <ul
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                    data-testid="product-category-explorer"
                >
                    {productCategories.map((category) => {
                        const Icon = category.icon
                        const isCurrent = category.id === currentCategoryId
                        const body = (
                            <>
                                <span className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/85 shadow-sm">
                                        <Icon aria-hidden className="h-4.5 w-4.5 text-neutral-900" />
                                    </span>
                                    <span className="min-w-0 text-body font-semibold leading-snug text-neutral-900 [overflow-wrap:anywhere]">
                                        {t(category.labelEl, category.labelEn)}
                                    </span>
                                </span>
                                <span className={`pw-pill self-start ${category.tagBg}`}>
                                    {isCurrent ? t("Τη βλέπετε τώρα", "You're here") : t(category.tagEl, category.tagEn)}
                                </span>
                            </>
                        )
                        const box = `flex min-h-11 flex-col gap-2 rounded-xl border px-4 py-3 ${category.surface} ${category.border}`
                        return (
                            <li key={category.id}>
                                {isCurrent ? (
                                    <div aria-current="page" className={`${box} ring-2 ring-brand-green`}>
                                        {body}
                                    </div>
                                ) : (
                                    <Link
                                        href={localizeHref(category.href, locale)}
                                        className={`${box} transition-colors duration-150 hover:border-neutral-400`}
                                    >
                                        {body}
                                    </Link>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>
        </section>
    )
}
