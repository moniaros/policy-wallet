/**
 * Machine-readable mirror of docs/growth/HOOKS.md — the canonical hook
 * register for GROWTH-HOOKS-01.
 *
 * THE REGISTER DECIDES; THIS FILE ONLY CARRIES. Every render site references
 * a row here by id, and copy is never written inline at a render site.
 * `tests/unit/hook-length.test.ts` parses the HOOKS.md live-hooks table and
 * fails if this module drifts from it in any field — id set, line text,
 * character counts, guide href, source ids — so retyping a hook here without
 * updating the register (or vice versa) is a red CI, not a silent fork.
 *
 * Character budget: ≤72 GREEK CHARACTERS, measured in Unicode code points
 * ([...str].length), never UTF-8 bytes — Greek is two bytes a letter and a
 * byte count would flag lines the viewport renders comfortably.
 */

export type HookAudience = "b2c" | "b2b"

export interface GrowthHook {
    /** Row id in docs/growth/HOOKS.md — H1, H3, H4, H6. */
    id: string
    audience: HookAudience
    /** The hook line, both languages. Questions about the reader's own
     *  situation, never statements about their policy (§2.2). */
    line: { el: string; en: string }
    /** Code-point counts as stated in the register; the guard re-measures. */
    chars: { el: number; en: number }
    /** The guide this hook opens. */
    guideHref: string
    /** Verified source ids in docs/growth/SOURCES.md. */
    sourceIds: readonly string[]
}

/** The budget the register states, exported so guards and tools share it. */
export const HOOK_LINE_MAX_CODEPOINTS = 72

/** Code points, not bytes — the only legal way to measure a hook line. */
export function hookLineLength(line: string): number {
    return [...line].length
}

/** Live B2C hooks — H1, H3, H4, H6. Order is the register's order. */
export const GROWTH_HOOKS: readonly GrowthHook[] = [
    {
        id: "H1",
        audience: "b2c",
        line: {
            el: "Σε ποια αξία ασφαλίστηκε το σπίτι σας: αντικειμενική ή ανακατασκευής;",
            en: "Is your home insured for its tax value or its rebuild cost?",
        },
        chars: { el: 69, en: 59 },
        guideHref: "/guides/analogikos-kanonas-ypasfalisi-katoikias",
        sourceIds: ["SRC-001", "SRC-002", "SRC-003", "SRC-004"],
    },
    {
        id: "H3",
        audience: "b2c",
        line: {
            el: "Ξέρει η ασφάλισή σας ότι το ακίνητο μισθώνεται βραχυχρόνια;",
            en: "Does your insurer know the property is let short-term?",
        },
        chars: { el: 59, en: 54 },
        guideHref: "/guides/vraxychronia-misthosi-asfalisi-katoikias",
        sourceIds: ["SRC-005", "SRC-006", "SRC-007", "SRC-008"],
    },
    {
        id: "H4",
        audience: "b2c",
        line: {
            el: "Ήταν το όχημά σας ασφαλισμένο την ημέρα της διασταύρωσης;",
            en: "Was your vehicle insured on the day of the cross-check?",
        },
        chars: { el: 57, en: 55 },
        guideHref: "/guides/prostimo-anasfalistou-oximatos",
        sourceIds: ["SRC-009", "SRC-010", "SRC-011", "SRC-012"],
    },
    {
        id: "H6",
        audience: "b2c",
        line: {
            el: "Πόσο από τη ζημιά καλύπτει ο ΕΛΓΑ και πόσο μένει σε εσάς;",
            en: "How much of the loss does ELGA actually cover?",
        },
        chars: { el: 57, en: 46 },
        guideHref: "/guides/elga-apozimiosi-kai-pragmatiko-kostos",
        sourceIds: ["SRC-014", "SRC-015", "SRC-016"],
    },
]

/**
 * B2B set: EMPTY, per the register. H9 and H10 were cut in Track B, so there
 * is no B2B ticker on /solutions/agents or /pricing?audience=agent in this
 * goal — an empty rotator is worse than none. The guard asserts this stays
 * empty until docs/growth/HOOKS.md carries a live b2b row.
 */
export const GROWTH_HOOKS_B2B: readonly GrowthHook[] = []
