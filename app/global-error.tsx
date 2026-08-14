"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort boundary: fires only when the root layout itself throws, so it
 * ships its own <html>/<body> and cannot use any provider or shared component.
 * It used to render the bare Next.js error page (unstyled, English-only) — the
 * one screen a user should never see looking like a stack trace. This is a
 * branded, bilingual fallback instead (Greek-first, matching the app default),
 * with inline styles because no stylesheet is guaranteed at this point.
 */
export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="el">
            <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc" }}>
                {/* This boundary ships its own document, so it is the only
                    content on the page and the landmark cannot nest. */}
                <main role="main" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>
                        Κάτι πήγε στραβά
                    </h1>
                    <p style={{ fontSize: "17px", color: "#475569", maxWidth: "28rem", margin: "0 0 6px" }}>
                        Παρουσιάστηκε ένα απροσδόκητο σφάλμα. Δοκιμάστε να ανανεώσετε τη σελίδα.
                    </p>
                    <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "28rem", margin: "0 0 32px" }}>
                        Something went wrong. Please try reloading the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "#29685B", color: "#fff", fontSize: "14px", fontWeight: 600, border: "none", borderRadius: "9999px", cursor: "pointer" }}
                    >
                        Ανανέωση · Reload
                    </button>
                    {error.digest && (
                        <div style={{ marginTop: "48px", fontFamily: "monospace", fontSize: "12px", color: "#94a3b8" }}>
                            Κωδικός συμβάντος · Incident ID: {error.digest}
                        </div>
                    )}
                </main>
            </body>
        </html>
    );
}
