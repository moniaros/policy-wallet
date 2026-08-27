import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Every per-item control in the notification list is a NATIVE button.
 *
 * History, in two acts. The row was once a div that marked-read on click with
 * no keyboard path at all; the first fix made it `role="button"` with a
 * hand-rolled Enter+Space handler (this guard's original subject). The Phase 5
 * rebuild then measured what that pattern costs: a role="button" card WRAPPING
 * the show-more toggle and the view-policy link is invalid ARIA (a control may
 * not contain interactive descendants), and the §11 duplicate-actions collector
 * excluded all 20 nested toggles as `nested-in-command` — unmeasurable because
 * mis-structured. The rebuild dissolved the card-as-button into explicit
 * controls: the unread indicator is itself a real <button> (44×44), opening
 * the full message marks the item read, and native buttons get Enter AND
 * Space activation from the browser — the WAI-ARIA pattern this guard used to
 * hand-check, now impossible to get wrong.
 *
 * So the invariant inverted, and this guard pins the new one:
 *   1. no interactive-wrapper rows — `role="button"` must not return;
 *   2. no hand-rolled key handling — nothing here should need onKeyDown;
 *   3. the per-item mark-read control exists, is a native typed button, and
 *      names itself for screen readers (the dot alone is invisible to them).
 */
const SRC = readFileSync('components/notifications/NotificationsClient.tsx', 'utf-8')

// The invariant governs CODE; the file's comments legitimately narrate the
// pattern this guard forbids (they explain why it was removed). Same
// discipline as policy-sentinels-unrenderable's repo scan.
const CODE = SRC
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\{\s*)?\/\/.*$/, '').replace(/\{\/\*[\s\S]*$/, ''))
    .join('\n')

describe('notification list controls are native buttons, not ARIA re-implementations', () => {
    it('no role="button" wrapper rows (invalid ARIA: interactive descendants)', () => {
        expect(CODE).not.toContain('role="button"')
    })

    it('no hand-rolled keyboard activation — native buttons carry Enter/Space themselves', () => {
        expect(CODE).not.toContain('onKeyDown')
    })

    it('the per-item mark-read control is a typed native button with an accessible name', () => {
        // The unread-dot button: type="button" so it can never submit, and an
        // aria-label because its only visual content is a decorative dot.
        // Located by the label, then the enclosing <button ...> opening tag is
        // checked — attribute order and multi-line handlers must not matter.
        const labelAt = CODE.indexOf('aria-label={t.notifications.markRead}')
        expect(labelAt, 'unread mark-read button with aria-label not found').toBeGreaterThan(-1)
        const tagStart = CODE.lastIndexOf('<button', labelAt)
        expect(tagStart, 'aria-label is not inside a <button>').toBeGreaterThan(-1)
        const openingTag = CODE.slice(tagStart, CODE.indexOf('>', labelAt) + 1)
        expect(openingTag).toContain('type="button"')
    })

    it('expanding the full message also marks the item read', () => {
        expect(SRC).toMatch(/onFirstExpand=\{\(\) => void handleMarkRead\(/)
    })
})
