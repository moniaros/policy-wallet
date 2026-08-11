/**
 * The risk catalog — what can go wrong in a Greek household, and when.
 *
 * Every entry describes a LOSS conditioned on the customer's life, and declares
 * (via `requires`) the facts needed to decide whether that loss is even possible
 * for them. Nothing here is conditioned on the absence of a policy: cover state
 * is applied afterwards, by `assessRisks`, and only to a risk already
 * established as real.
 *
 * Audit corrections carried out here (audits/risk-engine-context-awareness-2026-08.md):
 *
 *   R-02  `chronic_condition_no_health` promised private cover for the declared
 *         condition, which Greek underwriting excludes as pre-existing. Reframed
 *         onto what the market will actually write, with the exclusion stated on
 *         the card and priority dropped from critical.
 *   R-03  `family_history_no_life` spent a morbidity signal on a mortality
 *         product and fired for people with no beneficiary. Family history is now
 *         a priority ESCALATOR on risks that already apply, not a risk of its own.
 *   R-04  `no_health` discarded its profile argument entirely. Private health is
 *         now an access-and-speed risk that is `discretionary` by default and
 *         escalates only on real aggravators, and it is suppressed when a group
 *         scheme is declared.
 *   R-05  `income_no_protection` was permanently shadowed by a life rule on the
 *         same line. It now owns `income_protection` and can surface.
 *   R-15  Professional liability fired identically for every self-employed
 *         person; it now reads `occupation`.
 *   R-16  Renters were invisible. `home_contents_tenant` covers them.
 *   R-17  Business ownership was captured in onboarding and discarded.
 *   R-18  Severity was a per-rule constant; priority is now materiality-scaled.
 */

import type { LifeContext } from "./life-context"
import { conditionLabels, outstandingDebt, totalDependents } from "./life-context"
import type { Bilingual, RiskDefinition, RiskPriority } from "./risk-types"

// ── Formatting ───────────────────────────────────────────────────────

/**
 * Money in the grouping convention of the sentence that carries it. Greek uses
 * "." for thousands, so an English-formatted €150,000 reads as €150 to a Greek
 * reader — in the one string whose whole job is to convey the size of an
 * exposure. (Same defect the old rules file fixed; kept fixed here.)
 */
function eur(amount: number | null | undefined, lang: "el" | "en"): string {
    const n = Number(amount ?? 0)
    return new Intl.NumberFormat(lang === "el" ? "el-GR" : "en-GB", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    }).format(n)
}

/** Greek plural helper for the handful of counted nouns used below. */
function plural(n: number, one: string, many: string): string {
    return n === 1 ? one : many
}

// ── Priority helpers ─────────────────────────────────────────────────

const ORDER: Record<RiskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

/** Raise a priority by `steps` levels, clamped at critical. */
function escalate(base: RiskPriority, steps = 1): RiskPriority {
    const keys: RiskPriority[] = ["critical", "high", "medium", "low"]
    return keys[Math.max(0, ORDER[base] - steps)]
}

/**
 * Does family medical history include a condition that materially raises
 * mortality or morbidity risk? Used ONLY to escalate a risk that already
 * applies — never to create one (audit R-03).
 */
export function hasSeriousFamilyHistory(ctx: LifeContext): boolean {
    const serious = ["heart_disease", "cancer", "stroke", "diabetes"]
    return (ctx.familyMedicalHistory ?? []).some((c) => serious.includes(c))
}

/** Months of income the customer could self-fund from savings. */
export function savingsRunwayMonths(ctx: LifeContext): number | null {
    if (ctx.savingsAmount == null || !ctx.annualIncome || ctx.annualIncome <= 0) return null
    return (ctx.savingsAmount / ctx.annualIncome) * 12
}

/** Is the customer earning — the precondition for any income-replacement need. */
export function isEarning(ctx: LifeContext): boolean {
    return ctx.employmentStatus === "employed" || ctx.employmentStatus === "self_employed"
}

/**
 * Occupations whose professional liability exposure is material enough to name.
 * Matched as substrings against the free-text `occupation`, in both languages,
 * because that column is free text by design (audit R-15).
 */
const HIGH_LIABILITY_OCCUPATIONS: Array<{ keys: string[]; label: Bilingual }> = [
    {
        keys: ["doctor", "physician", "surgeon", "ιατρ", "γιατρ", "χειρουργ"],
        label: { en: "medical practice", el: "ιατρική άσκηση" },
    },
    {
        keys: ["dentist", "οδοντ"],
        label: { en: "dental practice", el: "οδοντιατρική άσκηση" },
    },
    {
        keys: ["lawyer", "attorney", "δικηγόρ", "δικηγορ"],
        label: { en: "legal practice", el: "δικηγορία" },
    },
    {
        keys: ["engineer", "architect", "μηχανικ", "αρχιτέκτ", "αρχιτεκτ"],
        label: { en: "engineering or architectural work", el: "μηχανικός ή αρχιτέκτονας" },
    },
    {
        keys: ["accountant", "auditor", "λογιστ", "ελεγκτ"],
        label: { en: "accounting work", el: "λογιστικές υπηρεσίες" },
    },
    {
        keys: ["pharmac", "φαρμακ"],
        label: { en: "pharmacy practice", el: "φαρμακευτική άσκηση" },
    },
    {
        keys: ["consultant", "σύμβουλ", "συμβουλ"],
        label: { en: "advisory work", el: "συμβουλευτικές υπηρεσίες" },
    },
    {
        keys: ["contractor", "builder", "εργολάβ", "εργολαβ", "κατασκευ"],
        label: { en: "construction work", el: "κατασκευαστικές εργασίες" },
    },
]

export function highLiabilityOccupation(ctx: LifeContext): Bilingual | null {
    const occ = (ctx.occupation ?? "").toLowerCase()
    if (!occ) return null
    for (const entry of HIGH_LIABILITY_OCCUPATIONS) {
        if (entry.keys.some((k) => occ.includes(k))) return entry.label
    }
    return null
}

/** Bilingual labels for declared high-risk activities. */
const ACTIVITY_LABELS: Record<string, Bilingual> = {
    motorsport: { en: "motorsport", el: "μηχανοκίνητα σπορ" },
    climbing: { en: "climbing", el: "αναρρίχηση" },
    skiing: { en: "skiing", el: "σκι" },
    diving: { en: "diving", el: "καταδύσεις" },
    aviation: { en: "aviation", el: "αεροπορικές δραστηριότητες" },
    martial_arts: { en: "martial arts", el: "πολεμικές τέχνες" },
    equestrian: { en: "horse riding", el: "ιππασία" },
    sailing: { en: "sailing", el: "ιστιοπλοΐα" },
    cycling_competitive: { en: "competitive cycling", el: "αγωνιστική ποδηλασία" },
    hunting: { en: "hunting", el: "κυνήγι" },
}

/** "climbing and diving", not "climbing, diving" — this ends a sentence. */
export function activityLabels(ctx: LifeContext, lang: "en" | "el"): string {
    const names = ctx.activities.map((a) => ACTIVITY_LABELS[a]?.[lang] ?? a)
    if (names.length <= 1) return names[0] ?? ""
    const last = names[names.length - 1]
    const conjunction = lang === "el" ? " και " : " and "
    return names.slice(0, -1).join(", ") + conjunction + last
}

// ── Shared caveats ───────────────────────────────────────────────────

/**
 * Life and income products are underwritten on age. Recommending cover a
 * customer cannot buy, or can only buy at a price that defeats the purpose, is
 * not a service — audit §2.2 found the engine raising a CRITICAL life alarm for
 * a 72-year-old.
 */
function lifeAgeCaveat(ctx: LifeContext, ceiling = 70) {
    if (ctx.age == null) return null
    if (ctx.age >= ceiling) {
        return {
            blocking: true,
            note: {
                en: `Most Greek insurers stop writing new life cover around age ${ceiling}, and premiums rise steeply well before that. At ${ctx.age} this is worth discussing with an advisor rather than treating as a gap to close — options exist but they are narrower.`,
                el: `Οι περισσότερες ελληνικές ασφαλιστικές σταματούν να συνάπτουν νέα ασφάλιση ζωής περίπου στα ${ceiling}, και τα ασφάλιστρα ανεβαίνουν απότομα αρκετά νωρίτερα. Στα ${ctx.age} αξίζει συζήτηση με σύμβουλο αντί να αντιμετωπιστεί ως κενό προς κάλυψη — υπάρχουν επιλογές, αλλά είναι πιο περιορισμένες.`,
            },
        }
    }
    if (ctx.age >= 55) {
        return {
            blocking: false,
            note: {
                en: "Premiums for new life cover rise sharply after 55, and medical underwriting is usually required.",
                el: "Τα ασφάλιστρα για νέα ασφάλιση ζωής αυξάνονται απότομα μετά τα 55 και συνήθως απαιτείται ιατρικός έλεγχος.",
            },
        }
    }
    return null
}

// ── Catalog ──────────────────────────────────────────────────────────

export const RISK_CATALOG: RiskDefinition[] = [
    // ─────────────────────────────────────────────────────────────────
    // Loss of life — the household's income and its debts
    // ─────────────────────────────────────────────────────────────────
    {
        id: "life_dependents",
        lineOfBusiness: "life",
        kind: "essential",
        requires: ["dependents", "children"],
        supports: ["income", "age", "maritalStatus", "savings"],
        alsoCoveredBy: ["personal_accident"],
        name: {
            en: "Loss of the income your household depends on",
            el: "Απώλεια του εισοδήματος από το οποίο εξαρτάται το νοικοκυριό σας",
        },
        // Not "you have dependents". A retiree drawing a pension that carries
        // survivor rights has dependents and no income-replacement need, which is
        // why earning matters here (audit §2.2).
        applies: (ctx) => totalDependents(ctx) > 0 && isEarning(ctx),
        riskExplanation: () => ({
            en: "If you die while others rely on your earnings, that income stops immediately while the household's costs do not. Greek survivor pensions replace a fraction of a working income and take time to start paying.",
            el: "Αν φύγετε από τη ζωή ενώ άλλοι στηρίζονται στα εισοδήματά σας, το εισόδημα σταματά αμέσως ενώ τα έξοδα του νοικοκυριού όχι. Η σύνταξη επιζώντων αντικαθιστά ένα κλάσμα ενός εργασιακού εισοδήματος και αργεί να ξεκινήσει.",
        }),
        whyItApplies: (ctx) => {
            const n = totalDependents(ctx)
            return {
                en: `${n} ${plural(n, "person depends", "people depend")} on your income, and you are currently ${ctx.employmentStatus === "self_employed" ? "self-employed" : "working"}.`,
                el: `${n} ${plural(n, "άτομο εξαρτάται", "άτομα εξαρτώνται")} από το εισόδημά σας, και αυτή τη στιγμή ${ctx.employmentStatus === "self_employed" ? "είστε ελεύθερος επαγγελματίας" : "εργάζεστε"}.`,
            }
        },
        expectedImpact: (ctx) => {
            const n = totalDependents(ctx)
            if (ctx.annualIncome && ctx.annualIncome > 0) {
                const fiveYear = ctx.annualIncome * 5
                return {
                    en: `Replacing your income for five years would take roughly ${eur(fiveYear, "en")}. That is the order of the shortfall ${n} ${plural(n, "person", "people")} would face.`,
                    el: `Η αντικατάσταση του εισοδήματός σας για πέντε χρόνια θα απαιτούσε περίπου ${eur(fiveYear, "el")}. Αυτό είναι το μέγεθος του ελλείμματος που θα αντιμετώπιζαν ${n} ${plural(n, "άτομο", "άτομα")}.`,
                }
            }
            return {
                en: "Without your income, the household would need to cover living costs from savings alone. Tell us your income and we can put a figure on the shortfall.",
                el: "Χωρίς το εισόδημά σας, το νοικοκυριό θα κάλυπτε τα έξοδα διαβίωσης μόνο από αποταμιεύσεις. Πείτε μας το εισόδημά σας και μπορούμε να υπολογίσουμε το έλλειμμα.",
            }
        },
        mitigations: () => [
            {
                kind: "transfer",
                label: { en: "Check what your employer already provides", el: "Ελέγξτε τι παρέχει ήδη ο εργοδότης σας" },
                detail: {
                    en: "Death-in-service benefit of one to four times salary is common and costs you nothing. Size anything new against what it already leaves uncovered, not against the whole need.",
                    el: "Παροχή θανάτου εν υπηρεσία ενός έως τεσσάρων ετήσιων μισθών είναι συνηθισμένη και δεν σας κοστίζει τίποτα. Υπολογίστε οτιδήποτε νέο πάνω σε ό,τι μένει ακάλυπτο, όχι στη συνολική ανάγκη.",
                },
            },
            {
                kind: "retain",
                label: { en: "Carry it yourself if assets already cover it", el: "Αναλάβετέ το αν τα περιουσιακά σας στοιχεία ήδη επαρκούν" },
                detail: {
                    en: "Savings and realisable assets that already exceed the shortfall make cover optional rather than necessary.",
                    el: "Αποταμιεύσεις και ρευστοποιήσιμα περιουσιακά στοιχεία που ήδη υπερβαίνουν το έλλειμμα καθιστούν την κάλυψη προαιρετική, όχι απαραίτητη.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Term life cover", el: "Ασφάλιση ζωής ορισμένου χρόνου" },
                detail: {
                    en: "A sum insured sized to the years of income your household would need to replace, for a term ending when the last dependant becomes independent.",
                    el: "Ασφαλισμένο κεφάλαιο υπολογισμένο στα χρόνια εισοδήματος που θα χρειαζόταν να αναπληρωθούν, με διάρκεια έως την ανεξαρτητοποίηση του τελευταίου εξαρτώμενου μέλους.",
                },
                line: "life",
            },
        ],
        priority: (ctx) => {
            let p: RiskPriority = totalDependents(ctx) >= 1 ? "critical" : "high"
            // A large savings buffer genuinely reduces the urgency.
            const runway = savingsRunwayMonths(ctx)
            if (runway != null && runway >= 60) p = "high"
            if (hasSeriousFamilyHistory(ctx)) p = escalate(p)
            return p
        },
        eligibility: (ctx) => lifeAgeCaveat(ctx),
    },

    {
        id: "life_debt",
        lineOfBusiness: "life",
        kind: "essential",
        requires: ["mortgage", "loans"],
        supports: ["age", "dependents", "income"],
        alsoCoveredBy: ["personal_accident"],
        name: {
            en: "Debt outliving you",
            el: "Χρέος που σας επιβιώνει",
        },
        applies: (ctx) => outstandingDebt(ctx) > 0,
        riskExplanation: () => ({
            en: "Debt does not die with the borrower. It attaches to the estate, and a mortgaged home can have to be sold to clear it — by the people living in it.",
            el: "Το χρέος δεν σβήνει με τον δανειολήπτη. Βαρύνει την κληρονομιά, και μια υποθηκευμένη κατοικία μπορεί να χρειαστεί να πουληθεί για να εξοφληθεί — από αυτούς που μένουν σε αυτήν.",
        }),
        whyItApplies: (ctx) => {
            const parts: Array<[string, string]> = []
            if ((ctx.mortgageAmount ?? 0) > 0) {
                parts.push([
                    `a mortgage of ${eur(ctx.mortgageAmount, "en")}`,
                    `στεγαστικό δάνειο ${eur(ctx.mortgageAmount, "el")}`,
                ])
            }
            if ((ctx.loanAmount ?? 0) > 0) {
                parts.push([
                    `other loans of ${eur(ctx.loanAmount, "en")}`,
                    `άλλα δάνεια ${eur(ctx.loanAmount, "el")}`,
                ])
            }
            return {
                en: `You have ${parts.map((p) => p[0]).join(" and ")} outstanding.`,
                el: `Έχετε ${parts.map((p) => p[1]).join(" και ")} σε υπόλοιπο.`,
            }
        },
        expectedImpact: (ctx) => ({
            en: `${eur(outstandingDebt(ctx), "en")} would fall due against your estate.`,
            el: `${eur(outstandingDebt(ctx), "el")} θα βάραιναν την κληρονομιά σας.`,
        }),
        mitigations: () => [
            {
                kind: "avoid",
                label: { en: "Reduce the balance itself", el: "Μειώστε το ίδιο το υπόλοιπο" },
                detail: {
                    en: "Overpaying shrinks the exposure directly and permanently. Every euro repaid is a euro nobody has to insure.",
                    el: "Η πρόωρη αποπληρωμή μειώνει την έκθεση άμεσα και μόνιμα. Κάθε ευρώ που εξοφλείται είναι ένα ευρώ που δεν χρειάζεται να ασφαλιστεί.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Check the policy your lender already required", el: "Ελέγξτε το συμβόλαιο που ήδη ζήτησε η τράπεζα" },
                detail: {
                    en: "Greek lenders commonly require an assigned borrower's life policy as a condition of the loan. It may already be in force — confirm before buying anything.",
                    el: "Οι ελληνικές τράπεζες συνήθως απαιτούν εκχωρημένο ασφαλιστήριο ζωής δανειολήπτη ως όρο του δανείου. Ενδέχεται να ισχύει ήδη — επιβεβαιώστε πριν συνάψετε άλλο.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Decreasing term cover", el: "Ασφάλιση φθίνοντος κεφαλαίου" },
                detail: {
                    en: "A sum insured that falls with the outstanding balance, on a term running to the end of the loan — cheaper than level cover for the same protection.",
                    el: "Ασφαλισμένο κεφάλαιο που μειώνεται μαζί με το υπόλοιπο, με διάρκεια έως τη λήξη του δανείου — φθηνότερο από σταθερό κεφάλαιο για την ίδια προστασία.",
                },
                line: "life",
            },
        ],
        priority: (ctx) => {
            const debt = outstandingDebt(ctx)
            let p: RiskPriority =
                debt >= 100_000 ? "critical" : debt >= 30_000 ? "high" : debt >= 5_000 ? "medium" : "low"
            if (totalDependents(ctx) > 0) p = escalate(p)
            return p
        },
        eligibility: (ctx) => lifeAgeCaveat(ctx),
    },

    // ─────────────────────────────────────────────────────────────────
    // Loss of earning ability
    // ─────────────────────────────────────────────────────────────────
    {
        // Audit R-05: this existed but was permanently shadowed by a life rule on
        // the same line, so «Προστασία Εισοδήματος» — a weighted, labelled score
        // category — had no reachable rule. It now owns its own line.
        id: "income_interruption",
        lineOfBusiness: "income_protection",
        kind: "essential",
        requires: ["selfEmployed", "savings"],
        supports: ["income", "dependents", "age", "hobbies"],
        alsoCoveredBy: ["disability", "personal_accident"],
        name: {
            en: "Being unable to work for months",
            el: "Αδυναμία εργασίας για μήνες",
        },
        applies: (ctx) => isEarning(ctx),
        riskExplanation: (ctx) => ({
            en:
                ctx.employmentStatus === "self_employed"
                    ? "Illness or injury that stops you working stops your invoicing the same day. Self-employed cover from ΕΦΚΑ begins only after a waiting period and pays a fraction of a working income."
                    : "Illness or injury that stops you working eventually exhausts paid sick leave. After that, statutory benefit replaces a fraction of your salary while your outgoings stay the same.",
            el:
                ctx.employmentStatus === "self_employed"
                    ? "Ασθένεια ή τραυματισμός που σας σταματά από την εργασία σταματά την τιμολόγησή σας την ίδια μέρα. Η κάλυψη του ΕΦΚΑ για ελεύθερους επαγγελματίες ξεκινά μετά από περίοδο αναμονής και καταβάλλει κλάσμα ενός εργασιακού εισοδήματος."
                    : "Ασθένεια ή τραυματισμός που σας σταματά από την εργασία εξαντλεί τελικά την αναρρωτική άδεια. Μετά, το επίδομα αντικαθιστά κλάσμα του μισθού σας ενώ τα έξοδά σας παραμένουν ίδια.",
        }),
        whyItApplies: (ctx) => {
            const runway = savingsRunwayMonths(ctx)
            const months = runway != null ? Math.max(0, Math.round(runway)) : null
            const runwayEn =
                months != null
                    ? ` Your savings would cover roughly ${months} ${plural(months, "month", "months")} of income.`
                    : ""
            const runwayEl =
                months != null
                    ? ` Οι αποταμιεύσεις σας θα κάλυπταν περίπου ${months} ${plural(months, "μήνα", "μήνες")} εισοδήματος.`
                    : ""
            return {
                en: `You earn your living ${ctx.employmentStatus === "self_employed" ? "as a self-employed professional" : "from employment"}.${runwayEn}`,
                el: `Το εισόδημά σας προέρχεται ${ctx.employmentStatus === "self_employed" ? "από ελεύθερο επάγγελμα" : "από μισθωτή εργασία"}.${runwayEl}`,
            }
        },
        expectedImpact: (ctx) => {
            if (ctx.annualIncome && ctx.annualIncome > 0) {
                const sixMonths = ctx.annualIncome / 2
                return {
                    en: `Six months unable to work would cost you around ${eur(sixMonths, "en")} of income.`,
                    el: `Έξι μήνες αδυναμίας εργασίας θα σας κόστιζαν περίπου ${eur(sixMonths, "el")} εισοδήματος.`,
                }
            }
            return {
                en: "A long absence from work would have to be funded from savings until you could earn again.",
                el: "Μια μακρά απουσία από την εργασία θα χρηματοδοτούνταν από αποταμιεύσεις μέχρι να μπορέσετε να εργαστείτε ξανά.",
            }
        },
        mitigations: (ctx) => [
            {
                kind: "retain",
                label: { en: "Build the buffer first", el: "Χτίστε πρώτα το απόθεμα" },
                detail: {
                    en: "Six months of expenses in reserve covers most absences outright, and it lets you choose a longer deferred period — which is what makes cover affordable.",
                    el: "Έξι μήνες εξόδων σε απόθεμα καλύπτουν τις περισσότερες απουσίες εξ ολοκλήρου, και σας επιτρέπουν να επιλέξετε μεγαλύτερη περίοδο αναμονής — που είναι αυτό που κάνει την κάλυψη προσιτή.",
                },
            },
            {
                kind: "reduce",
                label: { en: "Establish what you are already entitled to", el: "Διαπιστώστε τι δικαιούστε ήδη" },
                detail: {
                    en: ctx.employmentStatus === "self_employed"
                        ? "ΕΦΚΑ sickness benefit for the self-employed starts after a waiting period. Knowing the exact gap is what tells you how much cover to buy."
                        : "Contractual sick pay plus ΕΦΚΑ benefit covers the first weeks for most employees. The gap starts where they stop.",
                    el: ctx.employmentStatus === "self_employed"
                        ? "Το επίδομα ασθενείας ΕΦΚΑ για ελεύθερους επαγγελματίες ξεκινά μετά από περίοδο αναμονής. Γνωρίζοντας το ακριβές κενό ξέρετε πόση κάλυψη χρειάζεστε."
                        : "Η συμβατική αναρρωτική άδεια μαζί με το επίδομα ΕΦΚΑ καλύπτει τις πρώτες εβδομάδες για τους περισσότερους μισθωτούς. Το κενό ξεκινά εκεί που σταματούν.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Income protection", el: "Ασφάλιση προστασίας εισοδήματος" },
                detail: {
                    en: "A monthly benefit after a deferred period you choose to match your savings. The longer you can self-fund, the less it costs.",
                    el: "Μηνιαίο επίδομα μετά από περίοδο αναμονής που επιλέγετε ώστε να ταιριάζει με τις αποταμιεύσεις σας. Όσο περισσότερο αντέχετε μόνοι, τόσο λιγότερο κοστίζει.",
                },
                line: "income_protection",
            },
        ],
        priority: (ctx) => {
            const runway = savingsRunwayMonths(ctx)
            // Thin savings is what turns a long illness into a household crisis.
            let p: RiskPriority = runway != null && runway < 6 ? "high" : "medium"
            if (ctx.employmentStatus === "self_employed") p = escalate(p)
            if (totalDependents(ctx) > 0) p = escalate(p)
            if (ctx.activities.length > 0) p = escalate(p)
            return ORDER[p] < ORDER["high"] ? "high" : p
        },
    },

    // ─────────────────────────────────────────────────────────────────
    // Vehicles
    // ─────────────────────────────────────────────────────────────────
    {
        id: "motor_liability",
        lineOfBusiness: "motor",
        kind: "essential",
        requires: ["vehicles"],
        supports: [],
        name: {
            en: "Driving without compulsory cover",
            el: "Οδήγηση χωρίς υποχρεωτική κάλυψη",
        },
        applies: (ctx) => ctx.vehiclesCount > 0,
        riskExplanation: () => ({
            // What is compulsory in Greece is third-party liability (αστική
            // ευθύνη), not motor cover in general.
            en: "Third-party liability cover is compulsory for any vehicle in circulation in Greece. Driving uninsured carries plate removal and fines, and leaves you personally liable for injury or damage you cause.",
            el: "Η ασφάλιση αστικής ευθύνης είναι υποχρεωτική για κάθε όχημα σε κυκλοφορία στην Ελλάδα. Η ανασφάλιστη οδήγηση επιφέρει αφαίρεση πινακίδων και πρόστιμα, και σας αφήνει προσωπικά υπεύθυνο για σωματικές βλάβες ή ζημιές που προκαλείτε.",
        }),
        whyItApplies: (ctx) => ({
            en: `You told us you have ${ctx.vehiclesCount} ${plural(ctx.vehiclesCount, "vehicle", "vehicles")}.`,
            el: `Μας δηλώσατε ${ctx.vehiclesCount} ${plural(ctx.vehiclesCount, "όχημα", "οχήματα")}.`,
        }),
        expectedImpact: () => ({
            en: "Third-party injury claims routinely run into six figures, and they are enforceable against you personally.",
            el: "Οι αξιώσεις για σωματικές βλάβες τρίτων φτάνουν συχνά σε εξαψήφια ποσά, και είναι εκτελεστές εναντίον σας προσωπικά.",
        }),
        mitigations: () => [
            {
                kind: "avoid",
                label: { en: "Take it off the road", el: "Θέστε το εκτός κυκλοφορίας" },
                detail: {
                    en: "Depositing the plates (κατάθεση πινακίδων) removes the obligation entirely while the vehicle stays off the road. The right answer for a car you are not using.",
                    el: "Η κατάθεση πινακίδων αίρει πλήρως την υποχρέωση όσο το όχημα παραμένει εκτός κυκλοφορίας. Η σωστή απάντηση για ένα αυτοκίνητο που δεν χρησιμοποιείτε.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Third-party liability cover", el: "Ασφάλιση αστικής ευθύνης" },
                detail: {
                    en: "Compulsory for any vehicle in circulation in Greece. This is not a judgement call — there is no lawful alternative while the vehicle is on the road.",
                    el: "Υποχρεωτική για κάθε όχημα σε κυκλοφορία στην Ελλάδα. Δεν είναι θέμα κρίσης — δεν υπάρχει νόμιμη εναλλακτική όσο το όχημα κυκλοφορεί.",
                },
                line: "motor",
            },
        ],
        priority: () => "critical",
        eligibility: () => ({
            blocking: false,
            note: {
                en: "If a vehicle is off the road with its plates deposited (κατάθεση πινακίδων), cover is not required while it stays off the road.",
                el: "Αν ένα όχημα είναι ακινητοποιημένο με κατάθεση πινακίδων, δεν απαιτείται ασφάλιση όσο παραμένει εκτός κυκλοφορίας.",
            },
        }),
    },

    {
        id: "motor_legal_disputes",
        lineOfBusiness: "legal_expenses",
        kind: "discretionary",
        requires: ["vehicles"],
        supports: [],
        name: {
            en: "Legal costs after a traffic dispute",
            el: "Νομικά έξοδα μετά από τροχαία διαφορά",
        },
        // Requires an actual elevated-litigation signal, not merely owning a car.
        applies: (ctx) =>
            ctx.vehiclesCount > 0 &&
            (ctx.drivingRecord === "major_violations" || ctx.drivingRecord === "accidents"),
        riskExplanation: () => ({
            en: "Contested accident claims turn into legal proceedings. Representation and court costs fall on you regardless of whether you are eventually found at fault.",
            el: "Οι αμφισβητούμενες αξιώσεις από ατυχήματα καταλήγουν σε δικαστικές διαδικασίες. Τα έξοδα εκπροσώπησης και δικαστηρίου σας βαρύνουν ανεξάρτητα από το αν τελικά κριθείτε υπαίτιος.",
        }),
        whyItApplies: (ctx) => ({
            en: `Your declared driving record (${ctx.drivingRecord === "accidents" ? "previous accidents" : "major violations"}) indicates a higher likelihood of a contested claim than average.`,
            el: `Το δηλωμένο οδηγικό σας ιστορικό (${ctx.drivingRecord === "accidents" ? "προηγούμενα ατυχήματα" : "σοβαρές παραβάσεις"}) υποδεικνύει αυξημένη πιθανότητα αμφισβητούμενης αξίωσης.`,
        }),
        expectedImpact: () => ({
            en: "Legal representation in a contested traffic claim typically runs to a few thousand euros before any award.",
            el: "Η νομική εκπροσώπηση σε αμφισβητούμενη τροχαία αξίωση κοστίζει συνήθως μερικές χιλιάδες ευρώ, πριν από οποιαδήποτε επιδίκαση.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Make the facts undisputable", el: "Κάντε τα γεγονότα αδιαμφισβήτητα" },
                detail: {
                    en: "A dashcam and a completed accident statement (φιλική δήλωση) settle most contested claims before they reach a lawyer. This costs almost nothing and prevents the dispute rather than funding it.",
                    el: "Μια κάμερα και μια συμπληρωμένη φιλική δήλωση επιλύουν τις περισσότερες αμφισβητούμενες αξιώσεις πριν φτάσουν σε δικηγόρο. Κοστίζει σχεδόν τίποτα και αποτρέπει τη διαφορά αντί να τη χρηματοδοτεί.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Legal expenses cover", el: "Νομική προστασία" },
                detail: {
                    en: "Usually available as an add-on to the motor policy you already hold, for a fraction of a standalone policy.",
                    el: "Συνήθως διαθέσιμη ως πρόσθετη κάλυψη στο ασφαλιστήριο οχήματος που ήδη έχετε, με κλάσμα του κόστους αυτοτελούς ασφαλιστηρίου.",
                },
                line: "legal_expenses",
            },
        ],
        priority: () => "medium",
    },

    // ─────────────────────────────────────────────────────────────────
    // Where they live
    // ─────────────────────────────────────────────────────────────────
    {
        id: "home_building_damage",
        lineOfBusiness: "home",
        kind: "essential",
        requires: ["residence", "propertyOwnership"],
        supports: ["mortgage"],
        name: {
            en: "Damage to property you own",
            el: "Ζημιά σε ακίνητο που σας ανήκει",
        },
        // An explicit count wins over the residence type. Selling your only
        // property decrements the count but leaves `residenceType` at "owned"
        // until the customer tells us where they moved — and reading the stale
        // type kept the buildings risk open on a property they no longer own.
        applies: (ctx) =>
            ctx.known.propertyOwnership ? ctx.propertiesOwned > 0 : ctx.residenceType === "owned",
        riskExplanation: () => ({
            en: "Greece is one of the most seismically active countries in Europe. Fire, earthquake and flood are each usually a separate cover, and a policy can exclude the one you assumed you had.",
            el: "Η Ελλάδα είναι από τις πιο σεισμογενείς χώρες της Ευρώπης. Η πυρκαγιά, ο σεισμός και η πλημμύρα καλύπτονται συνήθως ξεχωριστά, και ένα ασφαλιστήριο μπορεί να εξαιρεί ακριβώς αυτό που θεωρούσατε δεδομένο.",
        }),
        whyItApplies: (ctx) => ({
            en:
                ctx.propertiesOwned > 1
                    ? `You own ${ctx.propertiesOwned} properties.`
                    : "You own the home you live in.",
            el:
                ctx.propertiesOwned > 1
                    ? `Σας ανήκουν ${ctx.propertiesOwned} ακίνητα.`
                    : "Σας ανήκει η κατοικία στην οποία μένετε.",
        }),
        expectedImpact: () => ({
            en: "Rebuilding costs after a major fire or earthquake run to the full construction value of the property — the largest single loss most households can suffer.",
            el: "Το κόστος ανακατασκευής μετά από μεγάλη πυρκαγιά ή σεισμό φτάνει την πλήρη αξία κατασκευής του ακινήτου — η μεγαλύτερη μεμονωμένη ζημιά που μπορεί να υποστεί ένα νοικοκυριό.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Reduce what a loss would cost", el: "Μειώστε το κόστος μιας ζημιάς" },
                detail: {
                    en: "Seismic assessment of an older building, a working smoke alarm and a maintained electrical installation all lower both the chance and the size of a claim — and several earn a premium discount.",
                    el: "Στατικός έλεγχος παλαιότερης οικοδομής, λειτουργικός ανιχνευτής καπνού και συντηρημένη ηλεκτρική εγκατάσταση μειώνουν και την πιθανότητα και το μέγεθος μιας ζημιάς — και αρκετά από αυτά δίνουν έκπτωση ασφαλίστρου.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Check what the bank already arranged", el: "Ελέγξτε τι έχει ήδη κανονίσει η τράπεζα" },
                detail: {
                    en: "A mortgaged property normally already carries lender-required fire cover. Establish what it includes before adding to it — it rarely includes earthquake.",
                    el: "Ένα υποθηκευμένο ακίνητο συνήθως φέρει ήδη ασφάλιση πυρός που απαιτεί η τράπεζα. Διαπιστώστε τι περιλαμβάνει πριν προσθέσετε — σπάνια περιλαμβάνει σεισμό.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Buildings cover including earthquake", el: "Ασφάλιση οικοδομής με κάλυψη σεισμού" },
                detail: {
                    en: "Sized to rebuild cost, not market value. Insuring a home against fire, earthquake and flood also earns an ΕΝΦΙΑ discount, which offsets part of the premium.",
                    el: "Υπολογισμένη στο κόστος ανακατασκευής, όχι στην εμπορική αξία. Η ασφάλιση κατοικίας για πυρκαγιά, σεισμό και πλημμύρα δίνει και έκπτωση ΕΝΦΙΑ, που αντισταθμίζει μέρος του ασφαλίστρου.",
                },
                line: "home",
            },
        ],
        priority: (ctx) => ((ctx.mortgageAmount ?? 0) > 0 ? "critical" : "high"),
        // One policy does not cover two houses.
        minPolicies: (ctx) => Math.max(1, ctx.propertiesOwned),
        eligibility: (ctx) => {
            if (ctx.propertiesOwned > 1) {
                return {
                    blocking: false,
                    note: {
                        en: "A second home is not covered by the policy on your first, and most Greek home policies restrict or void cover once a property has stood unoccupied for 30–60 consecutive days — the normal state of a holiday home. Check the unoccupancy clause on each property separately.",
                        el: "Η δεύτερη κατοικία δεν καλύπτεται από το ασφαλιστήριο της πρώτης, και τα περισσότερα ελληνικά ασφαλιστήρια κατοικίας περιορίζουν ή ακυρώνουν την κάλυψη όταν ένα ακίνητο μείνει ακατοίκητο για 30–60 συνεχόμενες ημέρες — η κανονική κατάσταση μιας εξοχικής κατοικίας. Ελέγξτε τον όρο μη κατοίκησης χωριστά για κάθε ακίνητο.",
                    },
                }
            }
            if ((ctx.mortgageAmount ?? 0) > 0) {
                return {
                    blocking: false,
                    note: {
                        en: "Greek mortgage lenders normally require fire cover on the security as a condition of the loan, so a policy may already be in force through your bank. Worth confirming before buying another.",
                        el: "Οι ελληνικές τράπεζες συνήθως απαιτούν ασφάλιση πυρός επί του ενυπόθηκου ακινήτου ως όρο του δανείου, οπότε ενδέχεται να υπάρχει ήδη συμβόλαιο μέσω της τράπεζάς σας. Αξίζει να επιβεβαιωθεί πριν συνάψετε άλλο.",
                    },
                }
            }
            return null
        },
    },

    {
        // Audit R-16: an entire segment the engine could not see. `ownsHome=false`
        // was read as "no property risk" when it actually means "someone else owns
        // the building and everything inside it is still yours".
        id: "home_contents_tenant",
        lineOfBusiness: "renters",
        kind: "discretionary",
        // `tenancy`, not `residence`: knowing someone is not an owner does not
        // establish that they rent.
        requires: ["tenancy"],
        supports: ["valuables"],
        alsoCoveredBy: ["home", "liability"],
        name: {
            en: "Your belongings and damage you cause as a tenant",
            el: "Τα υπάρχοντά σας και ζημιές που προκαλείτε ως ενοικιαστής",
        },
        applies: (ctx) => ctx.residenceType === "rented",
        riskExplanation: () => ({
            en: "Your landlord's policy covers the building, not your possessions. It also does not cover you if a leak from your flat damages the one below — a claim tenants in Greek apartment blocks meet regularly.",
            el: "Το ασφαλιστήριο του ιδιοκτήτη καλύπτει το κτίριο, όχι τα υπάρχοντά σας. Ούτε σας καλύπτει αν μια διαρροή από το διαμέρισμά σας προκαλέσει ζημιά στο από κάτω — αξίωση που οι ενοικιαστές σε ελληνικές πολυκατοικίες συναντούν τακτικά.",
        }),
        whyItApplies: () => ({
            en: "You rent the home you live in, so the building is insured by someone else and your contents are not.",
            el: "Ενοικιάζετε την κατοικία σας, οπότε το κτίριο ασφαλίζεται από άλλον και τα περιεχόμενά σας όχι.",
        }),
        expectedImpact: (ctx) =>
            ctx.valuablesValue && ctx.valuablesValue > 0
                ? {
                      en: `You have declared ${eur(ctx.valuablesValue, "en")} of valuables, and water damage to a neighbouring flat commonly runs to several thousand euros on top.`,
                      el: `Έχετε δηλώσει ${eur(ctx.valuablesValue, "el")} σε τιμαλφή, και η ζημιά από νερά σε γειτονικό διαμέρισμα κοστίζει συνήθως αρκετές χιλιάδες ευρώ επιπλέον.`,
                  }
                : {
                      en: "Replacing the contents of a flat after fire or theft typically runs to five figures; liability for water damage to a neighbour adds to it.",
                      el: "Η αντικατάσταση των περιεχομένων ενός διαμερίσματος μετά από πυρκαγιά ή κλοπή κοστίζει συνήθως πενταψήφιο ποσό· η ευθύνη για ζημιά από νερά σε γείτονα προστίθεται.",
                  },
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Prevent the claim tenants actually make", el: "Αποτρέψτε την αξίωση που όντως κάνουν οι ενοικιαστές" },
                detail: {
                    en: "Water damage to the flat below is the common one. Knowing where your stopcock is, and closing it when away for more than a few days, prevents most of it.",
                    el: "Η ζημιά από νερά στο από κάτω διαμέρισμα είναι η συνηθισμένη. Το να ξέρετε πού είναι ο γενικός διακόπτης νερού και να τον κλείνετε σε απουσίες άνω των λίγων ημερών την αποτρέπει σε μεγάλο βαθμό.",
                },
            },
            {
                kind: "retain",
                label: { en: "Carry it yourself if the contents are modest", el: "Αναλάβετέ το αν τα περιεχόμενα είναι μικρής αξίας" },
                detail: {
                    en: "If replacing everything you own would not seriously hurt, contents cover is optional. The liability half is the part that can exceed what you could absorb.",
                    el: "Αν η αντικατάσταση όλων όσων έχετε δεν θα σας έβλαπτε σοβαρά, η ασφάλιση περιεχομένου είναι προαιρετική. Το σκέλος της αστικής ευθύνης είναι αυτό που μπορεί να ξεπεράσει όσα θα αντέχατε.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Contents cover with tenant's liability", el: "Ασφάλιση περιεχομένου με αστική ευθύνη ενοικιαστή" },
                detail: {
                    en: "Usually one of the cheapest policies on the market, and the liability section is the reason to hold it.",
                    el: "Συνήθως από τα φθηνότερα ασφαλιστήρια της αγοράς, και το τμήμα της αστικής ευθύνης είναι ο λόγος να το έχετε.",
                },
                line: "renters",
            },
        ],
        priority: (ctx) => ((ctx.valuablesValue ?? 0) >= 10_000 ? "medium" : "low"),
    },

    {
        id: "landlord_letting",
        lineOfBusiness: "home",
        kind: "essential",
        requires: ["tenants"],
        supports: ["propertyOwnership"],
        alsoCoveredBy: ["liability"],
        name: {
            en: "Property you let to tenants",
            el: "Ακίνητο που εκμισθώνετε σε ενοικιαστές",
        },
        // You cannot be letting property you no longer own. Reading the flag
        // alone kept this open after a sale, because a disposal decrements the
        // count without touching a boolean the customer set months earlier.
        applies: (ctx) =>
            ctx.rentsOutProperty && (!ctx.known.propertyOwnership || ctx.propertiesOwned > 0),
        riskExplanation: () => ({
            en: "A standard owner-occupier policy usually does not cover a let property. As landlord you also carry liability for injury caused by the building's condition, and you lose rental income while it is uninhabitable.",
            el: "Ένα τυπικό ασφαλιστήριο ιδιοκατοίκησης συνήθως δεν καλύπτει εκμισθωμένο ακίνητο. Ως εκμισθωτής φέρετε επίσης ευθύνη για σωματικές βλάβες από την κατάσταση του κτιρίου, και χάνετε το μίσθωμα όσο είναι ακατοίκητο.",
        }),
        whyItApplies: () => ({
            en: "You told us you let out property.",
            el: "Μας δηλώσατε ότι εκμισθώνετε ακίνητο.",
        }),
        expectedImpact: () => ({
            en: "Beyond the repair itself, months of lost rent and a liability claim from a tenant are both realistic and both uninsured under an owner-occupier wording.",
            el: "Πέρα από την ίδια την επισκευή, μήνες απώλειας μισθωμάτων και αξίωση ευθύνης από ενοικιαστή είναι και τα δύο ρεαλιστικά και ανασφάλιστα υπό όρους ιδιοκατοίκησης.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Document the property and keep it compliant", el: "Τεκμηριώστε το ακίνητο και κρατήστε το εντός προδιαγραφών" },
                detail: {
                    en: "A dated inventory with photographs, and current electrical and gas certificates, both prevent disputes and defend you when a tenant claims the building's condition caused injury.",
                    el: "Ένα χρονολογημένο πρωτόκολλο παράδοσης με φωτογραφίες, και ισχύοντα πιστοποιητικά ηλεκτρολογικής και εγκατάστασης αερίου, αποτρέπουν διαφορές και σας υπερασπίζονται όταν ενοικιαστής ισχυριστεί ότι η κατάσταση του κτιρίου προκάλεσε τραυματισμό.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Push what you can into the tenancy agreement", el: "Μεταφέρετε ό,τι μπορείτε στο μισθωτήριο" },
                detail: {
                    en: "A deposit and clear repair obligations transfer part of the exposure contractually, at no premium. They do not cover the building or lost rent.",
                    el: "Μια εγγύηση και σαφείς υποχρεώσεις επισκευών μεταφέρουν μέρος της έκθεσης συμβατικά, χωρίς ασφάλιστρο. Δεν καλύπτουν όμως το κτίριο ούτε την απώλεια μισθωμάτων.",
                },
            },
            {
                kind: "transfer",
                label: { en: "A landlord policy", el: "Ασφαλιστήριο εκμισθωτή" },
                detail: {
                    en: "Covers the let property, loss of rent while it is uninhabitable, and property owner's liability — none of which an owner-occupier wording includes.",
                    el: "Καλύπτει το εκμισθωμένο ακίνητο, την απώλεια μισθωμάτων όσο είναι ακατοίκητο, και την αστική ευθύνη ιδιοκτήτη — τίποτα από τα οποία δεν περιλαμβάνουν οι όροι ιδιοκατοίκησης.",
                },
                line: "home",
            },
        ],
        priority: () => "high",
    },

    {
        // Validation round 1: the engine could not see a boat at all, so a boat
        // owner — who carries a COMPULSORY third-party liability under the Greek
        // recreational-craft regime — was assessed as if they owned nothing on
        // the water. The mission's rule cuts both ways: no boat is not a gap, and
        // a boat is not something to stay silent about.
        id: "boat_liability",
        lineOfBusiness: "boat",
        kind: "essential",
        requires: ["boat"],
        supports: ["valuables", "hobbies"],
        name: {
            en: "Third-party liability and loss on the water",
            el: "Αστική ευθύνη και ζημιά στη θάλασσα",
        },
        applies: (ctx) => ctx.ownsBoat,
        riskExplanation: () => ({
            en: "Third-party liability cover is compulsory for recreational craft in Greece, and the harbour authority can refuse to release a vessel without it. Beyond liability, salvage and wreck removal are frequently the largest costs after an incident and are commonly excluded unless specifically insured.",
            el: "Η ασφάλιση αστικής ευθύνης είναι υποχρεωτική για τα σκάφη αναψυχής στην Ελλάδα, και η λιμενική αρχή μπορεί να αρνηθεί τον απόπλου χωρίς αυτήν. Πέρα από την ευθύνη, η ναυαγιαίρεση και η ανέλκυση είναι συχνά τα μεγαλύτερα κόστη μετά από συμβάν και συνήθως εξαιρούνται αν δεν ασφαλιστούν ρητά.",
        }),
        whyItApplies: () => ({
            en: "You told us you own a boat.",
            el: "Μας δηλώσατε ότι έχετε σκάφος.",
        }),
        expectedImpact: () => ({
            en: "Injury to a passenger or another vessel's crew is enforceable against you personally, and wreck removal alone routinely runs to tens of thousands of euros.",
            el: "Ο τραυματισμός επιβάτη ή πληρώματος άλλου σκάφους είναι εκτελεστός εναντίον σας προσωπικά, και μόνο η ανέλκυση ναυαγίου κοστίζει συνήθως δεκάδες χιλιάδες ευρώ.",
        }),
        mitigations: () => [
            {
                kind: "avoid",
                label: { en: "Lay up outside the season", el: "Παροπλίστε εκτός σεζόν" },
                detail: {
                    en: "A vessel ashore and out of commission carries a fraction of the exposure, and most policies price the laying-up period accordingly.",
                    el: "Ένα σκάφος στη στεριά και εκτός λειτουργίας φέρει κλάσμα της έκθεσης, και τα περισσότερα ασφαλιστήρια κοστολογούν αναλόγως την περίοδο παροπλισμού.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Marine third-party liability", el: "Ασφάλιση αστικής ευθύνης σκάφους" },
                detail: {
                    en: "Compulsory for recreational craft in Greece — the harbour authority can refuse to release a vessel without it. Add hull, salvage and wreck removal against the vessel's value.",
                    el: "Υποχρεωτική για σκάφη αναψυχής στην Ελλάδα — η λιμενική αρχή μπορεί να αρνηθεί τον απόπλου χωρίς αυτήν. Προσθέστε κάλυψη σκάφους, ναυαγιαίρεσης και ανέλκυσης βάσει της αξίας του.",
                },
                line: "boat",
            },
        ],
        priority: () => "high",
        eligibility: () => ({
            blocking: false,
            note: {
                en: "The compulsory limits depend on the craft's length and engine power, and cover is normally suspended outside the navigation area and laying-up period stated in the policy.",
                el: "Τα υποχρεωτικά όρια εξαρτώνται από το μήκος και την ιπποδύναμη του σκάφους, και η κάλυψη συνήθως αναστέλλεται εκτός της περιοχής πλόων και της περιόδου παροπλισμού που ορίζει το ασφαλιστήριο.",
            },
        }),
    },

    {
        id: "valuables_loss",
        lineOfBusiness: "gadget",
        kind: "discretionary",
        requires: ["valuables"],
        supports: ["residence"],
        // `fine_art` answers this risk directly and more completely than a
        // contents policy does — it is the line whose whole purpose is the
        // single-article limit this risk describes. Added rather than made the
        // primary line so the existing attribution to `gadget` is unchanged.
        alsoCoveredBy: ["home", "renters", "fine_art"],
        name: {
            en: "High-value possessions outside standard limits",
            el: "Αντικείμενα υψηλής αξίας εκτός τυπικών ορίων",
        },
        applies: (ctx) => (ctx.valuablesValue ?? 0) >= 5_000,
        riskExplanation: () => ({
            en: "Contents policies cap individual valuable items — jewellery, watches, art, instruments, bicycles — at a low single-article limit, and often exclude them entirely away from the home.",
            el: "Τα ασφαλιστήρια περιεχομένου θέτουν χαμηλό όριο ανά αντικείμενο για τιμαλφή — κοσμήματα, ρολόγια, έργα τέχνης, όργανα, ποδήλατα — και συχνά τα εξαιρούν εντελώς εκτός κατοικίας.",
        }),
        whyItApplies: (ctx) => ({
            en: `You have declared valuables worth around ${eur(ctx.valuablesValue, "en")}.`,
            el: `Έχετε δηλώσει τιμαλφή αξίας περίπου ${eur(ctx.valuablesValue, "el")}.`,
        }),
        expectedImpact: (ctx) => ({
            en: `Up to ${eur(ctx.valuablesValue, "en")} could be lost to a single theft and fall outside the single-article limit of a standard contents policy.`,
            el: `Έως ${eur(ctx.valuablesValue, "el")} θα μπορούσαν να χαθούν σε μία κλοπή και να μείνουν εκτός του ορίου ανά αντικείμενο ενός τυπικού ασφαλιστηρίου περιεχομένου.`,
        }),
        mitigations: (ctx) => [
            {
                kind: "reduce",
                label: { en: "Store and record them properly", el: "Φυλάξτε και καταγράψτε τα σωστά" },
                detail: {
                    en: "A rated safe, photographs and current valuations do three things at once: they cut the chance of loss, they make a claim payable, and insurers price on them.",
                    el: "Ένα πιστοποιημένο χρηματοκιβώτιο, φωτογραφίες και ενημερωμένες εκτιμήσεις κάνουν τρία πράγματα ταυτόχρονα: μειώνουν την πιθανότητα απώλειας, καθιστούν μια αξίωση πληρωτέα, και οι ασφαλιστές τα λαμβάνουν υπόψη στην τιμολόγηση.",
                },
            },
            {
                kind: "retain",
                label: { en: "Carry the smaller items yourself", el: "Αναλάβετε μόνοι τα μικρότερα αντικείμενα" },
                detail: {
                    en: "Specifying every item is rarely worth it. Insure what sits above the single-article limit and absorb the rest.",
                    el: "Η κατονομασία κάθε αντικειμένου σπάνια αξίζει. Ασφαλίστε ό,τι υπερβαίνει το όριο ανά αντικείμενο και απορροφήστε τα υπόλοιπα.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Specified-items cover", el: "Κάλυψη κατονομαζόμενων αντικειμένων" },
                detail: {
                    en: "«All Risks», as the wordings print it, listing each valuable individually — either as an extension of a contents policy or standalone, and it follows the item away from the home.",
                    el: "«All Risks», όπως αναγράφεται στα ασφαλιστήρια, με ξεχωριστή αναφορά κάθε τιμαλφούς — είτε ως επέκταση ασφαλιστηρίου περιεχομένου είτε αυτοτελώς, και ακολουθεί το αντικείμενο εκτός κατοικίας.",
                },
                line: "gadget",
            },
        ],
        priority: (ctx) => ((ctx.valuablesValue ?? 0) >= 25_000 ? "medium" : "low"),
    },

    // ─────────────────────────────────────────────────────────────────
    // Health
    // ─────────────────────────────────────────────────────────────────
    {
        // Audit R-04. The old rule read `condition: (_p, policies) => !hasActiveLine(...)`
        // — it discarded the profile entirely and recommended from product
        // absence. Everyone in Greece has ΕΦΚΑ/ΕΟΠΥΥ, so the real exposure is
        // access latency and provider choice, not absence of cover. Discretionary
        // by default; it escalates only on aggravators that genuinely change it.
        id: "health_access_delay",
        lineOfBusiness: "health",
        kind: "discretionary",
        requires: [],
        supports: ["age", "dependents", "selfEmployed", "income"],
        alsoCoveredBy: ["group_health"],
        name: {
            en: "Waiting for treatment when it matters",
            el: "Αναμονή για θεραπεία τη στιγμή που μετράει",
        },
        // A real exposure for everyone — but it is about speed and choice, not
        // about being uninsured.
        applies: () => true,
        riskExplanation: () => ({
            en: "ΕΟΠΥΥ covers treatment, but waiting lists for specialists and non-urgent surgery in the public system can run to months. Private cover buys speed and choice of doctor, not cover you otherwise lack entirely.",
            el: "Ο ΕΟΠΥΥ καλύπτει τη θεραπεία, όμως οι λίστες αναμονής για ειδικούς και μη επείγοντα χειρουργεία στο δημόσιο σύστημα μπορεί να φτάνουν μήνες. Η ιδιωτική κάλυψη αγοράζει ταχύτητα και επιλογή γιατρού, όχι κάλυψη που σας λείπει εντελώς.",
        }),
        whyItApplies: (ctx) => {
            if (ctx.employmentStatus === "self_employed") {
                return {
                    en: "You are self-employed, so time spent waiting for treatment is also time not earning.",
                    el: "Είστε ελεύθερος επαγγελματίας, οπότε ο χρόνος αναμονής για θεραπεία είναι και χρόνος χωρίς εισόδημα.",
                }
            }
            if (totalDependents(ctx) > 0) {
                return {
                    en: "Others depend on you, so a long wait for treatment affects more than one person.",
                    el: "Άλλοι εξαρτώνται από εσάς, οπότε μια μεγάλη αναμονή για θεραπεία επηρεάζει περισσότερους από έναν.",
                }
            }
            return {
                en: "Everyone faces this; how much it matters depends on how long you could wait.",
                el: "Όλοι το αντιμετωπίζουν· το πόσο σας αφορά εξαρτάται από το πόσο θα μπορούσατε να περιμένετε.",
            }
        },
        expectedImpact: () => ({
            en: "Typically months of waiting rather than a financial loss — the cost is delay, and paying privately out of pocket for a single procedure.",
            el: "Συνήθως μήνες αναμονής παρά οικονομική ζημιά — το κόστος είναι η καθυστέρηση και η ιδιωτική πληρωμή από την τσέπη για μία επέμβαση.",
        }),
        mitigations: () => [
            {
                kind: "retain",
                label: { en: "Pay privately for the occasional appointment", el: "Πληρώστε ιδιωτικά την περιστασιακή επίσκεψη" },
                detail: {
                    en: "A private specialist consultation costs far less than an annual premium. For someone who rarely needs one, paying as you go is the cheaper answer and should be said plainly.",
                    el: "Μια ιδιωτική επίσκεψη σε ειδικό κοστίζει πολύ λιγότερο από ένα ετήσιο ασφάλιστρο. Για κάποιον που σπάνια τη χρειάζεται, η πληρωμή κατά περίπτωση είναι η φθηνότερη απάντηση και αξίζει να λέγεται ευθέως.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Check your employer's group scheme", el: "Ελέγξτε το ομαδικό πρόγραμμα του εργοδότη σας" },
                detail: {
                    en: "Group health cover is common in larger Greek employers and often extends to family at low cost. It usually answers this entirely.",
                    el: "Η ομαδική ασφάλιση υγείας είναι συνηθισμένη σε μεγαλύτερους ελληνικούς εργοδότες και συχνά επεκτείνεται στην οικογένεια με χαμηλό κόστος. Συνήθως το καλύπτει πλήρως.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Private health cover", el: "Ιδιωτική ασφάλιση υγείας" },
                detail: {
                    en: "Or a lower-cost hospital-only plan if the speed of surgery is the main concern rather than outpatient access.",
                    el: "Ή ένα οικονομικότερο πρόγραμμα μόνο νοσοκομειακής περίθαλψης, αν το κύριο ζητούμενο είναι η ταχύτητα χειρουργείου και όχι η εξωνοσοκομειακή πρόσβαση.",
                },
                line: "health",
            },
        ],
        priority: (ctx) => {
            let p: RiskPriority = "low"
            if (ctx.employmentStatus === "self_employed" || totalDependents(ctx) > 0) p = "medium"
            if (ctx.age != null && ctx.age >= 50) p = "medium"
            if (hasSeriousFamilyHistory(ctx)) p = escalate(p)
            return p
        },
    },

    {
        // Audit R-02. The old rule fired at CRITICAL and told a diabetic that
        // private health insurance "ensures ongoing treatment" — for the very
        // condition Greek underwriting excludes as pre-existing. The risk is real;
        // the product claimed for it was not. Reframed onto what the market will
        // actually write, with the exclusion stated on the card itself.
        id: "chronic_condition_costs",
        lineOfBusiness: "health",
        kind: "discretionary",
        // Gated on the health factor, not left ungated. Without it, a customer
        // nobody had ever asked about their health was told this risk did not
        // apply — the engine asserting they have no chronic condition on the
        // strength of a question never put to them.
        requires: ["health"],
        supports: ["age", "income"],
        alsoCoveredBy: ["group_health", "personal_accident"],
        name: {
            en: "Ongoing costs of a chronic condition",
            el: "Διαρκή έξοδα χρόνιας πάθησης",
        },
        applies: (ctx) => (ctx.chronicConditions?.length ?? 0) > 0,
        riskExplanation: () => ({
            en: "A chronic condition brings recurring costs — monitoring, specialist visits, medication co-payments — and raises the chance of a hospital admission for something related.",
            el: "Μια χρόνια πάθηση συνεπάγεται επαναλαμβανόμενα έξοδα — παρακολούθηση, επισκέψεις σε ειδικούς, συμμετοχή σε φάρμακα — και αυξάνει την πιθανότητα νοσηλείας για κάτι σχετικό.",
        }),
        whyItApplies: (ctx) => ({
            en: `You have declared an ongoing condition (${conditionLabels(ctx.chronicConditions, "en")}).`,
            el: `Έχετε δηλώσει χρόνια πάθηση (${conditionLabels(ctx.chronicConditions, "el")}).`,
        }),
        expectedImpact: () => ({
            en: "Recurring outpatient costs are the usual burden; a related admission is the occasional large one.",
            el: "Τα επαναλαμβανόμενα εξωνοσοκομειακά έξοδα είναι το συνήθες βάρος· μια σχετική νοσηλεία είναι το περιστασιακά μεγάλο.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Use the entitlements you already have", el: "Αξιοποιήστε τα δικαιώματα που ήδη έχετε" },
                detail: {
                    en: "ΕΟΠΥΥ covers monitoring and most medication for recognised chronic conditions, and reimbursement rates are higher than most people assume. Establish that baseline before paying for anything.",
                    el: "Ο ΕΟΠΥΥ καλύπτει την παρακολούθηση και τα περισσότερα φάρμακα για αναγνωρισμένες χρόνιες παθήσεις, και τα ποσοστά αποζημίωσης είναι υψηλότερα από όσο νομίζουν οι περισσότεροι. Διαπιστώστε αυτή τη βάση πριν πληρώσετε για οτιδήποτε.",
                },
            },
            {
                kind: "retain",
                label: { en: "Budget the recurring cost", el: "Προϋπολογίστε το επαναλαμβανόμενο κόστος" },
                detail: {
                    en: "Recurring outpatient costs are predictable, which makes them a budgeting problem rather than an insurance one. Insurance answers the unpredictable part.",
                    el: "Τα επαναλαμβανόμενα εξωνοσοκομειακά έξοδα είναι προβλέψιμα, οπότε αποτελούν θέμα προϋπολογισμού και όχι ασφάλισης. Η ασφάλιση απαντά στο απρόβλεπτο σκέλος.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Hospital cash", el: "Νοσοκομειακό επίδομα" },
                detail: {
                    en: "Pays a fixed daily amount regardless of cause, and is usually obtainable where full medical cover is not. Full health cover remains worth pricing for conditions unrelated to the one declared.",
                    el: "Καταβάλλει σταθερό ημερήσιο ποσό ανεξαρτήτως αιτίας, και είναι συνήθως εφικτό εκεί όπου η πλήρης ιατρική κάλυψη δεν είναι. Η πλήρης ασφάλιση υγείας παραμένει άξια κοστολόγησης για παθήσεις άσχετες με τη δηλωθείσα.",
                },
                line: "health",
            },
        ],
        priority: () => "medium",
        // Non-blocking: the risk is real and there IS an appropriate product —
        // just not the one the old rule named.
        eligibility: () => ({
            blocking: false,
            note: {
                en: "Greek health insurers routinely exclude pre-existing conditions (προϋπάρχουσες παθήσεις), often permanently. A new policy is unlikely to cover the condition you have declared — treat any quote for it with that in mind.",
                el: "Οι ελληνικές ασφαλιστικές υγείας εξαιρούν συστηματικά τις προϋπάρχουσες παθήσεις, συχνά μόνιμα. Ένα νέο ασφαλιστήριο είναι απίθανο να καλύψει την πάθηση που δηλώσατε — αξιολογήστε κάθε προσφορά με αυτό υπόψη.",
            },
        }),
    },

    // ─────────────────────────────────────────────────────────────────
    // Work & business
    // ─────────────────────────────────────────────────────────────────
    {
        id: "professional_liability",
        lineOfBusiness: "liability",
        kind: "essential",
        requires: ["selfEmployed"],
        supports: ["businessOwnership", "income"],
        alsoCoveredBy: ["professional_liability", "business"],
        name: {
            en: "Being sued over your professional work",
            el: "Αγωγή για την επαγγελματική σας εργασία",
        },
        applies: (ctx) => ctx.isSelfEmployed || ctx.ownsBusiness,
        riskExplanation: (ctx) => {
            const occ = highLiabilityOccupation(ctx)
            return {
                en: occ
                    ? `Claims arising from ${occ.en} are made against you personally, and defence costs start accruing long before liability is decided.`
                    : "A client claiming your work caused them loss sues you personally. Defence costs start accruing long before liability is decided.",
                el: occ
                    ? `Οι αξιώσεις που προκύπτουν από ${occ.el} στρέφονται εναντίον σας προσωπικά, και τα έξοδα υπεράσπισης τρέχουν πολύ πριν κριθεί η ευθύνη.`
                    : "Ένας πελάτης που ισχυρίζεται ότι η εργασία σας του προκάλεσε ζημιά σας ενάγει προσωπικά. Τα έξοδα υπεράσπισης τρέχουν πολύ πριν κριθεί η ευθύνη.",
            }
        },
        whyItApplies: (ctx) => {
            const occ = highLiabilityOccupation(ctx)
            if (occ) {
                return {
                    en: `You are self-employed in ${occ.en}, where professional indemnity is expected and in some cases required to practise.`,
                    el: `Είστε ελεύθερος επαγγελματίας σε ${occ.el}, όπου η επαγγελματική αστική ευθύνη θεωρείται δεδομένη και σε ορισμένες περιπτώσεις απαιτείται για την άσκηση.`,
                }
            }
            return {
                en: ctx.ownsBusiness
                    ? "You own a business, so claims arising from its work can reach you."
                    : "You are self-employed, so claims arising from your work reach you personally.",
                el: ctx.ownsBusiness
                    ? "Έχετε επιχείρηση, οπότε αξιώσεις από τη δραστηριότητά της μπορούν να σας φτάσουν."
                    : "Είστε ελεύθερος επαγγελματίας, οπότε οι αξιώσεις από την εργασία σας σας φτάνουν προσωπικά.",
            }
        },
        expectedImpact: () => ({
            en: "Defence costs alone commonly reach five figures even where the claim ultimately fails.",
            el: "Μόνο τα έξοδα υπεράσπισης φτάνουν συχνά πενταψήφια ποσά ακόμη και όταν η αξίωση τελικά απορρίπτεται.",
        }),
        mitigations: () => [
            {
                kind: "transfer",
                label: { en: "Cap your liability in the engagement", el: "Περιορίστε την ευθύνη σας στη σύμβαση" },
                detail: {
                    en: "A written scope of work with a liability cap moves part of the exposure back to the client contractually, before any premium is paid. It is the cheapest control available and most freelancers skip it.",
                    el: "Ένα γραπτό αντικείμενο εργασιών με ανώτατο όριο ευθύνης μεταφέρει μέρος της έκθεσης συμβατικά στον πελάτη, πριν πληρωθεί οποιοδήποτε ασφάλιστρο. Είναι ο φθηνότερος διαθέσιμος έλεγχος και οι περισσότεροι ελεύθεροι επαγγελματίες τον παραλείπουν.",
                },
            },
            {
                kind: "reduce",
                label: { en: "Keep a defensible record", el: "Κρατήστε τεκμηριωμένο αρχείο" },
                detail: {
                    en: "Most professional claims turn on what was agreed. Written instructions, dated approvals and retained working notes decide them.",
                    el: "Οι περισσότερες επαγγελματικές αξιώσεις κρίνονται από το τι συμφωνήθηκε. Γραπτές οδηγίες, χρονολογημένες εγκρίσεις και τηρημένες σημειώσεις εργασίας τις κρίνουν.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Professional indemnity cover", el: "Ασφάλιση επαγγελματικής αστικής ευθύνης" },
                detail: {
                    en: "Sized to your contract values, with defence costs included — defence is what accrues first and often exceeds the claim.",
                    el: "Προσαρμοσμένη στις αξίες των συμβάσεών σας, με κάλυψη εξόδων υπεράσπισης — η υπεράσπιση είναι αυτό που τρέχει πρώτο και συχνά ξεπερνά την ίδια την αξίωση.",
                },
                line: "liability",
            },
        ],
        priority: (ctx) => (highLiabilityOccupation(ctx) ? "high" : "medium"),
    },

    {
        id: "employer_liability",
        lineOfBusiness: "liability",
        kind: "essential",
        requires: ["employees"],
        supports: ["businessOwnership"],
        alsoCoveredBy: ["employer_liability", "business"],
        name: {
            en: "An employee injured at work",
            el: "Τραυματισμός εργαζομένου στην εργασία",
        },
        applies: (ctx) => ctx.businessEmployees > 0,
        riskExplanation: () => ({
            en: "An employee hurt at work can claim against you for the part of their loss that ΕΦΚΑ does not meet. That claim is personal to the employer and is not covered by a general business policy by default.",
            el: "Ένας εργαζόμενος που τραυματίζεται στην εργασία μπορεί να στραφεί εναντίον σας για το μέρος της ζημιάς που δεν καλύπτει ο ΕΦΚΑ. Η αξίωση αυτή βαρύνει προσωπικά τον εργοδότη και δεν καλύπτεται εξ ορισμού από γενικό ασφαλιστήριο επιχείρησης.",
        }),
        whyItApplies: (ctx) => ({
            en: `You employ ${ctx.businessEmployees} ${plural(ctx.businessEmployees, "person", "people")}, and an employer's duty of care runs to each of them for as long as they work for you.`,
            el: `Απασχολείτε ${ctx.businessEmployees} ${plural(ctx.businessEmployees, "άτομο", "άτομα")}, και η υποχρέωση πρόνοιας του εργοδότη ισχύει για καθένα από αυτά όσο εργάζονται για εσάς.`,
        }),
        expectedImpact: () => ({
            en: "A serious workplace injury claim can exceed the annual profit of a small business.",
            el: "Μια αξίωση για σοβαρό εργατικό ατύχημα μπορεί να ξεπεράσει το ετήσιο κέρδος μιας μικρής επιχείρησης.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Meet the health-and-safety duty properly", el: "Τηρήστε σωστά την υποχρέωση υγείας και ασφάλειας" },
                detail: {
                    en: "A documented risk assessment, recorded training and a maintained accident book reduce both the frequency of injury and the size of the claim when one happens — and their absence is what makes an employer indefensible.",
                    el: "Μια τεκμηριωμένη εκτίμηση κινδύνου, καταγεγραμμένη εκπαίδευση και τηρούμενο βιβλίο ατυχημάτων μειώνουν και τη συχνότητα των τραυματισμών και το μέγεθος της αξίωσης όταν συμβεί — και η απουσία τους είναι που καθιστά έναν εργοδότη αδύνατο να υπερασπιστεί.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Employer's liability cover", el: "Ασφάλιση εργοδοτικής αστικής ευθύνης" },
                detail: {
                    en: "Normally written alongside general business liability, with the limit tracking payroll rather than headcount.",
                    el: "Συνήθως συνάπτεται μαζί με τη γενική αστική ευθύνη επιχείρησης, με το όριο να ακολουθεί τη μισθοδοσία και όχι τον αριθμό εργαζομένων.",
                },
                line: "liability",
            },
        ],
        priority: (ctx) => (ctx.businessEmployees >= 5 ? "high" : "medium"),
    },

    {
        // Audit R-17: onboarding asks the customer to self-select
        // `small_business` and the answer reached nothing, while the taxonomy
        // carried a full commercial set no rule could reach.
        id: "business_assets_interruption",
        lineOfBusiness: "business",
        kind: "essential",
        requires: ["businessOwnership"],
        supports: ["employees", "income"],
        alsoCoveredBy: ["business_property", "business_interruption", "equipment", "stock"],
        name: {
            en: "Your business stopping after a loss",
            el: "Διακοπή της επιχείρησής σας μετά από ζημιά",
        },
        applies: (ctx) => ctx.ownsBusiness,
        riskExplanation: () => ({
            en: "A fire, flood or burglary at business premises destroys stock and equipment, and then stops trading while repairs run. The lost trading period is usually the larger loss and is a separate cover from the damage itself.",
            el: "Πυρκαγιά, πλημμύρα ή διάρρηξη σε επαγγελματικό χώρο καταστρέφει εμπορεύματα και εξοπλισμό, και στη συνέχεια σταματά τη λειτουργία όσο διαρκούν οι επισκευές. Η περίοδος διακοπής είναι συνήθως η μεγαλύτερη ζημιά και καλύπτεται ξεχωριστά από την υλική βλάβη.",
        }),
        whyItApplies: () => ({
            en: "You told us you own a business.",
            el: "Μας δηλώσατε ότι έχετε επιχείρηση.",
        }),
        expectedImpact: () => ({
            en: "Beyond replacing assets, every month closed is a month of turnover that does not return.",
            el: "Πέρα από την αντικατάσταση των παγίων, κάθε μήνας κλειστός είναι ένας μήνας τζίρου που δεν επιστρέφει.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Make the interruption shorter", el: "Συντομεύστε τη διακοπή" },
                detail: {
                    en: "Offsite backups, a named alternative premises and a supplier who can restock quickly cut the trading period you lose — which is the larger loss. Every week removed is a week you do not have to insure.",
                    el: "Αντίγραφα ασφαλείας εκτός χώρου, ένας εναλλακτικός χώρος και προμηθευτής που μπορεί να ανεφοδιάσει γρήγορα μειώνουν την περίοδο διακοπής — που είναι η μεγαλύτερη ζημιά. Κάθε εβδομάδα που αφαιρείται είναι εβδομάδα που δεν χρειάζεται να ασφαλίσετε.",
                },
            },
            {
                kind: "retain",
                label: { en: "Hold a reserve against the first weeks", el: "Κρατήστε απόθεμα για τις πρώτες εβδομάδες" },
                detail: {
                    en: "Business interruption cover is priced on the indemnity period. A cash reserve that carries the first month lets you buy a shorter, cheaper one.",
                    el: "Η ασφάλιση διακοπής εργασιών κοστολογείται βάσει της περιόδου αποζημίωσης. Ένα ταμειακό απόθεμα που καλύπτει τον πρώτο μήνα σας επιτρέπει να αγοράσετε μικρότερη και φθηνότερη.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Commercial cover with business interruption", el: "Ασφαλιστήριο επιχείρησης με κάλυψη διακοπής εργασιών" },
                detail: {
                    en: "Premises, contents and stock, with an indemnity period set against how long you would realistically take to reopen — not a default twelve months.",
                    el: "Χώρος, περιεχόμενο και εμπορεύματα, με περίοδο αποζημίωσης ορισμένη βάσει του ρεαλιστικού χρόνου επαναλειτουργίας — όχι έναν προεπιλεγμένο δωδεκάμηνο.",
                },
                line: "business",
            },
        ],
        priority: (ctx) => (ctx.businessEmployees > 0 ? "high" : "medium"),
    },

    // ─────────────────────────────────────────────────────────────────
    // Lifestyle
    // ─────────────────────────────────────────────────────────────────
    {
        id: "travel_abroad",
        lineOfBusiness: "travel",
        kind: "discretionary",
        requires: ["travelFrequency"],
        supports: ["age"],
        name: {
            en: "A medical emergency abroad",
            el: "Ιατρικό επείγον στο εξωτερικό",
        },
        applies: (ctx) => ctx.travelsFrequently,
        riskExplanation: () => ({
            en: "Inside the EU your ΕΚΑΑ/EHIC card covers state treatment on the same terms as a local. Outside it you pay in full, and medical repatriation is never covered by either.",
            el: "Εντός ΕΕ η Ευρωπαϊκή Κάρτα Ασφάλισης (ΕΚΑΑ) καλύπτει τη δημόσια περίθαλψη με τους ίδιους όρους που ισχύουν για τους ντόπιους. Εκτός ΕΕ πληρώνετε εξ ολοκλήρου, ενώ η ιατρική επαναφορά δεν καλύπτεται σε καμία περίπτωση.",
        }),
        whyItApplies: () => ({
            en: "You told us you travel abroad more than twice a year.",
            el: "Μας δηλώσατε ότι ταξιδεύετε στο εξωτερικό πάνω από δύο φορές τον χρόνο.",
        }),
        expectedImpact: () => ({
            en: "Medical repatriation from outside Europe routinely costs tens of thousands of euros; a hospital stay in the US can exceed that on its own.",
            el: "Η ιατρική επαναφορά από χώρα εκτός Ευρώπης κοστίζει συνήθως δεκάδες χιλιάδες ευρώ· μια νοσηλεία στις ΗΠΑ μπορεί να την ξεπεράσει από μόνη της.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Carry your ΕΚΑΑ card for EU travel", el: "Έχετε μαζί σας την ΕΚΑΑ για ταξίδια εντός ΕΕ" },
                detail: {
                    en: "It is free, it covers state treatment across the EU on the same terms as a local, and it removes most of this risk for European trips. Order it before buying anything.",
                    el: "Είναι δωρεάν, καλύπτει τη δημόσια περίθαλψη σε όλη την ΕΕ με τους ίδιους όρους που ισχύουν για τους ντόπιους, και εξαλείφει το μεγαλύτερο μέρος αυτού του κινδύνου για ευρωπαϊκά ταξίδια. Εκδώστε την πριν αγοράσετε οτιδήποτε.",
                },
            },
            {
                kind: "retain",
                label: { en: "Carry short EU trips yourself", el: "Αναλάβετε μόνοι τα σύντομα ταξίδια εντός ΕΕ" },
                detail: {
                    en: "With an ΕΚΑΑ card in hand, what remains on a short European trip is cancellation and baggage — losses most households can absorb.",
                    el: "Με την ΕΚΑΑ στο χέρι, ό,τι απομένει σε ένα σύντομο ευρωπαϊκό ταξίδι είναι η ακύρωση και οι αποσκευές — ζημιές που τα περισσότερα νοικοκυριά μπορούν να απορροφήσουν.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Travel cover with repatriation", el: "Ταξιδιωτική ασφάλιση με επαναπατρισμό" },
                detail: {
                    en: "The part neither the ΕΚΑΑ card nor savings answer. An annual multi-trip policy is usually cheaper than three single trips.",
                    el: "Το σκέλος που δεν καλύπτει ούτε η ΕΚΑΑ ούτε οι αποταμιεύσεις. Ένα ετήσιο πολλαπλών ταξιδιών είναι συνήθως φθηνότερο από τρία μεμονωμένα.",
                },
                line: "travel",
            },
        ],
        priority: () => "medium",
        eligibility: () => ({
            blocking: false,
            note: {
                en: "If you only travel within the EU, your ΕΚΑΑ card already covers state treatment and the value here is mainly cancellation and baggage.",
                el: "Αν ταξιδεύετε μόνο εντός ΕΕ, η ΕΚΑΑ ήδη καλύπτει τη δημόσια περίθαλψη και η αξία εδώ αφορά κυρίως ακύρωση και αποσκευές.",
            },
        }),
    },

    {
        id: "activity_injury",
        lineOfBusiness: "personal_accident",
        kind: "discretionary",
        requires: ["hobbies"],
        supports: ["dependents", "income"],
        alsoCoveredBy: ["life", "income_protection"],
        name: {
            en: "Injury from a high-risk activity",
            el: "Τραυματισμός από δραστηριότητα υψηλού κινδύνου",
        },
        applies: (ctx) => ctx.activities.length > 0,
        riskExplanation: () => ({
            en: "Life, health and income policies commonly exclude injury sustained during hazardous pursuits. The exclusion is in the general terms and is easy to miss until a claim.",
            el: "Τα ασφαλιστήρια ζωής, υγείας και εισοδήματος συνήθως εξαιρούν τραυματισμό κατά τη διάρκεια επικίνδυνων δραστηριοτήτων. Η εξαίρεση βρίσκεται στους γενικούς όρους και περνά εύκολα απαρατήρητη μέχρι την αποζημίωση.",
        }),
        whyItApplies: (ctx) => ({
            en: `You have declared regular participation in ${activityLabels(ctx, "en")}.`,
            el: `Έχετε δηλώσει τακτική ενασχόληση με ${activityLabels(ctx, "el")}.`,
        }),
        expectedImpact: () => ({
            en: "A serious injury brings treatment costs and time off work at exactly the moment your other policies may decline the claim.",
            el: "Ένας σοβαρός τραυματισμός φέρνει έξοδα θεραπείας και απουσία από την εργασία ακριβώς τη στιγμή που τα άλλα ασφαλιστήριά σας ενδέχεται να απορρίψουν την αξίωση.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Read the exclusion you already have", el: "Διαβάστε την εξαίρεση που ήδη σας αφορά" },
                detail: {
                    en: "Start with the general terms of the life, health and income policies you hold. Some name the activity and exclude it; others do not mention it at all, in which case there is nothing to solve.",
                    el: "Ξεκινήστε από τους γενικούς όρους των ασφαλιστηρίων ζωής, υγείας και εισοδήματος που έχετε. Κάποια κατονομάζουν τη δραστηριότητα και την εξαιρούν· άλλα δεν την αναφέρουν καθόλου, οπότε δεν υπάρχει τίποτα να λυθεί.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Extend the cover you already hold", el: "Επεκτείνετε την κάλυψη που ήδη έχετε" },
                detail: {
                    en: "Where an exclusion exists, an endorsement removing it is usually far cheaper than a standalone policy, and keeps everything in one place.",
                    el: "Όπου υπάρχει εξαίρεση, μια πρόσθετη πράξη που την αίρει είναι συνήθως πολύ φθηνότερη από αυτοτελές ασφαλιστήριο, και κρατά τα πάντα σε ένα σημείο.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Personal accident cover naming the activity", el: "Ασφάλιση προσωπικών ατυχημάτων που κατονομάζει τη δραστηριότητα" },
                detail: {
                    en: "For activities no existing insurer will extend to. Check that the policy names the activity — a generic policy is likely to carry the same exclusion.",
                    el: "Για δραστηριότητες που κανένας υπάρχων ασφαλιστής δεν δέχεται να επεκτείνει. Ελέγξτε ότι το ασφαλιστήριο κατονομάζει τη δραστηριότητα — ένα γενικό ασφαλιστήριο πιθανότατα φέρει την ίδια εξαίρεση.",
                },
                line: "personal_accident",
            },
        ],
        priority: (ctx) => (totalDependents(ctx) > 0 || isEarning(ctx) ? "medium" : "low"),
        eligibility: () => ({
            blocking: false,
            note: {
                en: "Check the exclusion wording in the policies you already hold first — an extension is usually cheaper than a standalone policy.",
                el: "Ελέγξτε πρώτα τη διατύπωση των εξαιρέσεων στα ασφαλιστήρια που ήδη έχετε — μια επέκταση είναι συνήθως φθηνότερη από αυτοτελές ασφαλιστήριο.",
            },
        }),
    },

    {
        id: "pet_costs",
        lineOfBusiness: "pet",
        kind: "discretionary",
        requires: ["pets"],
        supports: [],
        name: {
            en: "Unexpected veterinary bills and pet liability",
            el: "Απρόβλεπτα κτηνιατρικά έξοδα και ευθύνη κατοικιδίου",
        },
        applies: (ctx) => ctx.hasPets,
        riskExplanation: () => ({
            en: "Emergency veterinary treatment is paid out of pocket, and under Greek law an owner is liable for injury or damage their animal causes to others.",
            el: "Η επείγουσα κτηνιατρική περίθαλψη πληρώνεται από την τσέπη, και κατά το ελληνικό δίκαιο ο ιδιοκτήτης ευθύνεται για τραυματισμούς ή ζημιές που προκαλεί το ζώο του σε τρίτους.",
        }),
        whyItApplies: (ctx) => {
            // "Two dogs" beats "you have pets". The count is optional, so the
            // sentence degrades to the boolean rather than inventing a number.
            const n = ctx.petsCount
            return {
                en: n && n > 0
                    ? `You have ${n} ${plural(n, "pet", "pets")}, and the exposure scales with each one.`
                    : "You told us you have pets.",
                el: n && n > 0
                    ? `Έχετε ${n} ${plural(n, "κατοικίδιο", "κατοικίδια")}, και η έκθεση αυξάνεται με κάθε ένα.`
                    : "Μας δηλώσατε ότι έχετε κατοικίδια.",
            }
        },
        expectedImpact: () => ({
            en: "Emergency surgery typically runs to several hundred or a few thousand euros; a liability claim from a bite can run higher.",
            el: "Ένα επείγον χειρουργείο κοστίζει συνήθως μερικές εκατοντάδες έως λίγες χιλιάδες ευρώ· μια αξίωση από δάγκωμα μπορεί να είναι μεγαλύτερη.",
        }),
        mitigations: () => [
            {
                kind: "retain",
                label: { en: "Keep a vet fund instead", el: "Κρατήστε ένα ταμείο κτηνιάτρου" },
                detail: {
                    en: "Setting aside what a policy would cost usually covers routine treatment and builds up against a bad year. For a healthy young animal this is frequently the better arithmetic, and worth saying before anything is sold.",
                    el: "Το να παραμερίζετε όσα θα κόστιζε ένα ασφαλιστήριο συνήθως καλύπτει τη συνήθη περίθαλψη και χτίζει απόθεμα για μια κακή χρονιά. Για ένα υγιές νεαρό ζώο αυτό είναι συχνά ο καλύτερος υπολογισμός, και αξίζει να λέγεται πριν πουληθεί οτιδήποτε.",
                },
            },
            {
                kind: "reduce",
                label: { en: "Prevention and registration", el: "Πρόληψη και καταγραφή" },
                detail: {
                    en: "Vaccination, parasite control and dental care remove most emergency presentations. Registration and microchipping are required by Greek law and matter if your animal causes injury.",
                    el: "Ο εμβολιασμός, η αντιπαρασιτική αγωγή και η οδοντιατρική φροντίδα εξαλείφουν τα περισσότερα επείγοντα περιστατικά. Η καταγραφή και η σήμανση απαιτούνται από την ελληνική νομοθεσία και έχουν σημασία αν το ζώο σας προκαλέσει τραυματισμό.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Pet cover including third-party liability", el: "Ασφάλιση κατοικιδίου με αστική ευθύνη" },
                detail: {
                    en: "The liability section is the part a savings pot cannot replace — an owner is liable under Greek law for injury their animal causes, and that figure has no ceiling.",
                    el: "Το τμήμα της αστικής ευθύνης είναι αυτό που δεν αντικαθιστά ένα ταμείο αποταμίευσης — ο ιδιοκτήτης ευθύνεται κατά το ελληνικό δίκαιο για τραυματισμούς που προκαλεί το ζώο του, και αυτό το ποσό δεν έχει οροφή.",
                },
                line: "pet",
            },
        ],
        priority: () => "low",
    },

    {
        // Only fires on a DECLARED exposure. The audit's phantom-cyber finding —
        // owning a dog produced a cyber gap — came from the category expansion in
        // `expectedLines`, not from a rule; there was no cyber rule at all.
        id: "cyber_fraud",
        lineOfBusiness: "cyber",
        kind: "discretionary",
        requires: ["cyberExposure"],
        supports: ["savings", "businessOwnership"],
        name: {
            en: "Online fraud and account takeover",
            el: "Διαδικτυακή απάτη και παραβίαση λογαριασμού",
        },
        applies: (ctx) => ctx.cyberExposure === "moderate" || ctx.cyberExposure === "high",
        riskExplanation: () => ({
            en: "Authorised push-payment fraud — where you are tricked into making the transfer yourself — is generally not refunded by the bank, unlike card fraud.",
            el: "Η απάτη με εξουσιοδοτημένη μεταφορά — όπου παρασύρεστε να κάνετε εσείς το έμβασμα — γενικά δεν επιστρέφεται από την τράπεζα, σε αντίθεση με την απάτη με κάρτα.",
        }),
        whyItApplies: (ctx) => ({
            en: `You have described your online financial exposure as ${ctx.cyberExposure}.`,
            el: `Χαρακτηρίσατε τη διαδικτυακή οικονομική σας έκθεση ως ${ctx.cyberExposure === "high" ? "υψηλή" : "μέτρια"}.`,
        }),
        expectedImpact: () => ({
            en: "Losses are capped only by what is reachable from the compromised account.",
            el: "Οι απώλειες περιορίζονται μόνο από ό,τι είναι προσβάσιμο μέσω του παραβιασμένου λογαριασμού.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Two-factor authentication and transfer limits", el: "Έλεγχος ταυτότητας δύο παραγόντων και όρια μεταφορών" },
                detail: {
                    en: "Free, takes ten minutes, and prevents far more loss than any policy pays. A separate account for day-to-day payments caps what a compromise can reach.",
                    el: "Δωρεάν, χρειάζεται δέκα λεπτά, και αποτρέπει πολύ μεγαλύτερη ζημιά από όση αποζημιώνει οποιοδήποτε ασφαλιστήριο. Ένας ξεχωριστός λογαριασμός για καθημερινές πληρωμές περιορίζει το τι μπορεί να φτάσει μια παραβίαση.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Know what your bank already refunds", el: "Μάθετε τι επιστρέφει ήδη η τράπεζά σας" },
                detail: {
                    en: "Unauthorised card fraud is generally refundable. Authorised push-payment fraud — where you were tricked into making the transfer yourself — generally is not, and that is the gap.",
                    el: "Η μη εξουσιοδοτημένη απάτη με κάρτα γενικά επιστρέφεται. Η απάτη με εξουσιοδοτημένη μεταφορά — όπου παρασυρθήκατε να κάνετε εσείς το έμβασμα — γενικά όχι, και εκεί είναι το κενό.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Personal cyber cover", el: "Προσωπική ασφάλιση κυβερνοκινδύνων" },
                detail: {
                    en: "For fraudulent transactions, identity restoration and, where relevant, extortion. A thin market in Greece — compare carefully.",
                    el: "Για δόλιες συναλλαγές, αποκατάσταση ταυτότητας και, όπου συντρέχει, εκβίαση. Περιορισμένη αγορά στην Ελλάδα — συγκρίνετε προσεκτικά.",
                },
                line: "cyber",
            },
        ],
        priority: (ctx) => (ctx.cyberExposure === "high" ? "medium" : "low"),
    },

    {
        id: "retirement_shortfall",
        lineOfBusiness: "pension",
        kind: "discretionary",
        requires: ["retirementPlanning", "age"],
        supports: ["income", "savings"],
        name: {
            en: "A pension that replaces less than you expect",
            el: "Σύνταξη που αντικαθιστά λιγότερα από όσα περιμένετε",
        },
        // Only meaningful in the years when something can still be done about it.
        applies: (ctx) =>
            !ctx.retirementPlanning && ctx.age != null && ctx.age >= 25 && ctx.age < 60,
        riskExplanation: () => ({
            en: "The Greek state pension replaces a declining share of final earnings, and the gap is widest for people with interrupted contributions or self-employed years.",
            el: "Η κρατική σύνταξη αντικαθιστά ολοένα μικρότερο ποσοστό των τελικών αποδοχών, και το κενό είναι μεγαλύτερο για όσους έχουν διακοπές εισφορών ή χρόνια ελεύθερου επαγγέλματος.",
        }),
        whyItApplies: (ctx) => ({
            en: `You are ${ctx.age} and told us you have no private retirement plan in place, so there is still time for contributions to compound.`,
            el: `Είστε ${ctx.age} ετών και μας δηλώσατε ότι δεν έχετε ιδιωτικό συνταξιοδοτικό πρόγραμμα, οπότε υπάρχει ακόμη χρόνος να αποδώσουν οι εισφορές.`,
        }),
        expectedImpact: (ctx) =>
            ctx.annualIncome && ctx.annualIncome > 0
                ? {
                      en: `On a ${eur(ctx.annualIncome, "en")} income, each 10% of replacement not covered by the state pension is about ${eur(ctx.annualIncome * 0.1, "en")} a year in retirement.`,
                      el: `Με εισόδημα ${eur(ctx.annualIncome, "el")}, κάθε 10% αναπλήρωσης που δεν καλύπτει η κρατική σύνταξη αντιστοιχεί σε περίπου ${eur(ctx.annualIncome * 0.1, "el")} ετησίως στη σύνταξη.`,
                  }
                : {
                      en: "The shortfall is a reduction in monthly income for the whole of retirement rather than a single loss.",
                      el: "Το έλλειμμα είναι μείωση μηνιαίου εισοδήματος για όλη τη σύνταξη, όχι μια εφάπαξ ζημιά.",
                  },
        mitigations: () => [
            {
                kind: "retain",
                label: { en: "Regular saving, started early", el: "Τακτική αποταμίευση, ξεκινώντας νωρίς" },
                detail: {
                    en: "This is a savings decision before it is an insurance one. A standing order into any diversified vehicle does the same job as a pension product, often at lower cost — the earlier it starts, the smaller the contribution needed.",
                    el: "Πρόκειται για απόφαση αποταμίευσης πριν γίνει απόφαση ασφάλισης. Μια πάγια εντολή σε οποιοδήποτε διαφοροποιημένο σχήμα κάνει την ίδια δουλειά με ένα συνταξιοδοτικό προϊόν, συχνά με χαμηλότερο κόστος — όσο νωρίτερα ξεκινήσει, τόσο μικρότερη η απαιτούμενη εισφορά.",
                },
            },
            {
                kind: "reduce",
                label: { en: "Check your contribution record first", el: "Ελέγξτε πρώτα το ασφαλιστικό σας ιστορικό" },
                detail: {
                    en: "Gaps in ΕΦΚΑ contributions are the main driver of a low replacement rate, and some can be bought back. Establish the actual projection before assuming a shortfall.",
                    el: "Τα κενά στις εισφορές ΕΦΚΑ είναι ο κύριος παράγοντας χαμηλού ποσοστού αναπλήρωσης, και ορισμένα εξαγοράζονται. Διαπιστώστε την πραγματική προβολή πριν υποθέσετε έλλειμμα.",
                },
            },
            {
                kind: "transfer",
                label: { en: "A private pension", el: "Ιδιωτικό συνταξιοδοτικό" },
                detail: {
                    en: "Worth comparing against plain saving on charges and flexibility, not assumed to be better because it is an insurance product.",
                    el: "Αξίζει σύγκριση με την απλή αποταμίευση ως προς τις επιβαρύνσεις και την ευελιξία — δεν θεωρείται καλύτερο επειδή είναι ασφαλιστικό προϊόν.",
                },
                line: "pension",
            },
        ],
        priority: (ctx) => (ctx.age != null && ctx.age >= 45 ? "medium" : "low"),
    },

    {
        /**
         * Building-manager liability — a mass-market Greek exposure that had no
         * risk in this catalog and no branch the extractor could name.
         *
         * Every πολυκατοικία has a διαχειριστής. The role rotates between
         * residents, is normally unpaid, and carries personal liability for the
         * common areas: the lift, the stairwell, the pipework behind it. None of
         * that is covered by owning the flat — a home policy answers damage to
         * YOUR property, not what the building does to a visitor — and the role
         * falls to tenants as readily as to owners, which is why no existing
         * factor implies it and why it needed one of its own.
         */
        id: "common_areas_liability",
        lineOfBusiness: "liability",
        kind: "essential",
        requires: ["buildingManagerRole"],
        supports: ["savings", "residence"],
        alsoCoveredBy: ["legal_expenses"],
        name: {
            en: "Liability for a building’s common areas",
            el: "Ευθύνη για τους κοινόχρηστους χώρους",
        },
        applies: (ctx) => ctx.isBuildingManager,
        riskExplanation: () => ({
            en: "As the manager of a block of flats you can be held personally liable for injury or damage arising from the common areas — a fall on a wet stairwell, a lift failure, a burst riser that floods a flat below. The claim is brought against the person holding the role, not against the building.",
            el: "Ως διαχειριστής πολυκατοικίας μπορεί να ευθύνεστε προσωπικά για τραυματισμό ή ζημιά που προκύπτει από τους κοινόχρηστους χώρους — πτώση σε βρεγμένο κλιμακοστάσιο, βλάβη ανελκυστήρα, διάρρηξη σωλήνα που πλημμυρίζει διαμέρισμα. Η απαίτηση στρέφεται κατά του προσώπου που κατέχει τη θέση, όχι κατά του κτιρίου.",
        }),
        whyItApplies: () => ({
            en: "You told us you act as the manager of a block of flats.",
            el: "Μας δηλώσατε ότι είστε διαχειριστής πολυκατοικίας.",
        }),
        expectedImpact: () => ({
            en: "A single injury claim from a lift or stairwell incident routinely runs into tens of thousands of euros, and lift and pipework liability are the two heads Greek policies name specifically because they are the two that recur.",
            el: "Μία μόνο απαίτηση για τραυματισμό από ανελκυστήρα ή κλιμακοστάσιο φτάνει συνήθως σε δεκάδες χιλιάδες ευρώ, και η ευθύνη από ανελκυστήρες και σωληνώσεις είναι οι δύο περιπτώσεις που τα ελληνικά ασφαλιστήρια κατονομάζουν ρητά, επειδή είναι αυτές που επαναλαμβάνονται.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: {
                    en: "Keep the lift and common-area maintenance current",
                    el: "Κρατήστε ενήμερη τη συντήρηση ανελκυστήρα και κοινόχρηστων",
                },
                detail: {
                    en: "A documented maintenance record for the lift, the lighting and the pipework is both the practical control and the first thing asked for when a claim is made.",
                    el: "Το τεκμηριωμένο ιστορικό συντήρησης για τον ανελκυστήρα, τον φωτισμό και τις σωληνώσεις είναι ταυτόχρονα ο πρακτικός έλεγχος και το πρώτο που ζητείται όταν εγερθεί απαίτηση.",
                },
            },
            {
                kind: "avoid",
                label: { en: "Hand the role on", el: "Παραδώστε τη διαχείριση" },
                detail: {
                    en: "The role usually rotates, and it is often taken on by a paid management company. Passing it on moves the personal exposure with it.",
                    el: "Η θέση συνήθως εναλλάσσεται και συχνά αναλαμβάνεται από επαγγελματική εταιρεία διαχείρισης. Η παράδοσή της μεταφέρει μαζί και την προσωπική έκθεση.",
                },
            },
            {
                kind: "transfer",
                label: {
                    en: "Third-party liability for the common areas",
                    el: "Αστική ευθύνη κοινόχρηστων χώρων",
                },
                detail: {
                    en: "Written for the manager in that capacity, typically naming lift operation and pipe burst or leakage as separate heads, with limits per person, per event and for the year. The premium is commonly shared through the building’s common expenses.",
                    el: "Εκδίδεται για τον διαχειριστή υπό αυτή την ιδιότητα, συνήθως κατονομάζοντας χωριστά τη λειτουργία ανελκυστήρων και τη διάρρηξη ή διαρροή σωληνώσεων, με όρια ανά άτομο, ανά γεγονός και για το έτος. Το ασφάλιστρο συνήθως επιμερίζεται στα κοινόχρηστα.",
                },
                line: "liability",
            },
        ],
        priority: () => "medium",
        eligibility: () => ({
            blocking: false,
            note: {
                en: "Cover is written against the capacity you hold and the specific risks named — lifts and pipework are usually listed separately, so a policy that omits one may not answer it.",
                el: "Η κάλυψη εκδίδεται με βάση την ιδιότητα που κατέχετε και τους κινδύνους που κατονομάζονται — οι ανελκυστήρες και οι σωληνώσεις αναγράφονται συνήθως χωριστά, οπότε ασφαλιστήριο που παραλείπει τον έναν ενδέχεται να μην τον καλύπτει.",
            },
        }),
    },

    {
        id: "home_legal_disputes",
        lineOfBusiness: "legal_expenses",
        kind: "discretionary",
        requires: ["propertyOwnership", "tenants"],
        supports: [],
        name: {
            en: "Legal costs in a property dispute",
            el: "Νομικά έξοδα σε διαφορά ακινήτου",
        },
        // Audit §2.7: the old rule fired for EVERY homeowner — a status, not an
        // exposure. It now needs a real trigger: letting property, or owning more
        // than the home you live in.
        // Same consistency rule as landlord_letting: a letting flag with no
        // property behind it is stale data, not an exposure.
        applies: (ctx) =>
            (ctx.rentsOutProperty && (!ctx.known.propertyOwnership || ctx.propertiesOwned > 0)) ||
            ctx.propertiesOwned > 1,
        riskExplanation: () => ({
            en: "Disputes over boundaries, building works, service charges or a tenant's occupation are resolved through the courts, and representation is paid up front.",
            el: "Οι διαφορές για όρια, οικοδομικές εργασίες, κοινόχρηστα ή τη μίσθωση επιλύονται δικαστικά, και η εκπροσώπηση προπληρώνεται.",
        }),
        whyItApplies: (ctx) => ({
            en: ctx.rentsOutProperty
                ? "You let property to tenants, which is where most private property disputes start."
                : `You own ${ctx.propertiesOwned} properties, which raises the chance of a boundary, works or service-charge dispute.`,
            el: ctx.rentsOutProperty
                ? "Εκμισθώνετε ακίνητο σε ενοικιαστές, από όπου ξεκινούν οι περισσότερες ιδιωτικές διαφορές ακινήτων."
                : `Σας ανήκουν ${ctx.propertiesOwned} ακίνητα, γεγονός που αυξάνει την πιθανότητα διαφοράς ορίων, εργασιών ή κοινοχρήστων.`,
        }),
        expectedImpact: () => ({
            en: "A contested property case commonly costs several thousand euros in fees before any judgment.",
            el: "Μια αμφισβητούμενη υπόθεση ακινήτου κοστίζει συνήθως αρκετές χιλιάδες ευρώ σε αμοιβές πριν από οποιαδήποτε απόφαση.",
        }),
        mitigations: () => [
            {
                kind: "reduce",
                label: { en: "Get the paperwork right first", el: "Τακτοποιήστε πρώτα τα χαρτιά" },
                detail: {
                    en: "A current land-registry (Κτηματολόγιο) entry, written agreements with neighbours over boundaries and works, and minuted building-management decisions prevent most disputes from starting.",
                    el: "Ενημερωμένη εγγραφή στο Κτηματολόγιο, γραπτές συμφωνίες με γείτονες για όρια και εργασίες, και πρακτικά αποφάσεων διαχείρισης πολυκατοικίας αποτρέπουν τις περισσότερες διαφορές από το να ξεκινήσουν.",
                },
            },
            {
                kind: "transfer",
                label: { en: "Legal expenses cover for property matters", el: "Νομική προστασία για θέματα ακινήτων" },
                detail: {
                    en: "Often available as an extension to a home policy rather than a separate purchase.",
                    el: "Συχνά διαθέσιμη ως επέκταση ασφαλιστηρίου κατοικίας και όχι ως ξεχωριστή αγορά.",
                },
                line: "legal_expenses",
            },
        ],
        priority: () => "low",
    },
]

/** Lines the catalog can ever recommend — used to bound the score's denominator. */
export const CATALOG_LINES = [...new Set(RISK_CATALOG.map((r) => r.lineOfBusiness))]

export function getRisk(id: string): RiskDefinition | undefined {
    return RISK_CATALOG.find((r) => r.id === id)
}
