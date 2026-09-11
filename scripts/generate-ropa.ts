/**
 * Generate the Art. 30 record of processing from `prisma/schema.prisma`.
 *
 *   npx tsx scripts/generate-ropa.ts          # write docs/compliance/ROPA.md
 *   npx tsx scripts/generate-ropa.ts --check  # fail if the committed file is stale
 *
 * PW-PROVENANCE-01 W4-01. The record is derived, never written by hand: a
 * migration that adds a personal-data table fails `ropa-tags-complete.test.ts`
 * until it is tagged, and regenerating here picks the tag up. That is the whole
 * point — the previous state of the world was no record at all, and a prose one
 * would have gone stale on the next schema change.
 *
 * What this does NOT produce is a DPIA. It produces the DPIA's inputs: the
 * per-model purpose and basis map, the Art. 9 inventory, and the open questions.
 * The assessment is counsel's (H-P2).
 */

import { readFileSync, writeFileSync } from "node:fs"

import {
    collectRopaTags,
    modelsRequiringTags,
    type RopaTag,
} from "../lib/compliance/ropa-tags"

const SCHEMA_PATH = "prisma/schema.prisma"
const OUT_PATH = "docs/compliance/ROPA.md"

const PURPOSE_LABEL: Record<string, string> = {
    service: "Providing the service — account, policy storage, renewal reminders",
    analysis: "AI analysis of insurance policies and the risk model",
    intermediary: "Sharing information with the intermediary the customer chose",
    billing: "Subscription billing, invoicing and metering",
    security: "Security, authentication and abuse prevention",
    accountability: "Records of consents and GDPR requests",
    communication: "Notifications and email the person asked for",
    unclear: "**Not settled — open question for counsel**",
}

const BASIS_LABEL: Record<string, string> = {
    contract: "Performance of a contract — Art. 6(1)(b)",
    consent: "Consent — Art. 6(1)(a)",
    legal_obligation: "Legal obligation — Art. 6(1)(c)",
    legitimate_interest: "Legitimate interest — Art. 6(1)(f)",
    unclear: "**Not settled — open question for counsel**",
}

const RETENTION_LABEL: Record<string, string> = {
    account_life: "For as long as the account exists; removed on erasure",
    tax_5y: "5 years after the end of the relevant tax year (tax legislation)",
    accountability_5y: "5 years from completion, for accountability",
    technical_12m: "Up to 12 months",
    form_24m: "24 months",
    session: "For the life of the session or challenge",
    advisor_own: "Retained by the intermediary under their own basis",
    unclear: "**Not settled — open question for counsel**",
}

const ERASURE_LABEL: Record<string, string> = {
    delete: "Deleted",
    anonymize: "Anonymised in place",
    retained: "Deliberately retained, with a documented basis",
    cascade: "Removed with its parent",
}

function table(rows: string[][], headers: string[]): string {
    const head = `| ${headers.join(" | ")} |`
    const rule = `| ${headers.map(() => "---").join(" | ")} |`
    return [head, rule, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n")
}

function render(tags: RopaTag[], required: string[], untagged: string[]): string {
    const byPurpose = new Map<string, RopaTag[]>()
    for (const t of tags) {
        if (!byPurpose.has(t.purpose)) byPurpose.set(t.purpose, [])
        byPurpose.get(t.purpose)!.push(t)
    }

    const art9 = tags.filter((t) => t.art9.length > 0)
    const unclear = tags.filter((t) => t.purpose === "unclear" || t.basis === "unclear")

    const sections: string[] = []

    sections.push(`# Record of processing activities (GDPR Art. 30)

> **Generated from \`prisma/schema.prisma\` — do not edit by hand.**
> Regenerate with \`npx tsx scripts/generate-ropa.ts\`. A model that holds personal
> data and carries no \`@ropa\` tag fails \`tests/unit/ropa-tags-complete.test.ts\`,
> so this record cannot silently fall behind the database.

**Controller:** Insurance Martech IKE (ΓΕΜΗ 188863359000, ΑΦΜ 302659440, ΔΟΥ Χίου),
Kalamoti, 82102, Chios, Greece · **Privacy contact:** dpo@policywallet.gr

**Covers ${tags.length} of ${required.length} models holding personal data.**
Recipients, transfers and security measures are in
[DATA_PROTECTION_REVIEW_PACK.md](DATA_PROTECTION_REVIEW_PACK.md) §8, §9 and §13 —
they are properties of the deployment, not of a table, so they are not generated here.`)

    sections.push(`## 1. Processing activities, by purpose`)
    for (const [purpose, group] of [...byPurpose].sort()) {
        sections.push(`### ${PURPOSE_LABEL[purpose] ?? purpose}

${table(
            group
                .sort((a, b) => a.model.localeCompare(b.model))
                .map((t) => [
                    `\`${t.model}\``,
                    BASIS_LABEL[t.basis] ?? t.basis,
                    t.subjects.join(", "),
                    RETENTION_LABEL[t.retention] ?? t.retention,
                    ERASURE_LABEL[t.erasure] ?? t.erasure,
                ]),
            ["Store", "Lawful basis", "Data subjects", "Retention", "On erasure"]
        )}`)
    }

    sections.push(`## 2. Special categories of personal data (Art. 9)

${
        art9.length === 0
            ? "No model declares Art. 9 columns."
            : `Processed only on explicit consent — Art. 9(2)(a). The guard refuses any tag that names
Art. 9 columns under another basis.

${table(
                  art9.map((t) => [
                      `\`${t.model}\``,
                      t.art9.map((f) => `\`${f}\``).join(", "),
                      BASIS_LABEL[t.basis] ?? t.basis,
                  ]),
                  ["Store", "Columns", "Lawful basis"]
              )}

**This table is not the whole Art. 9 surface.** It covers the structured columns a
person answers directly. The wider exposure is whatever a health policy PDF
contains — medical annexes, exclusions naming conditions, ΑΜΚΑ — which is
unbounded by design, because the document is not parsed into columns. See
DATA_PROTECTION_REVIEW_PACK.md §3.2b and §7.`
    }`)

    sections.push(`## 3. Open questions

${
        unclear.length === 0
            ? "No model carries `unclear` for purpose or basis."
            : `These stores are tagged \`unclear\` rather than given an invented answer. Each needs
a decision before this record is complete.

${table(
                  unclear.map((t) => [
                      `\`${t.model}\``,
                      t.purpose === "unclear" ? "**purpose**" : "purpose settled",
                      t.basis === "unclear" ? "**basis**" : "basis settled",
                  ]),
                  ["Store", "Purpose", "Basis"]
              )}`
    }

${
        untagged.length === 0
            ? ""
            : `**Untagged models holding personal data (the guard should be red):** ${untagged
                  .map((m) => `\`${m}\``)
                  .join(", ")}`
    }`)

    sections.push(`## 4. What this record is not

It is not a DPIA. It supplies a DPIA's inputs — the per-store purpose and basis
map, the Art. 9 inventory, and the open questions above — and nothing more. The
assessment under Art. 35 is a legal judgement and is recorded as a halt in
\`docs/provenance/HALTS.md\` (H-P2).

It also does not evidence that the stated bases are correct. It evidences that
someone recorded one for every store, that the record matches the schema today,
and that a new store cannot be added without answering the question.`)

    return sections.join("\n\n") + "\n"
}

function main() {
    const schema = readFileSync(SCHEMA_PATH, "utf-8")
    const { tags, errors, untagged } = collectRopaTags(schema)

    if (errors.length > 0) {
        console.error("Malformed @ropa tags — fix these before generating:")
        for (const e of errors) console.error(`  ${e.model}: ${e.problem}`)
        process.exit(1)
    }

    const required = modelsRequiringTags(schema)
    const missing = untagged.filter((m) => required.includes(m))
    const output = render(tags, required, missing)

    if (process.argv.includes("--check")) {
        let current = ""
        try {
            current = readFileSync(OUT_PATH, "utf-8")
        } catch {
            console.error(`${OUT_PATH} does not exist. Run: npx tsx scripts/generate-ropa.ts`)
            process.exit(1)
        }
        if (current !== output) {
            console.error(
                `${OUT_PATH} is stale — the schema changed since it was generated.\n` +
                    `Run: npx tsx scripts/generate-ropa.ts`
            )
            process.exit(1)
        }
        console.log(`${OUT_PATH} is up to date (${tags.length} tagged stores).`)
        return
    }

    writeFileSync(OUT_PATH, output)
    console.log(
        `Wrote ${OUT_PATH} — ${tags.length} tagged stores, ${missing.length} untagged, ` +
            `${tags.filter((t) => t.art9.length > 0).length} with Art. 9 columns.`
    )
}

main()
