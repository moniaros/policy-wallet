import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

const SCHEMA = readFileSync("prisma/schema.prisma", "utf-8")

/**
 * Comments are stripped before either service is matched. A TODO naming
 * `tx.pushDevice.deleteMany` is prose, not erasure — the same mention-vs-use
 * hole the authorization guard closed with a lexer. Verified safe before
 * tightening: no delegate in either file lives only in a comment, so this
 * strictly hardens the match without changing today's result.
 */
const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const ERASER = stripComments(readFileSync("lib/services/gdpr-erasure.service.ts", "utf-8"))
const EXPORTER = stripComments(readFileSync("lib/services/compliance.service.ts", "utf-8"))

/**
 * The trap this file exists for.
 *
 * Erasure is ANONYMIZE-IN-PLACE: the `User` row survives so that legally
 * retained records keep a resolvable anchor. That is a deliberate and correct
 * choice, and it has one consequence that is easy to forget — `ON DELETE
 * CASCADE` never fires. A table added with a `userId` is therefore NOT cleaned
 * up by the database. It simply outlives the erasure request, silently, and
 * nothing fails.
 *
 * That is how `push_devices`, `business_events`, `risk_reviews` and
 * `user_notification_settings` all came to hold personal data past an Art. 17
 * request. The push one was the sharpest: a live delivery endpoint and its
 * encryption keys, meaning a person who asked to be forgotten could still be
 * sent a notification on their own phone.
 *
 * The previous guard enumerated models by hand, so a new store was invisible to
 * it by construction. This one derives the list from the schema: a model is
 * either handled, or explicitly exempted here with a reason.
 */

/**
 * Fields that make a row personal data about a specific human, by NAME.
 *
 * Kept only for user references that are plain strings with no Prisma relation
 * behind them (ActivityLog.targetUserId, OpportunityStageHistory.changedByUserId
 * …), which the relation scan below cannot see.
 */
const SUBJECT_FIELDS = [
    "userId",
    "ownerUserId",
    "subjectUserId",
    "policyholderUserId",
    "granterUserId",
    "changedByUserId",
    "targetUserId",
]

interface Model {
    name: string
    body: string
}

function models(schema: string = SCHEMA): Model[] {
    return [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map((m) => ({
        name: m[1],
        body: m[2],
    }))
}

/**
 * Foreign keys to User, whatever they are called.
 *
 * The name list above was the whole detector once, and it had a hole the size
 * of the B2B surface: `Proposal.createdByUserId`, `DocumentRequest.requestedByUserId`,
 * `QuestionnaireInstance.sentToUserId`, `CollaborationThread.assignedToUserId`
 * and seven more are real `@relation` foreign keys to User under names it never
 * looked for. Those models were not exempted — they were INVISIBLE, which reads
 * identically in a green test run and is the failure mode this file was written
 * to end. Matching the relation itself means a new table cannot hide by picking
 * a new name for its user column.
 */
function userRelationFields(model: Model): string[] {
    return [
        ...model.body.matchAll(
            /^\s{2}\w+\s+User(?:\?|\[\])?\s+@relation\([^)]*fields:\s*\[([^\]]+)\]/gm
        ),
    ].flatMap((m) => m[1].split(",").map((f) => f.trim()))
}

function holdsSubjectData(model: Model): boolean {
    if (userRelationFields(model).length > 0) return true
    return SUBJECT_FIELDS.some((f) => new RegExp(`^\\s{2}${f}\\s`, "m").test(model.body))
}

const lowerFirst = (name: string) => name[0].toLowerCase() + name.slice(1)

/**
 * The decision itself, extracted so the probe at the bottom exercises the same
 * machinery the main test runs: a subject model is handled when the eraser
 * touches its Prisma delegate, exempted when a human wrote down a reason, and
 * UNHANDLED — the failure this file exists for — otherwise.
 */
function unhandledAfterErasure(
    subjectNames: string[],
    eraser: string,
    exempt: Record<string, string>
): string[] {
    return subjectNames.filter((name) => {
        if (name === "User") return false // anonymized in place, by design
        if (exempt[name]) return false
        return !new RegExp(`\\btx\\.${lowerFirst(name)}\\.(deleteMany|updateMany)\\b`).test(eraser)
    })
}

/**
 * Models that legitimately need no erasure line, each with the reason.
 *
 * Adding a name here is a decision a human makes on the record — which is the
 * point. Silence is what this test refuses to accept.
 */
const ERASURE_EXEMPT: Record<string, string> = {
    // Legally retained — see the service header and privacy policy §8.
    Invoice: "tax law, 5 years",
    ConsentAudit: "proof of consent; ip/user-agent scrubbed in place",
    DataExportRequest: "accountability; payload purged in place",
    DeletionRequest: "the erasure record itself",
    Subscription: "financial metering, keyed to the anonymized row",
    CreditTransaction: "financial ledger",
    TokenPurchase: "financial ledger",
    TokenUsage: "financial metering",
    TokenBalance: "financial metering",
    MonthlyTokenUsage: "financial metering",
    ReportUnlockPurchase: "financial ledger",
    EntitlementUsage: "financial metering",
    // Agent-authored B2B artifacts — owner decision 2026-07-21, audit H1.
    // These four are one decision, not four: the advisor's professional record
    // of a negotiation survives under their own retention basis, exactly as
    // Opportunity does. They became visible to this guard on 2026-08-14 when it
    // started matching User relations by shape instead of by field name; they
    // were never erased, they were merely unseen.
    Opportunity: "advisor's own record about a prospect",
    Proposal: "advisor's own record about a prospect (child of Opportunity's decision)",
    DocumentRequest: "advisor's own record about a prospect (child of Opportunity's decision)",
    OpportunityStageHistory: "cascades with Opportunity, which is deliberately retained",
    // Not customer data.
    AdminUser: "staff account, not a data subject",
    TenantMembership: "staff/tenant membership, not customer data",
    NotificationTemplate: "admin-authored config; userId is the editing admin",
    NotificationRuleOverride: "admin-authored config; userId is the editing admin",
    BusinessEventOverride: "admin-authored config",
    // Cascades or is covered through another aggregate.
    //
    // "Cascades with X" is only a reason when X is actually DELETED. Policy is
    // (tx.policy.deleteMany). CustomerRelationship is NOT — erasure terminates
    // it in place — so anything hanging off the relationship cascades from
    // nothing. CollaborationParticipant carried this false reason until
    // 2026-08-14: its thread FK is ON DELETE CASCADE, but the thread it points
    // at is never deleted, so the row simply survived. It stays exempt on the
    // honest ground below instead.
    CollaborationParticipant:
        "membership row: the identifying free text lives in the thread subject and message bodies, both scrubbed",
    CollaborationThread: "subject scrubbed in place; the thread is shared with the other party and is not theirs to delete",
    CollaborationAction: "cascades with CollaborationThread; title/description are advisor-authored task text, retained with the thread",
    PolicyDocument: "cascades with the policy, which is deleted; uploadedByUserId resolves to the anonymized row",
    PolicyMergeRequest: "cascades with either linked policy, which is deleted; both user FKs resolve to the anonymized row",
    PolicyRenewal: "cascades with the policy, which is deleted",
    PolicyAnalysisRun: "cascades with the policy, which is deleted",
    ActivityLog: "GDPR access record; retained as the audit of who saw what",
}

describe("every personal-data store is erased or explicitly exempt", () => {
    const subjects = models().filter(holdsSubjectData)

    it("finds a meaningful number of personal-data models to check", () => {
        // A broken matcher that finds nothing would make this whole file pass
        // vacuously, which is the failure mode of guards like this one.
        expect(subjects.length).toBeGreaterThan(20)
    })

    it("leaves nothing behind after an erasure request", () => {
        const unhandled = unhandledAfterErasure(subjects.map((m) => m.name), ERASER, ERASURE_EXEMPT)

        expect(
            unhandled,
            "These models hold personal data and survive erasure untouched.\n" +
                "Because the User row is anonymized rather than deleted, no FK cascade\n" +
                "cleans them up. Either erase them in gdpr-erasure.service.ts, or add\n" +
                `them to ERASURE_EXEMPT with the reason:\n  ${unhandled.join("\n  ")}`
        ).toEqual([])
    })

    it("erases the stores that were found surviving, by name", () => {
        // Named explicitly so a refactor cannot quietly drop them again.
        expect(ERASER).toMatch(/tx\.pushDevice\.deleteMany/)
        expect(ERASER).toMatch(/tx\.businessEvent\.deleteMany/)
        expect(ERASER).toMatch(/tx\.riskReview\.deleteMany/)
        expect(ERASER).toMatch(/tx\.userNotificationSettings\.deleteMany/)
        // The needs layer (2026-09): the person's own statements about what
        // matters — nothing in it is worth keeping without the person.
        expect(ERASER).toMatch(/tx\.protectionProfile\.deleteMany/)
    })

    it("scrubs EVERY PolicyholderProfile column the schema carries — derived, not listed", () => {
        // Found surviving in Sept 2026: the columns added with the life-context
        // migration were never added to the scrub, so an erased profile still
        // said "owns a boat, runs a business, three properties". This check
        // was a hand-kept list of fifteen names when that happened, which is
        // how it happened: the list is now the schema itself, and a column
        // added tomorrow is covered by a test written today.
        const profile = models().find((m) => m.name === "PolicyholderProfile")!
        const columns = [...profile.body.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s+\S/gm)]
            .map((m) => m[1])
            .filter((name) => !["id", "userId", "user", "createdAt", "updatedAt"].includes(name))
        expect(columns).toContain("factProvenance")
        expect(columns).toContain("incomeDependency")
        const scrub = ERASER.slice(
            ERASER.indexOf("tx.policyholderProfile.updateMany("),
            ERASER.indexOf("tx.agentProfile.updateMany(")
        )
        const missing = columns.filter((column) => !new RegExp(`\\b${column}:`).test(scrub))
        expect(missing, `not scrubbed on erasure:\n${missing.join("\n")}`).toEqual([])
    })

    it("matches the business event on its subject, not its actor", () => {
        // `subjectUserId` is whose life the event is about; the actor may be an
        // advisor or the system. Erasing by actor would delete other people's
        // history and miss the subject's own.
        const block = ERASER.slice(ERASER.indexOf("tx.businessEvent.deleteMany"))
        expect(block.slice(0, 120)).toContain("subjectUserId")
    })
})

/**
 * Art. 15 is the mirror of Art. 17. If a record is personal enough that we
 * delete it when someone asks to be forgotten, it is personal enough to show
 * them when they ask what we hold. The asymmetry — erased but never disclosed —
 * is not a defensible position.
 */
describe("what we erase, we also disclose", () => {
    const ERASED_BUT_NOT_EXPORTED_OK: Record<string, string> = {
        // Credentials and ephemeral auth state: disclosing them would hand over
        // the means to authenticate, which Art. 15(4) does not require.
        Session: "session token",
        ActiveSession: "session token",
        PasskeyCredential: "authenticator credential",
        WebAuthnChallenge: "ephemeral challenge nonce",
        Account: "OAuth refresh tokens",
        PaymentMethod: "card token held by Stripe",
        // Disclosed through a richer shape elsewhere in the payload.
        NotificationPreference: "covered by notificationSettings + preferences",
        SecurityEvent: "security telemetry; disclosed on request via DSR workflow",
        Invite: "covered by advisorRelationships",
        FormSubmission: "matched by email, not userId; disclosed via the DSR workflow",
        UserTask: "surfaced in-product as the task list",
        AccessGrant: "already exported as accessGrants",
        GapInstance: "already exported as detectedGaps",
    }

    it("every erased store appears in the Art. 15 export", () => {
        const erased = [
            ...ERASER.matchAll(/tx\.([a-zA-Z]+)\.(?:deleteMany|updateMany)\b/g),
        ].map((m) => m[1])

        const missing = [...new Set(erased)]
            .filter((model) => {
                const pascal = model[0].toUpperCase() + model.slice(1)
                if (ERASED_BUT_NOT_EXPORTED_OK[pascal]) return false
                // A model can be exported as its own query OR as a nested
                // select on another (the profiles hang off `db.user`).
                const own = new RegExp(`\\bdb\\.${model}\\.`).test(EXPORTER)
                const nested = new RegExp(`^\\s+${model}:\\s*\\{`, "m").test(EXPORTER)
                return !own && !nested
            })
            .sort()

        expect(
            missing,
            "Erased on request but never disclosed on request. Either export them\n" +
                "in compliance.service.ts or record why disclosure does not apply:\n" +
                `  ${missing.join("\n  ")}`
        ).toEqual([])
    })

    it("does not hand back the push encryption keys", () => {
        // The endpoint identifies the device and is disclosable; p256dh/auth are
        // the credential that lets anyone encrypt a push for it.
        const block = EXPORTER.slice(
            EXPORTER.indexOf("db.pushDevice.findMany"),
            EXPORTER.indexOf("db.riskReview.findMany")
        )
        expect(block).not.toMatch(/\bp256dh:\s*true/)
        expect(block).not.toMatch(/\bauth:\s*true/)
    })
})

/**
 * PROBES — the derivation proven against a synthetic schema (CLAUDE.md: a
 * guard without a probe in the repo is not a guard). The three models encode
 * the three ways this guard has actually failed or nearly failed:
 *
 *   · LeakyDiary       — a new table with a plain `userId` string, the
 *                        push_devices shape that outlived erasure silently;
 *   · OddlyNamedCustody — a real @relation to User under a field name no
 *                        hand-kept list would ever have contained: the
 *                        `requestedByUserId`/`sentToUserId` hole that made
 *                        eleven B2B models INVISIBLE rather than exempt;
 *   · PureConfig       — no subject at all, which must stay out of the
 *                        universe or the exemption list fills with noise.
 */
describe("the derivation is proven against a synthetic schema", () => {
    const SYNTHETIC = `
model LeakyDiary {
  id     String @id
  userId String
  notes  String
}

model OddlyNamedCustody {
  id              String @id
  custodianUserId String
  keeper          User   @relation(fields: [custodianUserId], references: [id])
}

model PureConfig {
  id    String @id
  value String
}
`
    const synthetic = models(SYNTHETIC)

    it("parses all three models (the parser is not vacuous)", () => {
        expect(synthetic.map((m) => m.name)).toEqual(["LeakyDiary", "OddlyNamedCustody", "PureConfig"])
    })

    it("sees the plain userId AND the relation under a name no list would carry", () => {
        const subjects = synthetic.filter(holdsSubjectData).map((m) => m.name)
        expect(subjects).toEqual(["LeakyDiary", "OddlyNamedCustody"])
        // The relation matcher specifically — not the name list — is what finds it.
        expect(userRelationFields(synthetic[1])).toEqual(["custodianUserId"])
    })

    it("RED: an eraser that never touches them reports both as unhandled, by name", () => {
        const subjects = synthetic.filter(holdsSubjectData).map((m) => m.name)
        expect(unhandledAfterErasure(subjects, "/* erases nothing */", {})).toEqual([
            "LeakyDiary",
            "OddlyNamedCustody",
        ])
    })

    it("GREEN: erasing one and exempting the other with a reason clears the list", () => {
        const subjects = synthetic.filter(holdsSubjectData).map((m) => m.name)
        expect(
            unhandledAfterErasure(subjects, "await tx.leakyDiary.deleteMany({ where: { userId } })", {
                OddlyNamedCustody: "synthetic probe reason",
            })
        ).toEqual([])
    })

    it("a MENTION of the delegate in a comment does not count as erasure", () => {
        const subjects = synthetic.filter(holdsSubjectData).map((m) => m.name)
        // The wrong delegate never matches…
        expect(
            unhandledAfterErasure(subjects, "await tx.someOtherModel.deleteMany({})", {
                OddlyNamedCustody: "synthetic probe reason",
            })
        ).toEqual(["LeakyDiary"])
        // …and a TODO naming the right one is prose, not erasure, once the
        // eraser source is comment-stripped the way the main test strips it.
        expect(
            unhandledAfterErasure(
                subjects,
                stripComments("// TODO: tx.leakyDiary.deleteMany before launch"),
                { OddlyNamedCustody: "synthetic probe reason" }
            )
        ).toEqual(["LeakyDiary"])
    })
})
