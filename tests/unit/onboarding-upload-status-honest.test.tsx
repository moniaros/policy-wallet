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

    it("after a queued analysis the screen says it will finish later and offers the picture, not «ready»", async () => {
        const labels = getTranslations("el").onboarding.protectionProfile.upload
        const onUploaded = vi.fn()
        const { container } = render(
            <UploadScreen labels={labels} startingFrom={["Οικογένεια"]} hasAiConsent={true} onUploaded={onUploaded} onLater={vi.fn()} busy={false} />
        )
        const input = container.querySelector("#protection-upload-file") as HTMLInputElement
        const file = new File(["%PDF-1.4"], "policy.pdf", { type: "application/pdf" })
        fireEvent.change(input, { target: { files: [file] } })
        fireEvent.click(screen.getByRole("button", { name: labels.cta }))
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(labels.status.queued))
        expect(screen.getByRole("status").textContent).not.toMatch(/έτοιμ|ready/i)
        expect(screen.getByRole("button", { name: labels.seePicture })).toBeTruthy()
        expect(uploadOnboardingPolicy).toHaveBeenCalledTimes(1)
    })
})
