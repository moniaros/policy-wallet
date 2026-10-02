// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assertReviewedPreventionMigration, reviewedPreventionMigrations } from '../../scripts/prevention-release-migrations'

describe('reviewed prevention migration content', () => {
    const migrations = readdirSync('prisma/migrations').filter(name => /^20261002\d+_prevention_/.test(name))

    it('enumerates the release SQL files rather than checking only a sample', () => {
        expect(migrations.sort()).toEqual(Object.keys(reviewedPreventionMigrations).sort())
    })

    it.each(migrations)('accepts the actual dev-verified SQL and cascading foreign keys in %s', name => {
        const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8')
        expect(sql).toContain('ON DELETE CASCADE')
        expect(() => assertReviewedPreventionMigration(name, sql)).not.toThrow()
    })

    it('rejects the committed destructive probe appended to otherwise approved SQL', () => {
        const name = migrations[0]
        const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8')
        const probe = readFileSync('tests/fixtures/guard-probes/prevention-release-mutation.sql', 'utf8')
        expect(() => assertReviewedPreventionMigration(name, sql + probe)).toThrow('Unreviewed prevention migration content')
    })

    it('rejects changed SQL and unknown migration names', () => {
        expect(() => assertReviewedPreventionMigration(migrations[0], 'DELETE FROM "prevention_progress";')).toThrow()
        expect(() => assertReviewedPreventionMigration('unexpected', '')).toThrow()
        expect(() => assertReviewedPreventionMigration('toString', '')).toThrow()
    })
})
