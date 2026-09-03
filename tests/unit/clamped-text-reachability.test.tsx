/**
 * CLAMP REACHABILITY — V2-P3-01 (§6.11, reframed by D-030).
 *
 * THE INVARIANT: a clamped element's full text must be REACHABLE — rendered in
 * full somewhere the reader can get to from the clamp (a linked detail page, an
 * expand control, a modal, the artifact itself) — or the clamp is registered
 * here as acceptable, with a reason. The invariant is reachability, not the
 * absence of clamping: a name in a table row that links to a page showing the
 * name in full is fine; a tagline whose second half exists nowhere in the
 * product is the defect (ledger row B-03, the case that created this guard).
 *
 * THE UNIVERSE (D-005 — a guard states what it walks and what it claims):
 * every .tsx file under app/ and components/, enumerated recursively from the
 * filesystem at test time, whose COMMENT-STRIPPED source contains a Tailwind
 * clamp token (`truncate`, `line-clamp-N`). Excluded, by derivation rather
 * than by list:
 *   - app files whose route resolves to owner "agent" or "admin" through
 *     resolveRouteOwner (proxy.ts) — §12.4 puts agent/admin surfaces out of
 *     this transformation's scope, and deriving from the proxy keeps the two
 *     from drifting;
 *   - components/agent/** and components/admin/** by path.
 * Components that live in shared directories but mount only on agent routes
 * (TasksClient, PolicyReviewScreen) stay ENUMERATED with an "agent-surface"
 * disposition — a mount can move to a B2C surface without the file moving,
 * and the register entry is where that gets noticed.
 *
 * WHAT THE REGISTER IS AND IS NOT: every enumerated file carries exactly one
 * entry with its clamp-token counts pinned. A new clamp site — a new file, or
 * one more `truncate` in a registered file — goes red until the author answers
 * the reachability question in the entry. Dispositions:
 *
 *   "reachable"           — the full text renders somewhere the clamp links or
 *                           expands to; the note names where.
 *   "no-information-loss" — the clamped text is not information a reader can
 *                           lose: fictional demo set-dressing, fixed short
 *                           vocabulary, a deliberately concealed paywall
 *                           teaser, the user's own just-picked filename.
 *   "agent-surface"       — mounts only on agent-owned routes (§12.4).
 *   "debt"                — real information, unreachable, accepted with a
 *                           reason. THIS LIST MAY ONLY SHRINK (ratcheted
 *                           below): fixing one deletes its entry; adding one
 *                           is a failing test, not an allowlist edit.
 *
 * RENDERED-OUTPUT ENFORCEMENT: dispositions are prose, and prose can rot (a
 * comment in NotificationsClient claims a detail page that does not exist).
 * So the entry this guard was built for — B-03, the branch taglines — is
 * enforced on RENDERED DOM, not on file contents: ProductBranchCard must
 * still clamp the tagline (reachability is load-bearing only while the clamp
 * exists), the card must link to /protection/[branch], and BranchDetail for
 * EVERY top-level branch must render that branch's full tagline with no clamp
 * class on the element or any ancestor.
 *
 * PROBES (a guard without a committed red-probe is not a guard):
 *   - clamp-enumeration-probe.tsx.txt — the extractor counts class tokens,
 *     ignores commented-out clamps and non-token words;
 *   - tagline-unreachable-branch-header.html.txt — BranchDetail's header
 *     markup AS RENDERED BEFORE THE FIX (captured 2026-08-25): the detector
 *     must report the tagline ABSENT;
 *   - the clamped-only case is probed against ProductBranchCard's own live
 *     render: full text present but only inside a line-clamp element must
 *     report "clamped", never "reachable".
 */
import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import React from "react"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// proxy.ts transitively imports lib/rate-limit → lib/env, whose zod schema
// wants production secrets this test never touches. Same stub the ledger
// guard uses; `resolveRouteOwner` itself is pure.
vi.mock("@/lib/rate-limit", () => ({
    rateLimit: vi.fn(async () => ({ success: true })),
}))

// BranchDetail is an async RSC doing DB reads; the reachability assertion
// needs its rendered DOM, not its data. Empty wallet, no relationship, free
// tier, no recommendations — the header (where the tagline must render)
// depends on none of it.
vi.mock("@/lib/auth-helpers", () => ({
    getAuthenticatedUser: vi.fn(async () => ({
        dbUser: { id: "guard-user", preferredLanguage: "el" },
    })),
}))
vi.mock("@/lib/db", () => ({
    db: {
        policy: { findMany: vi.fn(async () => []) },
        customerRelationship: { findFirst: vi.fn(async () => null) },
    },
}))
vi.mock("@/lib/subscription-entitlements", () => ({
    resolveUserEntitlements: vi.fn(async () => ({ tier: "free" })),
}))
vi.mock("@/lib/services/gap-engine", () => ({
    getEnrichedRecommendations: vi.fn(async () => []),
}))

import { resolveRouteOwner } from "@/proxy"
import { INSURANCE_BRANCHES } from "@/lib/insurance/taxonomy"
import { getBranchContent } from "@/lib/insurance/content"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { ProductBranchCard } from "@/components/branches/ProductBranchCard"
import { BranchDetail } from "@/components/branches/BranchDetail"

// ── The clamp-token extractor (shared by universe walk and probe) ────

const CLAMP_TOKEN = /\b(?:truncate|line-clamp-\d+)\b/g

// The authorization guard once matched a mention inside a comment —
// enumerate on comment-stripped source only.
const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1")

function clampCounts(source: string): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const token of stripComments(source).match(CLAMP_TOKEN) ?? []) {
        counts[token] = (counts[token] ?? 0) + 1
    }
    return counts
}

// ── The universe ─────────────────────────────────────────────────────

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) return walk(full)
        return full.endsWith(".tsx") ? [full] : []
    })
}

/** `app/(group)/a/[id]/File.tsx` → `/a/x` — the route resolveRouteOwner sees. */
function routeOfAppFile(file: string): string {
    const segments = file
        .split("/")
        .slice(1, -1) // drop "app" and the filename
        .filter((seg) => !seg.startsWith("("))
        .map((seg) => (seg.startsWith("[") ? "x" : seg))
    return "/" + segments.join("/")
}

function inScope(file: string): boolean {
    if (/^components\/(agent|admin)\//.test(file)) return false
    if (file.startsWith("app/")) {
        const owner = resolveRouteOwner(routeOfAppFile(file))
        if (owner === "agent" || owner === "admin") return false
    }
    return true
}

function enumerateClampFiles(): Map<string, Record<string, number>> {
    const found = new Map<string, Record<string, number>>()
    for (const file of [...walk("app"), ...walk("components")].sort()) {
        if (!inScope(file)) continue
        const counts = clampCounts(readFileSync(file, "utf-8"))
        if (Object.keys(counts).length > 0) found.set(file, counts)
    }
    return found
}

// ── The register ─────────────────────────────────────────────────────

type Disposition = "reachable" | "no-information-loss" | "agent-surface" | "debt"

interface RegisterEntry {
    file: string
    clamps: Record<string, number>
    kind: Disposition
    /** Where the full text renders (reachable), or why the clamp is acceptable. */
    note: string
}

const REGISTER: RegisterEntry[] = [
    {
        file: "app/(protected)/agent/AgentClient.tsx",
        clamps: { truncate: 3 },
        kind: "debt",
        note:
            "Three sites: the no-agent preview row is fictional demo content, and the " +
            "shared-policy identity row links to /wallet/[id] which renders identity in " +
            "full — both fine. The h1 `agent.name` is the DEBT: it truncates at the " +
            "customer's canonical view of their agent, and no fuller render exists. " +
            "Clips only at pathological name lengths (~25+ chars at 320px).",
    },
    {
        file: "app/(protected)/help/HelpClient.tsx",
        clamps: { "line-clamp-2": 1 },
        kind: "reachable",
        note: "article.subtitle clamps on the index card; /help/article/[slug] renders the subtitle in full.",
    },
    {
        file: "app/(protected)/wallet/[id]/PolicyAnalysisTabs.tsx",
        clamps: { truncate: 1 },
        kind: "reachable",
        note:
            "Extracted insurer name truncates in the verification grid; the same policy " +
            "page's header renders the insurer through policy-identity unclamped.",
    },
    {
        file: "app/(public)/guides/GuidesIndexClient.tsx",
        clamps: { "line-clamp-2": 1 },
        kind: "reachable",
        note: "guide.summary clamps on the index; /guides/[slug] (GuideArticleClient) renders the summary in full.",
    },
    {
        file: "app/(public)/lexiko/GlossaryIndexClient.tsx",
        clamps: { "line-clamp-3": 1 },
        kind: "reachable",
        note: "entry.shortDefinition clamps on the index; /lexiko/[term] (GlossaryTermClient) renders it in full.",
    },
    {
        file: "app/(public)/product/ProductSections.tsx",
        clamps: { truncate: 1 },
        kind: "no-information-loss",
        note: "Fictional wallet mock on the marketing page — demo set-dressing, not user data.",
    },
    {
        file: "components/account/Achievements.tsx",
        clamps: { truncate: 2 },
        kind: "debt",
        note:
            "Achievement title AND one-line description truncate on /account; achievements " +
            "render nowhere else and there is no expand — a long description's tail is " +
            "unreachable. Candidates: let the description wrap, or expand on tap.",
    },
    {
        file: "components/branches/BranchCoverageMap.tsx",
        clamps: { truncate: 1 },
        kind: "reachable",
        note:
            "sm:truncate — wraps at mobile widths, truncates only ≥640px; each row links " +
            "to /protection/[branch] whose h1 is the full branch title.",
    },
    {
        file: "components/branches/BranchDetail.tsx",
        clamps: { truncate: 3, "line-clamp-2": 1 },
        kind: "reachable",
        note:
            "Policy-identity rows and renewal rows link to /wallet/[id] (full identity); " +
            "perk descriptions clamp-2 inside a Link to /wallet/[id]#coverage where the " +
            "perk renders in full.",
    },
    {
        file: "components/branches/ProductBranchCard.tsx",
        clamps: { "line-clamp-2": 1 },
        kind: "reachable",
        note:
            "B-03 — the entry this guard was built for. The tagline clamps to two lines " +
            "on the /protection card; the card links to /protection/[branch], whose " +
            "header renders the same tagline in full. Enforced on rendered DOM below, " +
            "not by this sentence.",
    },
    {
        file: "components/collaboration/AgentCard.tsx",
        clamps: { truncate: 1 },
        kind: "debt",
        note:
            "Agent name h3 truncates; the canonical surface (/agent h1) truncates too — " +
            "same debt as AgentClient. No fuller render of the name exists.",
    },
    {
        file: "components/collaboration/AgentInbox.tsx",
        clamps: { truncate: 2 },
        kind: "reachable",
        note:
            "Thread subject + last-message preview truncate on the list row; opening the " +
            "thread (/collaboration/threads/[id]) renders the full subject and messages.",
    },
    {
        file: "components/collaboration/CollaborationTimeline.tsx",
        clamps: { truncate: 1 },
        kind: "reachable",
        note: "thread.subject truncates in the timeline; the thread page renders it in full.",
    },
    {
        file: "components/collaboration/DocumentRequestFlow.tsx",
        clamps: { truncate: 1 },
        kind: "no-information-loss",
        note: "docName is an authored document-type label (fixed short vocabulary) or the raw type key.",
    },
    {
        file: "components/dashboard/home/AttentionList.tsx",
        clamps: { "line-clamp-2": 1 },
        kind: "reachable",
        note:
            "item.reason is summary prose COMPOSED for this list; the row links to " +
            "/protection where the underlying finding — the information the clamp cuts — " +
            "renders in full through its own surfaces. The sentence itself has no other " +
            "render, by design.",
    },
    {
        file: "components/dashboard/home/PortfolioSummaryCard.tsx",
        clamps: { truncate: 2 },
        kind: "reachable",
        note:
            "Document tile (fileName + insurer) links to /wallet/[policyId]: insurer " +
            "renders in full there, and the document itself is openable — the canonical " +
            "artifact carries its own name.",
    },
    {
        file: "components/dashboard/home/RenewalsTimelineCard.tsx",
        clamps: { "line-clamp-2": 1 },
        kind: "reachable",
        note: "Policy identity clamps to two lines; the row links to /wallet/[id]#dates (full identity).",
    },
    {
        file: "components/landing/AgentWidgets.tsx",
        clamps: { truncate: 4 },
        kind: "no-information-loss",
        note: "Fictional agent-dashboard mock on the landing page — demo set-dressing.",
    },
    {
        file: "components/landing/PolicyWalletWidget.tsx",
        clamps: { truncate: 3 },
        kind: "no-information-loss",
        note: "Fictional wallet mock on the landing page — demo set-dressing.",
    },
    {
        file: "components/landing/SolutionsDropdown.tsx",
        clamps: { truncate: 1 },
        kind: "reachable",
        note: "Branch label in the nav dropdown; the link target renders the full branch title.",
    },
    {
        file: "components/monetization/PremiumInsightCards.tsx",
        clamps: { "line-clamp-2": 1 },
        kind: "reachable",
        note: "copy.body clamps on the teaser card; tapping opens UpgradeModal, which renders the same copy.body unclamped.",
    },
    // NotificationBell.tsx and NotificationCard.tsx were DELETED in the Phase 5
    // notifications rebuild (both unmounted dead code — zero importers,
    // verified by grep and by tsc). Their two debt entries left with them; the
    // debt list shrinking is the ratchet working as designed.
    {
        file: "components/notifications/NotificationsClient.tsx",
        clamps: { "line-clamp-3": 1 },
        kind: "reachable",
        note:
            "Body clamps to three lines, released in place by ClampedMessage's " +
            "«Εμφάνιση ολόκληρου μηνύματος» toggle. The toggle renders only when the " +
            "text is MEASURED as clipped (scrollHeight > clientHeight after layout), " +
            "not guessed from a character count — a «show more» that reveals nothing " +
            "is its own small lie. This entry was `debt`: the in-file comment claimed " +
            "«the item's own page shows the rest» and no such page exists — " +
            "/notifications is a single page.tsx with nothing linking to a per-item " +
            "route. That comment is gone with the defect. Fixing this also makes the " +
            "bell's 2-line clamp reachable, since the bell links here.",
    },
    {
        file: "components/risk-dna/RiskDnaPanel.tsx",
        clamps: { truncate: 1 },
        kind: "no-information-loss",
        note: "Dimension labels are authored fixed vocabulary sized for the row; the row expands to the dimension's detail.",
    },
    {
        file: "components/shell/CommandSearch.tsx",
        clamps: { truncate: 2 },
        kind: "reachable",
        note:
            "Search result rows truncate the insurer line and the branch · number line; " +
            "each row links to /wallet/[id], whose head renders insurer, branch and number in full.",
    },
    {
        file: "components/shell/RoleSwitcher.tsx",
        clamps: { truncate: 1 },
        kind: "no-information-loss",
        note: "Fixed two-word role vocabulary (Πελάτης / Ασφαλιστής) — cannot meaningfully clip; safety net only.",
    },
    {
        file: "components/shell/UserMenu.tsx",
        clamps: { truncate: 2 },
        kind: "reachable",
        note: "The user's own name and email; /account/profile renders both in full.",
    },
    {
        file: "components/tasks/TasksClient.tsx",
        clamps: { truncate: 2 },
        kind: "agent-surface",
        note: "Mounts only at /tasks, agent-owned per ROUTE_OWNERSHIP — out of §12.4 change scope.",
    },
    {
        file: "components/ui/EmptyState.tsx",
        clamps: { truncate: 4 },
        kind: "no-information-loss",
        note: "Fictional example rows inside empty-state previews — demo set-dressing.",
    },
    {
        file: "components/wallet/AddPolicyClient.tsx",
        clamps: { truncate: 2 },
        kind: "no-information-loss",
        note: "file.name of the file the user just picked — transient upload UI; the artifact itself is the canonical copy.",
    },
    {
        file: "components/wallet/BatchUploadModal.tsx",
        clamps: { truncate: 1 },
        kind: "no-information-loss",
        note: "file.name in the bulk-upload queue — same as AddPolicyClient.",
    },
    {
        file: "components/wallet/CollaborationPanel.tsx",
        clamps: { truncate: 2 },
        kind: "debt",
        note:
            "Grantee name and email truncate in the sharing list; a long email has no " +
            "fuller render. Low severity — the customer created the share — but " +
            "unreachable is unreachable.",
    },
    {
        file: "components/wallet/DocumentPreview.tsx",
        clamps: { truncate: 1 },
        kind: "reachable",
        note: "fileName in the preview header; the document itself is open below — the canonical artifact.",
    },
    {
        file: "components/wallet/PolicyCard.tsx",
        clamps: { truncate: 1 },
        kind: "reachable",
        note: "Policy identity truncates on the card; the card opens /wallet/[id] (full identity).",
    },
    {
        file: "components/wallet/PolicyComparison.tsx",
        clamps: { truncate: 2 },
        kind: "reachable",
        note:
            "Insurer name and the row identifier truncate in the comparison picker; the policy page " +
            "renders full identity. The identifier was ADDED 2026-08-28 — the picker previously showed " +
            "only insurer + policy number, so choosing between two motor policies meant choosing " +
            "between two identical cards. A clamped plate or insured name is still more than nothing, " +
            "and the card opens /wallet/[id].",
    },
    {
        file: "components/wallet/PolicyReviewScreen.tsx",
        clamps: { truncate: 1 },
        kind: "agent-surface",
        note: "Mounts only at /wallet/[id]/review, agent-owned per ROUTE_OWNERSHIP — out of §12.4 change scope.",
    },
    {
        file: "components/wallet/PolicyTable.tsx",
        clamps: { truncate: 2 },
        kind: "reachable",
        note: "Identity cells truncate; each row links to /wallet/[id] (full identity).",
    },
    {
        file: "components/wallet/gap-report/LockedGapCard.tsx",
        clamps: { "line-clamp-2": 1 },
        kind: "no-information-loss",
        note:
            "The explanation is deliberately blurred (blur-[6px], aria-hidden) — " +
            "concealment is the feature, sr-only lockedHint says so, and unlocking " +
            "renders the full explanation.",
    },
    {
        file: "components/wallet/policy-detail/DocumentsCard.tsx",
        clamps: { truncate: 1 },
        kind: "reachable",
        note: "fileName truncates on the row; the row's actions open/download the document itself.",
    },
]

/**
 * THE RATCHET — files whose clamps cut real information with no path to it.
 * This list may ONLY SHRINK. Fixing a file means deleting it here AND flipping
 * its REGISTER entry; adding a file here is not an allowed edit — make the
 * text reachable instead. (Named as V2-P3-01 findings, 2026-08-25.)
 */
const DEBT_BASELINE = [
    "app/(protected)/agent/AgentClient.tsx",
    "components/account/Achievements.tsx",
    "components/collaboration/AgentCard.tsx",
    "components/wallet/CollaborationPanel.tsx",
]

// ── 1. Completeness: every clamp site is registered, exactly ─────────

describe("clamp reachability — the register matches the filesystem", () => {
    const found = enumerateClampFiles()

    it("every enumerated clamp file has exactly one register entry with matching counts", () => {
        const registered = new Map(REGISTER.map((e) => [e.file, e]))
        expect(
            REGISTER.length,
            "duplicate file in REGISTER — one file, one entry"
        ).toBe(registered.size)

        const missing: string[] = []
        const mismatched: string[] = []
        for (const [file, counts] of found) {
            const entry = registered.get(file)
            if (!entry) {
                missing.push(`${file} ${JSON.stringify(counts)}`)
                continue
            }
            if (JSON.stringify(entry.clamps) !== JSON.stringify(counts)) {
                mismatched.push(
                    `${file}: register says ${JSON.stringify(entry.clamps)}, source has ${JSON.stringify(counts)}`
                )
            }
        }
        expect(
            missing,
            "unregistered clamp site(s) — answer the reachability question: where does the full text render? Add an entry with a disposition and a note."
        ).toEqual([])
        expect(
            mismatched,
            "clamp count changed — a site was added or removed; re-answer reachability for this file and update its entry."
        ).toEqual([])
    })

    it("no stale register entries — the list shrinks when clamps are removed", () => {
        const stale = REGISTER.filter((e) => !found.has(e.file)).map((e) => e.file)
        expect(
            stale,
            "entry for a file with no clamps (or out of scope) — delete it; the register may only describe what exists."
        ).toEqual([])
    })

    it("the debt list may only shrink", () => {
        const debtNow = REGISTER.filter((e) => e.kind === "debt").map((e) => e.file)
        const added = debtNow.filter((f) => !DEBT_BASELINE.includes(f))
        expect(
            added,
            "a NEW unreachable clamp was registered as debt — that is the defect this guard exists to block. Make the text reachable instead."
        ).toEqual([])
        // Shrinking is legal and expected: a fixed file leaves both lists.
        for (const f of debtNow) expect(DEBT_BASELINE).toContain(f)
    })

    it("every entry carries a real reason, not a placeholder", () => {
        for (const entry of REGISTER) {
            expect(entry.note.length, `${entry.file}: note too thin to be a reason`).toBeGreaterThan(40)
        }
    })
})

// ── 2. The rendered-output detector (shared with the probes) ─────────

const CLAMP_CLASS = /\b(?:truncate|line-clamp-\d+)\b/

/**
 * Where does `fullText` stand in this DOM: absent, present only under a clamp,
 * or present with no clamp on the element or any ancestor?
 * Whitespace-normalised on both sides — JSX renders collapse runs.
 */
function fullTextReachability(root: Element, fullText: string): "absent" | "clamped" | "reachable" {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim()
    const needle = norm(fullText)
    const holders = [root, ...Array.from(root.querySelectorAll("*"))].filter((el) => {
        if (!norm(el.textContent ?? "").includes(needle)) return false
        // deepest holders only — an ancestor containing it via a child is noise
        return !Array.from(el.children).some((c) => norm(c.textContent ?? "").includes(needle))
    })
    if (holders.length === 0) return "absent"
    const unclampedHolder = holders.some((el) => {
        for (let node: Element | null = el; node; node = node.parentElement) {
            if (CLAMP_CLASS.test(node.getAttribute("class") ?? "")) return false
            if (node === root) break
        }
        return true
    })
    return unclampedHolder ? "reachable" : "clamped"
}

// ── 3. B-03 enforced on rendered DOM ─────────────────────────────────

const TOP_LEVEL_BRANCHES = INSURANCE_BRANCHES.filter((b) => !b.parentId)

describe("B-03 — every branch tagline the card clamps is rendered in full on /protection/[branch]", () => {
    it("the card still clamps the tagline and links to the branch page (reachability stays load-bearing)", () => {
        const branch = TOP_LEVEL_BRANCHES.find((b) => b.id === "motor")!
        const tagline = getBranchContent(branch.id).tagline.el
        const { container } = render(
            <ProductBranchCard
                icon={getBranchIcon(branch.id)}
                href={`/protection/${branch.id}`}
                title="Όχημα"
                tagline={tagline}
                state="covered"
                stateLabel="Προστατευμένο"
                policyCount={1}
                policyCountLabel="1 ασφαλιστήριο"
                branchId={branch.id}
            />
        )
        // The full text exists here ONLY under the clamp — the detector must
        // say "clamped", which is the live half of the clamped-only probe.
        expect(fullTextReachability(container, tagline)).toBe("clamped")
        expect(container.querySelector("a")?.getAttribute("href")).toBe(`/protection/${branch.id}`)
    })

    for (const branch of TOP_LEVEL_BRANCHES) {
        it(`/protection/${branch.id} renders the full tagline, unclamped`, async () => {
            const tagline = getBranchContent(branch.id).tagline.el
            expect(tagline.length, `${branch.id}: content must carry a tagline`).toBeGreaterThan(0)
            const { container } = render(await BranchDetail({ branchParam: branch.id }))
            expect(
                fullTextReachability(container, tagline),
                `${branch.id}: the tagline the /protection card clamps must be readable in full here — it renders nowhere else (D-030)`
            ).toBe("reachable")
        })
    }
})

// ── 4. Probes — proven red on the exact defect ───────────────────────

describe("probes — the guard turns red on what it was built for", () => {
    it("enumerator: counts class tokens, ignores comments and non-tokens", () => {
        const probe = readFileSync("tests/fixtures/guard-probes/clamp-enumeration-probe.tsx.txt", "utf-8")
        expect(clampCounts(probe)).toEqual({ truncate: 2, "line-clamp-2": 1 })
    })

    it("detector: the PRE-FIX branch header (committed markup) reports the tagline ABSENT", () => {
        const markup = readFileSync(
            "tests/fixtures/guard-probes/tagline-unreachable-branch-header.html.txt",
            "utf-8"
        )
        const host = document.createElement("div")
        host.innerHTML = markup
        const tagline = getBranchContent("motor").tagline.el
        expect(
            fullTextReachability(host, tagline),
            "the pre-fix header did not render the tagline — if this reports anything but 'absent', the detector has gone blind to the original defect"
        ).toBe("absent")
    })

    it("detector: text present only under a clamp is 'clamped', never 'reachable'", () => {
        const host = document.createElement("div")
        host.innerHTML =
            '<div><p class="mt-1 line-clamp-2 text-xs">Οι online συναλλαγές σας έχουν κινδύνους — δείτε τι από αυτά καλύπτει το συμβόλαιό σας.</p></div>'
        expect(
            fullTextReachability(host, "Οι online συναλλαγές σας έχουν κινδύνους — δείτε τι από αυτά καλύπτει το συμβόλαιό σας.")
        ).toBe("clamped")
    })
})
