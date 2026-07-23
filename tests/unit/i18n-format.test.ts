import { describe, it, expect } from 'vitest'
import {
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
    resolveLocale,
    APP_TIME_ZONE,
} from '@/lib/i18n/format'

describe('lib/i18n/format', () => {
    describe('resolveLocale', () => {
        it('maps the two product languages', () => {
            expect(resolveLocale('el')).toBe('el-GR')
            expect(resolveLocale('en')).toBe('en-GB')
        })

        it('falls back to Greek — the default language — for anything unknown', () => {
            expect(resolveLocale(undefined)).toBe('el-GR')
            expect(resolveLocale(null)).toBe('el-GR')
            expect(resolveLocale('fr')).toBe('el-GR')
        })

        it('never resolves to en-US, which is what the drift produced', () => {
            expect([resolveLocale('el'), resolveLocale('en')]).not.toContain('en-US')
        })
    })

    describe('formatCurrency', () => {
        it('renders euros in both locales', () => {
            expect(formatCurrency(1234, 'el')).toContain('€')
            expect(formatCurrency(1234, 'en')).toContain('€')
        })

        it('honours the decimals option', () => {
            expect(formatCurrency(19.99, 'en', { decimals: 2 })).toContain('19.99')
            expect(formatCurrency(19.99, 'en', { decimals: 0 })).not.toContain('.99')
        })

        it('returns a dash rather than NaN/€0 for missing values', () => {
            expect(formatCurrency(null, 'el')).toBe('—')
            expect(formatCurrency(undefined, 'el')).toBe('—')
            expect(formatCurrency(Number.NaN, 'el')).toBe('—')
        })
    })

    describe('formatNumber', () => {
        it('groups thousands per locale', () => {
            expect(formatNumber(1234567, 'el')).toMatch(/1.234.567/)
            expect(formatNumber(1234567, 'en')).toMatch(/1,234,567/)
        })

        it('guards missing values', () => {
            expect(formatNumber(null, 'en')).toBe('—')
        })
    })

    describe('formatDate / formatDateTime', () => {
        // 2026-01-15T23:30:00Z is 2026-01-16 01:30 in Athens (UTC+2 in winter).
        // A bare toLocaleDateString() would render the 15th on a UTC server and
        // the 16th in an Athens browser — the POLICYWALLET-8 hydration mismatch.
        const instant = '2026-01-15T23:30:00.000Z'

        it('pins the timezone to Athens, not the runtime', () => {
            expect(formatDate(instant, 'en')).toContain('16')
            expect(formatDate(instant, 'el')).toContain('16')
        })

        it('is stable regardless of how the value is supplied', () => {
            const fromString = formatDate(instant, 'en')
            const fromDate = formatDate(new Date(instant), 'en')
            const fromEpoch = formatDate(new Date(instant).getTime(), 'en')
            expect(fromDate).toBe(fromString)
            expect(fromEpoch).toBe(fromString)
        })

        it('uses day-month order for English (en-GB), not month-day', () => {
            // 2026-03-04 Athens → "04/03/2026" in en-GB, "03/04/2026" in en-US.
            expect(formatDate('2026-03-04T12:00:00.000Z', 'en')).toBe('04/03/2026')
        })

        it('includes a time in formatDateTime', () => {
            expect(formatDateTime(instant, 'en')).toMatch(/\d{2}:\d{2}/)
        })

        it('guards invalid and missing dates instead of rendering "Invalid Date"', () => {
            expect(formatDate(null, 'el')).toBe('—')
            expect(formatDate('not-a-date', 'el')).toBe('—')
            expect(formatDateTime(undefined, 'el')).toBe('—')
        })

        it('exports the timezone it pins', () => {
            expect(APP_TIME_ZONE).toBe('Europe/Athens')
        })
    })
})
