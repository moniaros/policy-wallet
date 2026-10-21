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
