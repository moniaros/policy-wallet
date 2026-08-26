/**
 * P5-INFRA-00 POOLER LOCK — the stale-holder path, which is the normal one.
 *
 * The lock serialises fixture provisioning against the session pooler's
 * 15-client ceiling. Its most likely holder-departure is NOT a clean release:
 * it is the 600s watchdog killing a backgrounded Playwright run, which leaves
 * the file behind with nothing left to remove it. A lock that deadlocks on its
 * own commonest failure is worse than no lock, so the steal path is the one
 * that has to work.
 */
import { describe, expect, it } from "vitest"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import path from "path"
import os from "os"
import { acquirePoolerLock } from "../measure/pooler-lock"

/** Isolated per test — never the shared dir a real measurement run uses. */
function tempLockDir(name: string): string {
    const dir = path.join(os.tmpdir(), `pw-lock-test-${name}-${process.pid}`)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    return dir
}

describe("acquirePoolerLock", () => {
    it("takes the lock, records the holder, and releases it", async () => {
        const dir = tempLockDir("basic")
        const release = await acquirePoolerLock(1_000, dir)
        expect(readFileSync(path.join(dir, "lock"), "utf8").trim()).toBe(String(process.pid))
        release()
        expect(existsSync(path.join(dir, "lock"))).toBe(false)
    })

    it("steals a lock whose holder is gone, instead of waiting out the timeout", async () => {
        const dir = tempLockDir("stale")
        // A PID that cannot be running. The watchdog leaves exactly this behind.
        writeFileSync(path.join(dir, "lock"), "2147483646", "utf8")

        // Timeout is 200ms: if the steal did not happen this rejects rather than
        // resolving, so the assertion cannot pass by waiting.
        const release = await acquirePoolerLock(200, dir)
        expect(readFileSync(path.join(dir, "lock"), "utf8").trim()).toBe(String(process.pid))
        release()
    })

    it("refuses, naming the holder, when the holder is genuinely alive", async () => {
        const dir = tempLockDir("live")
        writeFileSync(path.join(dir, "lock"), String(process.pid), "utf8")
        await expect(acquirePoolerLock(150, dir)).rejects.toThrow(/PID \d+\) and that process is alive/)
    })

    it("tolerates an empty or garbage lock file rather than hanging on it", async () => {
        const dir = tempLockDir("garbage")
        writeFileSync(path.join(dir, "lock"), "not-a-pid", "utf8")
        // Unparseable holder is not evidence of liveness — and the message must
        // not claim liveness it never established.
        await expect(acquirePoolerLock(150, dir)).rejects.toThrow(/names no readable holder/)
        await expect(acquirePoolerLock(150, dir)).rejects.not.toThrow(/alive/)
    })
})
