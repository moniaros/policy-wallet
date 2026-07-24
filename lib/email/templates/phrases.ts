/**
 * Counted phrases for outbound email.
 *
 * Every template interpolated a number in front of a fixed plural noun —
 * `${openGaps} κενά κάλυψης χρειάζονται αντιμετώπιση`, `${newGaps} new coverage
 * gaps detected` — so a reader with exactly one of anything got "1 policies
 * expiring soon" and «1 κενά κάλυψης χρειάζονται αντιμετώπιση».
 *
 * Greek needs the whole clause, not just the noun: the verb agrees too
 * («λήγει» → «λήγουν», «χρειάζεται» → «χρειάζονται»), which is why this takes
 * two complete phrasings rather than a noun and a suffix.
 */
export function counted(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`
}

/**
 * A countdown to expiry, in words.
 *
 * The digest rendered `${daysUntilExpiry} ημ.` / `days`, which reads "1 days"
 * at one day out and "0 days" on the last day of cover — a day that reaches the
 * digest now that the query window no longer excludes it.
 */
export function daysToExpiryPhrase(days: number, isGreek: boolean): string {
    if (days <= 0) return isGreek ? 'λήγει σήμερα' : 'expires today'
    if (days === 1) return isGreek ? 'λήγει αύριο' : 'expires tomorrow'
    return isGreek ? `σε ${days} ημέρες` : `in ${days} days`
}

/**
 * The greeting.
 *
 * Every template opened with «Γεια σου» — the informal singular — and then
 * addressed the same reader with the formal «σας» in the very next sentence.
 * In Greek that is not a nuance: it is the difference between how you write to
 * a friend and how a regulated financial business writes to a client, and the
 * product's own UI copy is formal throughout.
 */
export function greeting(name: string | undefined, isGreek: boolean): string {
    if (isGreek) return name ? `Αγαπητέ/ή ${name},` : 'Καλησπέρα σας,'
    return name ? `Dear ${name},` : 'Hello,'
}
