import * as React from "react"
import { BrandActionButton } from "policy-wallet"

export const Variants = () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <BrandActionButton>Ανάλυση με AI</BrandActionButton>
        <BrandActionButton variant="secondary">Προβολή λεπτομερειών</BrandActionButton>
    </div>
)

export const PrimaryCta = () => (
    <BrandActionButton>Ξεκινήστε την ανάλυση κάλυψης</BrandActionButton>
)

export const Disabled = () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <BrandActionButton disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
            Μεταφόρτωση συμβολαίου
        </BrandActionButton>
        <BrandActionButton variant="secondary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
            Ακύρωση
        </BrandActionButton>
    </div>
)
