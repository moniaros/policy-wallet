"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Language } from '@/lib/i18n'
import { getTranslations } from '@/lib/i18n'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: ReturnType<typeof getTranslations>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

/**
 * Fixed-language provider for locale-specific routes (/en/*): every
 * useLanguage() consumer beneath it renders the given language on the server
 * too, so crawlers get honest English HTML instead of the Greek default that
 * the client toggle would only swap after hydration. Switching language
 * navigates to the counterpart route instead of toggling in place.
 */
export function StaticLanguageProvider({
    language,
    counterpartPath,
    children,
}: {
    language: Language
    /** Route to navigate to when the visitor picks the other language. */
    counterpartPath: string
    children: React.ReactNode
}) {
    const router = useRouter()

    useEffect(() => {
        const html = document.documentElement
        html.setAttribute('lang', language === 'el' ? 'el' : 'en')
        html.setAttribute('data-locale', language === 'el' ? 'el-GR' : 'en-US')
    }, [language])

    const value = React.useMemo(
        () => ({
            language,
            setLanguage: (lang: Language) => {
                if (lang !== language) router.push(counterpartPath)
            },
            t: getTranslations(language),
        }),
        [language, counterpartPath, router]
    )

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('el')
    const [translations, setTranslations] = useState(getTranslations('el'))

    useEffect(() => {
        // Load language preference from localStorage
        const savedLanguage = localStorage.getItem('language') as Language
        if (savedLanguage && (savedLanguage === 'el' || savedLanguage === 'en')) {
            setLanguageState(savedLanguage)
            setTranslations(getTranslations(savedLanguage))
        }
    }, [])

    useEffect(() => {
        const html = document.documentElement
        const locale = language === 'el' ? 'el' : 'en'
        const localeTag = language === 'el' ? 'el-GR' : 'en-US'

        html.setAttribute('lang', locale)
        html.setAttribute('data-locale', localeTag)
    }, [language])

    const router = useRouter()
    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        setTranslations(getTranslations(lang))
        localStorage.setItem('language', lang)

        // Also update in database via API call
        fetch('/api/user/language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: lang }),
        }).then(() => {
            router.refresh()
        }).catch(console.error)
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t: translations }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
