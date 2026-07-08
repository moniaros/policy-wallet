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
                onClose={() => router.push("/home")}
                onConsented={() => {
                    toast.success(t.common.aiConsentTitle)
                    router.push("/home")
                }}
                source="agent_consent_request"
            />
        </div>
    )
}
