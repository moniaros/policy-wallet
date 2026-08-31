import { defineConfig } from "@playwright/test"

/**
 * The audit harness (D0) — separate from playwright.config.ts on purpose:
 * that config owns a webServer on :3000 and twenty projects; this one runs
 * against two EXTERNALLY OWNED servers and must never start or stop either.
 *
 *   AUDIT_TARGET=old → the pre-rebuild build at BASE_URL_OLD (:3000, the main
 *                      checkout on NEW-UI) — record mode: baselines are written.
 *   AUDIT_TARGET=new → the rebuilt app at BASE_URL_NEW (:3100, this worktree)
 *                      — assert mode: thresholds are enforced.
 *
 * Every spec asserts the build identity before measuring (helpers.ts):
 * the old build answers anonymous /dashboard with a 307 to signin, the new
 * one 301s it to / — a server that answers the other way is the wrong server.
 *
 * Both targets are dev servers that compile on first hit, so: one worker,
 * no retries (the determinism proof needs honest runs), generous timeouts.
 */

const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const launchOptions = {
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    ...(chromePath ? { executablePath: chromePath } : {}),
}

/** The brief's five instruments. Specs read the viewport via helpers.VIEWPORTS
 * keyed by project name when they build their own themed contexts. */
export const AUDIT_DEVICES = [
    { name: "iphone-se", viewport: { width: 375, height: 667 }, mobile: true },
    { name: "iphone-15", viewport: { width: 393, height: 852 }, mobile: true },
    { name: "ipad", viewport: { width: 768, height: 1024 }, mobile: true },
    { name: "laptop", viewport: { width: 1280, height: 800 }, mobile: false },
    { name: "desktop", viewport: { width: 1600, height: 900 }, mobile: false },
] as const

export default defineConfig({
    testDir: "./tests/audit",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 120_000,
    expect: { timeout: 15_000, toHaveScreenshot: { animations: "disabled", caret: "hide" } },
    reporter: [["list"]],
    // Committed, human-browsable visual baseline. The {arg} carries the
    // target prefix (old-/new-), so the two builds never collide.
    snapshotPathTemplate: "docs/screens/audit/{projectName}/{arg}{ext}",
    use: {
        locale: "el-GR",
        launchOptions,
        trace: "retain-on-failure",
        screenshot: "off",
    },
    projects: [
        { name: "audit-setup", testMatch: /audit\.setup\.ts/ },
        ...AUDIT_DEVICES.map((d) => ({
            name: d.name,
            dependencies: ["audit-setup"],
            testIgnore: /audit\.setup\.ts/,
            use: {
                viewport: { ...d.viewport },
                ...(d.mobile ? { isMobile: true, hasTouch: true } : {}),
            },
        })),
    ],
})
