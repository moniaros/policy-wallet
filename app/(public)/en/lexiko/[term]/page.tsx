import type { Metadata } from "next"
import { notFound } from "next/navigation"
import GlossaryTermClient from "../../../lexiko/[term]/GlossaryTermClient"
import { getGlossaryTerm, glossaryTerms } from "@/lib/glossary/content"
import { marketingPages } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { ogImagesFor, twitterImagesFor } from "@/lib/seo/site"
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
        title: entry.metaTitle.en,
        description: entry.metaDescription.en,
        alternates: {
            canonical: enPath,
            languages: { el: path, en: enPath, "x-default": path },
        },
        openGraph: {
            type: "article",
            locale: "en_US",
            url: enPath,
            siteName: "PolicyWallet",
            title: entry.metaTitle.en,
            description: entry.metaDescription.en,
            images: ogImagesFor("en"),
        },
        twitter: {
            card: "summary_large_image",
            title: entry.metaTitle.en,
            description: entry.metaDescription.en,
            images: twitterImagesFor("en"),
        },
    }
}

export default async function GlossaryTermPageEnglish({ params }: GlossaryTermPageProps) {
    const { term } = await params
    const entry = getGlossaryTerm(term)
    if (!entry) notFound()

    const enPath = `/en/lexiko/${entry.slug}`
    const lexikoEnBreadcrumb = marketingPages.lexiko.en?.breadcrumb ?? "Glossary"

    return (
        <StaticLanguageProvider language="en" counterpartPath={`/lexiko/${entry.slug}`}>
            <GlossaryTermClient entry={entry} />
            <JsonLd
                data={[
                    definedTermJsonLd({
                        path: enPath,
                        name: entry.term.en,
                        description: entry.shortDefinition.en,
                        inLanguage: "en",
                        termSetPath: "/en/lexiko",
                    }),
                    faqPageJsonLd(
                        entry.faq.map((item) => ({
                            question: item.question.en,
                            answer: item.answer.en,
                        }))
                    ),
                    breadcrumbTrailJsonLd(
                        [
                            { name: lexikoEnBreadcrumb, path: "/en/lexiko" },
                            { name: entry.term.en, path: enPath },
                        ],
                        { name: "Home", path: "/en" }
                    ),
                ]}
            />
        </StaticLanguageProvider>
    )
}
