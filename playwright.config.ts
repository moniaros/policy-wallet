import { defineConfig, devices } from '@playwright/test';

const systemChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const defaultLaunchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];

// Specs excluded from the policyholder-authenticated projects:
// - unit tests belong to Vitest
// - sentry specs assert UNauthenticated behavior (own `sentry` project)
// - agent-journey needs the agent session (own `agent-chromium` project)
const policyholderIgnores = [
    '**/tests/unit/**',
    '**/sentry-*.spec.ts',
    '**/agent-journey.spec.ts',
    '**/agent-viewport-overflow.spec.ts',
    '**/admin-auth.setup.ts',
    // /admin/* bounces a policyholder to /dashboard, so this spec could only
    // ever fail here — four "failures" that said nothing about the insurer
    // console. It belongs to `admin-chromium`, which has the admin session.
    '**/admin-insurers.spec.ts',
    // public-marketing asserts ANONYMOUS behavior (own `public-anon` project);
    // a signed-in header state would audit a page no anonymous visitor sees.
    '**/public-marketing.spec.ts',
];

export default defineConfig({
    testDir: './tests',
    testIgnore: ['**/tests/unit/**'],
    globalSetup: './tests/global-setup.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // 1 local retry: the suite runs against a dev server + remote dev DB,
    // where transient auth/DB hiccups under parallel load are expected.
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        // npm run dev binds :3000 (macOS AirPlay squats :5000 and answers 403,
        // which Playwright's readiness probe would happily accept — never use 5000).
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'setup',
            testMatch: /(^|\/)auth\.setup\.ts/,
            use: { launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs } },
        },
        {
            name: 'agent-setup',
            testMatch: /agent-auth\.setup\.ts/,
            use: { launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs } },
        },
        {
            name: 'admin-setup',
            testMatch: /admin-auth\.setup\.ts/,
            use: { launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs } },
        },
        {
            name: 'chromium',
            testIgnore: policyholderIgnores,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/user.json',
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['setup'],
        },
        {
            name: 'firefox',
            testIgnore: policyholderIgnores,
            use: {
                ...devices['Desktop Firefox'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'webkit',
            testIgnore: policyholderIgnores,
            use: {
                ...devices['Desktop Safari'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'Mobile Chrome',
            testIgnore: policyholderIgnores,
            use: {
                ...devices['Pixel 5'],
                storageState: 'playwright/.auth/user.json',
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['setup'],
        },
        {
            name: 'Mobile Safari',
            testIgnore: policyholderIgnores,
            use: {
                ...devices['iPhone 12'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'agent-chromium',
            // ui-quality runs here too: ~10 agent-tree routes (/agent, /customers,
            // /commissions, /team, /opportunities) only redirect for the
            // policyholder fixture, so they were audited no further than their
            // redirect. The agent session reaches them.
            testMatch: /(agent-journey|agent-viewport-overflow|agent-console-clean|ui-quality-audit)\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/agent.json',
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['agent-setup'],
        },
        {
            name: 'admin-chromium',
            // The 14 /admin/* routes only ever redirected for the policyholder
            // and agent fixtures, so 29 of 108 routes were covered no further
            // than that bounce. This session reaches them.
            testMatch: /(ui-quality-audit|admin-insurers|agent-h1-empty-state|admin-feature-flags)\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/admin.json',
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['admin-setup'],
        },
        {
            // Cross-tenant enforcement. Builds BOTH request contexts itself
            // (owner to discover the id, agent to attack it), so the project
            // carries no storageState of its own — it just needs both auth
            // setups to have produced their files first.
            name: 'cross-tenant',
            testMatch: /cross-tenant-authorization\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['setup', 'agent-setup'],
        },
        {
            name: 'sentry',
            testMatch: /sentry-.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
        },
        {
            // Anonymous sweep of the public marketing site — no storageState,
            // no auth dependency, so it runs without the test-user setup.
            name: 'public-anon',
            testMatch: /public-marketing\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
        },
    ],

    webServer: {
        command: 'npm run dev',
        // Follows BASE_URL so a run can reuse a dev server another session
        // already has up (Next allows one dev server per project directory).
        url: process.env.BASE_URL || 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        env: {
            // .env.local carries a placeholder UPSTASH url that crashes every
            // page at module-evaluation time; these dummies keep dev healthy.
            UPSTASH_REDIS_REST_URL: 'https://dummy.upstash.io',
            UPSTASH_REDIS_REST_TOKEN: 'dummy-token',
            RATELIMIT_ALLOW_LOCAL: '1',
        },
    },
});
