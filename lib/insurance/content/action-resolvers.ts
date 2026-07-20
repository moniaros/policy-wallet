/**
 * Data-backing for per-branch `recommendedActions`.
 *
 * Every authored action currently renders as "ask the AI". Where the answer is
 * ALREADY extracted into `acordData`, we can show the answer instead. This
 * module is the mapping — pure, no React, no DB.
 *
 * ─── THE HONESTY LAW (assert positives ONLY) ────────────────────────────────
 *
 * Several critical booleans in `lib/schemas/acord-data.ts` are declared
 * `z.boolean().default(false)`:
 *
 *     vehicle.hasRoadsideAssistance
 *     property.fireCoverageIncluded / earthquakeCoverageIncluded / floodCoverageIncluded
 *     health.directBillingAvailable
 *     pet.leishmaniaCovered
 *
 * After parsing, "the extractor never found this in the document" and "the
 * document says this is NOT covered" are INDISTINGUISHABLE — both are `false`.
 *
 * Therefore: a resolver may only ever assert a POSITIVE. Falsy, missing,
 * empty-string, NaN, or malformed input MUST return `null`, which makes
 * `resolveBranchAction` fall back to `{ status: 'ask' }` and the UI render the
 * ask-the-AI CTA. We must NEVER render «Οδική βοήθεια: Όχι» — that would be
 * asserting an absence we cannot actually observe.
 *
 * Do not "improve" this by rendering a negative chip. The schema cannot support
 * it. If you need honest negatives, the schema must first distinguish
 * "absent" from "false" (e.g. `.optional()` with no default, or a tri-state).
 *
 * ─── BRANCHES WITH NO TYPED SECTION ─────────────────────────────────────────
 *
 * `AcordDataSchema` has typed sections for vehicle, property, health, pet and
 * lifeAndInvestment only. travel, cyber, business, liability and
 * legal_expenses have NO typed section — their coverage detail lives only in
 * the free-text `coverages[]` array. Every action on those branches therefore
 * resolves to `ask` BY CONSTRUCTION, and that is correct. Do not "fix" this by
 * string-matching `coverages[].name`: that array is unnormalised insurer prose
 * in two languages, and a fuzzy match asserting «Καλύπτεσαι» off it is exactly
 * the false confidence the honesty law exists to prevent.
 *
 * ─── UNMAPPED ACTIONS ───────────────────────────────────────────────────────
 *
 * Action ids with no entry in `ACTION_RESOLVERS` stay ask-AI forever. That is
 * the safe default: adding a bundle can never accidentally start asserting
 * things about a user's policy.
 */
import type { AcordData } from '@/lib/schemas/acord-data'

import type { Bilingual, BranchAction } from './types'

export interface ResolvedAction {
    status: 'answered' | 'ask'
    /** Present only when `status === 'answered'` — the extracted answer. */
    value?: Bilingual
    /** A dialable number extracted alongside the answer, if any. */
    phone?: string
}

type ActionResolver = (acord: AcordData) => ResolvedAction | null

// ── Value formatters ────────────────────────────────────────────────────────

const YES_INCLUDED: Bilingual = { el: 'Ναι, περιλαμβάνεται', en: 'Yes, included' }

/** True only for a real `true`. Anything else is unknowable — see honesty law. */
function isPositive(value: unknown): boolean {
    return value === true
}

/** A finite, strictly positive number — 0 is treated as not-extracted. */
function positiveNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function nonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function money(amount: number): Bilingual {
    const format = (locale: string) =>
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(amount)
    return { el: format('el-GR'), en: format('en-GB') }
}

/** ISO date → localised date, or null when unparseable. */
function isoDate(value: unknown): Bilingual | null {
    const raw = nonEmptyString(value)
    if (!raw) return null
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return null
    const format = (locale: string) =>
        new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
    return { el: format('el-GR'), en: format('en-GB') }
}

function answered(value: Bilingual, phone?: string | null): ResolvedAction {
    const dialable = nonEmptyString(phone)
    return dialable ? { status: 'answered', value, phone: dialable } : { status: 'answered', value }
}

// ── Resolvers, keyed by BranchAction.id ─────────────────────────────────────
//
// Keys MUST match a real `BranchAction.id` in one of the bundles under
// lib/insurance/content/ — tests/unit/branch-action-resolvers.test.ts asserts
// this, so typos and drift fail CI rather than silently doing nothing.
//
// Legacy aliases: stored policies analysed before the schema v2 rename kept
// motor/home/life sections alongside the canonical vehicle/property/
// lifeAndInvestment ones. We read both, positives only, canonical first.

export const ACTION_RESOLVERS: Record<string, ActionResolver> = {
    // ── motor ───────────────────────────────────────────────────────────────
    motor_check_roadside: (acord) => {
        // The BOOLEAN is the only evidence of cover. A printed hotline is NOT:
        // Greek motor policies routinely quote the insurer's 24h «φροντίδα
        // ατυχήματος» (accident care) line, which is a different product from
        // «οδική βοήθεια» (roadside assistance). Inferring cover from a phone
        // number would tell a driver they are covered and let them discover
        // otherwise at the roadside. The phone rides along only as a
        // convenience once the boolean has already established the cover.
        // Only the canonical `vehicle` section carries the flag; the legacy
        // `motor` alias has the phone but no boolean, which is precisely why
        // the phone alone must not stand in for it.
        if (!isPositive(acord.vehicle?.hasRoadsideAssistance)) return null
        const phone =
            nonEmptyString(acord.vehicle?.roadsideAssistancePhone) ?? nonEmptyString(acord.motor?.roadsideAssistancePhone)
        return answered(YES_INCLUDED, phone)
    },

    motor_check_glass: (acord) => {
        if (!isPositive(acord.vehicle?.glassBreakage) && !isPositive(acord.motor?.glassBreakage)) return null
        return answered(YES_INCLUDED)
    },

    // ── home ────────────────────────────────────────────────────────────────
    home_check_earthquake: (acord) => {
        const covered =
            isPositive(acord.property?.earthquakeCoverageIncluded) ||
            isPositive(acord.home?.catastropheCoverage?.earthquake)
        if (!covered) return null
        return answered(YES_INCLUDED, acord.property?.technicalAssistancePhone ?? acord.home?.technicalAssistancePhone)
    },

    home_check_value: (acord) => {
        const insured =
            positiveNumber(acord.property?.insuredValue) ??
            positiveNumber(acord.home?.insuredValue) ??
            positiveNumber(acord.property?.estimatedRebuildCost)
        if (insured === null) return null
        return answered(money(insured))
    },

    // ── health ──────────────────────────────────────────────────────────────
    health_check_oop: (acord) => {
        const outOfPocket = positiveNumber(acord.health?.outOfPocketMax)
        if (outOfPocket === null) return null
        return answered(money(outOfPocket), acord.health?.coordinationCentre?.phone)
    },

    // ── pet ─────────────────────────────────────────────────────────────────
    pet_check_vet: (acord) => {
        if (!isPositive(acord.pet?.directVetPayment)) return null
        return answered(YES_INCLUDED)
    },

    pet_check_waits: (acord) => {
        const limit = positiveNumber(acord.pet?.annualLimit) ?? positiveNumber(acord.pet?.annualLimitTotal)
        if (limit === null) return null
        return answered(money(limit))
    },

    // ── life ────────────────────────────────────────────────────────────────
    // NOTE: the canonical section is `lifeAndInvestment`. The top-level `life`
    // key is the LEGACY alias and carries fund/surrender values only — it has
    // neither deathBenefit nor maturityDate.
    life_check_sum: (acord) => {
        const benefit = positiveNumber(acord.lifeAndInvestment?.deathBenefit)
        if (benefit === null) return null
        return answered(money(benefit))
    },

    life_check_duration: (acord) => {
        const maturity = isoDate(acord.lifeAndInvestment?.maturityDate)
        if (!maturity) return null
        return answered(maturity)
    },

    life_check_beneficiaries: (acord) => {
        const named = [
            ...(Array.isArray(acord.lifeAndInvestment?.beneficiaries) ? acord.lifeAndInvestment.beneficiaries : []),
            ...(Array.isArray(acord.beneficiaries) ? acord.beneficiaries.map((entry) => entry?.name) : []),
        ]
            .map((entry) => nonEmptyString(entry))
            .filter((entry): entry is string => entry !== null)
        if (named.length === 0) return null
        const joined = named.join(', ')
        return answered({ el: joined, en: joined })
    },
}

const ASK: ResolvedAction = { status: 'ask' }

/**
 * Resolve one authored action against a policy's extracted data.
 *
 * Always returns `{ status: 'ask' }` unless a resolver is mapped for this
 * action id AND it can assert a positive from the data. Never throws: callers
 * pass raw `policy.acordData`, which is `unknown` JSON from the DB.
 */
export function resolveBranchAction(action: BranchAction, acord: unknown): ResolvedAction {
    const resolver = ACTION_RESOLVERS[action.id]
    if (!resolver) return ASK
    if (!acord || typeof acord !== 'object' || Array.isArray(acord)) return ASK
    try {
        return resolver(acord as AcordData) ?? ASK
    } catch {
        // Malformed stored data must degrade to ask-AI, never break the page.
        return ASK
    }
}
