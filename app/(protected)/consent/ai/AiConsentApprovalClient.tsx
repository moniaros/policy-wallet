"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AiConsentModal } from "@/components/ui/AiConsentModal"
import { useLanguage } from "@/contexts/LanguageContext"

export function AiConsentApprovalClient() {
    const router = useRouter()
    const { t } = useLanguage()

    return (
        <div className="min-h-[60vh]">
            <AiConsentModal
                isOpen
                onClose={() => router.push("/dashboard")}
                onConsented={() => {
                    // Confirm the action was recorded — the standalone approval page
                    // redirects to the dashboard, so (unlike the in-flow consenters
                    // that start analysis) this needs an explicit "recorded" toast,
                    // not the modal title.
                    toast.success(t.common.aiConsentSaved)
                    router.push("/dashboard")
                }}
                source="agent_consent_request"
            />
        </div>
    )
}
