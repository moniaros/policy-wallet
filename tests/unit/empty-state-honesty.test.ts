import { describe, it, expect } from 'vitest'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/**
 * The agent's view of a client's policies is filtered by
 * `agentPolicyVisibilityWhere`: policies they uploaded, plus policies the owner
 * explicitly granted. That boundary is deliberate — a customer relationship is
 * not consent to read someone's portfolio — but an empty list therefore means
 * "none you may see", not "none".
 *
 * The empty states asserted the second. «Δεν υπάρχουν ενεργά ασφαλιστήρια» /
 * "No active policies yet", followed by "Once this client has active cover…" —
 * a statement about the client's insurance derived from a permissions artefact.
 * An agent could ring a client and tell them they have nothing in force while
 * the client holds five policies the agent was never granted.
 *
 * The renewal one went further: "Nothing is expiring in the next 90 days —
 * you're all caught up." An affirmative all-clear built on a partial view.
 */
describe('empty states caused by a permission boundary say so', () => {
    it('the client overview does not claim the client has no cover', () => {
        for (const t of [el, en]) {
            const s = t.emptyStates.overviewPolicies
            expect(s.headline).not.toMatch(/ενεργά ασφαλιστήρια ακόμα|No active policies/i)
            expect(s.description).not.toMatch(/Μόλις ο πελάτης αποκτήσει|Once this client has active cover/i)
        }
    })

    it('and says what the list actually contains', () => {
        expect(el.emptyStates.overviewPolicies.description).toMatch(/ανεβάσατε εσείς/)
        expect(el.emptyStates.overviewPolicies.description).toMatch(/Μπορεί να έχει και άλλα/)
        expect(en.emptyStates.overviewPolicies.description).toMatch(/only the policies you uploaded/)
        expect(en.emptyStates.overviewPolicies.description).toMatch(/They may hold others/)
    })

    it('the policies tab points at the real next action — asking for access', () => {
        expect(el.emptyStates.clientPolicies.description).toMatch(/ζητήστε πρόσβαση/)
        expect(en.emptyStates.clientPolicies.description).toMatch(/ask for access/)
        expect(en.emptyStates.clientPolicies.description).toMatch(/not their whole portfolio/)
    })

    it('the renewal all-clear no longer claims to be one', () => {
        const elDesc = el.emptyStates.insights.renewalsDesc
        const enDesc = en.emptyStates.insights.renewalsDesc
        expect(elDesc).not.toMatch(/πλήρως ενημερωμένοι/)
        expect(enDesc).not.toMatch(/all caught up/i)
        // and it names both reasons a policy can be missing from the window
        expect(elDesc).toMatch(/χωρίς πρόσβαση/)
        expect(elDesc).toMatch(/αναγνώσιμη ημερομηνία λήξης/)
        expect(enDesc).toMatch(/no access to/)
        expect(enDesc).toMatch(/no readable end date/)
    })

    it('bounds the claim to what the agent can see', () => {
        expect(el.emptyStates.insights.renewalsDesc).toMatch(/ασφαλιστήρια που βλέπετε/)
        expect(en.emptyStates.insights.renewalsDesc).toMatch(/policies you can see/)
    })
})

describe('example data in empty states is presentable', () => {
    it('capitalises the sample Greek surname', () => {
        // «Μαρία παπαδοπούλου» — lowercase surname, on the first screen an agent
        // sees before they have any clients.
        expect(el.emptyStates.clients.exampleName).toBe('Μαρία Παπαδοπούλου')
        expect(en.emptyStates.clients.exampleName).toBe('Maria Papadopoulou')
    })

    it('no example name starts a word in lower case', () => {
        for (const name of [el.emptyStates.clients.exampleName, en.emptyStates.clients.exampleName]) {
            for (const word of name.split(' ')) {
                expect(word[0], `"${name}"`).toBe(word[0].toLocaleUpperCase('el-GR'))
            }
        }
    })
})
