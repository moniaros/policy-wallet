import { el } from './translations/el'
import { en } from './translations/en'

export type Language = 'el' | 'en'

const translations = {
    el,
    en,
}

export function getTranslations(language: Language) {
    return translations[language] || translations.el
}

// Helper function to get nested translation
export function t(language: Language, key: string): string {
    const keys = key.split('.')
    let value: any = getTranslations(language)

    for (const k of keys) {
        value = value?.[k]
    }

    return value || key
}

// Export translations for direct use
export { el, en }
