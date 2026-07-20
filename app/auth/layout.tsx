import { TranslationsProvider } from "@/contexts/TranslationsProvider"

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
    return <TranslationsProvider>{children}</TranslationsProvider>
}
