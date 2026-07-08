import * as React from "react"
import { Button } from "policy-wallet"

export const Variants = () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Button>Αποθήκευση</Button>
        <Button variant="secondary">Ακύρωση</Button>
        <Button variant="outline">Προεπισκόπηση</Button>
        <Button variant="ghost">Παράλειψη</Button>
        <Button variant="link">Μάθετε περισσότερα</Button>
        <Button variant="destructive">Διαγραφή συμβολαίου</Button>
    </div>
)

export const Sizes = () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button size="sm">Μικρό</Button>
        <Button size="default">Κανονικό</Button>
        <Button size="lg">Μεγάλο</Button>
        <Button size="icon" aria-label="Προσθήκη">+</Button>
    </div>
)

export const Disabled = () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button disabled>Αποθήκευση</Button>
        <Button variant="outline" disabled>Προεπισκόπηση</Button>
    </div>
)
