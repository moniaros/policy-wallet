import * as React from "react"
import { FloatingActionButton } from "policy-wallet"

// The FAB is pinned with `position: fixed` (bottom-right) and is not portaled, so
// it mounts inside `#r0.ds-single`, whose `transform: translateZ(0)` turns it into
// the containing block for fixed descendants — the FAB would then pin to the
// zero-height mount box instead of the card. Neutralize that transform, give the
// body a real height, and demote the FAB's `fixed` to `absolute` so it pins to the
// card's own bottom-right corner over the background content.
const pinned = `
  body { position: relative; min-height: 460px; }
  .ds-single { transform: none !important; }
  div.fixed { position: absolute !important; }
`

const UploadIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8l-5-5-5 5" />
        <path d="M12 3v12" />
    </svg>
)

const CameraIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
)

const PenIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
)

const backdropCard = (title: string, meta: string, badge: string): React.ReactNode => (
    <div
        style={{
            border: "1px solid #e7e5e4",
            borderRadius: 18,
            padding: 16,
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
        <span
            style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0f766e",
                background: "#ccfbf1",
                borderRadius: 999,
                padding: "4px 10px",
                whiteSpace: "nowrap",
            }}
        >
            {badge}
        </span>
    </div>
)

export const WalletActions = () => (
    <>
        <style>{pinned}</style>
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#1c1917" }}>Τα συμβόλαιά μου</h2>
            {backdropCard("Ασφάλεια Αυτοκινήτου", "ΕΘΝΙΚΗ Ασφαλιστική · 63708952", "Ενεργό")}
            {backdropCard("Ασφάλεια Κατοικίας", "Interamerican · 4421870", "Ενεργό")}
            {backdropCard("Ασφάλεια Ζωής", "NN Hellas · 90514322", "Ενεργό")}
        </div>
        <FloatingActionButton
            mainLabel="Προσθήκη συμβολαίου"
            position="bottom-right"
            actions={[
                { id: "upload", label: "Ανέβασμα εγγράφου", icon: UploadIcon, color: "sky", onClick: () => undefined },
                { id: "scan", label: "Σάρωση με κάμερα", icon: CameraIcon, color: "emerald", onClick: () => undefined },
                { id: "manual", label: "Προσθήκη χειροκίνητα", icon: PenIcon, color: "amber", onClick: () => undefined },
            ]}
        />
    </>
)
