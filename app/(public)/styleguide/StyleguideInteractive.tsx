"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button, IconButton, FilterChip, SearchField, Badge, Avatar, Skeleton, StatusChip } from "@/src/design-system/primitives"
import { Switch } from "@/src/design-system/switch"
import { SegmentedControl } from "@/src/design-system/segmented-control"
import { Sheet } from "@/src/design-system/sheet"
import { Tooltip } from "@/src/design-system/tooltip"
import { GroupedList, GroupHeader, Row, Grid } from "@/src/design-system/app-layout"

/**
 * The component gallery — every primitive in every state. Client so the
 * stateful controls actually toggle. Sample content only («ΔΕΙΓΜΑ»).
 */
export function StyleguideInteractive() {
    const [on, setOn] = useState(true)
    const [pending, setPending] = useState(false)
    const [seg, setSeg] = useState<"branch" | "expiry" | "person">("branch")
    const [chips, setChips] = useState({ motor: true, home: false })
    const [sheet, setSheet] = useState(false)
    return (
        <div className="flex flex-col gap-g-8">
            <section>
                <h2 className="text-g-heading">Buttons</h2>
                <div className="mt-g-3 flex flex-wrap items-center gap-g-3">
                    <Button>Solid</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                    <Button size="sm">Small</Button>
                    <Button loading>Loading</Button>
                    <Button disabled>Disabled</Button>
                    <IconButton label="Κλείσιμο"><span aria-hidden>×</span></IconButton>
                    <IconButton label="Αναζήτηση" variant="secondary" size="sm"><span aria-hidden>⌕</span></IconButton>
                </div>
            </section>
            <section>
                <h2 className="text-g-heading">Fields · chips · badges</h2>
                <div className="mt-g-3 flex flex-col gap-g-3">
                    <SearchField label="Αναζήτηση ασφαλιστηρίων" />
                    <div className="flex flex-wrap gap-g-2">
                        <FilterChip pressed={chips.motor} onClick={() => setChips((c) => ({ ...c, motor: !c.motor }))}>Αυτοκίνητο</FilterChip>
                        <FilterChip pressed={chips.home} onClick={() => setChips((c) => ({ ...c, home: !c.home }))}>Κατοικία</FilterChip>
                        <FilterChip pressed={false} disabled>Ανενεργό</FilterChip>
                    </div>
                    <div className="flex flex-wrap items-center gap-g-2">
                        <Badge>3</Badge><Badge tone="covered">22</Badge><Badge tone="gap">5</Badge><Badge tone="review">3</Badge><Badge tone="brand">Family</Badge>
                        <Avatar name="Μαρία Παπαδοπούλου" size="sm" /><Avatar name="Νίκος" /><Avatar name="Γιώργος" size="lg" />
                        <StatusChip state="covered">Καλύπτεται</StatusChip>
                    </div>
                </div>
            </section>
            <section>
                <h2 className="text-g-heading">Switch · segmented control</h2>
                <div className="mt-g-3 flex flex-col gap-g-3">
                    <Switch checked={on} onCheckedChange={setOn} label="Ο σύμβουλος βλέπει αυτό το ασφαλιστήριο" description="Από τις 12 Ιουν 2026 · μπορείτε να το ανακαλέσετε όποτε θέλετε" />
                    <Switch checked={true} onCheckedChange={() => {}} label="Σε αναμονή" description="Η αλλαγή αποθηκεύεται…" pending={pending} />
                    <Switch checked={false} onCheckedChange={() => {}} label="Απενεργοποιημένο" disabled />
                    <Button variant="ghost" size="sm" onClick={() => setPending((p) => !p)}>Εναλλαγή pending</Button>
                    <SegmentedControl
                        label="Ταξινόμηση"
                        value={seg}
                        onChange={setSeg}
                        options={[{ value: "branch", label: "Ανά κλάδο" }, { value: "expiry", label: "Ανά λήξη" }, { value: "person", label: "Ανά άτομο" }]}
                    />
                </div>
            </section>
            <section>
                <h2 className="text-g-heading">Grouped list · rows</h2>
                <div className="mt-g-3">
                    <GroupHeader count={3}>Αυτοκίνητο</GroupHeader>
                    <GroupedList label="ΔΕΙΓΜΑ">
                        <Row icon={<span aria-hidden>🚗</span>} primary="Toyota Yaris · ΙΚΖ-4821" secondary="Interamerican · Αστική ευθύνη, Θραύση κρυστάλλων · 287 € · Μαρία" trailing={<><span>8 ημ.</span><StatusChip state="gap">Κενό</StatusChip></>} href="/styleguide#row" />
                        <Row icon={<span aria-hidden>🏠</span>} primary="Κατοικία · Κηφισιά" secondary="Generali · Πυρκαγιά, Σεισμός · 412 €" trailing={<StatusChip state="covered">Καλύπτεται</StatusChip>} onClick={() => toast("Πατήσατε τη γραμμή", { description: "Ολόκληρη η γραμμή είναι ο στόχος." })} />
                        <Row primary="Στατική γραμμή" secondary="Χωρίς ενέργεια" trailing={<StatusChip state="review">Για έλεγχο</StatusChip>} />
                    </GroupedList>
                </div>
                <Grid columns={3} className="mt-g-4">
                    <div className="rounded-g-card border border-border-subtle bg-surface-raised p-g-3">cell</div>
                    <div className="rounded-g-card border border-border-subtle bg-surface-raised p-g-3">cell</div>
                    <div className="rounded-g-card border border-border-subtle bg-surface-raised p-g-3">cell</div>
                </Grid>
            </section>
            <section>
                <h2 className="text-g-heading">Sheet · tooltip · toast · skeleton</h2>
                <div className="mt-g-3 flex flex-wrap items-center gap-g-3">
                    <Button variant="secondary" onClick={() => setSheet(true)}>Άνοιγμα sheet</Button>
                    <Tooltip text="Το ΙΚΖ-4821 λήγει σε 8 ημέρες"><Button variant="ghost">Με tooltip</Button></Tooltip>
                    <Button variant="ghost" onClick={() => toast("Το ασφαλιστήριο αποθηκεύτηκε", { description: "Το διαβάζω τώρα." })}>Toast</Button>
                </div>
                <div className="mt-g-3 flex flex-col gap-g-2">
                    <Skeleton className="h-16 w-full rounded-g-card" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                <Sheet open={sheet} onClose={() => setSheet(false)} title="Τι θα σταλεί" closeLabel="Κλείσιμο">
                    <p className="text-g-app-body text-fg-secondary">Ένα sheet από κάτω στο κινητό, ένα παράθυρο στο κέντρο από tablet και πάνω.</p>
                    <div className="mt-g-4 flex justify-end gap-g-2"><Button variant="secondary" onClick={() => setSheet(false)}>Άκυρο</Button><Button onClick={() => setSheet(false)}>Εντάξει</Button></div>
                </Sheet>
            </section>
        </div>
    )
}
