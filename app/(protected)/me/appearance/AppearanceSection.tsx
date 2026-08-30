"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { ThemeToggle } from "@/components/ThemeToggle"
import { AppSection } from "@/src/design-system/app-layout"

/** Theme and language, each one control. The language switch navigates to the /en mirror (the existing mechanism). */
export function AppearanceSection() {
    const { t, language, setLanguage } = useLanguage()
    return (
        <AppSection id="appearance" title={t.settings.nav.appearance.label}>
            <div className="flex flex-col gap-g-4">
                <div className="flex min-h-11 items-center justify-between gap-g-4">
                    <span className="text-g-app-body text-fg-primary">{t.app.me.theme}</span>
                    <ThemeToggle ariaLabel={t.app.me.theme} />
                </div>
                <div className="flex min-h-11 items-center justify-between gap-g-4">
                    <span className="text-g-app-body text-fg-primary">{t.app.me.language}</span>
                    <div role="group" aria-label={t.app.me.language} className="flex gap-g-2">
                        <button type="button" aria-pressed={language === "el"} onClick={() => setLanguage("el")} className="inline-flex min-h-11 items-center rounded-g-control px-g-3 text-g-app-body-sm font-medium text-fg-primary aria-pressed:bg-surface-sunken">Ελληνικά</button>
                        <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")} className="inline-flex min-h-11 items-center rounded-g-control px-g-3 text-g-app-body-sm font-medium text-fg-primary aria-pressed:bg-surface-sunken">English</button>
                    </div>
                </div>
            </div>
        </AppSection>
    )
}
