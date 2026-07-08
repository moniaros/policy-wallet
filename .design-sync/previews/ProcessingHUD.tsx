import * as React from "react"
import { ProcessingHUD } from "policy-wallet"

// ProcessingHUD is a full-screen `position: fixed inset-0` overlay (not portaled)
// that mounts inside the preview's `#r0.ds-single` container. That container has
// `transform: translateZ(0)`, which makes it the containing block for fixed
// descendants — so the overlay would size to the (zero-height) mount box and
// blank. Neutralize that transform, give the body a real height, and demote the
// fixed overlay to `absolute` so it fills the card and centers its own panel.
// The capture harness pins a fixed clock, so framer-motion's enter animations
// never advance past their `initial` frame (opacity 0, scaled/offset panel) and
// the HUD renders blank. Force every layer visible and un-transformed.
const settled = `
  body { position: relative; min-height: 560px; }
  .ds-single { transform: none !important; }
  div.fixed.inset-0 {
    position: absolute !important;
    opacity: 1 !important;
    transition: none !important;
    animation: none !important;
  }
  div.fixed.inset-0 * {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
`

export const Analyzing = () => (
    <>
        <style>{settled}</style>
        <ProcessingHUD isVisible message="Ανάλυση συμβολαίου «Ασφάλεια Κατοικίας — 4421870»..." />
    </>
)
