import * as React from "react"
import { BrandStat } from "policy-wallet"

export const KeyMetrics = () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <BrandStat value="€1.240" label="Ετήσια εξοικονόμηση" style={{ minWidth: 160 }} />
        <BrandStat value="8" label="Ενεργά συμβόλαια" style={{ minWidth: 160 }} />
        <BrandStat value="92%" label="Βαθμός προστασίας" style={{ minWidth: 160 }} />
    </div>
)

export const CoverageBreakdown = () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <BrandStat value="3" label="Κενά κάλυψης" style={{ minWidth: 160 }} />
        <BrandStat value="€340" label="Μηνιαίο ασφάλιστρο" style={{ minWidth: 160 }} />
    </div>
)

export const SingleHighlight = () => (
    <BrandStat value="€180.000" label="Συνολικό ασφαλιζόμενο κεφάλαιο" style={{ maxWidth: 260 }} />
)
