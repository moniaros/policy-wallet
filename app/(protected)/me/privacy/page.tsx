export const runtime = 'nodejs'

import type { Metadata } from "next"
import { PrivacySection } from "@/components/settings/sections/PrivacySection"
import { DocumentConsentList } from "./DocumentConsentList"
import { getPrivacyData } from "../data"

export const metadata: Metadata = { title: "Privacy & data · Settings" }

export default async function PrivacySettingsPage() {
    return (
        <>
            <PrivacySection data={await getPrivacyData()} />
            <DocumentConsentList />
        </>
    )
}
