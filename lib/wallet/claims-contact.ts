import type { AcordData } from "@/types/domain"
import { branchFamilyId } from "@/lib/insurance/taxonomy"
import { motorSection, homeSection } from "@/lib/wallet/coverage-sections"

/**
 * The number to ring after a loss.
 *
 * The claims card read `acordData.policy.insurerContact`. That field exists in
 * no schema — the string appears exactly once in the repository, on the line
 * that reads it. So `insurerPhone` was ALWAYS empty: the "Contact insurer"
 * button never rendered on any policy, its handler was unreachable, and every
 * policyholder opening the claims screen after a loss was told "we did not find
 * a claims number in your document — it is on your policy schedule".
 *
 * The document usually did state one, and the pipeline had extracted it. The
 * schema carries a claims line per branch, and motor's own first claim step is
 * "call your insurer's accident-care line FIRST" — the very number sitting in
 * `vehicle.accidentDeclarationPhone`, unused.
 *
 * Resolved per branch family, so a motorbike gets the motor number and a
 * renters policy the home one. Reuses the coverage-section resolvers, which
 * already merge the canonical key with its legacy alias.
 */
export type ClaimsContactKind =
    | "accident_declaration"
    | "roadside"
    | "technical_assistance"
    | "coordination_centre"

export interface ClaimsContact {
    phone: string
    kind: ClaimsContactKind
}

const clean = (v: unknown): string => String(v ?? "").trim()

export function resolveClaimsContact(
    acord: AcordData | null | undefined,
    lineOfBusiness: string | null | undefined
): ClaimsContact | null {
    if (!acord) return null

    switch (branchFamilyId(lineOfBusiness)) {
        case "motor": {
            const motor = motorSection(acord)
            // Accident care before roadside: a breakdown line cannot register a
            // claim, and the claims steps send the reader to accident care first.
            const accident = clean(motor?.accidentDeclarationPhone)
            if (accident) return { phone: accident, kind: "accident_declaration" }
            const roadside = clean(motor?.roadsideAssistancePhone)
            if (roadside) return { phone: roadside, kind: "roadside" }
            return null
        }
        case "home": {
            const technical = clean(homeSection(acord)?.technicalAssistancePhone)
            return technical ? { phone: technical, kind: "technical_assistance" } : null
        }
        case "health": {
            // The Greek coordination centre is the number that authorises
            // admission and direct billing — the one that matters in a hospital.
            const centre = clean(acord.health?.coordinationCentre?.phone)
            return centre ? { phone: centre, kind: "coordination_centre" } : null
        }
        default:
            // No claims line is modelled for the other branches. Saying where to
            // find one beats naming a number that is not theirs.
            return null
    }
}
