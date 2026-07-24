import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { computePolicyAccess } from '@/lib/policy-access'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const policy = { id: 'pol-1', ownerUserId: 'owner', createdByUserId: 'owner' }
const grantee = { id: 'other', roles: 'policyholder' }
const grant = (permissions: string) => [{ scope: 'policy:pol-1', permissions, status: 'active' }]

/**
 * The share dialog offers two choices. «Επεξεργασία» / "Can Edit" was subtitled
 * «Πλήρης διαχείριση» / "Full management" — the name of the MANAGE level, which
 * the dialog never offers and which is the only one that permits deletion.
 *
 * So the owner was asked to consent to something described as more than it is,
 * under the name of a level that would have been more. Consent to share
 * insurance records has to be specific about what it hands over.
 */
describe('what "edit" actually grants', () => {
    it('lets the grantee correct data and run analysis', () => {
        const access = computePolicyAccess({ policy, viewer: grantee, grants: grant('edit'), relationship: null })
        expect(access.canRead).toBe(true)
        expect(access.canWrite).toBe(true)
        expect(access.canAnalyze).toBe(true)
    })

    it('does NOT let them delete the policy — that needs "manage"', () => {
        expect(
            computePolicyAccess({ policy, viewer: grantee, grants: grant('edit'), relationship: null }).canDelete
        ).toBe(false)
        expect(
            computePolicyAccess({ policy, viewer: grantee, grants: grant('manage'), relationship: null }).canDelete
        ).toBe(true)
    })

    it('and "view" grants reading only', () => {
        const access = computePolicyAccess({ policy, viewer: grantee, grants: grant('view'), relationship: null })
        expect(access.canRead).toBe(true)
        expect(access.canWrite).toBe(false)
        expect(access.canDelete).toBe(false)
    })
})

describe('the dialog describes those grants accurately', () => {
    const PANEL = strip(readFileSync('components/wallet/CollaborationPanel.tsx', 'utf-8'))

    it('no longer calls the edit grant "full management"', () => {
        expect(el.wallet.collaboration.fullManagement).not.toMatch(/Πλήρης διαχείριση/)
        expect(en.wallet.collaboration.fullManagement).not.toMatch(/full management/i)
    })

    it('says what the edit grant does do', () => {
        expect(el.wallet.collaboration.fullManagement).toMatch(/Διορθώνει στοιχεία/)
        expect(en.wallet.collaboration.fullManagement).toMatch(/Corrects details/)
    })

    it('states that neither option permits deletion, matching canDelete', () => {
        expect(el.wallet.collaboration.permissionsDeleteNote).toMatch(/δεν επιτρέπει διαγραφή/)
        expect(en.wallet.collaboration.permissionsDeleteNote).toMatch(/Neither option allows deleting/)
        expect(el.wallet.collaboration.permissionsDeleteNote).not.toMatch(/επιτρέπει τη διαγραφή του ασφαλιστηρίου\./)
    })

    it('tells the owner the access is revocable', () => {
        expect(el.wallet.collaboration.permissionsDeleteNote).toMatch(/ανακαλέσετε/)
        expect(en.wallet.collaboration.permissionsDeleteNote).toMatch(/revoke access at any time/)
    })

    it('renders the note, and the fallback copy carries it too', () => {
        expect(PANEL).toMatch(/\{copy\.permissionsDeleteNote\}/)
        expect(PANEL).toMatch(/permissionsDeleteNote:\s*\n?\s*"Neither option allows deleting/)
    })

    it('the read-only subtitle says what is visible', () => {
        expect(el.wallet.collaboration.readOnlyAccess).toMatch(/έγγραφα/)
        expect(en.wallet.collaboration.readOnlyAccess).toMatch(/documents/)
    })
})
