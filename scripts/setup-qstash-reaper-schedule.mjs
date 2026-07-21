#!/usr/bin/env node
/**
 * Create (idempotently) the QStash schedule that reaps stale analysis runs
 * every 15 minutes. Vercel Hobby only allows daily crons, so the vercel.json
 * cron is a daily last resort and THIS schedule provides the real cadence.
 *
 * The schedule POSTs to /api/v1/jobs/reap-stale-analyses with the CRON_SECRET
 * forwarded as x-cron-secret (Upstash-Forward-* headers are passed through to
 * the destination), which the route accepts.
 *
 * Usage:
 *   QSTASH_TOKEN=... CRON_SECRET=... node scripts/setup-qstash-reaper-schedule.mjs [baseUrl]
 *   (baseUrl defaults to https://policywallet.gr)
 */

const QSTASH_API = "https://qstash.upstash.io/v2"

const token = process.env.QSTASH_TOKEN
const cronSecret = process.env.CRON_SECRET
const baseUrl = (process.argv[2] || "https://policywallet.gr").replace(/\/$/, "")
const destination = `${baseUrl}/api/v1/jobs/reap-stale-analyses`
const cron = "*/15 * * * *"

if (!token || !cronSecret) {
    console.error("QSTASH_TOKEN and CRON_SECRET are required in the environment.")
    process.exit(1)
}

const auth = { Authorization: `Bearer ${token}` }

const listRes = await fetch(`${QSTASH_API}/schedules`, { headers: auth })
if (!listRes.ok) {
    console.error(`Failed to list schedules: ${listRes.status} ${await listRes.text()}`)
    process.exit(1)
}
const schedules = await listRes.json()
const existing = (Array.isArray(schedules) ? schedules : []).find(
    (s) => s.destination === destination
)
if (existing) {
    console.log(`Schedule already exists (${existing.scheduleId}) for ${destination} — cron "${existing.cron}". Nothing to do.`)
    process.exit(0)
}

const createRes = await fetch(`${QSTASH_API}/schedules/${encodeURIComponent(destination)}`, {
    method: "POST",
    headers: {
        ...auth,
        "Upstash-Cron": cron,
        "Upstash-Forward-x-cron-secret": cronSecret,
        // A dead destination should not pile up retries — one is plenty; the
        // next 15-min tick covers it.
        "Upstash-Retries": "1",
    },
})
if (!createRes.ok) {
    console.error(`Failed to create schedule: ${createRes.status} ${await createRes.text()}`)
    process.exit(1)
}
const created = await createRes.json()
console.log(`Created QStash schedule ${created.scheduleId}: ${cron} → ${destination}`)
