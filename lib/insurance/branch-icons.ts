/**
 * Lucide icon per insurance branch. Kept apart from taxonomy.ts so the core
 * taxonomy module has no UI dependencies (usable from seeds/node scripts).
 */
import type { LucideIcon } from 'lucide-react'
import {
    Accessibility,
    Activity,
    Bike,
    Boxes,
    Briefcase,
    Building,
    Building2,
    Car,
    Clock,
    Cog,
    FileCheck,
    Gavel,
    HardHat,
    HeartPulse,
    House,
    KeyRound,
    Landmark,
    Lock,
    PawPrint,
    PiggyBank,
    Plane,
    Scale,
    Shield,
    ShieldAlert,
    Ship,
    Smartphone,
    Sun,
    Truck,
    Umbrella,
    Users,
    Wrench,
} from 'lucide-react'

import { normalizeBranch } from './taxonomy'

const BRANCH_ICONS: Record<string, LucideIcon> = {
    motor: Car,
    motorbike: Bike,
    truck: Truck,
    roadside: Wrench,
    home: House,
    renters: KeyRound,
    health: HeartPulse,
    life: Landmark,
    income_protection: Umbrella,
    disability: Accessibility,
    personal_accident: Activity,
    pension: PiggyBank,
    travel: Plane,
    pet: PawPrint,
    cyber: Lock,
    liability: Scale,
    legal_expenses: Gavel,
    boat: Ship,
    gadget: Smartphone,
    bicycle: Bike,
    business: Building2,
    business_property: Building,
    equipment: Cog,
    stock: Boxes,
    business_interruption: Clock,
    professional_liability: Briefcase,
    employer_liability: Briefcase,
    technical_works: HardHat,
    energy: Sun,
    transports: Truck,
    guarantees: FileCheck,
    special_risks: ShieldAlert,
    other: Shield,
}

/** Accepts a canonical id or any free-form lineOfBusiness value. */
export function getBranchIcon(idOrRaw: string | null | undefined): LucideIcon {
    if (idOrRaw && BRANCH_ICONS[idOrRaw]) return BRANCH_ICONS[idOrRaw]
    return BRANCH_ICONS[normalizeBranch(idOrRaw).id] ?? Shield
}
