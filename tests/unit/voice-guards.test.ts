import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * PW-VOICE-01 — the §7 guards, in one file so their universe is stated once.
 *
 * Universe: every line carrying Greek in app/, components/ and lib/ (comments
 * stripped), minus the surfaces the series excludes — legal drafting
 * (lib/legal), consent copy, the staff console (admin) and the English bundle.
 * The rules and their reasons live in docs/content/LEXICON.md; the metric
 * definitions in docs/content/CORPUS.md. Each arm has a committed probe under
 * tests/fixtures/guard-probes/voice-*.txt that turns it red.
 *
 * Halted decisions are ALLOWLISTED, not silently passed: H-V01 (onboarding
 * register), H-V04 (Greek plan names), H-V05 (the product noun). When a halt
 * is answered, its allowlist entry is deleted and the guard tightens.
 */

const ROOTS = ['app', 'components', 'lib']
const EXCLUDE = /(^|\/)(node_modules|\.next)\//
const OUT_OF_SCOPE = /^lib\/legal\/|^app\/\(public\)\/(terms|privacy|cookies|subprocessors)|consent|^components\/admin\/|^app\/\(protected\)\/admin\/|\/translations\/en\.ts$|^lib\/services\/ai\/(prompt-policy|guard-patterns|extraction-schema)\.ts$|^lib\/services\/ai\/lob-packs\/|^lib\/schemas\/|^lib\/instrumentation\//

function collect(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (EXCLUDE.test(p + '/')) return []
        if (statSync(p).isDirectory()) return collect(p)
        return /\.tsx?$/.test(name) ? [p] : []
    })
}
function code(src: string): string {
    // keep the newlines of a block comment so reported line numbers stay true
    return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '')
}
const GREEK = /[Ͱ-Ͽἀ-῿]/
/** Every Greek-bearing line, with placeholders and template expressions blanked. */
function greekLines(): { file: string; line: number; text: string; key: string }[] {
    const out: { file: string; line: number; text: string; key: string }[] = []
    for (const file of ROOTS.flatMap(collect)) {
        if (OUT_OF_SCOPE.test(file)) continue
        code(readFileSync(file, 'utf-8')).split('\n').forEach((raw, i) => {
            if (!GREEK.test(raw)) return
            if (/^\s*en\s*:/.test(raw)) return
            const key = (raw.match(/^\s*([A-Za-z_][\w]*)\s*:/) || [])[1] || ''
            out.push({ file, line: i + 1, key, text: raw.replace(/\$\{[^}]*\}|\{[a-zA-Z_]+\}/g, ' ') })
        })
    }
    return out
}
const LINES = greekLines()

function offenders(pred: (l: (typeof LINES)[number]) => boolean): string[] {
    return LINES.filter(pred).map((l) => `${l.file}:${l.line}  ${l.text.trim().slice(0, 100)}`)
}

describe('voice guards (PW-VOICE-01 §7)', () => {
    it('sees the corpus at all — an empty universe is a broken guard', () => {
        expect(LINES.length).toBeGreaterThan(5000)
    })

    it('lexicon-guard — banned variants of a locked term', () => {
        // LEXICON #1 the document; #2 the partner; #8 the coinage.
        const SYMVOLAIO = /συμβόλαι|συμβολαί/i
        const SYMVOLAIO_OK = /ομαδικ|ασφαλιστήριο συμβόλαιο|\bkeywords\s*:/i
        const PRAKTORAS = /πράκτορ(?!εί)/i
        // H-V04: the Greek plan names are catalogue rows; «ασφαλιστικός πράκτορας»
        // is the regulatory category and a search term (LEXICON #2 note).
        const PRAKTORAS_OK = /\bkeywords\s*:|Πράκτορας (Starter|Pro)|Δωρεάν Πράκτορας|ασφαλιστικ(ούς|ού|ός) πράκτορ|slug|href/i
        const COINAGE = /ασφαλιστικ[όο] αποτύπωμα/i
        const bad = offenders((l) => (SYMVOLAIO.test(l.text) && !SYMVOLAIO_OK.test(l.text)) || (PRAKTORAS.test(l.text) && !PRAKTORAS_OK.test(l.text)) || COINAGE.test(l.text))
        expect(bad, `banned lexicon variant:\n${bad.join('\n')}`).toEqual([])
    })

    it('advice-verb-guard — advice verbs in platform voice, unless attributed to the partner', () => {
        const ADVICE = /σας προτείνουμε|προτείνουμε να|σας συμβουλεύουμε|συνιστούμε|συνιστάται να|θα πρέπει να (ασφαλίσ|αγοράσ|προσθέσ|αυξήσ|αλλάξ|ανανεώσ)|πρέπει να (ασφαλίσ|αγοράσ|προσθέσ|αυξήσ|αλλάξ|ανανεώσ)|ασφαλίστε (το|τη|τον|τα|τις|τους)(?!\p{L})(?! χώρο)/iu
        const ATTRIBUTED = /ασφαλιστ(ή|ής|ές|ικ)|σύμβουλ|διαμεσολαβητ|ο νόμος|Δεν έχουμε προϊόν/i
        const bad = offenders((l) => ADVICE.test(l.text) && !ATTRIBUTED.test(l.text))
        expect(bad, `advice in platform voice (attribute it to the ασφαλιστής or remove it):\n${bad.join('\n')}`).toEqual([])
    })

    it('register-guard — no singular address outside the onboarding stage (H-V01)', () => {
        // Only forms that cannot also be a third-person aorist: «ανέβασε» is
        // "upload!" AND "she uploaded", so it is not evidence; «Δες» is.
        const SINGULAR = /(?<!\p{L})(σου|εσύ|εσένα|Δες|Κάνε|Πάτα|Μπες|Γράψε|Βάλε|Στείλε|Επίλεξε|Ξεκίνα|Μάθε|Βρες|Πάρε|Σύνδεσε|Μοιράσου|Ενεργοποίησέ)(?!\p{L})/u
        const ONBOARDING = /onboarding|protection-profile|ProtectionProfile|protectionProfile/
        const bad = offenders((l) => SINGULAR.test(l.text) && !ONBOARDING.test(l.file) && !ONBOARDING.test(l.key) && !/^\s*\/\//.test(l.text))
        // The onboarding bundle keys live inside el.ts; scope them by the section
        // they sit in rather than the file: the guard reads the key path prefix
        // from the inventory when it needs it (docs/content/corpus.json).
        const corpus = JSON.parse(readFileSync('docs/content/corpus.json', 'utf-8')) as { strings: { id: string; text: string }[] }
        const onboardingTexts = new Set(corpus.strings.filter((s) => s.id.startsWith('bundle:onboarding')).map((s) => s.text.replace(/\{[a-zA-Z_]+\}/g, ' ')))
        const filtered = bad.filter((line) => ![...onboardingTexts].some((t) => t.length > 12 && line.includes(t.slice(0, 40))))
        expect(filtered, `singular register outside onboarding (V4):\n${filtered.join('\n')}`).toEqual([])
    })

    it('locale-purity-guard — Latin runs in Greek copy beyond the allowlist (metric 6)', () => {
        const ALLOW = new Set('PolicyWallet AI PDF IDD GDPR EU email e-mail Email Google Apple Stripe Family Plus Starter Pro Agent Agency URL OK PIN OTP QR SMS IBAN VAT VIN HR CEO ID app App portal Portal site cookies Cookies cookie Excel CSV JSON API MB KB GB JPG PNG Schengen ransomware cyber Cyber premium Premium DPO Art CRM online Online push Push credits tokens Wi-Fi iOS Android FAQ HTTPS Face Touch Vercel Sentry Supabase PayPal Pay Wallet wallet Unit-Linked MEDIC ACORD AES- PCI DSS YTD spam gov Allianz Eurolife maria example jet ski analytics marketing web banking Web Banking IRIS Tip claim updates TLS emails Interamerican Ethniki Generali NN Groupama Hellas Eurobank Alpha Piraeus Anytime Ergo Hospital Line Europ Assistance Eurolife FFH ERB Allianz Direct Ydrogios Minetta Syneteristiki Atlantiki Enosi Dynamis Interlife Personal Orizon Prime KATO Visa Mastercard American Express WhatsApp Discord Safari Chrome iPhone iPad myAADE DORA Act Lux WEBP HEIC EUR VAPID PWA PIR EET newsletter'.split(' '))
        // H-V05 keeps `wallet` allowed until the product noun is decided.
        const LATIN = /[A-Za-z][A-Za-z\-]{2,}/g // no quote in the class: «AI'» is not a word
        const isPlainLiteral = (t: string) => !/^\s*[{[]/.test(t) && !/<[a-z]/.test(t) && /["'`]/.test(t)
        const bad = offenders((l) => {
            if (!isPlainLiteral(l.text)) return false
            // An `el` literal is one where Greek letters outnumber Latin ones; an English
            // string quoting a Greek term (catalogue descriptions, model prompts, schema
            // .describe()) is `en` copy with a citation, not English-in-el.
            const ENGLISH_TELL = /\b(is|are|not|the|of|this|that|and|for|with|from)\b/g
            const inString = (l.text.replace(/&[a-z]+;|\S+@\S+|www\.\S+/g, ' ').match(/(["'`])(?:\\.|(?!\1).)*\1/g) || []).filter((s) => GREEK.test(s) && (s.match(/\p{Script=Greek}/gu) || []).length > (s.match(/[A-Za-z]/g) || []).length && (s.match(ENGLISH_TELL) || []).length < 2).join(' ')
            const words = (inString.match(LATIN) || []).filter((w) => !ALLOW.has(w) && !/^(http|www|policywallet)/i.test(w))
            return words.length > 0
        })
        if (process.env.VOICE_DUMP) require('node:fs').writeFileSync(process.env.VOICE_DUMP, bad.join('\n') + '\n')
        // Round 1 closes the agent-CRM anglicisms and the auth screens; the
        // remaining count is the Round-2 backlog and is asserted here so it
        // can only go down.
        expect(bad.length, `English-in-el (metric 6) = ${bad.length}, above the Round-1 level:\n${bad.slice(0, 20).join('\n')}`).toBeLessThanOrEqual(40)
    })

    it('number-format-guard — thousands separator per locale', () => {
        const bad = offenders((l) => {
            const greekLiterals = (l.text.match(/(["'`])(?:\\.|(?!\1).)*\1/g) || []).filter((s) => GREEK.test(s))
            return greekLiterals.some((s) => /(^|[^\d.])\d{1,3},\d{3}(?![\d,])/.test(s))
        })
        expect(bad, `English thousands separator in Greek copy (use 10.000):\n${bad.join('\n')}`).toEqual([])
    })

    it('claims-guard — the retired claims never return, outbound templates included', () => {
        const RETIRED = /500\s?\+|10[\.,]000\s?\+|\b98\s?%\s?(ακρίβ|accuracy)|χιλιάδες (χρήστ|πελάτ|ασφαλισμ)|μας εμπιστεύ|5-1[05]%\s?έκπτωσ|€100-150|σε λιγότερο από 1 λεπτό/i
        const bad = offenders((l) => RETIRED.test(l.text))
        expect(bad, `a retired or unsourced claim is back:\n${bad.join('\n')}`).toEqual([])
    })
})

/**
 * Length budget and new-string control, from the two inventories: the Step-0
 * baseline (docs/content/corpus.json) and the live freeze fixture, which the
 * greek-string-inventory guard keeps identical to the source. Both are keyed
 * by arm:locator#n, so a rewrite is compared with the exact string it replaced.
 */
/** Similarity on character trigrams — inflection-tolerant, which a word set is not («προεπισκόπηση» ≠ «προεπισκόπησης»). */
function similarity(a: string, b: string): number {
    const g = (t: string) => { const s = t.toLowerCase().replace(/\s+/g, ' '); const out = new Set<string>(); for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3)); return out }
    const A = g(a), B = g(b)
    if (A.size === 0 || B.size === 0) return 0
    let inter = 0
    for (const x of A) if (B.has(x)) inter++
    return inter / (A.size + B.size - inter)
}

/**
 * Pair each locator's baseline strings with its current strings — identical
 * text first, then the most similar remaining pair (a rewrite keeps most of
 * its words) — and check the growth budget on every pair. Strings left
 * unpaired on the current side are NEW and must be reviewed; on the baseline
 * side they were removed.
 */
export function budgetCheck(
    baseline: Record<string, string[]>,
    current: Record<string, string[]>,
    allowNew: Set<string>
): { over: string[]; unreviewedNew: string[]; removed: string[] } {
    const over: string[] = []
    const unreviewedNew: string[] = []
    const removed: string[] = []
    const locators = new Set([...Object.keys(baseline), ...Object.keys(current)])
    for (const loc of locators) {
        const b = [...(baseline[loc] || [])]
        const c = [...(current[loc] || [])]
        const common = new Set(b.filter((x) => c.includes(x)))
        let rb = b.filter((x) => !common.has(x))
        let rc = c.filter((x) => !common.has(x))
        while (rb.length && rc.length) {
            let best = { r: -1, i: 0, j: 0 }
            rb.forEach((x, i) => rc.forEach((y, j) => { const r = similarity(x, y); if (r > best.r) best = { r, i, j } }))
            if (best.r < 0.15) break
            const x = rb[best.i], y = rc[best.j]
            rb = rb.filter((_, i) => i !== best.i); rc = rc.filter((_, j) => j !== best.j)
            if (y.length > x.length * 1.15 && y.length > x.length + 2) over.push(`${loc}: ${x.length}→${y.length}  «${y.slice(0, 60)}»`)
        }
        for (const y of rc) if (!allowNew.has(`${loc}::${y}`)) unreviewedNew.push(`${loc}::${y.slice(0, 80)}`)
        for (const x of rb) removed.push(`${loc}::${x.slice(0, 80)}`)
    }
    return { over, unreviewedNew, removed }
}

describe('length-budget-guard and new-string-guard', () => {
    it('the pure check turns red on a 16 % growth and on an unreviewed new string, and pairs a rewrite with its original', () => {
        const r = budgetCheck(
            { 'f': ['Το ασφαλιστήριό σας λήγει σύντομα.', 'Δείτε τα ευρήματα'] },
            { 'f': ['Δείτε τα ευρήματα', 'Το ασφαλιστήριό σας λήγει σύντομα και χρειάζεται ανανέωση τώρα.', 'Εντελώς νέα πρόταση εδώ'] },
            new Set()
        )
        expect(r.over).toHaveLength(1)
        expect(r.over[0]).toMatch(/^f: 34→/)
        expect(r.unreviewedNew).toEqual(['f::Εντελώς νέα πρόταση εδώ'])
        expect(budgetCheck({ f: ['Δείτε τα ευρήματα του ασφαλιστηρίου'] }, { f: ['Δείτε τα ευρήματα του ασφαλιστηρίου σας'] }, new Set()).over).toEqual([])
    })

    it('no rewritten string grew more than 15 % over its baseline, and no new string shipped unreviewed', () => {
        const corpus = JSON.parse(readFileSync('docs/content/corpus.json', 'utf-8')) as { strings: { arm: string; key_or_file: string; text: string; surface: string }[] }
        const baseline: Record<string, string[]> = {}
        for (const s of corpus.strings) if (s.surface !== 'legal') (baseline[`${s.arm}:${s.key_or_file}`] ||= []).push(s.text)
        const current: Record<string, string[]> = {}
        for (const line of readFileSync('tests/fixtures/greek-string-inventory.txt', 'utf-8').split('\n')) {
            const p = line.split('\t')
            if (p.length < 3 || !['bundle', 'inline', 'call', 'ternary'].includes(p[0])) continue
            let t = p.slice(2).join('\t').trim()
            if (t.length >= 2 && t[0] === t[t.length - 1] && `"'\``.includes(t[0])) t = t.slice(1, -1)
            t = t.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, ' ')
            if (!GREEK.test(t)) continue
            const loc = `${p[0]}:${p[1]}`
            if (!(loc in baseline)) continue // a locator the baseline never had (legal, or out of scope) is not budgeted
            ;(current[loc] ||= []).push(t)
        }
        const additions = existsSync('docs/content/corpus-additions.json')
            ? new Set<string>(JSON.parse(readFileSync('docs/content/corpus-additions.json', 'utf-8')) as string[])
            : new Set<string>()
        const exemptions = existsSync('docs/content/budget-exemptions.json')
            ? (JSON.parse(readFileSync('docs/content/budget-exemptions.json', 'utf-8')) as { locator: string; text: string; reason: string }[])
            : []
        const r = budgetCheck(baseline, current, additions)
        // A V1 lock substitution can grow a bare label by the term's own length
        // difference; DECISIONS.md D-V01 allows it ONLY as a listed exemption
        // with a reason, and the fixture render still has to pass.
        r.over = r.over.filter((o) => !exemptions.some((e) => o.startsWith(`${e.locator}:`) && o.includes(e.text.slice(0, 40))))
        expect(r.over, `over the 15 % budget:\n${r.over.join('\n')}`).toEqual([])
        expect(r.unreviewedNew, `new strings not reviewed in docs/content/corpus-additions.json:\n${r.unreviewedNew.slice(0, 20).join('\n')}`).toEqual([])
    })
})
