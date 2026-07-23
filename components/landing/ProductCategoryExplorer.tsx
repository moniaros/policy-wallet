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

export function ProductCategoryExplorer({
    currentCategoryId,
    locale,
}: ProductCategoryExplorerProps) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const currentCategory = getProductCategory(currentCategoryId)

    return (
        <section className="bg-[#F8FAFC] py-20 px-6 lg:px-12">
            <div className="mx-auto max-w-page">
                <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-[720px]">
                        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-[#29685B]">
                            {t("Εξερευνήστε κι άλλα", "Explore more")}
                        </p>
                        <h2 className="text-h2 lg:text-h1 font-semibold tracking-[-0.03em] leading-[1.1] text-[#0F172A]">
                            {t(
                                "Δείτε και τις υπόλοιπες ασφαλιστικές κατηγορίες.",
                                "Browse the rest of the insurance categories."
                            )}
                        </h2>
                        <p className="mt-4 text-body-lg leading-relaxed text-[#475569]">
                            {currentCategory
                                ? t(
                                    `Βρίσκεστε στο ${currentCategory.labelEl}. Συγκρίνετέ το με τις υπόλοιπες λύσεις χωρίς να επιστρέψετε στην αρχική σελίδα προϊόντων.`,
                                    `You're viewing ${currentCategory.labelEn}. Compare it with the rest of the suite without going back to the main product page.`
                                )
                                : t(
                                    "Συγκρίνετε τις κατηγορίες σας χωρίς να χάνετε τη ροή περιήγησης.",
                                    "Compare categories without breaking your browsing flow."
                                )}
                        </p>
                    </div>

                    <Link
                        href={localizeHref("/product", locale)}
                        className="inline-flex items-center gap-2 self-start rounded-full border border-[#D5DEE8] bg-white px-5 py-3 text-body font-semibold text-[#0F172A] transition-colors duration-150 hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    >
                        {t("Όλες οι κατηγορίες", "All categories")}
                        <ArrowRight className="h-4 w-4" />
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
                                        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/85 shadow-sm">
                                            <Icon className="h-5 w-5 text-[#0F172A]" />
                                        </div>
                                        <span className="rounded-full bg-[#29685B] px-3 py-1 text-micro font-semibold uppercase tracking-wide text-white">
                                            {t("Τρέχουσα κατηγορία", "Current category")}
                                        </span>
                                    </div>

                                    <h3 className="text-title font-semibold tracking-tight text-[#0F172A]">
                                        {t(category.labelEl, category.labelEn)}
                                    </h3>
                                    <p className="mt-3 text-body font-semibold leading-snug text-[#0F172A]">
                                        {t(category.headlineEl, category.headlineEn)}
                                    </p>
                                    <p className="mt-3 flex-1 text-body leading-relaxed text-[#475569]">
                                        {t(category.descEl, category.descEn)}
                                    </p>
                                    <div className="mt-5 text-body font-semibold text-[#29685B]">
                                        {t("Την βλέπετε τώρα", "You're here")}
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
                                    <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/85 shadow-sm">
                                        <Icon className="h-5 w-5 text-[#0F172A]" />
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-micro font-semibold uppercase tracking-wide ${category.tagBg}`}>
                                        {t(category.tagEl, category.tagEn)}
                                    </span>
                                </div>

                                <h3 className="text-title font-semibold tracking-tight text-[#0F172A]">
                                    {t(category.labelEl, category.labelEn)}
                                </h3>
                                <p className="mt-3 text-body font-semibold leading-snug text-[#0F172A]">
                                    {t(category.headlineEl, category.headlineEn)}
                                </p>
                                <p className="mt-3 flex-1 text-body leading-relaxed text-[#475569]">
                                    {t(category.descEl, category.descEn)}
                                </p>
                                <div className="mt-5 inline-flex items-center gap-2 text-body font-semibold text-[#0F172A] transition-all duration-150 group-hover:gap-3">
                                    {t("Μετάβαση", "Open category")}
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
