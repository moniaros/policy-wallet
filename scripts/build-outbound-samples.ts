/**
 * Build the three outbound documents at their LONGEST, for measurement.
 *
 * Pairs with `scripts/measure-outbound-documents.mjs` (PW-BRIDGE-01 C-07). The
 * fields below are the worst realistic case rather than a pretty one: a full
 * Greek corporate insurer name, a long structured policy number and a long
 * agency name are what actually break a phone-width layout, and a sample built
 * from short fixture values would pass while the real thing clipped.
 *
 * Run: npx tsx scripts/build-outbound-samples.ts <output dir>
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { article14Notice } from "@/lib/email/invite-emails"
import { getWeeklyDigestEmail } from "@/lib/email/templates/weekly-digest"
import { getBaseTemplate } from "@/lib/mail-templates"
import { generateSavingsReportHtml } from "@/lib/services/reports/savings-report"

const dir = process.argv[2]
if (!dir) {
    console.error("usage: npx tsx scripts/build-outbound-samples.ts <output dir>")
    process.exit(2)
}
mkdirSync(dir, { recursive: true })

/** A real Greek insurer's full legal name — the longest identity field in the product. */
const INSURER = "ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΙΣΕΩΝ"
const POLICY_NUMBER = "ΑΣΦ-2026-000123456789-ΟΛΟΚΛΗΡΩΜΕΝΟ"
const AGENCY = "ΠΡΑΚΤΟΡΕΙΟ ΑΣΦΑΛΙΣΕΩΝ ΜΟΝΙΑΡΟΣ ΚΑΙ ΣΥΝΕΡΓΑΤΕΣ ΑΝΩΝΥΜΗ ΕΤΑΙΡΕΙΑ"

const report = generateSavingsReportHtml(
    {
        metadata: { insurerName: INSURER, policyNumber: POLICY_NUMBER, lineOfBusiness: "motor" },
        gapResults: [],
        savingsOpportunities: [],
    },
    new Date().toISOString(),
    "el",
    {
        agencyName: AGENCY,
        logoUrl: null,
        brandColor: "#0f766e",
        website: "https://www.policywallet.gr",
        phone: "+30 210 0000000",
    },
    [],
    null,
    null,
    null,
    {
        kind: "composition",
        lineOfBusiness: "motor",
        catalogueVersion: "sample",
        stale: null,
        coverage: { checked: 6, covered: 4, notCovered: 1, indeterminate: 1, items: [] },
        recording: { checked: 3, recorded: 2, notRecorded: 1, items: [] },
        unclassified: [],
        undeclaredInputs: [],
    } as never,
    { status: "awaiting_confirmation", need: null, missingFields: [] } as never
)

const digest = getWeeklyDigestEmail("el", "ΑΓΓΕΛΙΚΗ ΜΟΝΙΑΡΟΥ-ΠΑΠΑΔΟΠΟΥΛΟΥ", {
    renewingSoon: [{ insurerName: INSURER, lineOfBusiness: "motor", daysUntilExpiry: 12 }],
    newGaps: 3,
    openGaps: 11,
    unreadMessages: 2,
    topRecommendations: [
        {
            title: "Προσθέστε κάλυψη ιδίων ζημιών στο όχημα — μια σύσταση με αρκετά μεγάλο τίτλο",
            urgency: "high",
            estimatedCostEur: 120,
            citation: "Ν. 2496/1997 άρθρο 17",
        },
    ],
    profileCompleteness: 60,
})

const invite = getBaseTemplate({
    title: "Έχετε προσκληθεί για συνεργασία",
    description: `ΑΓΓΕΛΙΚΗ ΜΟΝΙΑΡΟΥ-ΠΑΠΑΔΟΠΟΥΛΟΥ σας προσκάλεσε να αποκτήσετε πρόσβαση στο ασφαλιστήριο ${POLICY_NUMBER} (${INSURER}) στο PolicyWallet. Ανοίξτε τον ασφαλή σύνδεσμο πρόσκλησης για να αποδεχτείτε την πρόσβαση.`,
    actionUrl: "https://www.policywallet.gr/invite/abcdef0123456789abcdef0123456789",
    actionLabel: "Άνοιγμα πρόσκλησης",
    footerText: "Αν δεν περιμένατε αυτή την πρόσκληση, αγνοήστε αυτό το μήνυμα.",
    legalNotice: article14Notice("el"),
})

writeFileSync(join(dir, "report.html"), report)
writeFileSync(join(dir, "digest.html"), digest.html)
writeFileSync(join(dir, "invite.html"), invite)
console.log(`wrote report.html, digest.html, invite.html to ${dir}`)
