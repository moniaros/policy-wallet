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
