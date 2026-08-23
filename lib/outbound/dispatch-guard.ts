/**
 * OUTBOUND DISPATCH STUB — one decision, every transport.
 *
 * WHY THIS EXISTS, precisely.
 *
 * The previous guard keyed on the CREDENTIAL BEING ABSENT rather than on the
 * environment: `sendEmail` short-circuited only when `BREVO_API_KEY` was unset.
 * `BREVO_API_KEY` is set in `.env.local` on this machine, so on a developer's
 * laptop and in any process that loaded that file, `sendEmail` fell straight
 * through to `fetch(https://api.brevo.com/v3/smtp/email)` and mailed a real
 * person. A measurement pass that renders every outbound template to text —
 * which is exactly what the outbound-copy inventory does, and which is where
 * the protection-score leak lives — would have dispatched every one of them.
 *
 * "No real email or push is dispatched at any point" cannot depend on a
 * credential happening to be missing. It has to be structural, so the rule is
 * the ENVIRONMENT decides and the credential is irrelevant:
 *
 *   production        → send.
 *   test (vitest)     → THROW. A test that reaches a transport is a broken test.
 *                       It must fail loudly, not pass quietly having sent mail.
 *   anything else     → skip and log. Never touches the network.
 *
 * Development skips rather than throws because dev flows legitimately call the
 * send path and must stay walkable; tests throw because a test reaching here is
 * always a defect in the test.
 */

export type OutboundChannel = "email" | "push"

/** Thrown when a test run reaches a real transport. Never caught in product code. */
export class OutboundDispatchInTestError extends Error {
    constructor(channel: OutboundChannel, target: string) {
        super(
            `[outbound-guard] A test run attempted to dispatch a real ${channel} to "${target}". ` +
                `Tests must render templates, not send them. If this is a deliberate transport test, ` +
                `mock the transport — do not relax this guard.`
        )
        this.name = "OutboundDispatchInTestError"
    }
}

function isTestRun(): boolean {
    return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST)
}

/**
 * Depth counter for `withStubbedOutboundTransport`. Non-zero means the caller has
 * REPLACED the network and is deliberately exercising transport internals.
 *
 * This is the one sanctioned way past the test-run throw, and it is deliberately
 * awkward: it is scoped to a callback, it always unwinds in `finally`, and the
 * dispatch-stub guard asserts it appears nowhere outside `tests/`. A transport
 * test that forgets it fails; product code cannot reach it at all.
 */
let stubbedTransportDepth = 0

/**
 * TESTS ONLY. Declares that `globalThis.fetch` (or the equivalent transport) has
 * been replaced for the duration of `fn`, so reaching a transport is intentional
 * and cannot leave the process.
 *
 * Use this ONLY to test a transport's own behaviour — encryption, header shape,
 * status handling. Never to make a feature test that happens to send mail pass.
 */
export async function withStubbedOutboundTransport<T>(fn: () => Promise<T>): Promise<T> {
    stubbedTransportDepth += 1
    try {
        return await fn()
    } finally {
        stubbedTransportDepth -= 1
    }
}

function isProduction(): boolean {
    return process.env.NODE_ENV === "production"
}

export type DispatchDecision =
    /** Caller proceeds to the real transport. */
    | { allowed: true }
    /** Caller returns without touching the network. `reason` is for logs only. */
    | { allowed: false; reason: string }

/**
 * The single question every outbound transport asks before it opens a socket.
 *
 * @param channel which transport is about to run
 * @param target  the recipient, for the error message and the dev log. Never logged in
 *                production, and never a full address in an exception that could be
 *                captured — callers pass an already-redacted value where one exists.
 */
export function outboundDispatchAllowed(channel: OutboundChannel, target: string): DispatchDecision {
    if (isProduction()) return { allowed: true }

    if (isTestRun()) {
        if (stubbedTransportDepth > 0) return { allowed: true }
        throw new OutboundDispatchInTestError(channel, target)
    }

    return { allowed: false, reason: `non-production environment (NODE_ENV=${process.env.NODE_ENV ?? "undefined"})` }
}
