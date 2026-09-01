import { VerdictCard, MoneyTriad, CoverageMap } from "@/src/design-system/app"

/**
 * D4: the three-presentation declaration made visible. The SAME widget with
 * the SAME facts inside 375 / 768 / 1100-wide containers, side by side —
 * compact stacks, regular breathes, expanded spreads, and nothing is
 * exclusive to a width. tests/unit/styleguide-presentations.test.tsx asserts
 * the facts render identically in all three.
 */

const WIDTHS = [375, 768, 1100] as const
const stateLabels = { covered: "Καλύπτεται", gap: "Χωρίς κάλυψη", review: "Για έλεγχο" }

function SampleSet() {
    return (
        <div className="flex flex-col gap-g-4">
            <VerdictCard
                counts={{ covered: 22, gap: 5, review: 3 }}
                active={30}
                quiet={false}
                mood="Αξίζει να δείτε"
                sentence="Βρήκα κάλυψη σε 22 από τα 30."
                reassurance="Τρία πράγματα αξίζει να δείτε αυτή την εβδομάδα."
                ringLabel="22 από 30 καλύπτονται · 5 χωρίς κάλυψη · 3 για έλεγχο"
                tiles={[{ state: "covered", label: "Καλύπτονται", count: 22, href: "#" }, { state: "gap", label: "Χωρίς κάλυψη", count: 5, href: "#" }, { state: "review", label: "Για έλεγχο", count: 3, href: "#" }]}
            />
            <MoneyTriad
                paid={{ label: "Πληρώνετε τον χρόνο", value: "8.224 €", note: "Μόνο όσα ισχύουν σήμερα.", factKey: "money.paidPerYear" }}
                protects={{ label: "Σας προστατεύουν έως", value: "1,3 εκ. €", note: "Το μεγαλύτερο μεμονωμένο όριο — όχι άθροισμα.", factKey: "money.protectsUpTo" }}
                twice={{ label: "Ίσως πληρώνετε δύο φορές", value: "84 €", note: "Ποσό από τιμολόγιο ασφαλιστή.", factKey: "money.paidTwice" }}
            />
            <CoverageMap
                legend={{ ...stateLabels, none: "δεν έχετε" }}
                cells={[{ id: "motor", label: "Αυτοκίνητο", state: "gap" }, { id: "home", label: "Κατοικία", state: "covered" }, { id: "health", label: "Υγεία", state: "review" }, { id: "life", label: "Ζωή", state: null }]}
            />
        </div>
    )
}

export function StyleguidePresentations() {
    return (
        <div className="flex flex-col gap-g-6">
            <p className="text-g-app-label uppercase tracking-[0.06em] text-fg-faint">ΔΕΙΓΜΑ — τρεις παρουσιάσεις, ίδια στοιχεία</p>
            <div className="flex flex-wrap items-start gap-g-6 overflow-x-auto">
                {WIDTHS.map((w) => (
                    <div key={w} data-presentation={w} style={{ width: w }} className="shrink-0 rounded-g-card border border-border-hair p-g-3">
                        <p className="mb-g-2 text-g-app-caption tabular-nums text-fg-faint">{w}px</p>
                        <SampleSet />
                    </div>
                ))}
            </div>
        </div>
    )
}
