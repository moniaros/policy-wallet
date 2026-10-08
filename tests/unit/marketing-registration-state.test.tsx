/**
 * The public site never says sign-ups are closed (owner decision, 2026-10-08).
 *
 * Only the signup page knows and says it (app/auth/signup/SignupForm.tsx). The
 * homepage used to read the gate and swap its CTAs to the needs check with
 * «Οι νέες εγγραφές είναι προσωρινά κλειστές» — announcing the pause to every
 * prospective customer while every other page still said «Δημιουργία
 * λογαριασμού». Now every public CTA goes to signup, uniformly.
 *
 * The universe is every source file of the public site, enumerated from disk.
 */
import React from 'react'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrafiHero } from '@/components/landing/GrafiHero'

const PUBLIC_ROOTS = ['app/(public)', 'components/landing', 'components/public', 'components/pricing', 'lib/marketing', 'lib/nav']
const GATE_IMPORT = /from\s+["']@\/lib\/auth\/registration-gate["']/
const CLOSED_WORDING = /εγγραφ\S*[^"'`\n]{0,40}κλειστ|registrations?\b[^"'`\n]{0,30}\b(paused|closed)/i

function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) return sources(full)
        return /\.(tsx?|mjs)$/.test(name) ? [full] : []
    })
}

function offenders(files: Array<{ path: string; text: string }>): string[] {
    return files.filter((f) => GATE_IMPORT.test(f.text) || CLOSED_WORDING.test(f.text)).map((f) => f.path)
}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/landing/real-screens/RealScreens', () => ({
    AppScreen: () => null, DashboardScreen: () => null, WalletScreen: () => null,
    CoverageMapScreen: () => null, SampleStamp: () => null,
}))
vi.mock('@/src/design-system', () => ({
    DeviceFrame: () => null,
    EmailCapture: ({ label }: { label: string }) => <input type="email" aria-label={label} />,
}))
afterEach(cleanup)

describe('the public site never announces closed registrations', () => {
    const files = PUBLIC_ROOTS.flatMap(sources).map((path) => ({ path, text: readFileSync(path, 'utf8') }))

    it('enumerates the public tree', () => {
        expect(files.length).toBeGreaterThan(100)
    })

    it('probe: the old homepage wording and the gate import are both caught', () => {
        const probes = [
            { path: 'probe-wording', text: 'el: "Οι νέες εγγραφές είναι προσωρινά κλειστές."' },
            { path: 'probe-en', text: 'en: "New registrations are temporarily paused."' },
            { path: 'probe-import', text: 'import { registrationsOpen } from "@/lib/auth/registration-gate"' },
        ]
        expect(offenders(probes)).toEqual(probes.map((p) => p.path))
    })

    it('no public source reads the gate or says sign-ups are closed', () => {
        expect(offenders(files)).toEqual([])
    })

    for (const locale of ['el', 'en'] as const) {
        it(`${locale}: the hero always offers the email entry`, () => {
            render(<GrafiHero locale={locale} />)
            expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
        })
    }
})
