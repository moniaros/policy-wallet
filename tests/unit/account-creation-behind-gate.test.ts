import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Every path that can mint an account consults the registration gate.
 *
 * The switch the owner set in Vercel is `ALLOW_REGISTRATIONS`, and the obvious
 * implementation of it — a message on the signup screen — would have closed
 * exactly one of FOUR doors. The others were the `registerUser` server action
 * (reachable with no UI at all, because every export of a "use server" file is
 * an endpoint), the OAuth/magic-link callback where the `User` row is actually
 * born, and a public magic-link endpoint with no caller in the app that lets
 * Supabase create an `auth.users` row for any address posted to it.
 *
 * So this guard does not check the signup page. It derives the universe from
 * the FILESYSTEM: anything under app/ or lib/ that calls a Supabase sign-up, an
 * OTP send, or `user.create` either imports the gate, or is named below with a
 * reason someone decided to write down. A fifth door added next month is
 * covered by a test written today.
 *
 * Probe: tests/fixtures/guard-probes/account-creation-ungated.ts.txt — copy it
 * into app/ as a .ts file and this test must go red.
 */

const ROOTS = ["app", "lib"]

/** Calls that bring an account into existence, in either system. */
const CREATION_PATTERNS = [
    /\bauth\s*\.\s*signUp\s*\(/,
    /\bsignInWithOtp\s*\(/,
    /\badmin\s*\.\s*createUser\s*\(/,
    /\bdb\s*\.\s*user\s*\.\s*create\s*\(/,
    /\bthis\s*\.\s*db\s*\.\s*user\s*\.\s*create\s*\(/,
]

const GATE_MODULE = "@/lib/auth/registration-gate"

/**
 * A real import, not a mention.
 *
 * The first probe run of this guard PASSED, because the probe's own comment
 * said the words "@/lib/auth/registration-gate" while describing what it was
 * failing to do. That is the precise failure this repo has written down twice
 * already: a guard that greps for a string grades prose. Both halves of the
 * scan below strip comments first, and this pattern demands an import
 * statement.
 */
const GATE_IMPORT = /\bimport\s[^;]*from\s*["']@\/lib\/auth\/registration-gate["']/

/** Source with line and block comments removed, so no rule can match prose. */
function code(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "")
}

/**
 * Deliberately outside the gate, each for a stated reason.
 *
 * The two agent paths are the exemption the product actually chose: pausing
 * self-serve signup must not stop an advisor from adding a client to their
 * book, and the row they create is the phantom that `signupAllowedFor` later
 * recognises as an invitation. Gating them would close the very door the
 * exemption exists to hold open.
 */
const EXEMPT: Record<string, string> = {
    "app/(protected)/agent/actions.ts":
        "Authenticated agent creating a customer they are onboarding — the invited-customer path the gate deliberately exempts, not a self-serve registration.",
    "lib/services/customer.service.ts":
        "Same: the service behind the agent's customer intake. The phantom row it writes is what signupAllowedFor reads as proof the address was invited.",
    "lib/auth/registration-gate.ts":
        "The gate itself.",
}

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        if (entry === "node_modules" || entry === ".next") return []
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) return sourceFiles(full)
        return /\.tsx?$/.test(entry) ? [full] : []
    })
}

describe("account creation is behind the registration gate", () => {
    const creators = ROOTS.flatMap(sourceFiles).filter((file) => {
        const source = code(readFileSync(file, "utf8"))
        return CREATION_PATTERNS.some((pattern) => pattern.test(source))
    })

    it("finds the call sites at all — an empty universe is a broken guard", () => {
        // The failure mode this guard is most likely to have is scanning
        // nothing and passing. Pin the known doors by name.
        expect(creators).toContain("app/auth/actions.ts")
        expect(creators).toContain("app/auth/callback/route.ts")
        expect(creators).toContain("app/api/v1/auth/magic-link/request/route.ts")
    })

    it.each(
        // Vitest needs a non-empty table; the assertion above guarantees it is.
        creators.map((file) => [file] as const)
    )("%s consults the gate, or is exempt with a reason", (file) => {
        if (EXEMPT[file]) {
            expect(EXEMPT[file].length, `${file} needs a real reason`).toBeGreaterThan(40)
            return
        }
        expect(
            GATE_IMPORT.test(code(readFileSync(file, "utf8"))),
            `${file} can create an account without asking ${GATE_MODULE}. ` +
                `Import registrationsOpen/signupAllowedFor, or add it to EXEMPT with a reason.`
        ).toBe(true)
    })
})
