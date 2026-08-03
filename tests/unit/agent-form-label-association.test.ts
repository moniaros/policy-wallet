import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * QA rounds 4, 6 and 7 each turned up the SAME defect independently: a <label>
 * rendered as a sibling of its control with no htmlFor. Patching them one file
 * at a time kept finding another, so this asserts the property across the whole
 * advisor surface instead.
 *
 * An unassociated label is decorative — clicking it does nothing, and a screen
 * reader announces the control as "edit text, blank". These are the advisor's
 * data-entry surfaces: policy details, renewal outcome notes, template setup.
 *
 * A <label> is acceptable when it either carries htmlFor or WRAPS its control
 * (implicit association) — the wrapping form is used widely for checkboxes and
 * radios here and is perfectly valid.
 */

const ROOTS = ["components/agent", "components/collaboration"]
const PAGE_GLOBS = [
    "app/(protected)/renewals",
    "app/(protected)/opportunities",
    "app/(protected)/questionnaires",
    "app/(protected)/customers",
    "app/(protected)/team",
    "app/(protected)/commissions",
    "app/(protected)/insights",
]

function tsxFilesIn(dir: string): string[] {
    let out: string[] = []
    let entries: string[]
    try {
        entries = readdirSync(dir)
    } catch {
        return out
    }
    for (const entry of entries) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) out = out.concat(tsxFilesIn(full))
        else if (entry.endsWith(".tsx")) out.push(full)
    }
    return out
}

const FILES = [...ROOTS, ...PAGE_GLOBS].flatMap((d) => tsxFilesIn(join(process.cwd(), d)))

/**
 * A label is "bare" when its opening tag has no htmlFor AND it closes on the
 * same logical block without wrapping an input/select/textarea.
 *
 * Deliberately conservative: it only flags `<label ...>text</label>` on one
 * line, or a `<label` opening tag whose attributes contain no htmlFor and whose
 * next 2 lines contain no control. That is the exact shape the three real
 * defects took, and it does not fire on the wrapping pattern.
 */
function bareLabels(rawSrc: string): string[] {
    // Comments discuss <label> markup (this fix has its own commentary), and a
    // scanner that reads prose as code reports itself. Blank them out, keeping
    // line numbers intact so offsets stay meaningful.
    const src = rawSrc
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .replace(/^\s*\/\/.*$/gm, (m) => " ".repeat(m.length))

    const lines = src.split("\n")
    const found: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!/<label(\s|>)/.test(line)) continue

        // Gather the opening tag, which may span lines.
        let tag = line
        let j = i
        while (!tag.includes(">") && j < lines.length - 1) {
            j++
            tag += lines[j]
        }
        if (/htmlFor=/.test(tag)) continue

        // Wrapping form: a control appears before the closing </label>.
        const window = lines.slice(i, Math.min(i + 12, lines.length)).join("\n")
        const closeIdx = window.indexOf("</label>")
        const scope = closeIdx === -1 ? window : window.slice(0, closeIdx)
        if (/<(input|select|textarea)(\s|\/|>)/.test(scope)) continue

        found.push(`${i + 1}: ${line.trim().slice(0, 90)}`)
    }

    return found
}

describe("advisor form labels are associated with their controls", () => {
    it("covers a meaningful number of files", () => {
        // Guards against the glob silently matching nothing and the suite
        // passing vacuously.
        expect(FILES.length).toBeGreaterThan(20)
    })

    it.each(FILES.map((f) => [f.replace(process.cwd() + "/", ""), f]))(
        "%s has no bare <label>",
        (rel, full) => {
            const offenders = bareLabels(readFileSync(full, "utf8"))
            expect(
                offenders,
                `${rel} has label(s) with neither htmlFor nor a wrapped control:\n  ${offenders.join("\n  ")}`
            ).toEqual([])
        }
    )
})
