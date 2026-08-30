/**
 * GDPR erasure engine — the ONE place user data is erased.
 *
 * Called by the admin DSR workflow (executeDeletionRequest) and the admin
 * user hard-delete (deleteUser), both in app/(protected)/admin/actions.ts.
 * Audit that drove this: docs/audits/gdpr-deletion-erasure-2026-07.md.
 *
 * Model: anonymize-in-place. The User row survives (anonymized) so that
 * legally-retained records (invoices — 5y tax law; consent + DSR request
 * records — 5y accountability, per the published privacy policy §8) keep a
 * resolvable, non-identifying anchor.
 *
 * ORDER IS LOAD-BEARING for retry safety. External systems go first, DB
 * last, so any failure leaves the DB intact and the request retryable:
 *   1. Stripe    — cancel live subscriptions (billing must stop even if a
 *                  later step fails; tolerate resource_missing)
 *   2. Supabase auth — delete the auth identity (kills sessions/refresh
 *                  tokens, frees the email for re-signup; tolerate absent)
 *   3. Storage   — delete policy documents (rows still exist, so the file
 *                  list is re-derivable on retry)
 *   4. DB        — one transaction: deletes + field-level anonymization
 * Every step is idempotent; re-running a partially-failed erasure is safe.
 *
 * DELIBERATELY RETAINED (documented retention exceptions):
 *   Invoice (tax law, 5y) · DeletionRequest/DataExportRequest rows minus
 *   payloads (accountability) · ConsentAudit rows minus ip/user-agent
 *   (proof of consent) · Subscription/token/credit ledgers (financial
 *   metering, keyed to the anonymized row) · agent-authored B2B artifacts
 *   about the user (Opportunity notes, Proposal, DocumentRequest — the
 *   agent's own records; owner decision 2026-07-21, audit H1). The
 *   CustomerRelationship row survives but is flipped to `terminated`.
 *
 * NOTHING NEW IS EXEMPT BY DEFAULT. Because this is anonymize-in-place, the
 * User row survives and ON DELETE CASCADE never fires — so a store added
 * without a line here does not get cleaned up by the database, it simply
 * outlives the erasure silently. `tests/unit/erasure-covers-personal-data.test.ts`
 * derives the model list from the schema and fails on any store that has
 * neither an erasure nor a documented exemption.
 */

import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { stripe } from "@/lib/stripe"
import { deleteFile } from "@/lib/storage"
import { createAdminClient } from "@/lib/supabase/admin"
import { deleteBrevoContact } from "@/lib/brevo"
import { logger } from "@/lib/logger"

const ANONYMIZED_EMAIL_DOMAIN = "deleted.policywallet.local"

export function getAnonymizedEmail(userId: string): string {
    return `deleted+${userId}.${Date.now()}@${ANONYMIZED_EMAIL_DOMAIN}`
}

export function isAnonymizedEmail(email: string | null | undefined): boolean {
    return !!email && email.toLowerCase().endsWith(`@${ANONYMIZED_EMAIL_DOMAIN}`)
}

export type ErasureSummary = {
    anonymizedEmail: string
    stripeSubscriptionsCancelled: number
    stripeCustomerDeleted: boolean
    brevoContactDeleted: boolean
    authUserDeleted: boolean
    storageFilesDeleted: number
    deletedPolicies: number
    deletedOauthAccounts: number
    deletedSessions: number
    deletedActiveSessions: number
    deletedPasskeys: number
    deletedChallenges: number
    deletedNotificationPreferences: number
    deletedNotificationEvents: number
    deletedSecurityEvents: number
    deletedAccessGrants: number
    deletedInvites: number
    deletedPaymentMethods: number
    deletedQuestionnaireResponses: number
    deletedUserTasks: number
    deletedGapInstances: number
    deletedProtectionScores: number
    deletedRecommendations: number
    deletedLifeEvents: number
    deletedRiskProfileVersions: number
    deletedPushDevices: number
    deletedBusinessEvents: number
    deletedRiskReviews: number
    deletedNotificationSettings: number
    deletedFormSubmissions: number
    scrubbedCollaborationMessages: number
    scrubbedReferrals: number
    scrubbedConsentAudits: number
    purgedDataExports: number
    terminatedRelationships: number
    cancelledSubscriptions: number
    sanitizedPolicyholderProfiles: number
    sanitizedAgentProfiles: number
}

/** Step 1 — stop the money. Local-only cancellation was the exact bug the
 *  account cancel flow already fixed once; never reintroduce it here. */
async function cancelStripeSubscriptions(userId: string): Promise<number> {
    const activeSubs = await db.subscription.findMany({
        where: { userId, status: "active" },
        select: { stripeSubscriptionId: true },
    })

    let cancelled = 0
    for (const sub of activeSubs) {
        if (!sub.stripeSubscriptionId) continue // grandfathered / RevenueCat rows
        try {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId)
            cancelled++
        } catch (error) {
            const code = (error as { code?: string })?.code
            const message = error instanceof Error ? error.message : String(error)
            // Gone or already cancelled (a retry after a partial run) both mean
            // "billing is stopped" — the outcome this step exists to guarantee.
            if (code === "resource_missing" || /already.*cancell?ed/i.test(message)) continue
            throw new Error(`Stripe cancellation failed for ${sub.stripeSubscriptionId}: ${message}`)
        }
    }
    return cancelled
}

/** Owner decision (2026-07-21 review): the Stripe customer object (name,
 *  email, payment methods) is deleted at the processor too. Stripe keeps
 *  finalized invoices retrievable after customer deletion, so the 5-year
 *  tax trail survives. Tolerates already-deleted (retry). */
async function deleteStripeCustomer(stripeCustomerId: string | null): Promise<boolean> {
    if (!stripeCustomerId) return false
    try {
        await stripe.customers.del(stripeCustomerId)
        return true
    } catch (error) {
        const code = (error as { code?: string })?.code
        if (code === "resource_missing") return false
        throw new Error(
            `Stripe customer deletion failed for ${stripeCustomerId}: ${
                error instanceof Error ? error.message : String(error)
            }`
        )
    }
}

/** Step 2 — delete the Supabase auth identity. The DB user is linked to auth
 *  by EMAIL (User.id is a cuid, not the auth uid), so resolve by the
 *  pre-anonymization email. Absent = already deleted on a prior attempt. */
async function deleteSupabaseAuthUser(email: string): Promise<boolean> {
    if (isAnonymizedEmail(email)) return false // prior attempt already renamed the row

    const admin = createAdminClient()
    const target = email.toLowerCase()
    const perPage = 1000

    for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error) {
            throw new Error(`Supabase auth listUsers failed: ${error.message}`)
        }
        const match = data.users.find((u) => u.email?.toLowerCase() === target)
        if (match) {
            const { error: deleteError } = await admin.auth.admin.deleteUser(match.id)
            if (deleteError) {
                throw new Error(`Supabase auth deleteUser failed: ${deleteError.message}`)
            }
            return true
        }
        if (data.users.length < perPage) break
    }
    return false
}

/** Step 3 — delete the policy PDFs (the most sensitive artifacts: health
 *  data). Runs BEFORE the DB transaction so the file list survives a retry. */
async function deleteOwnedPolicyFiles(userId: string): Promise<number> {
    const documents = await db.policyDocument.findMany({
        where: { policy: { ownerUserId: userId } },
        select: { id: true, fileUrl: true },
    })

    let deleted = 0
    const failures: string[] = []
    for (const doc of documents) {
        // deleteFile returns false only on a real storage error (unparseable /
        // unconfigured URLs return true), so false is always worth a retry.
        const ok = await deleteFile(doc.fileUrl)
        if (ok) deleted++
        else failures.push(doc.id)
    }

    if (failures.length > 0) {
        throw new Error(
            `Storage deletion failed for ${failures.length} document(s): ${failures.join(", ")}`
        )
    }
    return deleted
}

/** Step 4 — the DB transaction: deletes + field-level anonymization. */
async function anonymizeDatabaseRecords(userId: string, originalEmail: string) {
    const anonymizedEmail = getAnonymizedEmail(userId)

    return db.$transaction(
        async (tx) => {
            const [
                deletedPolicies,
                deletedOauthAccounts,
                deletedSessions,
                deletedActiveSessions,
                deletedPasskeys,
                deletedChallenges,
                deletedNotificationPreferences,
                deletedNotificationEvents,
                deletedSecurityEvents,
                deletedAccessGrants,
                deletedInvites,
                deletedPaymentMethods,
                deletedQuestionnaireResponses,
                deletedUserTasks,
                deletedProtectionScores,
                deletedRecommendations,
                deletedLifeEvents,
                deletedRiskProfileVersions,
                deletedPushDevices,
                deletedBusinessEvents,
                deletedRiskReviews,
                deletedNotificationSettings,
                deletedFormSubmissions,
                cancelledSubscriptions,
                sanitizedPolicyholderProfiles,
                sanitizedAgentProfiles,
                scrubbedCollaborationMessages,
                // Positional destructuring: these must stay in the same order
                // as the operations above, or every count after them is
                // silently attributed to the wrong thing in the erasure record.
                scrubbedCollaborationThreads,
                deletedQuestionnaireInstanceResponses,
                deletedQuestionnaireInstances,
                scrubbedReferrals,
                scrubbedConsentAudits,
                purgedDataExports,
                terminatedRelationships,
            ] = await Promise.all([
                tx.policy.deleteMany({ where: { ownerUserId: userId } }),
                tx.account.deleteMany({ where: { userId } }),
                tx.session.deleteMany({ where: { userId } }),
                tx.activeSession.deleteMany({ where: { userId } }),
                tx.passkeyCredential.deleteMany({ where: { userId } }),
                tx.webAuthnChallenge.deleteMany({ where: { userId } }),
                tx.notificationPreference.deleteMany({ where: { userId } }),
                tx.notificationEvent.deleteMany({ where: { userId } }),
                tx.securityEvent.deleteMany({ where: { userId } }),
                tx.accessGrant.deleteMany({
                    where: { OR: [{ granterUserId: userId }, { granteeUserId: userId }] },
                }),
                tx.invite.deleteMany({
                    where: { OR: [{ inviterUserId: userId }, { inviteeUserId: userId }] },
                }),
                tx.paymentMethod.deleteMany({ where: { userId } }),
                // Customer-authored questionnaire answers are the subject's own
                // personal data (can include health answers) — erased outright.
                tx.questionnaireResponse.deleteMany({ where: { userId } }),
                tx.userTask.deleteMany({ where: { userId } }),
                tx.protectionScore.deleteMany({ where: { userId } }),
                tx.recommendationInstance.deleteMany({ where: { userId } }),
                // The model here is anonymize-in-place: the User row survives, so
                // ON DELETE CASCADE never fires and these would otherwise outlive
                // the erasure request holding a record of the person's marriage,
                // divorce, children and health changes.
                tx.lifeEventInstance.deleteMany({ where: { userId } }),
                tx.riskProfileVersion.deleteMany({ where: { userId } }),
                // A push subscription is a LIVE delivery address plus the keys to
                // encrypt for it. Left behind, an erased person can still be sent
                // a notification — the most visible possible breach of Art. 17,
                // and one they would experience on their own phone.
                tx.pushDevice.deleteMany({ where: { userId } }),
                // The event log is a durable record of what happened to this
                // person: policies, life events, score movements. `subjectUserId`
                // is the field that makes it theirs.
                tx.businessEvent.deleteMany({ where: { subjectUserId: userId } }),
                // Reviews hold protection scores, finding counts and free-text
                // outcomes written about the person.
                tx.riskReview.deleteMany({ where: { userId } }),
                // Quiet hours and timezone describe someone's daily routine.
                tx.userNotificationSettings.deleteMany({ where: { userId } }),
                // Contact/newsletter submissions have no userId — match by email.
                tx.formSubmission.deleteMany({
                    where: { email: { equals: originalEmail, mode: "insensitive" } },
                }),
                tx.subscription.updateMany({
                    where: { userId, status: "active" },
                    data: { status: "cancelled", autoRenew: false },
                }),
                // Full scrub — the risk/health fields (Art. 9) are the point,
                // not just the preferences blob.
                tx.policyholderProfile.updateMany({
                    where: { userId },
                    data: {
                        preferences: Prisma.JsonNull,
                        maritalStatus: null,
                        dependentsCount: 0,
                        employmentStatus: null,
                        ownsHome: false,
                        mortgageAmount: null,
                        hasPets: false,
                        vehiclesCount: 0,
                        dateOfBirth: null,
                        annualIncome: null,
                        occupation: null,
                        riskTolerance: null,
                        hasLoans: false,
                        loanAmount: null,
                        travelsFrequently: false,
                        smokingStatus: null,
                        lifeEvents: Prisma.JsonNull,
                        gender: null,
                        heightCm: null,
                        weightKg: null,
                        chronicConditions: Prisma.JsonNull,
                        familyMedicalHistory: Prisma.JsonNull,
                        drivingRecord: null,
                        activityLevel: null,
                    },
                }),
                tx.agentProfile.updateMany({
                    where: { userId },
                    data: {
                        agencyName: null,
                        licenseNumber: null,
                        logoUrl: null,
                        website: null,
                        phone: null,
                        documents: Prisma.JsonNull,
                    },
                }),
                // Free text the subject authored inside B2B threads.
                tx.collaborationMessage.updateMany({
                    where: { senderUserId: userId },
                    data: { body: "[deleted]" },
                }),
                // The thread SUBJECT is free text too, and it survived the
                // message scrub because the thread itself is never deleted:
                // it hangs off CustomerRelationship, which erasure terminates
                // rather than removes, so its `onDelete: Cascade` never fires.
                // A line like "Your health policy excludes your daughter" is
                // exactly the sort of thing an erasure is asked to remove.
                tx.collaborationThread.updateMany({
                    where: { createdByUserId: userId },
                    data: { subject: "[deleted]" },
                }),
                // questionnaire_responses.instance_id is RESTRICT, so any
                // surviving response would abort the whole erasure transaction
                // rather than leave a row behind. Responses authored BY the
                // subject are already deleted above; this clears any addressed
                // to them regardless of author, so the delete below cannot
                // fail on a foreign key.
                tx.questionnaireResponse.deleteMany({
                    where: { instance: { sentToUserId: userId } },
                }),
                // Questionnaires ADDRESSED to the subject are the subject's own
                // record — which template, when, and whether they answered.
                // (Ones they SENT as an advisor are a record about someone else
                // and stay, like the other agent-authored artifacts.)
                tx.questionnaireInstance.deleteMany({
                    where: { sentToUserId: userId },
                }),
                // referred_email may identify the subject on someone else's
                // referral rows (by user link or plain email match).
                tx.referral.updateMany({
                    where: {
                        OR: [
                            { referredUserId: userId },
                            { referredEmail: { equals: originalEmail, mode: "insensitive" } },
                        ],
                    },
                    data: { referredEmail: anonymizedEmail },
                }),
                // Consent rows are retained (proof of consent) but ip/user-agent
                // add nothing to that proof.
                tx.consentAudit.updateMany({
                    where: { userId },
                    data: { ipAddress: null, userAgent: null },
                }),
                // Export request rows are retained; the full-PII snapshot and
                // its download token are not.
                tx.dataExportRequest.updateMany({
                    where: { userId },
                    data: { payloadJson: Prisma.JsonNull, downloadToken: null },
                }),
                // Owner decision (2026-07-21 review): erasure terminates the
                // B2B relationship (drops out of books/stats, blocks new
                // collaboration) while agent-authored records survive under
                // the agent's own professional-retention basis.
                tx.customerRelationship.updateMany({
                    where: { OR: [{ policyholderUserId: userId }, { agentUserId: userId }] },
                    data: { status: "terminated" },
                }),
                // ── Grafí application tier stores ──────────────────────────
                // The User row survives (anonymise-in-place), so none of these
                // cascade. Findings and their dismissal reasons are conclusions
                // about the person; household people are names they entered;
                // the share audit is THEIR record of what an adviser saw (rows
                // where they are the adviser stay — they are the customer's
                // record, and the adviser's anonymised User row still resolves);
                // per-document Art. 9 consent goes with the documents.
                tx.finding.deleteMany({ where: { userId } }),
                tx.householdPerson.deleteMany({ where: { userId } }),
                tx.adviserShareAudit.deleteMany({ where: { userId } }),
                tx.documentAiConsent.deleteMany({ where: { userId } }),
            ])

            // Profile-level gaps survive the policy cascade (policyId null) and
            // describe the subject; delete after the batch above so policy-scoped
            // rows are already gone.
            const deletedGapInstances = await tx.gapInstance.deleteMany({
                where: { userId },
            })

            await tx.user.update({
                where: { id: userId },
                data: {
                    email: anonymizedEmail,
                    name: "Deleted User",
                    image: null,
                    phoneNumber: null,
                    taxId: null,
                    pushToken: null,
                    password: null,
                    stripeCustomerId: null,
                    emailVerified: null,
                    lastActiveAt: null,
                    termsVersionAccepted: null,
                    privacyVersionAccepted: null,
                    cookieConsentVersion: null,
                    consentUpdatedAt: null,
                    consentLocale: null,
                    aiProcessingConsentVersion: null,
                },
            })

            return {
                anonymizedEmail,
                deletedPolicies: deletedPolicies.count,
                deletedOauthAccounts: deletedOauthAccounts.count,
                deletedSessions: deletedSessions.count,
                deletedActiveSessions: deletedActiveSessions.count,
                deletedPasskeys: deletedPasskeys.count,
                deletedChallenges: deletedChallenges.count,
                deletedNotificationPreferences: deletedNotificationPreferences.count,
                deletedNotificationEvents: deletedNotificationEvents.count,
                deletedSecurityEvents: deletedSecurityEvents.count,
                deletedAccessGrants: deletedAccessGrants.count,
                deletedInvites: deletedInvites.count,
                deletedPaymentMethods: deletedPaymentMethods.count,
                deletedQuestionnaireResponses: deletedQuestionnaireResponses.count,
                deletedUserTasks: deletedUserTasks.count,
                deletedGapInstances: deletedGapInstances.count,
                deletedProtectionScores: deletedProtectionScores.count,
                deletedRecommendations: deletedRecommendations.count,
                deletedLifeEvents: deletedLifeEvents.count,
                deletedRiskProfileVersions: deletedRiskProfileVersions.count,
                deletedPushDevices: deletedPushDevices.count,
                deletedBusinessEvents: deletedBusinessEvents.count,
                deletedRiskReviews: deletedRiskReviews.count,
                deletedNotificationSettings: deletedNotificationSettings.count,
                deletedFormSubmissions: deletedFormSubmissions.count,
                scrubbedCollaborationMessages: scrubbedCollaborationMessages.count,
                scrubbedReferrals: scrubbedReferrals.count,
                scrubbedConsentAudits: scrubbedConsentAudits.count,
                purgedDataExports: purgedDataExports.count,
                terminatedRelationships: terminatedRelationships.count,
                cancelledSubscriptions: cancelledSubscriptions.count,
                sanitizedPolicyholderProfiles: sanitizedPolicyholderProfiles.count,
                sanitizedAgentProfiles: sanitizedAgentProfiles.count,
            }
        },
        // The default 5s interactive-transaction timeout is too tight for a
        // user with many policies; erasure is rare and correctness-critical.
        { timeout: 30_000 }
    )
}

export async function eraseUserData(userId: string): Promise<ErasureSummary> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, stripeCustomerId: true, roles: true },
    })
    if (!user) {
        throw new Error("User not found")
    }

    // Same rule as the admin user-delete path, enforced at the deepest
    // chokepoint: an admin account cannot be erased while it still holds the
    // admin role (a self-created DSR request on the owner account was one
    // Execute click away from erasing it). Demote first, then erase.
    if (user.roles.includes("admin")) {
        throw new Error("Cannot erase an admin account — remove the admin role first")
    }

    const stripeSubscriptionsCancelled = await cancelStripeSubscriptions(userId)
    const stripeCustomerDeleted = await deleteStripeCustomer(user.stripeCustomerId)
    // Brevo is keyed by email — must run before anonymization renames it.
    // Throws on real failures (retryable); anonymized email = prior run, skip.
    const brevoContactDeleted = isAnonymizedEmail(user.email)
        ? false
        : await deleteBrevoContact(user.email)
    const authUserDeleted = await deleteSupabaseAuthUser(user.email)
    const storageFilesDeleted = await deleteOwnedPolicyFiles(userId)
    const dbSummary = await anonymizeDatabaseRecords(userId, user.email)

    logger("info", "GDPR erasure completed", {
        userId,
        stripeSubscriptionsCancelled,
        stripeCustomerDeleted,
        brevoContactDeleted,
        authUserDeleted,
        storageFilesDeleted,
    })

    return {
        stripeSubscriptionsCancelled,
        stripeCustomerDeleted,
        brevoContactDeleted,
        authUserDeleted,
        storageFilesDeleted,
        ...dbSummary,
    }
}
