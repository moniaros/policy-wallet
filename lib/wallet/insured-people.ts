/**
 * Who a policy actually covers.
 *
 * The card is headed «Ασφαλισμένα πρόσωπα» / "Insured people", and its list was
 * built by merging `acordData.beneficiaries` in with the insured names.
 *
 * A δικαιούχος is not an ασφαλισμένος. The insured is the person whose risk the
 * policy carries; the beneficiary is who receives the benefit — and on a life
 * policy that is, by construction, normally NOT the insured, because the insured
 * is dead when it pays. So a life policyholder read
 * «Ασφαλισμένα πρόσωπα: Γιώργος, Μαρία» and could reasonably conclude Μαρία was
 * covered, when Μαρία is merely who gets paid if Γιώργος dies. She has no cover
 * under that contract at all. Someone acting on that belief — declining life
 * cover of their own because they think they already have it — is the concrete
 * harm.
 *
 * Beneficiaries are already displayed correctly elsewhere, under «Δικαιούχοι»
 * with their percentages and a glossary hint, in LifeCoverageDetails. They were
 * being shown twice: once in their own role and once in someone else's.
 *
 * ν. 2496/1997 keeps λήπτης της ασφάλισης, ασφαλισμένος and δικαιούχος as three
 * distinct parties throughout. The pipeline currently writes the same extracted
 * name into both `policyholder.name` and `insured.name`, so those two collapse
 * in practice; the beneficiary is the one that genuinely names someone else.
 */
/**
 * Compare two names as the same person, not as the same bytes.
 *
 * Greek schedules print names in accented mixed case, in unaccented capitals,
 * and with the final sigma written either way — «Ιωάννης Μονιάρος»,
 * «ΙΩΑΝΝΗΣ ΜΟΝΙΑΡΟΣ», «Ιωαννης Μονιαροσ» are one person three times. An exact
 * Set could not tell, so a renewal that restated the name in a different case
 * listed the insured twice.
 */
function personKey(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // combining accents, incl. the Greek tonos
        .toUpperCase()
        .replace(/Σ$/g, "Σ")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Everyone this policy covers.
 *
 * THE FIRST FOUR SOURCES ARE ONE PARTY, NOT FOUR. `insured.name`,
 * `policyholder.name`, the legacy `policy.insuredName` and the
 * customerName/customerSurname pair are four places different pipeline versions
 * have written THE SAME person's name into. Unioning them was only ever
 * invisible because the extractor writes the same string to each — as the note
 * above says, they "collapse in practice".
 *
 * A renewal breaks that assumption. It restates the insured, `mergeAcordData`
 * writes the new value over whichever keys the new document speaks to, and any
 * key it is silent about keeps the OLD value. Union the four and the card lists
 * the customer's old name and their new one side by side, as two covered
 * people. That is what "it added a person instead of updating the name" is.
 *
 * So they are a PRECEDENCE CHAIN — the first that speaks wins, and the newest
 * extraction has already won the write. Only `insureds[]` is a genuine list of
 * distinct people, and it is the only source allowed to add rows.
 */
export function deriveInsuredNames(acord: any): string[] {
    const clean = (v: unknown) => String(v ?? "").trim()

    const primary = [
        acord?.insured?.name,
        acord?.policyholder?.name,
        // Legacy shape; `policy.insuredName` is in no schema and written by
        // nothing, but it costs nothing to keep reading for old rows.
        acord?.policy?.insuredName,
        acord?.customerName && acord?.customerSurname
            ? `${acord.customerName} ${acord.customerSurname}`
            : null,
    ]
        .map(clean)
        .find(Boolean)

    const listed: string[] = Array.isArray(acord?.insureds)
        ? acord.insureds.map((i: any) => clean(i?.name || `${i?.firstName || ""} ${i?.lastName || ""}`))
        : []
    // NOT acord.beneficiaries — see above.

    const seen = new Set<string>()
    const out: string[] = []
    for (const name of [primary, ...listed]) {
        if (!name) continue
        const key = personKey(name)
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(name)
    }
    return out
}
