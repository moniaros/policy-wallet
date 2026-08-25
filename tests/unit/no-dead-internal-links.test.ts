import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join } from "node:path"

/**
 * No internal link points at a route that no longer exists.
 *
 * Born with V2-P2-03, which deleted four routes (/coverage-insights,
 * /branches[/branch], /insights/risk-profile, /timeline) that 62 sites linked
 * to. Every one of those sites was rewritten by hand against a prep list — a
 * process that works exactly once. This guard makes the invariant permanent:
 * the NEXT removal that leaves a link behind fails CI instead of shipping a
 * tap that 404s (or, worse under the proxy, silently bounces to a dashboard).
 *
 * THE UNIVERSE (CLAUDE.md: guards enumerate, not assume):
 *
 *   Routes — enumerated from the filesystem at test time, never a list:
 *     · every directory under app/ whose folder holds a page.tsx/page.ts
 *       (route groups `(x)` contribute no segment; `[param]` and `[...rest]`
 *       are wildcards)
 *     · every route.ts under app/ (API endpoints — an <a download> or a
 *       router.push may legitimately target one)
 *     · framework conventions that serve a path without a page file:
 *       app/sitemap.ts → /sitemap.xml, app/robots.ts → /robots.txt,
 *       app/manifest.ts → /manifest.json, opengraph/twitter images
 *     · every file under public/ (served verbatim at its own path)
 *
 *   Targets — every internal navigation target in runtime source under
 *   app/, components/, lib/, contexts/, hooks/ (tests and scripts are not
 *   shipped): href attributes and href: object properties (string or
 *   template literal), redirect(...), revalidatePath(...),
 *   router.push/replace(...), and returnTo props (they become billing
 *   return paths). A `${expr}` in a template collapses its segment to a
 *   wildcard; a leading `${APP_URL}`-style prefix is stripped so absolute
 *   email links are checked too. External URLs, mailto:, tel:, bare
 *   anchors and non-literal hrefs are out of scope — this guard checks
 *   that what IS statically addressed resolves, it does not claim to see
 *   through arbitrary expressions.
 *
 * PROBES (a guard without a probe is not a guard): the machinery is fed a
 * link to a route this very item deleted and must flag it; the extractor is
 * fed synthetic source in every syntax form it claims to parse and must find
 * them all. Both prove red is reachable — see also the run log for V2-P2-03,
 * where the guard was demonstrated red against a real reintroduced dead link
 * before its green was trusted.
 */

const RUNTIME_ROOTS = ["app", "components", "lib", "contexts", "hooks"]

// ── Route enumeration ────────────────────────────────────────────────

function collectRoutes(dir: string, prefix: string, out: Set<string>) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
            // Route groups add no URL segment; private folders (_x) add no route.
            if (entry.startsWith("_")) continue
            const seg = entry.startsWith("(") && entry.endsWith(")") ? "" : `/${entry}`
            collectRoutes(full, prefix + seg, out)
        } else if (/^page\.(tsx|ts|jsx|js)$/.test(entry)) {
            out.add(prefix || "/")
        } else if (/^route\.(ts|js)$/.test(entry)) {
            out.add(prefix || "/")
        }
    }
}

function collectPublicFiles(dir: string, prefix: string, out: Set<string>) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) collectPublicFiles(full, `${prefix}/${entry}`, out)
        else out.add(`${prefix}/${entry}`)
    }
}

export function appRoutes(): Set<string> {
    const routes = new Set<string>()
    collectRoutes("app", "", routes)
    collectPublicFiles("public", "", routes)
    // Metadata/file conventions: served paths with no page/route file.
    const conventions: Array<[RegExp, string]> = [
        [/^sitemap\.(ts|js|xml)$/, "/sitemap.xml"],
        [/^robots\.(ts|js|txt)$/, "/robots.txt"],
        [/^manifest\.(ts|js|json|webmanifest)$/, "/manifest.json"],
        [/^opengraph-image\.(tsx|ts|png|jpg)$/, "/opengraph-image"],
        [/^twitter-image\.(tsx|ts|png|jpg)$/, "/twitter-image"],
        [/^icon\.(tsx|ts|png|svg|ico)$/, "/icon"],
    ]
    for (const entry of readdirSync("app")) {
        for (const [pattern, path] of conventions) {
            if (pattern.test(entry)) routes.add(path)
        }
    }
    return routes
}

// ── Target extraction ────────────────────────────────────────────────

export interface LinkSite {
    file: string
    target: string
}

const TARGET_PATTERNS: RegExp[] = [
    // href="/x" · href='/x' · href={"/x"} · href={'/x'} · href={`/x`}
    /\bhref\s*=\s*"([^"]+)"/g,
    /\bhref\s*=\s*'([^']+)'/g,
    /\bhref\s*=\s*\{\s*"([^"]+)"\s*\}/g,
    /\bhref\s*=\s*\{\s*'([^']+)'\s*\}/g,
    /\bhref\s*=\s*\{\s*`([^`]+)`\s*\}/g,
    // href: "/x" in object literals (nav configs, content catalogs)
    /\bhref\s*:\s*"([^"]+)"/g,
    /\bhref\s*:\s*'([^']+)'/g,
    /\bhref\s*:\s*`([^`]+)`/g,
    // returnTo="/x" and returnTo: "/x" — becomes a billing return path
    /\breturnTo\s*=\s*"([^"]+)"/g,
    /\breturnTo\s*:\s*"([^"]+)"/g,
    /\breturnTo\s*=\s*\{\s*"([^"]+)"\s*\}/g,
    // redirect("/x") — next/navigation
    /\bredirect\s*\(\s*"([^"]+)"/g,
    /\bredirect\s*\(\s*'([^']+)'/g,
    /\bredirect\s*\(\s*`([^`]+)`/g,
    // revalidatePath("/x")
    /\brevalidatePath\s*\(\s*"([^"]+)"/g,
    /\brevalidatePath\s*\(\s*'([^']+)'/g,
    /\brevalidatePath\s*\(\s*`([^`]+)`/g,
    // router.push("/x") / router.replace("/x")
    /\brouter\.(?:push|replace)\s*\(\s*"([^"]+)"/g,
    /\brouter\.(?:push|replace)\s*\(\s*'([^']+)'/g,
    /\brouter\.(?:push|replace)\s*\(\s*`([^`]+)`/g,
]

/**
 * Raw match → checkable path, or null when out of scope.
 * `${expr}` spans collapse to a wildcard marker per segment.
 */
export function normalizeTarget(raw: string): string | null {
    let t = raw.trim()
    // Absolute email links built as `${APP_URL}/path` — check the path half.
    t = t.replace(/^\$\{[^}]*\}(?=\/)/, "")
    if (!t.startsWith("/")) return null
    if (t.startsWith("//")) return null // protocol-relative — external
    t = t.split(/[?#]/)[0] // query and fragment do not address a route
    if (t === "") return null
    if (t.length > 1 && t.endsWith("/")) t = t.slice(0, -1)
    // A template expression makes its whole segment a wildcard.
    t = t
        .split("/")
        .map((seg) => (seg.includes("${") ? "*" : seg))
        .join("/")
    return t
}

/**
 * Comments do not render: a path quoted inside one is prose, not a link
 * (lib/nav/header-path.ts documents an old bug using href="/index" — that
 * documentation must not read as a live target). The `[^:]` guard keeps
 * `https://…` inside string literals intact.
 */
export function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/[^\n]*/g, "$1")
}

export function extractTargets(rawSource: string, file: string): LinkSite[] {
    const source = stripComments(rawSource)
    const out: LinkSite[] = []
    for (const pattern of TARGET_PATTERNS) {
        pattern.lastIndex = 0
        for (const m of source.matchAll(pattern)) {
            const target = normalizeTarget(m[1])
            if (target) out.push({ file, target })
        }
    }
    return out
}

function walkSources(dir: string, out: string[]) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
            if (entry === "node_modules" || entry.startsWith(".")) continue
            walkSources(full, out)
        } else if (/\.(tsx|ts)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
            out.push(full)
        }
    }
}

// ── Matching ─────────────────────────────────────────────────────────

/** Does `target` (may contain `*` segments) resolve to some route pattern? */
export function routeExists(target: string, routes: Set<string>): boolean {
    if (routes.has(target)) return true
    const tSegs = target.split("/").filter(Boolean)
    for (const route of routes) {
        const rSegs = route.split("/").filter(Boolean)
        const catchAll = rSegs.length > 0 && rSegs[rSegs.length - 1].startsWith("[...")
        if (catchAll ? tSegs.length < rSegs.length : tSegs.length !== rSegs.length) continue
        let ok = true
        for (let i = 0; i < rSegs.length; i++) {
            const r = rSegs[i]
            const t = tSegs[i]
            if (r.startsWith("[")) continue // dynamic segment matches anything
            if (t === "*") continue // wildcard target segment matches anything
            if (r !== t) {
                ok = false
                break
            }
        }
        if (ok) return true
    }
    return false
}

export function deadLinks(sites: LinkSite[], routes: Set<string>): LinkSite[] {
    return sites.filter((s) => !routeExists(s.target, routes))
}

/**
 * Pre-existing dead links, found by this guard's FIRST enumeration
 * (2026-08-25, the V2-P2-03 run) and recorded rather than silently fixed,
 * because none belongs to that item's scope. Keyed `file → target`. This
 * list may only SHRINK: each entry is asserted to still occur, so a fixed
 * link must delete its row, and no new dead link can hide behind an old one.
 *
 *   · agent-emails.ts — outbound agent emails link /agent/dashboard and
 *     /agent/onboarding; neither route exists (the agent home is
 *     /dashboard/agent). Agent surfaces are §12.4 out of scope.
 *   · timeline/build.ts — advisor_action history entries link a bare
 *     /collaboration; only /collaboration/threads/[id] exists, and the row
 *     does not carry a thread id for every kind, so the fix needs a
 *     per-kind destination decision.
 *   (PolicyWalletClient's "share with agent" was a fourth entry: it pushed
 *   /wallet/[id]/share, a route that has never existed, so the control 404'd.
 *   FIXED rather than listed — sharing already had a working home in
 *   CollaborationPanel, inside the policy page's `#agent` section, calling the
 *   sharePolicy action. Not a guess: the destination was verified to render the
 *   panel before the retarget.)
 */
const KNOWN_DEAD: ReadonlyArray<readonly [file: string, target: string]> = [
    ["lib/email/templates/agent-emails.ts", "/agent/dashboard"],
    ["lib/email/templates/agent-emails.ts", "/agent/onboarding"],
    ["lib/services/timeline/build.ts", "/collaboration"],
]

const isKnownDead = (s: LinkSite) =>
    KNOWN_DEAD.some(([file, target]) => s.file === file && s.target === target)

// ── The guard ────────────────────────────────────────────────────────

describe("no internal link points at a route that does not exist", () => {
    const routes = appRoutes()
    const files: string[] = []
    for (const root of RUNTIME_ROOTS) walkSources(root, files)
    const sites = files.flatMap((f) => extractTargets(readFileSync(f, "utf-8"), f))

    it("enumerates a real universe (sanity floor, so an empty walk cannot pass vacuously)", () => {
        expect(routes.size).toBeGreaterThan(80)
        expect(routes.has("/dashboard")).toBe(true)
        expect(routes.has("/protection")).toBe(true)
        expect(routes.has("/account/history")).toBe(true)
        expect(files.length).toBeGreaterThan(400)
        expect(sites.length).toBeGreaterThan(200)
    })

    it("every statically-addressed internal target resolves to a route", () => {
        const dead = deadLinks(sites, routes).filter((d) => !isKnownDead(d))
        const report = [...new Set(dead.map((d) => `${d.target}  ←  ${d.file}`))].sort()
        expect(
            report,
            `internal links point at routes that do not exist:\n${report.join("\n")}`
        ).toEqual([])
    })

    it("the known-dead list only shrinks, and carries no stale entry", () => {
        const dead = deadLinks(sites, routes)
        for (const [file, target] of KNOWN_DEAD) {
            expect(
                dead.some((d) => d.file === file && d.target === target),
                `${file} no longer links ${target} — delete its KNOWN_DEAD row`
            ).toBe(true)
        }
    })
})

describe("probe: the machinery goes red on exactly the defect class V2-P2-03 risked", () => {
    const routes = appRoutes()

    it("flags a link to a route this item deleted", () => {
        // /coverage-insights WAS a route until V2-P2-03. If the machinery
        // cannot flag it now, the guard would have been green through the
        // very removal it exists for.
        const dead = deadLinks(
            [
                { file: "probe.tsx", target: "/coverage-insights" },
                { file: "probe.tsx", target: "/timeline" },
                { file: "probe.tsx", target: "/insights/risk-profile" },
                { file: "probe.tsx", target: "/branches" },
                { file: "probe.tsx", target: "/branches/property" },
            ],
            routes
        )
        expect(dead.map((d) => d.target)).toEqual([
            "/coverage-insights",
            "/timeline",
            "/insights/risk-profile",
            "/branches",
            "/branches/property",
        ])
    })

    it("control: the replacement homes resolve", () => {
        expect(
            deadLinks(
                [
                    { file: "probe.tsx", target: "/protection" },
                    { file: "probe.tsx", target: "/protection/property" },
                    { file: "probe.tsx", target: "/account/history" },
                    { file: "probe.tsx", target: "/wallet/abc123" },
                ],
                routes
            )
        ).toEqual([])
    })

    it("the extractor sees every syntax form it claims to parse", () => {
        const synthetic = `
            <Link href="/dead-a">x</Link>
            <a href='/dead-b'>x</a>
            <Link href={"/dead-c"}>x</Link>
            <Link href={\`/dead-d/\${id}\`}>x</Link>
            const nav = [{ href: "/dead-e" }, { href: '/dead-f' }]
            redirect("/dead-g")
            revalidatePath("/dead-h")
            router.push("/dead-i")
            router.replace(\`/dead-j\`)
            <UpgradeTriggerCard returnTo="/dead-k" />
            const mail = \`<a href="\${APP_URL}/dead-l">x</a>\`
        `
        const found = extractTargets(synthetic, "probe.tsx").map((s) => s.target)
        expect(found).toEqual(
            expect.arrayContaining([
                "/dead-a",
                "/dead-b",
                "/dead-c",
                "/dead-d/*",
                "/dead-e",
                "/dead-f",
                "/dead-g",
                "/dead-h",
                "/dead-i",
                "/dead-j",
                "/dead-k",
                "/dead-l",
            ])
        )
        // And every one of them is dead against the real filesystem.
        expect(deadLinks(extractTargets(synthetic, "probe.tsx"), routes)).toHaveLength(12)
    })

    it("out-of-scope targets stay out (no false red from anchors and externals)", () => {
        for (const raw of ["#risk-profile-wizard", "https://example.com/x", "mailto:x@y.z", "tel:+30", "//cdn.example.com/x", "#logout"]) {
            expect(normalizeTarget(raw), raw).toBeNull()
        }
        expect(normalizeTarget("/protection#life-events")).toBe("/protection")
        expect(normalizeTarget("/protection?lens=risk")).toBe("/protection")
    })
})
