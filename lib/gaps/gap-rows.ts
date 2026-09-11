import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { LIVE_GAP_STATUSES } from "@/lib/gaps/gap-instance-writer"
import { compareFindingSlugs, isClassified, provenanceCitation, provenanceOf, type GapProvenance, type ProvenanceCitation } from "@/lib/gaps/provenance"
import { evidenceVerdictFor, isPublishableVerdict, type EvidenceVerdict } from "@/lib/gaps/evidence-floor"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { resolveGapConcept } from "@/lib/wallet/gap-report"

/**
 * THE ONE ACCESSOR FOR GAP ROWS (PW-TRANSPARENCY-02, remediation R3).
 *
 * Every read of `gap_instances` outside this module and the writer is a defect
 * (guard: tests/unit/gap-rows-single-accessor.test.ts). The accessor applies
 * two rules no caller may re-decide:
 *
 *   B0 — only LIVE rows: `supersededAt: null` and a live status. A later run
 *        supersedes a policy's rows; readers never see the superseded ones.
 *   B3 — provenance: every row comes back tagged with its provenance class,
 *        and a `classified` read drops `under_review` rows, because a finding
 *        no human has classified is counted in no summary and reaches no
 *        email, notification or report. A `disclosed` read returns every live
 *        row for a findings list that labels each row's class.
 *   W2  — evidence: every row also comes back tagged with an `evidence`
 *        verdict (lib/gaps/evidence-floor.ts) from what its run recorded the
 *        document was evidence of; a `classified` read keeps only `gap` rows —
 *        a finding the document did not confirm gets the same treatment as
 *        one nobody classified: disclosed and labelled, counted nowhere.
 *
 * V2 found six leaks that were each a path where gap rows travelled under
 * another name (a recommendation, a stored score count, a KPI). Routing the
 * read here, rather than patching each render, is the whole fix.
 *
 * `readGapRow` (one row by id, for a write or an authorisation check) and
 * `readGapHistory` / `countGapHistory` (DSR export, admin totals,
 * achievements over resolved rows) deliberately bypass the scope rules; they
 * are the only such doors and are named so a reviewer can find every use.
 */
export type GapScope = "classified" | "disclosed"

type Client = { gapInstance: typeof db.gapInstance } | Prisma.TransactionClient

export interface ReadLiveGapRowsArgs {
    client?: Client
    where?: Prisma.GapInstanceWhereInput
    select?: Prisma.GapInstanceSelect
    include?: Prisma.GapInstanceInclude
    orderBy?: Prisma.GapInstanceFindManyArgs["orderBy"]
    take?: number
    /** `classified` for any count, summary or outbound use; `disclosed` for a findings list that labels each row. */
    scope: GapScope
    /** Narrow the live statuses (e.g. open + detected only). Cannot widen past LIVE_GAP_STATUSES. */
    statuses?: readonly string[]
}

/** The Prisma payload the caller's select/include produces, with the slug the accessor always adds. */
type ShapeOf<A> = A extends { select: infer S extends Prisma.GapInstanceSelect }
    ? { select: S }
    : A extends { include: infer I extends Prisma.GapInstanceInclude }
      ? { include: I }
      : { include: { definition: { select: { slug: true } } } }
type HistoryShapeOf<A> = A extends { select: infer S extends Prisma.GapInstanceSelect }
    ? { select: S }
    : A extends { include: infer I extends Prisma.GapInstanceInclude }
      ? { include: I }
      : Record<string, never>
export type LiveGapRow<A = ReadLiveGapRowsArgs> = Prisma.GapInstanceGetPayload<ShapeOf<A>> & {
    provenance: GapProvenance
    /** W2-02: `gap` meets the definition's evidence floor; `review` / `not_recorded` are disclosed only. */
    evidence: EvidenceVerdict
    definition: { slug: string }
}

function liveWhere(where: Prisma.GapInstanceWhereInput | undefined, statuses: readonly string[] | undefined): Prisma.GapInstanceWhereInput {
    const allowed = (statuses ?? LIVE_GAP_STATUSES).filter((s) => (LIVE_GAP_STATUSES as readonly string[]).includes(s))
    return { AND: [where ?? {}, { supersededAt: null, status: { in: allowed } }] }
}

/**
 * The definition slug must travel with every row: it is what provenance is
 * decided from. So must `ruleInputs` (W2-02): the evidence verdict is decided
 * from what the run recorded there.
 */
function withSlug(args: Pick<ReadLiveGapRowsArgs, "select" | "include">): Pick<Prisma.GapInstanceFindManyArgs, "select" | "include"> {
    if (args.select) {
        const def = args.select.definition
        const defSelect = def && typeof def === "object" && "select" in def && def.select ? def.select : {}
        return { select: { ...args.select, ruleInputs: true, definition: { select: { slug: true, ...defSelect } } } }
    }
    if (args.include) {
        const def = args.include.definition
        if (def === true) return { include: args.include }
        const defSelect = def && typeof def === "object" && "select" in def && def.select ? def.select : {}
        return { include: { ...args.include, definition: { select: { slug: true, ...defSelect } } } }
    }
    return { include: { definition: { select: { slug: true } } } }
}

function tag<T extends { definition?: { slug?: string | null } | null; ruleInputs?: unknown }>(
    row: T
): T & { provenance: GapProvenance; evidence: EvidenceVerdict } {
    const slug = row.definition?.slug ?? null
    return { ...row, provenance: provenanceOf(slug), evidence: evidenceVerdictFor(slug, row.ruleInputs) }
}

export async function readLiveGapRows<const A extends ReadLiveGapRowsArgs>(args: A): Promise<LiveGapRow<A>[]> {
    const client = (args.client ?? db) as Client
    const rows = (await client.gapInstance.findMany({
        where: liveWhere(args.where, args.statuses),
        ...withSlug(args),
        ...(args.orderBy ? { orderBy: args.orderBy } : {}),
        ...(args.take !== undefined ? { take: args.take } : {}),
    } as any)) as unknown as Array<{ definition: { slug: string } }>
    const tagged = rows.map(tag) as unknown as LiveGapRow<A>[]
    // F1: deterministic order — provenance class, catalogue order, then detection
    // time and id — unless the caller asked for another axis (a recency list).
    if (!args.orderBy) {
        const time = (r: any) => (r.detectedAt instanceof Date ? r.detectedAt.getTime() : typeof r.detectedAt === "string" ? Date.parse(r.detectedAt) || 0 : 0)
        tagged.sort((a: any, b: any) => compareFindingSlugs(a.definition?.slug, b.definition?.slug) || time(a) - time(b) || String(a.id ?? "").localeCompare(String(b.id ?? "")))
    }
    return args.scope === "classified"
        ? tagged.filter((r) => isClassified(r.provenance) && isPublishableVerdict(r.evidence))
        : tagged
}

/** A count over live rows under a scope. Provenance is static, so it is decided in memory, never in SQL. */
export async function countLiveGapRows(args: Omit<ReadLiveGapRowsArgs, "select" | "include" | "orderBy" | "take">): Promise<number> {
    const rows = await readLiveGapRows({ ...args, select: { id: true } })
    return rows.length
}

/** Per-policy counts over live rows under a scope — the replacement for a groupBy. */
export async function countLiveGapRowsByPolicy(args: Omit<ReadLiveGapRowsArgs, "select" | "include" | "orderBy" | "take">): Promise<Map<string, number>> {
    const rows = await readLiveGapRows({ ...args, select: { id: true, policyId: true } })
    const out = new Map<string, number>()
    for (const r of rows) if (r.policyId) out.set(r.policyId, (out.get(r.policyId) ?? 0) + 1)
    return out
}

/**
 * ONE row, named by the caller (an id, or an id plus an ownership condition),
 * for a write or an authorisation check. No scope: the caller already holds a
 * reference to this exact row. Provenance is attached for callers that render.
 */
export interface ReadGapRowArgs {
    client?: Client
    where: Prisma.GapInstanceWhereInput
    select?: Prisma.GapInstanceSelect
    include?: Prisma.GapInstanceInclude
}
export async function readGapRow<const A extends ReadGapRowArgs>(args: A): Promise<(Prisma.GapInstanceGetPayload<ShapeOf<A>> & { provenance: GapProvenance; definition: { slug: string } }) | null> {
    const client = (args.client ?? db) as Client
    const row = (await client.gapInstance.findFirst({ where: args.where, ...withSlug(args) } as any)) as { definition?: { slug?: string | null } | null } | null
    return row ? (tag(row) as unknown as Prisma.GapInstanceGetPayload<ShapeOf<A>> & { provenance: GapProvenance; definition: { slug: string } }) : null
}

/**
 * HISTORY: every row, superseded and closed included, no provenance filter.
 * For the DSR export, admin totals and achievements over resolved rows only.
 */
export interface ReadGapHistoryArgs {
    client?: Client
    where?: Prisma.GapInstanceWhereInput
    select?: Prisma.GapInstanceSelect
    include?: Prisma.GapInstanceInclude
    orderBy?: Prisma.GapInstanceFindManyArgs["orderBy"]
    take?: number
}
export async function readGapHistory<const A extends ReadGapHistoryArgs>(args: A): Promise<Prisma.GapInstanceGetPayload<HistoryShapeOf<A>>[]> {
    const client = (args.client ?? db) as Client
    return (await client.gapInstance.findMany({
        ...(args.where ? { where: args.where } : {}),
        ...(args.select ? { select: args.select } : {}),
        ...(args.include ? { include: args.include } : {}),
        ...(args.orderBy ? { orderBy: args.orderBy } : {}),
        ...(args.take !== undefined ? { take: args.take } : {}),
    } as any)) as Prisma.GapInstanceGetPayload<HistoryShapeOf<A>>[]
}

/**
 * A RECOMMENDATION derived from a gap finding is that finding under another
 * name (V2's first leak). Its provenance is the gap's: by the linked gap
 * instance's slug when the row carries one, or — for rows written before the
 * link existed — by the concept in its rule id (`policy_gap:<lob>:<concept>`),
 * resolved to the authored slugs that share the concept. A concept nobody
 * authored is the conservative side: under review. Recommendations that do not
 * derive from a gap (profile and risk rules) are not classified by this at all.
 */
const POLICY_GAP_PREFIX = "policy_gap:"
export interface RecommendationLike {
    ruleId?: string | null
    gapInstanceId?: string | null
    gapInstance?: { definition?: { slug?: string | null } | null } | null
}
export function recommendationIsClassified(rec: RecommendationLike): boolean {
    const slug = rec.gapInstance?.definition?.slug
    if (slug) return isClassified(provenanceOf(slug))
    if (!rec.ruleId || !rec.ruleId.startsWith(POLICY_GAP_PREFIX)) return true
    const parts = rec.ruleId.slice(POLICY_GAP_PREFIX.length).split(":")
    const concept = resolveGapConcept(parts[parts.length - 1] || "")
    const siblings = AUTHORED_GAP_DEFINITIONS.filter((d) => resolveGapConcept(d.slug) === concept)
    return siblings.length > 0 && siblings.every((d) => isClassified(provenanceOf(d.slug)))
}
/** Every reader of recommendation rows that counts, lists or feeds them goes through this. */
/**
 * F5: the citation behind the requirement a recommendation derives from — by
 * the linked gap's slug, else by the rule-id concept when every authored
 * sibling of that concept rests on the same citation. Null for a
 * recommendation that is not gap-derived, or whose requirement is under review.
 */
export function recommendationCitation(rec: RecommendationLike): ProvenanceCitation | null {
    const slug = rec.gapInstance?.definition?.slug
    if (slug) return provenanceCitation(slug)
    if (!rec.ruleId || !rec.ruleId.startsWith(POLICY_GAP_PREFIX)) return null
    const parts = rec.ruleId.slice(POLICY_GAP_PREFIX.length).split(":")
    const concept = resolveGapConcept(parts[parts.length - 1] || "")
    const citations = AUTHORED_GAP_DEFINITIONS.filter((d) => resolveGapConcept(d.slug) === concept).map((d) => provenanceCitation(d.slug))
    const first = citations[0]
    return first && citations.every((c) => c !== null && c.el === first.el) ? first : null
}

export function classifiedRecommendations<T extends RecommendationLike>(recs: readonly T[]): T[] {
    return recs.filter(recommendationIsClassified)
}

export async function countGapHistory(args: { client?: Client; where?: Prisma.GapInstanceWhereInput } = {}): Promise<number> {
    const client = (args.client ?? db) as Client
    return client.gapInstance.count((args.where ? { where: args.where } : {}) as any)
}
