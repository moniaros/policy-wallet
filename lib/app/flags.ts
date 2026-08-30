import { flagEnabled, getFlags } from "@/lib/flags/config"

/** The app-tier flags (lib/flags/registry.ts, category "app"). Read once per request via the cached state. */
export type AppFlag = "app.findings" | "app.household" | "app.document_consent"

export async function appFlag(key: AppFlag): Promise<boolean> {
    return flagEnabled(await getFlags(), key)
}
