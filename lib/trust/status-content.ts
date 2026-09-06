/**
 * /status — the documented equivalent of a status page (PW-CONTENT-01 Goal 7).
 *
 * HONESTY: the product has no public uptime monitor and publishes no uptime
 * figure. A daily synthetic check runs (app/api/v1/jobs/synthetic-launch-check)
 * but its result is not persisted anywhere a page could read, so nothing here
 * claims a percentage or a "last checked" time. What this page CAN state truly:
 * where the platform runs and where those providers publish their status, and
 * where incidents that affect users are written down (the changelog).
 */
export interface StatusSection {
    id: string
    title: { el: string; en: string }
    body: { el: string; en: string }[]
    links?: { label: { el: string; en: string }; href: string }[]
}

export const STATUS_SECTIONS: StatusSection[] = [
    {
        id: "what-this-is",
        title: { el: "Τι είναι αυτή η σελίδα", en: "What this page is" },
        body: [
            {
                el: "Δεν δημοσιεύουμε ποσοστό διαθεσιμότητας και δεν έχουμε ακόμη δημόσιο σύστημα παρακολούθησης. Αυτή η σελίδα λέει πού τρέχει η υπηρεσία, πού δημοσιεύουν οι πάροχοί της την κατάστασή τους, και πού καταγράφονται τα περιστατικά που σας αφορούν.",
                en: "We publish no uptime percentage and have no public monitoring system yet. This page says where the service runs, where its providers publish their status, and where incidents that affect you are written down.",
            },
        ],
    },
    {
        id: "providers",
        title: { el: "Πού τρέχει η υπηρεσία", en: "Where the service runs" },
        body: [
            {
                el: "Η εφαρμογή φιλοξενείται στη Vercel και η βάση δεδομένων και η αυθεντικοποίηση στη Supabase, στην Ευρωπαϊκή Ένωση. Όταν κάποιος από τους δύο έχει πρόβλημα, το βλέπετε πρώτα στη δική του σελίδα κατάστασης.",
                en: "The app is hosted on Vercel and the database and authentication on Supabase, in the European Union. When either has a problem, you see it first on its own status page.",
            },
        ],
        links: [
            { label: { el: "Κατάσταση Vercel", en: "Vercel status" }, href: "https://www.vercel-status.com/" },
            { label: { el: "Κατάσταση Supabase", en: "Supabase status" }, href: "https://status.supabase.com/" },
        ],
    },
    {
        id: "incidents",
        title: { el: "Περιστατικά", en: "Incidents" },
        body: [
            {
                el: "Ένα περιστατικό που επηρέασε χρήστες — απώλεια δεδομένων, λάθος ευρήματα, μη διαθέσιμη ανάλυση — καταγράφεται στο ημερολόγιο αλλαγών με ημερομηνία και με το τι έγινε για να διορθωθεί. Αν κάτι δεν δουλεύει τώρα, γράψτε μας.",
                en: "An incident that affected users — data loss, wrong findings, analysis unavailable — is recorded in the changelog with its date and what was done about it. If something is not working now, write to us.",
            },
        ],
        links: [
            { label: { el: "Ημερολόγιο αλλαγών", en: "Changelog" }, href: "/changelog" },
            { label: { el: "Επικοινωνία", en: "Contact" }, href: "/contact" },
        ],
    },
]
