import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * token-contrast-contract — the contrast ratchet.
 *
 * WHY THIS EXISTS, stated as the problem it replaces. The landing surface
 * carried `text-[#29685B] dark:text-[#A7F3D0]` in four files. Both halves
 * were correct and neither said so: #29685B measures 2.74:1 on the dark page
 * (unusable) and #A7F3D0 measures 13.92:1 there, so the second literal was
 * never a stylistic variant — it was the contrast fix, stored as a magic
 * string. That is the failure mode a token migration can WORSEN rather than
 * fix: putting a token on the light side and leaving a literal on the dark one
 * yields a governed light theme and an ungoverned dark one, and the drift goes
 * unnoticed because token work gets reviewed in light mode.
 *
 * So the naming carries the contract. A token whose name ends in `-on-light`
 * or `-on-dark` is claiming "this is the accessible value of this role when
 * the surface is that". This file makes the claim checkable.
 *
 * THE UNIVERSE IS ENUMERATED FROM THE FILE, never from a list here. Every
 * `--*-on-light:` / `--*-on-dark:` declaration in `app/globals.css` is pulled
 * out, its paired surface resolved from the same file, the WCAG 2.x ratio
 * measured, and the floor enforced. A NEW token of either shape that carries
 * no annotation fails — omission is not an opt-out, which is the difference
 * between a contract and a convention. Its sibling
 * `tests/unit/contrast-tokens.test.ts` pins specific historical regressions by
 * name; this one is the general rule, and it is the one that scales to the 81
 * files still on the literal-debt list.
 *
 * FLOORS. 4.5:1 for text (SC 1.4.3 AA) is the default. 3:1 is available for
 * non-text UI (SC 1.4.11) and must be spelled `(non-text)` on the same line,
 * so taking the lower floor is a visible decision in the diff rather than a
 * quiet one. No other value is accepted — a floor of `2` is not a judgement
 * call, it is an opt-out with extra steps.
 *
 * WHAT IT DOES NOT COVER, stated rather than implied:
 *   - tokens NOT named `-on-light` / `-on-dark`. Most of the token table is
 *     theme-swapped (`:root` value, `.dark` override) and has no surface in
 *     its name to measure against; those are the sibling file's business.
 *   - composited alpha values. The parser refuses non-hex outright instead of
 *     skipping, because a skipped token is an ungoverned token — so an rgba
 *     role token has to be expressed as hex or excluded on purpose.
 *   - whether a component actually USES the token. That is
 *     `design-token-debt.test.ts` (no new literals) plus the rendered
 *     screenshots; a token can be perfect and unreferenced.
 *
 * PROBE. `tests/unit/fixtures/token-contrast-probe.css` plants one token per
 * rejection branch and the PROBE block asserts each one red through the same
 * parser. Without it this file would be a guard nobody has seen fail.
 */

const GLOBALS = 'app/globals.css'
const PROBE = 'tests/unit/fixtures/token-contrast-probe.css'

const TEXT_FLOOR = 4.5
const NON_TEXT_FLOOR = 3

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const linear = channels.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)]
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const HEX = /^#[0-9a-fA-F]{6}$/

interface Claim {
    token: string
    value: string
    /** null when the declaration carries no `@on … @min …` annotation. */
    annotation: { surface: string; floor: number; nonText: boolean } | null
    raw: string
}

/**
 * Every `--<role>-on-<light|dark>` declaration, with whatever annotation sits
 * on the same line. Deliberately shape-driven rather than name-driven: adding
 * a token is enough to enrol it.
 */
function collectClaims(css: string): Claim[] {
    const out: Claim[] = []
    const decl = /^\s*(--[a-z0-9-]*-on-(?:light|dark))\s*:\s*([^;]+);(.*)$/gim
    for (const m of css.matchAll(decl)) {
        const [, token, rawValue, trailing] = m
        const annotated = trailing.match(/@on\s+(--[a-z0-9-]+)\s+@min\s+([0-9.]+)/i)
        out.push({
            token,
            value: rawValue.trim(),
            annotation: annotated
                ? {
                      surface: annotated[1],
                      floor: Number(annotated[2]),
                      nonText: /\(non-text\)/i.test(trailing),
                  }
                : null,
            raw: m[0].trim(),
        })
    }
    return out
}

/** Resolve a plain token declaration to its literal value, from the same file. */
function resolveToken(css: string, token: string): string | null {
    const m = css.match(new RegExp(`^\\s*${token}\\s*:\\s*([^;]+);`, 'm'))
    return m ? m[1].trim() : null
}

/**
 * The single verdict function. Returns [] for a conforming token and one
 * message per broken rule otherwise, so the probe can assert on the reason
 * rather than merely on redness.
 */
function violations(css: string, claim: Claim): string[] {
    const problems: string[] = []

    if (!claim.annotation) {
        problems.push(
            `${claim.token} is named as a surface-specific value but declares no contrast contract. ` +
                `Add \`/* @on --surface-light|--surface-dark @min 4.5 */\` (or \`@min 3 (non-text)\`).`
        )
        return problems
    }

    const { surface, floor, nonText } = claim.annotation

    if (floor !== TEXT_FLOOR && floor !== NON_TEXT_FLOOR) {
        problems.push(
            `${claim.token} declares @min ${floor}, which is neither the ${TEXT_FLOOR} text floor ` +
                `(SC 1.4.3) nor the ${NON_TEXT_FLOOR} non-text floor (SC 1.4.11).`
        )
    }
    if (floor === NON_TEXT_FLOOR && !nonText) {
        problems.push(
            `${claim.token} takes the ${NON_TEXT_FLOOR}:1 floor without declaring \`(non-text)\`. ` +
                `The lower floor is for UI components, not for text, and choosing it has to be visible.`
        )
    }

    const surfaceValue = resolveToken(css, surface)
    if (!surfaceValue) {
        problems.push(`${claim.token} pairs against ${surface}, which is not declared in this file.`)
        return problems
    }
    if (!HEX.test(claim.value) || !HEX.test(surfaceValue)) {
        problems.push(
            `${claim.token} (${claim.value}) or its surface ${surface} (${surfaceValue}) is not a 6-digit ` +
                `hex. The contract refuses what it cannot measure rather than skipping it — express it as ` +
                `hex, or do not name it \`-on-light\`/\`-on-dark\`.`
        )
        return problems
    }

    const measured = contrast(claim.value, surfaceValue)
    if (measured < floor) {
        problems.push(
            `${claim.token} (${claim.value}) measures ${measured.toFixed(2)}:1 on ${surface} ` +
                `(${surfaceValue}) — below its declared ${floor}:1 floor.`
        )
    }
    return problems
}

const css = readFileSync(GLOBALS, 'utf-8')
const claims = collectClaims(css)

describe('every surface-specific token holds its declared contrast floor', () => {
    it('the scan finds the tokens — a silent zero would pass vacuously', () => {
        expect(
            claims.length,
            'no `--*-on-light` / `--*-on-dark` tokens found in app/globals.css — the scanner has ' +
                'stopped matching, so every assertion below is vacuous'
        ).toBeGreaterThanOrEqual(6)
    })

    it('both page surfaces are declared, and only in :root', () => {
        for (const surface of ['--surface-light', '--surface-dark']) {
            const declarations = css.match(new RegExp(`^\\s*${surface}\\s*:`, 'gm')) ?? []
            expect(
                declarations.length,
                `${surface} must be declared exactly once. A theme-swapped surface makes every ` +
                    `pairing below ambiguous — the point of these two is that they do not move.`
            ).toBe(1)
        }
    })

    it('no token is measured against a surface that itself flips per theme', () => {
        // `.dark` re-points the RESOLVED roles (--brand-accent, --dot-track);
        // it must never re-point a `-on-*` value or a surface, or the measured
        // pair stops describing what renders.
        const darkBlock = css.slice(css.indexOf('\n.dark {'))
        const end = darkBlock.indexOf('\n}')
        const inDark = darkBlock.slice(0, end)
        const offenders = [...inDark.matchAll(/^\s*(--[a-z0-9-]*-on-(?:light|dark)|--surface-(?:light|dark))\s*:/gim)].map(
            (m) => m[1]
        )
        expect(
            offenders,
            'these are overridden inside `.dark`, so the value the contract measures is not the value ' +
                'that renders in dark mode'
        ).toEqual([])
    })

    it('each one passes, measured', () => {
        const failures = claims.flatMap((claim) => violations(css, claim))
        expect(failures, `\n  - ${failures.join('\n  - ')}\n`).toEqual([])
    })

    it('reports the measured ratios, so the numbers live in the run and not in a comment', () => {
        const measured = claims
            .filter((c) => c.annotation && HEX.test(c.value))
            .map((c) => {
                const surface = resolveToken(css, c.annotation!.surface)!
                return `${c.token} ${c.value} on ${c.annotation!.surface} = ${contrast(c.value, surface).toFixed(2)}:1 (floor ${c.annotation!.floor})`
            })
        // Not an assertion on the values — an assertion that every enrolled
        // token produced a number at all.
        expect(measured.length).toBe(claims.length)
    })
})

describe('PROBE — the contract has been seen to fail, per branch', () => {
    const probeCss = readFileSync(PROBE, 'utf-8')
    const probeClaims = collectClaims(probeCss)
    const verdict = (token: string) => {
        const claim = probeClaims.find((c) => c.token === token)
        expect(claim, `probe fixture no longer declares ${token}`).toBeDefined()
        return violations(probeCss, claim!)
    }

    it('the probe is not in the guarded file', () => {
        expect(collectClaims(css).map((c) => c.token).some((t) => t.startsWith('--probe-'))).toBe(false)
    })

    it('catches a value that fails its floor', () => {
        expect(verdict('--probe-fails-ratio-on-dark').join(' ')).toMatch(/2\.74:1 on --surface-dark/)
    })

    it('catches a missing annotation — omission is not an opt-out', () => {
        expect(verdict('--probe-unannotated-on-dark').join(' ')).toMatch(/declares no contrast contract/)
    })

    it('catches a surface that does not exist', () => {
        expect(verdict('--probe-unknown-surface-on-light').join(' ')).toMatch(/not declared in this file/)
    })

    it('catches an invented floor', () => {
        expect(verdict('--probe-invented-floor-on-light').join(' ')).toMatch(/neither the 4\.5 text floor/)
    })

    it('catches a text token quietly taking the non-text floor', () => {
        expect(verdict('--probe-silent-downgrade-on-light').join(' ')).toMatch(/without declaring `\(non-text\)`/)
    })

    it('refuses a non-hex value rather than skipping it', () => {
        expect(verdict('--probe-non-hex-on-dark').join(' ')).toMatch(/not a 6-digit hex/)
    })

    it('applies the 3:1 floor to a declared non-text token', () => {
        expect(verdict('--probe-fails-nontext-on-light').join(' ')).toMatch(/2\.56:1 .* below its declared 3:1/)
    })

    it('and passes the one token that is right, so it is not red unconditionally', () => {
        expect(verdict('--probe-passes-on-dark')).toEqual([])
    })
})
