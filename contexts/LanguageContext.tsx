"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Type-only imports: erased at compile time, so this module never pulls the
// ~194 KB EL+EN dictionary into the bundle. Keep it that way — see
// docs/design/I18N_CONSUMER_MAP.md. The dictionary lives in
// contexts/TranslationsProvider.tsx and is mounted only by the layouts whose
// subtrees actually read `t`.
import type { Language, getTranslations } from '@/lib/i18n'

export type Translations = ReturnType<typeof getTranslations>

interface LanguageStateContextType {
    language: Language
    setLanguage: (lang: Language) => void
}

const LanguageStateContext = createContext<LanguageStateContextType | undefined>(undefined)

/**
 * Dictionary context. Deliberately declared here — next to the language state
 * it depends on — but *populated* by TranslationsProvider, which is the module
 * that imports the dictionary. Splitting the context object from its provider
 * is what lets useLanguage() hand out `t` without every marketing page that
 * imports useLanguage() paying for the dictionary.
 */
const TranslationsContext = createContext<Translations | undefined>(undefined)

export { LanguageStateContext, TranslationsContext }

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
        // Claim ownership of <html lang> while this provider is mounted. The
        // global LanguageProvider used to stand down for /en/* by matching the
        // PATH, which left the auth tree unprotected: /auth/signup?lang=en is
        // pinned to English here, then the global effect stamped its Greek
        // default straight over it. Ownership is the honest signal — the path
        // never was.
        html.dataset.langOwner = 'static'
        return () => {
            delete html.dataset.langOwner
        }
    }, [language])

    const value = React.useMemo(
        () => ({
            language,
            setLanguage: (lang: Language) => {
                if (lang !== language) router.push(counterpartPath)
            },
        }),
        [language, counterpartPath, router]
    )

    return <LanguageStateContext.Provider value={value}>{children}</LanguageStateContext.Provider>
}

export function LanguageProvider({
    children,
    initialLanguage,
    pinned = false,
}: {
    children: React.ReactNode
    /** Start from this language instead of the default. */
    initialLanguage?: Language
    /**
     * Ignore the stored preference and never touch <html lang>: for a
     * subtree that must follow the PAGE's language (a real app screen shown
     * on the marketing site), not the visitor's app preference.
     */
    pinned?: boolean
}) {
    const [language, setLanguageState] = useState<Language>(initialLanguage ?? 'el')

    useEffect(() => {
        if (pinned) return
        // Load language preference from localStorage
        const savedLanguage = localStorage.getItem('language') as Language
        if (savedLanguage && (savedLanguage === 'el' || savedLanguage === 'en')) {
            setLanguageState(savedLanguage)
        }
    }, [pinned])

    useEffect(() => {
        // Wherever a StaticLanguageProvider is mounted it owns <html lang>.
        // This provider's default is "el", and under chunked hydration its
        // effect can land AFTER theirs — which stamped the Greek default onto
        // English pages (WCAG 3.1.1). Never fight them.
        //
        // The path check is kept as a belt-and-braces guard for the /en tree
        // (it holds even before the static provider's effect runs); the
        // ownership flag is what also covers /auth/*?lang=en, which is pinned
        // by AuthLanguageProvider and has no /en prefix to match on.
        if (pinned) return
        if (document.documentElement.dataset.langOwner === 'static') return
        const path = window.location.pathname
        if (path === '/en' || path.startsWith('/en/')) return

        const html = document.documentElement
        const locale = language === 'el' ? 'el' : 'en'
        const localeTag = language === 'el' ? 'el-GR' : 'en-US'

        html.setAttribute('lang', locale)
        html.setAttribute('data-locale', localeTag)
    }, [language, pinned])

    const router = useRouter()
    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
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
        <LanguageStateContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageStateContext.Provider>
    )
}

/**
 * Reads language state, and — for subtrees under a TranslationsProvider — the
 * dictionary as `t`.
 *
 * `t` is a lazy getter rather than a plain property: consumers that only read
 * `language`/`setLanguage` (all 23 marketing ones) never touch it, and a
 * consumer that reads `t` outside a TranslationsProvider gets a named error
 * instead of a `Cannot read properties of undefined` further down the render.
 */
export function useLanguage() {
    const state = useContext(LanguageStateContext)
    if (!state) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    const translations = useContext(TranslationsContext)

    return React.useMemo(
        () => ({
            language: state.language,
            setLanguage: state.setLanguage,
            get t(): Translations {
                if (!translations) {
                    throw new Error(
                        'useLanguage().t requires a <TranslationsProvider>. The dictionary is ' +
                        'mounted only by the (protected), auth and onboarding layouts — a ' +
                        'component that needs `t` cannot render on a public/marketing route. ' +
                        'See docs/design/I18N_CONSUMER_MAP.md.'
                    )
                }
                return translations
            },
        }),
        [state.language, state.setLanguage, translations]
    )
}

/** Dictionary-only accessor, for consumers that never touch language state. */
export function useTranslations(): Translations {
    const translations = useContext(TranslationsContext)
    if (!translations) {
        throw new Error('useTranslations must be used within a <TranslationsProvider>')
    }
    return translations
}
