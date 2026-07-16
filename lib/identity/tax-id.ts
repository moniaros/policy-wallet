/**
 * Greek tax identification number (ΑΦΜ) utilities.
 *
 * Customers in the agent smart-upload flow are matched and disambiguated
 * primarily by ΑΦΜ. We store a normalized, digits-only value and only treat a
 * VAT as a *confident* single-match key when it is a structurally valid 9-digit
 * ΑΦΜ — see resolveCustomerCandidates.
 */

/**
 * Reduce a raw tax-id string (possibly carrying spaces, dots, dashes, or an
 * EL/GR country prefix) to digits only. Returns null for values too short or
 * long to be a plausible tax id, so callers never match or store on junk.
 */
export function normalizeTaxId(raw: string | null | undefined): string | null {
    if (!raw || typeof raw !== "string") return null;
    const digits = raw.replace(/\D/g, "");
    // Greek ΑΦΜ is 9 digits; allow 8–12 to tolerate foreign VAT numbers while
    // rejecting obvious noise (stray labels, partial captures).
    if (digits.length < 8 || digits.length > 12) return null;
    return digits;
}

/**
 * Validate a 9-digit Greek ΑΦΜ via the official mod-11 checksum. Used to gate
 * whether an extracted VAT is trustworthy enough to be a *strong* single match.
 */
export function isValidGreekAfm(value: string | null | undefined): boolean {
    const afm = normalizeTaxId(value);
    if (!afm || afm.length !== 9) return false;
    if (/^0+$/.test(afm)) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += parseInt(afm[i], 10) * Math.pow(2, 8 - i);
    }
    const check = (sum % 11) % 10;
    return check === parseInt(afm[8], 10);
}

/**
 * Mask a tax id for display in candidate pickers — reveal only the last 3
 * digits so an agent can disambiguate without exposing the full ΑΦΜ.
 */
export function maskTaxId(value: string | null | undefined): string | null {
    const t = normalizeTaxId(value);
    if (!t) return null;
    return `••••••${t.slice(-3)}`;
}
