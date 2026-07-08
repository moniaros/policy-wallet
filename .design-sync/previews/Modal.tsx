import * as React from "react"
import { Modal, Button } from "policy-wallet"

// Capture note: Modal portals a `position: fixed` backdrop + panel and animates
// them in with framer-motion. In the preview card the page is transformed and
// there's no real viewport, so fixed-centering resolves against an overflowing
// box and the panel clips. This override neutralizes the animation and re-homes
// the chrome into a flex-centered body: the backdrop fills the cell (absolute),
// the panel flows to dead-center (relative) — deterministic and fully visible.
const settled = `
  body {
    position: relative;
    min-height: 560px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  body > div.fixed { transition: none !important; animation: none !important; opacity: 1 !important; }
  body > div.fixed.inset-0 { position: absolute !important; }
  body > div.fixed.left-1\\/2 {
    position: relative !important;
    left: auto !important; top: auto !important;
    /* Tailwind v4 centers via the standalone translate property, not
       transform — both must be cleared so flex centering takes over. */
    translate: none !important;
    transform: none !important;
  }
`

export const Open = () => (
    <>
        <style>{settled}</style>
        <Modal isOpen onClose={() => undefined}>
            <div style={{ padding: 32 }}>
                <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 800 }}>Κοινοποίηση συμβολαίου</h2>
                <p style={{ fontSize: 14, color: "#57534e" }}>
                    Ο σύμβουλός σας θα αποκτήσει πρόσβαση ανάγνωσης στο συμβόλαιο
                    «Ασφάλεια Κατοικίας — 4421870». Μπορείτε να την ανακαλέσετε ανά πάσα στιγμή.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
                    <Button variant="outline">Ακύρωση</Button>
                    <Button>Κοινοποίηση</Button>
                </div>
            </div>
        </Modal>
    </>
)
