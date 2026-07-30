/**
 * Node-20-safe drop-in for `fs.globSync`.
 *
 * `fs.globSync` is a Node 22+ API and is `undefined` on this project's
 * declared runtime (Node 20.11.0 — see `.nvmrc` / CLAUDE.md). The
 * architectural guard-tests that scan the source tree imported it directly
 * from `node:fs`, which passes locally on a newer Node but throws
 * "globSync is not a function" for every such test under CI's Node 20 —
 * turning the whole mainline red.
 *
 * Backed by tinyglobby (already in the tree via vitest; engines >=12), whose
 * sync output is set-equal to `fs.globSync` for every pattern these tests use
 * (verified across all patterns before the swap). Sorted for deterministic
 * ordering across platforms and runtimes.
 */
import { globSync as tinyGlobSync } from "tinyglobby"

export function globSync(pattern: string): string[] {
    return [...tinyGlobSync(pattern)].sort()
}
