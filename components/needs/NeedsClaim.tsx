"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { isComplete, toRiskProfilePayload } from "@/lib/needs/questions"
import { clearNeeds, readNeeds } from "@/lib/needs/storage"

/**
 * Carries the public needs check into the account, once.
 *
 * Someone answers six questions on /needs, decides the product is worth an
 * account, signs up — and is asked the same six questions again by the risk
 * wizard. That is the moment the promise on the public page breaks, and it is
 * the entire reason this component exists.
 *
 * It runs on the first authenticated render after signup, PATCHes the stored
 * answers to the SAME endpoint the authenticated wizard uses, and clears the
 * browser copy. The endpoint merges `answeredFields` and re-runs the gap
 * engine before responding, so by the time the toast appears the dashboard
 * behind it already reflects what they said.
 *
 * Three deliberate choices:
 *
 *  - **Silent on failure.** If the PATCH fails the answers stay in
 *    localStorage and the next authenticated page load tries again. Telling
 *    someone their household facts did not transfer, at the moment they are
 *    first looking at the product, buys nothing they can act on.
 *  - **Cleared only on success.** The one thing worse than asking again is
 *    dropping the answers while claiming to have kept them.
 *  - **Guarded against Strict Mode.** Development mounts effects twice; a ref
 *    rather than state keeps the second mount from firing a second PATCH.
 */
export function NeedsClaim() {
    const router = useRouter()
    const { language } = useLanguage()
    const claiming = useRef(false)

    useEffect(() => {
        if (claiming.current) return

        const answers = readNeeds()
        if (!answers || !isComplete(answers)) return

        claiming.current = true
        const { payload, answeredFields } = toRiskProfilePayload(answers)

        void (async () => {
            try {
                const res = await fetch("/api/v1/risk-profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...payload, answeredFields }),
                })
                if (!res.ok) {
                    claiming.current = false
                    return
                }
                clearNeeds()
                toast.success(
                    language === "el"
                        ? "Κρατήσαμε τις απαντήσεις σας από τον έλεγχο αναγκών."
                        : "We kept your answers from the needs check.",
                )
                router.refresh()
            } catch {
                claiming.current = false
            }
        })()
    }, [language, router])

    return null
}
