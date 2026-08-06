import type { Language } from '@/lib/i18n'

/**
 * Cookie-banner copy, co-located with the banner.
 *
 * The banner is mounted in the ROOT layout, so it renders on public/marketing
 * routes — where the full EL+EN dictionary is deliberately not loaded (see
 * docs/design/I18N_CONSUMER_MAP.md). Reading `t.compliance.cookieBanner` there
 * would have meant either shipping the whole 60 KB gzip dictionary to every
 * marketing visitor, or silently degrading to an English-only fallback.
 *
 * These strings are copied VERBATIM from lib/i18n/translations/{el,en}.ts
 * (`compliance.cookieBanner`) and must be kept in sync with them. The dictionary
 * entries remain the source of truth for any other surface that shows this copy.
 */
export const COOKIE_BANNER_COPY = {
    el: {
        title: "Ρυθμίσεις Cookies",
        description: "Χρησιμοποιούμε cookies για τη λειτουργία της υπηρεσίας και, με τη συγκατάθεσή σας, για analytics και marketing.",
        managePreferences: "Διαχείριση προτιμήσεων",
        hidePreferences: "Απόκρυψη προτιμήσεων",
        privacyLink: "Πολιτική απορρήτου",
        termsLink: "Όροι χρήσης",
        necessaryTitle: "Απαραίτητα",
        necessaryDescription: "Απαιτούνται για ασφάλεια, σύνδεση και βασική λειτουργία του wallet.",
        analyticsTitle: "Αναλυτικά",
        analyticsDescription: "Μας βοηθούν να κατανοούμε τη χρήση και να βελτιώνουμε την αξιοπιστία.",
        marketingTitle: "Marketing",
        marketingDescription: "Επιτρέπουν προσωποποίηση και μέτρηση καμπανιών.",
        alwaysOn: "Πάντα ενεργά",
        necessaryOnly: "Μόνο απαραίτητα",
        acceptAll: "Αποδοχή όλων",
        savePreferences: "Αποθήκευση προτιμήσεων",
    },
    en: {
        title: "Cookie Preferences",
        description: "We use cookies to operate the service and, with your consent, improve analytics and marketing relevance.",
        managePreferences: "Manage Preferences",
        hidePreferences: "Hide Preferences",
        privacyLink: "Privacy Policy",
        termsLink: "Terms of Service",
        necessaryTitle: "Necessary",
        necessaryDescription: "Required for security, login sessions, and core wallet functionality.",
        analyticsTitle: "Analytics",
        analyticsDescription: "Helps us understand product usage and improve reliability.",
        marketingTitle: "Marketing",
        marketingDescription: "Enables personalization and campaign measurement.",
        alwaysOn: "Always Active",
        necessaryOnly: "Necessary Only",
        acceptAll: "Accept All",
        savePreferences: "Save Preferences",
    },
} as const satisfies Record<Language, Record<string, string>>

export function getCookieBannerCopy(language: Language) {
    return COOKIE_BANNER_COPY[language] ?? COOKIE_BANNER_COPY.el
}
