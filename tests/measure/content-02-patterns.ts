/**
 * The ONE definition of the public-site banned-phrase patterns (PW-CONTENT-02).
 * Imported by the CI guard (tests/unit/voice-guards.test.ts) and the rendered-page
 * measurement (tests/measure/content-02.spec.ts) so the static count (M-P) and the
 * rendered count can never be measured with two different regexes.
 */

/** Retired positioning variants: any claim that PolicyWallet rules on the user's own protection. */
export const POSITIONING_BANNED =
    /έλεγχο[ςυ] ρίσκου|ανάλυσης? ρίσκου|(αν|πού|πόσο)\s+(είστε\s+)?καλυμμένοι|Είστε καλυμμένοι|[Αα]ξιολογούμε|τι κενά έχουν|risk intelligence|risk check|risk score|(tell|show)s?\s+(you\s+)?(if|where)\s+you\s+are\s+covered|you are not covered for|ανεξάρτητ\S*\s+(έλεγχ|ανάλυσ)\S*|independent (risk|analysis|personal)/i

/** Support is EMAIL ONLY: no phone, chat, hours or «dedicated» support promised. */
export const SUPPORT_BANNED =
    /Αποκλειστική υποστήριξη|Dedicated (support|account)|account manager|τηλεφωνικ\S* υποστήριξη|υποστήριξη από το τηλέφωνο|phone support|ώρες λειτουργίας|ώρες που απαντάμε|When we answer|Ωράριο|\bchat\b|24\/7|\+30[\s\d()-]*[\dX]{3}[\s-]?[\dX]{3}|\b2\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|Δευτέρα\s*[–-]\s*Παρασκευή|Monday\s*[–-]\s*Friday|live chat|ζωντανή υποστήριξη/i

/**
 * A renewal reminder attributed to Plus. Every plan gets the 30-day email; only the 90…3-day
 * ladder is Plus/Family, so a line may name Plus only if it also says "earlier"/"90"/the ladder.
 */
export const REMINDER_PLUS =
    /(υπενθυμ|ειδοποι|θυμίζ|remind|alert|warn)[^.\n]{0,90}(από το πλάνο Plus|από το Plus|from the Plus plan|from Plus|με Plus|with Plus)|(Οι υπενθυμίσεις|Υπενθυμίσεις|[Rr]enewal reminders|Reminders)[^.\n]{0,40}\bPlus\b/i
export const REMINDER_PLUS_EXEMPT = /\b90\b|νωρίτερα|πιο νωρίς|earlier|ladder/i

/**
 * The in-app/email arm of the support rule. A bare "chat" is a product feature there (advisor message
 * threads) and an example phone number in a CSV hint is data, so this variant names SUPPORT (hours, phone
 * support, dedicated, live chat, 24/7) rather than every phone-shaped token.
 */
export const IN_APP_SUPPORT_BANNED =
    /Αποκλειστική υποστήριξη|Dedicated (support|account)|account manager|τηλεφωνικ\S* υποστήριξη|υποστήριξη από το τηλέφωνο|phone support|ώρες λειτουργίας|ώρες που απαντάμε|When we answer|Ωράριο|(support|υποστήριξη)[^.\n]{0,25}\bchat\b|\bchat\b[^.\n]{0,25}(support|υποστήριξη)|24\/7|live chat|ζωντανή υποστήριξη/i
