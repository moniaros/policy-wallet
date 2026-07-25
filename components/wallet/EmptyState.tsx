"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { motion } from "framer-motion"
import { Wallet, Car, Home } from "lucide-react"
import { EmptyState as SharedEmptyState, PolicyPreviewRow } from "@/components/ui/EmptyState"
import { CarIcon, DocumentIcon, HeartIcon, HomeIcon, PlaneIcon } from "@/components/icons/PolicyIcons"

interface EmptyStateProps {
    onAddManually?: () => void
    onUploadDocument?: () => void
    viaAgentInvite?: boolean
}

export function EmptyState({ onAddManually, onUploadDocument }: EmptyStateProps) {
    const { t } = useLanguage()
    const copy = t.wallet.emptyState

    // The benefit line sells uploading ("Upload a PDF and in under 30 seconds the
    // AI extracts…"), so the single primary CTA must open the UPLOAD flow — not
    // the manual handler it was wired to (which also left onUploadDocument, passed
    // by the parent, silently unused). Fall back to onAddManually only if no
    // upload handler was supplied.
    const onPrimary = onUploadDocument ?? onAddManually

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-xl"
            >
                <SharedEmptyState
                    icon={Wallet}
                    headline={copy.headline}
                    description={copy.benefit}
                    cta={{ label: copy.ctaPrimary, onClick: onPrimary }}
                    previewLabel={copy.previewLabel}
                    preview={
                        <>
                            <PolicyPreviewRow
                                icon={Car}
                                name={copy.exampleMotor}
                                meta={copy.exampleMotorMeta}
                                statusLabel={copy.exampleMotorStatus}
                            />
                            <PolicyPreviewRow
                                icon={Home}
                                name={copy.exampleHome}
                                meta={copy.exampleHomeMeta}
                                statusLabel={copy.exampleHomeStatus}
                                warn
                            />
                        </>
                    }
                    trust={copy.trust}
                    secondary={
                        <div className="pt-2">
                            <p className="mb-4 text-kicker font-black uppercase tracking-widest text-black/55 dark:text-white/55">
                                {copy.supportedCategories}
                            </p>
                            <div className="flex flex-wrap justify-center gap-5 opacity-60 grayscale transition-all duration-700 hover:grayscale-0">
                                {[CarIcon, HeartIcon, HomeIcon, DocumentIcon, PlaneIcon].map((Icon, i) => (
                                    <div key={i} className="h-7 w-7 text-black/70 transition-transform hover:scale-125 dark:text-white/70">
                                        <Icon className="h-7 w-7" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    }
                />
            </motion.div>
        </div>
    )
}
