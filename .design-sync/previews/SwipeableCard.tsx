import * as React from "react"
import { SwipeableCard } from "policy-wallet"

// SwipeableCard reveals its actions only mid-swipe: at rest the action rail sits
// off-card (opacity 0, translated aside) and the content covers it. To document the
// swipe affordance statically, the `Revealed` story nudges the card content aside
// with `!important` CSS (scoped to the `swipe-demo` class we pass to the root) so the
// right-hand action rail peeks out — the same visual the user sees while dragging.
const revealed = `
  .swipe-demo > div:last-child {
    transform: translateX(-116px) !important;
    transition: none !important;
    box-shadow: -12px 0 24px rgba(0,0,0,0.06) !important;
  }
  .swipe-demo > div.absolute {
    opacity: 1 !important;
    transform: translateX(0px) !important;
    transition: none !important;
  }
`

const TrashIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
)

const ArchiveIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
        <path d="M10 12h4" />
    </svg>
)

const PolicyRow = () => (
    <div
        style={{
            background: "#fff",
            padding: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
        }}
    >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: "#ccfbf1",
                    color: "#0f766e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 18,
                    flexShrink: 0,
                }}
            >
                Α
            </div>
            <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1c1917" }}>Ασφάλεια Αυτοκινήτου</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78716c" }}>ΕΘΝΙΚΗ Ασφαλιστική · 63708952</p>
            </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1c1917" }}>€104,87</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#78716c" }}>Λήξη 12/03/27</p>
        </div>
    </div>
)

const rightActions = [
    { id: "archive", label: "Αρχείο", icon: ArchiveIcon, color: "amber" as const, onAction: () => undefined },
    { id: "delete", label: "Διαγραφή", icon: TrashIcon, color: "red" as const, onAction: () => undefined },
]

export const Revealed = () => (
    <>
        <style>{revealed}</style>
        <div style={{ width: 460, border: "1px solid #e7e5e4", borderRadius: 20, overflow: "hidden", background: "#f5f5f4" }}>
            <SwipeableCard className="swipe-demo" rightActions={rightActions} onSwipeLeft={() => undefined}>
                <PolicyRow />
            </SwipeableCard>
        </div>
    </>
)

export const AtRest = () => (
    <div style={{ width: 460, border: "1px solid #e7e5e4", borderRadius: 20, overflow: "hidden", background: "#fff" }}>
        <SwipeableCard rightActions={rightActions} onSwipeLeft={() => undefined}>
            <PolicyRow />
        </SwipeableCard>
    </div>
)
