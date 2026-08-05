import { db } from "@/lib/db"
import { toSubjectQualificationView } from "@/lib/medic/subject-view"

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
        detectedGaps,
        protectionScore,
        recommendations,
        lifeEventInstances,
        riskProfileVersions,
        advisorRelationships,
        accessGrants,
        analysisRuns,
        advisorOpportunities,
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
                // Art. 15(1) is a copy of the personal data undergoing processing.
                // This selected `preferences` and the timestamps — so a subject
                // access request returned everything EXCEPT what the person had
                // actually told us: date of birth, income, mortgage and loans,
                // occupation, driving record, and the special-category health
                // fields the risk wizard collects under Art. 9 (chronic
                // conditions, family medical history, height, weight, smoking,
                // activity level, gender). Those are precisely the data someone
                // exercises this right over.
                policyholderProfile: {
                    select: {
                        preferences: true,
                        maritalStatus: true,
                        dependentsCount: true,
                        employmentStatus: true,
                        ownsHome: true,
                        mortgageAmount: true,
                        hasPets: true,
                        petsCount: true,
                        vehiclesCount: true,
                        dateOfBirth: true,
                        annualIncome: true,
                        occupation: true,
                        riskTolerance: true,
                        hasLoans: true,
                        loanAmount: true,
                        travelsFrequently: true,
                        smokingStatus: true,
                        lifeEvents: true,
                        gender: true,
                        heightCm: true,
                        weightKg: true,
                        chronicConditions: true,
                        familyMedicalHistory: true,
                        drivingRecord: true,
                        activityLevel: true,
                        // Life Context Risk Assessment factors. Same Art. 15
                        // reasoning as the fields above: these are things the
                        // person told us about their household, property,
                        // business and finances, so they are exactly what a
                        // subject access request is for. `answeredFields` is
                        // included deliberately — it records what we asked, which
                        // is itself personal data about the exchange.
                        childrenCount: true,
                        residenceType: true,
                        propertiesOwned: true,
                        rentsOutProperty: true,
                        ownsBoat: true,
                        ownsBusiness: true,
                        businessEmployees: true,
                        savingsAmount: true,
                        valuablesValue: true,
                        activities: true,
                        cyberExposure: true,
                        retirementPlanning: true,
                        coverHeldElsewhere: true,
                        answeredFields: true,
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
        // Derived personal data — assessments and profiling outputs the product
        // holds about this person. Art. 15 covers what is inferred, not only what
        // was submitted, and these are the conclusions the product acts on.
        db.gapInstance.findMany({
            where: { policy: { ownerUserId: userId } },
            select: {
                id: true,
                policyId: true,
                severity: true,
                status: true,
                aiExplanation: true,
                aiSuggestion: true,
                detectedAt: true,
            },
            orderBy: { detectedAt: "desc" },
            take: 200,
        }),
        db.protectionScore.findUnique({
            where: { userId },
            select: {
                overallScore: true,
                categoryScores: true,
                gapCount: true,
                expectedLines: true,
                actualLines: true,
                computedAt: true,
            },
        }),
        db.recommendationInstance.findMany({
            where: { userId },
            select: {
                id: true,
                lineOfBusiness: true,
                ruleId: true,
                title: true,
                description: true,
                urgency: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        }),
        // Life events are among the most personal data the product holds —
        // marriage, divorce, a birth, a change in health. Art. 15(1) is a copy
        // of the personal data undergoing processing, and these are exactly what
        // someone exercises that right over.
        db.lifeEventInstance.findMany({
            where: { userId },
            select: {
                id: true,
                definitionId: true,
                occurredAt: true,
                discoveredAt: true,
                source: true,
                confidence: true,
                magnitude: true,
                status: true,
                appliedPatch: true,
            },
            orderBy: { occurredAt: "desc" },
            take: 500,
        }),
        // The assessment history. Derived rather than declared, but it is a
        // record OF this person and disclosable on the same basis.
        db.riskProfileVersion.findMany({
            where: { userId },
            select: {
                version: true,
                computedAt: true,
                trigger: true,
                overallScore: true,
                indeterminate: true,
                openFindingCount: true,
                categoryScores: true,
            },
            orderBy: { version: "desc" },
            take: 200,
        }),
        // Who can see this person's policies, and which advisor is linked to
        // them — relationships are personal data about the subject too.
        db.customerRelationship.findMany({
            where: { policyholderUserId: userId },
            select: { id: true, agentUserId: true, status: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        }),
        db.accessGrant.findMany({
            where: { granterUserId: userId },
            select: { id: true, granteeUserId: true, scope: true, permissions: true, status: true, grantedAt: true, revokedAt: true },
            orderBy: { grantedAt: "desc" },
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
        // What an advisor concluded about this person's needs: the opportunity
        // pipeline and its MEDIC qualification snapshot. Personal data about the
        // subject (need, € at risk, how far the decision has got), so Art. 15(1)
        // covers it — the fact that the agent may RETAIN it under their own IDD
        // basis (erasure decision, audit H1) is a separate right. Reached via
        // the relationship, since Opportunity carries no userId of its own.
        db.opportunity.findMany({
            where: { relationship: { policyholderUserId: userId } },
            select: {
                id: true,
                status: true,
                lineOfBusiness: true,
                estimatedPremium: true,
                quotedPremium: true,
                wonPremium: true,
                currency: true,
                medic: true,
                medicScore: true,
                medicUpdatedAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
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
        // Derived data — what the product concluded about this person.
        detectedGaps: detectedGaps.map((gap) => ({
            ...gap,
            detectedAt: toIso(gap.detectedAt),
        })),
        protectionScore: protectionScore
            ? { ...protectionScore, computedAt: toIso(protectionScore.computedAt) }
            : null,
        lifeEvents: lifeEventInstances.map((event) => ({
            ...event,
            occurredAt: toIso(event.occurredAt),
            discoveredAt: toIso(event.discoveredAt),
            magnitude: event.magnitude ? Number(event.magnitude) : null,
        })),
        riskProfileVersions: riskProfileVersions.map((v) => ({
            ...v,
            computedAt: toIso(v.computedAt),
        })),
        recommendations: recommendations.map((rec) => ({
            ...rec,
            createdAt: toIso(rec.createdAt),
        })),
        advisorRelationships: advisorRelationships.map((rel) => ({
            ...rel,
            createdAt: toIso(rel.createdAt),
        })),
        accessGrants: accessGrants.map((grant) => ({
            ...grant,
            grantedAt: toIso(grant.grantedAt),
            revokedAt: toIso(grant.revokedAt),
        })),
        analysisArtifacts: analysisRuns.map((run) => ({
            ...run,
            startedAt: toIso(run.startedAt),
            finishedAt: toIso(run.finishedAt),
            createdAt: toIso(run.createdAt),
        })),
        // Art. 15(4): the qualification snapshot's third-party names (spouse,
        // accountant…) are withheld; everything about the subject is disclosed.
        advisorOpportunities: advisorOpportunities.map((opp) => ({
            id: opp.id,
            status: opp.status,
            lineOfBusiness: opp.lineOfBusiness,
            estimatedPremium: opp.estimatedPremium ? opp.estimatedPremium.toString() : null,
            quotedPremium: opp.quotedPremium ? opp.quotedPremium.toString() : null,
            wonPremium: opp.wonPremium ? opp.wonPremium.toString() : null,
            currency: opp.currency,
            qualificationScore: opp.medicScore,
            qualificationUpdatedAt: toIso(opp.medicUpdatedAt),
            qualification: toSubjectQualificationView(opp.medic),
            createdAt: toIso(opp.createdAt),
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
