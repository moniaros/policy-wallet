/**
 * Repairs common UTF-8 mojibake sequences while leaving normal strings untouched.
 */
export function fixMojibakeText(value: string): string {
    if (!value || !/[\u00C2-\u00D1\u0152\u0178\u017D\u2013-\u203A\u2122]/.test(value)) return value

    try {
        const CP1252_EXTENDED: Record<number, number> = {
            0x20AC: 0x80,
            0x201A: 0x82,
            0x0192: 0x83,
            0x201E: 0x84,
            0x2026: 0x85,
            0x2020: 0x86,
            0x2021: 0x87,
            0x02C6: 0x88,
            0x2030: 0x89,
            0x0160: 0x8A,
            0x2039: 0x8B,
            0x0152: 0x8C,
            0x017D: 0x8E,
            0x2018: 0x91,
            0x2019: 0x92,
            0x201C: 0x93,
            0x201D: 0x94,
            0x2022: 0x95,
            0x2013: 0x96,
            0x2014: 0x97,
            0x02DC: 0x98,
            0x2122: 0x99,
            0x0161: 0x9A,
            0x203A: 0x9B,
            0x0153: 0x9C,
            0x017E: 0x9E,
            0x0178: 0x9F,
        }

        let hasInvalidCodePoint = false
        const byteValues = Array.from(value, (char) => {
            const code = char.charCodeAt(0)
            if (code <= 0xff) return code
            if (code in CP1252_EXTENDED) return CP1252_EXTENDED[code]
            hasInvalidCodePoint = true
            return 0
        })

        if (hasInvalidCodePoint) {
            return value
        }

        const bytes = new Uint8Array(byteValues)
        const decoded = new TextDecoder("utf-8").decode(bytes)

        // If decode produced replacement chars, keep original to avoid damaging valid text.
        if (decoded.includes("\uFFFD")) return value
        return decoded
    } catch {
        return value
    }
}

const fixedObjectCache = new WeakMap<object, unknown>()

export function fixMojibakeObject<T>(value: T): T {
    if (typeof value === "string") {
        return fixMojibakeText(value) as T
    }

    if (typeof value !== "object" || value === null) {
        return value
    }

    const cached = fixedObjectCache.get(value as object)
    if (cached) {
        return cached as T
    }

    if (Array.isArray(value)) {
        const fixedArray = value.map((item) => fixMojibakeObject(item))
        fixedObjectCache.set(value, fixedArray)
        return fixedArray as T
    }

    const fixedRecord: Record<string, unknown> = {}
    fixedObjectCache.set(value, fixedRecord)

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        fixedRecord[key] = fixMojibakeObject(nestedValue)
    }

    return fixedRecord as T
}
