/**
 * SOURCE GUARD — a policy document reaches the private bucket only through
 * the ingestion service.
 *
 * `uploadFileDetailed(file, "policies")` — and `uploadFile(file)` whose default
 * folder IS "policies" — used to be called from five places, each committing
 * its rows in its own order and none asking what the file was. Every such
 * call now lives in lib/ingestion/ingest-policy-document.ts, after the gate.
 * Enumerated from the filesystem; other folders (agency assets, collaboration
 * attachments) are not policy documents and are not flagged.
 */
import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { blankNonCode } from "./ai-processing-consent-gate.test"

const REPO_ROOT = process.cwd()
const ROOTS = ["app", "lib"] as const
const INGEST_FILE = "lib/ingestion/ingest-policy-document.ts"
/** The wrapper that forwards to uploadFileDetailed lives here. */
const STORAGE_FILE = "lib/storage.ts"

const UPLOAD_CALL = /\buploadFile(?:Detailed)?\s*\(/g

function listSources(dirAbs: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dirAbs)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue
        const p = join(dirAbs, entry)
        if (statSync(p).isDirectory()) listSources(p, out)
        else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec|d)\.tsx?$/.test(entry)) out.push(p)
    }
    return out
}

/**
 * Every upload call whose folder is the policies bucket: an explicit
 * "policies" literal, or no folder at all (the default). Read on the ORIGINAL
 * source so the literal survives; positions come from the blanked copy.
 */
export function policyBucketUploads(source: string): string[] {
    const code = blankNonCode(source)
    const out: string[] = []
    for (const match of code.matchAll(UPLOAD_CALL)) {
        let i = match.index! + match[0].length
        let depth = 0
        const args: string[] = []
        let start = i
        for (; i < code.length; i++) {
            const c = code[i]
            if (c === "(" || c === "[" || c === "{") depth++
            else if (c === ")" || c === "]" || c === "}") {
                if (depth === 0) break
                depth--
            } else if (c === "," && depth === 0) {
                args.push(source.slice(start, i).trim())
                start = i + 1
            }
        }
        args.push(source.slice(start, i).trim())
        const folder = args[1]
        if (folder === undefined || folder === "" || /^["'`]policies["'`]$/.test(folder)) {
            out.push(match[0] + args.join(", ") + ")")
        }
    }
    return out
}

describe("source guard — policy documents reach storage only through ingestPolicyDocument", () => {
    const files = ROOTS.flatMap((root) => listSources(join(REPO_ROOT, root)))
    const rel = (file: string) => relative(REPO_ROOT, file)

    it("enumerates a real universe", () => {
        expect(files.length).toBeGreaterThan(300)
        expect(files.map(rel)).toContain(INGEST_FILE)
        expect(policyBucketUploads(readFileSync(join(REPO_ROOT, INGEST_FILE), "utf8"))).toHaveLength(1)
    })

    it("no other file uploads into the policies bucket", () => {
        const offenders = files
            .filter((file) => ![INGEST_FILE, STORAGE_FILE].includes(rel(file)))
            .flatMap((file) => policyBucketUploads(readFileSync(file, "utf8")).map((call) => `${rel(file)}: ${call}`))
        expect(
            offenders,
            "These files store a policy document themselves. Go through ingestPolicyDocument, which runs the " +
                "document gate first and commits the stamped row with the object:\n" + offenders.join("\n")
        ).toEqual([])
    })

    it("the matcher is proven against committed probes", () => {
        const probe = (name: string) => readFileSync(join(REPO_ROOT, "tests/fixtures/guard-probes", name), "utf8")
        const red = probe("storage-policies-outside-ingest.ts.txt")
        const green = probe("storage-non-policy-folder.ts.txt")
        expect(red).toMatch(/uploadFileDetailed\(file, "policies"\)/)
        expect(policyBucketUploads(red)).toHaveLength(2)
        expect(policyBucketUploads(green)).toEqual([])
    })
})
