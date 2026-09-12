import type { Metadata } from "next"

import { StepUpClient } from "./StepUpClient"

export const metadata: Metadata = { title: "Passkey · PolicyWallet" }

/**
 * The second factor — PW-PROVENANCE-01 R-01. Reached only by the proxy's
 * redirect: the person is signed in, has a passkey enrolled, and this browser
 * carries no step-up proof. The page asks the authenticator, posts the
 * assertion, and returns to where they were going.
 */
export default async function StepUpPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
    const { callbackUrl } = await searchParams
    // Only a same-origin path may be the return target — never an absolute URL.
    const target = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard"
    return <StepUpClient callbackUrl={target} />
}
