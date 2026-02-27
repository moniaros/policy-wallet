"use client"

import { useMemo, useState } from "react"
import type { PolicyWalletProps } from "./types"
import { MobilePolicyCard } from "./MobilePolicyCard"
import { GapRecommendationCard, type GapRecommendation } from "../gaps/GapRecommendationCard"
import { useLanguage } from "@/contexts/LanguageContext"
import { hapticFeedback } from "@/utils/haptic"
import { PlusIcon, ChatIcon, TrendingUpIcon, DocumentIcon } from "@/components/icons/PolicyIcons"
import { getRoleCopy } from "@/lib/i18n/role-copy"

export function MobileWalletView({
    policies,
    onViewPolicy,
    onAddManually,
    onShareWithAgent,
    onViewDocuments,
}: PolicyWalletProps) {
    const { language } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const [currentPolicyIndex, setCurrentPolicyIndex] = useState(0)
    const [viewMode, setViewMode] = useState<"hero" | "list">("hero")

    const primaryPolicy = useMemo(() => {
        const activePolicies = policies.filter((p) => p.status === "active")
        return activePolicies[currentPolicyIndex] || policies[currentPolicyIndex] || policies[0]
    }, [policies, currentPolicyIndex])

    const gapRecommendations = useMemo((): GapRecommendation[] => {
        const gaps: GapRecommendation[] = []
        const policyTypes = new Set(policies.map((p) => p.lineOfBusiness))

        if (!policyTypes.has("health")) {
            gaps.push({
                gapType: "missing_health",
                priority: "high",
                title: roleCopy.walletDashboard.healthTitle,
                description: roleCopy.walletDashboard.healthDescription,
                estimatedCost: 800,
            })
        }
        if (!policyTypes.has("home")) {
            gaps.push({
                gapType: "missing_home",
                priority: "high",
                title: roleCopy.walletDashboard.homeTitle,
                description: roleCopy.walletDashboard.homeDescription,
                estimatedCost: 300,
            })
        }
        if (!policyTypes.has("life")) {
            gaps.push({
                gapType: "missing_life",
                priority: "medium",
                title: roleCopy.walletDashboard.lifeTitle,
                description: roleCopy.walletDashboard.lifeDescription,
                estimatedCost: 500,
            })
        }
        if (policyTypes.has("home") && !policyTypes.has("pet")) {
            gaps.push({
                gapType: "missing_pet",
                priority: "low",
                title: roleCopy.walletDashboard.petTitle,
                description: roleCopy.walletDashboard.petDescription,
                estimatedCost: 200,
            })
        }
        return gaps.slice(0, 3)
    }, [policies, roleCopy])

    if (policies.length === 0) {
        return (
            <div className="min-h-screen bg-white dark:bg-black p-4">
                <div className="max-w-md mx-auto pt-20 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-black/5 dark:bg-black rounded-full flex items-center justify-center border border-black/10 dark:border-white/15">
                        <DocumentIcon className="w-10 h-10 text-black/45 dark:text-white/60" />
                    </div>
                    <h2 className="text-2xl font-black text-black dark:text-white mb-3">{roleCopy.walletDashboard.emptyWalletTitle}</h2>
                    <p className="text-black/65 dark:text-white/70 mb-6">{roleCopy.walletDashboard.emptyWalletDescription}</p>
                    <button
                        onClick={onAddManually}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#1FDC86] hover:bg-[#19b870] text-black font-bold rounded-2xl transition-all active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        {roleCopy.walletDashboard.addFirstPolicy}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="bg-white dark:bg-black border-b border-black/10 dark:border-white/15 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-black dark:text-white">PolicyWallet</h1>
                        <p className="text-sm text-black/55 dark:text-white/65">{roleCopy.walletDashboard.noPoliciesYet}</p>
                    </div>
                    <button
                        onClick={onAddManually}
                        className="w-11 h-11 flex items-center justify-center bg-[#1FDC86] hover:bg-[#19b870] text-black rounded-full transition-all active:scale-[0.95]"
                        aria-label={roleCopy.walletDashboard.addPolicyAria}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-black/65 dark:text-white/70">{roleCopy.walletDashboard.policiesCount(policies.length)}</p>
                    <button
                        onClick={() => setViewMode(viewMode === "hero" ? "list" : "hero")}
                        className="text-sm font-bold text-[#1FDC86] hover:underline"
                    >
                        {viewMode === "hero" ? roleCopy.walletDashboard.viewList : roleCopy.walletDashboard.viewCard}
                    </button>
                </div>

                {viewMode === "hero" && primaryPolicy && (
                    <div>
                        <MobilePolicyCard
                            policy={primaryPolicy}
                            variant="hero"
                            onView={() => onViewPolicy?.(primaryPolicy.id)}
                            onShare={() => onShareWithAgent?.(primaryPolicy.id)}
                            onViewDocuments={() => onViewDocuments?.(primaryPolicy.id)}
                        />
                        {policies.length > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {policies.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            hapticFeedback.swipe()
                                            setCurrentPolicyIndex(index)
                                        }}
                                        className={`h-2 rounded-full transition-all ${index === currentPolicyIndex ? "w-6 bg-[#1FDC86]" : "w-2 bg-black/20 dark:bg-white/25"}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {viewMode === "list" && (
                    <div className="space-y-3">
                        {policies.map((policy) => (
                            <MobilePolicyCard
                                key={policy.id}
                                policy={policy}
                                variant="compact"
                                onView={() => onViewPolicy?.(policy.id)}
                                onShare={() => onShareWithAgent?.(policy.id)}
                                onViewDocuments={() => onViewDocuments?.(policy.id)}
                            />
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={onAddManually}
                        className="flex flex-col items-center gap-2 p-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:bg-[#111111] dark:hover:bg-white/90 transition-all active:scale-[0.98]"
                        aria-label={roleCopy.walletDashboard.addPolicyAria}
                    >
                        <div className="w-12 h-12 bg-white/10 dark:bg-black/10 rounded-full flex items-center justify-center">
                            <PlusIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">{roleCopy.walletDashboard.addFirstPolicy}</span>
                    </button>

                    <button
                        onClick={() => onShareWithAgent?.(primaryPolicy?.id || "")}
                        className="flex flex-col items-center gap-2 p-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:bg-[#111111] dark:hover:bg-white/90 transition-all active:scale-[0.98]"
                        aria-label={roleCopy.walletDashboard.agentChat}
                    >
                        <div className="w-12 h-12 bg-white/10 dark:bg-black/10 rounded-full flex items-center justify-center">
                            <ChatIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">{roleCopy.walletDashboard.agentChat}</span>
                    </button>

                    <button
                        className="flex flex-col items-center gap-2 p-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:bg-[#111111] dark:hover:bg-white/90 transition-all active:scale-[0.98]"
                        aria-label={roleCopy.walletDashboard.upgrade}
                    >
                        <div className="w-12 h-12 bg-white/10 dark:bg-black/10 rounded-full flex items-center justify-center">
                            <TrendingUpIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">{roleCopy.walletDashboard.upgrade}</span>
                    </button>
                </div>

                {gapRecommendations.length > 0 && (
                    <div>
                        <h3 className="text-lg font-black text-black dark:text-white mb-3">{roleCopy.walletDashboard.missingCoverages}</h3>
                        <div className="space-y-3">
                            {gapRecommendations.map((gap, index) => (
                                <GapRecommendationCard key={index} gap={gap} onAddCoverage={() => onAddManually?.()} />
                            ))}
                        </div>
                        {gapRecommendations.length >= 3 && (
                            <button className="w-full mt-3 text-sm font-bold text-[#1FDC86] hover:underline">
                                {roleCopy.walletDashboard.viewAllRecommendations}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
