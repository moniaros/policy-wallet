import { createApiResponse, createApiError } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { declareLifeEvent, getLifeEventHistory } from "@/lib/services/life-events/service"
import { getRiskProfileHistory } from "@/lib/services/life-events/risk-profile-version"
import { lifeEventIds } from "@/lib/services/life-events/registry"

/**
 * GET  /api/v1/life-events — the customer's declared events + risk profile versions
 * POST /api/v1/life-events — declare one
 *
 * Only the account holder may declare events about their own life. There is no
 * advisor-writes path here on purpose: an advisor-asserted life event would need
 * a distinguishable provenance, and conflating the two would silently turn
 * someone else's inference into the customer's own declaration.
 */

const DeclareSchema = z.object({
    // Validated against the registry rather than a hand-maintained enum, so
    // adding an event stays a registry change and never a schema change.
    definitionId: z.string().refine((id) => lifeEventIds().includes(id), {
        message: "unknown life event",
    }),
    occurredAt: z.string().datetime(),
    // `.finite()` matters: z.number() accepts Infinity, and an infinite
    // mortgage balance is not a rejection the applier should have to make.
    magnitude: z.number().finite().min(0).max(100_000_000).nullable().optional(),
})

export const GET = withApiGuard({ auth: { mode: "user" } }, async ({ auth }) => {
    const userId = auth!.dbUser.id
    const [events, versions] = await Promise.all([
        getLifeEventHistory(userId),
        getRiskProfileHistory(userId),
    ])
    return createApiResponse({ events, versions })
})

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth }) => `life-events:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, req }) => {
        const userId = auth!.dbUser.id
        const body = await req.json().catch(() => null)
        const parsed = DeclareSchema.safeParse(body)
        if (!parsed.success) {
            return createApiError("VALIDATION_ERROR", "Invalid data", 400, parsed.error.issues)
        }

        const occurredAt = new Date(parsed.data.occurredAt)
        // A future-dated life event is a prediction, and predictions belong to a
        // different system with its own confidence rules.
        if (occurredAt.getTime() > Date.now()) {
            return createApiError("VALIDATION_ERROR", "Event date cannot be in the future", 400, [
                { path: ["occurredAt"], message: "future_date" },
            ])
        }

        const result = await declareLifeEvent({
            userId,
            definitionId: parsed.data.definitionId,
            occurredAt,
            magnitude: parsed.data.magnitude ?? null,
        })

        if (!result.ok) {
            return createApiError(
                result.reason === "already_recorded" ? "CONFLICT" : "VALIDATION_ERROR",
                result.reason === "already_recorded"
                    ? "This event is already recorded"
                    : "Unknown life event",
                result.reason === "already_recorded" ? 409 : 400
            )
        }

        return createApiResponse(result)
    }
)
