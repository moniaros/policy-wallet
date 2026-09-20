import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrafiHero } from '@/components/landing/GrafiHero'
import { REGISTRATION_PAUSED, EXPLORE_NEEDS } from '@/lib/marketing/positioning'

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
describe('homepage registration journey', () => {
    for (const locale of ['el', 'en'] as const) {
        it(`${locale}: paused signup explains invitations and offers the public needs check before collecting email`, () => {
            render(<GrafiHero locale={locale} registrationsOpen={false} />)
            expect(screen.queryByRole('textbox')).toBeNull()
            expect(screen.getByText(REGISTRATION_PAUSED[locale])).toBeVisible()
            expect(screen.getByRole('link', { name: EXPLORE_NEEDS[locale] })).toHaveAttribute('href', locale === 'el' ? '/needs' : '/en/needs')
        })
        it(`${locale}: open signup retains the email entry`, () => {
            render(<GrafiHero locale={locale} registrationsOpen />)
            expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
            expect(screen.queryByText(REGISTRATION_PAUSED[locale])).toBeNull()
        })
    }
})
