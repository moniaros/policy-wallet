"use client"

import { useState, useTransition } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PRIMARY_NAV } from "@/lib/app/navigation"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection } from "@/src/design-system/app-layout"
import { Button } from "@/src/design-system/primitives"
import { completeWelcome } from "./actions"

/**
 * /welcome (§8.11): three screens — what I do, what I never do, add the first
 * policy. Shown on first run only (no policies AND onboardingCompletedAt
 * null); finishing stamps the existing column and lands on /add.
 */
export function WelcomeScreen() {
    const { t } = useLanguage()
    const [step, setStep] = useState(0)
    const [pending, start] = useTransition()
    const w = t.app.welcome
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const steps = [
        { title: w.doTitle, lines: [w.do1, w.do2, w.do3] },
        { title: w.neverTitle, lines: [w.never1, w.never2, w.never3] },
        { title: w.firstTitle, lines: [w.first1] },
    ]
    const current = steps[step]

    return (
        <>
            <LargeTitleNav title={current.title} brand={brand} />
            <AppSection id="welcome">
                <ol className="flex gap-g-2" aria-label={w.progress}>
                    {steps.map((s, i) => (
                        <li key={s.title} aria-current={i === step ? "step" : undefined} className={`h-1.5 w-8 rounded-g-pill ${i <= step ? "bg-fg-brand" : "bg-surface-sunken"}`}>
                            <span className="sr-only">{s.title}</span>
                        </li>
                    ))}
                </ol>
                <ul className="mt-g-5 flex flex-col gap-g-3">
                    {current.lines.map((line) => (
                        <li key={line} className="text-g-app-body text-fg-primary">{line}</li>
                    ))}
                </ul>
                <div className="mt-g-6 flex gap-g-2">
                    {step < steps.length - 1 ? (
                        <Button variant="primary" size="lg" onClick={() => setStep((s) => s + 1)}>{w.next}</Button>
                    ) : (
                        <Button variant="primary" size="lg" loading={pending} onClick={() => start(async () => { await completeWelcome() })}>{w.addFirst}</Button>
                    )}
                    {step > 0 && <Button variant="ghost" size="lg" onClick={() => setStep((s) => s - 1)}>{w.back}</Button>}
                </div>
            </AppSection>
        </>
    )
}
