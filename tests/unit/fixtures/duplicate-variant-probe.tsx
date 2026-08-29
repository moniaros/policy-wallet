/**
 * PROBE FIXTURE for tests/unit/one-variant-one-declaration.test.ts.
 *
 * Not rendered, not imported. Each element below plants one shape the guard
 * must catch, plus the near-misses it must NOT catch.
 */
export function DuplicateVariantProbe() {
    return (
        <>
            {/* CAUGHT: two dark:text- on one element, different values. The
                later class does not reliably win — Tailwind emits both at equal
                specificity and stylesheet order decides, so the rendered colour
                is not the one the author last wrote. */}
            <p className="text-amber-900 dark:text-amber-200 font-bold dark:text-amber-100" />
            {/* CAUGHT: exact duplicate. Harmless to render, but it is the same
                editing accident and hides the conflicting case in review. */}
            <p className="text-slate-600 dark:text-slate-400 hover:underline dark:text-slate-400" />
            {/* CAUGHT: the same shape on a responsive variant. */}
            <p className="sm:bg-red-100 p-2 sm:bg-red-200" />
            {/* NOT caught: different variants of the same property. */}
            <p className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" />
            {/* NOT caught: same variant, different properties. */}
            <p className="dark:text-white dark:bg-black dark:border-white" />
            {/* NOT caught: unprefixed base plus a variant. */}
            <p className="text-slate-600 dark:text-slate-400" />
        </>
    )
}
