/**
 * Controlled vocabularies for the insurer reference data
 * (prisma/greek-insurers.json → the insurers table, surfaced in
 * /admin/insurers).
 *
 * INSURER_LOB_VALUES is the dataset's 22-value market lines-of-business
 * classification — deliberately NOT lib/insurance/taxonomy's product
 * branches: values like marine_hull or credit_surety describe what an
 * undertaking writes, not what PolicyWallet sells.
 */

export const INSURER_LOB_VALUES = [
    "motor",
    "motorcycle",
    "commercial_vehicle",
    "marine_hull",
    "marine_cargo",
    "property_fire",
    "household",
    "engineering",
    "general_liability",
    "professional_liability",
    "credit_surety",
    "legal_protection",
    "personal_accident",
    "health",
    "life",
    "pensions_savings",
    "group_employee_benefits",
    "travel",
    "roadside_assistance",
    "agricultural",
    "aviation",
    "cyber",
] as const
export type InsurerLob = (typeof INSURER_LOB_VALUES)[number]

export const INSURER_STATUS_VALUES = [
    "active",
    "merged",
    "rebranded",
    "branch",
    "run_off",
] as const
export type InsurerStatus = (typeof INSURER_STATUS_VALUES)[number]

/**
 * Per-field verification state. The first four come from the dataset;
 * admin_edited is stamped by updateInsurer on any field whose value an
 * admin actually changed, so provenance survives corrections.
 */
export const FIELD_CONFIDENCE_VALUES = [
    "verified_2026",
    "stale",
    "unverified",
    "not_applicable",
    "admin_edited",
] as const
export type FieldConfidence = (typeof FIELD_CONFIDENCE_VALUES)[number]
