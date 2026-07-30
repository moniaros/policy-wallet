/**
 * Extraction eval harness — opt-in, hits a real model.
 *
 * Runs the SAME extraction path as production (getAIService('gemini')
 * .extractPolicyData) over hand-labeled fixture PDFs and scores per-field
 * accuracy, so a prompt change can be graded instead of merged blind.
 *
 * Opt-in only — it burns tokens and needs a key. It lives OUTSIDE tests/unit,
 * so the blocking CI run (`vitest --run tests/unit`) never touches it. Run:
 *
 *   RUN_EVAL=1 GEMINI_API_KEY=... npx vitest --run tests/eval
 *   (or: npm run eval:extraction)
 *
 * Fixtures: drop `<name>.pdf` + `<name>.expected.json` into tests/eval/fixtures/.
 * Never commit real customer/copyrighted policies — use synthetic or redacted
 * documents (the fixtures dir is gitignored for *.pdf). See fixtures/README.md.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { scoreExtraction, type ExtractionExpected } from '@/lib/eval/extraction-scoring'

// The AI factory pulls in env validation and the provider SDKs — import it
// lazily inside the test so a disabled/normal run never loads (or fails on) it.
async function extract(pdfBase64: string, fileName: string) {
    const { getAIService } = await import('@/lib/services/ai/ai-service.factory')
    return getAIService('gemini').extractPolicyData({
        data: pdfBase64,
        mimeType: 'application/pdf',
        fileName,
    })
}

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(HERE, 'fixtures')
const REPORT_PATH = join(HERE, 'report.json')

const enabled = process.env.RUN_EVAL === '1'
const hasKey = !!process.env.GEMINI_API_KEY

function listFixtures(): string[] {
    if (!existsSync(FIXTURES_DIR)) return []
    return readdirSync(FIXTURES_DIR)
        .filter((f) => f.endsWith('.pdf'))
        .filter((f) => existsSync(join(FIXTURES_DIR, f.replace(/\.pdf$/, '.expected.json'))))
}

// describe.skip when disabled or unconfigured, so a normal accidental run is a
// no-op rather than a token spend or a failure.
const suite = enabled && hasKey ? describe : describe.skip

suite('extraction eval (real model)', () => {
    const fixtures = listFixtures()
    const report: Array<Record<string, unknown>> = []

    if (fixtures.length === 0) {
        it('has fixtures to grade', () => {
            throw new Error(
                `No fixtures in ${FIXTURES_DIR}. Add <name>.pdf + <name>.expected.json (see fixtures/README.md).`
            )
        })
        return
    }

    for (const pdf of fixtures) {
        const name = pdf.replace(/\.pdf$/, '')
        it(
            `extracts ${name}`,
            async () => {
                const expected = JSON.parse(
                    readFileSync(join(FIXTURES_DIR, `${name}.expected.json`), 'utf8')
                ) as ExtractionExpected
                const data = readFileSync(join(FIXTURES_DIR, pdf)).toString('base64')

                const actual = await extract(data, pdf)

                const score = scoreExtraction(expected, actual as any)
                report.push({
                    fixture: name,
                    accuracyPct: score.accuracyPct,
                    passed: score.passed,
                    total: score.total,
                    misses: score.fields.filter((f) => !f.passed),
                })

                console.log(
                    `[eval] ${name}: ${score.accuracyPct}% (${score.passed}/${score.total})` +
                        (score.fields.some((f) => !f.passed)
                            ? `  misses: ${score.fields.filter((f) => !f.passed).map((f) => f.field).join(', ')}`
                            : '')
                )

                // Assert only against an explicit per-fixture floor; default is a
                // pure measurement (floor 0) so the harness reports without failing.
                expect(score.accuracyPct).toBeGreaterThanOrEqual(expected.minAccuracyPct ?? 0)
            },
            120_000
        )
    }

    it('writes the scorecard', () => {
        const overall = report.length
            ? Math.round(report.reduce((s, r) => s + (r.accuracyPct as number), 0) / report.length)
            : 0
        writeFileSync(REPORT_PATH, JSON.stringify({ overall, fixtures: report }, null, 2) + '\n')
        console.log(`[eval] overall ${overall}% across ${report.length} fixtures → ${REPORT_PATH}`)
        expect(report.length).toBeGreaterThan(0)
    })
})
