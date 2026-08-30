"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button, Tag } from "@/src/design-system/primitives"
import { revokeDocumentConsent } from "./consent-actions"

export function DocumentConsentRow({ documentId, label, state }: { documentId: string; label: string; state: "granted" | "legacy" | "revoked" }) {
    const { t } = useLanguage()
    const router = useRouter()
    const [pending, start] = useTransition()
    const copy = t.app.privacyDocs
    return (
        <li className="flex min-h-14 items-center justify-between gap-g-3 rounded-g-control bg-surface-base px-g-3 py-g-2">
            <span className="min-w-0 flex-1">
                <span className="line-clamp-1 block text-g-app-body-sm font-medium text-fg-primary">{label}</span>
                <span className="text-g-app-caption text-fg-faint">{copy[state]}</span>
            </span>
            {state !== "revoked" ? (
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                        start(async () => {
                            const r = await revokeDocumentConsent({ documentId })
                            if (r.ok) { toast.success(copy.revoked); router.refresh() } else toast.error(copy.failed)
                        })
                    }
                >
                    {copy.revoke}
                </Button>
            ) : (
                <Tag>{copy.revokedTag}</Tag>
            )}
        </li>
    )
}
