/**
 * Risk-profile intake schema.
 *
 * Lives here rather than inside the route so the validation boundary is
 * testable on its own. A route file can only export HTTP handlers, so a schema
 * defined there can never be asserted against directly — and this is the
 * boundary that decides what reaches the risk engine.
 *
 * The bounds are sanity rails, not underwriting rules: they stop a mistyped or
 * hostile answer poisoning the assessment. Anything outside them is rejected
 * with the field named, never silently clamped — a clamped value would reach the
 * engine looking like a real declaration.
 */

import { z } from 'zod'
import { HIGH_RISK_ACTIVITIES } from '@/lib/services/gap-engine/life-context'
import { WRITE_BRANCH_IDS } from '@/lib/insurance/taxonomy'

export const RiskProfileSchema = z.object({
  // Original fields
  // 'partnered' accepted here too: profile-mapping already allowed it from the
  // advisor questionnaire, so the same declaration was being accepted from one
  // intake and rejected by the other.
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'partnered']).optional(),
  dependentsCount: z.number().min(0).optional(),
  employmentStatus: z.enum(['employed', 'self_employed', 'retired', 'unemployed']).optional(),
  ownsHome: z.boolean().optional(),
  mortgageAmount: z.number().min(0).optional(),
  hasPets: z.boolean().optional(),
  petsCount: z.number().int().min(0).max(50).optional(),
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

  // Health & Lifestyle risk fields
  gender: z.enum(['male', 'female', 'prefer_not_to_say']).optional(),
  heightCm: z.number().int().min(50).max(250).optional(),
  weightKg: z.number().int().min(20).max(500).optional(),
  chronicConditions: z.array(z.string().max(50)).optional(),
  familyMedicalHistory: z.array(z.string().max(50)).optional(),
  drivingRecord: z.enum(['clean', 'minor_violations', 'major_violations', 'accidents']).optional(),
  activityLevel: z.enum(['sedentary', 'moderate', 'active', 'very_active']).optional(),

  // ── Life Context factors ─────────────────────────────────────────────────
  childrenCount: z.number().int().min(0).max(20).optional(),
  residenceType: z.enum(['owned', 'rented', 'family', 'company']).optional(),
  propertiesOwned: z.number().int().min(0).max(100).optional(),
  rentsOutProperty: z.boolean().optional(),
  ownsBoat: z.boolean().optional(),
  ownsBusiness: z.boolean().optional(),
  businessEmployees: z.number().int().min(0).max(10_000).optional(),
  savingsAmount: z.number().min(0).max(100_000_000).optional(),
  valuablesValue: z.number().min(0).max(100_000_000).optional(),
  activities: z.array(z.enum(HIGH_RISK_ACTIVITIES)).max(HIGH_RISK_ACTIVITIES.length).optional(),
  cyberExposure: z.enum(['low', 'moderate', 'high']).optional(),
  retirementPlanning: z.boolean().optional(),
  coverHeldElsewhere: z.array(z.enum(WRITE_BRANCH_IDS)).max(WRITE_BRANCH_IDS.length).optional(),

  /**
   * Fields the customer was SHOWN and chose to leave at their default.
   *
   * Answering "no, I have no pets" writes `hasPets: false`, which is
   * indistinguishable from the column default — so without this the engine
   * cannot tell a declaration from silence, and the risk stays `needs_review`
   * forever no matter how carefully the customer fills the form in. The client
   * sends the fields it rendered; the server unions them with whatever was
   * actually submitted.
   */
  answeredFields: z.array(z.string().max(64)).max(64).optional(),
})


export type RiskProfileInput = z.infer<typeof RiskProfileSchema>
