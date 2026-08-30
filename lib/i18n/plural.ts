/**
 * ICU-style plurals and `{var}` interpolation for the `app` catalogue (G6).
 *
 * Supports exactly what the catalogue uses:
 *   `{count, plural, one {# ασφαλιστήριο} other {# ασφαλιστήρια}}`
 *   `{name}` / `{days}` — plain interpolation
 * `#` inside a plural branch is the count. Greek and English both select
 * `one` for 1 and `other` otherwise via Intl.PluralRules, so a third form is
 * never needed; `=0` is supported for the quiet phrasings («κανένα»).
 *
 * Named `formatPlural`, not `formatMessage` — lib/subscription-copy.ts already
 * exports a `formatMessage` with a different contract.
 */
export type PluralParams = Record<string, string | number>

const PLURAL_RE = /\{(\w+),\s*plural,\s*((?:=\d+\s*\{[^{}]*\}\s*|\w+\s*\{[^{}]*\}\s*)+)\}/g
const BRANCH_RE = /(=\d+|\w+)\s*\{([^{}]*)\}/g

export function formatPlural(template: string, params: PluralParams = {}, locale: "el" | "en" = "el"): string {
    const rules = new Intl.PluralRules(locale === "el" ? "el-GR" : "en-GB")
    let out = template.replace(PLURAL_RE, (_m, name: string, body: string) => {
        const raw = params[name]
        const n = typeof raw === "number" ? raw : Number(raw)
        const branches = new Map<string, string>()
        for (const b of body.matchAll(BRANCH_RE)) branches.set(b[1], b[2])
        const exact = branches.get(`=${n}`)
        const chosen = exact ?? branches.get(Number.isFinite(n) ? rules.select(n) : "other") ?? branches.get("other") ?? ""
        return chosen.replace(/#/g, Number.isFinite(n) ? new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-GB").format(n) : String(raw ?? ""))
    })
    out = out.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
    return out
}

/** True when a template still carries a bare `{count}` outside a plural form — the G6 guard's predicate. */
export function hasBareCount(template: string): boolean {
    const stripped = template.replace(PLURAL_RE, "")
    return /\{count\}/.test(stripped)
}
