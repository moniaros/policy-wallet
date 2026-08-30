"use client"

import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PRIMARY_NAV } from "@/lib/app/navigation"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection } from "@/src/design-system/app-layout"
import { Switch } from "@/src/design-system/switch"
import { PlatformNote } from "@/src/design-system/app"
import { AddPolicyClient } from "@/components/wallet/AddPolicyClient"

/**
 * /add (§8.12): the Article 9 gate stands BEFORE the dropzone. The consent
 * sentence is `common.aiConsentBody` VERBATIM (decision 3 — the product's
 * reviewed wording; the DPO ask is legal-review-queue item 5), with a
 * plain-words line under it. Until the one switch is on, no upload UI exists —
 * fail closed. Every document created through the flow gets its own
 * DocumentAiConsent row written server-side (createPolicy), so consent is
 * per-document and revocable from /me/privacy.
 */
export function AddGate({ insurers, types, hasAccountConsent }: { insurers: { id: string; name: string }[]; types: { id: string; name: string; slug: string }[]; hasAccountConsent: boolean }) {
    const { t } = useLanguage()
    const [agreed, setAgreed] = useState(hasAccountConsent)
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }

    return (
        <>
            <LargeTitleNav title={t.app.add.title} brand={brand} />
            <AppSection id="gate" title={t.app.add.gateTitle}>
                {/* The reviewed sentence, verbatim — never paraphrased (decision 3). */}
                <p className="text-g-app-body text-fg-primary">{t.common.aiConsentBody}</p>
                <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">{t.app.add.gatePlain}</p>
                <div className="mt-g-4">
                    <Switch checked={agreed} onCheckedChange={setAgreed} label={t.app.add.gateSwitch} />
                </div>
                {!agreed && <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">{t.app.add.gateLocked}</p>}
            </AppSection>
            {agreed && (
                <AppSection id="upload">
                    <AddPolicyClient insurers={insurers} types={types} hasAiConsent={agreed} />
                </AppSection>
            )}
            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={t.app.note.body} />
            </AppSection>
        </>
    )
}
