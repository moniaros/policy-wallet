import { HeartPulse } from "lucide-react"
import { db } from "@/lib/db"
import { ENDED_RELATIONSHIP_STATUSES } from "@/lib/agent-visibility"
import { getTranslations } from "@/lib/i18n"
import { formatDate } from "@/lib/i18n/format"
import type { HealthSnapshot } from "@/lib/wellness/health-share"

/**
 * Prevention brief P2 — the advisor's view of a health snapshot the customer
 * CHOSE to share with them. Renders only for an active share addressed to
 * this advisor on a living relationship; every render is logged and stamped
 * on the share, so the customer sees «last viewed». Adjustments are proposed
 * by the advisor in the conversation; the platform adds no advice.
 */
export async function SharedHealthPanel({ customerId, agentUserId, language }: { customerId: string; agentUserId: string; language: "el" | "en" }) {
    const share = await db.healthShare.findFirst({
        where: {
            userId: customerId,
            agentUserId,
            status: "active",
            relationship: { status: { notIn: [...ENDED_RELATIONSHIP_STATUSES] } },
        },
        select: { id: true, snapshot: true, createdAt: true },
    })
    if (!share?.snapshot) return null

    const viewedAt = new Date()
    await db.$transaction([
        db.healthShare.update({ where: { id: share.id }, data: { lastViewedAt: viewedAt } }),
        db.activityLog.create({
            data: {
                adminUserId: agentUserId,
                adminEmail: "health_share",
                actionType: "HEALTH_SHARE_VIEWED",
                description: `Advisor viewed health share ${share.id}`,
                metadata: { shareId: share.id },
                targetUserId: customerId,
            },
        }),
    ])

    const t = getTranslations(language)
    const copy = t.wellness.advisorView
    const snap = share.snapshot as unknown as HealthSnapshot
    const label = (map: Record<string, string>, v: string | null) => (v ? map[v] ?? v : copy.notStated)
    const list = (codes: string[]) => (codes.length ? codes.map((c) => (copy.codes as Record<string, string>)[c] ?? c).join(", ") : copy.none)

    return (
        <section className="mx-auto max-w-6xl px-4 pb-6" aria-labelledby="shared-health-heading">
            <div className="pw-card pw-pad" data-fact="customer.healthShare" data-fact-subject={customerId}>
                <div className="flex items-start gap-3">
                    <span className="pw-card-chip" aria-hidden="true"><HeartPulse className="h-4 w-4" strokeWidth={1.75} /></span>
                    <div className="min-w-0 flex-1">
                        <h2 id="shared-health-heading" className="text-title font-semibold text-foreground">{copy.title}</h2>
                        <p className="text-caption text-muted-foreground">{copy.sharedOn.replace("{date}", formatDate(share.createdAt, language))}</p>
                    </div>
                </div>
                {snap.assessment && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-foreground">{copy.assessment.replace("{date}", formatDate(snap.assessment.takenAt, language))}</p>
                        <ul className="mt-2 space-y-1 text-sm text-foreground">
                            {snap.assessment.scores.map((s) => (
                                <li key={s.category}>
                                    {(t.wellness.categories as Record<string, string>)[s.category] ?? s.category}: {s.score} · {(t.wellness.bands as Record<string, string>)[s.band] ?? s.band}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {snap.profile && (
                    <dl className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 text-sm sm:grid-cols-2">
                        <div><dt className="text-caption text-muted-foreground">{copy.smoking}</dt><dd className="text-foreground">{label(copy.smokingValues, snap.profile.smokingStatus)}</dd></div>
                        <div><dt className="text-caption text-muted-foreground">{copy.activity}</dt><dd className="text-foreground">{label(copy.activityValues, snap.profile.activityLevel)}</dd></div>
                        <div><dt className="text-caption text-muted-foreground">{copy.conditions}</dt><dd className="text-foreground">{list(snap.profile.chronicConditions)}</dd></div>
                        <div><dt className="text-caption text-muted-foreground">{copy.family}</dt><dd className="text-foreground">{list(snap.profile.familyMedicalHistory)}</dd></div>
                        <div><dt className="text-caption text-muted-foreground">{copy.bmi}</dt><dd className="text-foreground">{label(copy.bmiBands, snap.profile.bmiBand)}</dd></div>
                    </dl>
                )}
                <p className="mt-4 text-caption text-muted-foreground">{copy.note}</p>
            </div>
        </section>
    )
}
