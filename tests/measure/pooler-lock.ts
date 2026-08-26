/**
 * The measurement pooler lock — one definition, every DB user.
 *
 * Lives in its own module rather than inside `surface-harness.ts` because the
 * harness is not the only thing that opens connections during a measurement
 * run: `tests/global-setup.ts` provisions E2E users through the app's Prisma
 * singleton and never calls `withDb`. The first version of this lock guarded
 * `withDb` alone, and the very next Playwright run died in global-setup — the
 * lock's universe was smaller than the thing it was protecting, which is the
 * failure this run keeps finding in its own guards.
 */
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs"
import path from "path"
import os from "os"

/**
 * P5-INFRA-00: Pooler concurrency lock.
 *
 * The session pooler's 15-client ceiling is shared across all sessions on this machine.
 * Multiple measurement runs assume they own the pooler and exhaust it. This lock ensures
 * that only one run holds active DB connections at a time. File-based lock in OS temp
 * directory; held for the duration of the test run.
 *
 * Failure mode: second run exits with a clear error message naming the blocking PID,
 * rather than a cryptic `PrismaClientInitializationError: max clients reached in session mode`
 * followed by an error boundary in a capture (which makes a bad measurement look like data).
 */
function readLockPid(lockFile: string): string {
    try { return readFileSync(lockFile, "utf8").trim() } catch { return "" }
}

/** Liveness only — signal 0 performs the permission/existence check and sends nothing. */
function isProcessAlive(pid: number): boolean {
    try { process.kill(pid, 0); return true } catch (err: any) { return err?.code === "EPERM" }
}

export async function acquirePoolerLock(
    timeoutMs = 300_000,
    lockDir = path.join(os.tmpdir(), "pw-measurement-pooler-lock")
): Promise<() => void> {
    const lockFile = path.join(lockDir, "lock")
    const startTime = Date.now()

    // Create lock directory if needed
    try {
        mkdirSync(lockDir, { recursive: true })
    } catch { /* exists */ }

    // Poll for lock availability
    while (true) {
        try {
            // Attempt exclusive creation (fails if file exists)
            writeFileSync(lockFile, process.pid.toString(), {
                flag: "wx", // write exclusive
                encoding: "utf8",
            })
            // Lock acquired
            return () => {
                try {
                    unlinkSync(lockFile)
                } catch { /* cleanup */ }
            }
        } catch {
            // STALE LOCK. The documented normal failure on this harness is the
            // 600s watchdog killing a backgrounded Playwright run — which leaves
            // the lock file behind with no process left to release it. A lock
            // that deadlocks on its own most common failure mode is worse than
            // no lock at all, so verify the holder is alive and steal the lock
            // when it is not. Signal 0 tests liveness without signalling.
            const holder = Number.parseInt(readLockPid(lockFile), 10)
            if (Number.isFinite(holder) && holder > 0 && !isProcessAlive(holder)) {
                try { unlinkSync(lockFile) } catch { /* another waiter won the race */ }
                continue
            }
            if (Date.now() - startTime > timeoutMs) {
                // Say only what was established. Reaching here with an
                // unreadable holder means liveness was never determined, and a
                // message asserting "still alive" would be inventing the one
                // fact the operator needs.
                const raw = readLockPid(lockFile)
                const parsed = Number.parseInt(raw, 10)
                const known = Number.isFinite(parsed) && parsed > 0
                throw new Error(
                    `Pooler lock timeout (${timeoutMs}ms). ` +
                    (known
                        ? `Another measurement run holds the lock (PID ${parsed}) and that process is alive. ` +
                          `Only one run may use the session pooler at a time — wait for it, or stop it.`
                        : `The lock file ${lockFile} names no readable holder (${JSON.stringify(raw)}), so it ` +
                          `could not be checked for liveness or safely stolen. Delete it if no run is active.`)
                )
            }
            await new Promise((r) => setTimeout(r, 100))
        }
    }
}
