/**
 * WP-04 — a bad extraction must not be permanent.
 *
 * The cache was keyed on document CONTENT alone. The same file always hashes
 * the same, so a wrong first extraction was served back on every subsequent
 * analysis — and re-uploading the identical file to "try again", which is
 * exactly what a user does when the insurer or premium on screen is wrong,
 * returned the identical wrong answer. Improving the extraction pipeline also
 * changed nothing for any document already cached.
 *
 * Two ways out, both tested here: the extractor version invalidates entries
 * produced by logic that no longer exists, and an explicit bypass lets a user
 * force a fresh run.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const findFirst = vi.fn()
const updateMany = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        policyDocument: {
            findFirst: (...a: unknown[]) => findFirst(...a),
            updateMany: (...a: unknown[]) => updateMany(...a),
            update: vi.fn(),
        },
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

const EXTRACTION = { insurerName: "Εθνική Ασφαλιστική", premiumAmount: 420 } as any

/** A cache row written by `version`, `ageMs` ago. */
function cachedBy(version: number | undefined, ageMs = 1000) {
    findFirst.mockResolvedValue({
        extractionCache:
            version === undefined
                ? EXTRACTION // legacy shape: raw extraction, no version marker
                : { __extractorVersion: version, data: EXTRACTION },
        extractedAt: new Date(Date.now() - ageMs),
    })
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("extraction cache versioning", () => {
    it("returns an entry written by the current extractor", async () => {
        const { getCachedExtraction, EXTRACTOR_VERSION } = await import(
            "@/lib/services/analysis/extraction-cache"
        )
        cachedBy(EXTRACTOR_VERSION)

        expect(await getCachedExtraction("policy-1", "hash-1")).toEqual(EXTRACTION)
    })

    it("ignores an entry produced by an older extractor", async () => {
        const { getCachedExtraction, EXTRACTOR_VERSION } = await import(
            "@/lib/services/analysis/extraction-cache"
        )
        cachedBy(EXTRACTOR_VERSION - 1)

        // A pipeline improvement must actually reach documents already cached.
        expect(await getCachedExtraction("policy-1", "hash-1")).toBeNull()
    })

    it("ignores legacy entries that carry no version at all", async () => {
        const { getCachedExtraction } = await import("@/lib/services/analysis/extraction-cache")
        cachedBy(undefined)

        expect(await getCachedExtraction("policy-1", "hash-1")).toBeNull()
    })

    it("honours an explicit bypass without even reading the row", async () => {
        const { getCachedExtraction, EXTRACTOR_VERSION } = await import(
            "@/lib/services/analysis/extraction-cache"
        )
        cachedBy(EXTRACTOR_VERSION)

        expect(await getCachedExtraction("policy-1", "hash-1", undefined, { bypass: true })).toBeNull()
        expect(findFirst).not.toHaveBeenCalled()
    })

    it("still expires by TTL", async () => {
        const { getCachedExtraction, EXTRACTOR_VERSION } = await import(
            "@/lib/services/analysis/extraction-cache"
        )
        cachedBy(EXTRACTOR_VERSION, 25 * 60 * 60 * 1000)

        expect(await getCachedExtraction("policy-1", "hash-1")).toBeNull()
    })

    it("stamps the version when writing, so what it writes it can read back", async () => {
        const { setCachedExtraction, EXTRACTOR_VERSION } = await import(
            "@/lib/services/analysis/extraction-cache"
        )
        await setCachedExtraction("policy-1", "hash-1", EXTRACTION)

        expect(updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    extractionCache: expect.objectContaining({
                        __extractorVersion: EXTRACTOR_VERSION,
                        data: EXTRACTION,
                    }),
                }),
            })
        )
    })
})
