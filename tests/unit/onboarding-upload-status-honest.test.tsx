import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { getTranslations } from "@/lib/i18n"

const uploadOnboardingPolicy = vi.fn(async () => ({ success: true, policyId: "pol_1" }))
const triggerOnboardingAnalysis = vi.fn(async () => ({ success: true, status: "queued" as const }))
vi.mock("@/app/onboarding/actions", () => ({
    uploadOnboardingPolicy: (...a: unknown[]) => uploadOnboardingPolicy(...(a as [])),
    triggerOnboardingAnalysis: (...a: unknown[]) => triggerOnboardingAnalysis(...(a as [])),
}))
vi.mock("@/components/ui/AiConsentModal", () => ({ AiConsentModal: () => null }))

import { UploadScreen } from "@/components/onboarding/protection-profile/UploadScreen"

/**
 * Replaces onboarding-analysis-subtitle-stateful: the «AI Σύνοψη» screen it
 * grepped no longer exists, but its requirement stands — a QUEUED analysis
 * must never be announced as ready.
 */
describe("the first upload reports the real status", () => {
    it("the dictionary never calls a queued reading ready, in either language", () => {
        for (const lang of ["el", "en"] as const) {
            const s = getTranslations(lang).onboarding.protectionProfile.upload.status
            expect(s.queued).not.toMatch(/έτοιμ|ready/i)
            expect(s.uploading).not.toMatch(/έτοιμ|ready/i)
            expect(s.reading).not.toMatch(/έτοιμ|ready/i)
        }
    })

    it("after a queued analysis the screen says it will finish later and offers the picture, not «ready» — and reports the outcome as queued", async () => {
        const labels = getTranslations("el").onboarding.protectionProfile.upload
        const onUploaded = vi.fn()
        const { container } = render(
            <UploadScreen labels={labels} startingFrom={["Οικογένεια"]} hasAiConsent={true} deepAnalysisAvailable={true} onUploaded={onUploaded} onLater={vi.fn()} busy={false} />
        )
        const input = container.querySelector("#protection-upload-file") as HTMLInputElement
        const file = new File(["%PDF-1.4"], "policy.pdf", { type: "application/pdf" })
        fireEvent.change(input, { target: { files: [file] } })
        fireEvent.click(screen.getByRole("button", { name: labels.cta }))
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(labels.status.queued))
        expect(screen.getByRole("status").textContent).not.toMatch(/έτοιμ|ready/i)
        expect(screen.getByRole("button", { name: labels.seePicture })).toBeTruthy()
        expect(uploadOnboardingPolicy).toHaveBeenCalledTimes(1)
        // The flow goes back to the map with the REAL outcome, so a queued
        // reading can never be shown as something that moved the picture.
        fireEvent.click(screen.getByRole("button", { name: labels.seePicture }))
        expect(onUploaded).toHaveBeenCalledWith("pol_1", "queued")
    })

    it("on a plan without the deep reading the hint says presence is what this upload establishes, not the limits", () => {
        for (const lang of ["el", "en"] as const) {
            const labels = getTranslations(lang).onboarding.protectionProfile.upload
            const free = render(<UploadScreen labels={labels} startingFrom={[]} hasAiConsent={true} deepAnalysisAvailable={false} onUploaded={vi.fn()} onLater={vi.fn()} busy={false} />)
            expect(free.container.querySelector('[data-tier-hint="limits_need_full_analysis"]')?.textContent).toBe(labels.limitsNeedFullAnalysis)
            expect(labels.limitsNeedFullAnalysis).not.toMatch(/έτοιμ|ready/i)
            free.unmount()
            const pro = render(<UploadScreen labels={labels} startingFrom={[]} hasAiConsent={true} deepAnalysisAvailable={true} onUploaded={vi.fn()} onLater={vi.fn()} busy={false} />)
            expect(pro.container.querySelector("[data-tier-hint]")).toBeNull()
            expect(pro.container.textContent).not.toContain(labels.limitsNeedFullAnalysis)
            pro.unmount()
        }
        // The line is the Greek singular register, with «ασφαλιστήριο» never «συμβόλαιο».
        const el = getTranslations("el").onboarding.protectionProfile.upload.limitsNeedFullAnalysis
        expect(el).toBe("Θα δούμε ποιες καλύψεις υπάρχουν· η ανάγνωση των ορίων είναι μέρος της πλήρους ανάλυσης.")
        expect(el).not.toMatch(/(?<![\p{L}])(σας|εσάς|εσείς)(?![\p{L}])/u)
    })
})
