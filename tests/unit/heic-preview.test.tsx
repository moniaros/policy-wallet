import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { isAcceptedImageFile, isBrowserRenderableImage } from '@/lib/security/file-upload'
import { DocumentPreview } from '@/components/wallet/DocumentPreview'

const labels = { download: 'Λήψη', previewUnavailable: 'Η προεπισκόπηση δεν είναι διαθέσιμη', downloadFile: 'Λήψη αρχείου' }

/**
 * HEIC is an accepted upload format (iPhones default to it) and IS an image — but
 * Chrome/Firefox/Edge cannot paint it in an <img>. Treating "accepted image" as
 * "previewable image" showed a broken image with no escape. Previewability is the
 * narrower question.
 */
describe('HEIC is an image but not a browser-renderable one', () => {
    it('isAcceptedImageFile accepts HEIC (it is a valid upload)', () => {
        expect(isAcceptedImageFile('photo.heic')).toBe(true)
    })

    it('isBrowserRenderableImage rejects HEIC but accepts jpg/png/webp', () => {
        expect(isBrowserRenderableImage('photo.heic')).toBe(false)
        expect(isBrowserRenderableImage('photo.jpg')).toBe(true)
        expect(isBrowserRenderableImage('photo.jpeg')).toBe(true)
        expect(isBrowserRenderableImage('photo.png')).toBe(true)
        expect(isBrowserRenderableImage('photo.webp')).toBe(true)
        expect(isBrowserRenderableImage('doc.pdf')).toBe(false)
    })
})

describe('the preview modal does not render a broken HEIC image', () => {
    // Fixtures carry a GENERATED label and a real mimeType, because that is
    // what the database holds now: the user's file name is never stored, so
    // the preview cannot and must not decide anything from an extension.
    it('falls back to download-only for a HEIC file', () => {
        render(
            <DocumentPreview isOpen document={{ fileName: 'Έγγραφο σε επεξεργασία', mimeType: 'image/heic', fileUrl: '/d/1' }} labels={labels} onClose={() => {}} />
        )
        // No <img> (which the browser could not paint) …
        expect(document.body.querySelector('img')).toBeNull()
        // … and the download fallback is offered instead.
        expect(document.body.textContent).toContain(labels.previewUnavailable)
        expect(document.body.querySelector('a[href="/d/1"]')).toBeTruthy()
    })

    it('still renders a real <img> for a JPG', () => {
        render(
            <DocumentPreview isOpen document={{ fileName: 'Έγγραφο σε επεξεργασία', mimeType: 'image/jpeg', fileUrl: '/d/2' }} labels={labels} onClose={() => {}} />
        )
        const img = document.body.querySelector('img')
        expect(img).toBeTruthy()
        expect(img?.getAttribute('src')).toBe('/d/2')
    })

    it('renders a PDF in an iframe', () => {
        render(
            <DocumentPreview isOpen document={{ fileName: 'Ασφαλιστήριο Αυτοκίνητο · 64504715', mimeType: 'application/pdf', fileUrl: '/d/3' }} labels={labels} onClose={() => {}} />
        )
        expect(document.body.querySelector('iframe')).toBeTruthy()
    })
})
