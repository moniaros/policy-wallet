/**
 * The home's greeting addresses the person, so a Greek masculine first name
 * must appear in the vocative — «Γεια σας, Γιάννη», not the mail-merge
 * «Γεια σας, Γιάννης». Feminine names and Latin-script names pass through.
 */
import { describe, expect, it } from "vitest"

import { greekVocative } from "@/lib/i18n/greek-vocative"

describe("greekVocative — a first name addressed directly", () => {
    it("drops the final ς of masculine names", () => {
        expect(greekVocative("Γιάννης")).toBe("Γιάννη")
        expect(greekVocative("Κώστας")).toBe("Κώστα")
        expect(greekVocative("Νίκος")).toBe("Νίκο")
        expect(greekVocative("Αλέξανδρος")).toBe("Αλέξανδρο")
    })

    it("leaves feminine and indeclinable names alone", () => {
        expect(greekVocative("Μαρία")).toBe("Μαρία")
        expect(greekVocative("Ελένη")).toBe("Ελένη")
        expect(greekVocative("Αργυρώ")).toBe("Αργυρώ")
    })

    it("does not touch Latin script, very short strings or padding", () => {
        expect(greekVocative("Yannis")).toBe("Yannis")
        expect(greekVocative("  Γιάννης ")).toBe("Γιάννη")
        expect(greekVocative("Ος")).toBe("Ος")
    })
})
