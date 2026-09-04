import { createApiResponse, createApiError } from '@/lib/api-utils'
import { withApiGuard } from '@/lib/api-guard'
import { db } from '@/lib/db'
import { refreshProtectionScore } from '@/lib/services/gap-engine'
import {
  applyFactWrites,
  existingFacts,
  factWritesFrom,
  profileFactData,
} from '@/lib/services/protection-profile/fact-writes'
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

    // Only what the request carries is a write. A field ABSENT from the body is
    // untouched — never an erasure — and a bare undefined is ignored by
    // applyFactWrites. This is the server half of the wizard's erasure bug:
    // until Sept 2026 the form sent `chronicConditions: []` and
    // `isBuildingManager: false` on every save whether or not the person had
    // touched them, and `{ ...cleanData }` wrote them over the stored Art. 9
    // answers. The client half is in components/coverage/risk-profile-payload.ts,
    // which sends a field only when the person touched it or the page
    // pre-filled it from the stored row.
    const submittedFacts = Object.fromEntries(
      Object.entries(submitted).filter(([, v]) => v !== undefined)
    )

    // The assessment is the person's own figures: exact, and newer than
    // whatever any coarser surface wrote, so under the one precedence rule
    // (fact-writes.ts) it replaces a floor from the onboarding or the quick
    // start. `answeredFields` additionally covers the controls they were shown
    // and deliberately left at the default, which a value alone cannot express
    // (see the schema note).
    const existing = await db.policyholderProfile.findUnique({ where: { userId } })
    const facts = profileFactData(
      applyFactWrites({
        existing: existingFacts(existing as Record<string, unknown> | null),
        writes: factWritesFrom(submittedFacts, { source: 'assessment', precision: 'exact' }),
        alsoAnswered: declaredAnswered ?? [],
        now: new Date(),
      })
    )

    const updatedProfile = await db.policyholderProfile.upsert({
      where: { userId },
      update: { ...facts },
      create: { userId, ...facts },
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
