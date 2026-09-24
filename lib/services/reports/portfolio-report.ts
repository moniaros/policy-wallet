import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { formatDate, formatDateTime } from "@/lib/i18n/format"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { displayInsurerName, policyLabel } from "@/lib/wallet/policy-identity"

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export interface PortfolioPolicyInput {
    id: string
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    status: string
    endDate: Date | null
    premiumAmount: unknown
    premiumCurrency: string | null
    nickname: string | null
    acordData: unknown
}

/**
 * Spec v2 §15 «export portfolio»: one printable page of the wallet — identity
 * through lib/wallet/policy-identity, status and expiry through ONE
 * resolvePolicyLifecycle call per row, premium as the row states it. HTML the
 * browser prints to PDF, the same shape as the savings report; nothing here
 * that a wallet row does not already show.
 */
export function generatePortfolioReportHtml(policies: PortfolioPolicyInput[], language: "el" | "en", generatedAt: Date, copy: {
    title: string; generated: string; policy: string; insurer: string; branch: string; status: string; expires: string; premium: string; empty: string; footer: string
}): string {
    const locale = language === "el" ? "el-GR" : "en-GB"
    const date = (d: Date | null) => (d ? formatDate(d, language) : "—")
    const money = (v: unknown, cur: string | null) => {
        const n = typeof v === "number" ? v : v == null ? NaN : Number(v)
        return Number.isFinite(n) ? new Intl.NumberFormat(locale, { style: "currency", currency: cur || "EUR" }).format(n) : "—"
    }
    const rows = policies.map((p) => {
        const lc = resolvePolicyLifecycle(p)
        const branch = normalizeBranch(p.lineOfBusiness)
        return `<tr><td>${esc(p.nickname || policyLabel(p, branch.label[language]))}</td><td>${esc(displayInsurerName(p.insurerName) ?? "—")}</td><td>${esc(branch.label[language])}</td><td>${esc(lc.status)}</td><td>${esc(date(lc.endDate))}</td><td>${esc(money(p.premiumAmount, p.premiumCurrency))}</td></tr>`
    }).join("")
    return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>${esc(copy.title)}</title>
<style>body{font-family:system-ui,sans-serif;margin:32px;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin-top:16px;font-size:13px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{font-weight:600}p.meta{color:#555;font-size:12px}@media print{button{display:none}}</style></head>
<body><h1>${esc(copy.title)}</h1><p class="meta">${esc(copy.generated.replace("{when}", formatDateTime(generatedAt, language)))}</p>
${policies.length === 0 ? `<p>${esc(copy.empty)}</p>` : `<table><thead><tr><th>${esc(copy.policy)}</th><th>${esc(copy.insurer)}</th><th>${esc(copy.branch)}</th><th>${esc(copy.status)}</th><th>${esc(copy.expires)}</th><th>${esc(copy.premium)}</th></tr></thead><tbody>${rows}</tbody></table>`}
<p class="meta">${esc(copy.footer)}</p><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300))</script></body></html>`
}
