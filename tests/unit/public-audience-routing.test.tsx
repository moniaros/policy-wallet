import React from "react"
import { render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
vi.mock("next/navigation", () => ({ usePathname: () => "/solutions/agents" }))
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }))
vi.mock("@/components/landing/SolutionsDropdown", () => ({ SolutionsDropdown: () => null, SolutionsMobileGroup: () => null }))
import { PublicHeader } from "@/components/public/PublicHeader"
afterEach(cleanup)
describe("public registration keeps its audience and language", () => {
 for (const locale of ["el", "en"] as const) for (const audience of ["agent", "policyholder"] as const) {
  it(`${locale} ${audience}`, () => {
   render(<PublicHeader locale={locale} audience={audience} ctaSource="review" />)
   const links = screen.getAllByRole("link").filter(a => a.getAttribute("href")?.includes("/auth/signup"))
   expect(links.length).toBeGreaterThan(0)
   for (const a of links) {
    const url = new URL(a.getAttribute("href")!, "https://example.test")
    expect(url.searchParams.get("role")).toBe(audience)
    expect(url.searchParams.get("source")).toBe("review")
    if (locale === "en") expect(url.searchParams.get("lang")).toBe("en")
   }
  })
 }
})
