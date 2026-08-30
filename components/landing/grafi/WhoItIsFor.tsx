import { Heart, ShieldCheck } from "lucide-react"
import { AudienceTabs } from "@/components/landing/AudienceTabs"
import { BrushUnderline, Eyebrow } from "@/src/design-system"
import type { LandingLocale } from "@/types/landing-content"

/**
 * «Για ποιον» (§6): the role switch. Header + the AudienceTabs client island
 * (one pill switch, two stamped role cards) + the one line both roles share.
 * Sits directly under HOW IT WORKS: once a visitor knows what happens to a
 * policy, the next question is whether this is for them.
 *
 * Keeps `#solutions` / `#solutions-heading` — the anchor the nav and the
 * secondary CTAs already point at.
 */
export function WhoItIsFor({ locale }: { locale: LandingLocale }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    return (
        <section
            id="solutions"
            aria-labelledby="solutions-heading"
            className="scroll-mt-28 lg:scroll-mt-36 [padding-block:var(--space-section)]"
        >
            <div className="mx-auto max-w-[1180px] px-g-6 md:px-g-8">
                <header className="mx-auto max-w-[56ch] text-center">
                    <Eyebrow>{t("Για ποιον", "Who it is for")}</Eyebrow>
                    <h2
                        id="solutions-heading"
                        className="mt-g-3 text-balance text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary"
                    >
                        {t("Για εσάς. ", "For you. ")}
                        <BrushUnderline>{t("Ξεκάθαρα.", "Clearly.")}</BrushUnderline>
                    </h2>
                    <p className="mt-g-4 text-g-body-lg text-fg-secondary">
                        {t(
                            "Ό,τι κι αν ψάχνετε, έχουμε τη λύση. Διαλέξτε τον ρόλο σας και δείτε πώς σας βοηθάμε.",
                            "Whatever you are looking for, we have the answer. Pick your role and see how we help.",
                        )}
                    </p>
                </header>

                <div className="mt-g-10">
                    <AudienceTabs isGreek={isGreek} />
                </div>

                <p className="mx-auto mt-g-8 flex max-w-[880px] flex-col items-center gap-g-4 rounded-g-lg border border-border-subtle bg-surface-raised px-g-5 py-g-4 text-center sm:flex-row sm:text-left">
                    <span
                        aria-hidden="true"
                        className="flex size-12 shrink-0 items-center justify-center rounded-g-pill bg-state-covered-fill text-fg-brand"
                    >
                        <ShieldCheck className="size-6" />
                    </span>
                    <span className="text-g-body-lg text-fg-primary">
                        <strong className="font-semibold">
                            {t("Είτε ιδιώτης είτε ασφαλιστής, ο στόχος είναι ο ίδιος:", "Whether you are insured or you insure others, the goal is the same:")}
                        </strong>{" "}
                        <span className="font-semibold text-fg-brand">
                            {t("σωστή κάλυψη, τη σωστή στιγμή.", "the right cover, at the right time.")}
                        </span>
                    </span>
                    <Heart aria-hidden="true" className="hidden size-6 shrink-0 text-fg-brand sm:ml-auto sm:block" />
                </p>
            </div>
        </section>
    )
}
