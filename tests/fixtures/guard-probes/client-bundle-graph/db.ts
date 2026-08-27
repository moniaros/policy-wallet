/**
 * Guard-probe fixture (no-server-modules-in-client-bundle): stand-in for the
 * forbidden module lib/db.ts. Content is irrelevant — the guard's walker only
 * follows import edges; what matters is that this file is the probe graph's
 * forbidden target.
 */
export const db = { probe: "forbidden-module-stand-in" } as const
