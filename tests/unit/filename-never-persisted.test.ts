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

/**
 * The sink matchers, extracted so the probe block at the bottom can run them
 * against committed fixtures — the same machinery, not a copy. Each returns
 * printable evidence naming the file and the shape it found.
 */
export function persistedFileNameOffenders(file: string, src: string): string[] {
    const offenders: string[] = []

    for (const m of src.matchAll(/fileName:\s*([^\n,]+)/g)) {
        const value = m[1].trim()
        if (/storedDocumentLabel|documentDisplayLabel/.test(value)) continue
        // EXEMPT BY PATH (see the main test's rationale): transient client
        // render state in the batch queue, never transmitted, never stored.
        if (file === "components/wallet/BatchUploadModal.tsx") continue
        if (/file\.name|documentNames|displayName|sanitizeDisplayName|doc\.name|\bname\b/.test(value)) {
            offenders.push(`${file} :: fileName: ${value}`)
        }
    }

    // Shorthand: `fileName,` inside a Prisma `data: { … }`. The binding it
    // refers to is resolved by name in the same file.
    for (const m of src.matchAll(/^\s*fileName,\s*$/gm)) {
        const decl = new RegExp(`(?:const|let|var)\\s+fileName\\s*=\\s*([^\\n]+)`).exec(src)
        const from = decl ? decl[1].trim() : "(unresolved)"
        if (/storedDocumentLabel|documentDisplayLabel/.test(from)) continue
        offenders.push(`${file} :: fileName,  // = ${from}`)
    }

    return offenders
}

export function activityLogFileNameOffenders(file: string, src: string): string[] {
    const offenders: string[] = []
    for (const m of src.matchAll(/description:\s*`([^`]*)`/g)) {
        if (/\$\{\s*(displayName|fileName|file\.name|doc\.name)\s*\}/.test(m[1])) {
            offenders.push(`${file} :: description: \`${m[1].slice(0, 70)}\``)
        }
    }
    return offenders
}

export function loggerFileNameOffenders(file: string, src: string): string[] {
    const offenders: string[] = []
    for (const m of src.matchAll(/logger\(\s*['"][^'"]+['"]\s*,\s*['"][^'"]*['"]\s*,\s*\{([^}]*)\}/g)) {
        if (/\bfileName\b/.test(m[1])) offenders.push(`${file} :: logger({ …fileName… })`)
    }
    return offenders
}

export function sentryFileNameOffenders(file: string, src: string): string[] {
    return /(setContext|setTag|setExtra|addBreadcrumb)\([^)]*fileName/.test(src) ? [file] : []
}

export function providerFileNameOffenders(file: string, src: string): string[] {
    const offenders: string[] = []
    for (const m of src.matchAll(/filename:\s*([^\n,]+)/g)) {
        if (!/providerDocumentFileName/.test(m[1])) offenders.push(`${file} :: filename: ${m[1].trim()}`)
    }
    return offenders
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
        const offenders = sourceFiles().flatMap((file) =>
            persistedFileNameOffenders(file, readFileSync(file, "utf-8"))
        )
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
        const offenders = sourceFiles().flatMap((file) =>
            activityLogFileNameOffenders(file, readFileSync(file, "utf-8"))
        )
        expect(
            offenders,
            "An activity log is a persistent sink:\n  " + offenders.join("\n  ")
        ).toEqual([])
    })

    it("never logs a file name", () => {
        // Any `fileName` key inside a logger(...) object literal, anywhere.
        const offenders = sourceFiles().flatMap((file) =>
            loggerFileNameOffenders(file, readFileSync(file, "utf-8"))
        )
        expect(
            offenders,
            "A log is a sink. The 2026-08-14 run recorded fileName:\"motor.pdf\":\n  " +
                offenders.join("\n  ")
        ).toEqual([])
    })

    it("never puts a file name in a Sentry scope", () => {
        const offenders = sourceFiles().flatMap((file) =>
            sentryFileNameOffenders(file, readFileSync(file, "utf-8"))
        )
        expect(offenders, "Sentry context is a sink too:\n  " + offenders.join("\n  ")).toEqual([])
    })

    it("sends only a constant name to model providers", () => {
        const offenders = globSync("lib/services/ai/**/*.ts", { ignore: ["**/node_modules/**"] }).flatMap(
            (file) => providerFileNameOffenders(file, readFileSync(file, "utf-8"))
        )
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

/**
 * PROBES — the matchers proven red against committed fixtures and against the
 * runtime-assembled shapes of the two real leaks (CLAUDE.md: a guard without a
 * probe in the repo is not a guard). The DB fixture is the strongest probe
 * available: PolicyService.create() exactly as it persisted the user's file
 * name before 1057ab7d — the ES6 shorthand the first matcher could not see.
 */
describe("the sink matchers are proven against the pre-fix shapes", () => {
    const PREFIX_FIXTURE = "tests/fixtures/guard-probes/filename-persisted-policy-service.ts.txt"

    it("flags the shorthand Prisma write that actually shipped, and names its source", () => {
        const offenders = persistedFileNameOffenders(
            "lib/services/policy.service.ts",
            readFileSync(PREFIX_FIXTURE, "utf-8")
        )
        expect(offenders).toHaveLength(1)
        expect(offenders[0]).toContain("lib/services/policy.service.ts")
        expect(offenders[0]).toContain("fileName,")
        expect(offenders[0]).toContain("rawFileName")
    })

    it("flags the colon form too, and the exemption is keyed on the path — not on content", () => {
        const colon = "await tx.policyDocument.create({ data: {\n    fileName: file.name,\n} })"
        expect(persistedFileNameOffenders("app/api/upload/route.ts", colon)).toHaveLength(1)
        // The SAME content inside the exempted batch modal is transient render
        // state; anywhere else it is a sink. Path-keyed, subject cannot opt out.
        expect(persistedFileNameOffenders("components/wallet/BatchUploadModal.tsx", colon)).toEqual([])
    })

    it("does not flag the generated label the fix routes through", () => {
        expect(
            persistedFileNameOffenders(
                "lib/services/policy.service.ts",
                "const fileName = storedDocumentLabel(extracted, 'el')\n                    fileName,\n"
            )
        ).toEqual([])
    })

    it("flags the activity-log interpolation (the 'Uploaded document CASH IN SAFE.pdf' shape)", () => {
        const offenders = activityLogFileNameOffenders(
            "lib/services/policy.service.ts",
            "await tx.activityLog.create({ data: { description: `Uploaded document ${displayName}` } })"
        )
        expect(offenders).toHaveLength(1)
        expect(offenders[0]).toContain("Uploaded document")
    })

    it("flags the logger payload from the 2026-08-14 run (fileName:\"motor.pdf\")", () => {
        const offenders = loggerFileNameOffenders(
            "lib/services/analysis/policy-analysis-orchestrator.service.ts",
            "logger('info', 'Analysis run started', { runId, fileName: doc.fileName })"
        )
        expect(offenders).toHaveLength(1)
        // …and a payload without the key is not noise.
        expect(
            loggerFileNameOffenders("x.ts", "logger('info', 'Analysis run started', { runId, documentCount })")
        ).toEqual([])
    })

    it("flags a file name in a Sentry scope", () => {
        expect(
            sentryFileNameOffenders("lib/upload.ts", "Sentry.setContext('upload', { fileName, size })")
        ).toEqual(["lib/upload.ts"])
        expect(sentryFileNameOffenders("lib/upload.ts", "Sentry.setContext('upload', { size })")).toEqual([])
    })

    it("flags a real name sent to a model provider — sanitizeDisplayName was the pre-fix 'protection'", () => {
        const offenders = providerFileNameOffenders(
            "lib/services/ai/anthropic-ai.service.ts",
            "source: { type: 'document', filename: sanitizeDisplayName(document.fileName) }"
        )
        expect(offenders).toHaveLength(1)
        expect(offenders[0]).toContain("sanitizeDisplayName")
        // The constant the fix sends is not flagged.
        expect(
            providerFileNameOffenders(
                "lib/services/ai/anthropic-ai.service.ts",
                "source: { type: 'document', filename: providerDocumentFileName(document.mimeType) }"
            )
        ).toEqual([])
    })
})
