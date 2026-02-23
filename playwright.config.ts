import { defineConfig, devices } from '@playwright/test';

const systemChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const defaultLaunchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];

export default defineConfig({
    testDir: './tests',
    testIgnore: ['**/tests/unit/**'],
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:5000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            use: { launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs } },
        },
        {
            name: 'agent-setup',
            testMatch: /agent-auth\.setup\.ts/,
            use: { launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs } },
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/user.json',
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['setup'],
        },
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'Mobile Chrome',
            use: {
                ...devices['Pixel 5'],
                storageState: 'playwright/.auth/user.json',
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['setup'],
        },
        {
            name: 'Mobile Safari',
            use: {
                ...devices['iPhone 12'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'agent-chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/agent.json',
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
            dependencies: ['agent-setup'],
        },
        {
            name: 'sentry',
            testMatch: /sentry-.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: { executablePath: systemChromiumPath, args: defaultLaunchArgs },
            },
        },
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
