import { createApiResponse, createApiError } from '@/lib/api-utils'
import { withApiGuard } from '@/lib/api-guard'
import { db } from '@/lib/db'
import { refreshProtectionScore } from '@/lib/services/gap-engine'
import { RiskProfileSchema } from '@/lib/validations/risk-profile'


export const PATCH = withApiGuard(
  {
    auth: { mode: "user" },
    rateLimit: {
      limit: 20,
      windowMs: 60 * 1000,
      key: ({ auth }) => `risk-profile:${auth?.dbUser.id || "anonymous"}`,
    },
  },
  async ({ auth, req }) => {
    const userId = auth!.dbUser.id

    const body = await req.json()
    const parsed = RiskProfileSchema.safeParse(body)

    if (!parsed.success) {
      return createApiError('VALIDATION_ERROR', 'Invalid data', 400, parsed.error.issues)
    }

    // Every writable column, in one list. The old code destructured 22 names and
    // re-listed all 22 into an object literal — adding a field meant editing
    // three places and the compiler could not tell you if you missed one.
    const { answeredFields: declaredAnswered, ...submitted } = parsed.data

    // Remove undefined fields so we don't overwrite existing values
    const cleanData = Object.fromEntries(
      Object.entries(submitted).filter(([, v]) => v !== undefined)
    )

    // Record what the customer has now answered. A submitted field is answered
    // by definition; `answeredFields` additionally covers the ones they were
    // shown and deliberately left at the default, which a value alone cannot
    // express (see the schema note above).
    const existing = await db.policyholderProfile.findUnique({
      where: { userId },
      select: { answeredFields: true },
    })
    const previouslyAnswered = Array.isArray(existing?.answeredFields)
      ? (existing.answeredFields as unknown[]).filter((f): f is string => typeof f === 'string')
      : []
    const answered = [
      ...new Set([
        ...previouslyAnswered,
        ...Object.keys(cleanData),
        ...(declaredAnswered ?? []),
      ]),
    ]

    const updatedProfile = await db.policyholderProfile.upsert({
      where: { userId },
      update: { ...cleanData, answeredFields: answered },
      create: {
        userId,
        ...cleanData,
        answeredFields: answered,
      },
    })

    // Re-run the engine BEFORE responding, and await it.
    //
    // It used to be fire-and-forget, which raced the client: the wizard calls
    // `router.refresh()` the moment this resolves, and the page re-reads the
    // PERSISTED recommendation rows. The engine had not finished rewriting them,
    // so the customer answered "I have two children", watched the page reload,
    // and saw the same recommendations as before — the one moment the product
    // most needs to demonstrate that answering questions changes the advice.
    //
    // Still non-fatal: the profile is saved either way, and a failed re-run must
    // not turn a successful save into an error the customer has to retry.
    await refreshProtectionScore(userId).catch((err) => {
        console.error("Post-profile-update engine run failed:", err)
    })

    return createApiResponse({ success: true, profile: updatedProfile })
  }
)
