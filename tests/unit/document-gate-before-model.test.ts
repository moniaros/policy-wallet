/**
 * SOURCE GUARD — no document reaches a model provider without the gate.
 *
 * The extraction contract takes a `ValidatedAIDocument`, a brand only
 * `toValidatedAIDocument` (lib/ingestion/validated-document.ts) can mint, and
 * it mints it only for a `validated` gate verdict. Types make an unbranded
 * argument a compile error; what types cannot stop is a CAST that forges the
 * brand. This guard enumerates app/ and lib/ from the filesystem and fails on:
 *   1. a forged brand — `as ValidatedAIDocument`, `as unknown as …`, `<…>` —
 *      anywhere but the constructor's own file;
 *   2. an `.extractPolicyData(` whose first argument is not the constructor's
 *      result or the orchestrator's already-gated `prepareDocument` result;
 *   3. the interface signature widening back to a plain `AIDocument`.
 * Committed probes prove each matcher red and green.
 */
import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { blankNonCode } from "./ai-processing-consent-gate.test"

const REPO_ROOT = process.cwd()
const CALLER_ROOTS = ["app", "lib"] as const
const CONSTRUCTOR_FILE = "lib/ingestion/validated-document.ts"

const FORGED_BRAND = /\bas\s+(?:unknown\s+as\s+)?ValidatedAIDocument\b|<\s*ValidatedAIDocument\s*>/g
const EXTRACT_CALL = /\.extractPolicyData\s*\(/g

function listSources(dirAbs: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dirAbs)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue
        const p = join(dirAbs, entry)
        if (statSync(p).isDirectory()) listSources(p, out)
        else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec|d)\.tsx?$/.test(entry)) out.push(p)
    }
    return out
}

/** The text of the first argument of each `.extractPolicyData(` call, comments and strings blanked. */
export function extractionFirstArguments(source: string): string[] {
    const code = blankNonCode(source)
    const out: string[] = []
    for (const match of code.matchAll(EXTRACT_CALL)) {
        let i = match.index! + match[0].length
        let depth = 0
        const start = i
        for (; i < code.length; i++) {
            const c = code[i]
            if (c === "(" || c === "[" || c === "{") depth++
            else if (c === ")" || c === "]" || c === "}") {
                if (depth === 0) break
                depth--
            } else if (c === "," && depth === 0) break
        }
        out.push(code.slice(start, i).trim())
    }
    return out
}

/** Arguments that are NOT the gate's constructor result nor the orchestrator's gated `prepareDocument` result. */
export function ungatedExtractionArguments(source: string): string[] {
    return extractionFirstArguments(source).filter(
        (arg) => !/^toValidatedAIDocument\s*\(/.test(arg) && !/^(?:prepared|docStep\.result)\.document$/.test(arg)
    )
}

export function forgedBrands(source: string): number {
    return [...blankNonCode(source).matchAll(FORGED_BRAND)].length
}

describe("source guard — a document reaches the extraction model only through the gate", () => {
    const files = CALLER_ROOTS.flatMap((root) => listSources(join(REPO_ROOT, root)))
    const rel = (file: string) => relative(REPO_ROOT, file)

    it("enumerates a real universe (the known call sites are present)", () => {
        const withCalls = files.filter((file) => extractionFirstArguments(readFileSync(file, "utf8")).length > 0).map(rel)
        for (const expected of [
            "app/api/policies/extract/route.ts",
            "app/(protected)/agent/actions.ts",
            "lib/services/analysis/policy-analysis-orchestrator.service.ts",
        ]) {
            expect(withCalls, expected).toContain(expected)
        }
        expect(files.length).toBeGreaterThan(300)
    })

    it("no file forges the ValidatedAIDocument brand", () => {
        const offenders = files
            .filter((file) => rel(file) !== CONSTRUCTOR_FILE)
            .filter((file) => forgedBrands(readFileSync(file, "utf8")) > 0)
            .map(rel)
        expect(
            offenders,
            "These files cast to ValidatedAIDocument. Only toValidatedAIDocument(verdict, bytes, mime) may produce one:\n" +
                offenders.join("\n")
        ).toEqual([])
    })

    it("every extractPolicyData call receives the constructor's result or the gated prepareDocument result", () => {
        const offenders = files.flatMap((file) =>
            ungatedExtractionArguments(readFileSync(file, "utf8")).map((arg) => `${rel(file)}: extractPolicyData(${arg}`)
        )
        expect(
            offenders,
            "These call sites hand the model something the gate did not validate. Run validateDocumentForIngestion " +
                "and build the argument with toValidatedAIDocument:\n" + offenders.join("\n")
        ).toEqual([])
    })

    it("the interface still takes a ValidatedAIDocument", () => {
        const source = readFileSync(join(REPO_ROOT, "lib/services/ai/ai-service.interface.ts"), "utf8")
        expect(source).toMatch(/extractPolicyData\(document:\s*ValidatedAIDocument\b/)
    })

    it("the orchestrator's prepareDocument runs the gate before it returns a document", () => {
        const source = blankNonCode(
            readFileSync(join(REPO_ROOT, "lib/services/analysis/policy-analysis-orchestrator.service.ts"), "utf8")
        )
        const start = source.indexOf("private async prepareDocument(")
        const end = source.indexOf("private async ensureDocumentValidated(")
        expect(start).toBeGreaterThan(-1)
        expect(end).toBeGreaterThan(start)
        const body = source.slice(start, end)
        expect(body).toMatch(/ensureDocumentValidated\(/)
        expect(body).toMatch(/toValidatedAIDocument\(/)
    })

    it("the matchers are proven against committed probes", () => {
        const probe = (name: string) => readFileSync(join(REPO_ROOT, "tests/fixtures/guard-probes", name), "utf8")
        const forged = probe("document-gate-forged-brand.ts.txt")
        const ungated = probe("document-gate-ungated.ts.txt")
        const gated = probe("document-gate-gated.ts.txt")
        // Intact probes: a gutted fixture must not pass silently.
        expect(forged).toMatch(/as ValidatedAIDocument/)
        expect(ungated).toMatch(/extractPolicyData\(\{/)
        expect(gated).toMatch(/toValidatedAIDocument\(/)

        expect(forgedBrands(forged)).toBe(1)
        expect(forgedBrands(gated)).toBe(0)
        expect(ungatedExtractionArguments(ungated)).toHaveLength(1)
        expect(ungatedExtractionArguments(gated)).toEqual([])
        // The forged probe passes a branded identifier: caught by the brand rule, not this one.
        expect(ungatedExtractionArguments(forged)).toEqual(["document"])
    })
})


/**
 * W0-02: a ValidatedAIDocument now carries `localText` — the probe's per-page
 * read — beside `data` and `mimeType`. A provider builds its request from the
 * two named fields; one that SPREAD the document into a part, or serialised it
 * whole, would ship the local text to the provider by accident. Enumerated
 * from the filesystem: every non-test source under lib/services/ai and
 * lib/services/analysis.
 */
const DOCUMENT_SPREAD = /\.\.\.\s*(?:document|doc|validatedDocument|aiDocument)\b|JSON\.stringify\(\s*(?:document|doc|validatedDocument|aiDocument)\b/g

export function documentSpreads(source: string): string[] {
    return [...blankNonCode(source).matchAll(DOCUMENT_SPREAD)].map((m) => m[0])
}

describe("source guard — no provider spreads or serialises the validated document whole", () => {
    const rel = (file: string) => relative(REPO_ROOT, file)
    const roots = ["lib/services/ai", "lib/services/analysis"]
    const files = roots.flatMap((r) => listSources(join(REPO_ROOT, r)))

    it("enumerates a real universe", () => {
        expect(files.length).toBeGreaterThan(10)
        expect(files.map(rel)).toContain("lib/services/ai/gemini-ai.service.ts")
    })

    it("every provider reads `document.data` and `document.mimeType` by name — never `...document`", () => {
        const offenders = files
            .map((file) => ({ file: rel(file), hits: documentSpreads(readFileSync(file, "utf8")) }))
            .filter((x) => x.hits.length > 0)
        expect(offenders, offenders.map((o) => `${o.file}: ${o.hits.join(", ")}`).join("\n")).toEqual([])
    })

    it("the matcher is proven against a probe", () => {
        expect(documentSpreads(`const part = { type: "file", ...document }`)).toEqual(["...document"])
        expect(documentSpreads(`body: JSON.stringify(document)`)).toEqual(["JSON.stringify(document"])
        expect(documentSpreads(`const part = { data: document.data, mediaType: document.mimeType }`)).toEqual([])
        // A comment naming the spread is not a spread.
        expect(documentSpreads(`// never ...document here\nconst x = document.data`)).toEqual([])
    })
})

/**
 * W0-03: what the extraction sends — text or file — is decided in ONE place,
 * `extractionContentParts` (lib/services/ai/extraction-input.ts). A provider
 * that assembled a file part for extraction by hand would keep sending the
 * whole file with the flag on, silently. Enumerated from the filesystem:
 * every `*-ai.service.ts` under lib/services/ai except the mock.
 */
export function extractPolicyDataBody(source: string): string | null {
    const code = blankNonCode(source)
    const start = code.search(/async\s+extractPolicyData\s*\(/)
    if (start < 0) return null
    const open = code.indexOf("{", code.indexOf(")", start))
    let depth = 0
    for (let i = open; i < code.length; i++) {
        if (code[i] === "{") depth++
        else if (code[i] === "}") {
            depth--
            if (depth === 0) return code.slice(open, i + 1)
        }
    }
    return null
}

export function extractionAssembledByHand(source: string): string[] {
    const body = extractPolicyDataBody(source)
    if (!body) return ["no extractPolicyData method found"]
    const problems: string[] = []
    if (!/\bextractionContentParts\s*\(/.test(body)) problems.push("does not call extractionContentParts(")
    // String contents are blanked, so `type: "file"` is invisible here; the file
    // part's SHAPE is not — a hand-built part names the document's fields.
    if (/mediaType\s*:\s*document\.mimeType\b|data\s*:\s*document\.data\b/.test(body)) problems.push("assembles a file part by hand")
    return problems
}

describe("source guard — every provider decides text-or-file through extractionContentParts", () => {
    const providers = listSources(join(REPO_ROOT, "lib/services/ai")).filter(
        (f) => /-ai\.service\.ts$/.test(f) && !/mock-ai\.service\.ts$/.test(f)
    )
    const rel = (file: string) => relative(REPO_ROOT, file)

    it("enumerates the live providers", () => {
        expect(providers.map(rel).sort()).toEqual([
            "lib/services/ai/anthropic-ai.service.ts",
            "lib/services/ai/gemini-ai.service.ts",
            "lib/services/ai/openai-ai.service.ts",
        ])
    })

    it("no provider assembles the extraction request by hand", () => {
        const offenders = providers
            .map((file) => ({ file: rel(file), problems: extractionAssembledByHand(readFileSync(file, "utf8")) }))
            .filter((x) => x.problems.length > 0)
        expect(offenders, offenders.map((o) => `${o.file}: ${o.problems.join("; ")}`).join("\n")).toEqual([])
    })

    it("the matcher is proven against probes", () => {
        const byHand = `class P { async extractPolicyData(document: AIDocument) { const parts = [{ type: "file", data: document.data, mediaType: document.mimeType }]; return call(parts) } }`
        expect(extractionAssembledByHand(byHand)).toEqual(["does not call extractionContentParts(", "assembles a file part by hand"])
        const throughHelper = `class P { async extractPolicyData(document: AIDocument) { const { parts } = extractionContentParts(prompt, document); return call(parts) } }`
        expect(extractionAssembledByHand(throughHelper)).toEqual([])
        // A file part in ANOTHER method (gap analysis still attaches the file) is not the extraction's.
        const elsewhere = `class P { async extractPolicyData(document: AIDocument) { const { parts } = extractionContentParts(p, document); return call(parts) }\n async analyzeGaps(document: AIDocument) { return call([{ type: "file", data: document.data, mediaType: document.mimeType }]) } }`
        expect(extractionAssembledByHand(elsewhere)).toEqual([])
    })
})
