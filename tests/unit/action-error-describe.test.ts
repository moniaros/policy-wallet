import { describe, it, expect } from "vitest"

import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"
import { actionErrorKey, describeActionError, fieldErrorKey } from "@/lib/i18n/action-error"

/**
 * The modals rendered `result.error` raw — the harness saw the literal
 * «VALIDATION_ERROR» on the confirm step for a `customer.taxId` checksum
 * failure that belonged to the previous step. `describeActionError` is the
 * one place a code and its Zod issues become the agent's language.
 */

const snakeOf = (camel: string) => camel.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()

describe("actionErrorKey — UPPER_SNAKE → camelCase", () => {
    it("maps the codes the actions return onto the dictionary keys", () => {
        expect(actionErrorKey("VALIDATION_ERROR")).toBe("validationError")
        expect(actionErrorKey("CUSTOMER_NOT_CONTACTABLE")).toBe("customerNotContactable")
        expect(actionErrorKey("UNAUTHORIZED")).toBe("unauthorized")
        expect(actionErrorKey(" rate_limited ")).toBe("rateLimited")
    })

    it("round-trips every apiErrors key, so no code can miss its copy by spelling", () => {
        for (const key of Object.keys(el.apiErrors)) {
            expect(actionErrorKey(snakeOf(key)), key).toBe(key)
        }
    })
})

describe("describeActionError — the code", () => {
    it("localises a known code in both dictionaries", () => {
        expect(describeActionError(el, "CUSTOMER_EXISTS").message).toBe(el.apiErrors.customerExists)
        expect(describeActionError(en, "CUSTOMER_EXISTS").message).toBe(en.apiErrors.customerExists)
    })

    it("fills the placeholders from the action result itself", () => {
        const described = describeActionError(el, "CUSTOMER_LIMIT_REACHED", undefined, { current: 5, limit: 5 })
        expect(described.message).toContain("5/5")
        expect(described.message).not.toContain("{")
    })

    it("falls back to the generic line for a code the dictionary does not know, and for no code", () => {
        expect(describeActionError(el, "SOMETHING_NEW").message).toBe(el.apiErrors.generic)
        expect(describeActionError(el, undefined).message).toBe(el.apiErrors.generic)
        expect(describeActionError(el, null).message).toBe(el.apiErrors.generic)
    })

    it("never lets the literal code through", () => {
        const described = describeActionError(el, "VALIDATION_ERROR", [
            { path: "customer.taxId", code: "custom", message: "invalid_afm_checksum" },
        ])
        expect(described.message).toBe(el.apiErrors.validationError)
        expect(JSON.stringify(described)).not.toContain("VALIDATION_ERROR")
        expect(JSON.stringify(described)).not.toContain("invalid_afm_checksum")
    })
})

describe("describeActionError — the issues", () => {
    const one = (issue: { path: string | Array<string | number>; code: string; message?: string }) =>
        describeActionError(el, "VALIDATION_ERROR", [issue]).fieldErrors

    it("uses the check's own slug when the message is one", () => {
        expect(one({ path: "customer.taxId", code: "custom", message: "invalid_afm_checksum" })).toEqual({
            "customer.taxId": el.formErrors.invalidAfmChecksum,
        })
        expect(one({ path: "taxId", code: "custom", message: "invalid_tax_id" })).toEqual({ taxId: el.formErrors.invalidTaxId })
        expect(one({ path: "policy.startDate", code: "invalid_format", message: "invalid_date" })).toEqual({
            "policy.startDate": el.formErrors.invalidDate,
        })
        expect(one({ path: "policy.endDate", code: "custom", message: "end_before_start" })).toEqual({
            "policy.endDate": el.formErrors.endBeforeStart,
        })
        expect(one({ path: "email", code: "custom", message: "contact_required" })).toEqual({ email: el.formErrors.contactRequired })
    })

    it("reads a Zod code with the field in mind", () => {
        expect(one({ path: "email", code: "invalid_format", message: "Invalid email address" })).toEqual({ email: el.formErrors.invalidEmail })
        expect(one({ path: "customer.email", code: "invalid_format" })).toEqual({ "customer.email": el.formErrors.invalidEmail })
        expect(one({ path: "premiumCurrency", code: "invalid_format" })).toEqual({ premiumCurrency: el.formErrors.invalidFormat })
        expect(one({ path: "name", code: "too_small" })).toEqual({ name: el.formErrors.required })
        expect(one({ path: "surname", code: "too_big" })).toEqual({ surname: el.formErrors.tooLong })
        expect(one({ path: "policy.premiumAmount", code: "too_small" })).toEqual({ "policy.premiumAmount": el.formErrors.invalidNumber })
        expect(one({ path: "premiumAmount", code: "invalid_type", message: "Invalid input: expected number, received NaN" })).toEqual({
            premiumAmount: el.formErrors.invalidNumber,
        })
        expect(one({ path: "policy.lineOfBusiness", code: "invalid_value" })).toEqual({
            "policy.lineOfBusiness": el.formErrors.invalidChoice,
        })
        expect(one({ path: "startDate", code: "invalid_type" })).toEqual({ startDate: el.formErrors.required })
        expect(one({ path: "taxId", code: "custom", message: "Some prose the model wrote" })).toEqual({ taxId: el.formErrors.invalid })
    })

    it("keeps the first issue per field and accepts array paths (the bulk route's raw issues)", () => {
        const described = describeActionError(el, "VALIDATION_ERROR", [
            { path: ["customers", 0, "email"], code: "invalid_format" },
            { path: ["customers", 0, "email"], code: "too_small" },
            { path: [], code: "custom" },
        ])
        expect(described.fieldErrors).toEqual({ "customers.0.email": el.formErrors.invalidEmail })
    })

    it("every formErrors key the mapper can name exists in both dictionaries", () => {
        const keys = new Set<string>()
        const codes = ["invalid_format", "too_small", "too_big", "invalid_type", "invalid_value", "custom"]
        for (const path of ["email", "name", "premiumAmount", "policy.lineOfBusiness"]) {
            for (const code of codes) keys.add(fieldErrorKey({ code }, path, el.formErrors))
        }
        for (const slug of ["invalid_afm_checksum", "invalid_tax_id", "invalid_date", "end_before_start", "contact_required", "reserved_email"]) {
            keys.add(fieldErrorKey({ code: "custom", message: slug }, "x", el.formErrors))
        }
        for (const key of keys) {
            expect(el.formErrors[key as keyof typeof el.formErrors], `el.formErrors.${key}`).toBeTruthy()
            expect(en.formErrors[key as keyof typeof en.formErrors], `en.formErrors.${key}`).toBeTruthy()
        }
    })
})
