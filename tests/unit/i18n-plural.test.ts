import { describe, it, expect } from "vitest"
import { formatPlural, hasBareCount } from "@/lib/i18n/plural"

describe("formatPlural — ICU plurals for the app catalogue", () => {
    const tpl = "{count, plural, =0 {κανένα ασφαλιστήριο} one {# ασφαλιστήριο} other {# ασφαλιστήρια}}"
    it("selects =0, one and other", () => {
        expect(formatPlural(tpl, { count: 0 })).toBe("κανένα ασφαλιστήριο")
        expect(formatPlural(tpl, { count: 1 })).toBe("1 ασφαλιστήριο")
        expect(formatPlural(tpl, { count: 30 })).toBe("30 ασφαλιστήρια")
    })
    it("formats the number for the locale and interpolates other params", () => {
        expect(formatPlural("{count, plural, one {# ημέρα} other {# ημέρες}} — {name}", { count: 1234, name: "ΙΚΖ-4821" }, "el")).toBe("1.234 ημέρες — ΙΚΖ-4821")
        expect(formatPlural("{count, plural, one {# day} other {# days}}", { count: 1234 }, "en")).toBe("1,234 days")
    })
    it("leaves an unknown placeholder visible rather than swallowing it", () => {
        expect(formatPlural("Λήγει σε {days} ημέρες", {})).toBe("Λήγει σε {days} ημέρες")
    })
    it("hasBareCount is the guard's predicate", () => {
        expect(hasBareCount("Έχετε {count} ασφαλιστήρια")).toBe(true)
        expect(hasBareCount(tpl)).toBe(false)
    })
})
