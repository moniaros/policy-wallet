import { ImageResponse } from "next/og"

/**
 * Site-wide 1200×630 Open Graph image (the correct link-preview aspect
 * ratio — the previous static asset was a 1024×1024 JPEG). Applies to every
 * route that does not define its own og image. Latin-only text: the default
 * ImageResponse font has no Greek glyphs.
 */

export const alt = "PolicyWallet — Your insurance, understood."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
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
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                    }}
                >
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
                            fontSize: "76px",
                            fontWeight: 700,
                            lineHeight: 1.05,
                            letterSpacing: "-2px",
                            maxWidth: "980px",
                        }}
                    >
                        Your insurance, understood.
                    </div>
                    <div
                        style={{
                            color: "rgba(255,255,255,0.72)",
                            fontSize: "32px",
                            lineHeight: 1.35,
                            maxWidth: "900px",
                        }}
                    >
                        AI policy analysis, coverage-gap detection, and renewal
                        reminders — in one neutral wallet.
                    </div>
                </div>

                <div style={{ display: "flex", gap: "14px" }}>
                    {["AI analysis in <30s", "Gap detection", "EL / EN"].map((chip) => (
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
        size
    )
}
