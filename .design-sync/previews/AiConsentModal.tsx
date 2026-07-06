import * as React from "react"
import { AiConsentModal } from "policy-wallet"

// AiConsentModal renders through the shared Modal, which portals a
// `position: fixed` backdrop + panel to document.body and animates them with
// framer-motion. In a preview card the page is transformed and there is no real
// viewport, so fixed-centering resolves against an overflowing box and the panel
// clips. This override neutralizes the animation and re-homes the chrome into a
// flex-centered body: the backdrop fills the cell (absolute), the panel flows to
// dead-center (relative). Tailwind v4 centers via the standalone `translate`
// property, not `transform`, so both must be cleared.
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
    translate: none !important;
    transform: none !important;
  }
`

export const Consent = () => (
    <>
        <style>{settled}</style>
        <AiConsentModal
            isOpen
            onClose={() => undefined}
            onConsented={() => undefined}
            source="wallet_upload"
        />
    </>
)
