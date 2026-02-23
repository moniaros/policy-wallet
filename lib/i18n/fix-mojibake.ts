/**
 * Repairs common UTF-8 mojibake sequences while leaving normal strings untouched.
 */
export function fixMojibakeText(value: string): string {
    if (!value || !/[\u00C3\u00CE\u00CF\u00D0\u00D1]/.test(value)) return value

    try {
        const codes = Array.from(value, (char) => char.charCodeAt(0))
        if (codes.some((code) => code > 255)) {
            return value
        }

        const bytes = new Uint8Array(codes)
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
