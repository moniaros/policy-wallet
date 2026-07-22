"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard, Users, FileText, CreditCard, Gift, ShieldCheck, Inbox,
    Coins, Receipt, Rocket, Flag, Building2, Tags, Activity,
} from "lucide-react"

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/policies", label: "Policies", icon: FileText },
    { href: "/admin/plans", label: "Plans", icon: CreditCard },
    { href: "/admin/partners", label: "Partners", icon: Gift },
    { href: "/admin/dsr", label: "GDPR / DSR", icon: ShieldCheck },
    { href: "/admin/submissions", label: "Submissions", icon: Inbox },
    { href: "/admin/tokens", label: "AI Tokens", icon: Coins },
    { href: "/admin/billing-reconciliation", label: "Billing", icon: Receipt },
    { href: "/admin/launch-readiness", label: "Launch", icon: Rocket },
    { href: "/admin/extraction-flags", label: "Extraction Flags", icon: Flag },
    { href: "/admin/insurers", label: "Insurers", icon: Building2 },
    { href: "/admin/types", label: "Types", icon: Tags },
    { href: "/admin/activity", label: "Activity", icon: Activity },
]

export default function AdminSidebar() {
    const pathname = usePathname()

    return (
        <aside className="w-full md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
            <div className="px-4 py-4 md:py-6">
                <Link href="/admin/dashboard" className="text-sm font-bold uppercase tracking-wide text-primary dark:text-mint">
                    PolicyWallet Admin
                </Link>
            </div>
            <nav className="flex md:flex-col gap-1 px-2 pb-4 overflow-x-auto">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + "/")
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                                active
                                    ? "bg-primary-tint dark:bg-primary/15 text-primary dark:text-mint font-semibold"
                                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
