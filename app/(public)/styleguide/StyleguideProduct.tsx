"use client"

import { useState } from "react"
import { VerdictCard, ActionRow, ActionRowList, TierHeader, FindingCard, MoneyTriad, CoverageMap, HouseholdStrip, LifeEventChips, CoverageChecklist, QuestionList, ConsentSheet, Ledger, PlatformNote, ExpiryRail } from "@/src/design-system/app"
import { Button } from "@/src/design-system/primitives"
import { toRenderableFinding, findingHash } from "@/lib/app/finding"

/** The product-expressive components with SAMPLE data («ΔΕΙΓΜΑ»), rendered per theme by the page. */
export function StyleguideProduct() {
    const [consent, setConsent] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const finding = toRenderableFinding({
        id: "sample-1",
        hash: findingHash("sample-pol-1", "flood", "home_flood_missing"),
        kind: "gap",
        tier: "now",
        object: { policyId: "sample-pol-1", assetLabel: "Κατοικία · Κηφισιά" },
        sentence: { key: "app.finding.home.flood", params: {} },
        source: { documentId: "sample-doc-1", documentLabel: "Ασφαλιστήριο κατοικίας", locator: { kind: "section", section: "coverages", found: false }, othersSearched: 29 },
        ruleId: "home_flood_missing",
    })
    const stateLabels = { covered: "Καλύπτεται", gap: "Κενό", review: "Για έλεγχο" }
    return (
        <div className="flex flex-col gap-g-8">
            <p className="text-g-app-label uppercase tracking-[0.06em] text-fg-faint">ΔΕΙΓΜΑ — επινοημένα στοιχεία</p>
            <VerdictCard
                counts={{ covered: 22, gap: 5, review: 3 }}
                active={30}
                quiet={false}
                mood="Αξίζει να δείτε"
                sentence="Σας καλύπτουν 22 από τα 30."
                reassurance="Τρία πράγματα αξίζει να δείτε αυτή την εβδομάδα."
                ringLabel="22 από 30 καλύπτονται · 5 με κενό · 3 για έλεγχο"
                tiles={[{ state: "covered", label: "Καλύπτονται", count: 22, href: "#" }, { state: "gap", label: "Με κενό", count: 5, href: "#" }, { state: "review", label: "Για έλεγχο", count: 3, href: "#" }]}
            />
            <VerdictCard
                counts={{ covered: 3, gap: 0, review: 0 }}
                active={3}
                quiet
                mood="Όλα εντάξει"
                sentence="Δεν χρειάζεται να κάνετε τίποτα σήμερα."
                reassurance="Τα παρακολουθώ όλα. Η επόμενη λήξη είναι σε 37 ημέρες."
                ringLabel="3 από 3 καλύπτονται · 0 με κενό · 0 για έλεγχο"
                tiles={[{ state: "covered", label: "Καλύπτονται", count: 3, href: "#" }, { state: "gap", label: "Με κενό", count: 0, href: "#" }, { state: "review", label: "Για έλεγχο", count: 0, href: "#" }]}
            />
            <div>
                <TierHeader title="Να το δείτε τώρα" definition="Λήγει μέσα σε 14 ημέρες, ή είναι κενό σε κάτι βασικό." count={2} />
                <ActionRowList label="ΔΕΙΓΜΑ">
                    <ActionRow kind="expiry" sentence="Το ΙΚΖ-4821 λήγει σε 8 ημέρες." source="Ασφαλιστήριο αυτοκινήτου · σελ. 1" trailing="8 ημ." href="#" />
                    <ActionRow kind="gap" sentence="Στο σπίτι σας δεν βρήκα κάλυψη πλημμύρας." source="Ασφαλιστήριο κατοικίας · ενότητα καλύψεων — δεν αναφέρεται" href="#" />
                    <ActionRow kind="review" sentence="Για τη ζωή σας δεν ξέρω αν το ποσό φτάνει." source="Μου λείπει ποιοι εξαρτώνται από εσάς." href="#" />
                </ActionRowList>
            </div>
            {finding && (
                <FindingCard
                    finding={finding}
                    sentence="Στο σπίτι σας δεν βρήκα κάλυψη πλημμύρας. Έψαξα και στα άλλα 29 — πουθενά."
                    sourceLine="Ασφαλιστήριο κατοικίας · ενότητα καλύψεων — δεν αναφέρεται"
                    whyYou="Μου είπατε ότι το σπίτι είναι δικό σας· ένα κενό εκεί σας αφορά."
                    openHref="#"
                    helpHref="#"
                    onDismiss={async () => {}}
                    labels={{ kind: "Κενό", sourceLabel: "Πού το είδα:", open: "Άνοιγμα ασφαλιστηρίου", help: "Ζητάω βοήθεια", dismiss: "Δεν με αφορά", dismissTitle: "Γιατί δεν σας αφορά;", dismissConfirm: "Να μην το ξαναδώ", close: "Κλείσιμο", cancel: "Άκυρο", reasons: [{ value: "chosen", label: "Το ξέρω, το επέλεξα" }, { value: "renewed", label: "Το ανανέωσα ήδη" }, { value: "not_relevant", label: "Δεν με αφορά" }] }}
                />
            )}
            <MoneyTriad
                paid={{ label: "Πληρώνετε τον χρόνο", value: "8.224 €", note: "Μόνο όσα ισχύουν σήμερα.", factKey: "money.paidPerYear" }}
                protects={{ label: "Σας προστατεύουν έως", value: "1,3 εκ. €", note: "Το μεγαλύτερο μεμονωμένο όριο — όχι άθροισμα.", factKey: "money.protectsUpTo" }}
                twice={{ label: "Ίσως πληρώνετε δύο φορές", value: "84 €", note: "Ποσό από τιμολόγιο ασφαλιστή.", factKey: "money.paidTwice" }}
            />
            <CoverageMap
                legend={{ ...stateLabels, none: "δεν έχετε" }}
                cells={[{ id: "motor", label: "Αυτοκίνητο", state: "gap" }, { id: "home", label: "Κατοικία", state: "covered" }, { id: "health", label: "Υγεία", state: "review" }, { id: "life", label: "Ζωή", state: null }, { id: "travel", label: "Ταξίδι", state: "covered" }, { id: "pet", label: "Κατοικίδιο", state: null }, { id: "liability", label: "Αστική ευθύνη", state: "covered" }, { id: "cyber", label: "Cyber", state: null }]}
            />
            <HouseholdStrip stateLabels={stateLabels} add={{ href: "#", label: "Προσθήκη ατόμου" }} people={[{ id: "a", name: "Μαρία", state: "covered", countLabel: "4 ασφαλιστήρια", href: "#" }, { id: "b", name: "Γιώργος", state: "gap", countLabel: "2 ασφαλιστήρια", href: "#" }, { id: "c", name: "Ελένη", state: "review", countLabel: "χωρίς ασφαλιστήριο", href: "#" }]} />
            <LifeEventChips chips={[{ id: "marriage", label: "Γάμος", href: "#" }, { id: "birth", label: "Παιδί", href: "#" }, { id: "property_purchase", label: "Νέο σπίτι", href: "#" }, { id: "vehicle_purchase", label: "Νέο αυτοκίνητο", href: "#" }, { id: "other", label: "Κάτι άλλο", href: "#" }]} />
            <CoverageChecklist stateLabels={{ ok: "Καλύπτεται", not: "Δεν καλύπτεται", review: "Δεν είμαι σίγουρος" }} lines={[{ id: "fire", label: "Πυρκαγιά", state: "ok", citation: "άρθρο 2.1 · σελ. 3" }, { id: "flood", label: "Πλημμύρα", state: "not", citation: "δεν αναφέρεται" }, { id: "quake", label: "Σεισμός — όριο", state: "review", citation: "δεν εντοπίστηκε" }]} />
            <QuestionList label="Έτοιμες ερωτήσεις" askLabel="Ρωτήστε τον σύμβουλό σας με ένα πάτημα" questions={[{ id: "q1", text: "Καλύπτεται η πλημμύρα από βροχή, ή μόνο από υπερχείλιση;", href: "#" }, { id: "q2", text: "Ποιο είναι το όριο για σεισμό;", href: "#" }]} />
            <ExpiryRail label="Επόμενες λήξεις" stateLabels={stateLabels} items={[{ id: "1", label: "Toyota Yaris · ΙΚΖ-4821", when: "σε 8 ημέρες", state: "gap", href: "#" }, { id: "2", label: "Υγεία · Generali", when: "σε 37 ημέρες", state: "covered", href: "#" }, { id: "3", label: "Κατοικία · Κηφισιά", when: "σε 120 ημέρες", state: "covered", href: "#" }]} />
            <Ledger title="Τι έκανα για εσάς φέτος" planLine="Family · 8,99 €/μήνα" empty="Δεν έχω ακόμη κάτι να σας δείξω." lines={[{ key: "policiesRead", label: "Ασφαλιστήρια που διάβασα", value: "30" }, { key: "renewalsCaught", label: "Λήξεις που πρόλαβα", value: "5" }, { key: "gapsFound", label: "Κενά που βρήκα", value: "5" }, { key: "paidTwice", label: "Που ίσως πληρώνατε δύο φορές", value: "84 €" }]} />
            <Ledger title="Τι έκανα για εσάς φέτος" empty="Δεν έχω ακόμη κάτι να σας δείξω — μόλις διαβάσω το πρώτο ασφαλιστήριο, θα το γράψω εδώ." lines={[]} />
            <PlatformNote title="Σημείωση" body="Ό,τι σας λέω το διάβασα στα δικά σας έγγραφα με AI και μπορεί να έχω λάθος — κάθε στοιχείο είναι ορατό για να το ελέγξετε. Δεν σας λέω τι να αγοράσετε· σας λέω τι είδα. Δεν είναι ασφαλιστική συμβουλή: για αποφάσεις, ρωτήστε τον σύμβουλό σας." />
            <div>
                <Button variant="secondary" onClick={() => setConsent(true)}>Άνοιγμα ConsentSheet</Button>
                <ConsentSheet
                    open={consent}
                    onClose={() => setConsent(false)}
                    title="Τι θα σταλεί στον σύμβουλό σας"
                    chips={["Το εύρημα", "Ασφαλιστήριο κατοικίας", "Διεύθυνση (από το προφίλ σας)"]}
                    sentence="Στέλνω στον Νίκο μόνο αυτά τα τρία. Τα άλλα 29 ασφαλιστήρια δεν τα βλέπει."
                    plainWords="Μπορείτε να το ανακαλέσετε όποτε θέλετε."
                    switchLabel="Συμφωνώ να σταλούν"
                    checked={agreed}
                    onCheckedChange={setAgreed}
                    confirm={{ label: "Αποστολή", onConfirm: () => setConsent(false) }}
                    cancelLabel="Άκυρο"
                    closeLabel="Κλείσιμο"
                />
            </div>
        </div>
    )
}
