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

    it("a document that is not a policy: says so — never «διαβάσαμε» — re-opens the chooser for a NEW upload, keeps «later», and hands the map needs_review", async () => {
        uploadOnboardingPolicy.mockClear()
        triggerOnboardingAnalysis.mockClear()
        triggerOnboardingAnalysis.mockResolvedValueOnce({ success: false, status: "needs_review" } as any)
        const labels = getTranslations("el").onboarding.protectionProfile.upload
        const onUploaded = vi.fn()
        const onLater = vi.fn()
        const { container } = render(
            <UploadScreen labels={labels} startingFrom={[]} hasAiConsent={true} deepAnalysisAvailable={false} onUploaded={onUploaded} onLater={onLater} busy={false} />
        )
        const input = container.querySelector("#protection-upload-file") as HTMLInputElement
        fireEvent.change(input, { target: { files: [new File(["%PDF-1.4"], "one-line.pdf", { type: "application/pdf" })] } })
        fireEvent.click(screen.getByRole("button", { name: labels.cta }))
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(labels.status.needsReview))

        // The exact singular-register line, and none of the words that would claim a reading.
        expect(labels.status.needsReview).toBe("Δεν βρήκαμε στοιχεία ασφαλιστηρίου σε αυτό το έγγραφο. Δες αν είναι το σωστό αρχείο — μπορείς να ανεβάσεις άλλο.")
        expect(screen.getByRole("status").textContent).not.toMatch(/διαβάσαμε|έτοιμ|ready/i)
        expect(container.querySelector('[data-upload-outcome="needs_review"]')).toBeTruthy()
        for (const lang of ["el", "en"] as const) {
            expect(getTranslations(lang).onboarding.protectionProfile.upload.status.needsReview).not.toMatch(/διαβάσαμε|έτοιμ|ready|we've read/i)
        }

        // The chooser is back and the CTA waits for ANOTHER file; the «later» exit stands.
        expect(container.querySelector("#protection-upload-file")).toBeTruthy()
        expect(screen.getByRole("button", { name: labels.cta })).toBeDisabled()
        expect(screen.getByRole("button", { name: labels.later })).toBeTruthy()

        // The picture is offered with the REAL outcome — the strip can never credit this file.
        fireEvent.click(screen.getByRole("button", { name: labels.seePicture }))
        expect(onUploaded).toHaveBeenCalledWith("pol_1", "needs_review")

        // Another file is a NEW upload, never a re-read of the empty row.
        uploadOnboardingPolicy.mockResolvedValueOnce({ success: true, policyId: "pol_2" })
        fireEvent.change(container.querySelector("#protection-upload-file") as HTMLInputElement, { target: { files: [new File(["%PDF-1.4"], "real.pdf", { type: "application/pdf" })] } })
        fireEvent.click(screen.getByRole("button", { name: labels.cta }))
        await waitFor(() => expect(uploadOnboardingPolicy).toHaveBeenCalledTimes(2))
        await waitFor(() => expect(triggerOnboardingAnalysis).toHaveBeenLastCalledWith("pol_2"))
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
