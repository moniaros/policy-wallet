import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { guides } from '@/lib/guides/content'

/**
 * sources-freshness — the guard on `docs/growth/SOURCES.md`.
 *
 * A public page that states a legal, tax or statutory rule is only as good as
 * the date someone last checked it. This guard makes "someone checked" a
 * machine fact rather than a habit. It fails when:
 *
 *   1. a claim's `reverify_after` has passed;
 *   2. a record is malformed — missing a field, unparseable date, duplicate id;
 *   3. a `SRC-###` referenced by rendered content does not resolve to a record;
 *   4. a citation anywhere in the /guides corpus is a bare origin (a homepage
 *      cannot support a specific claim, and cannot go stale detectably).
 *
 * UNIVERSE. Every check enumerates from the filesystem or from the exported
 * data — never from a hand-written list of "the files I happened to think of".
 * That failure mode has shipped in this repo before: a guard scoped to known
 * locations guards those locations, not the invariant. Rule (4) walks every
 * guide in `lib/guides/content.ts`, not the ten hook articles.
 *
 * PROBE. `tests/unit/fixtures/sources-freshness-probe.md` carries one planted
 * instance of each defect class and is asserted to turn every detector red.
 * Without it this file would be a guard nobody has seen fail.
 *
 * LEGACY DEBT. The 12 pre-existing guides carry 30 citations, all of them bare
 * origins (queue item GB-04). They are enumerated below EXACTLY, so the set can
 * only shrink: a new bare citation fails, and fixing one without removing it
 * from the list also fails. The list is debt, not an exemption.
 */

const REPO_ROOT = process.cwd()
const SOURCES_PATH = join(REPO_ROOT, 'docs/growth/SOURCES.md')
const PROBE_PATH = join(REPO_ROOT, 'tests/unit/fixtures/sources-freshness-probe.md')

const REQUIRED_FIELDS = ['claim', 'source', 'excerpt', 'verified_at', 'reverify_after', 'hooks'] as const

type SourceRecord = {
    id: string
    fields: Record<string, string>
}

type ParseResult = {
    records: SourceRecord[]
    duplicateIds: string[]
    missingFields: { id: string; field: string }[]
    unparseableDates: { id: string; field: string; value: string }[]
    bareOriginSources: { id: string; url: string }[]
}

/** A URL that names no document — an origin, with nothing after the slash. */
function isBareOrigin(raw: string): boolean {
    let url: URL
    try {
        url = new URL(raw)
    } catch {
        return false
    }
    return (url.pathname === '' || url.pathname === '/') && !url.search && !url.hash
}

function parseIsoDate(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const parsed = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) return null
    // Reject dates that round-trip differently (e.g. 2026-02-31).
    if (parsed.toISOString().slice(0, 10) !== value) return null
    return parsed
}

/**
 * Parses the `### SRC-###` record blocks. Pure: takes markdown, returns
 * findings. Every defect the guard reports comes out of here, which is what
 * lets the probe fixture exercise the same code path as the real file.
 */
function parseSourceRecords(markdown: string): ParseResult {
    const lines = markdown.split('\n')
    const records: SourceRecord[] = []
    const seen = new Set<string>()
    const duplicateIds: string[] = []

    let current: SourceRecord | null = null
    for (const line of lines) {
        const heading = /^###\s+(SRC-\d{3})\s*$/.exec(line.trim())
        if (heading) {
            const id = heading[1]
            if (seen.has(id)) duplicateIds.push(id)
            seen.add(id)
            current = { id, fields: {} }
            records.push(current)
            continue
        }
        if (!current) continue
        const field = /^-\s+\*\*([a-z_]+):\*\*\s*(.*)$/.exec(line.trim())
        if (field) current.fields[field[1]] = field[2].trim()
    }

    const missingFields: ParseResult['missingFields'] = []
    const unparseableDates: ParseResult['unparseableDates'] = []
    const bareOriginSources: ParseResult['bareOriginSources'] = []

    for (const record of records) {
        for (const field of REQUIRED_FIELDS) {
            if (!record.fields[field]) missingFields.push({ id: record.id, field })
        }
        for (const field of ['verified_at', 'reverify_after'] as const) {
            const value = record.fields[field]
            if (value && !parseIsoDate(value)) {
                unparseableDates.push({ id: record.id, field, value })
            }
        }
        const source = record.fields.source
        if (source && isBareOrigin(source)) bareOriginSources.push({ id: record.id, url: source })
    }

    return { records, duplicateIds, missingFields, unparseableDates, bareOriginSources }
}

/** Records whose re-verification date has passed. */
function findStale(records: SourceRecord[], today: Date): { id: string; reverifyAfter: string }[] {
    const stale: { id: string; reverifyAfter: string }[] = []
    for (const record of records) {
        const value = record.fields.reverify_after
        const parsed = value ? parseIsoDate(value) : null
        if (!parsed) continue // reported separately as an unparseable date
        if (parsed.getTime() < today.getTime()) stale.push({ id: record.id, reverifyAfter: value })
    }
    return stale
}

/** Every .ts/.tsx under the given roots, enumerated from disk. */
function walkSourceFiles(roots: string[]): string[] {
    const out: string[] = []
    const visit = (dir: string) => {
        let entries: string[]
        try {
            entries = readdirSync(dir)
        } catch {
            return
        }
        for (const entry of entries) {
            if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue
            const full = join(dir, entry)
            let s: ReturnType<typeof statSync>
            try {
                s = statSync(full)
            } catch {
                continue
            }
            if (s.isDirectory()) visit(full)
            else if (/\.tsx?$/.test(entry)) out.push(full)
        }
    }
    for (const root of roots) visit(join(REPO_ROOT, root))
    return out
}

const parsed = parseSourceRecords(readFileSync(SOURCES_PATH, 'utf8'))

describe('SOURCES.md records are well formed', () => {
    it('parses at least one record (the file is the registry, not prose)', () => {
        expect(parsed.records.length).toBeGreaterThan(0)
    })

    it('every record carries all required fields', () => {
        expect(
            parsed.missingFields,
            `records missing fields:\n${parsed.missingFields.map((m) => `  ${m.id}: ${m.field}`).join('\n')}`
        ).toEqual([])
    })

    it('every date is a real ISO date', () => {
        expect(
            parsed.unparseableDates,
            `unparseable dates:\n${parsed.unparseableDates.map((d) => `  ${d.id}.${d.field} = ${d.value}`).join('\n')}`
        ).toEqual([])
    })

    it('no id is used twice', () => {
        expect(parsed.duplicateIds, `duplicate ids: ${parsed.duplicateIds.join(', ')}`).toEqual([])
    })

    it('no claim is cited to a bare origin', () => {
        expect(
            parsed.bareOriginSources,
            `a homepage cannot support a specific claim:\n${parsed.bareOriginSources
                .map((b) => `  ${b.id} -> ${b.url}`)
                .join('\n')}`
        ).toEqual([])
    })
})

describe('no rendered claim has gone stale', () => {
    it('every reverify_after is still in the future', () => {
        const stale = findStale(parsed.records, new Date())
        expect(
            stale,
            `these claims are past their re-verification date and must be re-checked against a ` +
                `primary source or cut:\n${stale.map((s) => `  ${s.id} expired ${s.reverifyAfter}`).join('\n')}`
        ).toEqual([])
    })
})

describe('every SRC- reference resolves', () => {
    it('rendered content cites no id that SOURCES.md does not define', () => {
        const known = new Set(parsed.records.map((r) => r.id))
        const dangling: string[] = []
        for (const file of walkSourceFiles(['app', 'lib', 'components'])) {
            const text = readFileSync(file, 'utf8')
            for (const match of text.matchAll(/SRC-\d{3}/g)) {
                if (!known.has(match[0])) dangling.push(`${relative(REPO_ROOT, file)}: ${match[0]}`)
            }
        }
        expect(dangling, `unresolved source ids:\n${dangling.join('\n')}`).toEqual([])
    })
})

/**
 * The 30 citations the 12 pre-existing guides shipped with, every one a bare
 * origin. Queue item GB-04 migrates them. Asserted EXACTLY so the set can only
 * shrink — see the header note.
 */
const LEGACY_BARE_CITATIONS = [
    'apallagi-asfaleia-ygeias-pos-leitourgei::https://www.bankofgreece.gr',
    'apallagi-asfaleia-ygeias-pos-leitourgei::https://www.eaee.gr',
    'apallagi-asfaleia-ygeias-pos-leitourgei::https://www.gov.gr',
    'asfaleia-katoikidiou-ti-exaireitai::https://www.eaee.gr',
    'asfaleia-katoikidiou-ti-exaireitai::https://www.gov.gr',
    'checklist-ananeosis-asfalistiriou::https://www.bankofgreece.gr',
    'checklist-ananeosis-asfalistiriou::https://www.eaee.gr',
    'diaxeirisi-asfalistirion-se-ena-simeio::https://www.bankofgreece.gr',
    'diaxeirisi-asfalistirion-se-ena-simeio::https://www.eaee.gr',
    'efarmoges-asfalistirion-apozimioseis::https://www.bankofgreece.gr',
    'efarmoges-asfalistirion-apozimioseis::https://www.eaee.gr',
    'ekptosi-enfia-asfalisi-katoikias::https://www.aade.gr',
    'ekptosi-enfia-asfalisi-katoikias::https://www.eaee.gr',
    'kena-kalypsis-ti-einai-pos-ta-vriskete::https://www.bankofgreece.gr',
    'kena-kalypsis-ti-einai-pos-ta-vriskete::https://www.eaee.gr',
    'omadiko-symvolaio-ergasias::https://www.aade.gr',
    'omadiko-symvolaio-ergasias::https://www.bankofgreece.gr',
    'omadiko-symvolaio-ergasias::https://www.eaee.gr',
    'pliromi-asfalistron-psifiaka::https://www.bankofgreece.gr',
    'pliromi-asfalistron-psifiaka::https://www.dias.com.gr',
    'pliromi-asfalistron-psifiaka::https://www.eaee.gr',
    'poso-kostizei-i-asfalisi-seismou::https://www.aade.gr',
    'poso-kostizei-i-asfalisi-seismou::https://www.bankofgreece.gr',
    'poso-kostizei-i-asfalisi-seismou::https://www.eaee.gr',
    'prostimo-anasfalistou-oximatos::https://www.epikef.gr',
    'prostimo-anasfalistou-oximatos::https://www.gov.gr',
    'ti-kalyptei-i-asfaleia-aytokinitou::https://www.bankofgreece.gr',
    'ti-kalyptei-i-asfaleia-aytokinitou::https://www.eaee.gr',
    'ti-kalyptei-i-asfaleia-aytokinitou::https://www.gov.gr',
]

describe('guides corpus citations', () => {
    // Universe: every guide the content module exports, not the hook articles.
    const allCitations = guides.flatMap((guide) =>
        guide.sources.map((source) => ({ slug: guide.slug, url: source.url }))
    )

    it('enumerates the whole corpus, not a sample', () => {
        expect(allCitations.length).toBeGreaterThanOrEqual(LEGACY_BARE_CITATIONS.length)
        expect(guides.length).toBeGreaterThan(0)
    })

    it('introduces no bare-origin citation beyond the enumerated legacy debt', () => {
        const bare = allCitations
            .filter((c) => isBareOrigin(c.url))
            .map((c) => `${c.slug}::${c.url}`)
            .sort()
        const legacy = [...LEGACY_BARE_CITATIONS].sort()

        const added = bare.filter((c) => !legacy.includes(c))
        expect(
            added,
            `new bare-origin citations. A homepage is not a source for a specific claim — ` +
                `cite the document:\n${added.join('\n')}`
        ).toEqual([])

        const fixedButStillListed = legacy.filter((c) => !bare.includes(c))
        expect(
            fixedButStillListed,
            `these legacy citations are no longer bare — remove them from ` +
                `LEGACY_BARE_CITATIONS so the debt list keeps shrinking:\n${fixedButStillListed.join('\n')}`
        ).toEqual([])
    })
})

/**
 * The probe. Each assertion here proves one detector actually fires; if any of
 * these ever passes silently, the corresponding check above has stopped working.
 */
describe('PROBE: the guard turns red on a broken sources file', () => {
    const probe = parseSourceRecords(readFileSync(PROBE_PATH, 'utf8'))

    it('detects a stale reverify_after', () => {
        const stale = findStale(probe.records, new Date('2026-08-26T00:00:00Z'))
        expect(stale.map((s) => s.id)).toContain('SRC-901')
    })

    it('detects a record with a missing field', () => {
        expect(probe.missingFields).toContainEqual({ id: 'SRC-902', field: 'excerpt' })
    })

    it('detects an unparseable date', () => {
        expect(probe.unparseableDates).toContainEqual({
            id: 'SRC-903',
            field: 'reverify_after',
            value: 'soon-ish',
        })
    })

    it('detects a duplicate id', () => {
        expect(probe.duplicateIds).toContain('SRC-904')
    })

    it('detects a claim cited to a bare origin', () => {
        expect(probe.bareOriginSources.map((b) => b.id)).toContain('SRC-905')
    })

    it('detects a bare origin in the URL predicate itself', () => {
        expect(isBareOrigin('https://www.aade.gr')).toBe(true)
        expect(isBareOrigin('https://www.aade.gr/')).toBe(true)
        expect(isBareOrigin('https://www.aade.gr/anasfalista-ohimata')).toBe(false)
    })
})
