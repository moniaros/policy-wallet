import type { Metadata } from "next"
import { notFound } from "next/navigation"
import GlossaryTermClient from "./GlossaryTermClient"
import { getGlossaryTerm, glossaryTerms } from "@/lib/glossary/content"
import { marketingPages } from "@/lib/seo/marketing-pages"
import { OG_IMAGES, TWITTER_IMAGES } from "@/lib/seo/site"
import {
    JsonLd,
    breadcrumbTrailJsonLd,
    definedTermJsonLd,
    faqPageJsonLd,
} from "@/lib/seo/jsonld"

type GlossaryTermPageProps = {
    params: Promise<{ term: string }>
}

export function generateStaticParams() {
    return glossaryTerms.map((entry) => ({ term: entry.slug }))
}

export async function generateMetadata({ params }: GlossaryTermPageProps): Promise<Metadata> {
    const { term } = await params
    const entry = getGlossaryTerm(term)
    if (!entry) return {}

    const path = `/lexiko/${entry.slug}`
    const enPath = `/en/lexiko/${entry.slug}`
    return {
        title: entry.metaTitle.el,
        description: entry.metaDescription.el,
        alternates: {
            canonical: path,
            languages: { el: path, en: enPath, "x-default": path },
        },
        openGraph: {
            type: "article",
            locale: "el_GR",
            url: path,
            siteName: "PolicyWallet",
            title: entry.metaTitle.el,
            description: entry.metaDescription.el,
            images: OG_IMAGES,
        },
        twitter: {
            card: "summary_large_image",
            title: entry.metaTitle.el,
            description: entry.metaDescription.el,
            images: TWITTER_IMAGES,
        },
    }
}

export default async function GlossaryTermPage({ params }: GlossaryTermPageProps) {
    const { term } = await params
    const entry = getGlossaryTerm(term)
    if (!entry) notFound()

    const path = `/lexiko/${entry.slug}`

    return (
        <>
            <GlossaryTermClient entry={entry} />
            <JsonLd
                data={[
                    definedTermJsonLd({
                        path,
                        name: entry.term.el,
                        description: entry.shortDefinition.el,
                        inLanguage: "el",
                    }),
                    faqPageJsonLd(
                        entry.faq.map((item) => ({
                            question: item.question.el,
                            answer: item.answer.el,
                        }))
                    ),
                    breadcrumbTrailJsonLd([
                        {
                            name: marketingPages.lexiko.breadcrumb,
                            path: marketingPages.lexiko.path,
                        },
                        { name: entry.term.el, path },
                    ]),
                ]}
            />
        </>
    )
}
