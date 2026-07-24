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
export function deriveInsuredNames(acord: any): string[] {
    const candidates: unknown[] = [
        acord?.insured?.name,
        acord?.policyholder?.name,
        // Legacy shape; `policy.insuredName` is in no schema and written by
        // nothing, but it costs nothing to keep reading for old rows.
        acord?.policy?.insuredName,
        acord?.customerName && acord?.customerSurname
            ? `${acord.customerName} ${acord.customerSurname}`
            : null,
        ...(Array.isArray(acord?.insureds)
            ? acord.insureds.map((i: any) => i?.name || `${i?.firstName || ""} ${i?.lastName || ""}`)
            : []),
        // NOT acord.beneficiaries — see above.
    ]

    return Array.from(
        new Set(candidates.map((v) => String(v || "").trim()).filter(Boolean))
    )
}
