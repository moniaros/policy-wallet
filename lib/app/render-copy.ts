import { getTranslations } from "@/lib/i18n"
import { formatPlural } from "@/lib/i18n/plural"
import { formatDate } from "@/lib/i18n/format"
import { gapSentenceTemplate } from "./compose"
import type { RenderableFinding } from "./finding"

/**
 * From a typed finding to the sentence on screen — one place, shared by `/`,
 * `/see` and `/policies/[id]`, so the same finding never reads differently
 * on two screens. Authored rule sentences first; catalogue templates second;
 * never model prose.
 */
export function resolveSentence(f: RenderableFinding, lang: "el" | "en", t: ReturnType<typeof getTranslations>): string {
    const authored = gapSentenceTemplate(f.sentence.key, lang)
    if (authored) return formatPlural(authored, f.sentence.params, lang)
    const key = f.sentence.key.replace(/^app\./, "").split(".")
    let node: unknown = t.app
    for (const k of key) node = (node as Record<string, unknown> | undefined)?.[k]
    const template = typeof node === "string" ? node : f.sentence.key
    const params = { ...f.sentence.params }
    if (typeof params.date === "string" && params.date) params.date = formatDate(new Date(params.date), lang)
    return formatPlural(template, params, lang)
}

export function resolveSource(f: RenderableFinding, lang: "el" | "en", t: ReturnType<typeof getTranslations>): string {
    const s = f.source
    if (s.locator.kind === "page") return formatPlural(t.app.finding.source.page, { document: s.documentLabel, page: s.locator.page }, lang)
    const section = t.app.finding.section[s.locator.section]
    const base = formatPlural(s.locator.found ? t.app.finding.source.sectionFound : t.app.finding.source.section, { document: s.documentLabel, section }, lang)
    const others = s.othersSearched ? ` ${formatPlural(t.app.finding.othersSearched, { count: s.othersSearched }, lang)}` : ""
    return base + others
}

export function resolveWhyYou(f: RenderableFinding, lang: "el" | "en", t: ReturnType<typeof getTranslations>): string | undefined {
    if (!f.whyYou) return undefined
    const key = f.whyYou.key.replace(/^app\./, "").split(".")
    let node: unknown = t.app
    for (const k of key) node = (node as Record<string, unknown> | undefined)?.[k]
    return typeof node === "string" ? formatPlural(node, f.whyYou.params, lang) : undefined
}

