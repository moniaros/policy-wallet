// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { run } = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('node:child_process', () => ({ execFileSync: run }))

beforeEach(() => { vi.resetModules(); run.mockReset() })
afterEach(() => { vi.unstubAllEnvs() })

describe('production schema before Vercel build', () => {
    it('verifies the production schema before building with credentials left in Vercel', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        await import('../../scripts/vercel-build.mjs')
        expect(run.mock.calls.map(call => call[1])).toEqual([
            ['--import', 'tsx', 'scripts/release-prevention-schema.ts', '--apply'],
            ['run', 'build'],
        ])
        expect(run.mock.calls[0][2].env.EXPECTED_DB_PROJECT).toBe('cquudefwfwrmvpftuhyl')
    })

    it('refuses to build when migration or schema verification fails', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        run.mockImplementationOnce(() => { throw new Error('Schema verification failed') })
        await expect(import('../../scripts/vercel-build.mjs')).rejects.toThrow('Schema verification failed')
        expect(run).toHaveBeenCalledTimes(1)
    })

    it.each(['preview', 'development', ''])('does not migrate production from a %s build', async environment => {
        vi.stubEnv('VERCEL_ENV', environment)
        await import('../../scripts/vercel-build.mjs')
        expect(run).toHaveBeenCalledExactlyOnceWith('npm', ['run', 'build'], { stdio: 'inherit' })
    })
})
