import type { Metadata } from "next"
import { notFound } from "next/navigation"
import GuideArticleClient from "../../../guides/[slug]/GuideArticleClient"
import { getGuide, guides } from "@/lib/guides/content"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { marketingPages, enPathFor } from "@/lib/seo/marketing-pages"
import { OG_IMAGES, TWITTER_IMAGES } from "@/lib/seo/site"
import {
    JsonLd,
    articleJsonLd,
    breadcrumbTrailJsonLd,
    faqPageJsonLd,
    howToJsonLd,
} from "@/lib/seo/jsonld"

type GuidePageProps = {
    params: Promise<{ slug: string }>
}

export function generateStaticParams() {
    return guides.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
    const { slug } = await params
    const guide = getGuide(slug)
    if (!guide) return {}

    const path = `/guides/${guide.slug}`
    const enPath = `/en/guides/${guide.slug}`
    return {
        title: guide.metaTitle.en,
        description: guide.metaDescription.en,
        alternates: {
            canonical: enPath,
            // x-default → the Greek article (primary market).
            languages: { el: path, en: enPath, "x-default": path },
        },
        openGraph: {
            type: "article",
            locale: "en_US",
            url: enPath,
            siteName: "PolicyWallet",
            title: guide.metaTitle.en,
            description: guide.metaDescription.en,
            publishedTime: guide.datePublished,
            modifiedTime: guide.dateModified,
            images: OG_IMAGES,
        },
        twitter: {
            card: "summary_large_image",
            title: guide.metaTitle.en,
            description: guide.metaDescription.en,
            images: TWITTER_IMAGES,
        },
    }
}

export default async function GuidePageEnglish({ params }: GuidePageProps) {
    const { slug } = await params
    const guide = getGuide(slug)
    if (!guide) notFound()

    const enPath = `/en/guides/${guide.slug}`

    return (
        <StaticLanguageProvider language="en" counterpartPath={`/guides/${guide.slug}`}>
            <GuideArticleClient guide={guide} />
            <JsonLd
                data={[
                    articleJsonLd({
                        path: enPath,
                        headline: guide.title.en,
                        description: guide.metaDescription.en,
                        datePublished: guide.datePublished,
                        dateModified: guide.dateModified,
                        inLanguage: "en",
                        ...(guide.author
                            ? {
                                  author: {
                                      name: guide.author.name,
                                      jobTitle: guide.author.role.en,
                                      profileUrl: guide.author.profileUrl,
                                  },
                              }
                            : {}),
                    }),
                    ...(guide.howToSteps
                        ? [
                              howToJsonLd({
                                  name: guide.title.en,
                                  description: guide.metaDescription.en,
                                  steps: guide.howToSteps.map((step) => ({
                                      name: step.name.en,
                                      text: step.text.en,
                                  })),
                              }),
                          ]
                        : []),
                    faqPageJsonLd(
                        guide.faq.map((item) => ({
                            question: item.question.en,
                            answer: item.answer.en,
                        }))
                    ),
                    breadcrumbTrailJsonLd(
                        [
                            {
                                name:
                                    marketingPages.guides.en?.breadcrumb ??
                                    marketingPages.guides.breadcrumb,
                                path: enPathFor(marketingPages.guides.path),
                            },
                            { name: guide.title.en, path: enPath },
                        ],
                        { name: "Home", path: "/en" }
                    ),
                ]}
            />
        </StaticLanguageProvider>
    )
}
