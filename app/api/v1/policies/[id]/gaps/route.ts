import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiUser } from "@/lib/api-auth"
import { getPolicyAccess } from "@/lib/policy-access"
import { describeSeverityForDefinition } from "@/lib/gaps/severity-display"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    try {
        // Was an inline `policy: { ownerUserId }` filter, which denied an agent
        // holding a perfectly good grant on this policy the gaps for it — while
        // the PATCH on the policy itself let them through. Same rule everywhere
        // now; "not found" rather than "forbidden" so the existence of a policy
        // is not a thing an outsider can probe.
        const access = await getPolicyAccess(id, {
            id: authResult.dbUser.id,
            roles: authResult.dbUser.roles,
        })
        if (!access.exists || !access.canRead) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Policy not found", status: 404 } },
                { status: 404 }
            )
        }

        const gaps = await db.gapInstance.findMany({
            where: { policyId: id },
            include: { definition: true }
        })

        const summary = {
            total: gaps.length,
            by_severity: {
                high: gaps.filter(g => g.severity === "high").length,
                medium: gaps.filter(g => g.severity === "medium").length,
                low: gaps.filter(g => g.severity === "low").length
            },
            by_status: {
                open: gaps.filter(g => g.status === "open").length,
                acknowledged: gaps.filter(g => g.status === "acknowledged").length,
                resolved: gaps.filter(g => !!g.resolvedAt).length
            }
        }

        return NextResponse.json({
            data: {
                gaps: gaps.map(gi => ({
                    id: gi.id,
                    gap_definition_id: gi.gapDefinitionId,
                    title: (gi.definition as any).title,
                    description: (gi.definition as any).description,
                    severity: gi.severity,
                    // Severity is a rule's output, not an underwriter's verdict.
                    // Anything consuming this API — including an integration we
                    // never see — is told so here rather than being left to
                    // assume a four-point scale means what it looks like.
                    // Gate 3b is recorded per definition, so this flips for one
                    // rule at a time as sign-off arrives.
                    severity_validated: Boolean((gi.definition as any).severityValidatedAt),
                    severity_caveat_key: describeSeverityForDefinition(
                        gi.severity,
                        gi.definition as any
                    ).caveatKey,
                    status: gi.status,
                    ai_explanation: gi.aiExplanation,
                    ai_suggestion: gi.aiSuggestion,
                    detected_at: gi.detectedAt,
                    acknowledged_at: null
                })),
                summary
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Server error", status: 500 } },
            { status: 500 }
        )
    }
}
