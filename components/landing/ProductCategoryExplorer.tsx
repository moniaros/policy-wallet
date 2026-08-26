import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import {
    getProductCategory,
    productCategories,
    type ProductCategoryId,
} from "@/lib/product/catalog"

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
    const currentCategory = getProductCategory(currentCategoryId)

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
                                "Η ίδια ανάλυση ισχύει για κάθε συμβόλαιο που έχετε.",
                                "The same analysis applies to every policy you have."
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

                <div
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    data-testid="product-category-explorer"
                >
                    {productCategories.map((category) => {
                        const Icon = category.icon
                        const isCurrent = category.id === currentCategoryId

                        if (isCurrent) {
                            return (
                                <div
                                    key={category.id}
                                    aria-current="page"
                                    className={`flex min-h-[220px] flex-col rounded-2xl border p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ${category.surface} ${category.border}`}
                                >
                                    <div className="mb-5 flex items-start justify-between gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/85 shadow-sm">
                                            <Icon className="h-5 w-5 text-neutral-900" />
                                        </div>
                                        <span className="rounded-full bg-[#29685B] px-3 py-1 text-micro font-semibold uppercase tracking-wide text-white">
                                            {t("Τρέχουσα κατηγορία", "Current category")}
                                        </span>
                                    </div>

                                    <h3 className="text-title font-semibold tracking-tight text-neutral-900">
                                        {t(category.labelEl, category.labelEn)}
                                    </h3>
                                    <p className="mt-3 text-body font-semibold leading-snug text-neutral-900">
                                        {t(category.headlineEl, category.headlineEn)}
                                    </p>
                                    <p className="mt-3 flex-1 text-body leading-relaxed text-[#475569]">
                                        {t(category.descEl, category.descEn)}
                                    </p>
                                    <div className="mt-5 text-body font-semibold text-[#29685B]">
                                        {t("Τη βλέπετε τώρα", "You're here")}
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <Link
                                key={category.id}
                                href={localizeHref(category.href, locale)}
                                className={`group flex min-h-[220px] flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] ${category.surface} ${category.border}`}
                            >
                                <div className="mb-5 flex items-start justify-between gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/85 shadow-sm">
                                        <Icon className="h-5 w-5 text-neutral-900" />
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-micro font-semibold uppercase tracking-wide ${category.tagBg}`}>
                                        {t(category.tagEl, category.tagEn)}
                                    </span>
                                </div>

                                <h3 className="text-title font-semibold tracking-tight text-neutral-900">
                                    {t(category.labelEl, category.labelEn)}
                                </h3>
                                <p className="mt-3 text-body font-semibold leading-snug text-neutral-900">
                                    {t(category.headlineEl, category.headlineEn)}
                                </p>
                                <p className="mt-3 flex-1 text-body leading-relaxed text-[#475569]">
                                    {t(category.descEl, category.descEn)}
                                </p>
                                <div className="mt-5 inline-flex items-center gap-2 text-body font-semibold text-neutral-900 transition-all duration-150 group-hover:gap-3">
                                    {t("Δείτε την κατηγορία", "See this category")}
                                    <ArrowRight aria-hidden className="h-4 w-4" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
