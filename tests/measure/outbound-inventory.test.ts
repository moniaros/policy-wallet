/**
 * OUTBOUND COPY — the metric half of T-013 (§5.5.4).
 *
 * §2.2's worst violation is invisible from the UI because it lives in email, so
 * the leakage and locale metrics have to run against RENDERED TEMPLATE TEXT, not
 * against a DOM. That is why T-011 split `findInternalTokens` / `findLatinSentences`
 * out of their Page wrappers: this file imports the SAME definitions the surface
 * baselines use, so an outbound number and a surface number mean the same thing.
 * Copying a regex in here instead would have made the two incomparable (§5.1).
 *
 * Nothing here dispatches. The templates are pure functions returning
 * `{ subject, html }`, and `lib/outbound/dispatch-guard.ts` would throw under
 * vitest if anything reached a transport.
 *
 * This is a MEASUREMENT, not a guard — it reports rather than asserts, and writes
 * its report to docs/transformation/evidence/outbound/METRICS.md. The guard that
 * asserts zero comes in Phase 1 (P1-01), by extending score-containment.test.ts.
 *
 * Run explicitly:  npx vitest --run tests/measure/outbound-inventory.test.ts
 */

import { describe, it, vi } from "vitest"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { findInternalTokens, findLatinSentences } from "./metrics"

import { getWeeklyDigestEmail } from "@/lib/email/templates/weekly-digest"
import { getWelcomeEmail, getDay3Email, getDay7Email } from "@/lib/email/templates/engagement-drip"
import {
    getChurnDay7Email,
    getChurnDay14Email,
    getChurnDay30Email,
    getChurnDay60Email,
} from "@/lib/email/templates/churn-prevention"
import { buildNotificationEmail } from "@/lib/mail-templates"

/** HTML → the text a reader actually sees. */
function toText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * A percentage presented as a protection score. Deliberately narrow — a bare
 * "45%" elsewhere in an email is not necessarily the score, so this looks for the
 * label too, in either language, within a short window of the number.
 */
function findScoreRenders(text: string): string[] {
    const out: string[] = []
    const re = /(\d{1,3})\s*%/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
        const window = text.slice(Math.max(0, m.index - 80), m.index + 80)
        if (/Βαθμολογία προστασίας|Protection score|σκορ προστασίας|protection score/i.test(window)) {
            out.push(`${m[0]} — "${window.trim()}"`)
        }
    }
    return out
}

/**
 * The state that matters: policies exist, nothing has been analysed. Before
 * P1-01 this fixture carried `healthScore: 100` — the exact value
 * `provisionalProtectionScore` produced for an unread portfolio, and the one
 * these templates mailed out. The score fields no longer exist on the template
 * contracts; the fixture keeps the same portfolio state so the metric keeps
 * measuring the same situation.
 */
const NEVER_ANALYSED = { policyCount: 3, gapCount: 0, analysedPolicyCount: 0 }

const TEMPLATES: { name: string; render: () => { subject: string; html: string } }[] = [
    {
        name: "weekly-digest (never-analysed portfolio)",
        render: () =>
            getWeeklyDigestEmail("el", "Νίκος", {
                renewingSoon: [],
                newGaps: 0,
                unreadMessages: 0,
            }),
    },
    { name: "drip: welcome", render: () => getWelcomeEmail("el", "Νίκος") },
    { name: "drip: day 3", render: () => getDay3Email("el", "Νίκος") },
    { name: "drip: day 7 (never-analysed portfolio)", render: () => getDay7Email("el", "Νίκος", NEVER_ANALYSED) },
    { name: "churn: day 7", render: () => getChurnDay7Email({ name: "Νίκος", language: "el" }) },
    { name: "churn: day 14", render: () => getChurnDay14Email({ name: "Νίκος", language: "el" }) },
    { name: "churn: day 30", render: () => getChurnDay30Email({ name: "Νίκος", language: "el" }) },
    { name: "churn: day 60", render: () => getChurnDay60Email({ name: "Νίκος", language: "el" }) },
    {
        name: "notification shell (unresolved identity)",
        // Since P1-07 the shell THROWS on this payload outside production
        // (§6.1.3 — dev and test fail loudly; the guard for that lives in
        // tests/unit/policy-sentinels-unrenderable.test.tsx). This file
        // measures what a CUSTOMER receives, so it renders under production
        // semantics: the shell scrubs the unresolved identity and sends the
        // clean copy.
        render: () => {
            vi.stubEnv("NODE_ENV", "production")
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
            try {
                return buildNotificationEmail({
                    title: "Η ανάλυση ολοκληρώθηκε",
                    message: "PENDING-1786738708923 (__PENDING_EXTRACTION__)",
                    relatedObjectType: "policy",
                    relatedObjectId: "e2e-mot-001",
                    language: "el",
                })
            } finally {
                consoleError.mockRestore()
                vi.unstubAllEnvs()
            }
        },
    },
]

describe("outbound copy inventory", () => {
    it("renders every B2C template and measures it", () => {
        const rows: string[] = []
        let totals = { score: 0, tokens: 0, latin: 0 }

        for (const t of TEMPLATES) {
            let subject = "", html = ""
            try {
                ;({ subject, html } = t.render())
            } catch (error) {
                rows.push(`### ${t.name}\n\n**RENDER FAILED:** \`${String(error)}\`\n`)
                continue
            }

            const text = `${subject} ${toText(html)}`
            const score = findScoreRenders(text)
            const tokens = findInternalTokens(text)
            const latin = findLatinSentences(text)

            totals.score += score.length
            totals.tokens += tokens.length
            totals.latin += latin.length

            rows.push(
                `### ${t.name}\n\n` +
                    `- subject: «${subject}»\n` +
                    `- rendered length: ${text.length} chars\n` +
                    `- **score renders: ${score.length}**${score.length ? "\n" + score.map((s) => `  - ${s}`).join("\n") : ""}\n` +
                    `- **internal tokens: ${tokens.length}**${tokens.length ? "\n" + tokens.map((s) => `  - \`${s}\``).join("\n") : ""}\n` +
                    `- **Latin-script sentences: ${latin.length}**${latin.length ? "\n" + latin.map((s) => `  - "${s}"`).join("\n") : ""}\n`
            )
        }

        const report =
            `# Outbound copy — measured (T-013 metric half)\n\n` +
            `Generated by \`tests/measure/outbound-inventory.test.ts\`, using the SAME\n` +
            `\`findInternalTokens\` / \`findLatinSentences\` definitions the surface baselines use\n` +
            `(\`tests/measure/metrics.ts\`), so these numbers are comparable with the DOM ones.\n\n` +
            `Locale under test: \`el\`. Portfolio state: **policies exist, nothing analysed** —\n` +
            `the state in which \`provisionalProtectionScore\` returns 100.\n\n` +
            `## Totals\n\n` +
            `| metric | count |\n|---|---|\n` +
            `| score renders in outbound | **${totals.score}** |\n` +
            `| internal-token leaks | **${totals.tokens}** |\n` +
            `| Latin-script sentences in \`el\` output | **${totals.latin}** |\n\n` +
            `Target after Phase 1 (P1-01, P1-02, P1-05): **0 / 0 / 0**.\n\n---\n\n` +
            rows.join("\n")

        const dir = join(process.cwd(), "docs/transformation/evidence/outbound")
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, "METRICS.md"), report, "utf-8")

        console.log(`\n[outbound] score=${totals.score} tokens=${totals.tokens} latin=${totals.latin}`)
    })
})
