/**
 * The two Greek registers the product speaks, as scanners.
 *
 * The onboarding (app/onboarding, components/onboarding) speaks in the
 * SINGULAR — «όσα μας είπες», «η εικόνα σου». Everything else the customer
 * reads — the dashboard, the lens, the catalogue's body sentences, the
 * recommendation reasons — speaks in the FORMAL PLURAL — «όσα μας είπατε»,
 * «η εικόνα σας». One sentence in the wrong voice breaks the register
 * mid-screen, and it has happened in both directions: «Συνδεθήκατε!» inside
 * the onboarding, and the walker read «Μας δήλωσες 1 όχημα» on the home.
 *
 * Both scanners match whole words only (the `\p{L}` guards), so «σας» never
 * matches inside «σάστισε» and «δες» never matches inside «είδες».
 */

/** Formal-plural forms that must not appear inside the singular onboarding. */
export const FORMAL_PLURAL =
    /(?<![\p{L}])(σας|εσάς|εσείς|έχετε|είστε|βασίζεστε|ανήκετε|απασχολείτε|ταξιδεύετε|εκμισθώνετε|προκαλείτε|περιμένετε|συνδεθήκατε|συνδεθείτε|δείτε|πείτε)(?![\p{L}])/iu

/** Singular forms that must not appear inside the formal surfaces. */
export const SINGULAR_FORMS =
    /(?<![\p{L}])(σου|σένα|εσένα|είπες|δήλωσες|ανέφερες|ξεχώρισες|ξεκαθάρισες|έχεις|είσαι|νοικιάζεις|οδηγείς|μένεις|ξέρεις|βασίζεσαι|θέλεις|μπορείς|σκέψου|διάλεξε|δες|πες|ανέβασε)(?![\p{L}])/iu

/** Every string leaf under a dictionary node, with its dotted path. */
export function stringLeaves(node: unknown, path = ""): Array<[string, string]> {
    if (typeof node === "string") return [[path, node]]
    if (!node || typeof node !== "object") return []
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => stringLeaves(v, path ? `${path}.${k}` : k))
}
