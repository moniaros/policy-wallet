import { redirect } from "next/navigation"

// Two dedicated signup forms exist — one per audience. The bare /auth/signup
// URL routes by the legacy ?role= param (deep links from pricing/invites keep
// working) and defaults to the policyholder form.
export default async function SignUpPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const params = await searchParams
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (key === "role") continue
        if (typeof value === "string") query.set(key, value)
    }
    const suffix = query.size > 0 ? `?${query.toString()}` : ""
    const target = params.role === "agent" ? "agent" : "policyholder"
    redirect(`/auth/signup/${target}${suffix}`)
}
