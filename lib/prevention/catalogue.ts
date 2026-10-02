import type { AttentionAreaId } from '@/lib/protection/domains'
import type { Localized, PreventionItem, PreventionPolicy } from './types'

/** Authored actions, versioned separately from model-extracted benefits. No health score or examination schedule. */
export const ACTION_VERSION = '2026-10-02.1'
interface Action { id: string; domains: AttentionAreaId[]; kind: 'action' | 'preparation'; title: Localized; description: Localized; reference: { title: string; url: string } }
export const PREVENTION_ACTIONS: readonly Action[] = [
    { id: 'move', domains: ['health'], kind: 'action', title: { el: 'Χώρος για λίγη κίνηση', en: 'Make room for movement' }, description: { el: 'Επιλέξτε μια μικρή δραστηριότητα που σας είναι άνετη και μια στιγμή της εβδομάδας για να την κάνετε.', en: 'Choose a small activity you feel comfortable with and a moment this week for it.' }, reference: { title: 'WHO · Physical activity', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' } },
    { id: 'tyres', domains: ['mobility'], kind: 'action', title: { el: 'Έλεγχος πίεσης ελαστικών', en: 'Check tyre pressure' }, description: { el: 'Βρείτε τη σωστή πίεση στο εγχειρίδιο ή στην ετικέτα του οχήματος και επιλέξτε πότε θα ελέγξετε τα κρύα ελαστικά.', en: 'Find the recommended pressure in the vehicle manual or label, then choose when to check the cold tyres.' }, reference: { title: 'NHTSA · Tire safety', url: 'https://www.nhtsa.gov/vehicle-safety/tires' } },
    { id: 'alarms', domains: ['residence', 'property'], kind: 'action', title: { el: 'Έλεγχος ανιχνευτή καπνού', en: 'Check a smoke alarm' }, description: { el: 'Εντοπίστε τον ανιχνευτή και τις οδηγίες δοκιμής του κατασκευαστή. Σε κοινόχρηστο σύστημα, συνεννοηθείτε με τον υπεύθυνο.', en: 'Locate the alarm and its manufacturer’s testing instructions. For a shared system, coordinate with the person responsible.' }, reference: { title: 'London Fire Brigade · Smoke alarms', url: 'https://www.london-fire.gov.uk/safety/the-home/smoke-alarms-and-heat-alarms' } },
    { id: 'mfa', domains: ['lifestyle', 'work'], kind: 'action', title: { el: 'Πρόσθετη ασφάλεια σε έναν λογαριασμό', en: 'Add security to one account' }, description: { el: 'Ανοίξτε τις ρυθμίσεις ασφάλειας ενός λογαριασμού και δείτε πώς ενεργοποιείται η επαλήθευση δύο παραγόντων.', en: 'Open one account’s security settings and find how to enable multifactor authentication.' }, reference: { title: 'CISA · Turn on MFA', url: 'https://www.cisa.gov/secure-our-world/turn-mfa' } },
    { id: 'prepare', domains: ['household', 'income', 'debt', 'retirement', 'work', 'lifestyle', 'mobility', 'residence', 'property', 'health'], kind: 'preparation', title: { el: 'Βρείτε τη διαδικασία επικοινωνίας', en: 'Find the contact procedure' }, description: { el: 'Ανοίξτε το ασφαλιστήριο και εντοπίστε πού απευθύνεστε για διευκρινίσεις ή βοήθεια. Αποθηκεύστε μόνο στοιχεία που επιβεβαιώσατε.', en: 'Open the policy and locate the contact for questions or assistance. Save only details you have confirmed.' }, reference: { title: 'NICE · Goals and planning', url: 'https://www.nice.org.uk/guidance/ph49/chapter/Recommendations' } },
]
export function actionsForPolicy(policy: PreventionPolicy): PreventionItem[] {
    if (policy.historical) return []
    return PREVENTION_ACTIONS.filter(a => a.domains.some(d => policy.domains.includes(d))).map(a => ({
        id: `action:${policy.id}:${a.id}`, policyId: policy.id, kind: a.kind, title: a.title, description: a.description,
        domains: a.domains.filter(d => policy.domains.includes(d)), state: 'documented', sourceVersion: ACTION_VERSION,
        healthRelated: a.id === 'move', terms: [], documentId: null, runId: null, extractedAt: null, reference: a.reference,
    }))
}
