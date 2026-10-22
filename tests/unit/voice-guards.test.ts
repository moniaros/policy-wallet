import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { POSITIONING_BANNED, SUPPORT_BANNED, IN_APP_SUPPORT_BANNED, REMINDER_PLUS, REMINDER_PLUS_EXEMPT } from '../measure/content-02-patterns'

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
 * Every halt that carried an allowlist here has been answered and its entry
 * deleted: H-V01 the onboarding register (D-V10), H-V04 the plan names (D-V12),
 * H-V05 the product noun (D-V11). The guard now covers the whole corpus.
 */

const ROOTS = ['app', 'components', 'lib']
const EXCLUDE = /(^|\/)(node_modules|\.next)\//
const OUT_OF_SCOPE = /^lib\/legal\/|^app\/\(public\)\/(terms|privacy|cookies|subprocessors)|consent|^components\/admin\/|^app\/\(protected\)\/admin\/|\/translations\/en\.ts$|^lib\/services\/ai\/(prompt-policy|guard-patterns|extraction-schema|mock-ai\.service)\.ts$|^lib\/notifications\/settings\.ts$|^lib\/wallet\/insurer-registry\.ts$|^lib\/services\/ai\/lob-packs\/|^lib\/schemas\/|^lib\/instrumentation\/|^lib\/ingestion\/lexicon\.ts$/

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
            out.push({ file, line: i + 1, key, text: raw.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}|\{[a-zA-Z_]+\}/g, ' ') })
        })
    }
    return out
}
const LINES = greekLines()
/** Texts of the staff console's bundle keys (admin.*), from the Step-0 corpus — excluded from every arm's customer-facing metric. */
const ADMIN_TEXTS: string[] = (JSON.parse(readFileSync('docs/content/corpus.json', 'utf-8')) as { strings: { id: string; text: string }[] }).strings
    .filter((s) => s.id.startsWith('bundle:admin.') && s.text.length > 12)
    .map((s) => s.text.slice(0, 40))

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
        // The stem is matched with BOTH accentuations and an accent-blind lookahead:
        // Greek moves the stress in the genitive plural (πράκτορ-ας → πρακτόρ-ων), so
        // /πράκτορ/ never saw «Πλάνα Πρακτόρων», which shipped in-app for months; and
        // «ΠΡΑΚΤΟΡΕΙΟ» in caps carries no tonos, so (?!εί) failed to exempt it.
        const PRAKTORAS = /πρ[άα]κτ[οό]ρ(?!ε[ίι])/i
        // «ασφαλιστικός πράκτορας» is the regulatory category under Law 4583/2018 and
        // the term agents search for (LEXICON #2 note, D-V03). The plan-name exemption
        // that sat here was deleted with the strings it covered: they were never
        // catalogue rows, only unread constants (D-V12).
        const PRAKTORAS_OK = /\bkeywords\s*:|ασφαλιστικ(ούς|ού|ός|ή) πράκτορ|slug|href/i
        const COINAGE = /ασφαλιστικ[όο] αποτύπωμα/i
        const bad = offenders((l) => (SYMVOLAIO.test(l.text) && !SYMVOLAIO_OK.test(l.text)) || (PRAKTORAS.test(l.text) && !PRAKTORAS_OK.test(l.text)) || COINAGE.test(l.text))
        expect(bad, `banned lexicon variant:\n${bad.join('\n')}`).toEqual([])
    })

    it('advice-verb-guard — advice verbs in platform voice, unless attributed to the partner', () => {
        const ADVICE = /τι (?:αξίζει )?να διορθώσετε|σας προτείνουμε|προτείνουμε να|σας συμβουλεύουμε|συνιστούμε|συνιστάται να|θα πρέπει να (ασφαλίσ|αγοράσ|προσθέσ|αυξήσ|αλλάξ|ανανεώσ)|πρέπει να (ασφαλίσ|αγοράσ|προσθέσ|αυξήσ|αλλάξ|ανανεώσ)|ασφαλίστε (το|τη|τον|τα|τις|τους)(?!\p{L})(?! χώρο)/iu
        const ATTRIBUTED = /ασφαλιστ(ή|ής|ές|ικ)|σύμβουλ|διαμεσολαβητ|ο νόμος|Δεν έχουμε προϊόν/i
        const bad = offenders((l) => ADVICE.test(l.text) && !ATTRIBUTED.test(l.text))
        expect(bad, `advice in platform voice (attribute it to the ασφαλιστής or remove it):\n${bad.join('\n')}`).toEqual([])
    })

    it('register-guard — no singular address anywhere (H-V01 answered: D-V10)', () => {
        // Only forms that cannot also be a third-person aorist: «ανέβασε» is
        // "upload!" AND "she uploaded", so it is not evidence; «Δες» is.
        const SINGULAR = /(?<!\p{L})(σου|εσύ|εσένα|Δες|Κάνε|Πάτα|Μπες|Γράψε|Βάλε|Στείλε|Επίλεξε|Ξεκίνα|Μάθε|Βρες|Πάρε|Σύνδεσε|Μοιράσου|Ενεργοποίησέ)(?!\p{L})/u
        // The onboarding allowlist is GONE (D-V10, 2026-09-15): the stage speaks the
        // formal plural like everything else, so the guard covers the whole corpus.
        // The one survivor is the user's own first-person answer, «Δεν είμαι
        // σίγουρος/η», which is not an address at all.
        // The singular object clitic «σε» — «Θα σε ρωτήσουμε» — which the pronoun
        // sweep misses because «σε» is also the preposition («σε ένα σημείο»).
        // ONLY 1st/2nd-person-plural verb endings are matched: no Greek noun ends
        // in -ουμε/-ετε/-ουν, so this is unambiguous. A wider net was tried and
        // rejected — «σε έ…» looked like the past-tense augment but flagged 62
        // false positives, because «ένα/έναν» is the indefinite article.
        // LIMIT, recorded rather than papered over: the 3rd-person past form
        // («Τι σε έφερε εδώ;») is NOT guardable this way and was found by walking
        // the flow in a browser. See LEXICON, "Accent-blind matching".
        const CLITIC = /(?<!\p{L})σε\s+\p{L}+(?:ουμε|ετε|ουν)(?!\p{L})/u
        const bad = offenders((l) => {
            const text = l.text.split('Δεν είμαι σίγουρος/η').join('')
            return (SINGULAR.test(text) || CLITIC.test(text)) && !/^\s*\/\//.test(l.text)
        })
        const filtered = bad
        expect(filtered, `singular register outside onboarding (V4):\n${filtered.join('\n')}`).toEqual([])
    })

    it('locale-purity-guard — Latin runs in Greek copy beyond the allowlist (metric 6)', () => {
        const ALLOW = new Set('PolicyWallet AI PDF IDD GDPR EU email e-mail Email Google Apple Stripe Family Plus Starter Pro Agent Agency URL OK PIN OTP QR SMS IBAN VAT VIN HR CEO ID app App portal Portal site cookies Cookies cookie Excel CSV JSON API MB KB GB JPG PNG Schengen ransomware cyber Cyber premium Premium DPO Art CRM online Online push Push credits tokens Wi-Fi iOS Android FAQ HTTPS Face Touch Vercel Sentry Supabase PayPal Pay Wallet wallet Unit-Linked MEDIC ACORD AES- PCI DSS YTD spam gov Allianz Eurolife maria example jet ski analytics marketing web banking Web Banking IRIS Tip claim updates TLS emails Interamerican Ethniki Generali NN Groupama Hellas Eurobank Alpha Piraeus Anytime Ergo Hospital Line Europ Assistance Eurolife FFH ERB Allianz Direct Ydrogios Minetta Syneteristiki Atlantiki Enosi Dynamis Interlife Personal Orizon Prime KATO Visa Mastercard American Express WhatsApp Discord Safari Chrome iPhone iPad myAADE DORA Act Lux WEBP HEIC EUR VAPID PWA PIR EET newsletter cloud phishing cyberbullying Level eu-west- XXXX'.split(' '))
        // D-V11 settled the product noun, so Latin `wallet` is no longer allowed on its
        // own; `Wallet` survives only inside the Apple/Google trademarks. Ceiling 0.
        const LATIN = /[A-Za-z][A-Za-z-]{2,}/g // no quote in the class: «AI'» is not a word
        const isPlainLiteral = (t: string) => !/^\s*[{[]/.test(t) && !/<[a-z]/.test(t) && /["'`]/.test(t)
        const bad = offenders((l) => {
            if (!isPlainLiteral(l.text)) return false
            // An `el` literal is one where Greek letters outnumber Latin ones; an English
            // string quoting a Greek term (catalogue descriptions, model prompts, schema
            // .describe()) is `en` copy with a citation, not English-in-el.
            const ENGLISH_TELL = /\b(is|are|not|the|of|this|that|and|for|with|from)\b/g
            // A parenthesised or «quoted» run that is entirely Latin is a GLOSS of the Greek term
            // before it («βεβαίωση ασφάλισης» (certificate of insurance)) — a translation aid, not
            // untranslated copy. The staff console's bundle keys are not customer-facing.
            if (ADMIN_TEXTS.some((t) => l.text.includes(t))) return false
            const inString = (l.text.replace(/&[a-z]+;|\S+@\S+|www\.\S+|\([A-Za-z][A-Za-z .,'/-]*\)|«[A-Za-z][A-Za-z .,'/-]*»/g, ' ').match(/(["'`])(?:\\.|(?!\1).)*\1/g) || []).filter((s) => GREEK.test(s) && (s.match(/\p{Script=Greek}/gu) || []).length > (s.match(/[A-Za-z]/g) || []).length && (s.match(ENGLISH_TELL) || []).length < 2).join(' ')
            const words = (inString.match(LATIN) || []).filter((w) => !ALLOW.has(w) && !/^(http|www|policywallet)/i.test(w))
            return words.length > 0
        })
        if (process.env.VOICE_DUMP) require('node:fs').writeFileSync(process.env.VOICE_DUMP, bad.join('\n') + '\n')
        // Round 1 closes the agent-CRM anglicisms and the auth screens; the
        // remaining count is the Round-2 backlog and is asserted here so it
        // can only go down.
        expect(bad.length, `English-in-el (metric 6) = ${bad.length}, above the Round-1 level:\n${bad.slice(0, 20).join('\n')}`).toBeLessThanOrEqual(0)
    })

    it('number-format-guard — thousands separator per locale', () => {
        const bad = offenders((l) => {
            const greekLiterals = (l.text.match(/(["'`])(?:\\.|(?!\1).)*\1/g) || []).filter((s) => GREEK.test(s))
            return greekLiterals.some((s) => /(^|[^\d.])\d{1,3},\d{3}(?![\d,])/.test(s))
        })
        expect(bad, `English thousands separator in Greek copy (use 10.000):\n${bad.join('\n')}`).toEqual([])
    })

    it('claims-guard — the retired claims never return, outbound templates included', () => {
        const RETIRED = /500\s?\+|10[.,]000\s?\+|\b98\s?%\s?(ακρίβ|accuracy)|χιλιάδες (χρήστ|πελάτ|ασφαλισμ)|μας εμπιστεύ|5-1[05]%\s?έκπτωσ|€100-150|σε λιγότερο από (\d+|ένα|μία|δύο) (λεπτ|δευτερόλεπτ)/i
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
const trigramCache = new Map<string, Set<string>>()
function similarity(a: string, b: string): number {
    const g = (t: string) => {
        const cached = trigramCache.get(t)
        if (cached) return cached
        const s = t.toLowerCase().replace(/\s+/g, ' ')
        const out = new Set<string>()
        for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3))
        trigramCache.set(t, out)
        return out
    }
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

/**
 * PW-CONTENT-02 — the two PUBLIC-SITE guards that the corpus-wide arms above cannot be.
 *
 * Universe: every file of the public marketing surface, ENUMERATED from the tree
 * (not a list of known files): app/(public), app/auth, components/landing|public|pricing,
 * src/design-system, lib/marketing|landing|product|seo|guides|glossary, the public pricing
 * content, the root layout, /llms.txt, and every static asset under public/ that carries
 * text (manifest.json, *.svg, *.txt, *.json). A retired positioning line survived 2026-10-21
 * in a static SVG that nothing referenced and in a PWA manifest no source scan reaches.
 *
 *  - POSITIONING LINT (H-022): one positioning line,
 *    «Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων». The risk-intelligence / risk-check /
 *    «αν είστε καλυμμένοι» family is a verdict claim about the user's protection and is banned.
 *    Probe: tests/fixtures/guard-probes/voice-positioning-variant.ts.txt.
 *  - LOCALE NUMBER FORMAT (A4): Greek money reads «35.000 €»; English reads «€35,000».
 *    A Greek literal with a prefixed «€», an English literal with Greek grouping, and the
 *    in-app `formatEur` on a public route are all findings. The corpus arm above only caught
 *    English thousands separators inside Greek text — so «€4.99» in Greek passed.
 *    Probe: tests/fixtures/guard-probes/voice-number-literal.tsx.txt.
 */
const PUBLIC_DIRS = ['app/(public)', 'app/auth', 'components/landing', 'components/public', 'components/pricing', 'src/design-system', 'lib/marketing', 'lib/landing', 'lib/product', 'lib/seo', 'lib/guides', 'lib/glossary']
const PUBLIC_FILES = ['lib/pricing/public-pricing-content.ts', 'lib/pricing/pricing-view-model.ts', 'app/layout.tsx', 'app/llms.txt/route.ts']
function walkAll(dir: string, exts: RegExp): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (EXCLUDE.test(p + '/')) return []
        return statSync(p).isDirectory() ? walkAll(p, exts) : exts.test(name) ? [p] : []
    })
}
// lib/i18n/*.ts modules that PUBLIC code imports (how-it-works, presentation, homepage-panels, …) are public marketing copy.
// The el/en bundles under lib/i18n/translations and the app's own modules (prevention, …) are the app's: the in-app arms scan those.
const PUBLIC_NON_I18N = [...PUBLIC_DIRS.flatMap((d) => walkAll(d, /\.tsx?$/)), ...PUBLIC_FILES.filter(existsSync)]
const PUBLIC_I18N = readdirSync('lib/i18n').filter((n) => /\.tsx?$/.test(n)).map((n) => join('lib/i18n', n)).filter((f) => {
    const mod = f.replace(/\.tsx?$/, '').replace(/\\/g, '/')
    return PUBLIC_NON_I18N.some((g) => readFileSync(g, 'utf-8').includes(`@/${mod}"`))
})
const PUBLIC_CODE = [...PUBLIC_NON_I18N, ...PUBLIC_I18N]
const PUBLIC_STATIC = walkAll('public', /\.(svg|json|txt|webmanifest)$/)
function positioningOffenders(path: string, text: string): string[] {
    return text.split('\n').flatMap((line, i) => (POSITIONING_BANNED.test(line) ? [`${path}:${i + 1}  ${line.trim().slice(0, 110)}`] : []))
}
function stringLiterals(src: string): string[] {
    return src.match(/"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\\n])*'/g) || []
}
const greekShare = (s: string) => {
    const letters = s.match(/[A-Za-zͰ-Ͽἀ-῿]/g) || []
    return letters.length ? (s.match(/[Ͱ-Ͽἀ-῿]/g) || []).length / letters.length : 0
}
function numberOffenders(path: string, text: string): string[] {
    const bad: string[] = []
    if (!path.endsWith('pricing-view-model.ts') && /\bformatEur\b/.test(text)) bad.push(`${path}  imports the in-app formatEur — public prices go through formatPlanPrice`)
    for (const lit of stringLiterals(text)) {
        const greek = greekShare(lit) >= 0.5
        if (greek && /€\s?\d/.test(lit)) bad.push(`${path}  Greek literal with prefixed €: ${lit.slice(0, 80)}`)
        // a literal with no letters at all (a table cell: "40.000 €") is language-neutral — only prose is classified
        if (!greek && /[A-Za-z]/.test(lit) && /€\s?\d{1,3}\.\d{3}(?!\d)|\d{1,3}\.\d{3}\s?€/.test(lit)) bad.push(`${path}  English literal with Greek grouping: ${lit.slice(0, 80)}`)
    }
    return bad
}

describe('PW-CONTENT-02 positioning lint — one line, no protection-verdict variants (H-022)', () => {
    it('the public universe is large enough to mean something', () => {
        expect(PUBLIC_CODE.length).toBeGreaterThan(150)
        expect(PUBLIC_STATIC.some((f) => f.endsWith('manifest.json'))).toBe(true)
    })
    it('no retired positioning variant on a public route, in metadata, or in a static asset', () => {
        const bad = [
            ...PUBLIC_CODE.flatMap((f) => positioningOffenders(f, code(readFileSync(f, 'utf-8')))),
            ...PUBLIC_STATIC.flatMap((f) => positioningOffenders(f, readFileSync(f, 'utf-8'))),
        ]
        expect(bad, `positioning-variant hits (metric M-P) = ${bad.length}:\n${bad.join('\n')}`).toEqual([])
    })
    it('probe — the retired variants turn it red (9 lines)', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/voice-positioning-variant.ts.txt', 'utf-8')
        expect(positioningOffenders('probe', code(probe)).length).toBe(9)
    })
})

describe('PW-CONTENT-02 locale number format — Greek «35.000 €», English «€35,000» (A4)', () => {
    it('no public source mis-formats money (metric M-F)', () => {
        const bad = PUBLIC_CODE.flatMap((f) => numberOffenders(f, code(readFileSync(f, 'utf-8'))))
        expect(bad, `hand-formatted money literals = ${bad.length}:\n${bad.join('\n')}`).toEqual([])
    })
    it('probe — a prefixed Greek euro, Greek grouping in English, and formatEur all turn it red', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/voice-number-literal.tsx.txt', 'utf-8')
        const found = numberOffenders('probe', code(probe)).join('\n')
        expect(found).toMatch(/imports the in-app formatEur/)
        expect(found).toMatch(/Greek literal with prefixed €/)
        expect(found).toMatch(/English literal with Greek grouping/)
    })
})

/**
 * PW-CONTENT-02 (owner decision 2026-10-22) — support is EMAIL ONLY. There is no phone
 * support, no chat and no service hours, so a public route may not promise any of them:
 * a «dedicated» tier, a phone line or placeholder, an answering-hours window, "24/7".
 * Same universe as the positioning lint above. Insurer helplines inside policy content
 * (a claims number the document prints) are not a PolicyWallet promise and live outside
 * this universe (lib/insurance, lib/insurers, the wallet).
 * Probe: tests/fixtures/guard-probes/voice-support-claim.ts.txt.
 */
function supportOffenders(path: string, text: string): string[] {
    // A phone-number INPUT (type="tel", e.g. the sign-in field's format hint) is the visitor's own number, not a support promise.
    return text.split('\n').flatMap((line, i) => (SUPPORT_BANNED.test(line) && !/type="tel"/.test(line) ? [`${path}:${i + 1}  ${line.trim().slice(0, 110)}`] : []))
}
describe('PW-CONTENT-02 support lint — email only, no phone, chat, hours or «dedicated»', () => {
    it('no public route, metadata or static asset promises phone/chat/hours support', () => {
        const bad = [
            ...PUBLIC_CODE.flatMap((f) => supportOffenders(f, code(readFileSync(f, 'utf-8')))),
            ...PUBLIC_STATIC.flatMap((f) => supportOffenders(f, readFileSync(f, 'utf-8'))),
        ]
        expect(bad, `support claims PolicyWallet does not offer = ${bad.length}:\n${bad.join('\n')}`).toEqual([])
    })
    it('probe — each line of the probe turns it red (13 lines)', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/voice-support-claim.ts.txt', 'utf-8')
        expect(supportOffenders('probe', code(probe)).length).toBe(13)
    })
})

/**
 * PW-CONTENT-02 (fresh adversarial review, CRITICAL C1) — a renewal reminder is not a Plus
 * feature. Every plan receives the 30-day email (`BASIC_MILESTONES`, renewal.service.ts);
 * only the longer 90…3-day ladder is Plus and Family. Public PROSE (product steps, guides,
 * glossary) said «από το πλάνο Plus» on eleven lines the pricing-content guard cannot see,
 * and the /product page contradicted its own /pricing. Same public universe as above.
 * Probe: tests/fixtures/guard-probes/voice-reminder-attribution.ts.txt.
 */
function reminderOffenders(path: string, text: string): string[] {
    // a line that says "earlier" / names the 90-day rung attributes only the longer ladder to Plus — that part is true
    return text.split('\n').flatMap((line, i) => (REMINDER_PLUS.test(line) && !REMINDER_PLUS_EXEMPT.test(line) ? [`${path}:${i + 1}  ${line.trim().slice(0, 110)}`] : []))
}
describe('PW-CONTENT-02 plan-attribution lint — reminders are not a Plus-only feature', () => {
    it('no public prose attributes a renewal reminder to Plus', () => {
        const bad = PUBLIC_CODE.flatMap((f) => reminderOffenders(f, code(readFileSync(f, 'utf-8'))))
        expect(bad, `reminder attributed to the wrong plan = ${bad.length}:\n${bad.join('\n')}`).toEqual([])
    })
    it('probe — each probe line turns it red (6 lines, both word orders)', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/voice-reminder-attribution.ts.txt', 'utf-8')
        expect(reminderOffenders('probe', code(probe)).length).toBe(6)
    })
})


/**
 * The support lint also covers the IN-APP and EMAIL surfaces (owner: "public routes, in-app, and in
 * email templates"). Enumerated from the tree: the el/en bundles, help and plan copy, the account and
 * monetization components, the protected routes' plan screens, and every email template.
 * An insurer helpline printed from a policy is not in this universe (wallet / lib/insurance).
 */
const IN_APP_SUPPORT_DIRS = ['lib/i18n/translations', 'lib/email', 'lib/monetization', 'components/account', 'components/monetization', 'components/settings', 'app/(protected)/upgrade', 'app/(protected)/account', 'app/(protected)/agent/pricing', 'app/(protected)/help']
const IN_APP_SUPPORT_FILES = ['lib/help-content.ts', 'lib/subscription-copy.ts']
describe('PW-CONTENT-02 support lint — in-app and email surfaces', () => {
    const files = [...IN_APP_SUPPORT_DIRS.flatMap((d) => walkAll(d, /\.tsx?$/)), ...IN_APP_SUPPORT_FILES.filter(existsSync)]
    it('the universe is non-trivial', () => expect(files.length).toBeGreaterThan(40))
    it('no in-app string or email template promises phone/chat/hours/dedicated support', () => {
        const bad = files.flatMap((f) => code(readFileSync(f, 'utf-8')).split('\n').flatMap((line, i) => (IN_APP_SUPPORT_BANNED.test(line) ? [`${f}:${i + 1}  ${line.trim().slice(0, 110)}`] : [])))
        expect(bad, `in-app/email support claims = ${bad.length}:\n${bad.join('\n')}`).toEqual([])
    })
})
