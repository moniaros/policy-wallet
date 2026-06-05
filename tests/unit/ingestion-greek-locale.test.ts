import { describe, it, expect } from "vitest"
import { parseGreekAmount, parseGreekDate } from "@/lib/services/ingestion/greek-locale"

describe("parseGreekAmount", () => {
  it("treats a lone dot as the thousands separator (€50.000 = 50000)", () => {
    expect(parseGreekAmount("€50.000")).toBe(50000)
    expect(parseGreekAmount("1.234.567")).toBe(1234567)
    expect(parseGreekAmount("1.500")).toBe(1500)
  })

  it("treats a comma as the decimal separator", () => {
    expect(parseGreekAmount("1.234,56")).toBe(1234.56)
    expect(parseGreekAmount("1234,56")).toBe(1234.56)
    expect(parseGreekAmount("0,50")).toBe(0.5)
  })

  it("keeps a lone dot as a decimal when groups are not triples", () => {
    expect(parseGreekAmount("50.5")).toBe(50.5)
    expect(parseGreekAmount("50.55")).toBe(50.55)
  })

  it("handles bare integers and currency noise", () => {
    expect(parseGreekAmount("50000")).toBe(50000)
    expect(parseGreekAmount("1.500 ευρώ")).toBe(1500)
    expect(parseGreekAmount("EUR 250.000,00")).toBe(250000)
  })

  it("returns null for non-numeric input", () => {
    expect(parseGreekAmount("")).toBeNull()
    expect(parseGreekAmount(null)).toBeNull()
    expect(parseGreekAmount("Δωρεάν")).toBeNull()
  })
})

describe("parseGreekDate", () => {
  it("parses dd/mm/yyyy (never mm/dd) to ISO", () => {
    expect(parseGreekDate("15/03/2026")).toBe("2026-03-15")
    expect(parseGreekDate("01/01/2026")).toBe("2026-01-01")
    expect(parseGreekDate("31/12/2025")).toBe("2025-12-31")
  })

  it("accepts - and . separators and 2-digit years", () => {
    expect(parseGreekDate("15-03-2026")).toBe("2026-03-15")
    expect(parseGreekDate("15.03.2026")).toBe("2026-03-15")
    expect(parseGreekDate("31/12/25")).toBe("2025-12-31")
  })

  it("passes ISO input through", () => {
    expect(parseGreekDate("2026-03-15")).toBe("2026-03-15")
  })

  it("rejects impossible dates and junk", () => {
    expect(parseGreekDate("31/02/2026")).toBeNull()
    expect(parseGreekDate("00/00/2026")).toBeNull()
    expect(parseGreekDate("not a date")).toBeNull()
    expect(parseGreekDate(null)).toBeNull()
  })
})
