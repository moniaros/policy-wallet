/**
 * Savings Report Generator
 *
 * Deterministic HTML generation for savings report export (Pro feature).
 * Produces a print-ready HTML page from analysis result JSON.
 * Users can print to PDF via browser (Ctrl+P / Cmd+P).
 */

import { getTranslations } from "@/lib/i18n"

interface SavingsOpportunity {
    action: { en: string; el: string } | string
    rationale: { en: string; el: string } | string
    estimatedAnnualSavingsEur: number | null
    confidence: number
}

interface GapResult {
    slug: string
    isDetected: boolean
    explanation?: { en: string; el: string } | string
    suggestion?: { en: string; el: string } | string
    severity?: string
}

function localized(val: any, lang: "en" | "el" = "en"): string {
    if (!val) return ""
    if (typeof val === "string") return val
    return val[lang] || val.en || val.el || ""
}

/**
 * Optional agent branding for the report header/footer. All string values are
 * escaped before interpolation; `brandColor` is validated as a hex before it
 * ever reaches the stylesheet (never interpolate raw untrusted CSS).
 */
export interface AgentReportBranding {
    agencyName?: string | null
    logoUrl?: string | null
    brandColor?: string | null
    website?: string | null
    phone?: string | null
}

/** The B2C default heading color — also the fallback when no valid brandColor. */
const DEFAULT_HEADING_COLOR = "#16213e"

/**
 * Accept ONLY a `#RGB` / `#RRGGBB` hex. Anything else returns null so the
 * caller falls back to the default — untrusted branding text never lands in CSS.
 */
function sanitizeHexColor(input?: string | null): string | null {
    if (!input) return null
    const value = input.trim()
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : null
}

export function generateSavingsReportHtml(
    resultJson: Record<string, any>,
    generatedAt: string,
    language: "en" | "el" = "en",
    branding?: AgentReportBranding
): string {
    const loc = (val: any) => localized(val, language)
    const metadata = resultJson.metadata ?? {}
    const savings: SavingsOpportunity[] = resultJson.savingsOpportunities ?? []
    const gaps: GapResult[] = (resultJson.gapResults ?? []).filter((g: any) => g.isDetected)
    const summary = resultJson.plainLanguageSummary
    const snapshot = resultJson.coverageSnapshot

    const totalSavings = savings.reduce(
        (sum, s) => sum + (s.estimatedAnnualSavingsEur ?? 0),
        0
    )

    const formatDate = (iso: string) => {
        try {
            // This pinned "en-GB" while every label above it switched on
            // `language` — so a Greek branded report went out to the client with
            // Greek headings and English dates.
            return new Date(iso).toLocaleDateString(language === "el" ? "el-GR" : "en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })
        } catch {
            return iso
        }
    }

    // ── Optional agent branding ──────────────────────────────────────
    // When `branding` is absent every value below collapses to "" / the
    // default color, so the emitted HTML is byte-identical to the B2C report.
    const agencyName = branding?.agencyName?.trim() || ""
    const logoUrl = branding?.logoUrl?.trim() || ""
    const website = branding?.website?.trim() || ""
    const phone = branding?.phone?.trim() || ""
    const hasBranding = Boolean(branding && (agencyName || logoUrl))
    const accent = sanitizeHexColor(branding?.brandColor) || DEFAULT_HEADING_COLOR
    const headingColor = hasBranding ? "var(--pw-accent)" : DEFAULT_HEADING_COLOR

    const brandingStyleVars = hasBranding
        ? `\n  :root { --pw-accent: ${accent}; }` +
          `\n  .agency-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid var(--pw-accent); }` +
          `\n  .agency-header img { max-height: 52px; max-width: 180px; object-fit: contain; }` +
          `\n  .agency-name { font-size: 18px; font-weight: 700; color: var(--pw-accent); }` +
          `\n  .agency-contact { font-size: 12px; color: #666; margin-top: 2px; }` +
          `\n  .powered-by { font-weight: 600; color: var(--pw-accent); margin-bottom: 6px; }`
        : ""

    const preparedByLabel = language === "el" ? "Ετοιμάστηκε από" : "Prepared by"
    const contactBits = [website, phone].filter(Boolean).map((b) => escapeHtml(b)).join(" · ")
    const headerBlock = hasBranding
        ? `<div class="agency-header">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(agencyName)}">` : ""}<div>${agencyName ? `<div class="agency-name">${escapeHtml(agencyName)}</div>` : ""}${contactBits ? `<div class="agency-contact">${contactBits}</div>` : ""}</div></div>
<h1>Savings &amp; Coverage Report</h1>
<p class="subtitle">${agencyName ? `${preparedByLabel} ${escapeHtml(agencyName)} · ` : ""}${formatDate(generatedAt)}</p>`
        : `<h1>Savings &amp; Coverage Report</h1>
<p class="subtitle">Generated ${formatDate(generatedAt)} by PolicyWallet</p>`

    const poweredByBlock = hasBranding
        ? `<p class="powered-by">Powered by PolicyWallet</p>\n  `
        : ""

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Savings Report — ${escapeHtml(metadata.policyNumber || "Policy")}</title>
<style>${brandingStyleVars}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
  h1 { font-size: 24px; margin-bottom: 4px; color: ${headingColor}; }
  h2 { font-size: 18px; margin: 28px 0 12px; color: ${headingColor}; border-bottom: 2px solid #e8e8f0; padding-bottom: 6px; }
  h3 { font-size: 15px; margin: 16px 0 8px; color: #0f3460; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 24px; font-size: 14px; }
  .meta-label { color: #888; }
  .meta-value { font-weight: 500; }
  .savings-total { background: #e8f5e9; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .savings-total .amount { font-size: 28px; font-weight: 700; color: #2e7d32; }
  .savings-total .label { color: #388e3c; font-size: 14px; }
  .savings-card { background: #f8f9fa; border-radius: 6px; padding: 14px 16px; margin-bottom: 10px; border-left: 4px solid #43a047; }
  .savings-card .action { font-weight: 600; font-size: 14px; }
  .savings-card .rationale { font-size: 13px; color: #555; margin-top: 4px; }
  .savings-card .estimate { font-size: 13px; color: #2e7d32; margin-top: 4px; font-weight: 500; }
  .gap-card { background: #fff3e0; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; border-left: 4px solid #ef6c00; }
  .gap-card.high, .gap-card.critical { border-left-color: #c62828; background: #fce4ec; }
  .gap-card .slug { font-weight: 600; font-size: 14px; }
  .gap-card .detail { font-size: 13px; color: #555; margin-top: 4px; }
  .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
  .badge-high, .badge-critical { background: #ffcdd2; color: #b71c1c; }
  .badge-medium { background: #ffe0b2; color: #e65100; }
  .badge-low { background: #e8f5e9; color: #2e7d32; }
  .coverage-list { font-size: 13px; columns: 2; column-gap: 24px; }
  .coverage-list li { margin-bottom: 4px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; }
  .print-btn { background: #1565c0; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 24px; }
  .print-btn:hover { background: #0d47a1; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

${headerBlock}

<div class="meta-grid">
  <span class="meta-label">Insurer</span><span class="meta-value">${escapeHtml(metadata.insurerName || "—")}</span>
  <span class="meta-label">Policy Number</span><span class="meta-value">${escapeHtml(metadata.policyNumber || "—")}</span>
  <span class="meta-label">Type</span><span class="meta-value">${escapeHtml(metadata.lineOfBusiness || "—")}</span>
  <span class="meta-label">Period</span><span class="meta-value">${escapeHtml(metadata.startDate?.split("T")[0] || "—")} to ${escapeHtml(metadata.endDate?.split("T")[0] || "—")}</span>
  <span class="meta-label">Premium</span><span class="meta-value">${metadata.premiumAmount != null ? `€${Number(metadata.premiumAmount).toFixed(2)}` : "—"}</span>
</div>

${summary ? `<h2>Summary</h2><p style="font-size:14px">${escapeHtml(loc(summary))}</p>` : ""}

<h2>Savings Opportunities</h2>
${savings.length === 0 ? "<p style='font-size:14px;color:#888'>No savings opportunities identified.</p>" : ""}

${totalSavings > 0 ? `
<div class="savings-total">
  <div class="amount">€${totalSavings.toFixed(0)}</div>
  <div class="label">Estimated annual savings potential</div>
</div>
` : ""}

${savings.map((s) => `
<div class="savings-card">
  <div class="action">${escapeHtml(loc(s.action))}</div>
  <div class="rationale">${escapeHtml(loc(s.rationale))}</div>
  ${s.estimatedAnnualSavingsEur ? `<div class="estimate">Estimated saving: €${s.estimatedAnnualSavingsEur}/year (${Math.round(s.confidence * 100)}% confidence)</div>` : ""}
</div>
`).join("")}

${gaps.length > 0 ? `
<h2>Coverage Gaps Detected (${gaps.length})</h2>
${gaps.map((g) => `
<div class="gap-card ${g.severity || "medium"}">
  <div class="slug">${escapeHtml(g.slug.replace(/_/g, " "))} <span class="badge badge-${g.severity || "medium"}">${escapeHtml(g.severity || "medium")}</span></div>
  ${g.explanation ? `<div class="detail">${escapeHtml(loc(g.explanation))}</div>` : ""}
  ${g.suggestion ? `<div class="detail"><strong>Recommendation:</strong> ${escapeHtml(loc(g.suggestion))}</div>` : ""}
</div>
`).join("")}
` : ""}

${snapshot ? `
<h2>Coverage Snapshot</h2>
${snapshot.covered?.length ? `
<h3>Covered</h3>
<ul class="coverage-list">${(snapshot.covered as string[]).map((c: string) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
` : ""}
${snapshot.notCovered?.length ? `
<h3>Not Covered</h3>
<ul class="coverage-list">${(snapshot.notCovered as string[]).map((c: string) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
` : ""}
${snapshot.exclusions?.length ? `
<h3>Exclusions</h3>
<ul class="coverage-list">${(snapshot.exclusions as string[]).map((c: string) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
` : ""}
` : ""}

<div class="footer">
  ${poweredByBlock}${escapeHtml(getTranslations(language).common.aiAdviceDisclaimer)}
</div>

</body>
</html>`
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}
