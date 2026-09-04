import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { deriveAiConsentState, type CandidateAiConsent } from "@/lib/services/customer-resolution.service"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import { scanPolicyForResolution } from "@/app/(protected)/agent/actions"
import { el } from "@/lib/i18n/translations/el"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock("@/app/(protected)/agent/actions", () => ({
    scanPolicyForResolution: vi.fn(),
    commitScannedPolicy: vi.fn(),
    requestAiConsent: vi.fn(),
}))

/**
 * Audit finding F-11.
 *
 * commitScannedPolicy decides AFTER the upload whether an analysis can run. The
 * advisor therefore spent a scan, a slice of the token budget and ~90s only to
 * be told "consent required" — and was shown an attestation checkbox that, for
 * a live account, the server correctly refuses to honour. This derivation moves
 * that verdict to BEFORE the upload, so it must stay in lockstep with the
 * server's own activation check.
 */

const base = {
    aiProcessingConsentVersion: null,
    password: null,
    emailVerified: null,
    lastActiveAt: null,
}

describe("deriveAiConsentState", () => {
    it("is granted whenever a consent version is on file", () => {
        expect(
            deriveAiConsentState({ ...base, aiProcessingConsentVersion: "v1" })
        ).toBe("granted")
    })

    it("treats agent-attested consent as granted too", () => {
        expect(
            deriveAiConsentState({
                ...base,
                aiProcessingConsentVersion: "agent-attested:v1:agent-123",
            })
        ).toBe("granted")
    })

    it("is attestable for an account the customer never activated", () => {
        expect(deriveAiConsentState(base)).toBe("attestable")
    })

    // Activation parity with commitScannedPolicy. Any of these three signals
    // means a real person has used the account, and only they may consent —
    // letting an advisor attest here would run AI over a live user's policy
    // without genuine consent (GDPR).
    it("is blocked once the account has a password", () => {
        expect(deriveAiConsentState({ ...base, password: "hash" })).toBe("blocked")
    })

    it("is blocked once the email is verified", () => {
        expect(
            deriveAiConsentState({ ...base, emailVerified: new Date("2026-01-01") })
        ).toBe("blocked")
    })

    it("is blocked once the user has ever been active", () => {
        expect(
            deriveAiConsentState({ ...base, lastActiveAt: new Date("2026-01-01") })
        ).toBe("blocked")
    })

    it("prefers granted over blocked when a live account HAS consented", () => {
        expect(
            deriveAiConsentState({
                ...base,
                aiProcessingConsentVersion: "v2",
                lastActiveAt: new Date("2026-01-01"),
                emailVerified: new Date("2026-01-01"),
            })
        ).toBe("granted")
    })
})

/**
 * S3 — the per-customer entry point (profile page → UploadPolicyModal with a
 * preset customer) skipped resolution, so the confirm step had NO verdict and
 * fell through to the attestation checkbox for every customer: a control that
 * did nothing for a live account. The page now derives the verdict with
 * deriveAiConsentState and hands it over as `presetCustomerConsent`, and the
 * confirm step renders the same three states the resolution path renders.
 */
const up = el.agentModals.uploadPolicy

function renderPreset(consent: CandidateAiConsent) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <UploadPolicyModal
                    isOpen
                    onClose={vi.fn()}
                    presetCustomerId="cust-1"
                    presetCustomerName="Μαρία Παπαδοπούλου"
                    presetCustomerConsent={consent}
                />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * Tick the pre-scan mandate attestation (the dropzone is disabled until it is),
 * drop a small PDF; the mocked scan lands the modal on the confirm step.
 */
async function reachConfirmStep() {
    fireEvent.click(screen.getByLabelText(up.preScanAttestation, { exact: false }))
    const input = document.getElementById("upload-policy-file") as HTMLInputElement
    const file = new File(["%PDF-1.4 test"], "policy.pdf", { type: "application/pdf" })
    Object.defineProperty(input, "files", { value: [file], configurable: true })
    fireEvent.change(input)
    // The confirm step's kicker is the proof we got there.
    await screen.findByText(up.confirmKicker)
}

describe("UploadPolicyModal — preset customer renders the consent verdict it was given", () => {
    beforeEach(() => {
        vi.mocked(scanPolicyForResolution).mockResolvedValue({
            success: true,
            extraction: {
                customerName: "Μαρία",
                customerSurname: "Παπαδοπούλου",
                customerEmail: "maria@example.gr",
                insurerName: "Interamerican",
                policyNumber: "POL-42",
                lineOfBusiness: "motor",
                startDate: "2026-01-01",
                endDate: "2027-01-01",
            },
            resolution: { candidates: [], conflict: false },
        } as any)
    })

    it("granted — says consent is on file and offers NO attestation checkbox", async () => {
        renderPreset("granted")
        await reachConfirmStep()
        expect(screen.getByTestId("upload-policy-consent-granted")).toBeTruthy()
        expect(screen.getByText(up.consentGrantedTitle)).toBeTruthy()
        expect(screen.queryByRole("checkbox")).toBeNull()
        expect(screen.queryByTestId("upload-policy-consent-blocked")).toBeNull()
    })

    it("attestable — the never-activated account gets the attestation checkbox", async () => {
        renderPreset("attestable")
        await reachConfirmStep()
        expect(screen.getByTestId("upload-policy-consent-attestable")).toBeTruthy()
        expect(screen.getByRole("checkbox")).toBeTruthy()
        expect(screen.getByText(up.consentLabel)).toBeTruthy()
        expect(screen.queryByTestId("upload-policy-consent-granted")).toBeNull()
    })

    it("blocked — a live account that has not consented gets the real next step, not a checkbox", async () => {
        renderPreset("blocked")
        await reachConfirmStep()
        expect(screen.getByTestId("upload-policy-consent-blocked")).toBeTruthy()
        expect(screen.getByText(up.consentBlockedTitle)).toBeTruthy()
        expect(screen.queryByRole("checkbox")).toBeNull()
        expect(screen.queryByTestId("upload-policy-consent-attestable")).toBeNull()
    })

    it("the preset path skips resolution: two steps, and the name it was given is shown", async () => {
        renderPreset("granted")
        await reachConfirmStep()
        expect(screen.getByText("Μαρία Παπαδοπούλου")).toBeTruthy()
        const track = screen.getByRole("progressbar")
        expect(track.getAttribute("aria-valuemax")).toBe("2")
        expect(track.getAttribute("aria-valuenow")).toBe("2")
    })
})
