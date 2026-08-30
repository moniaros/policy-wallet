export type LandingLocale = "el" | "en"

export interface LocalizedText {
    el: string
    en: string
}

export interface FaqItemLocalized {
    id: string
    question: LocalizedText
    answer: LocalizedText
}

export interface SeoMetaLocalized {
    locale: LandingLocale
    path: "/" | "/en"
    title: string
    description: string
    keywords: string[]
    ogTitle: string
    ogDescription: string
    twitterTitle: string
    twitterDescription: string
}

/**
 * Only what the homepage actually renders (and emits as JSON-LD). The model
 * used to describe a dozen sections nothing rendered — hero copy, persona
 * tracks, testimonial slots — which is how the page and the content file
 * drifted into telling two different stories. Positioning copy lives in
 * lib/marketing/positioning.ts; this model carries the rest.
 */
export interface LandingContentModel {
    productName: string
    howItWorks: {
        title: LocalizedText
        steps: Array<{
            id: string
            title: LocalizedText
            description: LocalizedText
            /**
             * Phrase INSIDE `description` rendered bold brand-green. Must be a
             * substring of the description in both locales (guarded by
             * tests/unit/landing-how-it-works.test.ts); never emitted to the
             * HowTo JSON-LD, which carries the plain description.
             */
            emphasis?: LocalizedText
        }>
        /** The line under the steps. `lead` renders bold. Not a HowTo step. */
        closing: { lead: LocalizedText; rest: LocalizedText }
    }
    faq: {
        title: LocalizedText
        items: FaqItemLocalized[]
    }
    seo: {
        el: SeoMetaLocalized
        en: SeoMetaLocalized
    }
}
