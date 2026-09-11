import { describe, it, expect } from "vitest"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
    buildGeneratedDocs,
    endpointFact,
    readProviderClientFacts,
    readPublishedSubprocessors,
    renderDpiaInputs,
    renderRopa,
    ROPA_PATH,
    DPIA_INPUTS_PATH,
    SCHEMA_PATH,
} from "@/lib/compliance/ropa-report"

/**
 * PW-PROVENANCE-01 W4-02. The Art. 30 record and the DPIA input pack are
 * GENERATED from the schema, the published subprocessor list and the provider
 * services. W4-01 shipped a `--check` flag that nothing in CI ran, so the
 * committed record could have drifted from the schema with every guard green —
 * the exact failure it exists to prevent. This guard runs the comparison on
 * every CI run: a source moves, the committed document must move with it.
 */

const SCHEMA = readFileSync(SCHEMA_PATH, "utf-8")

describe("the generated compliance documents are current", () => {
    const docs = buildGeneratedDocs()

    it("renders both documents", () => {
        expect(docs.map((d) => d.path)).toEqual([ROPA_PATH, DPIA_INPUTS_PATH])
    })

    for (const doc of docs) {
        it(`${doc.path} equals what the sources render today`, () => {
            const committed = readFileSync(doc.path, "utf-8")
            expect(committed).toBe(doc.content)
        })
    }

    it("the pack covers every tagged store and every provider service", () => {
        const pack = docs.find((d) => d.path === DPIA_INPUTS_PATH)!.content
        for (const fact of readProviderClientFacts()) expect(pack).toContain(fact.provider)
        for (const row of readPublishedSubprocessors()) expect(pack).toContain(`| ${row[0]} |`)
        expect(pack).toMatch(/Stores holding personal data \(tagged\) \| (\d+) of \1 \|/)
    })
})

describe("probe — the guard turns red on the shapes it exists to catch", () => {
    const PROBE_MODEL = `
/// @ropa purpose=service basis=contract subjects=policyholder retention=account_life erasure=delete art9=none
model ProbeStore {
  id     String @id
  userId String
  note   String?
  user   User   @relation(fields: [userId], references: [id])
}
`
    const providers = readProviderClientFacts()
    const subprocessors = readPublishedSubprocessors()

    it("a schema change without regeneration makes the committed record stale", () => {
        const schema = SCHEMA + PROBE_MODEL
        expect(renderRopa(schema)).not.toBe(readFileSync(ROPA_PATH, "utf-8"))
        expect(renderDpiaInputs({ schema, providers, subprocessors })).not.toBe(readFileSync(DPIA_INPUTS_PATH, "utf-8"))
        expect(renderDpiaInputs({ schema, providers, subprocessors })).toContain("`ProbeStore` — service · contract")
    })

    it("a published subprocessor with no feed entry stops the generator instead of being omitted", () => {
        const rows = [...subprocessors, ["Acme Cloud", "Backups", "Everything", "US"]]
        expect(() => renderDpiaInputs({ schema: SCHEMA, providers, subprocessors: rows })).toThrow(/Acme Cloud/)
    })

    it("a provider service that is not on the published list stops the generator", () => {
        const rows = subprocessors.filter((r) => r[0] !== "OpenAI")
        expect(() => renderDpiaInputs({ schema: SCHEMA, providers, subprocessors: rows })).toThrow(/OpenAI/)
    })

    it("a provider service file with no published row stops the reader", () => {
        const dir = mkdtempSync(join(tmpdir(), "pw-providers-"))
        writeFileSync(join(dir, "acme-ai.service.ts"), `export const p = createAcme({ apiKey: "x" })\n`)
        expect(() => readProviderClientFacts(dir)).toThrow(/acme-ai\.service\.ts/)
    })

    it("a client constructed with an endpoint is reported as pinned, one with only a key as default", () => {
        expect(endpointFact({ file: "x.ts", provider: "X", optionKeys: ["apiKey", "baseURL"] })).toMatch(/set in code/)
        expect(endpointFact({ file: "x.ts", provider: "X", optionKeys: ["apiKey"] })).toMatch(/SDK default endpoint/)
        expect(endpointFact({ file: "x.ts", provider: "X", optionKeys: [] })).toMatch(/no client constructor/)
    })

    it("today every live client is constructed with a key and nothing else — the §14.1 fact, pinned", () => {
        // If this fails because a client gained a baseURL or region, that is
        // good news: regenerate the pack and update H-P1 in HALTS.md.
        for (const p of providers) expect(p.optionKeys).toEqual(["apiKey"])
    })
})
