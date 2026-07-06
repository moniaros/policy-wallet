import * as React from "react"
import { BrandCard } from "policy-wallet"

export const CoverageSummary = () => (
    <BrandCard style={{ maxWidth: 380, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Ασφάλεια Κατοικίας</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--brand-text-muted)" }}>
                    Interamerican · Συμβόλαιο 4421870
                </p>
            </div>
            <span
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--brand-accent-cta)",
                    background: "color-mix(in srgb, var(--brand-accent-cta) 14%, transparent)",
                    borderRadius: 999,
                    padding: "4px 10px",
                }}
            >
                Ενεργό
            </span>
        </div>
        <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--brand-text-muted)" }}>Ετήσιο ασφάλιστρο</span>
                <strong>€340,00</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--brand-text-muted)" }}>Ασφαλιζόμενο κεφάλαιο</span>
                <strong>€180.000</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--brand-text-muted)" }}>Κάλυψη</span>
                <strong>Πυρός + Σεισμός + Κλοπή</strong>
            </div>
        </div>
    </BrandCard>
)

export const SoftHighlight = () => (
    <BrandCard tone="soft" style={{ maxWidth: 380, padding: 24 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--brand-accent-cta)", letterSpacing: 0.4 }}>
            ΠΡΟΤΑΣΗ ΚΑΛΥΨΗΣ
        </p>
        <h3 style={{ margin: "8px 0 6px", fontSize: 18, fontWeight: 700 }}>
            Εντοπίσαμε ένα κενό στην κάλυψή σας
        </h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--brand-text-muted)" }}>
            Το συμβόλαιο κατοικίας σας δεν περιλαμβάνει κάλυψη για ζημιές από πλημμύρα.
            Προσθέστε την για επιπλέον €4,50 τον μήνα.
        </p>
    </BrandCard>
)

export const TonesSideBySide = () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <BrandCard style={{ width: 200, padding: 20 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--brand-text-muted)" }}>tone: default</p>
            <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600 }}>Βασική επιφάνεια κάρτας</p>
        </BrandCard>
        <BrandCard tone="soft" style={{ width: 200, padding: 20 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--brand-text-muted)" }}>tone: soft</p>
            <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600 }}>Ανυψωμένη επιφάνεια</p>
        </BrandCard>
    </div>
)
