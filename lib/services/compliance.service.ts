import { db } from "@/lib/db"

function toIso(value: Date | null | undefined) {
    return value ? value.toISOString() : null
}

export async function buildUserDataExportPayload(userId: string) {
    const [
        user,
        policies,
        subscriptions,
        invoices,
        tokenPurchases,
        consentAudits,
        deletionRequests,
        analysisRuns,
    ] = await Promise.all([
        db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phoneNumber: true,
                preferredLanguage: true,
                roles: true,
                createdAt: true,
                updatedAt: true,
                termsVersionAccepted: true,
                privacyVersionAccepted: true,
                cookieConsentVersion: true,
                consentUpdatedAt: true,
                consentLocale: true,
                policyholderProfile: {
                    select: {
                        preferences: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                agentProfile: {
                    select: {
                        verificationStatus: true,
                        agencyName: true,
                        licenseNumber: true,
                        submittedAt: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        }),
        db.policy.findMany({
            where: { ownerUserId: userId },
            select: {
                id: true,
                policyNumber: true,
                insurerName: true,
                lineOfBusiness: true,
                startDate: true,
                endDate: true,
                status: true,
                premiumAmount: true,
                premiumCurrency: true,
                coverageSummary: true,
                createdAt: true,
                updatedAt: true,
                documents: {
                    select: {
                        id: true,
                        fileName: true,
                        fileSize: true,
                        source: true,
                        processingStatus: true,
                        uploadedAt: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        db.subscription.findMany({
            where: { userId },
            select: {
                id: true,
                planId: true,
                provider: true,
                status: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                autoRenew: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
        }),
        db.invoice.findMany({
            where: { userId },
            select: {
                id: true,
                invoiceNumber: true,
                amount: true,
                taxAmount: true,
                totalAmount: true,
                currency: true,
                status: true,
                billingDate: true,
                paidAt: true,
            },
            orderBy: { billingDate: "desc" },
        }),
        db.tokenPurchase.findMany({
            where: { userId },
            select: {
                id: true,
                tokensPurchased: true,
                amountEur: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        }),
        db.consentAudit.findMany({
            where: { userId },
            select: {
                id: true,
                consentType: true,
                policyVersion: true,
                locale: true,
                source: true,
                categories: true,
                accepted: true,
                acceptedAt: true,
            },
            orderBy: { acceptedAt: "desc" },
        }),
        db.deletionRequest.findMany({
            where: { userId },
            select: {
                id: true,
                status: true,
                requestedAt: true,
                reviewedAt: true,
                completedAt: true,
                legalBasis: true,
                retentionNotes: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        }),
        db.policyAnalysisRun.findMany({
            where: { userId },
            select: {
                id: true,
                policyId: true,
                provider: true,
                model: true,
                status: true,
                runAttempt: true,
                failureCode: true,
                failureMessage: true,
                blockedReason: true,
                startedAt: true,
                finishedAt: true,
                createdAt: true,
                remediationSummary: true,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
    ])

    if (!user) {
        throw new Error("User not found")
    }

    return {
        generatedAt: new Date().toISOString(),
        generatedBy: "self_service_export",
        user: {
            ...user,
            createdAt: toIso(user.createdAt),
            updatedAt: toIso(user.updatedAt),
            consentUpdatedAt: toIso(user.consentUpdatedAt),
            policyholderProfile: user.policyholderProfile
                ? {
                      ...user.policyholderProfile,
                      createdAt: toIso(user.policyholderProfile.createdAt),
                      updatedAt: toIso(user.policyholderProfile.updatedAt),
                  }
                : null,
            agentProfile: user.agentProfile
                ? {
                      ...user.agentProfile,
                      submittedAt: toIso(user.agentProfile.submittedAt),
                      createdAt: toIso(user.agentProfile.createdAt),
                      updatedAt: toIso(user.agentProfile.updatedAt),
                  }
                : null,
        },
        policies: policies.map((policy) => ({
            ...policy,
            startDate: toIso(policy.startDate),
            endDate: toIso(policy.endDate),
            createdAt: toIso(policy.createdAt),
            updatedAt: toIso(policy.updatedAt),
            documents: policy.documents.map((doc) => ({
                ...doc,
                uploadedAt: toIso(doc.uploadedAt),
            })),
        })),
        analysisArtifacts: analysisRuns.map((run) => ({
            ...run,
            startedAt: toIso(run.startedAt),
            finishedAt: toIso(run.finishedAt),
            createdAt: toIso(run.createdAt),
        })),
        billing: {
            subscriptions: subscriptions.map((subscription) => ({
                ...subscription,
                currentPeriodStart: toIso(subscription.currentPeriodStart),
                currentPeriodEnd: toIso(subscription.currentPeriodEnd),
                createdAt: toIso(subscription.createdAt),
                updatedAt: toIso(subscription.updatedAt),
            })),
            invoices: invoices.map((invoice) => ({
                ...invoice,
                billingDate: toIso(invoice.billingDate),
                paidAt: toIso(invoice.paidAt),
            })),
            tokenPurchases: tokenPurchases.map((purchase) => ({
                ...purchase,
                createdAt: toIso(purchase.createdAt),
            })),
        },
        compliance: {
            consents: consentAudits.map((consent) => ({
                ...consent,
                acceptedAt: toIso(consent.acceptedAt),
            })),
            deletionRequests: deletionRequests.map((request) => ({
                ...request,
                requestedAt: toIso(request.requestedAt),
                reviewedAt: toIso(request.reviewedAt),
                completedAt: toIso(request.completedAt),
                createdAt: toIso(request.createdAt),
            })),
        },
    }
}
