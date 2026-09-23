import type { AcordData } from "@/types/domain"
import { branchFamilyId } from "@/lib/insurance/taxonomy"
import { homeSection, lifeSection, motorSection } from "@/lib/wallet/coverage-sections"
import { classifyMotorCoverageTier } from "@/lib/wallet/motor-coverage-tier"
import { extractedField } from "@/lib/wallet/unreadable-value"
import { calendarDaysUntil } from "@/lib/policy-status"
import { parsePolicyDate } from "@/lib/wallet/policy-detail"
import { formatCurrency, formatDate } from "@/lib/i18n/format"

/**
 * The glanceable facts a wallet card shows per branch (spec v2 §6): the answer
 * to «am I covered?» without opening the policy. At most four, in the order
 * the spec ranks them.
 *
 * Rules that keep this honest:
 *  - A fact is rendered only when the extraction STATED it. A boolean that is
 *    `undefined` is unknown, not absent (CLAUDE.md «unknown is not absence»),
 *    so no «Not included» badge ever comes from silence.
 *  - Strings pass through `extractedField`: a masked value («XXXX») is an
 *    extraction failure and renders nothing here — the detail page says so.
 *  - Labels reuse the coverageDetails copy the detail panels already carry,
 *    so the card and the page never name the same fact differently.
 *  - Every fact carries a `key`; the card renders it under the registered `policy.quickFact` key, subject-scoped by policy id and fact key.
 */
export interface QuickFact {
    key: string
    label: string
    value: string
    tone?: "positive" | "warning" | "critical" | "neutral"
    /** A `tel:` target — the fact is a number the person may need to dial. */
    href?: string
}

type Copy = {
    coverageDetails: Record<string, any>
}

const MAX_FACTS = 4

function tel(phone: string | null | undefined): string | undefined {
    const value = extractedField(phone).value
    return value ? `tel:${value.replace(/\s+/g, "")}` : undefined
}

export function quickFacts(
    policy: { lineOfBusiness: string; acordData?: AcordData | null | undefined },
    t: Copy,
    language: "el" | "en"
): QuickFact[] {
    const acord = policy.acordData
    if (!acord) return []
    const copy = t.coverageDetails
    const money = (n: number) => formatCurrency(n, language, { decimals: 0 })
    const facts: QuickFact[] = []
    const push = (fact: QuickFact | null | undefined) => {
        if (fact && facts.length < MAX_FACTS) facts.push(fact)
    }
    const onOff = (key: string, label: string, flag: boolean | undefined, on: string, off: string): QuickFact | null =>
        flag === undefined ? null : { key, label, value: flag ? on : off, tone: flag ? "positive" : "warning" }

    switch (branchFamilyId(policy.lineOfBusiness)) {
        case "health": {
            const h = acord.health
            if (!h) break
            const hospitalClass = extractedField(h.hospitalClass).value
            if (hospitalClass) push({ key: "hospitalClass", label: copy.health.hospitalClass, value: hospitalClass, tone: "neutral" })
            const centreName = extractedField(h.coordinationCentre?.name ?? h.coordinationCentreName).value
            const centrePhone = extractedField(h.coordinationCentre?.phone).value
            if (centreName || centrePhone) {
                push({
                    key: "coordinationCentre",
                    label: copy.health.coordinationCentre,
                    value: centrePhone ? (centreName ? `${centreName} · ${centrePhone}` : centrePhone) : centreName!,
                    tone: "neutral",
                    href: tel(centrePhone),
                })
            }
            push(onOff("annualCheckup", copy.health.annualCheckup, h.annualCheckupIncluded, copy.included, copy.notIncluded))
            push(onOff("directBilling", copy.health.directBilling, h.directBillingAvailable, copy.available, copy.notAvailable))
            break
        }
        case "motor": {
            const m = motorSection(acord)
            if (!m) break
            const tier = classifyMotorCoverageTier(m.coverageTier)
            if (tier) {
                const tierLabel = tier === "comprehensive" ? copy.motor.comprehensive
                    : tier === "third_party_fire_theft" ? copy.motor.thirdPartyFireTheft
                        : copy.motor.thirdParty
                push({ key: "coverageTier", label: copy.motor.coverageTier, value: tierLabel, tone: "neutral" })
            }
            const greenCard = parsePolicyDate(m.greenCardExpiry)
            if (greenCard) {
                const days = calendarDaysUntil(greenCard, new Date())
                push({
                    key: "greenCard",
                    label: copy.motor.greenCard,
                    value: formatDate(greenCard, language),
                    tone: days < 0 ? "critical" : days <= 30 ? "warning" : "positive",
                })
            }
            const drivers = m.namedDrivers?.length
            if (typeof drivers === "number" && drivers > 0) {
                push({ key: "namedDrivers", label: copy.motor.namedDrivers, value: String(drivers), tone: "neutral" })
            }
            const roadside = extractedField(m.roadsideAssistancePhone).value
            if (roadside) {
                push({ key: "roadside", label: copy.motor.roadsideAssistance, value: roadside, tone: "neutral", href: tel(roadside) })
            } else {
                push(onOff("roadside", copy.motor.roadsideAssistance, acord.vehicle?.hasRoadsideAssistance, copy.included, copy.notIncluded))
            }
            break
        }
        case "home": {
            const h = homeSection(acord)
            if (!h) break
            push(onOff("enfia", copy.home.enfiaEligibility, h.enfiaEligible, copy.home.enfiaEligible, copy.home.enfiaNotEligible))
            const cat = h.catastropheCoverage
            if (cat) {
                for (const [peril, flag] of [["fire", cat.fire], ["earthquake", cat.earthquake], ["flood", cat.flood]] as const) {
                    push(onOff(peril, copy.home[peril], flag, copy.covered, copy.notCovered))
                }
            }
            if (typeof h.insuredValue === "number") {
                push({ key: "insuredValue", label: copy.home.insuredValue, value: money(h.insuredValue), tone: "neutral" })
            }
            break
        }
        case "life": {
            const l = lifeSection(acord)
            if (!l) break
            const fund = l.currentFundValue ?? l.cashValue
            if (typeof fund === "number") push({ key: "fundValue", label: copy.life.fundValue, value: money(fund), tone: "neutral" })
            if (typeof l.ytdGrowth === "number") {
                push({ key: "ytdGrowth", label: copy.life.ytdGrowth, value: `${l.ytdGrowth > 0 ? "+" : ""}${l.ytdGrowth}%`, tone: l.ytdGrowth < 0 ? "critical" : "positive" })
            }
            push(onOff("taxFree", copy.life.taxFreeAtMaturity, l.taxFreeAtMaturity, copy.taxFree, copy.taxable))
            if (typeof l.guaranteedPercentage === "number" || typeof l.unitLinkedPercentage === "number") {
                const g = l.guaranteedPercentage ?? (typeof l.unitLinkedPercentage === "number" ? 100 - l.unitLinkedPercentage : undefined)
                const u = l.unitLinkedPercentage ?? (typeof g === "number" ? 100 - g : undefined)
                push({ key: "split", label: copy.life.guaranteedVsUnitLinked, value: `${g ?? "—"}% / ${u ?? "—"}%`, tone: "neutral" })
            }
            if (typeof l.deathBenefit === "number") push({ key: "deathBenefit", label: copy.life.deathBenefit, value: money(l.deathBenefit), tone: "neutral" })
            break
        }
        case "pet": {
            const p = acord.pet
            if (!p) break
            const chip = extractedField(p.microchipNumber).value
            if (chip) push({ key: "microchip", label: copy.pet.microchipNumber, value: chip, tone: "neutral" })
            const limit = p.annualLimit ?? p.annualLimitTotal
            if (typeof limit === "number") {
                const used = typeof p.annualLimitUsed === "number" ? p.annualLimitUsed : null
                push({
                    key: "annualLimit",
                    label: copy.pet.annualLimit,
                    value: used === null ? money(limit) : `${money(used)} ${copy.of} ${money(limit)}`,
                    tone: used !== null && used >= limit ? "critical" : "neutral",
                })
            }
            push(onOff("leishmania", copy.pet.leishmaniaCoverage, p.leishmaniaCovered, copy.covered, copy.notCovered))
            push(onOff("directVet", copy.pet.directVetPayment, p.directVetPayment, copy.available, copy.notAvailable))
            break
        }
        default:
            break
    }
    return facts
}
