/**
 * T-015 GENERIC SURFACE CAPTURE HARNESS.
 *
 * Orchestrates metric definitions that live ONLY in `./metrics` — nothing in
 * this file computes a metric, it navigates, settles, calls `./metrics`, and
 * writes the result. It exists because measuring 20 B2C surfaces one spec
 * file per surface would otherwise mean copy-pasting the same
 * open→settle→measure→write sequence (which `dashboard-baseline.spec.ts` and
 * `policy-detail-baseline.spec.ts` each already hand-roll, separately) into
 * every new file — the identical one-definition argument that produced
 * `metrics.ts` and `dashboard.ts` in the first place. A capture routine that
 * forked ten ways across ten new files would be exactly the failure this run
 * has repeatedly found in its own guards (PROGRESS.md, "a guard's universe is
 * part of the guard") applied to the harness itself.
 *
 * SETTLE PROCEDURE — identical everywhere this harness is used, per the T-015
 * brief: domcontentloaded → `settle()` (networkidle capped at 8s, +1s fixed,
 * animations frozen, `nextjs-portal` hidden) → full metric battery →
 * screenshot. `nextjs-portal` is the Next.js DEV-TOOLS badge, not product UI;
 * a prior audit mistook it for a floating app avatar on four screens
 * (PROGRESS.md, Checkpoint 4) — hiding it is `settle()`'s job, done once.
 */
import type { Page } from "@playwright/test"
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { acquirePoolerLock } from "./pooler-lock"
import {
    type Width,
    settle,
    scrollHeight,
    sectionCount,
    containerCount,
    duplicateFacts,
    type FactSpec,
    duplicateIdentityRows,
    smallTapTargets,
    contrastFailures,
    nonTextContrastFailures,
    latinSentences,
    nonTelPhoneNumbers,
    truncationFailures,
    pageOverflow,
    dateFacts,
    repeatedStrings,
    internalTokenLeaks,
} from "./metrics"

export const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }

/**
 * Which RUN this is. Defaults to `current`, never `baseline` — see
 * `dashboard-baseline.spec.ts`'s comment on `f23ee784`: a fixed directory name
 * means a re-run silently overwrites the reference it should be compared
 * against.
 */
export function evidenceDirs(surface: string) {
    const EVIDENCE = path.join(process.cwd(), "docs", "transformation", "evidence", surface)
    const RUN = process.env.MEASURE_RUN || "current"
    return {
        EVIDENCE,
        SHOTS: path.join(EVIDENCE, "screenshots", RUN),
        DATA: path.join(EVIDENCE, "data", RUN),
    }
}

export function ensureDirs(dirs: { SHOTS: string; DATA: string }) {
    mkdirSync(dirs.SHOTS, { recursive: true })
    mkdirSync(dirs.DATA, { recursive: true })
}

/** `.env.local` / `.env` loader — same tolerant parse every DB-touching spec in this directory uses. */
export function loadEnv() {
    for (const file of [".env.local", ".env"]) {
        try {
            for (const line of readFileSync(path.join(process.cwd(), file), "utf8").split("\n")) {
                const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/)
                if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
            }
        } catch { /* absent */ }
    }
}

// The pooler lock lives in ./pooler-lock so global-setup can take it too.
export { acquirePoolerLock } from "./pooler-lock"

export async function withDb<T>(fn: (db: any) => Promise<T>): Promise<T> {
    loadEnv()
    // SERIALISE POOLER ACCESS. Fixture provisioning is where this run actually
    // exhausted the 15-client session pooler — three times — because two
    // measurement processes provisioned at once while `next dev` already held
    // connections. Acquired HERE, not per-spec, so every caller is covered
    // without having to remember to ask: the lock shipped exported-and-never-
    // called, which is the adoption-incomplete failure this run keeps finding.
    const release = await acquirePoolerLock()
    const base = process.env.DATABASE_URL || ""
    const url = base.replace(/connection_limit=\d+/, "connection_limit=1").replace(/pool_timeout=\d+/, "pool_timeout=120")
    const { PrismaClient } = await import("@prisma/client")
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
        return await fn(db)
    } finally {
        await db.$disconnect()
        release()
    }
}

/**
 * Navigate → wait for a readiness selector → settle, or refuse to measure.
 *
 * Both halves are the policy-detail / dashboard lesson repeated: a lapsed
 * session lands on `/auth/signin`, and under `next dev` the shell can paint
 * before the RSC body finishes, so "loaded" does not mean "has content".
 * Default readiness selector is the page's own h1 — never a section id, which
 * a later restructure is entitled to rename.
 */
export async function openSurface(
    page: Page,
    url: string,
    width: Width,
    // "main#main-content" — the ONE element every `app/(protected)/**` route
    // actually has, because `AppShell` (mounted once, in the shared
    // `app/(protected)/layout.tsx`) wraps every page's children in it
    // (`components/shell/AppShell.tsx:369`). `.pw-page-shell` is NOT that: it
    // is an opt-in per-page class only SOME pages add inside that `<main>`
    // (dashboard, wallet, wallet/[id], notifications, coverage-insights,
    // risk-profile, account/* via `SettingsShell`) — `/agent`
    // (`AgentClient.tsx`) has neither `.pw-page-shell` NOR an `<h1>` at all,
    // and grepping for it first (rather than checking the shared layout)
    // cost this run a real multi-minute stall: `openSurface` waited the full
    // 45s×2 for a selector that could never appear, on BOTH agent-view specs,
    // compounding a separate resource-contention delay into what looked like
    // a hang. `.pw-page-shell` alone is also wrong for a DIFFERENT reason
    // (reconnaissance found /wallet and every /account/* subsection render
    // ZERO `<h1>`, ruling out an h1-based default) — `main#main-content` is
    // the one thing every surface this run measures is guaranteed to have.
    readySelector = "main#main-content"
): Promise<void> {
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForTimeout(400)
        if (page.url().includes("/auth/signin")) continue
        await dismissCookieBanner(page)
        try {
            await page.waitForSelector(readySelector, { timeout: 45_000, state: "attached" })
        } catch {
            continue
        }
        await settle(page)
        return
    }
    throw new Error(`openSurface(${url}): never rendered its content (or bounced to signin) — refusing to measure`)
}

/**
 * REFUSE TO WRITE A NON-RENDER. Same floor logic as `dashboard-baseline.spec.ts`'s
 * `assertRendered`, generalised: a shell-only paint (auth bounce absorbed by a
 * generic selector, an error boundary, a retry racing a fixture write) must
 * not silently read as "the smallest, therefore best, capture in the matrix".
 * `floor` is per-surface because surfaces genuinely differ in minimum content
 * (an empty-state landing page is legitimately short).
 *
 * `minSections` defaults to 1 but is NOT universal: `sectionCount()`'s
 * definition (metrics.ts) only ever matches `section[id]` elements or direct
 * children of `.pw-page-shell` — a page using NEITHER convention structurally
 * cannot produce a nonzero count no matter how much real content it has.
 * `/agent` (`AgentClient.tsx`) is exactly this: confirmed by a direct
 * server-rendered fetch (bypassing the browser entirely) to return real
 * content in ~5s, yet every capture measured 0 sections and was refused —
 * the harness reading its own convention as "did not render", not the page
 * failing to render. Callers on such a surface must pass `minSections: 0`
 * explicitly (a deliberate, visible opt-out) rather than have this default
 * silently swallow every capture of that surface as a false non-render.
 */
export function assertRendered(
    label: string,
    width: number,
    height: number,
    sections: number,
    floor = 300,
    minSections = 1
): void {
    if (height < floor || sections < minSections) {
        throw new Error(
            `${label}@${width}: refusing to record a non-render — ${height}px, ${sections} sections ` +
            `(floor ${floor}px/${minSections} section${minSections === 1 ? "" : "s"}).`
        )
    }
}

export interface CaptureResult {
    capture: string
    width: Width
    url: string
    scrollHeight: number
    viewportsOfContent: number
    sections: Awaited<ReturnType<typeof sectionCount>>
    containers: Awaited<ReturnType<typeof containerCount>>
    duplicateFacts: Awaited<ReturnType<typeof duplicateFacts>>
    /** P5-wallet-00: byte-identical wallet-row identity (insurer/line/date/status, no policy number) — every capture, not opt-in. */
    identityDuplicates: Awaited<ReturnType<typeof duplicateIdentityRows>>
    tapTargets: Awaited<ReturnType<typeof smallTapTargets>>
    contrast: { text: string[]; nonText: string[] }
    /** §6.12: does the page itself scroll sideways at this width? */
    pageOverflow: Awaited<ReturnType<typeof pageOverflow>>
    probes: {
        truncation: Awaited<ReturnType<typeof truncationFailures>>
        latinSentences: string[]
        nonTelPhoneNumbers: string[]
        dateFacts: Awaited<ReturnType<typeof dateFacts>>
        repeatedStrings: Awaited<ReturnType<typeof repeatedStrings>>
        internalTokenLeaks: string[]
        fullText: string
    }
    [extra: string]: unknown
}

/**
 * THE FULL METRICS.TS BATTERY, one call, one capture.
 *
 * Every metric named in the T-015 brief that has a DOM-observable definition
 * in `metrics.ts` runs here: scroll height, section count, container count +
 * max depth, duplicate facts (BOTH the `data-fact` attribute scan and the
 * value scan — requirement 1, since the attribute scan is vacuous almost
 * everywhere), sub-44px tap targets, 1.4.3 text contrast, **1.4.11 non-text
 * contrast** (requirement 2 — mandatory, not deferred), plus the diagnostic
 * probes (truncation, Latin-sentence / untranslated-string detection,
 * un-tel'd phone numbers, date/status-consistency facts, repeated strings,
 * internal-token leaks). `floor` forwards to `assertRendered` for surfaces
 * whose honest minimum content is short.
 *
 * P5-INFRA-00: REFUSAL RULES
 * Two structural refusals live here, not in individual specs:
 * 1. Error boundaries: a capture whose DOM contains the generic error boundary is
 *    REFUSED, not recorded — the page did not render.
 * 2. Unlocatable fields: a run whose `identityDuplicates.unlocatable` count is > 0
 *    is REFUSED unless the surface/field pair is exempted in UNLOCATABLE_EXEMPT.
 *    The exemption must be explicit and named, not a blanket allowance.
 */

/** P5-INFRA-00: Documented schema gaps where fields are intentionally unlocatable. */
const UNLOCATABLE_EXEMPT: Record<string, string[]> = {
    // H-010 (HALTS.md): health and life policies carry no insured-person name
    // (policyholders, not named individuals). The field is absent by design.
    "policy-detail": ["subject"],
}

/**
 * Which unlocatable rows are NOT covered by a documented exemption.
 *
 * Exported and PURE so the decision can be probed without a browser.
 * `captureSurface` needs a live `Page`, so a bug in this decision is invisible
 * to `tsc`, to lint, and to the entire unit suite — which is exactly how the
 * first version shipped: it derived the surface by dropping the last label
 * segment, turning "policy-detail-motor-active-320" into
 * "policy-detail-motor-active", matching no exemption at all, and would have
 * refused every policy-detail capture the moment a run reached one.
 *
 * Matching is by label PREFIX on a segment boundary, never by counting
 * segments off the end: capture labels carry a variable number of state
 * segments before the width, so there is no fixed offset to count back from.
 */
export function undocumentedUnlocatable(
    label: string,
    unlocatable: { index: number; missingFields: string[] }[],
    exemptions: Record<string, string[]> = UNLOCATABLE_EXEMPT
): { index: number; missingFields: string[] }[] {
    const surface = Object.keys(exemptions)
        .filter((key) => label === key || label.startsWith(`${key}-`))
        .sort((a, b) => b.length - a.length)[0]
    const exempt = surface ? exemptions[surface]! : []
    // EVERY missing field must be exempt. Testing only `missingFields[0]` waves
    // a row missing ["subject", "insurer"] straight through because its first
    // entry happens to be documented — the absent insurer goes unmeasured and
    // unreported, which is the failure this refusal exists to prevent.
    return unlocatable.filter((row) => !row.missingFields.every((f) => exempt.includes(f)))
}

export async function captureSurface(
    page: Page,
    dirs: { SHOTS: string; DATA: string },
    label: string,
    width: Width,
    facts: FactSpec[] = [],
    extra: Record<string, unknown> = {},
    floor = 300,
    minSections = 1
): Promise<CaptureResult> {
    const text = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
    // REFUSE AN ERROR BOUNDARY. Found live during this run: `health-expired@430`
    // rendered the generic error boundary ("Κάτι πήγε στραβά" / "Δοκιμάστε
    // ξανά" / "Κωδικός συμβάντος") at 1076px / 2 sections — ABOVE the generic
    // 300px non-render floor, so it would otherwise have been recorded as a
    // real, very short capture rather than a crash. `openSurface`'s readiness
    // selector (`.pw-page-shell`) matches the error boundary's own wrapper, so
    // it cannot catch this by itself. Same shape as the dashboard harness's
    // "REFUSE TO WRITE A NON-RENDER" lesson, one class more specific.
    if (/Κάτι πήγε στραβά/.test(text)) {
        throw new Error(`${label}@${width}: the page rendered the generic ERROR BOUNDARY, not its content — refusing to record.`)
    }
    const sh = await scrollHeight(page)
    const sec = await sectionCount(page)
    // Heading-structure sanity: cheap, and worth recording on every capture
    // rather than per-surface — the reconnaissance for this run found ZERO
    // <h1> on /wallet and every /account/* subsection component (grep,
    // 2026-08-23), which a per-surface ad hoc check would have re-discovered
    // piecemeal and easy to under-report across 20 surfaces.
    const headingCounts = await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        mainLandmark: document.querySelectorAll("main, [role='main']").length,
    }))

    const identityDuplicates = await duplicateIdentityRows(page)

    // P5-INFRA-00: REFUSE UNLOCATABLE FIELDS (unless documented). An unlocatable field
    // is a field that the harness could not locate on the page (e.g., identity fields
    // on a policy card). This is a structural refusal: if it happens, either the page
    // layout changed (a measurement problem) or the field is legitimately absent (a
    // schema gap that must be documented in UNLOCATABLE_EXEMPT). A bare
    // `unlocatable > 0` is a measurement failure; a documented exemption is OK.
    if (identityDuplicates.unlocatable.length > 0) {
        const undocumented = undocumentedUnlocatable(label, identityDuplicates.unlocatable)
        if (undocumented.length > 0) {
            const details = undocumented
                .map((item) => `row ${item.index}: ${item.missingFields.join(", ")}`)
                .join("; ")
            throw new Error(
                `${label}@${width}: unlocatable fields (${undocumented.length} rows): ${details}. ` +
                `If this is a documented schema gap, add it to UNLOCATABLE_EXEMPT in surface-harness.ts.`
            )
        }
    }

    const data: CaptureResult = {
        capture: label,
        width,
        url: page.url(),
        scrollHeight: sh,
        viewportsOfContent: Number((sh / HEIGHT[width]).toFixed(1)),
        headingCounts,
        sections: sec,
        containers: await containerCount(page),
        duplicateFacts: await duplicateFacts(page, facts),
        identityDuplicates,
        tapTargets: await smallTapTargets(page),
        contrast: {
            text: await contrastFailures(page),
            nonText: await nonTextContrastFailures(page),
        },
        pageOverflow: await pageOverflow(page),
        probes: {
            truncation: await truncationFailures(page),
            latinSentences: await latinSentences(page),
            nonTelPhoneNumbers: await nonTelPhoneNumbers(page),
            dateFacts: await dateFacts(page),
            repeatedStrings: await repeatedStrings(page),
            internalTokenLeaks: await internalTokenLeaks(page),
            fullText: text,
        },
        ...extra,
    }
    assertRendered(label, width, sh, sec.count, floor, minSections)
    writeFileSync(path.join(dirs.DATA, `${label}-${width}.json`), JSON.stringify(data, null, 2))
    await page.screenshot({ path: path.join(dirs.SHOTS, `${label}-${width}.png`), fullPage: true })
    console.log(
        `[measure] ${label}@${width}: ${sh}px (${data.viewportsOfContent} screens), ${sec.count} sections, ` +
        `${data.containers.count} containers (depth ${data.containers.maxDepth}), ${data.tapTargets.length} sub-44, ` +
        `dup-facts(attr/value)=${data.duplicateFacts.dataFactDuplicates.length}/${data.duplicateFacts.valueScanDuplicates.length}, ` +
        `identity-dup(rows/largest)=${data.identityDuplicates.duplicateRowCount}/${data.identityDuplicates.largestGroupSize}, ` +
        `contrast(text/nonText)=${data.contrast.text.length}/${data.contrast.nonText.length}, ` +
        `truncation=${data.probes.truncation.length}, leaks=${data.probes.internalTokenLeaks.length}, ` +
        `overflow=${data.pageOverflow.overflowPx}px(${data.pageOverflow.offenders.length})`
    )
    return data
}
