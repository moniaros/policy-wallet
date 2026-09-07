/**
 * A Greek first name addressed directly takes the vocative: Γιάννης → Γιάννη,
 * Κώστας → Κώστα, Νίκος → Νίκο. Greeting someone with the nominative («Γεια
 * σας, Γιάννης») is the register of a form letter that mail-merged a database
 * column, which is exactly the feeling the home's greeting must not give.
 *
 * Rule of thumb, deliberately small: masculine names ending in -ς drop the ς.
 * Feminine names (-α, -η, -ω) and anything not in Greek script are unchanged.
 * The formal -ε vocative for some -ος names (Αλέξανδρε) is not attempted — the
 * -ο form is the everyday one and never wrong in a friendly greeting.
 */
export function greekVocative(name: string): string {
    const trimmed = name.trim()
    if (trimmed.length < 3) return trimmed
    if (!/^[Ͱ-Ͽἀ-῿]+$/.test(trimmed)) return trimmed
    if (/[άα]ς$|[ήη]ς$|[όο]ς$|[ούου]ς$/.test(trimmed)) return trimmed.slice(0, -1)
    return trimmed
}
