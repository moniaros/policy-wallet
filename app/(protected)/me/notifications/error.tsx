"use client"

import { SettingsError } from "@/components/settings/SettingsFallbacks"

export default function SettingsSectionError(props: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return <SettingsError {...props} />
}
