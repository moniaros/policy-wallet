/**
 * Savings Report Generator
 *
 * Deterministic HTML generation for savings report export (Pro feature).
 * Produces a print-ready HTML page from analysis result JSON.
 * Users can print to PDF via browser (Ctrl+P / Cmd+P).
 */

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

export function generateSavingsReportHtml(
    resultJson: Record<string, any>,
    generatedAt: string
): string {
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
            return new Date(iso).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })
        } catch {
            return iso
        }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Savings Report — ${escapeHtml(metadata.policyNumber || "Policy")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
  h1 { font-size: 24px; margin-bottom: 4px; color: #16213e; }
  h2 { font-size: 18px; margin: 28px 0 12px; color: #16213e; border-bottom: 2px solid #e8e8f0; padding-bottom: 6px; }
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

<h1>Savings &amp; Coverage Report</h1>
<p class="subtitle">Generated ${formatDate(generatedAt)} by PolicyWallet</p>

<div class="meta-grid">
  <span class="meta-label">Insurer</span><span class="meta-value">${escapeHtml(metadata.insurerName || "—")}</span>
  <span class="meta-label">Policy Number</span><span class="meta-value">${escapeHtml(metadata.policyNumber || "—")}</span>
  <span class="meta-label">Type</span><span class="meta-value">${escapeHtml(metadata.lineOfBusiness || "—")}</span>
  <span class="meta-label">Period</span><span class="meta-value">${escapeHtml(metadata.startDate?.split("T")[0] || "—")} to ${escapeHtml(metadata.endDate?.split("T")[0] || "—")}</span>
  <span class="meta-label">Premium</span><span class="meta-value">${metadata.premiumAmount != null ? `€${Number(metadata.premiumAmount).toFixed(2)}` : "—"}</span>
</div>

${summary ? `<h2>Summary</h2><p style="font-size:14px">${escapeHtml(localized(summary))}</p>` : ""}

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
  <div class="action">${escapeHtml(localized(s.action))}</div>
  <div class="rationale">${escapeHtml(localized(s.rationale))}</div>
  ${s.estimatedAnnualSavingsEur ? `<div class="estimate">Estimated saving: €${s.estimatedAnnualSavingsEur}/year (${Math.round(s.confidence * 100)}% confidence)</div>` : ""}
</div>
`).join("")}

${gaps.length > 0 ? `
<h2>Coverage Gaps Detected (${gaps.length})</h2>
${gaps.map((g) => `
<div class="gap-card ${g.severity || "medium"}">
  <div class="slug">${escapeHtml(g.slug.replace(/_/g, " "))} <span class="badge badge-${g.severity || "medium"}">${escapeHtml(g.severity || "medium")}</span></div>
  ${g.explanation ? `<div class="detail">${escapeHtml(localized(g.explanation))}</div>` : ""}
  ${g.suggestion ? `<div class="detail"><strong>Recommendation:</strong> ${escapeHtml(localized(g.suggestion))}</div>` : ""}
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
  This report was generated automatically by PolicyWallet based on AI analysis of your insurance policy document.
  It is provided for informational purposes only and does not constitute insurance advice.
  Always consult a licensed insurance professional before making coverage decisions.
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
