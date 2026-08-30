export const runtime = "nodejs"

import { redirect } from "next/navigation"

/**
 * /account/* → /me/* (Grafí G11). The proxy 301s first; this catch-all is the
 * dead-link guard's arm and carries the legacy `?tab=` query through to the
 * /me index, which still honours LEGACY_TAB_REDIRECTS.
 */
export default async function LegacyAccountPage({ params, searchParams }: { params: Promise<{ rest?: string[] }>; searchParams: Promise<Record<string, string>> }) {
    const { rest } = await params
    const query = new URLSearchParams(await searchParams).toString()
    redirect(`/me${rest?.length ? `/${rest.join("/")}` : ""}${query ? `?${query}` : ""}`)
}
