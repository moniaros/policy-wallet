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
    preview: 'Προεπισκόπηση',
    upgradeToPlusPreview: 'Plus',
    previewLabels: { download: 'Λήψη', previewUnavailable: '—', downloadFile: 'Λήψη αρχείου' },
}

const docs = [
    { id: 'b', fileName: 'ΑΣΦΑΛΙΣΤΗΡΙΟ (1).pdf', fileUrl: '/b', uploadedAt: '2026-07-04T00:00:00.000Z' },
    { id: 'a', fileName: 'ΑΣΦΑΛΙΣΤΗΡΙΟ.pdf', fileUrl: '/a', uploadedAt: '2025-06-19T00:00:00.000Z' },
]

/**
 * DocumentsCard itself takes `locale` as a prop and reads no context — the same
 * convention InsightCard documents. The modals it renders (UpgradeModal,
 * DocumentPreview) do consume the language context, so the TREE needs the
 * provider even though the card does not.
 */
function renderCard(documents: typeof docs | Array<{ id: string; fileName: string; fileUrl: string }>) {
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
        renderCard([{ id: 'x', fileName: 'scan.pdf', fileUrl: '/x' }])
        expect(screen.getByText('scan.pdf')).toBeTruthy()
    })

    it('keeps stating the format it can actually see, not a guessed document type', () => {
        // There is no schema field for a document's insurance type, so labelling
        // every upload "Contract" would mislabel a receipt or a photo.
        renderCard(docs)
        expect(screen.getAllByText(/Έγγραφο PDF/).length).toBe(2)
    })

    it('is ordered newest-first at the source', () => {
        // The card renders in the order given; the ordering guarantee lives in
        // the page query, so assert it there rather than re-sorting in the UI.
        const page = readFileSync('app/(protected)/wallet/[id]/page.tsx', 'utf-8')
        expect(page).toMatch(/documents: \{\s*orderBy: \{ uploadedAt: 'desc' \}/)
    })
})
