import { Shield, Eye, FolderClosed, Coins, UserRound, Bell, Users, Plus, ChevronLeft } from "lucide-react"
import type { NavIcon } from "@/lib/app/navigation"

/** The registry names icons; the shell owns the drawing. */
export const NAV_ICONS: Record<NavIcon, React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>> = {
    shield: Shield,
    eye: Eye,
    folder: FolderClosed,
    coins: Coins,
    user: UserRound,
    bell: Bell,
    users: Users,
    plus: Plus,
}
export { ChevronLeft }
