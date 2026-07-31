/**
 * Reading size, as a preference the reader controls.
 *
 * The product's decision content — what a policy covers, what it does not, what
 * a gap means — is largely `text-sm` (14px) and `text-xs` (12px). That is below
 * the 16px this kind of reading wants, and the people it fails hardest are
 * exactly the ones this product is for: policyholders in their sixties and
 * seventies reading a coverage exclusion on a phone.
 *
 * Browser zoom already exists and WCAG 1.4.4 is satisfied by it. This is not a
 * substitute for it — it is for the far larger group who do not know browser
 * zoom exists, will not find it, and would not think to look. A control inside
 * the product, in their own language, is the one they will actually use.
 *
 * **Why this is a root font-size scale and not a re-ladder of every class.**
 * Tailwind's type scale is in `rem`, so every `text-sm` in the app is already a
 * multiple of the root size; moving the root moves all of them together, in
 * proportion, without touching 1,590 call sites or risking a layout break at
 * 320px with Greek compound words. Re-laddering the fixed sizes is still worth
 * doing — this does not depend on it, and does not block it.
 *
 * Server-safe: no React, no DOM access at module scope, so the layout, the
 * provider and the tests can all share one definition rather than three.
 */

export const TEXT_SIZES = ["default", "large", "larger"] as const
export type TextSize = (typeof TEXT_SIZES)[number]

export const DEFAULT_TEXT_SIZE: TextSize = "default"

/** Persisted under this key and mirrored onto `<html data-text-size>`. */
export const TEXT_SIZE_STORAGE_KEY = "pw-text-size"
export const TEXT_SIZE_ATTRIBUTE = "data-text-size"

/**
 * Root font-size per step, as a percentage of the browser's own base.
 *
 * Percentages, not pixels: a reader who has already raised their browser's
 * default font size keeps that gain and this multiplies it. A fixed `20px`
 * would silently overrule them, which is the opposite of the point.
 *
 * 112.5% and 125% take the app's 14px body text to 15.75px and 17.5px, and its
 * 16px to 18px and 20px. Deliberately modest: past ~125% the fixed-height
 * chrome in this app (44px controls, single-line pills) starts to clip, and a
 * setting that breaks the page teaches people never to touch settings again.
 */
export const TEXT_SIZE_SCALE: Record<TextSize, string> = {
    default: "100%",
    large: "112.5%",
    larger: "125%",
}

export function isTextSize(value: unknown): value is TextSize {
    return typeof value === "string" && (TEXT_SIZES as readonly string[]).includes(value)
}

/** Anything unrecognised — stale key, hand-edited storage — reads as default. */
export function normalizeTextSize(raw: unknown): TextSize {
    return isTextSize(raw) ? raw : DEFAULT_TEXT_SIZE
}

export function rootFontSizeFor(size: TextSize): string {
    return TEXT_SIZE_SCALE[normalizeTextSize(size)]
}

/**
 * The blocking script that applies the stored preference before first paint.
 *
 * It has to run in `<head>`, before the body renders: applied from a React
 * effect instead, every page load would paint at the default size and then jump
 * — which reads as a bug, and is worst for the person who set the preference
 * because they need the large size to read the flash.
 *
 * Generated from the constants above so the inline script and the provider can
 * never disagree about the key, the attribute or the steps. `tests/unit/
 * text-size-preference.test.ts` executes this exact string against a stubbed
 * document rather than trusting that it parses.
 */
export function textSizeBootstrapScript(): string {
    const valid = JSON.stringify(TEXT_SIZES)
    return (
        `(function(){try{` +
        `var v=localStorage.getItem(${JSON.stringify(TEXT_SIZE_STORAGE_KEY)});` +
        `if(${valid}.indexOf(v)===-1)return;` +
        `document.documentElement.setAttribute(${JSON.stringify(TEXT_SIZE_ATTRIBUTE)},v);` +
        `}catch(e){}})();`
    )
}
