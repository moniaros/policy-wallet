import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The whole app translates "task" as «εργασία» (t.dashboard.pendingTasks =
 * «Εκκρεμείς εργασίες», createTaskBtn = «Δημιουργία εργασίας», etc.). One
 * bilingual pair on the advisor's busiest screen — the customer-profile action
 * menu — shipped `createTask: { el: "Δημιουργία Task", en: "Create Task" }`,
 * leaving the English word "Task" inside the Greek string while every sibling
 * item («Αίτημα εγγράφου», «Δημιουργία πρότασης»…) was proper Greek. To a Greek
 * advisor that reads as unfinished, prototype-grade copy.
 *
 * lint:i18n-changed can't catch this: it flags monolingual/hardcoded strings,
 * not an English word sitting on the GREEK side of a valid {el, en} pair. This
 * guard closes that specific blind spot on the agent/customer client surfaces.
 */
const ROOTS = [
    'app/(protected)/customers',
    'app/(protected)/agent',
    'components/agent',
    'components/collaboration',
]

function tsxFiles(dir: string): string[] {
    let out: string[] = []
    let entries
    try {
        entries = readdirSync(dir, { withFileTypes: true })
    } catch {
        return out
    }
    for (const e of entries) {
        const full = join(dir, e.name)
        if (e.isDirectory()) out = out.concat(tsxFiles(full))
        else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) out.push(full)
    }
    return out
}

// A bilingual el value that contains the standalone English word "Task".
// `el:` deliberately requires the preceding boundary so it never matches a key
// like `cancel:` (whose value is Greek anyway). All three quote styles: the
// first version knew double quotes only, so `el: 'Δημιουργία Task'` — the same
// defect under the repo's OTHER quoting convention — was invisible.
const EL_TASK = /\bel:\s*(["'`])(?:(?!\1)[^\n])*\bTask\b(?:(?!\1)[^\n])*\1/g

/** Every el:-string in `src` that carries the English word "Task". */
function englishTaskHits(src: string): string[] {
    return src.match(EL_TASK) ?? []
}

describe('no English "Task" leaks into Greek copy on advisor surfaces', () => {
    const files = ROOTS.flatMap(tsxFiles)

    it('scans a non-trivial number of advisor source files', () => {
        expect(files.length).toBeGreaterThan(5)
    })

    it('no el: bilingual string contains the English word "Task" (use «εργασία»)', () => {
        const offenders: string[] = []
        for (const f of files) {
            const hits = englishTaskHits(readFileSync(f, 'utf-8'))
            if (hits.length > 0) offenders.push(`${f}: ${hits.join(' | ')}`)
        }
        expect(
            offenders,
            `English "Task" found inside Greek (el:) copy — translate to «εργασία» ` +
            `(the app-wide term):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the matcher against the AUTHENTIC pre-fix
 * line (CustomerProfileClient.tsx at 9a602925~1, verbatim), the same defect in
 * the two quote styles the first matcher could not see, and the shapes that
 * must stay silent.
 */
describe('the el:-Task matcher is proven on the authentic source', () => {
    it('flags the line that shipped, in every quote style', () => {
        expect(englishTaskHits('    createTask: { el: "Δημιουργία Task", en: "Create Task" },')).toHaveLength(1)
        expect(englishTaskHits("    createTask: { el: 'Δημιουργία Task', en: 'Create Task' },")).toHaveLength(1)
        expect(englishTaskHits('    createTask: { el: `Δημιουργία Task`, en: `Create Task` },')).toHaveLength(1)
    })

    it('stays silent on proper Greek, on the en: side, and on non-el keys', () => {
        // The post-fix line, verbatim.
        expect(englishTaskHits('    createTask: { el: "Δημιουργία εργασίας", en: "Create Task" },')).toEqual([])
        // `label:` ends in "el:" but is not the Greek side of a pair.
        expect(englishTaskHits('    label: "Task list",')).toEqual([])
        // "Multitasking" is not the standalone word.
        expect(englishTaskHits('    el: "Πολλαπλό Multitasking δεν είναι Task-άρισμα",')).toHaveLength(1)
        expect(englishTaskHits('    el: "Το multitasking μειώνει την απόδοση",')).toEqual([])
    })
})
