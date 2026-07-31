/**
 * WP-02 — a rejected upload must always say which file and why.
 *
 * The browser uploads straight to Supabase storage, so before this the only
 * feedback for an oversized or spoofed file was a generic "Upload failed"
 * toast: no file name, no reason, nothing to act on. The inline check maps
 * every `UploadRejectionReason` to localized copy — so a reason without a
 * message would silently reproduce the original bug (empty error node).
 */
import { describe, expect, it } from "vitest"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"
import { REJECTION_MESSAGES, type UploadRejectionReason } from "@/lib/security/file-upload"

const REASONS = Object.keys(REJECTION_MESSAGES) as UploadRejectionReason[]

describe("upload rejection copy", () => {
    it("covers every rejection reason the shared validator can return", () => {
        // Sourced from the validator itself, so a NEW reason added there fails
        // here rather than rendering an empty inline error in the browser.
        expect(REASONS.length).toBeGreaterThan(0)
        for (const reason of REASONS) {
            expect(el.wallet.uploadRejection, `el missing ${reason}`).toHaveProperty(reason)
            expect(en.wallet.uploadRejection, `en missing ${reason}`).toHaveProperty(reason)
        }
    })

    it("names the offending file in every message, in both languages", () => {
        for (const reason of REASONS) {
            expect(
                (el.wallet.uploadRejection as Record<string, string>)[reason],
                `el.${reason} must interpolate the file name`
            ).toContain("{name}")
            expect(
                (en.wallet.uploadRejection as Record<string, string>)[reason],
                `en.${reason} must interpolate the file name`
            ).toContain("{name}")
        }
    })

    it("states the actual limit on the size rejection rather than a vague 'too large'", () => {
        expect(el.wallet.uploadRejection.too_large).toContain("{limit}")
        expect(en.wallet.uploadRejection.too_large).toContain("{limit}")
    })

    it("keeps el and en rejection keys in exact parity", () => {
        expect(Object.keys(el.wallet.uploadRejection).sort()).toEqual(
            Object.keys(en.wallet.uploadRejection).sort()
        )
    })
})
