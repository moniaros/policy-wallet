import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { CATEGORY, CATEGORY_NAME } from "@/lib/marketing/positioning"

/**
 * The shared 1200×630 link-preview card, rendered per locale.
 *
 * Greek needs vendored fonts: next/og's built-in font has no Greek glyphs, so
 * the Greek card previously could not be drawn at all and every one of the 60
 * Greek URLs served an English-only preview — the category name never reached
 * a share in its primary market.
 *
 * The four subset files (Noto Sans, Greek + Latin, weights 400/700, ~64 KB
 * total) are read from disk at build time — both cards are statically
 * prerendered, so the files never need to exist at runtime.
 * satori accepts WOFF (not WOFF2), which is what Google serves for these.
 */

const COPY = {
    el: {
        headline: "Σας λέμε αν είστε καλυμμένοι.",
        sub: `Η ${CATEGORY_NAME.el}. Διαβάζουμε τις ασφάλειες που ήδη έχετε — δεν τις πουλάμε.`,
        chips: ["Ανεξάρτητοι", "Χωρίς προμήθεια", "EL / EN"],
    },
    en: {
        headline: "We tell you if you are covered.",
        sub: `The ${CATEGORY_NAME.en}. We read the insurance you already own — we do not sell it.`,
        chips: ["Independent", "No commission", "EL / EN"],
    },
} as const

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

/** Alt text mirrors the decode sentence, so it never contradicts the image. */
export function ogAlt(locale: "el" | "en"): string {
    return `PolicyWallet — ${CATEGORY[locale]}`
}

const FONT_DIR = join(process.cwd(), "lib", "seo", "og-assets")

async function loadFonts(locale: "el" | "en") {
    const script = locale === "el" ? "greek" : "latin"
    // Read from disk rather than fetch(file://), which undici does not
    // implement. Both cards are statically prerendered, so this runs at build
    // time and the files never need to exist at runtime.
    const [body, bold, latinBody, latinBold] = await Promise.all([
        readFile(join(FONT_DIR, `NotoSans-${script}-400.woff`)),
        readFile(join(FONT_DIR, `NotoSans-${script}-700.woff`)),
        readFile(join(FONT_DIR, "NotoSans-latin-400.woff")),
        readFile(join(FONT_DIR, "NotoSans-latin-700.woff")),
    ])
    // Latin is listed too even on the Greek card: "PolicyWallet" and "EL / EN"
    // are Latin, and satori falls back across the list for missing glyphs.
    return [
        { name: "NotoSans", data: body, weight: 400 as const, style: "normal" as const },
        { name: "NotoSans", data: bold, weight: 700 as const, style: "normal" as const },
        { name: "NotoSansLatin", data: latinBody, weight: 400 as const, style: "normal" as const },
        { name: "NotoSansLatin", data: latinBold, weight: 700 as const, style: "normal" as const },
    ]
}

export async function renderOgCard(locale: "el" | "en") {
    const copy = COPY[locale]
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    backgroundColor: "#1A2420",
                    backgroundImage:
                        "radial-gradient(circle at 85% 15%, rgba(137,217,178,0.22) 0%, rgba(26,36,32,0) 55%)",
                    padding: "72px 80px",
                    fontFamily: "NotoSans, NotoSansLatin",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                        style={{
                            display: "flex",
                            width: "56px",
                            height: "56px",
                            borderRadius: "14px",
                            backgroundColor: "#29685B",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#89D9B2",
                            fontSize: "34px",
                            fontWeight: 700,
                        }}
                    >
                        P
                    </div>
                    <div style={{ display: "flex", fontSize: "44px", fontWeight: 700 }}>
                        <span style={{ color: "#FFFFFF" }}>Policy</span>
                        <span style={{ color: "#89D9B2" }}>Wallet</span>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div
                        style={{
                            color: "#FFFFFF",
                            fontSize: "72px",
                            fontWeight: 700,
                            lineHeight: 1.05,
                            letterSpacing: "-2px",
                            maxWidth: "1000px",
                        }}
                    >
                        {copy.headline}
                    </div>
                    <div
                        style={{
                            color: "rgba(255,255,255,0.72)",
                            fontSize: "30px",
                            lineHeight: 1.35,
                            maxWidth: "940px",
                        }}
                    >
                        {copy.sub}
                    </div>
                </div>

                {/* Baseline, always-true claims only: a social card carries no
                    plan context, so it must not claim tier-gated capability. */}
                <div style={{ display: "flex", gap: "14px" }}>
                    {copy.chips.map((chip) => (
                        <div
                            key={chip}
                            style={{
                                display: "flex",
                                padding: "12px 26px",
                                borderRadius: "999px",
                                border: "1px solid rgba(137,217,178,0.45)",
                                color: "#89D9B2",
                                fontSize: "24px",
                                fontWeight: 600,
                            }}
                        >
                            {chip}
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts: await loadFonts(locale) }
    )
}
