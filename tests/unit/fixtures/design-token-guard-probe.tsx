/**
 * Probe fixture for `tests/unit/design-token-debt.test.ts`.
 *
 * Carries one planted instance of every hex form the scanner must count and
 * one of every near-miss it must NOT count. The guard's PROBE describe block
 * scans this file and asserts the exact multiset — if that assertion ever
 * drifts, the scanner has stopped seeing literals and the guard is dead.
 *
 * Deliberately outside the guarded scope roots, so the planted literals never
 * appear in the debt list.
 */
export default function DesignTokenGuardProbe() {
    // MUST match — one of each counted form:
    const sixDigit = { color: '#ff0000' }
    const threeDigit = { color: '#f00' }
    const eightDigitAlpha = { color: '#ff000080' }
    const fourDigitAlpha = { color: '#f008' }
    const mixedCase = { color: '#AbCdEf' } // normalised to lowercase in the key

    // MUST NOT match — each is a reason in the scanner's bounds checks:
    const nonColours = [
        '&#8211;', // HTML character reference, not a colour
        '#12345', // 5 hex chars is no CSS colour form
        '#834957c', // 7 chars — a git SHA fragment, not a colour
        '#deadbeefs', // hex run bounded by a trailing word character
        'x#fff', // preceded by a word character (mid-token)
        '##fff', // doubled hash
    ]

    return (
        <div
            style={sixDigit}
            data-three={threeDigit.color}
            data-eight={eightDigitAlpha.color}
            data-four={fourDigitAlpha.color}
            data-mixed={mixedCase.color}
            data-non-colours={nonColours.length}
        />
    )
}
