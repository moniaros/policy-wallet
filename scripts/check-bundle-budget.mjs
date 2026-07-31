#!/usr/bin/env node
/**
 * Bundle budget gate.
 *
 * There was no size gate of any kind, and no way to add the usual one: this
 * build runs on Turbopack, whose route table emits no "First Load JS" column
 * (`docs/design/LANDING_RSC_PROPOSAL.md` records the same dead end, and an
 * unmeasured ~448 KB claim that could never be verified). So rather than parse
 * a table that does not exist, this measures the artifact directly — the gzipped
 * client chunks Next actually wrote.
 *
 * It is a TOTAL-payload guard, not a per-route one. A per-route figure would be
 * better and is not available; a total that cannot drift 20% unnoticed is worth
 * far more than another quarter of no measurement at all.
 *
 * Usage:  node scripts/check-bundle-budget.mjs [--update]
 *   --update rewrites the recorded baseline. Do that deliberately, in the diff
 *   that grows the bundle, so the growth is reviewed rather than absorbed.
 */
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

const CHUNK_DIR = ".next/static/chunks"
const BASELINE_FILE = "scripts/bundle-baseline.json"
/** Growth tolerated before the gate fails, as a fraction of the baseline. */
const TOLERANCE = 0.1

function walk(dir) {
    const out = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) out.push(...walk(full))
        else if (entry.endsWith(".js")) out.push(full)
    }
    return out
}

if (!existsSync(CHUNK_DIR)) {
    console.error(
        `bundle-budget: ${CHUNK_DIR} not found — run \`npm run build\` first.\n` +
        "Refusing to pass without measuring: a gate that silently skips is not a gate."
    )
    process.exit(1)
}

const files = walk(CHUNK_DIR)
if (files.length < 20) {
    // Vacuity floor. A changed output path would otherwise make this pass by
    // measuring almost nothing.
    console.error(`bundle-budget: only ${files.length} chunks found — the build output looks wrong.`)
    process.exit(1)
}

const totalGzip = files.reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0)
const totalKb = Math.round(totalGzip / 1024)

if (process.argv.includes("--update")) {
    writeFileSync(BASELINE_FILE, `${JSON.stringify({ totalGzipKb: totalKb, chunks: files.length }, null, 2)}\n`)
    console.log(`bundle-budget: baseline set to ${totalKb} KB gz across ${files.length} chunks.`)
    process.exit(0)
}

if (!existsSync(BASELINE_FILE)) {
    console.error(
        `bundle-budget: no baseline at ${BASELINE_FILE}. Create one with:\n` +
        "  npm run build && node scripts/check-bundle-budget.mjs --update"
    )
    process.exit(1)
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf-8"))
const ceiling = Math.round(baseline.totalGzipKb * (1 + TOLERANCE))
const deltaPct = ((totalKb - baseline.totalGzipKb) / baseline.totalGzipKb) * 100

console.log(
    `bundle-budget: ${totalKb} KB gz across ${files.length} chunks ` +
    `(baseline ${baseline.totalGzipKb} KB, ceiling ${ceiling} KB, ${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`
)

if (totalKb > ceiling) {
    console.error(
        `\nbundle-budget FAILED: client JS grew ${deltaPct.toFixed(1)}% past the ${Math.round(TOLERANCE * 100)}% tolerance.\n` +
        "Either trim what was added, or accept the growth deliberately:\n" +
        "  npm run build && node scripts/check-bundle-budget.mjs --update"
    )
    process.exit(1)
}

console.log("bundle-budget passed.")
