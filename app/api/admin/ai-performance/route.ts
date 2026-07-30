import { requireApiUser } from "@/lib/api-auth"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { getAiPerformanceSnapshot } from "@/lib/services/ops/ai-performance.service"

// Admin-only AI performance snapshot (the /admin/ai dashboard's data, exposed
// programmatically). Uses the mandated requireApiUser({roles}) guard + the
// createApiResponse envelope — not the older inline-roles style of the token
// routes. Aggregate operational metrics only; no raw AI output is returned.
export async function GET(req: Request) {
    const authCheck = await requireApiUser({ roles: ["admin"] })
    if ("error" in authCheck) return authCheck.error

    const { searchParams } = new URL(req.url)
    const windowHours = clampInt(searchParams.get("windowHours"), 24, 1, 720)
    const trendDays = clampInt(searchParams.get("trendDays"), 30, 1, 180)

    try {
        const snapshot = await getAiPerformanceSnapshot({ windowHours, trendDays })
        return createApiResponse(snapshot)
    } catch (error) {
        console.error("AI performance snapshot failed:", error)
        return createApiError("INTERNAL_ERROR", "Failed to build AI performance snapshot", 500)
    }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
    const n = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(n)) return fallback
    return Math.max(min, Math.min(max, n))
}
