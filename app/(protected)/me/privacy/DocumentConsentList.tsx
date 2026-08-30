import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { db } from "@/lib/db"
import { appFlag } from "@/lib/app/flags"
import { documentDisplayLabel } from "@/lib/wallet/document-label"
import { AppSection } from "@/src/design-system/app-layout"
import { DocumentConsentRow } from "./DocumentConsentRow"

/**
 * Per-document AI-consent list (§8.12 / G12): every document with its consent
 * state and a revoke control — the revocability the consent sentence promises.
 * Behind `app.document_consent` (prod DDL owed).
 */
export async function DocumentConsentList() {
    if (!(await appFlag("app.document_consent"))) return null
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const t = getTranslations(lang)
    const documents = await db.policyDocument
        .findMany({
            where: { policy: { ownerUserId: dbUser.id, status: { not: "deleted" } } },
            orderBy: { uploadedAt: "desc" },
            take: 50,
            select: { id: true, documentKind: true, uploadedAt: true, policy: { select: { lineOfBusiness: true, policyNumber: true } } },
        })
        .catch(() => [])
    if (documents.length === 0) return null
    const consents = await db.documentAiConsent
        .findMany({ where: { documentId: { in: documents.map((d) => d.id) } }, select: { documentId: true, revokedAt: true } })
        .catch(() => [])
    const byDoc = new Map(consents.map((c) => [c.documentId, c]))
    return (
        <AppSection id="document-consent" title={t.app.privacyDocs.title}>
            <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{t.app.privacyDocs.intro}</p>
            <ul className="flex flex-col gap-g-1">
                {documents.map((d) => {
                    const consent = byDoc.get(d.id)
                    return (
                        <DocumentConsentRow
                            key={d.id}
                            documentId={d.id}
                            label={documentDisplayLabel({ documentKind: d.documentKind, lineOfBusiness: d.policy.lineOfBusiness, policyNumber: d.policy.policyNumber }, lang)}
                            state={consent?.revokedAt ? "revoked" : consent ? "granted" : "legacy"}
                        />
                    )
                })}
            </ul>
        </AppSection>
    )
}
