/**
 * The generated compliance documents: the Art. 30 record (W4-01) and the DPIA
 * input pack (W4-02), rendered from the schema, the published subprocessor list
 * and the AI provider services. PW-PROVENANCE-01.
 *
 * Everything here is DERIVED. Exactly two things are authored, and both are
 * closed maps that throw rather than omit: PROCESSOR_FEEDS (which ROPA purposes
 * reach which published processor, and whether the document itself does) and
 * PROVIDER_FILES (which provider service is which published row). A processor
 * with no feed entry, or a provider service with no published row, stops the
 * generator instead of producing a pack that silently leaves it out.
 *
 * `tests/unit/generated-compliance-docs-current.test.ts` fails when a committed
 * document differs from what this module renders today — the staleness the
 * `--check` flag detects, but enforced in CI rather than on request.
 */

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { getLegalContent } from "@/lib/legal/legal-content"

import {
    collectRopaTags,
    enumNames,
    modelBlocks,
    modelColumns,
    modelsRequiringTags,
    subjectKeyFields,
    type RopaPurpose,
    type RopaTag,
} from "./ropa-tags"

export const SCHEMA_PATH = "prisma/schema.prisma"
export const ROPA_PATH = "docs/compliance/ROPA.md"
export const DPIA_INPUTS_PATH = "docs/compliance/DPIA-INPUTS.md"
const AI_SERVICES_DIR = "lib/services/ai"

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

const code = (s: string) => `\`${s}\``

// ── The Art. 30 record ────────────────────────────────────────────────────────

function parsed(schema: string) {
    const { tags, errors, untagged } = collectRopaTags(schema)
    if (errors.length > 0) {
        throw new Error(
            "Malformed @ropa tags — fix these before generating:\n" +
                errors.map((e) => `  ${e.model}: ${e.problem}`).join("\n")
        )
    }
    const required = modelsRequiringTags(schema)
    const missing = untagged.filter((m) => required.includes(m))
    return { tags: tags.sort((a, b) => a.model.localeCompare(b.model)), required, missing }
}

export function renderRopa(schema: string): string {
    const { tags, required, missing: untagged } = parsed(schema)
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
> and a committed record that no longer matches the schema fails
> \`tests/unit/generated-compliance-docs-current.test.ts\`, so this record cannot
> silently fall behind the database.

**Controller:** Insurance Martech IKE (ΓΕΜΗ 188863359000, ΑΦΜ 302659440, ΔΟΥ Χίου),
Kalamoti, 82102, Chios, Greece · **Privacy contact:** dpo@policywallet.gr

**Covers ${tags.length} of ${required.length} models holding personal data.**
Recipients and transfers are generated alongside this record in
[DPIA-INPUTS.md](DPIA-INPUTS.md) §3; security measures are in
[DATA_PROTECTION_REVIEW_PACK.md](DATA_PROTECTION_REVIEW_PACK.md) §13 — they are
properties of the deployment, not of a table, so they are not generated here.`)

    sections.push(`## 1. Processing activities, by purpose`)
    for (const [purpose, group] of [...byPurpose].sort()) {
        sections.push(`### ${PURPOSE_LABEL[purpose] ?? purpose}

${table(
            group.map((t) => [
                code(t.model),
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
                  art9.map((t) => [code(t.model), t.art9.map(code).join(", "), BASIS_LABEL[t.basis] ?? t.basis]),
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
                      code(t.model),
                      t.purpose === "unclear" ? "**purpose**" : "purpose settled",
                      t.basis === "unclear" ? "**basis**" : "basis settled",
                  ]),
                  ["Store", "Purpose", "Basis"]
              )}`
    }

${
        untagged.length === 0
            ? ""
            : `**Untagged models holding personal data (the guard should be red):** ${untagged.map(code).join(", ")}`
    }`)

    sections.push(`## 4. What this record is not

It is not a DPIA. It supplies a DPIA's inputs — the per-store purpose and basis
map, the Art. 9 inventory, and the open questions above — and nothing more. The
assessment under Art. 35 is a legal judgement and is recorded as a halt in
\`docs/provenance/HALTS.md\` (H-P2). The fuller input pack — every column, the
Art. 9 routes and the transfer table — is [DPIA-INPUTS.md](DPIA-INPUTS.md).

It also does not evidence that the stated bases are correct. It evidences that
someone recorded one for every store, that the record matches the schema today,
and that a new store cannot be added without answering the question.`)

    return sections.join("\n\n") + "\n"
}

// ── The DPIA input pack ───────────────────────────────────────────────────────

/**
 * Which ROPA purposes reach each PUBLISHED processor, and whether the uploaded
 * document itself does. Authored — the one judgement in this file — and closed:
 * a row on /subprocessors with no entry here throws.
 */
interface Feed {
    purposes: RopaPurpose[] | "all"
    documents: boolean
    how: string
}

const PROCESSOR_FEEDS: Record<string, Feed> = {
    Supabase: {
        purposes: "all",
        documents: true,
        how: "primary store of every table and of the document bucket",
    },
    Vercel: {
        purposes: "all",
        documents: true,
        how: "every request and response passes through it in transit; technical logs",
    },
    Stripe: {
        purposes: ["billing"],
        documents: false,
        how: "checkout, subscription and invoice objects; card data never reaches our systems",
    },
    Brevo: {
        purposes: ["communication"],
        documents: false,
        how: "the address, name and body of each email sent",
    },
    Upstash: {
        purposes: [],
        documents: false,
        how: "per-IP request counters for rate limiting — no store feeds it",
    },
    Sentry: {
        purposes: [],
        documents: false,
        how: "error events with personal data scrubbed — no store feeds it",
    },
    "Google (Gemini API)": {
        purposes: ["analysis"],
        documents: true,
        how: "the WHOLE uploaded file, base64, at the extraction step; structured fields at the later model steps (DATA_PROTECTION_REVIEW_PACK.md §7)",
    },
    "Google (Google Analytics)": {
        purposes: [],
        documents: false,
        how: "aggregate usage events with the IP anonymised, only after opt-in — no store feeds it",
    },
    Anthropic: {
        purposes: ["analysis"],
        documents: true,
        how: "alternate provider: the same payload as the primary whenever the router selects it; a document reaches a second provider only under the failover gate (§7)",
    },
    OpenAI: {
        purposes: ["analysis"],
        documents: true,
        how: "alternate provider: the same payload as the primary whenever the router selects it; a document reaches a second provider only under the failover gate (§7)",
    },
}

/** Which provider service is which published row. Closed: an unmapped service throws. */
const PROVIDER_FILES: Record<string, string> = {
    "gemini-ai.service.ts": "Google (Gemini API)",
    "anthropic-ai.service.ts": "Anthropic",
    "openai-ai.service.ts": "OpenAI",
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

export interface ProviderClientFact {
    file: string
    provider: string
    /** Option keys passed to the SDK's `create…({ … })` — `apiKey` alone means the SDK default endpoint. */
    optionKeys: string[]
}

/** How each AI client is constructed — read from the provider services, comments stripped. */
export function readProviderClientFacts(dir: string = AI_SERVICES_DIR): ProviderClientFact[] {
    const files = readdirSync(dir)
        .filter((f) => /-ai\.service\.ts$/.test(f) && !f.startsWith("mock-"))
        .sort()
    return files.map((file) => {
        const provider = PROVIDER_FILES[file]
        if (!provider) {
            throw new Error(
                `${dir}/${file}: a provider service with no published subprocessor row — ` +
                    `add it to PROVIDER_FILES here and to /subprocessors (lib/legal/legal-content.ts)`
            )
        }
        const src = stripComments(readFileSync(join(dir, file), "utf-8"))
        const calls = [...src.matchAll(/create[A-Z]\w*\(\s*\{([^}]*)\}\s*\)/g)]
        const optionKeys = [...new Set(calls.flatMap((m) => [...m[1].matchAll(/(\w+)\s*:/g)].map((k) => k[1])))].sort()
        return { file, provider, optionKeys }
    })
}

const PINNING_KEYS = /^(baseURL|baseUrl|location|region)$/

/** The endpoint sentence for one provider, derived from its constructor options. */
export function endpointFact(fact: ProviderClientFact): string {
    if (fact.optionKeys.length === 0) return `no client constructor found in ${code(fact.file)}`
    const keys = fact.optionKeys.map(code).join(", ")
    return fact.optionKeys.some((k) => PINNING_KEYS.test(k))
        ? `options ${keys} — an endpoint or region is set in code (${code(fact.file)})`
        : `options ${keys} — SDK default endpoint (global), no region, no retention option in code (${code(fact.file)})`
}

/** The subprocessor rows exactly as the public page renders them (English). */
export function readPublishedSubprocessors(): string[][] {
    const section = getLegalContent("en").subprocessors.sections.find((s) => s.id === "subprocessor_list")
    if (!section?.table) throw new Error("lib/legal/legal-content.ts: the subprocessor_list section has no table")
    return section.table.rows
}

const EEA_ONLY = /^EU( —|\s\()/

export interface DpiaInputs {
    schema: string
    providers: ProviderClientFact[]
    subprocessors: string[][]
}

export function renderDpiaInputs({ schema, providers, subprocessors }: DpiaInputs): string {
    const { tags, required } = parsed(schema)
    const enums = enumNames(schema)
    const bodies = new Map(modelBlocks(schema).map((b) => [b.name, b.body]))
    const tagged = new Map(tags.map((t) => [t.model, t]))

    const storesByPurpose = (purposes: RopaPurpose[] | "all") =>
        purposes === "all" ? tags : tags.filter((t) => purposes.includes(t.purpose))

    // Per-column map
    let columnCount = 0
    let art9Count = 0
    const perModel: string[] = []
    for (const t of tags) {
        const body = bodies.get(t.model) ?? ""
        const subjectKeys = subjectKeyFields(body)
        const columns = modelColumns(body, enums)
        columnCount += columns.length
        const rows = columns.map((c) => {
            const cls = t.art9.includes(c.name)
                ? "**Art. 9**"
                : subjectKeys.includes(c.name)
                  ? "subject key"
                  : c.id || c.unique
                    ? "identifier"
                    : "ordinary"
            if (cls === "**Art. 9**") art9Count++
            return [code(c.name), code(c.type), cls]
        })
        perModel.push(`### ${code(t.model)} — ${t.purpose} · ${t.basis} · ${t.subjects.join("|")} · ${t.retention} · ${t.erasure}

${table(rows, ["Column", "Type", "Class"])}`)
    }

    // Transfer table
    const processorRows = subprocessors.map((row) => {
        const [name, role, , location] = row
        const feed = PROCESSOR_FEEDS[name]
        if (!feed) {
            throw new Error(
                `/subprocessors lists "${name}" but PROCESSOR_FEEDS in lib/compliance/ropa-report.ts has no entry for it — ` +
                    `say which purposes reach it before the pack can render`
            )
        }
        const stores = storesByPurpose(feed.purposes)
        const fact = providers.find((p) => p.provider === name)
        return {
            name,
            role,
            location,
            feed,
            stores,
            endpoint: fact ? endpointFact(fact) : "n/a — configured outside the application code",
        }
    })
    for (const p of providers) {
        if (!subprocessors.some((r) => r[0] === p.provider)) {
            throw new Error(`${p.file} is a live provider service but "${p.provider}" is not on /subprocessors`)
        }
    }

    const subjects = [...new Set(tags.flatMap((t) => t.subjects))].sort()
    const eeaOnly = processorRows.filter((r) => EEA_ONLY.test(r.location))
    const unclear = tags.filter((t) => t.purpose === "unclear" || t.basis === "unclear")
    const unpinned = providers.filter((p) => !p.optionKeys.some((k) => PINNING_KEYS.test(k)))
    const art9Stores = tags.filter((t) => t.art9.length > 0)
    const analysisStores = storesByPurpose(["analysis"])
    const documentReceivers = processorRows.filter((r) => r.feed.documents)
    const tableReceivers = processorRows.filter((r) => r.feed.purposes === "all")

    const sections: string[] = []

    sections.push(`# DPIA input pack (GDPR Art. 35)

> **Generated — do not edit by hand.** Sources: \`prisma/schema.prisma\` (the \`@ropa\`
> tags and every column), the published subprocessor list (\`lib/legal/legal-content.ts\` —
> the same rows \`/subprocessors\` renders) and the AI provider services
> (\`lib/services/ai/*-ai.service.ts\`). Regenerate with \`npx tsx scripts/generate-ropa.ts\`;
> \`tests/unit/generated-compliance-docs-current.test.ts\` fails when this file is stale.

**This is not a DPIA.** It is the material an Art. 35 assessment starts from — the
nature, scope and context of the processing as the code and the schema state them
today. The assessment itself is a legal judgement and is a halt
(\`docs/provenance/HALTS.md\` H-P2). The record of processing is [ROPA.md](ROPA.md).`)

    sections.push(`## 0. Scale

${table(
        [
            ["Stores holding personal data (tagged)", `${tags.length} of ${required.length}`],
            ["Columns across them (relations excluded)", String(columnCount)],
            ["Columns declared Art. 9", `${art9Count} (stores: ${art9Stores.length})`],
            ["Data-subject categories in use", subjects.join(", ")],
            ["Stores under the AI-analysis purpose", String(analysisStores.length)],
            ["Published processors", String(processorRows.length)],
            ["… whose published location is EEA-only", `${eeaOnly.length} (${eeaOnly.map((r) => r.name).join(", ") || "none"})`],
            ["… that receive the uploaded document itself", `${documentReceivers.length} (${documentReceivers.map((r) => r.name).join(", ")})`],
        ],
        ["Measure", "Value"]
    )}`)

    sections.push(`## 1. Per-column purpose and lawful-basis map

Every column of every tagged store. A column inherits the purpose, basis, subjects,
retention and erasure of its store — the tag is per store, deliberately
(\`docs/provenance/PROGRESS.md\` D-P6) — so the heading states them once. **Class**:
**Art. 9** — named by the store's tag · *subject key* — the column that ties the row to
a person · *identifier* — \`@id\` or \`@unique\` · *ordinary* — everything else. Relation
fields are not columns and are not listed.

${perModel.join("\n\n")}`)

    sections.push(`## 2. Special categories of personal data (Art. 9) — the two routes

**(a) Structured columns a person answers directly.** ${
        art9Stores.length === 0
            ? "No store declares any."
            : `Processed on explicit consent only — Art. 9(2)(a); the tag guard refuses another basis.

${table(
                  art9Stores.map((t) => [code(t.model), t.art9.map(code).join(", "), BASIS_LABEL[t.basis] ?? t.basis]),
                  ["Store", "Columns", "Lawful basis"]
              )}

Held by the processors that store or carry every table: ${tableReceivers.map((r) => r.name).join(", ") || "none"}.`
    }

**(b) Whatever an uploaded policy document contains.** The document is stored as a
\`PolicyDocument\` row plus a private storage object and is **not parsed into columns**,
so its Art. 9 content — medical annexes, exclusions naming conditions, ΑΜΚΑ — is
unbounded by design (DATA_PROTECTION_REVIEW_PACK.md §3.2b). The whole file leaves our
boundary at the extraction step (§7). Processors that receive it:

${table(
        documentReceivers.map((r) => [r.name, r.location, r.feed.how, r.endpoint]),
        ["Processor", "Published location", "How it receives the document", "Endpoint, as constructed in code"]
    )}`)

    sections.push(`## 3. Transfer table

One row per processor on \`/subprocessors\`, in the order published there. *Role* and
*Location* are the published text; *Purposes*, *How* and *Receives the document* are the
authored map in \`lib/compliance/ropa-report.ts\` (\`PROCESSOR_FEEDS\`); *Stores under those
purposes* is derived from the tags — it names the stores the purpose covers, not a claim
that every row of them reaches the processor; *Endpoint* is read from the provider
service's constructor. A processor
missing from the map, or a provider service missing from the published list, stops the
generator rather than rendering a pack without it.

${table(
        processorRows.map((r) => [
            r.name,
            r.role,
            r.location,
            r.feed.purposes === "all" ? "all" : r.feed.purposes.join(", ") || "none",
            r.feed.purposes === "all" ? `all ${r.stores.length}` : r.stores.map((t) => code(t.model)).join(", ") || "none",
            r.feed.how,
            r.feed.documents ? "**yes**" : "no",
            r.endpoint,
        ]),
        ["Processor", "Role (published)", "Location (published)", "Purposes", "Stores under those purposes", "How", "Receives the document", "Endpoint, as constructed in code"]
    )}`)

    sections.push(`## 4. Open questions the assessment inherits

Derived from the sources above; each is a fact the pack can state, not a judgement.

- **Stores tagged \`unclear\`:** ${unclear.length === 0 ? "none." : unclear.map((t) => code(t.model)).join(", ") + "."}
- **AI clients constructed without an endpoint or region:** ${
        unpinned.length === 0
            ? "none — every client pins one."
            : unpinned.map((p) => `${p.provider} (${code(p.file)})`).join(", ") +
              ". The SDK default endpoint applies, with the provider account's default retention terms (DATA_PROTECTION_REVIEW_PACK.md §8, §14.1 — halt H-P1)."
    }
- **Processors whose published location is not EEA-only:** ${
        processorRows.filter((r) => !EEA_ONLY.test(r.location)).map((r) => `${r.name} (${r.location})`).join(", ") || "none"
    }.
- **Art. 9 data that reaches a non-EEA-only processor:** ${
        documentReceivers.filter((r) => !EEA_ONLY.test(r.location)).map((r) => r.name).join(", ") || "none"
    } — through route (b), the document.
- **The decisions this pack cannot take** are halts H-P1 … H-P5 in \`docs/provenance/HALTS.md\`.`)

    sections.push(`## 5. What this pack is not

It does not assess necessity, proportionality or residual risk, and it does not say
whether a DPIA is required — those are Art. 35 judgements for counsel (H-P2, and
question 4 in DATA_PROTECTION_REVIEW_PACK.md §15). It states what is processed, on which
recorded basis, where it goes and how the code sends it, as of the commit that generated
it — and it goes red in CI the moment any of those sources moves.`)

    return sections.join("\n\n") + "\n"
}

// ── Everything the generator writes and the guard checks ──────────────────────

export interface GeneratedDoc {
    path: string
    content: string
}

export function buildGeneratedDocs(): GeneratedDoc[] {
    const schema = readFileSync(SCHEMA_PATH, "utf-8")
    return [
        { path: ROPA_PATH, content: renderRopa(schema) },
        {
            path: DPIA_INPUTS_PATH,
            content: renderDpiaInputs({
                schema,
                providers: readProviderClientFacts(),
                subprocessors: readPublishedSubprocessors(),
            }),
        },
    ]
}
