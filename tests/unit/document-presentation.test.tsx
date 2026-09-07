import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { DocumentsCard } from '@/components/wallet/policy-detail/DocumentsCard'
import { LanguageProvider } from '@/contexts/LanguageContext'

const copy = {
    documentsArea: 'Έγγραφα',
    noDocuments: 'Κανένα αρχείο',
    documentFormatPdf: 'Έγγραφο PDF',
    documentFormatImage: 'Εικόνα',
    documentFormatOther: 'Αρχείο',
    documentKindLabels: {
        policy_schedule: 'Πίνακας ασφαλιστηρίου',
        renewal_notice: 'Ειδοποίηση ανανέωσης',
        other: 'Έγγραφο',
    },
    preview: 'Προεπισκόπηση',
    upgradeToPlusPreview: 'Plus',
    previewLabels: { download: 'Λήψη', previewUnavailable: '—', downloadFile: 'Λήψη αρχείου' },
}

// No fileUrl: the storage locator is no longer sent to the browser at all.
const docs = [
    { id: 'b', fileName: 'ΑΣΦΑΛΙΣΤΗΡΙΟ (1).pdf', mimeType: 'application/pdf', uploadedAt: '2026-07-04T00:00:00.000Z' },
    { id: 'a', fileName: 'ΑΣΦΑΛΙΣΤΗΡΙΟ.pdf', mimeType: 'application/pdf', uploadedAt: '2025-06-19T00:00:00.000Z' },
]

/**
 * DocumentsCard itself takes `locale` as a prop and reads no context — the same
 * convention InsightCard documents. The modals it renders (UpgradeModal,
 * DocumentPreview) do consume the language context, so the TREE needs the
 * provider even though the card does not.
 */
function renderCard(
    documents: Array<{ id: string; fileName: string; mimeType?: string | null; uploadedAt?: string; documentKind?: string | null }>
) {
    return render(
        <LanguageProvider>
            <DocumentsCard policyId="p1" documents={documents} isFreeTier={false} copy={copy} locale="el" />
        </LanguageProvider>
    )
}

/**
 * A policy accumulates documents over its life — the original schedule, a
 * renewal endorsement, an amended schedule after a mid-term change — and insurer
 * PDFs routinely arrive with near-identical names ("ΑΣΦΑΛΙΣΤΗΡΙΟ.pdf",
 * "ΑΣΦΑΛΙΣΤΗΡΙΟ (1).pdf").
 *
 * The page already loaded `uploadedAt` and ordered documents newest-first, and
 * the date was already in the payload — the card simply never rendered it. So
 * the reader saw two identical-looking rows with no way to tell which one is the
 * policy currently in force.
 */
describe('document presentation', () => {
    it('dates each document so near-identical names can be told apart', () => {
        renderCard(docs)
        expect(screen.getAllByText(/2026|2025/).length).toBeGreaterThanOrEqual(2)
    })

    it('marks the date up as a machine-readable time element', () => {
        const { container } = renderCard(docs)
        const els = container.querySelectorAll('time[datetime]')
        expect(els.length).toBe(2)
        expect(els[0].getAttribute('datetime')).toBe('2026-07-04T00:00:00.000Z')
    })

    it('still renders when a document has no date (rows predating the field)', () => {
        renderCard([{ id: 'x', fileName: 'scan.pdf', mimeType: 'application/pdf' }])
        expect(screen.getByText('scan.pdf')).toBeTruthy()
    })

    it('falls back to the file format when nothing recorded what the document IS', () => {
        // Unchanged rule: never label a document with a type we do not have.
        // Every legacy row is in this state, so it stays the default.
        renderCard(docs)
        expect(screen.getAllByText(/Έγγραφο PDF/).length).toBe(2)
    })

    it('names the document type when the classifier recorded one', () => {
        // `documentKind` comes from the same classifier that decides whether an
        // upload is a policy at all, so this is evidence, not a guess — which is
        // why the card may now say it.
        renderCard([
            { id: 's', fileName: 'schedule.pdf', mimeType: 'application/pdf', documentKind: 'policy_schedule' },
            { id: 'r', fileName: 'renewal.pdf', mimeType: 'application/pdf', documentKind: 'renewal_notice' },
        ])
        expect(screen.getByText('Πίνακας ασφαλιστηρίου')).toBeTruthy()
        expect(screen.getByText('Ειδοποίηση ανανέωσης')).toBeTruthy()
        expect(screen.queryByText(/Έγγραφο PDF/)).toBeNull()
    })

    it('falls back rather than printing a raw enum for an unknown kind', () => {
        renderCard([{ id: 'u', fileName: 'odd.pdf', mimeType: 'application/pdf', documentKind: 'something_new' }])
        expect(screen.getByText(/Έγγραφο PDF/)).toBeTruthy()
        expect(screen.queryByText('something_new')).toBeNull()
    })

    it('links every document through the authorized endpoint, never a storage URL', () => {
        // The card is the one place a document is opened from. Its href must be
        // the id-based API route, which re-checks access and signs a short-lived
        // URL; a storage locator must never appear in the markup.
        const { container } = renderCard(docs)
        // In-page anchors (the heading's document-count door, «#documents») open
        // nothing; the rule is about the links that open a DOCUMENT.
        const links = Array.from(container.querySelectorAll('a[href]')).filter((a) => !a.getAttribute('href')!.startsWith('#'))
        expect(links.length).toBeGreaterThan(0)
        for (const link of links) {
            expect(link.getAttribute('href')).toMatch(
                /^\/api\/v1\/policies\/p1\/documents\/[a-z0-9]+$/i
            )
        }
        expect(container.innerHTML).not.toContain('supabase.co')
        expect(container.innerHTML).not.toContain('/storage/v1/object')
    })

    it('is ordered newest-first at the source', () => {
        // The card renders in the order given; the ordering guarantee lives in
        // the page query, so assert it there rather than re-sorting in the UI.
        const page = readFileSync('app/(protected)/wallet/[id]/page.tsx', 'utf-8')
        expect(page).toMatch(/documents: \{\s*orderBy: \{ uploadedAt: 'desc' \}/)
    })
})
