#!/usr/bin/env node
/**
 * Regenerate the trigger matrix inside docs/architecture/notification-automation.md
 * from the registry, so the document cannot drift from the code.
 *
 *   node scripts/generate-notification-matrix.mjs
 *
 * A hand-maintained table of 60 triggers is a table that is wrong within a
 * month — and a wrong table about which notifications exist is worse than none,
 * because people plan against it.
 */

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const DOC = "docs/architecture/notification-automation.md"
const START = "<!-- BEGIN GENERATED TRIGGER MATRIX -->"
const END = "<!-- END GENERATED TRIGGER MATRIX -->"

// The registry is TypeScript and this is a plain Node script, so transpile it
// through the esbuild that ships with vite rather than adding a loader. The
// registry imports nothing, which is what makes this safe.
const scratch = mkdtempSync(join(tmpdir(), "pw-notif-"))
const compiled = join(scratch, "registry.mjs")
execFileSync(
    "npx",
    ["esbuild", "lib/notifications/registry.ts", "--format=esm", `--outfile=${compiled}`],
    { stdio: "pipe" }
)
const { NOTIFICATION_EVENTS } = await import(pathToFileURL(compiled).href)

const CATEGORY_ORDER = [
    "risk",
    "policy",
    "advisory",
    "billing",
    "security",
    "engagement",
    "admin",
    "analytics",
]

const CATEGORY_TITLE = {
    risk: "Risk, gaps, score and recommendations",
    policy: "Policy lifecycle and renewals",
    advisory: "Advisor collaboration",
    billing: "Billing and subscription",
    security: "Security",
    engagement: "Engagement",
    admin: "Administrative and escalation",
    analytics: "Analytics mirror (recorded, never delivered)",
}

const cell = (v) => {
    if (v === null || v === undefined) return "—"
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—"
    if (typeof v === "boolean") return v ? "yes" : "no"
    return String(v)
}

const hours = (h) => {
    if (h === null) return "never"
    if (h < 24) return `${h}h`
    return `${Math.round(h / 24)}d`
}

const retry = (r) =>
    r.attempts <= 1 ? "none" : `${r.attempts}× ${r.backoff}, from ${r.baseDelayMinutes}m`

const escalation = (e) => {
    if (!e) return "—"
    const when = e.afterFailures
        ? `${e.afterFailures} failures`
        : `unread ${hours(e.afterUnreadHours)}`
    return `${when} → ${e.notify} (\`${e.event}\`)`
}

let out = []
out.push(START)
out.push("")
out.push(
    `_Generated from \`lib/notifications/registry.ts\` by \`scripts/generate-notification-matrix.mjs\`. Do not edit by hand._`
)
out.push("")

const entries = Object.entries(NOTIFICATION_EVENTS)
const live = entries.filter(([, d]) => d.status === "live").length
const planned = entries.filter(([, d]) => d.status === "planned").length
out.push(`**${entries.length} business events declared — ${live} live, ${planned} planned.**`)
out.push("")

for (const category of CATEGORY_ORDER) {
    const rows = entries.filter(([, d]) => d.category === category)
    if (!rows.length) continue

    out.push(`### ${CATEGORY_TITLE[category]}`)
    out.push("")
    out.push(
        "| Event | Business event | Trigger condition | Priority | Channels | Recipients | Required action | Escalation | Retry | Expires | Audit | Status |"
    )
    out.push("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for (const [key, d] of rows) {
        out.push(
            `| \`${key}\` | ${d.businessEvent} | ${d.triggerCondition} | ${d.priority} | ${cell(d.channels)} | ${cell(d.recipients)} | ${cell(d.requiredAction)} | ${escalation(d.escalation)} | ${retry(d.retry)} | ${hours(d.expiresAfterHours)} | ${d.audit} | ${d.status}${d.transactional ? " · transactional" : ""} |`
        )
    }
    out.push("")
}

const notes = entries.filter(([, d]) => d.note)
if (notes.length) {
    out.push("### Why these rules are what they are")
    out.push("")
    for (const [key, d] of notes) {
        out.push(`- **\`${key}\`** — ${d.note}`)
    }
    out.push("")
}

out.push(END)

const doc = readFileSync(DOC, "utf-8")
const before = doc.slice(0, doc.indexOf(START))
const after = doc.slice(doc.indexOf(END) + END.length)
writeFileSync(DOC, before + out.join("\n") + after)

console.log(`Wrote ${entries.length} triggers (${live} live, ${planned} planned) to ${DOC}`)
