import { execFileSync } from 'node:child_process'

// Keep production credentials in their existing Vercel environment. Local and
// preview builds never acquire production access or apply production migrations.
if (process.env.VERCEL_ENV === 'production') {
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/release-prevention-schema.ts', '--apply'], {
        stdio: 'inherit',
        env: { ...process.env, EXPECTED_DB_PROJECT: 'cquudefwfwrmvpftuhyl' },
    })
}

// execFileSync throws on a schema failure, so the application cannot build or
// promote ahead of its verified, additive schema.
execFileSync('npm', ['run', 'build'], { stdio: 'inherit' })
