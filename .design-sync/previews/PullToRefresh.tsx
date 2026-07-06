import * as React from "react"
import { PullToRefresh } from "policy-wallet"

// PullToRefresh is a scroll container (`h-full overflow-y-auto`) that reveals a
// refresh indicator on touch-pull. At rest the indicator is hidden (opacity 0), so
// statically it renders its children as a scrollable list. `h-full` needs a bounded
// parent height, so each story wraps the widget in a fixed-height frame.

const listRow = (title: string, meta: string, amount: string, badge: string, badgeBg: string, badgeFg: string): React.ReactNode => (
    <div
        style={{
            border: "1px solid #e7e5e4",
            borderRadius: 18,
            padding: 16,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
        }}
    >
        <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1c1917" }}>{title}</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78716c" }}>{meta}</p>
        </div>
        <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1c1917" }}>{amount}</p>
            <span
                style={{
                    display: "inline-block",
                    marginTop: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: badgeFg,
                    background: badgeBg,
                    borderRadius: 999,
                    padding: "3px 9px",
                }}
            >
                {badge}
            </span>
        </div>
    </div>
)

const Frame = ({ children }: { children: React.ReactNode }) => (
    <div style={{ height: 540, width: 360, border: "1px solid #e7e5e4", borderRadius: 24, overflow: "hidden", background: "#fafaf9" }}>
        <PullToRefresh onRefresh={async () => undefined}>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {children}
            </div>
        </PullToRefresh>
    </div>
)

export const PolicyList = () => (
    <Frame>
        <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#1c1917" }}>Τα συμβόλαιά μου</h2>
        {listRow("Ασφάλεια Αυτοκινήτου", "ΕΘΝΙΚΗ Ασφαλιστική · 63708952", "€104,87", "Ενεργό", "#dcfce7", "#15803d")}
        {listRow("Ασφάλεια Κατοικίας", "Interamerican · 4421870", "€340,00", "Ενεργό", "#dcfce7", "#15803d")}
        {listRow("Ασφάλεια Ζωής", "NN Hellas · 90514322", "€612,40", "Ενεργό", "#dcfce7", "#15803d")}
        {listRow("Ασφάλεια Υγείας", "Generali · 77201564", "€980,00", "Λήγει σύντομα", "#fef3c7", "#b45309")}
    </Frame>
)

export const TaskList = () => (
    <Frame>
        <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#1c1917" }}>Εκκρεμότητες</h2>
        {listRow("Ανανέωση συμβολαίου", "Ασφάλεια Υγείας · έως 12/07", "€980,00", "Επείγον", "#fee2e2", "#b91c1c")}
        {listRow("Κενό κάλυψης", "Κατοικία · χωρίς κάλυψη πλημμύρας", "+€4,50/μήνα", "Πρόταση", "#e0f2fe", "#0369a1")}
        {listRow("Έλεγχος ασφαλίστρου", "Αυτοκίνητο · πιθανή έκπτωση", "−€22,00", "Ευκαιρία", "#dcfce7", "#15803d")}
    </Frame>
)
