"use client"

import React, { useContext } from 'react'
import { getTranslations } from '@/lib/i18n'
import { LanguageStateContext, TranslationsContext } from '@/contexts/LanguageContext'

/**
 * Mounts the EL+EN dictionary (~194 KB raw / ~60 KB gzip) for the subtree
 * beneath it.
 *
 * This module is the *only* client-side importer of `getTranslations`, which is
 * what keeps the dictionary out of every public/marketing chunk. Mount it as
 * high as the `t` consumers require and no higher — currently the (protected),
 * auth and onboarding layouts. Do NOT mount it in app/layout.tsx: that is
 * exactly the regression this split removed.
 *
 * It derives the dictionary from the language state rather than taking it as a
 * server prop, so the in-place language toggle keeps swapping copy on the
 * client with no behaviour change from before the split.
 */
export function TranslationsProvider({ children }: { children: React.ReactNode }) {
    const state = useContext(LanguageStateContext)
    if (!state) {
        throw new Error('TranslationsProvider must be rendered inside a LanguageProvider')
    }

    const translations = React.useMemo(
        () => getTranslations(state.language),
        [state.language]
    )

    return (
        <TranslationsContext.Provider value={translations}>
            {children}
        </TranslationsContext.Provider>
    )
}
