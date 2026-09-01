import { Bell, Building2, CreditCard, Gift, History, Lock, Palette, ShieldCheck, User, Users, type LucideIcon } from "lucide-react"
import type { SettingsSectionId } from "./sections"

/**
 * One icon per settings section, for every chrome that lists them.
 *
 * It lived inside `components/settings/SettingsNav.tsx` (the desktop rail), so
 * the phone's settings list had no way to reach it and showed bare rows. Two
 * lists of the same destinations disagreeing about their icons is the kind of
 * difference nobody decides and everybody notices.
 *
 * Kept out of `sections.ts` on purpose: that module is imported by seeds and
 * node scripts and must stay free of UI dependencies.
 */
export const SETTINGS_ICONS: Record<SettingsSectionId, LucideIcon> = {
    profile: User,
    household: Users,
    appearance: Palette,
    plan: CreditCard,
    security: ShieldCheck,
    notifications: Bell,
    privacy: Lock,
    history: History,
    benefits: Gift,
    agency: Building2,
}
