/**
 * Repairs common UTF-8 mojibake sequences such as:
 * "ÎšÎ±Î»ÏŽÏ‚" -> "Καλώς"
 * Leaves normal strings untouched.
 */
export function fixMojibakeText(value: string): string {
    if (!value || !/[ÃÎÏÐÑ]/.test(value)) return value

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

