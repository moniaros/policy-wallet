"use client"

import { SettingsError } from "@/components/settings/SettingsFallbacks"

// Scoped to the settings pane: the shared RouteError opens its own
// pw-page-shell, which would stack inside the settings shell.
export default function AgentSettingsError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <SettingsError {...props} />
}
