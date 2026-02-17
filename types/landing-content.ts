export type LandingLocale = "el" | "en"

export interface LocalizedText {
    el: string
    en: string
}

export interface LandingSection {
    id: string
    title: LocalizedText
    subtitle?: LocalizedText
}

export interface PersonaTrack {
    id: "policyholder" | "agent"
    title: LocalizedText
    bullets: LocalizedText[]
    ctaLabel: LocalizedText
    ctaHref: string
}

export interface FaqItemLocalized {
    id: string
    question: LocalizedText
    answer: LocalizedText
}

export interface LandingVisualAsset {
    src: string
    alt: LocalizedText
    caption?: LocalizedText
}

export interface LandingTrustItem {
    title: LocalizedText
    subtitle: LocalizedText
    icon: "lock" | "shield" | "users"
}

export interface LandingFeatureItem {
    title: LocalizedText
    subtitle: LocalizedText
    icon: "file-text" | "brain" | "bell"
}

export interface LandingTestimonial {
    quote: LocalizedText
    author: string
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

export interface LandingContentModel {
    productName: string
    defaultLocale: LandingLocale
    sections: LandingSection[]
    hero: {
        badge: LocalizedText
        title: LocalizedText
        subtitle: LocalizedText
        primaryCta: LocalizedText
        secondaryCta: LocalizedText
        tertiaryCta: LocalizedText
        helperText?: LocalizedText
    }
    visuals?: {
        heroImage?: LandingVisualAsset
        trustImages?: LandingVisualAsset[]
        socialProofImages?: LandingVisualAsset[]
    }
    landingSystem?: {
        trustItems: LandingTrustItem[]
        featureItems: LandingFeatureItem[]
        socialProof: {
            title: LocalizedText
            metrics: Array<{ value: string; label: LocalizedText }>
            testimonials: LandingTestimonial[]
        }
        conversion: {
            title: LocalizedText
            subtitle: LocalizedText
            signupLabel: LocalizedText
            loginLabel: LocalizedText
            footnote: LocalizedText
            mobilePrimaryLabel: LocalizedText
            signInLabel: LocalizedText
        }
    }
    personaTracks: PersonaTrack[]
    howItWorks: {
        title: LocalizedText
        steps: Array<{ id: string; title: LocalizedText; description: LocalizedText }>
    }
    aiExtraction: {
        title: LocalizedText
        subtitle: LocalizedText
        fields: LocalizedText[]
        reviewNote: LocalizedText
    }
    collaboration: {
        title: LocalizedText
        tracks: Array<{
            id: "agent_to_customer" | "policyholder_to_agent"
            title: LocalizedText
            points: LocalizedText[]
        }>
    }
    qaUpgrade: {
        title: LocalizedText
        subtitle: LocalizedText
        bullets: LocalizedText[]
        pricingCta: LocalizedText
    }
    trust: {
        title: LocalizedText
        bullets: LocalizedText[]
    }
    security: {
        title: LocalizedText
        bullets: LocalizedText[]
    }
    faq: {
        title: LocalizedText
        items: FaqItemLocalized[]
    }
    finalCta: {
        title: LocalizedText
        subtitle: LocalizedText
        policyholderCta: LocalizedText
        agentCta: LocalizedText
    }
    footer: {
        linksLabel: LocalizedText
        helpLabel: LocalizedText
    }
    seo: {
        el: SeoMetaLocalized
        en: SeoMetaLocalized
    }
}
