import type { Metadata } from "next"
import { getTranslations } from "@/lib/i18n"
import { OfflineClient } from "./OfflineClient"

export const metadata: Metadata = { title: "PolicyWallet", robots: { index: false, follow: false } }

/**
 * Spec v2 §18.1: served by the service worker when the network is gone.
 * A public route mounts no dictionary (docs/design/I18N_CONSUMER_MAP.md), so
 * both languages' copy is resolved here and the client picks by `language`.
 */
export default function OfflinePage() {
    return <OfflineClient copy={{ el: getTranslations("el").offline, en: getTranslations("en").offline }} />
}
