"use client"

import { VerdictCard, ActionRow, ActionRowList, TierHeader, FindingCard, MoneyTriad, CoverageMap, HouseholdStrip, QuestionList, Ledger, ExpiryRail } from "@/src/design-system/app"
import { Skeleton } from "@/src/design-system/primitives"
import { toRenderableFinding, findingHash } from "@/lib/app/finding"

/**
 * D4 (audit ladder): the states the catalogue was missing — loading skeletons
 * that mirror the final layout, honest empties, over-populated forms, and the
 * review-kind finding without a why-you. Every figure is «ΔΕΙΓΜΑ».
 */
export function StyleguideStates() {
    const stateLabels = { covered: "Καλύπτεται", gap: "Κενό", review: "Για έλεγχο" }
    const reviewFinding = toRenderableFinding({
        id: "sample-2",
        hash: findingHash("sample-pol-2", "life-sum", "life_sum_unknown"),
        kind: "review",
        tier: "month",
        object: { policyId: "sample-pol-2", assetLabel: "Ζωή · Μαρία" },
        sentence: { key: "app.finding.life.sum", params: {} },
        source: { documentId: "sample-doc-2", documentLabel: "Ασφαλιστήριο ζωής", locator: { kind: "section", section: "schedule", found: false }, othersSearched: 29 },
        ruleId: "life_sum_unknown",
    })
    return (
        <div className="flex flex-col gap-g-8">
            <p className="text-g-app-label uppercase tracking-[0.06em] text-fg-faint">ΔΕΙΓΜΑ — καταστάσεις</p>

            {/* over-populated verdict: three digits per tile, nothing wraps */}
            <VerdictCard
                counts={{ covered: 180, gap: 45, review: 12 }}
                active={237}
                quiet={false}
                mood="Αξίζει να δείτε"
                sentence="Σας καλύπτουν 180 από τα 237."
                reassurance="Υπάρχουν 57 πράγματα που αξίζει να δείτε."
                ringLabel="180 από 237 καλύπτονται · 45 με κενό · 12 για έλεγχο"
                tiles={[{ state: "covered", label: "Καλύπτονται", count: 180, href: "#" }, { state: "gap", label: "Με κενό", count: 45, href: "#" }, { state: "review", label: "Για έλεγχο", count: 12, href: "#" }]}
            />

            {/* loading: the skeleton mirrors the card it becomes */}
            <div aria-hidden className="rounded-g-card bg-surface-raised p-g-5 shadow-g-raised">
                <div className="flex items-center gap-g-4">
                    <Skeleton className="size-24 rounded-full" />
                    <div className="flex-1 space-y-g-2">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
                <div className="mt-g-4 flex gap-g-2 [&>*]:flex-1">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                </div>
            </div>

            {/* tier at zero + the honest empty list */}
            <div>
                <TierHeader title="Να το δείτε τώρα" definition="Λήγει μέσα σε 14 ημέρες, ή είναι κενό σε κάτι βασικό." count={0} />
                <p className="px-g-4 text-g-app-body-sm text-fg-secondary tablet:px-0">Τίποτα εδώ αυτή τη στιγμή — το παρακολουθώ.</p>
            </div>

            {/* a LONG list keeps its rhythm */}
            <ActionRowList label="ΔΕΙΓΜΑ — πολλά">
                {["ΙΚΖ-4821", "ΒΖΝ-8520", "ΚΜΥ-4769", "ΕΗΤ-6941", "ΗΝΡ-2885", "ΟΚΜ-8338"].map((plate, i) => (
                    <ActionRow key={plate} kind={i % 2 ? "gap" : "expiry"} sentence={`Το ${plate} λήγει σε ${8 + i} ημέρες.`} source="Ασφαλιστήριο αυτοκινήτου · σελ. 1" trailing={`${8 + i} ημ.`} href="#" />
                ))}
            </ActionRowList>

            {/* review kind, no why-you: the card renders without the block */}
            {reviewFinding && (
                <FindingCard
                    finding={reviewFinding}
                    sentence="Για τη ζωή σας δεν ξέρω αν το ποσό φτάνει — δεν εντοπίστηκε στο έγγραφο."
                    sourceLine="Ασφαλιστήριο ζωής · πίνακας — δεν εντοπίστηκε"
                    openHref="#"
                    helpHref="#"
                    onDismiss={async () => {}}
                    labels={{ kind: "Για έλεγχο", sourceLabel: "Πού το είδα:", open: "Άνοιγμα ασφαλιστηρίου", help: "Ζητάω βοήθεια", dismiss: "Δεν με αφορά", dismissTitle: "Γιατί δεν σας αφορά;", dismissConfirm: "Να μην το ξαναδώ", close: "Κλείσιμο", cancel: "Άκυρο", reasons: [{ value: "chosen", label: "Το ξέρω, το επέλεξα" }, { value: "renewed", label: "Το ανανέωσα ήδη" }, { value: "not_relevant", label: "Δεν με αφορά" }] }}
                />
            )}

            {/* the triad with no tariff figure: the cell says so, never invents */}
            <MoneyTriad
                paid={{ label: "Πληρώνετε τον χρόνο", value: "8.224 €", note: "Μόνο όσα ισχύουν σήμερα.", factKey: "money.paidPerYear" }}
                protects={{ label: "Σας προστατεύουν έως", value: "1,3 εκ. €", note: "Το μεγαλύτερο μεμονωμένο όριο — όχι άθροισμα.", factKey: "money.protectsUpTo" }}
                twice={{ label: "Ίσως πληρώνετε δύο φορές", value: "—", note: "Χωρίς τιμολόγιο ασφαλιστή δεν γράφω ποσό.", factKey: "money.paidTwice" }}
            />

            {/* the map with nothing covered — the quiet state must not reassure */}
            <CoverageMap
                legend={{ ...stateLabels, none: "δεν έχετε" }}
                cells={[{ id: "motor", label: "Αυτοκίνητο", state: null }, { id: "home", label: "Κατοικία", state: null }, { id: "health", label: "Υγεία", state: null }, { id: "life", label: "Ζωή", state: null }]}
            />

            {/* zero people: only the add action */}
            <HouseholdStrip stateLabels={stateLabels} add={{ href: "#", label: "Προσθήκη ατόμου" }} people={[]} />

            {/* empty question list and empty rail render nothing loudly */}
            <QuestionList label="Έτοιμες ερωτήσεις" askLabel="Ρωτήστε τον σύμβουλό σας με ένα πάτημα" questions={[]} />
            <ExpiryRail label="Επόμενες λήξεις" stateLabels={stateLabels} items={[]} />

            {/* a BUSY rail keeps snapping */}
            <ExpiryRail
                label="Επόμενες λήξεις — πολλές"
                stateLabels={stateLabels}
                items={Array.from({ length: 8 }, (_, i) => ({ id: String(i), label: `Ασφαλιστήριο ${i + 1}`, when: `σε ${9 + i * 11} ημέρες`, state: (["covered", "gap", "review"] as const)[i % 3], href: "#" }))}
            />

            {/* ledger loading mirrors its grid */}
            <div aria-hidden className="rounded-g-card bg-surface-raised p-g-5 shadow-g-raised">
                <Skeleton className="mb-g-3 h-5 w-1/2" />
                <div className="grid grid-cols-2 gap-g-2">
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                </div>
            </div>
            <Ledger title="Τι έκανα για εσάς φέτος" planLine="Family · 8,99 €/μήνα" empty="Δεν έχω ακόμη κάτι να σας δείξω." lines={[{ key: "policiesRead", label: "Ασφαλιστήρια που διάβασα", value: "30" }]} />
        </div>
    )
}
