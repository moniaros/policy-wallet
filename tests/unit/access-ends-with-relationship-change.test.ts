import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * Two ways an agent's relationship to a customer can END. Both must also end the
 * agent's ACCESS, because computePolicyAccess grants read/write/delete from an
 * AccessGrant's level ALONE — it never re-checks whether a relationship still
 * exists (lib/policy-access.ts, deliberately, so shared access can outlive a
 * relationship when the policyholder chose to share).
 *
 *   1. terminateRelationship  — always did revoke.
 *   2. transferCustomer       — did NOT, until 2026-08-20.
 *
 * Every policy an agent adds for a customer auto-mints a `manage` grant
 * (app/(protected)/agent/actions.ts). So a reassigned agent kept read, write and
 * DELETE over that customer's whole book of business, permanently, with no
 * relationship to them at all — reachable from the agency-owner "Transfer
 * Customer" button. /trust tells the reader "an advisor's access ends with your
 * relationship"; for the transfer path that sentence was false.
 *
 * Source-level rather than behavioural: the honest alternative is a live DB, and
 * a test that needs one does not run in CI. This pins the shape of the fix — if
 * someone removes the revoke, this fails and names why.
 */

const repoRoot = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(repoRoot, p), "utf8")

/** The body of a named exported function, up to the next top-level export. */
function functionBody(source: string, name: string): string {
    const start = source.indexOf(`export async function ${name}(`)
    if (start === -1) throw new Error(`${name} not found — was it renamed?`)
    const rest = source.slice(start + 10)
    const next = rest.indexOf("\nexport ")
    return next === -1 ? rest : rest.slice(0, next)
}

describe("an agent's access ends when the relationship does", () => {
    it("transferCustomer revokes the previous agent's grants", () => {
        const body = functionBody(read("lib/services/team.service.ts"), "transferCustomer")

        expect(
            /accessGrant\.updateMany/.test(body),
            "transferCustomer reassigns the relationship but leaves the previous agent's " +
                "auto-minted `manage` AccessGrants active — they keep read/write/delete on " +
                "every policy they added for a customer who is no longer theirs."
        ).toBe(true)

        expect(
            /status:\s*["']revoked["']/.test(body),
            "transferCustomer touches accessGrant but does not set status to 'revoked'."
        ).toBe(true)
    })

    it("transferCustomer applies the reassignment and the revoke atomically", () => {
        const body = functionBody(read("lib/services/team.service.ts"), "transferCustomer")
        const tx = body.indexOf("$transaction")
        const revoke = body.indexOf("accessGrant.updateMany")

        expect(tx, "transferCustomer no longer uses a transaction").toBeGreaterThan(-1)
        expect(
            revoke > tx,
            "the grant revoke sits outside the $transaction: a partial apply would " +
                "reassign the customer while leaving the old agent's access live."
        ).toBe(true)
    })

    it("terminateRelationship still revokes (the path that always did)", () => {
        const source = read("app/(protected)/agent/relationship-actions.ts")
        expect(/accessGrant\.updateMany/.test(source)).toBe(true)
        expect(/status:\s*["']revoked["']/.test(source)).toBe(true)
    })

    /**
     * 3. createAgentInvite — the path that could UNDO an ending. Its upsert
     *    wrote `update: { status: 'pending_activation' }` on the existing row,
     *    so re-inviting a terminated customer's email re-opened the upload arm
     *    of lib/agent-visibility.ts (createdByUserId + a living relationship)
     *    on every policy the agent had ever uploaded for them. Revoking the
     *    grants is pointless if the status can be flipped back from the
     *    agent's side.
     */
    it("createAgentInvite refuses a terminated relationship and never writes status on update", () => {
        // Comments stripped: a docstring DESCRIBING the old upsert must not
        // satisfy (or fail) a check about what the code does.
        const body = functionBody(read("app/(protected)/agent/actions.ts"), "createAgentInvite")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "")

        expect(
            /RELATIONSHIP_TERMINATED/.test(body),
            "createAgentInvite does not refuse a terminated relationship — only the customer may reconnect."
        ).toBe(true)

        expect(
            /update:\s*\{[^}]*\bstatus\s*:/.test(body),
            "createAgentInvite writes `status` in the upsert's update arm: the agent's invite " +
                "resurrects a relationship the customer or the agent had ended."
        ).toBe(false)

        const refuse = body.indexOf("RELATIONSHIP_TERMINATED")
        const upsert = body.indexOf("customerRelationship.upsert")
        expect(upsert).toBeGreaterThan(-1)
        expect(refuse < upsert, "the terminated check must run before the upsert").toBe(true)
    })
})

describe("no document reaches a model provider without consent", () => {
    /**
     * /trust: "Analysis starts only after you give explicit consent. Without it,
     * the document never leaves for a model provider."
     *
     * There are TWO paths that send document bytes to a provider. The deep pipeline
     * was gated; the upload-time extract route was not — so the bulk-upload flow
     * (components/wallet/BatchUploadModal.tsx) shipped whole documents to Gemini
     * with no consent check, while the public page said the opposite.
     */
    const PROVIDER_PATHS = [
        {
            file: "app/api/policies/extract/route.ts",
            what: "upload-time extraction (single add AND bulk upload)",
        },
        {
            file: "lib/services/analysis/policy-analysis-orchestrator.service.ts",
            what: "the deep analysis pipeline",
        },
    ]

    for (const { file, what } of PROVIDER_PATHS) {
        it(`${what} checks aiProcessingConsentVersion`, () => {
            const source = read(file)
            // Require a USE, not a mention: a comment naming the field would
            // otherwise satisfy a substring check. This exact trap has bitten
            // these guards before.
            const uses = /aiProcessingConsentVersion:\s*true/.test(source)
            expect(
                uses,
                `${file} sends document bytes to a model provider but never selects ` +
                    `aiProcessingConsentVersion, so it cannot be gating on consent.`
            ).toBe(true)
        })
    }

    it("the extract route refuses before reading the uploaded bytes", () => {
        const source = read("app/api/policies/extract/route.ts")
        const consent = source.indexOf("aiProcessingConsentVersion")
        const readsFile = source.indexOf("formData.get(\"file\")")

        expect(consent).toBeGreaterThan(-1)
        expect(readsFile).toBeGreaterThan(-1)
        expect(
            consent < readsFile,
            "the consent gate must run before the request body is read — a refusal " +
                "should never touch the document."
        ).toBe(true)
    })
})
