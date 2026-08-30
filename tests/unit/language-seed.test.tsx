import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { LanguageStateContext } from "@/contexts/LanguageContext"
import { LanguageSeed } from "@/components/app/LanguageSeed"

describe("LanguageSeed — the client adopts the server-known preference", () => {
    it("adopts when the client state differs, and does nothing when it already agrees", () => {
        const adopt = vi.fn()
        const setLanguage = vi.fn()
        const { rerender } = render(
            <LanguageStateContext.Provider value={{ language: "el", setLanguage, adoptLanguage: adopt }}>
                <LanguageSeed language="en" />
            </LanguageStateContext.Provider>
        )
        expect(adopt).toHaveBeenCalledWith("en")
        expect(setLanguage, "must never take the API round-trip path").not.toHaveBeenCalled()
        adopt.mockClear()
        rerender(
            <LanguageStateContext.Provider value={{ language: "en", setLanguage, adoptLanguage: adopt }}>
                <LanguageSeed language="en" />
            </LanguageStateContext.Provider>
        )
        expect(adopt).not.toHaveBeenCalled()
    })
})
