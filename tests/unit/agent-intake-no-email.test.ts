import { describe, it, expect } from "vitest"

import {
    AddCustomerManuallyInput,
    AgentCustomerInput,
    CommitDecisionInput,
    UpdateCustomerContactInput,
    customerEmailIdentity,
} from "@/lib/validations/agent-intake"
import { SYNTHETIC_NO_EMAIL_DOMAIN, isSyntheticNoEmailAddress, syntheticNoEmailAddress } from "@/lib/identity/synthetic-email"
import { isGreekMobile, normalizeGreekMobile } from "@/lib/identity/phone"

/**
 * Owner decision D3: a customer may have no email. Their identity is then a
 * VALID Greek ΑΦΜ plus a Greek mobile, and the User row is keyed on a
 * deterministic, non-deliverable address under the reserved `.invalid` TLD.
 */

const AFM = "123456783" // passes the mod-11 checksum
const MOBILE = "6912345678"

describe("AgentCustomerInput — email is optional only behind ΑΦΜ + Greek mobile", () => {
    it("accepts a customer with no email, a valid ΑΦΜ and a Greek mobile", () => {
        const parsed = AgentCustomerInput.safeParse({ name: "Νίκος", email: "", taxId: AFM, phone: MOBILE })
        expect(parsed.success).toBe(true)
        expect(parsed.data?.email).toBeUndefined()
        expect(parsed.data?.taxId).toBe(AFM)
    })

    it("treats whitespace and an absent field the same", () => {
        expect(AgentCustomerInput.safeParse({ name: "Ν", email: "   ", taxId: AFM, phone: MOBILE }).success).toBe(true)
        expect(AgentCustomerInput.safeParse({ name: "Ν", taxId: AFM, phone: MOBILE }).success).toBe(true)
    })

    const contactRequired = (input: Record<string, unknown>) => {
        const parsed = AgentCustomerInput.safeParse({ name: "Νίκος", ...input })
        expect(parsed.success).toBe(false)
        const issue = parsed.error?.issues.find((i) => i.path.join(".") === "email")
        expect(issue?.message).toBe("contact_required")
    }

    it("refuses no email with no ΑΦΜ", () => contactRequired({ email: "", phone: MOBILE }))
    it("refuses no email with a foreign VAT (only a nine-digit Greek ΑΦΜ identifies)", () =>
        contactRequired({ email: "", taxId: "12345678", phone: MOBILE }))
    it("refuses no email with a landline", () => contactRequired({ email: "", taxId: AFM, phone: "2101234567" }))
    it("refuses no email with a foreign mobile", () => contactRequired({ email: "", taxId: AFM, phone: "+44 7700 900123" }))
    it("refuses no email with no phone at all", () => contactRequired({ email: "", taxId: AFM }))

    it("a checksum failure is still reported on taxId, not as contact_required", () => {
        const parsed = AgentCustomerInput.safeParse({ name: "Ν", email: "", taxId: "123456789", phone: MOBILE })
        expect(parsed.success).toBe(false)
        expect(parsed.error?.issues.map((i) => [i.path.join("."), i.message])).toContainEqual(["taxId", "invalid_afm_checksum"])
    })

    it("refuses the synthetic address when an agent types it", () => {
        const parsed = AgentCustomerInput.safeParse({ name: "Ν", email: syntheticNoEmailAddress(AFM) })
        expect(parsed.success).toBe(false)
        expect(parsed.error?.issues.map((i) => [i.path.join("."), i.message])).toContainEqual(["email", "reserved_email"])
    })

    it("carries the same rule on the manual door and the scanned-policy door", () => {
        expect(AddCustomerManuallyInput.safeParse({ name: "Ν", surname: "", email: "", phone: "", taxId: "" }).success).toBe(false)
        expect(AddCustomerManuallyInput.safeParse({ name: "Ν", surname: "", email: "", phone: MOBILE, taxId: AFM }).success).toBe(true)

        const commit = CommitDecisionInput.safeParse({ mode: "create_new", customer: { name: "Ν", email: "", phone: "" } })
        expect(commit.success).toBe(false)
        expect(commit.error?.issues.some((i) => i.path.join(".") === "customer.email" && i.message === "contact_required")).toBe(true)
        expect(CommitDecisionInput.safeParse({ mode: "create_new", customer: { name: "Ν", taxId: AFM, phone: MOBILE } }).success).toBe(true)
    })
})

describe("customerEmailIdentity — the key the User row is written under", () => {
    it("is the real address, unflagged, when one was given", () => {
        expect(customerEmailIdentity({ email: "nikos@x.gr", taxId: AFM })).toEqual({ email: "nikos@x.gr", contactEmailMissing: false })
    })

    it("is the synthetic address, flagged, when none was", () => {
        expect(customerEmailIdentity({ taxId: AFM })).toEqual({
            email: `noemail+${AFM}@${SYNTHETIC_NO_EMAIL_DOMAIN}`,
            contactEmailMissing: true,
        })
    })

    it("refuses to mint an address for an input the rule never saw", () => {
        expect(() => customerEmailIdentity({})).toThrow()
    })

    it("is deterministic per ΑΦΜ, so two agents adding the same customer share one row", () => {
        expect(customerEmailIdentity({ taxId: AFM }).email).toBe(customerEmailIdentity({ taxId: AFM }).email)
    })
})

describe("synthetic-email helpers", () => {
    it("builds and recognises the address, whatever the case", () => {
        const address = syntheticNoEmailAddress(" 123 456 783 ")
        expect(address).toBe(`noemail+123456783@${SYNTHETIC_NO_EMAIL_DOMAIN}`)
        expect(isSyntheticNoEmailAddress(address)).toBe(true)
        expect(isSyntheticNoEmailAddress(address.toUpperCase())).toBe(true)
        expect(isSyntheticNoEmailAddress(`  ${address}  `)).toBe(true)
    })

    it("does not flag a real address, even one at policywallet", () => {
        expect(isSyntheticNoEmailAddress("nikos@x.gr")).toBe(false)
        expect(isSyntheticNoEmailAddress("noreply@policywallet.gr")).toBe(false)
        expect(isSyntheticNoEmailAddress("noemail+1@policywallet.invalid")).toBe(false)
        expect(isSyntheticNoEmailAddress(null)).toBe(false)
        expect(isSyntheticNoEmailAddress("")).toBe(false)
    })

    it("refuses to build an address without digits", () => {
        expect(() => syntheticNoEmailAddress("")).toThrow()
        expect(() => syntheticNoEmailAddress("abc")).toThrow()
    })
})

describe("Greek mobile", () => {
    it("normalises the national, +30 and 0030 spellings to E.164", () => {
        expect(normalizeGreekMobile("6912345678")).toBe("+306912345678")
        expect(normalizeGreekMobile("+30 691 234 5678")).toBe("+306912345678")
        expect(normalizeGreekMobile("0030-6912345678")).toBe("+306912345678")
        expect(normalizeGreekMobile("(+30) 691.234.5678")).toBe("+306912345678")
    })

    it("refuses landlines, foreign numbers and fragments", () => {
        expect(normalizeGreekMobile("2101234567")).toBeNull()
        expect(normalizeGreekMobile("+30 210 123 4567")).toBeNull()
        expect(normalizeGreekMobile("+44 7700 900123")).toBeNull()
        expect(normalizeGreekMobile("69123")).toBeNull()
        expect(normalizeGreekMobile("")).toBeNull()
        expect(normalizeGreekMobile(undefined)).toBeNull()
        expect(isGreekMobile("6912345678")).toBe(true)
        expect(isGreekMobile("2101234567")).toBe(false)
    })
})

describe("UpdateCustomerContactInput", () => {
    it("normalises a real address and refuses the synthetic one", () => {
        expect(UpdateCustomerContactInput.safeParse({ customerId: "c1", email: " Nikos@X.GR " }).data?.email).toBe("nikos@x.gr")
        expect(UpdateCustomerContactInput.safeParse({ customerId: "c1", email: syntheticNoEmailAddress(AFM) }).success).toBe(false)
        expect(UpdateCustomerContactInput.safeParse({ customerId: "c1", email: "" }).success).toBe(false)
    })
})
