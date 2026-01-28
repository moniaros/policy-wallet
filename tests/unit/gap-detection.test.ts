import { describe, it, expect } from 'vitest';
import { detectGaps } from '@/lib/gap-detection';

describe('Gap Detection Logic', () => {
    it('should detect no health insurance gap', () => {
        const policies = [
            {
                lineOfBusiness: 'health',
                status: 'active',
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            },
        ];

        const gaps = detectGaps(policies as any);
        const healthGap = gaps.find(g => g.gapType === 'missing_health_insurance');

        expect(healthGap).toBeUndefined();
    });

    it('should detect missing health insurance', () => {
        const policies = [
            {
                lineOfBusiness: 'motor',
                status: 'active',
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ];

        const gaps = detectGaps(policies as any);
        const healthGap = gaps.find(g => g.gapType === 'missing_health_insurance');

        expect(healthGap).toBeDefined();
        expect(healthGap?.severity).toBe('high');
    });

    it('should detect expiring policy', () => {
        const policies = [
            {
                lineOfBusiness: 'motor',
                status: 'active',
                endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
            },
        ];

        const gaps = detectGaps(policies as any);
        const expiringGap = gaps.find(g => g.gapType === 'expiring_soon');

        expect(expiringGap).toBeDefined();
    });

    it('should detect low coverage amount', () => {
        const policies = [
            {
                lineOfBusiness: 'home',
                status: 'active',
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                acordData: {
                    coverageAmount: 50000, // Low coverage
                },
            },
        ];

        const gaps = detectGaps(policies as any);
        const lowCoverageGap = gaps.find(g => g.gapType === 'low_coverage_amount');

        expect(lowCoverageGap).toBeDefined();
    });

    it('should return empty array for no policies', () => {
        const gaps = detectGaps([]);
        expect(gaps).toEqual([]);
    });

    it('should handle multiple gap types', () => {
        const policies = [
            {
                lineOfBusiness: 'motor',
                status: 'active',
                endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // Expiring soon
            },
        ];

        const gaps = detectGaps(policies as any);

        // Should detect both expiring soon AND missing health insurance
        expect(gaps.length).toBeGreaterThan(0);
        expect(gaps.some(g => g.gapType === 'expiring_soon')).toBe(true);
        expect(gaps.some(g => g.gapType === 'missing_health_insurance')).toBe(true);
    });
});
