import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { logger } from "@/lib/logger"
import { NON_LIVE_POLICY_STATUSES, resolvePolicyLifecycle } from "@/lib/policy-status"
import { INSURANCE_BRANCHES, branchFamilyId } from "@/lib/insurance/taxonomy"

/** Every branch id whose family is home — the lines the ENFIA reduction can apply to. */
export const HOME_FAMILY_IDS: readonly string[] = INSURANCE_BRANCHES
    .map((b) => b.id)
    .filter((id) => branchFamilyId(id) === "home")

export type EnfiaSeasonSummary = {
    policiesScanned: number
    ownersNotified: number
    errors: string[]
}

/**
 * The seasonal ENFIA prompt (spec v2 §14 / §22.3 ENFIA_SEASON_ALERT).
 *
 * One notification per OWNER per year, never per policy, asking them to check
 * whether their home policy carries the three perils the ENFIA reduction
 * requires (fire, earthquake, flood — Law 4223/2013 art. 3 §7ζ, cited in
 * lib/gaps/provenance.ts). It is a prompt to CHECK, not a verdict: the
 * missing_enfia_components rule is what decides eligibility, and only on a
 * policy whose extraction stated all three flags.
 */
export async function runEnfiaSeasonScan(now: Date = new Date()): Promise<EnfiaSeasonSummary> {
    const summary: EnfiaSeasonSummary = { policiesScanned: 0, ownersNotified: 0, errors: [] }
    const year = now.getFullYear()
    try {
        const policies = await db.policy.findMany({
            where: {
                status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
                lineOfBusiness: { in: [...HOME_FAMILY_IDS] },
            },
            select: { id: true, ownerUserId: true, lineOfBusiness: true, endDate: true, coverageEndDate: true, acordData: true },
        })
        summary.policiesScanned = policies.length
        // In force today, by the ONE lifecycle call — an expired home policy
        // earns no prompt about a reduction it can no longer qualify for.
        const owners = new Set<string>()
        for (const policy of policies) {
            const lifecycle = resolvePolicyLifecycle(policy as any, now)
            if (lifecycle.daysUntilExpiry !== null && lifecycle.daysUntilExpiry < 0) continue
            owners.add(policy.ownerUserId)
        }
        for (const userId of owners) {
            await emit({
                event: "enfia_season",
                userId,
                title: { el: "Ελέγξτε το ασφαλιστήριο κατοικίας σας για τη μείωση ΕΝΦΙΑ", en: "Check your home policy for the ENFIA reduction" },
                message: {
                    el: "Η μείωση ΕΝΦΙΑ για ασφαλισμένες κατοικίες προϋποθέτει κάλυψη πυρκαγιάς, σεισμού και πλημμύρας. Δείτε τι καταγράφει το ασφαλιστήριό σας και ρωτήστε τον ασφαλιστή σας για ό,τι λείπει.",
                    en: "The ENFIA reduction for insured homes requires fire, earthquake and flood cover. See what your policy records and ask your insurer about anything missing.",
                },
                dedupeKey: `enfia_season:${year}:${userId}`,
            })
            summary.ownersNotified++
        }
    } catch (err) {
        const msg = `ENFIA season scan failed: ${err}`
        summary.errors.push(msg)
        logger("error", msg)
    }
    return summary
}
