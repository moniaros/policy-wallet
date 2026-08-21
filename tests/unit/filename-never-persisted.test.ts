import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

import { documentDisplayLabel, downloadFileName, providerDocumentFileName } from "@/lib/wallet/document-label"

/**
 * The user's own file name is kept NOWHERE — not stored, not rendered, not
 * logged, not sent to a model provider, not hashed.
 *
 * A file name is user-authored metadata and it leaks by construction:
 * `LIFE_POLICY.pdf` on a health policy page discloses a life component before
 * anyone opens anything; `NIKOS_ETHNIKI_2026.pdf` names a person and an
 * insurer. A hash is no better — it correlates the same document across
 * accounts.
 *
 * Two real leaks this guard exists to prevent from returning:
 *   • a 2026-08-14 analysis run recorded `fileName:"motor.pdf"` in the logs
 *   • the name was sent to Anthropic/OpenAI/Gemini as the document part's
 *     `filename`, under a comment claiming it "should not reach the
 *     third-party AI provider" — sanitizeDisplayName only tidied it
 *
 * The entry points are DERIVED, not listed: any file that reads `file.name`
 * or a `documentNames` form field is an upload entry point by definition, so a
 * new one is covered the day it is written.
 */

/**
 * Every source file. NOT just "upload entry points".
 *
 * This guard originally scanned only files containing `file.name` or a
 * `documentNames` form field, on the theory that a name can only enter there.
 * It cannot: `PolicyService.create()` takes `doc.name` off a JSON payload and
 * had `fileName,` written straight into Prisma, and the guard never looked at
 * the file. It also globbed `{app,lib}` only, so all of `components/` — where
 * the browser actually reads `file.name` — was invisible.
 *
 * A sink is a sink wherever it lives, so the scan is now repo-wide and the
 * exemptions are explicit.
 */
function sourceFiles(): string[] {
    return globSync("{app,lib,components,hooks}/**/*.{ts,tsx}", { ignore: ["**/node_modules/**"] })
}

/** Files that touch a client-supplied name at all. */
function uploadEntryPoints(): string[] {
    return sourceFiles().filter((file) => {
        const src = readFileSync(file, "utf-8")
        return /\bfile\.name\b/.test(src) || /getAll\(["']documentNames["']\)/.test(src)
    })
}

describe("no client-supplied file name reaches a persistent sink", () => {
    const entryPoints = uploadEntryPoints()

    it("finds the upload entry points (a matcher that finds none guards nothing)", () => {
        expect(entryPoints.length).toBeGreaterThan(0)
    })

    it("never writes a client-supplied name into the database", () => {
        // Repo-wide, and BOTH forms: `fileName: <expr>` and the ES6 shorthand
        // `fileName,`. The shorthand is what PolicyService.create() used, and
        // a matcher that only understands `fileName:` reads it as absent.
        const offenders: string[] = []
        for (const file of sourceFiles()) {
            const src = readFileSync(file, "utf-8")

            for (const m of src.matchAll(/fileName:\s*([^\n,]+)/g)) {
                const value = m[1].trim()
                if (/storedDocumentLabel|documentDisplayLabel/.test(value)) continue
                // EXEMPT: transient client render state, never transmitted and
                // never stored. BatchUploadModal keeps `file.name` on its row
                // objects solely to label the queue while the user watches it
                // process — `row.fileName` appears at exactly three render
                // sites and in no request body. Stripping it would leave a
                // list of 20 identical rows with no way to tell which failed.
                // The name still reaches our server regardless, in the
                // multipart part header of the file itself; what matters is
                // that nothing PERSISTS it, and nothing here does.
                if (file === "components/wallet/BatchUploadModal.tsx") continue
                if (/file\.name|documentNames|displayName|sanitizeDisplayName|doc\.name|\bname\b/.test(value)) {
                    offenders.push(`${file} :: fileName: ${value}`)
                }
            }

            // Shorthand: `fileName,` inside a Prisma `data: { … }`. The binding
            // it refers to is resolved by name in the same file.
            for (const m of src.matchAll(/^\s*fileName,\s*$/gm)) {
                const decl = new RegExp(`(?:const|let|var)\\s+fileName\\s*=\\s*([^\\n]+)`).exec(src)
                const from = decl ? decl[1].trim() : "(unresolved)"
                if (/storedDocumentLabel|documentDisplayLabel/.test(from)) continue
                offenders.push(`${file} :: fileName,  // = ${from}`)
            }
        }
        expect(
            offenders,
            "These persist a client-supplied file name. Use storedDocumentLabel():\n  " +
                offenders.join("\n  ")
        ).toEqual([])
    })

    it("never interpolates a file name into an activity-log description", () => {
        // A log row in the SAME database is the sink the first pass missed:
        // the PolicyDocument row was generated while the ActivityLog two
        // statements below it wrote "Uploaded document CASH IN SAFE.pdf".
        const offenders: string[] = []
        for (const file of sourceFiles()) {
            const src = readFileSync(file, "utf-8")
            for (const m of src.matchAll(/description:\s*`([^`]*)`/g)) {
                if (/\$\{\s*(displayName|fileName|file\.name|doc\.name)\s*\}/.test(m[1])) {
                    offenders.push(`${file} :: description: \`${m[1].slice(0, 70)}\``)
                }
            }
        }
        expect(
            offenders,
            "An activity log is a persistent sink:\n  " + offenders.join("\n  ")
        ).toEqual([])
    })

    it("never logs a file name", () => {
        // Any `fileName` key inside a logger(...) object literal, anywhere.
        const offenders: string[] = []
        for (const file of sourceFiles()) {
            const src = readFileSync(file, "utf-8")
            for (const m of src.matchAll(/logger\(\s*['"][^'"]+['"]\s*,\s*['"][^'"]*['"]\s*,\s*\{([^}]*)\}/g)) {
                if (/\bfileName\b/.test(m[1])) offenders.push(`${file} :: logger({ …fileName… })`)
            }
        }
        expect(
            offenders,
            "A log is a sink. The 2026-08-14 run recorded fileName:\"motor.pdf\":\n  " +
                offenders.join("\n  ")
        ).toEqual([])
    })

    it("never puts a file name in a Sentry scope", () => {
        const offenders: string[] = []
        for (const file of sourceFiles()) {
            const src = readFileSync(file, "utf-8")
            if (/(setContext|setTag|setExtra|addBreadcrumb)\([^)]*fileName/.test(src)) {
                offenders.push(file)
            }
        }
        expect(offenders, "Sentry context is a sink too:\n  " + offenders.join("\n  ")).toEqual([])
    })

    it("sends only a constant name to model providers", () => {
        const offenders: string[] = []
        for (const file of globSync("lib/services/ai/**/*.ts", { ignore: ["**/node_modules/**"] })) {
            const src = readFileSync(file, "utf-8")
            for (const m of src.matchAll(/filename:\s*([^\n,]+)/g)) {
                if (!/providerDocumentFileName/.test(m[1])) offenders.push(`${file} :: filename: ${m[1].trim()}`)
            }
        }
        expect(
            offenders,
            "Providers log request metadata, so a real name here leaves our boundary:\n  " +
                offenders.join("\n  ")
        ).toEqual([])
    })

    it("the AI document contract has no filename field at all", () => {
        // Removing the field makes reintroduction a type error rather than
        // something a reviewer has to notice.
        const contract = readFileSync("lib/services/ai/ai-service.interface.ts", "utf-8")
        const aiDoc = contract.slice(contract.indexOf("AIDocument"))
        expect(aiDoc.slice(0, aiDoc.indexOf("}"))).not.toMatch(/\bfileName\s*:/)
    })
})

describe("the generated label says something true and nothing private", () => {
    it("describes a document still being processed", () => {
        expect(documentDisplayLabel({}, "el")).toBe("Έγγραφο σε επεξεργασία")
        expect(documentDisplayLabel({}, "en")).toBe("Document being processed")
    })

    it("names the branch and the policy number once extraction has run", () => {
        expect(documentDisplayLabel({ lineOfBusiness: "motor", policyNumber: "64504715" }, "el"))
            .toBe("Ασφαλιστήριο Αυτοκίνητο · 64504715")
    })

    it("labels a renewal by its period", () => {
        expect(
            documentDisplayLabel(
                { documentKind: "renewal_notice", effectiveFrom: "2025-01-01", effectiveTo: "2026-01-01" },
                "el"
            )
        ).toBe("Ανανεωτήριο 2025–2026")
    })

    it("treats a placeholder policy number as no number", () => {
        // PENDING-XXXX is a sentinel, not an identity.
        expect(documentDisplayLabel({ lineOfBusiness: "motor", policyNumber: "PENDING-ABCD1234" }, "el"))
            .toBe("Έγγραφο σε επεξεργασία")
    })

    it("builds a download name that is generated, ASCII and extension-correct", () => {
        expect(downloadFileName({ lineOfBusiness: "motor", policyNumber: "64504715", mimeType: "application/pdf" }))
            .toBe("policywallet-motor-64504715.pdf")
        expect(downloadFileName({ mimeType: "image/jpeg" })).toBe("policywallet.jpg")
        // Never the storage UUID, never the original.
        expect(downloadFileName({ lineOfBusiness: "motor", policyNumber: "64504715" })).not.toMatch(/[^\x20-\x7e]/)
    })

    it("gives providers a constant that names nothing", () => {
        expect(providerDocumentFileName("application/pdf")).toBe("document.pdf")
        expect(providerDocumentFileName("image/jpeg")).toBe("document.jpg")
        expect(providerDocumentFileName(null)).toBe("document.pdf")
        for (const mime of ["application/pdf", "image/png", null]) {
            expect(providerDocumentFileName(mime)).not.toMatch(/policy|life|health|\d/i)
        }
    })
})
