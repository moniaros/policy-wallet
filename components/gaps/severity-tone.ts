import type { SeverityDescription } from "@/lib/gaps/severity-display"

/**
 * The ONE place a severity tone becomes a colour.
 *
 * `describeSeverity()` deliberately returns a neutral token — `urgent`,
 * `elevated`, `moderate`, `informational` — and not a raw colour, so the
 * decision "what does urgent look like" is made once, in the view layer, rather
 * than re-made in every card. Keyed by TONE and not by the severity words, so
 * this is not another map from `critical`/`high`/`medium`/`low` to a class: that
 * shape is exactly what multiplied across eleven surfaces.
 *
 * Colour is never the only carrier. Every caller renders the severity LABEL
 * beside the dot, and the dot itself is aria-hidden.
 */
const DOT: Record<SeverityDescription["tone"], string> = {
    urgent: "bg-rose-500",
    elevated: "bg-amber-500",
    moderate: "bg-sky-500",
    informational: "bg-black/30 dark:bg-white/30",
}

export function toneDotClass(tone: SeverityDescription["tone"]): string {
    return DOT[tone]
}
