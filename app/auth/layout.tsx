import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { AuthLanguageProvider } from "./AuthLanguageProvider"

/**
 * Exists solely to mount the translation dictionary for the auth tree
 * (app/auth/signin/page.tsx reads `t`). The dictionary is no longer in the root
 * layout — see docs/design/I18N_CONSUMER_MAP.md.
 *
 * Renders no DOM of its own, so the auth pages' markup is unchanged. Route
 * handlers (e.g. auth/callback/route.ts) are not affected by layouts.
 */
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        // Order is load-bearing. TranslationsProvider picks its dictionary by
        // reading LanguageStateContext from ABOVE itself — mounted outside the
        // pin, it read the global provider's Greek default and resolved the
        // Greek dictionary before AuthLanguageProvider set "en" below it. Only
        // /auth/signin consumes `t`, so ?lang=en produced <html lang="en">
        // over an entirely Greek page there while its siblings (which call
        // getTranslations(language) directly) rendered English.
        <AuthLanguageProvider>
            <TranslationsProvider>{children}</TranslationsProvider>
        </AuthLanguageProvider>
    )
}
