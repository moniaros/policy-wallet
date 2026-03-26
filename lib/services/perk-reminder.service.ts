/**
 * Perk Reminder Service
 *
 * Scans active policies for perks/benefits with reminderRecommended=true
 * and sends periodic in-app notifications to ensure users don't miss
 * free services, prevention programs, and assistance features.
 *
 * Run as a daily cron job via /api/v1/jobs/perk-reminders
 */

import { db } from "@/lib/db"
import { sendNotification } from "@/lib/notifications"
import { logger } from "@/lib/logger"
import type { AcordData } from "@/lib/schemas/acord-data"

interface PerkToRemind {
    userId: string
    policyId: string
    policyNumber: string
    insurerName: string
    perkName: { en: string; el: string }
    perkDescription: { en: string; el: string }
    perkType: string
    contactPhone?: string
}

/**
 * Find all active policies with perks that have reminderRecommended=true,
 * filter out users who already received a reminder for that perk within 90 days,
 * and send notification.
 */
export async function runPerkReminderScan(): Promise<{
    scanned: number
    remindersGenerated: number
    errors: number
}> {
    let scanned = 0
    let remindersGenerated = 0
    let errors = 0

    try {
        // Get all active policies with ACORD data
        const activePolicies = await db.policy.findMany({
            where: {
                status: { in: ["active", "pending_review"] },
                endDate: { gt: new Date() },
                acordData: { not: null },
            },
            select: {
                id: true,
                policyNumber: true,
                insurerName: true,
                acordData: true,
                userId: true,
            },
        })

        scanned = activePolicies.length

        const perksToRemind: PerkToRemind[] = []

        for (const policy of activePolicies) {
            if (!policy.acordData || !policy.userId) continue

            const acordData = policy.acordData as unknown as AcordData
            const perks = acordData.perksAndBenefits

            if (!perks || !Array.isArray(perks)) continue

            for (const perk of perks) {
                if (!perk.reminderRecommended) continue

                perksToRemind.push({
                    userId: policy.userId,
                    policyId: policy.id,
                    policyNumber: policy.policyNumber || "N/A",
                    insurerName: policy.insurerName || "N/A",
                    perkName: perk.name,
                    perkDescription: perk.description,
                    perkType: perk.perkType,
                    contactPhone: perk.contactPhone,
                })
            }
        }

        // Filter out perks that were already reminded within the last 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        const recentReminders = await db.notificationEvent.findMany({
            where: {
                eventType: "perk_reminder",
                createdAt: { gt: ninetyDaysAgo },
                userId: { in: perksToRemind.map((p) => p.userId) },
            },
            select: {
                userId: true,
                metadata: true,
            },
        })

        // Build a set of "userId:policyId:perkType" that were already reminded
        const alreadyReminded = new Set<string>()
        for (const reminder of recentReminders) {
            const meta = reminder.metadata as Record<string, string> | null
            if (meta?.policyId && meta?.perkType) {
                alreadyReminded.add(`${reminder.userId}:${meta.policyId}:${meta.perkType}`)
            }
        }

        // Send reminders for perks not yet reminded
        for (const perk of perksToRemind) {
            const key = `${perk.userId}:${perk.policyId}:${perk.perkType}`
            if (alreadyReminded.has(key)) continue

            try {
                // Resolve user's preferred language
                const user = await db.user.findUnique({
                    where: { id: perk.userId },
                    select: { preferredLanguage: true },
                })
                const lang = (user?.preferredLanguage === "en" ? "en" : "el") as "en" | "el"

                const phoneNote = perk.contactPhone
                    ? ` ${perk.contactPhone}`
                    : ""

                const title = lang === "el"
                    ? `💡 Μην ξεχάσετε: ${perk.perkName.el}`
                    : `💡 Don't forget: ${perk.perkName.en}`

                const message = lang === "el"
                    ? `Το ασφαλιστήριο ${perk.insurerName} (${perk.policyNumber}) περιλαμβάνει: ${perk.perkDescription.el}${phoneNote}`
                    : `Your ${perk.insurerName} policy (${perk.policyNumber}) includes: ${perk.perkDescription.en}${phoneNote}`

                await sendNotification({
                    userId: perk.userId,
                    eventType: "perk_reminder",
                    title,
                    message,
                    relatedObjectType: "policy",
                    relatedObjectId: perk.policyId,
                })

                remindersGenerated++
            } catch (err) {
                errors++
                logger("error", "Failed to send perk reminder", {
                    userId: perk.userId,
                    perkType: perk.perkType,
                    error: err instanceof Error ? err.message : String(err),
                })
            }
        }

        logger("info", "Perk reminder scan completed", {
            scanned,
            perksFound: perksToRemind.length,
            remindersGenerated,
            skippedAlreadyReminded: perksToRemind.length - remindersGenerated - errors,
            errors,
        })
    } catch (err) {
        logger("error", "Perk reminder scan failed", {
            error: err instanceof Error ? err.message : String(err),
        })
        errors++
    }

    return { scanned, remindersGenerated, errors }
}
