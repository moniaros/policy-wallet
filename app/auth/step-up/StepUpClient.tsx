"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2 } from "lucide-react"
import { startAuthentication } from "@simplewebauthn/browser"

import { useLanguage } from "@/contexts/LanguageContext"
import { signOut } from "@/app/auth/actions"

type State = "asking" | "verifying" | "failed" | "unsupported"

export function StepUpClient({ callbackUrl }: { callbackUrl: string }) {
    const { t } = useLanguage()
    const copy = t.auth.stepUp
    const router = useRouter()
    const [state, setState] = useState<State>("asking")
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let cancelled = false
        async function run() {
            if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
                setState("unsupported")
                return
            }
            setState("asking")
            try {
                const challenge = await fetch("/api/auth/passkeys/challenge", { method: "POST" })
                if (!challenge.ok) throw new Error(`challenge ${challenge.status}`)
                const { data } = await challenge.json()
                const assertion = await startAuthentication({ optionsJSON: data })
                if (cancelled) return
                setState("verifying")
                const verify = await fetch("/api/auth/passkeys/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ response: assertion }),
                })
                if (!verify.ok) throw new Error(`verify ${verify.status}`)
                router.replace(callbackUrl)
                router.refresh()
            } catch {
                if (!cancelled) setState("failed")
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [attempt, callbackUrl, router])

    return (
        <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
            <div className="pw-card pw-pad w-full" data-step-up={state}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15">
                    {state === "asking" || state === "verifying" ? (
                        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary dark:text-mint" />
                    ) : (
                        <KeyRound aria-hidden="true" className="h-6 w-6 text-primary dark:text-mint" />
                    )}
                </div>
                <h1 className="mt-4 text-lg font-semibold text-foreground">{copy.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {state === "asking" && copy.asking}
                    {state === "verifying" && copy.verifying}
                    {state === "failed" && copy.failed}
                    {state === "unsupported" && copy.unsupported}
                </p>
                {state === "failed" ? (
                    <button type="button" onClick={() => setAttempt((n) => n + 1)} className="pw-primary-button mt-4 w-full">
                        {copy.retry}
                    </button>
                ) : null}
                <p className="mt-4 text-caption leading-relaxed text-muted-foreground">{copy.lockedOut}</p>
                <form action={signOut} className="mt-2">
                    <button type="submit" className="pw-inline-action inline-flex min-h-11 items-center text-caption font-semibold text-primary hover:underline dark:text-mint">
                        {copy.signOut}
                    </button>
                </form>
            </div>
        </main>
    )
}
