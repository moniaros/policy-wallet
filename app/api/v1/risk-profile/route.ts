import { createApiResponse, createApiError } from '@/lib/api-utils'
import { withApiGuard } from '@/lib/api-guard'
import { db } from '@/lib/db'
import { z } from 'zod'
import { refreshProtectionScore } from '@/lib/services/gap-engine'

const RiskProfileSchema = z.object({
  // Original fields
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  dependentsCount: z.number().min(0).optional(),
  employmentStatus: z.enum(['employed', 'self_employed', 'retired', 'unemployed']).optional(),
  ownsHome: z.boolean().optional(),
  mortgageAmount: z.number().min(0).optional(),
  hasPets: z.boolean().optional(),
  vehiclesCount: z.number().min(0).optional(),

  // Enhanced risk fields (Gap Detection Engine)
  dateOfBirth: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  annualIncome: z.number().min(0).optional(),
  occupation: z.string().max(100).optional(),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  hasLoans: z.boolean().optional(),
  loanAmount: z.number().min(0).optional(),
  travelsFrequently: z.boolean().optional(),
  smokingStatus: z.enum(['non_smoker', 'smoker', 'former_smoker']).optional(),
  lifeEvents: z.array(z.object({
    type: z.string(),
    date: z.string(),
  })).optional(),
})

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

    const {
      maritalStatus,
      dependentsCount,
      employmentStatus,
      ownsHome,
      mortgageAmount,
      hasPets,
      vehiclesCount,
      dateOfBirth,
      annualIncome,
      occupation,
      riskTolerance,
      hasLoans,
      loanAmount,
      travelsFrequently,
      smokingStatus,
      lifeEvents,
    } = parsed.data

    const profileData = {
      maritalStatus,
      dependentsCount,
      employmentStatus,
      ownsHome,
      mortgageAmount,
      hasPets,
      vehiclesCount,
      dateOfBirth,
      annualIncome,
      occupation,
      riskTolerance,
      hasLoans,
      loanAmount,
      travelsFrequently,
      smokingStatus,
      lifeEvents: lifeEvents ?? undefined,
    }

    // Remove undefined fields so we don't overwrite existing values
    const cleanData = Object.fromEntries(
      Object.entries(profileData).filter(([, v]) => v !== undefined)
    )

    const updatedProfile = await db.policyholderProfile.upsert({
      where: { userId },
      update: cleanData,
      create: {
        userId,
        ...cleanData,
      },
    })

    // Refresh protection score after profile update (fire-and-forget)
    refreshProtectionScore(userId).catch(() => {})

    return createApiResponse({ success: true, profile: updatedProfile })
  }
)
