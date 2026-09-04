/**
 * Localise what a server action returned.
 *
 * Every agent action fails with a CODE (`{ success: false, error: "VALIDATION_ERROR",
 * details?: [{ path, code, message }] }` — see lib/validations/agent-intake.ts
 * `validationFailure`), and the code is what the modals used to render: the
 * harness saw the literal «VALIDATION_ERROR» on the confirm step for a
 * `customer.taxId` checksum failure that belonged to the previous step.
 *
 * One helper, two outputs:
 *   - `message`      — `t.apiErrors.<camelCase(code)>`, `{placeholders}` filled
 *                      from `vars` (the action result itself carries
 *                      `current` / `limit`), `t.apiErrors.generic` for a code
 *                      the dictionary does not know;
 *   - `fieldErrors`  — one short `t.formErrors.*` line per Zod issue, keyed by
 *                      the dotted path (`customer.taxId`, `policy.startDate`),
 *                      so a form can jump to the step that owns the field and
 *                      mark the input `aria-invalid` with the message beside it.
 *
 * Issue → key: the check's own slug when the message IS one (`invalid_afm_checksum`,
 * `invalid_date`, `end_before_start`, `contact_required` → camelCase), otherwise
 * the Zod code, read with the field in mind (`invalid_format` on `email` is
 * «invalid email»; `too_small` on a text field is «required», on a number «invalid
 * number»).
 */

export type ActionErrorDetail = {
    path?: string | Array<string | number>
    code?: string
    message?: string
}

export interface DescribedActionError {
    message: string
    fieldErrors: Record<string, string>
}

type Dictionary = Record<string, string | undefined>

/** UPPER_SNAKE → camelCase, the convention the dictionaries use for codes. */
export function actionErrorKey(code: string): string {
    return code
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+([a-z0-9])/g, (_, next: string) => next.toUpperCase())
}

const SLUG = /^[a-z][a-z0-9_]*$/

/** Fields that hold a number, so a size/type issue reads as «invalid number». */
const NUMBER_FIELDS = new Set(["premiumAmount"])

function fill(template: string, vars?: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = vars?.[key]
        return value === undefined || value === null ? "" : String(value)
    })
}

function normalizePath(path: ActionErrorDetail["path"]): string {
    if (Array.isArray(path)) return path.map(String).join(".")
    return typeof path === "string" ? path : ""
}

export function fieldErrorKey(issue: ActionErrorDetail, path: string, formErrors: Dictionary): string {
    if (typeof issue.message === "string" && SLUG.test(issue.message)) {
        const slug = actionErrorKey(issue.message)
        if (formErrors[slug]) return slug
    }
    const leaf = path.split(".").pop() ?? path
    const numeric = NUMBER_FIELDS.has(leaf)
    switch (issue.code) {
        case "invalid_format":
        case "invalid_string":
            return leaf === "email" ? "invalidEmail" : "invalidFormat"
        case "too_small":
            return numeric ? "invalidNumber" : "required"
        case "too_big":
            return numeric ? "invalidNumber" : "tooLong"
        case "invalid_type":
            return numeric ? "invalidNumber" : "required"
        case "invalid_value":
        case "invalid_enum_value":
        case "invalid_union":
        case "invalid_literal":
            return "invalidChoice"
        default:
            return "invalid"
    }
}

export function describeActionError(
    t: { apiErrors?: Dictionary; formErrors?: Dictionary } | null | undefined,
    error: unknown,
    details?: ActionErrorDetail[] | null,
    vars?: Record<string, unknown> | null,
): DescribedActionError {
    const apiErrors: Dictionary = t?.apiErrors ?? {}
    const formErrors: Dictionary = t?.formErrors ?? {}

    const code = typeof error === "string" ? error : ""
    const template = code ? apiErrors[actionErrorKey(code)] : undefined
    const message = fill(template ?? apiErrors.generic ?? "", vars ?? undefined)

    const fieldErrors: Record<string, string> = {}
    for (const issue of Array.isArray(details) ? details : []) {
        if (!issue || typeof issue !== "object") continue
        const path = normalizePath(issue.path)
        // The first issue on a field is the one the agent should fix first.
        if (!path || fieldErrors[path]) continue
        const text = formErrors[fieldErrorKey(issue, path, formErrors)] ?? formErrors.invalid
        if (text) fieldErrors[path] = text
    }

    return { message, fieldErrors }
}
