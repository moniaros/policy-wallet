import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { isAcceptedImageFile, isPdfFile, acceptAttribute, documentMimeType } from '@/lib/security/file-upload'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The three spellings of "I decide file formats myself": a character-class
 * regex, an endsWith chain, and an array-includes list (the third was a known
 * evasion of the first two until the Phase 6 audit added it — verified absent
 * from the live tree the day it was added).
 */
const handWrittenFormatList = (src: string) =>
    /\\\.\(jpe\?g\|png/.test(src) ||
    /endsWith\(['"]\.jpe?g['"]\)/.test(src) ||
    /\[[^\]\n]*['"]jpe?g['"][^\]\n]*\]\s*\.includes\(/.test(src)

/**
 * Three places classified a file by extension with their own hand-written list.
 * Each listed gif, bmp and svg — none of which the server accepts — and each
 * omitted heic, which it does, and which iPhones produce by default.
 *
 * The consequences ran through the whole document path: the create-policy action
 * DROPPED a HEIC upload with only a server-side warning (and since policy status
 * derives from the documents that survive, a single HEIC upload committed a
 * policy with none), the documents card labelled it "other file", and the
 * preview modal met it with "preview unavailable".
 *
 * Enabling HEIC in the upload pickers earlier on this branch made that path
 * reachable far more often, which is what surfaced it.
 */
describe('one source decides what a file is', () => {
    it('accepts every image format the upload allowlist does', () => {
        for (const name of ['policy.jpg', 'policy.jpeg', 'policy.png', 'policy.webp', 'policy.heic']) {
            expect(isAcceptedImageFile(name), name).toBe(true)
        }
    })

    it('rejects the formats the hand-written regexes invented', () => {
        for (const name of ['policy.gif', 'policy.bmp', 'policy.svg']) {
            expect(isAcceptedImageFile(name), name).toBe(false)
        }
    })

    it('separates PDFs from images', () => {
        expect(isPdfFile('policy.pdf')).toBe(true)
        expect(isAcceptedImageFile('policy.pdf')).toBe(false)
        expect(isPdfFile('policy.png')).toBe(false)
    })

    it('is case-insensitive and safe on nothing', () => {
        expect(isAcceptedImageFile('POLICY.HEIC')).toBe(true)
        expect(isPdfFile('POLICY.PDF')).toBe(true)
        expect(isAcceptedImageFile(null)).toBe(false)
        expect(isPdfFile(undefined)).toBe(false)
    })

    it('agrees with what the pickers offer', () => {
        const accept = acceptAttribute('policy')
        for (const ext of ['.jpg', '.png', '.webp', '.heic']) {
            expect(accept).toContain(ext)
            expect(isAcceptedImageFile(`x${ext}`)).toBe(true)
        }
    })

    it('no component or action hand-writes an image extension list', () => {
        const offenders: string[] = []
        for (const f of [
            ...globSync('components/**/*.tsx'),
            ...globSync('app/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('lib/**/*.ts'),
        ]) {
            if (f.endsWith('lib/security/file-upload.ts')) continue
            if (handWrittenFormatList(strip(readFileSync(f, 'utf-8')))) offenders.push(f)
        }
        expect(offenders, `hand-written format lists:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the create-policy action gates on the shared helpers', () => {
        const src = strip(readFileSync('app/(protected)/wallet/actions.ts', 'utf-8'))
        // The helpers, yes — but fed the SERVER-MINTED STORAGE KEY. This used to
        // pin `isPdfFile(fileName)`, and `fileName` stopped being a file name
        // when documents started getting generated labels: the check then failed
        // for every document and the add-policy flow committed policies with
        // none. Pinning the literal is what let that ship, so assert the
        // property and forbid the variable that cannot carry an extension.
        expect(src).toMatch(/const hasValidExt = isPdfFile\(storageKey\) \|\| isAcceptedImageFile\(storageKey\)/)
        expect(src).not.toMatch(/const hasValidExt = [^\n]*\bfileName\b/)
    })
})

/**
 * The chain completed. Pickers now offer HEIC, storage accepts it, the create
 * path keeps it — and both AI paths then declared it `application/pdf`, their
 * default fallback, because neither if-chain knew the format. The model received
 * bytes that did not match the declared type, so extraction had nothing to read
 * and the policyholder was left with an analysis that "did not finish cleanly".
 *
 * Enabling HEIC in the pickers earlier on this branch is what made this
 * reachable. Fixing the picker alone would have made iPhone uploads possible AND
 * broken.
 */
describe('the AI is told what the document actually is', () => {
    it('declares HEIC as HEIC, not as a PDF', () => {
        expect(documentMimeType('policy.heic')).toBe('image/heic')
        expect(documentMimeType('policy.HEIC')).toBe('image/heic')
    })

    it('still resolves the formats the old chains covered', () => {
        expect(documentMimeType('a.pdf')).toBe('application/pdf')
        expect(documentMimeType('a.jpg')).toBe('image/jpeg')
        expect(documentMimeType('a.jpeg')).toBe('image/jpeg')
        expect(documentMimeType('a.png')).toBe('image/png')
        expect(documentMimeType('a.webp')).toBe('image/webp')
    })

    it('keeps the PDF default for an unrecognised name', () => {
        expect(documentMimeType('a.unknown')).toBe('application/pdf')
        expect(documentMimeType(null)).toBe('application/pdf')
    })

    it('every format a policy upload accepts resolves to its own type', () => {
        // The failure mode was a format falling through to the default. Nothing
        // in the allowlist may resolve to PDF except an actual PDF.
        for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.heic']) {
            expect(documentMimeType(`policy${ext}`), ext).not.toBe('application/pdf')
        }
    })

    it('the AI path does not hand-roll the mapping', () => {
        // There is ONE path that sends a document to a model. Until Aug 2026
        // there were two, and this test covered both; the second
        // (GapAnalysisService.analyzePolicy) was an unreachable third gap
        // pipeline and has been deleted, so it no longer has — or needs — a MIME
        // mapping of its own.
        const f = 'lib/services/analysis/policy-analysis-orchestrator.service.ts'
        const src = strip(readFileSync(f, 'utf-8'))
        expect(src, f).toMatch(/documentMimeType\(/)
        expect(src, f).not.toMatch(/mimeType = ["']image\/jpeg["']/)
    })

    it('the deleted service has not quietly regrown an AI call', () => {
        // If a document ever reaches a model from here again, it needs the
        // shared mapping and its own place in the test above.
        const src = strip(readFileSync('lib/services/gap-analysis.service.ts', 'utf-8'))
        expect(src).not.toMatch(/aiService\.|getAIService\(/)
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the hand-list matcher against the shapes
 * the docstring records (each hand-written list knew gif/bmp/svg and not
 * heic), the includes-list evasion, and the shared-helper calls that must
 * stay silent.
 */
describe('the hand-list matcher is proven', () => {
    it('flags all three spellings of a private format list', () => {
        expect(handWrittenFormatList('const isImage = /\\.(jpe?g|png|gif|bmp|svg)$/i.test(name)')).toBe(true)
        expect(handWrittenFormatList("if (name.endsWith('.jpg') || name.endsWith('.png')) {")).toBe(true)
        expect(handWrittenFormatList("const ok = ['jpg', 'png', 'webp'].includes(ext)")).toBe(true)
    })

    it('stays silent on the shared helpers and unrelated arrays', () => {
        expect(handWrittenFormatList('const ok = isAcceptedImageFile(storageKey) || isPdfFile(storageKey)')).toBe(false)
        expect(handWrittenFormatList("const roles = ['agent', 'admin'].includes(role)")).toBe(false)
    })
})
