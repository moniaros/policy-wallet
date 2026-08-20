/**
 * Generate the severity review packet — the document Gate 3b has been waiting on.
 *
 *   npx tsx scripts/gen-severity-review-packet.ts [--out docs/reviews/severity-packet.md]
 *
 * Gate 3b is "an underwriter validates the severity thresholds and labels". It
 * has been open since Phase 3, and the reason is not that nobody wanted to close
 * it: there was nothing to hand anyone. An underwriter cannot validate a Postgres
 * table, and asking them to read TypeScript is asking the wrong person.
 *
 * This reads the LIVE catalogue from the database — not the seed file — because
 * an admin can edit a definition and the packet must describe what is actually
 * running. It states, for every active rule: what question the rule asks of the
 * document, which fields it reads, the severity being PROPOSED, and the exact
 * words the customer sees. Then it leaves a line to sign.
 *
 * Recording the answer is a per-definition UPDATE:
 *
 *   UPDATE gap_definitions
 *      SET severity = 'high',                        -- if they change it
 *          severity_validated_at = now(),
 *          severity_validated_by = 'Name, ΕΙΑΣ reg. …',
 *          severity_rationale = 'why this and not medium'
 *    WHERE slug = 'no_earthquake_cover';
 *
 * Nothing here signs anything off. It makes signing off possible.
 */
import { db } from "../lib/db"
import { writeFileSync } from "node:fs"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"

type Rule = Record<string, any>

/** The question a rule asks of a document, in words an underwriter reads. */
function describeRule(rule: Rule): { question: string; fields: string[]; firesOnSilence: boolean } {
    const fields: string[] = Array.isArray(rule.fields)
        ? rule.fields
        : typeof rule.field === "string"
          ? [rule.field]
          : []

    if (rule.type === "date_within_days") {
        return {
            question: `Does **${rule.field}** fall within the next ${rule.withinDays ?? 30} days?`,
            fields,
            firesOnSilence: false,
        }
    }

    if (rule.type === "acord_field_check") {
        switch (rule.operator) {
            case "is_false":
                return {
                    question: `Does the document explicitly state that **${rule.field}** is NOT included?`,
                    fields,
                    firesOnSilence: false,
                }
            case "is_true":
            case "truthy":
                return { question: `Is **${rule.field}** explicitly true?`, fields, firesOnSilence: false }
            case "missing":
                return {
                    question: `Was **${rule.field}** recorded anywhere in the document?  \n  _Fires when it was NOT — i.e. on silence. The finding must say "not recorded", never "not covered"._`,
                    fields,
                    firesOnSilence: true,
                }
            case "all_missing":
                return {
                    question: `Were **all** of these absent: ${fields.map((f) => `\`${f}\``).join(", ")}?  \n  _Fires on silence across every path._`,
                    fields,
                    firesOnSilence: true,
                }
            case "all_false":
                return {
                    question: `Is at least one of these explicitly NOT included: ${fields.map((f) => `\`${f}\``).join(", ")}?`,
                    fields,
                    firesOnSilence: false,
                }
            case "less_than":
                return {
                    question: `Is **${rule.field}** below ${rule.value}?  \n  ⚠️ _A threshold — this IS an underwriting judgement, not a reading of the document._`,
                    fields,
                    firesOnSilence: false,
                }
            default:
                return { question: `\`${rule.operator}\` on **${rule.field}**`, fields, firesOnSilence: false }
        }
    }

    return { question: `Rule type \`${rule.type}\` — see lib/gap-detection.ts`, fields, firesOnSilence: false }
}

function rulesOf(detectionLogic: any): Rule[] {
    if (Array.isArray(detectionLogic?.rules)) return detectionLogic.rules
    return detectionLogic ? [detectionLogic] : []
}

async function main() {
    const outFlag = process.argv.indexOf("--out")
    const outPath =
        outFlag !== -1 && process.argv[outFlag + 1]
            ? process.argv[outFlag + 1]
            : "docs/reviews/severity-review-packet.md"

    const definitions = await db.gapDefinition.findMany({
        where: { isActive: true },
        orderBy: [{ lineOfBusiness: "asc" }, { slug: "asc" }],
    })

    const validated = definitions.filter((d: any) => d.severityValidatedAt)
    const pending = definitions.filter((d: any) => !d.severityValidatedAt)

    const lines: string[] = []
    const stamp = new Date().toISOString().slice(0, 10)

    lines.push(`# Severity review packet`)
    lines.push(`**Generated ${stamp} from the live catalogue — do not edit by hand.**`)
    lines.push(``)
    lines.push(
        `Regenerate with \`npx tsx scripts/gen-severity-review-packet.ts\`. It reads the ` +
            `database, so it always describes the rules that are actually running.`
    )
    lines.push(``)
    lines.push(`## What is being asked`)
    lines.push(``)
    lines.push(
        `PolicyWallet decides **whether** a coverage gap exists with a rule that reads named ` +
            `fields of the policy document. That part is a question of fact, and it is traced ` +
            `against fixtures before it ships.`
    )
    lines.push(``)
    lines.push(
        `**How serious the gap is** — \`low\` / \`medium\` / \`high\` / \`critical\` — is not a ` +
            `question of fact. It is an underwriting judgement, and nobody qualified has made it. ` +
            `Until someone does, every screen that names a severity also carries a line saying it ` +
            `is not a definitive risk assessment.`
    )
    lines.push(``)
    lines.push(`For each rule below, please confirm or change:`)
    lines.push(``)
    lines.push(`1. **Is the severity right?** If not, what should it be?`)
    lines.push(`2. **Is the wording defensible** to a policyholder who disputes it?`)
    lines.push(`3. **Should the rule exist at all?**`)
    lines.push(``)
    lines.push(
        `A "no" to (3) is a useful answer and costs nothing — a rule can be deactivated in one ` +
            `statement.`
    )
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
    lines.push(`## Status`)
    lines.push(``)
    lines.push(`| | Count |`)
    lines.push(`|---|---|`)
    lines.push(`| Active definitions | **${definitions.length}** |`)
    lines.push(`| Severity validated | **${validated.length}** |`)
    lines.push(`| Awaiting review | **${pending.length}** |`)
    lines.push(``)

    if (validated.length > 0) {
        lines.push(`### Already validated`)
        lines.push(``)
        lines.push(`| Slug | Severity | By | When | Rationale |`)
        lines.push(`|---|---|---|---|---|`)
        for (const d of validated as any[]) {
            lines.push(
                `| \`${d.slug}\` | ${d.severity} | ${d.severityValidatedBy ?? "—"} | ` +
                    `${new Date(d.severityValidatedAt).toISOString().slice(0, 10)} | ` +
                    `${(d.severityRationale ?? "—").replace(/\n/g, " ")} |`
            )
        }
        lines.push(``)
    }

    lines.push(`---`)
    lines.push(``)
    lines.push(`## Rules awaiting review`)
    lines.push(``)

    let branch = ""
    for (const d of pending as any[]) {
        if (d.lineOfBusiness !== branch) {
            branch = d.lineOfBusiness
            lines.push(`### ${branch}`)
            lines.push(``)
        }

        const rules = rulesOf(d.detectionLogic)
        const described = rules.map(describeRule)
        const firesOnSilence = described.some((r) => r.firesOnSilence)

        lines.push(`#### \`${d.slug}\` — proposed severity: **${d.severity}**`)
        lines.push(``)
        lines.push(`**What the customer sees**`)
        lines.push(``)
        lines.push(`> **${d.title}**`)
        lines.push(`>`)
        lines.push(`> ${d.description}`)
        lines.push(``)
        lines.push(`**What the rule asks**`)
        lines.push(``)
        for (const r of described) lines.push(`- ${r.question}`)
        lines.push(``)
        const fields = [...new Set(described.flatMap((r) => r.fields))]
        if (fields.length > 0) {
            lines.push(`**Fields read:** ${fields.map((f) => `\`${f}\``).join(", ")}`)
            lines.push(``)
        }
        if (firesOnSilence) {
            lines.push(
                `> ⚠️ This rule fires when the value was **not recorded**, which is not the same ` +
                    `as the cover being absent. Please check the wording above says so.`
            )
            lines.push(``)
        }
        lines.push(`**Decision**`)
        lines.push(``)
        lines.push(`- Severity: ☐ agree \`${d.severity}\`  ☐ change to \`________\`  ☐ remove the rule`)
        lines.push(`- Wording: ☐ acceptable  ☐ change to: ________`)
        lines.push(`- Reviewer: ________________________  Date: __________`)
        lines.push(`- Reasoning: ________________________________________`)
        lines.push(``)
        lines.push(`---`)
        lines.push(``)
    }

    if (pending.length === 0) {
        lines.push(`_Nothing awaiting review — every active definition has been validated._`)
        lines.push(``)
    }

    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, lines.join("\n"), "utf8")

    console.log(`Severity review packet written to ${outPath}`)
    console.log(`  active: ${definitions.length}   validated: ${validated.length}   pending: ${pending.length}`)
    if (pending.length > 0) {
        console.log(`\nGate 3b stays OPEN until an underwriter returns this. Recording an answer:`)
        console.log(`  UPDATE gap_definitions SET severity_validated_at = now(),`)
        console.log(`         severity_validated_by = '…', severity_rationale = '…'`)
        console.log(`   WHERE slug = '…';`)
    }
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await db.$disconnect()
    })
