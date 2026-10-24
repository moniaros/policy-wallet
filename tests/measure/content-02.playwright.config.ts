import { defineConfig } from "@playwright/test"

/**
 * PW-CONTENT-02 measurement run: public routes only, anonymous, against a
 * server the caller already started (BASE_URL). Deliberately NO globalSetup and
 * NO webServer — the main config provisions test users in the dev database and
 * starts `npm run dev`; a content measurement needs neither.
 *   BASE_URL=http://localhost:3100 CONTENT02_PHASE=after \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… npx playwright test -c tests/measure/content-02.playwright.config.ts
 */
export default defineConfig({
    testDir: ".",
    testMatch: /content-02\.spec\.ts/,
    workers: 1,
    retries: 0,
    reporter: "list",
    use: {
        baseURL: process.env.BASE_URL || "http://localhost:3100",
        launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
            args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        },
    },
})
