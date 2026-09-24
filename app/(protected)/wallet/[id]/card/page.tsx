import { notFound } from "next/navigation"
import Link from "next/link"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getPolicyAccess } from "@/lib/policy-access"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { getTranslations } from "@/lib/i18n"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"
import { displayInsurerName, policyLabel } from "@/lib/wallet/policy-identity"
import { offlineCardRows } from "@/lib/wallet/offline-card"
import { loadCatalogueInsurers, matchVerifiedCallCentre } from "@/lib/wallet/verified-insurer-contact"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { formatDate } from "@/lib/i18n/format"
import { ShareCardButton } from "./ShareCardButton"

/**
 * Spec v2 §15 «digital card»: one screen with what a person shows at the
 * roadside or the clinic — the policy's identity, its period, and the numbers
 * the document itself states. Printable and shareable; nothing rendered here
 * that the policy page does not already show, and identity only through
 * lib/wallet/policy-identity.
 */
export default async function DigitalCardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()
    const access = await getPolicyAccess(id, { id: dbUser.id, roles: dbUser.roles })
    if (!access.exists || !access.canRead) notFound()

    const policy = await db.policy.findUnique({
        where: { id },
        select: { id: true, insurerName: true, policyNumber: true, lineOfBusiness: true, status: true, endDate: true, acordData: true, nickname: true },
    })
    if (!policy) notFound()

    const language = resolveUserLanguage(dbUser.preferredLanguage)
    const t = getTranslations(language)
    const copy = t.wallet.policyCard
    const lifecycle = resolvePolicyLifecycle(policy)
    const branch = normalizeBranch(policy.lineOfBusiness)
    const catalogue = await loadCatalogueInsurers()
    const phones = offlineCardRows([policy], (name) => matchVerifiedCallCentre(catalogue, name))[0]?.phones ?? []
    const endDate = lifecycle.endDate ? formatDate(lifecycle.endDate, language) : null

    return (
        <main className="mx-auto w-full max-w-md px-4 py-6 print:max-w-none">
            <div className="pw-card pw-pad" data-fact="policy.digitalCard">
                <p className="pw-kicker">{copy.title}</p>
                <h1 className="mt-1 text-title font-semibold text-foreground">{policy.nickname || policyLabel(policy, branch.label[language])}</h1>
                <p className="text-sm text-muted-foreground">{displayInsurerName(policy.insurerName) ?? copy.unknownInsurer} · {branch.label[language]}</p>
                {endDate && <p className="mt-2 text-sm text-foreground">{copy.validUntil.replace("{date}", endDate)}</p>}
                {phones.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                        {phones.map((p) => (
                            <li key={p.kind}>
                                <a href={`tel:${p.number.replace(/\s+/g, "")}`} className="pw-soft-button inline-flex w-full justify-between">
                                    <span>{t.offline.kinds[p.kind]}</span>
                                    <span className="font-semibold">{p.number}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-4 text-sm text-muted-foreground">{copy.noNumbers}</p>
                )}
                <p className="mt-4 text-caption text-muted-foreground">{copy.numbersNote}</p>
                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                    <ShareCardButton title={copy.title} copy={{ share: copy.share, print: copy.print, copied: copy.copied }} />
                    <Link href={`/wallet/${policy.id}`} className="pw-soft-button">{copy.back}</Link>
                </div>
            </div>
        </main>
    )
}
