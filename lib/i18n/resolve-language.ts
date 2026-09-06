import type { Language } from "@/lib/i18n/types"

/**
 * PW-CONTENT-01 Goal 1 — ONE resolved locale per request.
 *
 * The stored preference (`users.preferred_language`) is a free string column
 * with a Greek default. Sixty-one call sites used to normalise it by hand and
 * disagreed on the fallback: `|| 'el'` in some, `|| 'en'` in others, and an
 * `as 'en' | 'el'` cast that let any unexpected value through to the
 * dictionary. This is the only place that turns the stored value into a
 * `Language`; the server layout seeds the client provider from it, so the
 * server half and the client half of a page cannot disagree.
 *
 * Greek is the product's canonical locale: anything that is not exactly `en`
 * resolves to `el`. No caller carries its own fallback (guard:
 * tests/unit/no-component-locale-fallback.test.ts).
 */
export function resolveUserLanguage(stored: string | null | undefined): Language {
    return stored === "en" ? "en" : "el"
}

/** The BCP-47 tag every formatter and the `<html lang>` stamp use for a language. One table, in lib/i18n/format.ts. */
export { resolveLocale } from "@/lib/i18n/format"
