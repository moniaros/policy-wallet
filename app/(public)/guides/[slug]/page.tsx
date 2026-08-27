import type { Metadata } from "next"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { notFound } from "next/navigation"
import GuideArticleClient from "./GuideArticleClient"
import { getGuide, guides } from "@/lib/guides/content"
import { marketingPages } from "@/lib/seo/marketing-pages"
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
        title: guide.metaTitle.el,
        description: guide.metaDescription.el,
        alternates: {
            canonical: path,
            languages: { el: path, en: enPath, "x-default": path },
        },
        openGraph: {
            type: "article",
            locale: "el_GR",
            url: path,
            siteName: "PolicyWallet",
            title: guide.metaTitle.el,
            description: guide.metaDescription.el,
            publishedTime: guide.datePublished,
            modifiedTime: guide.dateModified,
            images: OG_IMAGES,
        },
        twitter: {
            card: "summary_large_image",
            title: guide.metaTitle.el,
            description: guide.metaDescription.el,
            images: TWITTER_IMAGES,
        },
    }
}

export default async function GuidePage({ params }: GuidePageProps) {
    const { slug } = await params
    const guide = getGuide(slug)
    if (!guide) notFound()

    const path = `/guides/${guide.slug}`

    return (
        <StaticLanguageProvider language="el" counterpartPath={`/en/guides/${guide.slug}`}>
            <GuideArticleClient guide={guide} />
            <JsonLd
                data={[
                    articleJsonLd({
                        path,
                        headline: guide.title.el,
                        description: guide.metaDescription.el,
                        datePublished: guide.datePublished,
                        dateModified: guide.dateModified,
                        ...(guide.author
                            ? {
                                  author: {
                                      name: guide.author.name,
                                      jobTitle: guide.author.role.el,
                                      profileUrl: guide.author.profileUrl,
                                  },
                              }
                            : {}),
                    }),
                    ...(guide.howToSteps
                        ? [
                              howToJsonLd({
                                  name: guide.title.el,
                                  description: guide.metaDescription.el,
                                  steps: guide.howToSteps.map((step) => ({
                                      name: step.name.el,
                                      text: step.text.el,
                                  })),
                              }),
                          ]
                        : []),
                    faqPageJsonLd(
                        guide.faq.map((item) => ({
                            question: item.question.el,
                            answer: item.answer.el,
                        }))
                    ),
                    breadcrumbTrailJsonLd([
                        {
                            name: marketingPages.guides.breadcrumb,
                            path: marketingPages.guides.path,
                        },
                        { name: guide.title.el, path },
                    ]),
                ]}
            />
        </StaticLanguageProvider>
    )
}
