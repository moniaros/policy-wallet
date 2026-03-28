"use client"

import { usePathname, useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { LayoutDashboard, Users, TrendingUp, Lightbulb, Settings } from "lucide-react"

const navItems = [
    { key: "dashboard", path: "/dashboard/agent", icon: LayoutDashboard, labelEn: "Home", labelEl: "Αρχική" },
    { key: "customers", path: "/customers", icon: Users, labelEn: "Clients", labelEl: "Πελάτες" },
    { key: "pipeline", path: "/opportunities", icon: TrendingUp, labelEn: "Pipeline", labelEl: "Pipeline" },
    { key: "insights", path: "/insights", icon: Lightbulb, labelEn: "Insights", labelEl: "Αναλυτικά" },
    { key: "settings", path: "/agent/settings", icon: Settings, labelEn: "Settings", labelEl: "Ρυθμίσεις" },
]

export function AgentMobileNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { language } = useLanguage()

    const activeKey = (() => {
        if (pathname?.includes("/dashboard")) return "dashboard"
        if (pathname?.includes("/customers") || (pathname?.includes("/agent") && !pathname?.includes("/settings"))) return "customers"
        if (pathname?.includes("/opportunities") || pathname?.includes("/renewals") || pathname?.includes("/commissions")) return "pipeline"
        if (pathname?.includes("/insights") || pathname?.includes("/questionnaires")) return "insights"
        if (pathname?.includes("/settings") || pathname?.includes("/team")) return "settings"
        return "dashboard"
    })()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/50 bg-white/80 backdrop-blur-xl safe-area-inset-bottom dark:border-slate-800/50 dark:bg-slate-900/80 md:hidden">
            <div className="flex items-center justify-around px-2 py-1">
                {navItems.map((item) => {
                    const isActive = activeKey === item.key
                    const Icon = item.icon
                    return (
                        <button
                            key={item.key}
                            onClick={() => router.push(item.path)}
                            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all ${
                                isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                            }`}
                        >
                            <Icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                {language === "el" ? item.labelEl : item.labelEn}
                            </span>
                            {isActive && <div className="mt-0.5 h-1 w-1 rounded-full bg-emerald-500" />}
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
