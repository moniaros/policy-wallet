import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The policy-detail documents list renders each row as a download `<a>` plus a
 * "preview" control. That control is a real `<button>` (DocumentPreviewButton),
 * so it must be a SIBLING of the anchor, never a child: a `<button>` nested
 * inside an `<a>` is invalid HTML (an anchor may have no interactive content
 * descendant) and a screen-reader anti-pattern the rest of the app avoids. The
 * click was already stopPropagation-guarded, but the nesting itself is the bug.
 *
 * It also guards that BOTH branches of DocumentPreviewButton expose an
 * aria-label — the locked branch always did; the unlocked (icon-only) branch
 * previously carried only `title`, which is not reliably announced on keyboard
 * focus.
 */
const CARD = readFileSync('components/wallet/policy-detail/DocumentsCard.tsx', 'utf-8')
const BTN = readFileSync('components/wallet/DocumentPreview.tsx', 'utf-8')

describe('DocumentsCard preview button is not nested inside the download anchor', () => {
    it('renders DocumentPreviewButton as a sibling of the <a>, not a descendant', () => {
        // Guard is not vacuous: the button is actually rendered here.
        expect(CARD).toContain('DocumentPreviewButton')

        const anchorOpen = CARD.search(/<a[\s>]/)
        const anchorClose = CARD.indexOf('</a>')
        expect(anchorOpen).toBeGreaterThan(-1)
        expect(anchorClose).toBeGreaterThan(anchorOpen)

        // Everything the download anchor encloses must NOT include the button.
        const anchorInner = CARD.slice(anchorOpen, anchorClose)
        expect(anchorInner).not.toContain('DocumentPreviewButton')
    })
})

describe('DocumentPreviewButton exposes an accessible name in both states', () => {
    it('the locked and unlocked buttons each carry an aria-label', () => {
        expect(BTN).toContain('aria-label={lockedLabel}')
        expect(BTN).toContain('aria-label={label}')
    })
})
