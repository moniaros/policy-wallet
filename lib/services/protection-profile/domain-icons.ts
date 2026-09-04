import { Banknote, Briefcase, Building2, Car, HeartPulse, House, Landmark, PiggyBank, Sparkles, Users, type LucideIcon } from "lucide-react"

/**
 * One icon per protection domain — the needs-layer counterpart of
 * `lib/insurance/branch-icons.ts`. Lives in lib so the onboarding map and the
 * dashboard's «Η εικόνα σας» cannot drift, and so no component keeps a private
 * map (the icon-and-risk-consistency guard). Keys are `ProtectionPriority`
 * ids: a domain, or a money facet as `money:<facet>`.
 */
export const PROTECTION_DOMAIN_ICONS: Record<string, LucideIcon> = {
    household: Users,
    residence: House,
    property: Building2,
    mobility: Car,
    work: Briefcase,
    health: HeartPulse,
    lifestyle: Sparkles,
    "money:income": Banknote,
    "money:debt": Landmark,
    "money:retirement": PiggyBank,
    money: Banknote,
}

export function protectionDomainIcon(id: string): LucideIcon {
    return PROTECTION_DOMAIN_ICONS[id] ?? PROTECTION_DOMAIN_ICONS[id.split(":")[0]] ?? Sparkles
}
