export const runtime = 'nodejs'

import { redirect } from "next/navigation"

/**
 * `/home` and `/dashboard` both rendered the policyholder dashboard — the same
 * screen on two URLs. That split analytics and broke nav active-state for anyone
 * who arrived on `/home` (the sidebar links to `/dashboard`). `/dashboard` is the
 * canonical URL; the page implementation now lives beside it as
 * `dashboard/PolicyholderHome.tsx`, and this route only redirects.
 */
export default async function HomePage() {
    redirect("/dashboard")
}
