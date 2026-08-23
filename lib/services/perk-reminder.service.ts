/**
 * Perk Reminder Service
 *
 * Scans active policies for perks/benefits with reminderRecommended=true
 * and sends periodic in-app notifications to ensure users don't miss
 * free services, prevention programs, and assistance features.
 *
 * Run as a daily cron job via /api/v1/jobs/perk-reminders
 */

import { startOfAthensDay } from "@/lib/policy-status"
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
                // A policy in force until tonight still has its perks.
                endDate: { gte: startOfAthensDay(new Date()) },
                acordData: { not: undefined },
            },
            select: {
                id: true,
                policyNumber: true,
                insurerName: true,
                acordData: true,
                ownerUserId: true,
            },
        })

        scanned = activePolicies.length

        const perksToRemind: PerkToRemind[] = []

        for (const policy of activePolicies) {
            if (!policy.acordData || !policy.ownerUserId) continue

            const acordData = policy.acordData as unknown as AcordData
            const perks = acordData.perksAndBenefits

            if (!perks || !Array.isArray(perks)) continue

            for (const perk of perks) {
                if (!perk.reminderRecommended) continue

                perksToRemind.push({
                    userId: policy.ownerUserId,
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
        // Use the relatedObjectId + title pattern to deduplicate since NotificationEvent
        // doesn't have a metadata column
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        const recentReminders = await db.notificationEvent.findMany({
            where: {
                eventType: "perk_reminder",
                createdAt: { gt: ninetyDaysAgo },
                userId: { in: [...new Set(perksToRemind.map((p) => p.userId))] },
            },
            select: {
                userId: true,
                relatedObjectId: true,
                title: true,
            },
        })

        // Build a set of "userId:policyId:perkType" using relatedObjectId + title prefix matching
        const alreadyReminded = new Set<string>()
        for (const reminder of recentReminders) {
            if (reminder.relatedObjectId) {
                // Use policyId + first 30 chars of title as dedup key
                const titleKey = (reminder.title || "").slice(0, 30)
                alreadyReminded.add(`${reminder.userId}:${reminder.relatedObjectId}:${titleKey}`)
            }
        }

        // Send reminders for perks not yet reminded
        for (const perk of perksToRemind) {
            // Resolve user's preferred language
            const user = await db.user.findUnique({
                where: { id: perk.userId },
                select: { preferredLanguage: true },
            })
            const lang = (user?.preferredLanguage === "en" ? "en" : "el") as "en" | "el"

            const localizedTitle = {
                el: `💡 Μην ξεχάσετε: ${perk.perkName.el}`,
                en: `💡 Don't forget: ${perk.perkName.en}`,
            }
            // The dedupe set below is built from STORED rows, whose title was
            // resolved to the recipient's language at dispatch — so the key
            // must use the same arm.
            const title = localizedTitle[lang]

            // Check if already reminded using title prefix + policyId
            const dedupKey = `${perk.userId}:${perk.policyId}:${title.slice(0, 30)}`
            if (alreadyReminded.has(dedupKey)) continue

            try {
                const phoneNote = perk.contactPhone ? ` ${perk.contactPhone}` : ""

                const message = {
                    el: `Το ασφαλιστήριο ${perk.insurerName} (${perk.policyNumber}) περιλαμβάνει: ${perk.perkDescription.el}${phoneNote}`,
                    en: `Your ${perk.insurerName} policy (${perk.policyNumber}) includes: ${perk.perkDescription.en}${phoneNote}`,
                }

                await sendNotification({
                    userId: perk.userId,
                    eventType: "perk_reminder",
                    title: localizedTitle,
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
