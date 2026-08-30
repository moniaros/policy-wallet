"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { ThemeChoice } from "@/components/settings/ThemeChoice"
import { LocaleToggle } from "@/components/ui/LocaleToggle"
import { AppSection } from "@/src/design-system/app-layout"

/** Theme and language, each one control. The language switch navigates to the /en mirror (the existing mechanism). */
export function AppearanceSection() {
    const { t } = useLanguage()
    return (
        <AppSection id="appearance" title={t.settings.nav.appearance.label}>
            <div className="flex flex-col gap-g-4">
                <div className="flex flex-col gap-g-2">
                    <span className="text-g-app-body text-fg-primary">{t.app.me.theme}</span>
                    <ThemeChoice />
                </div>
                <div className="flex min-h-11 items-center justify-between gap-g-4">
                    <span className="text-g-app-body text-fg-primary">{t.app.me.language}</span>
                    <LocaleToggle variant="settings" ariaLabel={t.app.me.language} />
                </div>
            </div>
        </AppSection>
    )
}
