/**
 * What the six answers earn the visitor.
 *
 * THE HONESTY RULE THIS FILE EXISTS TO KEEP. We have not seen this person's
 * policies. We therefore cannot tell them they have a gap, cannot grade them,
 * and must not print a number. Every other product in this category answers a
 * questionnaire with a score, and a score here would be a fabrication — the
 * same one `PolicyWalletWidget` removed from the hero on the record.
 *
 * So the output is a CHECKLIST, not a verdict: which covers apply to a person
 * who answered what they answered, why each one follows from their own words,
 * and the specific thing to look for on the policy they already hold. Every
 * `because` quotes the visitor's answer back at them, which is the only claim
 * we are entitled to make from six questions.
 *
 * The product's actual verdict comes later, from reading the documents. This
 * page is the invitation to that, and says so.
 */

import type { NeedsAnswers } from "@/lib/needs/questions"

export interface NeedsItem {
    /** Stable id, also the test anchor. */
    id: string
    /** Slug under /product — every one of these resolves to a real page. */
    product: string
    title: { el: string; en: string }
    /** Follows from an answer they gave. Never a claim about their cover. */
    because: { el: string; en: string }
    /** The concrete thing to look for on the policy they already hold. */
    check: { el: string; en: string }
    /** Ordering weight — consequence first, curiosity last. */
    weight: number
}

export function needsOutcome(a: NeedsAnswers): NeedsItem[] {
    const items: NeedsItem[] = []
    const ex = new Set(a.exposures ?? [])
    const kids = a.children ?? 0

    if ((a.vehicles ?? 0) > 0) {
        items.push({
            id: "motor",
            product: "motor",
            weight: 70,
            title: { el: "Αυτοκίνητο", en: "Motor" },
            because:
                a.vehicles === 1
                    ? { el: "Είπατε ότι έχετε ένα όχημα.", en: "You said you have one vehicle." }
                    : { el: "Είπατε ότι έχετε δύο ή περισσότερα οχήματα.", en: "You said you have two or more vehicles." },
            check: {
                el: "Δείτε αν έχετε μόνο αστική ευθύνη ή και ίδιες ζημιές, και ποιο είναι το ποσό απαλλαγής.",
                en: "Check whether you have third-party only or own-damage too, and what the excess is.",
            },
        })
    }

    if (a.residence === "owned") {
        items.push({
            id: "home-owned",
            product: "property",
            weight: 90,
            title: { el: "Κατοικία", en: "Home" },
            because: { el: "Είπατε ότι μένετε σε δικό σας σπίτι.", en: "You said you live in a home you own." },
            check: {
                el: "Δείτε αν το ασφαλιστήριο καλύπτει σεισμό και πλημμύρα — στην Ελλάδα συχνά είναι ξεχωριστές καλύψεις, όχι μέρος του βασικού.",
                en: "Check whether earthquake and flood are covered — in Greece these are often separate covers, not part of the basic policy.",
            },
        })
    }

    if (a.residence === "rented") {
        items.push({
            id: "home-rented",
            product: "liability",
            weight: 60,
            title: { el: "Περιεχόμενο & ευθύνη ενοικιαστή", en: "Contents & tenant liability" },
            because: { el: "Είπατε ότι μένετε σε νοικιασμένο σπίτι.", en: "You said you live in a rented home." },
            check: {
                el: "Το ασφαλιστήριο του ιδιοκτήτη καλύπτει το κτίριο, όχι τα πράγματά σας ούτε τη ζημιά που μπορεί να προκαλέσετε.",
                en: "The landlord's policy covers the building, not your belongings and not damage you cause.",
            },
        })
    }

    if (kids > 0) {
        items.push({
            id: "life-dependents",
            product: "life",
            weight: 100,
            title: { el: "Ζωή", en: "Life" },
            because:
                kids === 1
                    ? { el: "Είπατε ότι υπάρχει ένα εξαρτώμενο άτομο.", en: "You said there is one dependent." }
                    : { el: "Είπατε ότι υπάρχουν περισσότερα από ένα εξαρτώμενα άτομα.", en: "You said there is more than one dependent." },
            check: {
                el: "Δείτε αν υπάρχει κάλυψη ζωής και ποιος είναι ο δικαιούχος — ο δικαιούχος είναι το πεδίο που μένει πιο συχνά ξεπερασμένο.",
                en: "Check whether life cover exists and who the beneficiary is — the beneficiary is the field most often left out of date.",
            },
        })
    }

    if (a.loan) {
        items.push({
            id: "loan",
            product: "life",
            weight: 95,
            title: { el: "Δάνειο", en: "Loan" },
            because: { el: "Είπατε ότι έχετε δάνειο σε εξέλιξη.", en: "You said you have a loan running." },
            check: {
                el: "Πολλά δάνεια συνοδεύονται από ασφάλεια που όρισε η τράπεζα. Δείτε τι ακριβώς καλύπτει και αν το υπόλοιπο του δανείου είναι ακόμη το ίδιο με το ασφαλισμένο ποσό.",
                en: "Many loans come with cover the bank arranged. Check what it actually covers, and whether the loan balance still matches the sum insured.",
            },
        })
    }

    items.push({
        id: "health",
        product: "health",
        weight: 80,
        title: { el: "Υγεία", en: "Health" },
        because:
            a.work === "retired"
                ? { el: "Είπατε ότι είστε συνταξιούχος.", en: "You said you are retired." }
                : { el: "Ισχύει για όλους.", en: "This applies to everyone." },
        check: {
            el: "Δείτε το ετήσιο ανώτατο όριο, τη συμμετοχή σας και ποια νοσοκομεία περιλαμβάνονται.",
            en: "Check the annual limit, your own contribution, and which hospitals are included.",
        },
    })

    if (a.work === "self_employed") {
        items.push({
            id: "self-employed",
            product: "business",
            weight: 85,
            title: { el: "Εισόδημα & επαγγελματική ευθύνη", en: "Income & professional liability" },
            because: { el: "Είπατε ότι είστε ελεύθερος επαγγελματίας.", en: "You said you are self-employed." },
            check: {
                el: "Αν σταματήσετε να δουλεύετε για τρεις μήνες, τι πληρώνει; Και ποιος καλύπτει ένα λάθος στη δουλειά σας;",
                en: "If you stop working for three months, what pays? And who covers a mistake in your work?",
            },
        })
    }

    if (ex.has("business")) {
        items.push({
            id: "business",
            product: "business",
            weight: 75,
            title: { el: "Επιχείρηση", en: "Business" },
            because: { el: "Είπατε ότι έχετε επιχείρηση.", en: "You said you own a business." },
            check: {
                el: "Δείτε αν καλύπτεται η διακοπή εργασιών, όχι μόνο η ζημιά στον χώρο.",
                en: "Check whether business interruption is covered, not only damage to the premises.",
            },
        })
    }

    if (ex.has("rentsOut")) {
        items.push({
            id: "rents-out",
            product: "property",
            weight: 65,
            title: { el: "Ακίνητο προς ενοικίαση", en: "Rented-out property" },
            because: { el: "Είπατε ότι νοικιάζετε ακίνητο σε άλλους.", en: "You said you rent out a property." },
            check: {
                el: "Δείτε αν το ασφαλιστήριο ισχύει με ενοικιαστές μέσα — αρκετά ασφαλιστήρια κατοικίας γράφονται για ιδιοκατοίκηση.",
                en: "Check whether the policy holds with tenants in place — plenty of home policies are written for owner-occupied use.",
            },
        })
    }

    if (ex.has("buildingManager")) {
        items.push({
            id: "building-manager",
            product: "liability",
            weight: 55,
            title: { el: "Διαχείριση πολυκατοικίας", en: "Managing a block of flats" },
            because: { el: "Είπατε ότι είστε διαχειριστής πολυκατοικίας.", en: "You said you manage a block of flats." },
            check: {
                el: "Ο ρόλος είναι άμισθος αλλά η ευθύνη για τους κοινόχρηστους χώρους — ασανσέρ, κλιμακοστάσιο, σωληνώσεις — είναι προσωπική. Δείτε αν υπάρχει κάλυψη στο όνομα της πολυκατοικίας.",
                en: "The role is unpaid but liability for the common areas — lift, stairwell, pipework — is personal. Check whether cover exists in the building's name.",
            },
        })
    }

    if (ex.has("travel")) {
        items.push({
            id: "travel",
            product: "travel",
            weight: 40,
            title: { el: "Ταξίδι", en: "Travel" },
            because: { el: "Είπατε ότι ταξιδεύετε συχνά.", en: "You said you travel often." },
            check: {
                el: "Αν ταξιδεύετε πολλές φορές τον χρόνο, το ετήσιο ασφαλιστήριο συνήθως κοστίζει λιγότερο από τρία μεμονωμένα. Δείτε επίσης τι ισχύει για ιατρικά έξοδα στο εξωτερικό.",
                en: "If you travel several times a year, an annual policy usually costs less than three single trips. Also check what applies to medical costs abroad.",
            },
        })
    }

    if (ex.has("boat")) {
        items.push({
            id: "boat",
            product: "boat",
            weight: 50,
            title: { el: "Σκάφος", en: "Boat" },
            because: { el: "Είπατε ότι έχετε σκάφος.", en: "You said you own a boat." },
            check: {
                el: "Δείτε αν καλύπτεται μόνο η αστική ευθύνη ή και το ίδιο το σκάφος, και σε ποια θαλάσσια όρια ισχύει.",
                en: "Check whether it covers third-party liability only or the hull too, and which waters it is valid in.",
            },
        })
    }

    if (ex.has("pets")) {
        items.push({
            id: "pet",
            product: "pet",
            weight: 30,
            title: { el: "Κατοικίδιο", en: "Pet" },
            because: { el: "Είπατε ότι έχετε κατοικίδιο.", en: "You said you have a pet." },
            check: {
                el: "Από το 2021 η αστική ευθύνη για σκύλους είναι υποχρεωτική στην Ελλάδα. Δείτε αν την έχετε.",
                en: "Since 2021 third-party liability for dogs is compulsory in Greece. Check whether you have it.",
            },
        })
    }


    if ((a.properties ?? 0) >= 2) {
        items.push({
            id: "second-property",
            product: "property",
            weight: 62,
            title: { el: "Δεύτερο ακίνητο", en: "Second property" },
            because: { el: "Είπατε ότι έχετε περισσότερα από ένα ακίνητα.", en: "You said you own more than one property." },
            check: {
                el: "Ένα ακίνητο που μένει κλειστό τον περισσότερο χρόνο έχει διαφορετικούς όρους — δείτε αν το ασφαλιστήριο αναφέρει περίοδο μη κατοίκησης.",
                en: "A property that stays empty most of the year has different terms — check whether the policy names an unoccupancy period.",
            },
        })
    }

    if (a.retirement === false && a.work !== "retired") {
        items.push({
            id: "pension",
            product: "pension",
            weight: 45,
            title: { el: "Σύνταξη", en: "Pension" },
            because: { el: "Είπατε ότι δεν αποταμιεύετε ακόμη για τη σύνταξή σας.", en: "You said you are not saving for your retirement yet." },
            check: {
                el: "Δείτε τι σας αναλογεί από τον κύριο φορέα σας. Η διαφορά από το σημερινό σας εισόδημα είναι το νούμερο που έχει σημασία.",
                en: "Check what your state scheme will actually pay you. The gap from your income today is the number that matters.",
            },
        })
    }

    if ((a.activities ?? []).length > 0) {
        items.push({
            id: "activities",
            product: "life",
            weight: 72,
            title: { el: "Δραστηριότητες υψηλού κινδύνου", en: "High-risk activities" },
            because: { el: "Δηλώσατε δραστηριότητες που πολλά ασφαλιστήρια εξαιρούν.", en: "You named activities that many policies exclude." },
            check: {
                el: "Ψάξτε τη λέξη «εξαιρέσεις» στο ασφαλιστήριο ζωής και υγείας σας. Αν η δραστηριότητά σας αναφέρεται εκεί ονομαστικά, τότε εξαιρείται όσο την κάνετε.",
                en: "Look for the word “exclusions” in your life and health policies. If your activity is named there, it is excluded for as long as you do it.",
            },
        })
    }

    if (a.cyber === "high") {
        items.push({
            id: "cyber",
            product: "cyber",
            weight: 35,
            title: { el: "Ψηφιακή ζωή", en: "Digital life" },
            because: { el: "Είπατε ότι σχεδόν τα πάντα περνούν από το κινητό σας.", en: "You said almost everything runs through your phone." },
            check: {
                el: "Δείτε αν κάποιο από τα ασφαλιστήριά σας καλύπτει απάτη σε ηλεκτρονική συναλλαγή — τα περισσότερα οικογενειακά συμβόλαια δεν την αναφέρουν καθόλου.",
                en: "Check whether any of your policies covers fraud on an online transaction — most household policies do not mention it at all.",
            },
        })
    }

    if (ex.has("valuables")) {
        items.push({
            id: "valuables",
            product: "fine-art",
            weight: 33,
            title: { el: "Τιμαλφή και έργα τέχνης", en: "Valuables and artwork" },
            because: { el: "Είπατε ότι έχετε τιμαλφή ή έργα τέχνης.", en: "You said you own valuables or artwork." },
            check: {
                el: "Τα ασφαλιστήρια κατοικίας έχουν συνήθως χαμηλό ανά-αντικείμενο όριο. Δείτε ποιο είναι, και αν χρειάζεται ξεχωριστή δήλωση.",
                en: "Home policies usually carry a low per-item limit. Check what it is, and whether a separate declaration is needed.",
            },
        })
    }

    /**
     * What the visitor says they already hold does not remove an item — it
     * changes what the item asks them to do. Dropping it would be the easy
     * move and the wrong one: "I have health cover" is not the same claim as
     * "my health cover is adequate", and the whole point of the product is the
     * distance between those two sentences.
     */
    const held = new Set(a.held ?? [])
    for (const item of items) {
        const key = item.id === "home-owned" ? "home" : item.id === "life-dependents" ? "life" : item.id
        if (held.has(key as never)) {
            item.because = {
                el: `${item.because.el} Είπατε επίσης ότι έχετε ήδη τέτοια κάλυψη.`,
                en: `${item.because.en} You also said you already hold this cover.`,
            }
        }
    }

    return items.sort((x, y) => y.weight - x.weight)
}
