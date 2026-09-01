/**
 * The single owner of "this policy has no real identity yet".
 *
 * A policy row is created BEFORE extraction knows the insurer or the policy
 * number, so those NOT NULL columns are filled with placeholders. Three
 * separate layers mint them:
 *
 *   1. the wallet add form, when the optional fields are left blank
 *      (`__PENDING_EXTRACTION__`, `PENDING-<epoch>`)
 *   2. `PolicyService.uploadAndParse`, for the single-file upload path
 *      (`AI Analyzing...`, `PENDING-<uuid8>`)
 *   3. the AI providers themselves, which substitute `Unknown Insurer` /
 *      `PENDING-<epoch>` for an empty extraction — on a SUCCESSFUL run. A
 *      policy whose PDF simply never printed its number therefore carries a
 *      placeholder as its final, permanent value.
 *
 * Because of (3) a placeholder is not only a failure artifact, and cleaning up
 * failed policies does not make these strings unreachable. They have to be
 * unrenderable at the display layer too.
 *
 * Every screen used to re-implement the check inline, so each new screen
 * shipped with the hole open again — the wallet notice list rendered
 * "Αυτοκίνητο · __PENDING_EXTRACTION__" to a customer. This module is the only
 * place allowed to know the literals; `tests/unit/policy-sentinels-unrenderable.test.tsx`
 * fails the build if another file learns them.
 */

import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { isUnreadableValue } from '@/lib/wallet/unreadable-value'

/** Insurer-name placeholders, in every form any layer has ever written. */
export const PLACEHOLDER_INSURER_NAMES: readonly string[] = [
    '__PENDING_EXTRACTION__',
    'AI Analyzing...',
    'Unknown Insurer',
    // The Greek rendering the provider prompt occasionally returns instead of
    // the English one.
    'Άγνωστος ασφαλιστής',
]

/** Every synthetic policy number starts with this. */
export const PLACEHOLDER_POLICY_NUMBER_PREFIX = 'PENDING-'

/**
 * Every literal a rendered surface must never contain. Used by the guard test
 * and by {@link containsPlaceholderText}.
 */
export const POLICY_IDENTITY_PLACEHOLDERS: readonly string[] = [
    ...PLACEHOLDER_INSURER_NAMES,
    PLACEHOLDER_POLICY_NUMBER_PREFIX,
]

function normalized(value: string | null | undefined): string {
    return String(value ?? '').trim()
}

export function isPlaceholderInsurerName(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return true
    return PLACEHOLDER_INSURER_NAMES.some(
        (placeholder) => placeholder.toLowerCase() === text.toLowerCase()
    )
}

export function isPlaceholderPolicyNumber(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return true
    return text.toUpperCase().startsWith(PLACEHOLDER_POLICY_NUMBER_PREFIX)
}

/**
 * True when NOTHING about this policy's identity came from a human — both the
 * insurer and the number are placeholders.
 *
 * This is the discard predicate. A policy an agent typed an insurer into holds
 * real work and is never thrown away on a provider timeout; a policy that is
 * pure placeholder holds nothing a re-upload would not reproduce.
 */
export function hasPlaceholderIdentity(policy: {
    insurerName?: string | null
    policyNumber?: string | null
}): boolean {
    return (
        isPlaceholderInsurerName(policy.insurerName) &&
        isPlaceholderPolicyNumber(policy.policyNumber)
    )
}

/** Does this already-composed string leak a placeholder to the user? */
export function containsPlaceholderText(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return false
    return POLICY_IDENTITY_PLACEHOLDERS.some((placeholder) =>
        text.toUpperCase().includes(placeholder.toUpperCase())
    )
}

/**
 * The insurer name to show, or `fallback` (a localized branch label, the
 * uploaded file name — the caller owns the wording, this module owns the
 * decision). Returns `''` when there is nothing safe to show, so a bare
 * `{displayInsurerName(x)}` renders empty rather than a sentinel.
 */
export function displayInsurerName(
    value: string | null | undefined,
    fallback?: string | null
): string {
    if (isPlaceholderInsurerName(value)) return normalized(fallback)
    return normalized(value)
}

/**
 * The insurer's initials for the row tile — at most two letters, or `null`.
 *
 * `null` whenever the name is a placeholder or too short to abbreviate, and
 * never a `?`: that glyph belongs to the `review` state chip, and a tile that
 * borrowed it would look like a verdict about the policy rather than a gap in
 * what we know about the insurer.
 */
export function insurerInitials(value: string | null | undefined): string | null {
    const name = displayInsurerName(value)
    if (!name) return null
    const words = name.split(/\s+/).filter((w) => /\p{L}/u.test(w))
    if (words.length === 0) return null
    const letters = words
        .slice(0, 2)
        .map((w) => [...w].find((c) => /\p{L}/u.test(c)) ?? "")
        .join("")
    return letters ? letters.toLocaleUpperCase("el-GR") : null
}

/**
 * The policy number to show, or `null`. Never a fallback: an invented number
 * next to a real insurer reads as data, and a wrong policy number is worse
 * than a missing one.
 */
export function displayPolicyNumber(value: string | null | undefined): string | null {
    if (isPlaceholderPolicyNumber(value)) return null
    return normalized(value)
}

/**
 * An uploaded file name, tidied into something usable as a label — the
 * fallback the customer actually recognizes when extraction produced no
 * insurer ("ΑΣΦΑΛΙΣΤΗΡΙΟ 2026.pdf" → "ΑΣΦΑΛΙΣΤΗΡΙΟ 2026"). Returns `''` for
 * nothing usable so it composes with {@link displayInsurerName}.
 */
export function fileNameLabel(fileName: string | null | undefined): string {
    const text = normalized(fileName)
    if (!text) return ''
    return text.replace(/\.[A-Za-z0-9]{1,8}$/, '').replace(/[_-]+/g, ' ').trim()
}

export interface PolicyIdentityView {
    /** Safe insurer label — `fallback` when the stored value is a placeholder. */
    insurerName: string
    /** Safe policy number, or `null`. */
    policyNumber: string | null
    /** True when either half is still a placeholder (drives "analyzing" hints). */
    isPending: boolean
}

export function policyIdentityView(
    policy: { insurerName?: string | null; policyNumber?: string | null },
    fallback?: string | null
): PolicyIdentityView {
    return {
        insurerName: displayInsurerName(policy.insurerName, fallback),
        policyNumber: displayPolicyNumber(policy.policyNumber),
        isPending:
            isPlaceholderInsurerName(policy.insurerName) ||
            isPlaceholderPolicyNumber(policy.policyNumber),
    }
}

/**
 * "Interamerican (POL-123)" / "Interamerican" / "POL-123" / `fallback`.
 * The one way to name a policy inside a sentence.
 */
export function policyLabel(
    policy: { insurerName?: string | null; policyNumber?: string | null },
    fallback = ''
): string {
    const insurer = displayInsurerName(policy.insurerName)
    const number = displayPolicyNumber(policy.policyNumber)
    if (insurer && number) return `${insurer} (${number})`
    return insurer || number || normalized(fallback)
}

/**
 * Last-resort scrub for an ALREADY-COMPOSED user-facing sentence.
 *
 * Applied inside `emit()` to every notification title and message, so a
 * message template that interpolates a raw column cannot leak a placeholder
 * even if it forgot to call {@link policyLabel}. Prose, not data — it removes
 * the token and tidies the punctuation left behind ("Policy PENDING-1 (Unknown
 * Insurer) was analyzed" → "Policy was analyzed").
 */
export function redactPolicyPlaceholders(text: string): string {
    if (!text) return text

    let out = text
    for (const placeholder of PLACEHOLDER_INSURER_NAMES) {
        out = out.split(placeholder).join('')
    }
    out = out.replace(/PENDING-[A-Za-z0-9]+/g, '')

    return out
        // "( )" and "()" left where an identity used to be
        .replace(/\(\s*\)/g, '')
        // a separator with nothing on one side of it
        .replace(/\s*[·•]\s*(?=[·•])/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/^[\s·•\-—]+|[\s·•\-—]+$/g, '')
        .trim()
}

// ── Person display names ─────────────────────────────────────────────────────
//
// The same defect class as the policy sentinels, one column over. `User.name`
// can hold values no layer ever meant a human to read as a name:
//
//   1. test fixtures ("E2E Policyholder", "e2e-ph-free" — tests/e2e-users.ts),
//      which exist in the dev database and greeted a signed-in owner with
//      «Καλώς ήρθατε πίσω, E2E!» (transformation candidate #6)
//   2. the signup defaults app/auth/actions.ts mints when no name was given:
//      "Agent User" and `Policyholder <last-4-digits>`
//   3. bare test tokens left by seeds ("Test", "Demo User")
//
// This module is the only place allowed to know these shapes, same rule as the
// policy placeholders above. A synthetic name renders as NOTHING — the caller
// falls back to honest copy (an un-personalised greeting, the account email, a
// role label) rather than a blank or an invented name.

/** Every synthetic person-name shape any layer writes, enumerated once. */
export const SYNTHETIC_PERSON_NAME_PATTERNS: readonly RegExp[] = [
    // Test fixtures: a standalone E2E token anywhere in the name
    // ("E2E Policyholder", "E2E Admin", "e2e-ph-free").
    /(?:^|\s)e2e(?:$|[\s\-_.@])/i,
    // Signup default for phone-only registrations: "Policyholder 1234".
    /^policyholder(?:\s|$)/i,
    // Signup default for agents who left the name blank.
    /^agent user$/i,
    // Bare test tokens. Whole-name matches only: "Maria Demopoulos" is a
    // person, "Demo User" is not.
    /^(?:test|demo|fixture|sample)(?:[\s\-_.](?:user|account|customer|agent))?$/i,
    // A fixture email address standing in for a name.
    /@policywallet\.test$/i,
]

/**
 * A fixture identifier embedded in PROSE ("…στο ασφαλιστήριο E2E-PDM-MOT-ACT»).
 * `#` is excluded on the left and digits on the right so hex colours
 * (`#E2E8F0`) never match; a real Greek or Latin word never contains a
 * standalone `e2e` token.
 */
const FIXTURE_IDENTIFIER_SOURCE =
    '(?<![\\p{L}\\p{N}#])e2e(?:[-_.@][\\p{L}\\p{N}][\\p{L}\\p{N}\\-_.@]*)*(?![\\p{L}\\p{N}])'

/** Does composed prose contain a fixture identifier (E2E, e2e-mot-001, …)? */
export function containsFixtureIdentifier(text: string | null | undefined): boolean {
    const value = String(text ?? '')
    if (!value) return false
    return new RegExp(FIXTURE_IDENTIFIER_SOURCE, 'iu').test(value)
}

/** Is this stored display name synthetic — a fixture or a signup default? */
export function isSyntheticPersonName(value: string | null | undefined): boolean {
    const text = normalized(value)
    if (!text) return true
    return SYNTHETIC_PERSON_NAME_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * The person name to show, or `fallback` (the caller owns the wording — an
 * email address, a role label, or nothing so the surrounding copy degrades to
 * its un-personalised form). Returns `''` when there is nothing safe to show,
 * so a bare `{displayPersonName(x)}` renders empty rather than a fixture token.
 */
export function displayPersonName(
    value: string | null | undefined,
    fallback?: string | null
): string {
    const text = normalized(value)
    if (
        !text ||
        isSyntheticPersonName(text) ||
        containsPlaceholderText(text) ||
        containsFixtureIdentifier(text)
    ) {
        return normalized(fallback)
    }
    return text
}

/**
 * The first name for a greeting («Καλώς ήρθατε πίσω, Νίκος!»), or `''` when
 * the stored name is synthetic or absent — the greeting then omits the name
 * entirely rather than greeting "E2E" or "Policyholder".
 */
export function firstNameLabel(value: string | null | undefined): string {
    return displayPersonName(value).split(/\s+/)[0] || ''
}

/** Remove fixture identifiers from an already-composed sentence. */
function stripFixtureIdentifiers(text: string): string {
    return text.replace(new RegExp(FIXTURE_IDENTIFIER_SOURCE, 'giu'), '')
}

/**
 * Prose scrub for a composed user-facing sentence: policy placeholders AND
 * fixture identifiers, with the punctuation tidy-up of
 * {@link redactPolicyPlaceholders}.
 */
export function scrubRenderableText(text: string): string {
    if (!text) return text
    return redactPolicyPlaceholders(stripFixtureIdentifiers(text))
}

/**
 * §6.1.3 — the boundary assertion. Call it on composed text at the last shared
 * point before it leaves for a customer (the notification email shell does).
 *
 * Development and test FAIL LOUDLY: a sentinel or fixture identifier reaching
 * this point is an upstream defect, and rendering it quietly is how
 * «PENDING-1786738708923 (__PENDING_EXTRACTION__)» reached outbound email.
 * Production DEGRADES HONESTLY: it scrubs, logs, and never crashes a page or a
 * send for a customer.
 */
export function assertRenderableText(text: string, context: string): string {
    if (!text) return text
    const leaks: string[] = []
    if (containsPlaceholderText(text)) leaks.push('a policy-identity placeholder')
    if (containsFixtureIdentifier(text)) leaks.push('a fixture identifier')
    if (leaks.length === 0) return text

    if (process.env.NODE_ENV !== 'production') {
        throw new Error(
            `[policy-identity] ${context} would render ${leaks.join(' and ')}: «${text}». ` +
                'Route the value through lib/wallet/policy-identity before it reaches a customer.'
        )
    }
    console.error(
        `[policy-identity] ${context} received ${leaks.join(' and ')}; rendered the scrubbed text instead.`
    )
    return scrubRenderableText(text)
}

/**
 * Return a copy of a policy-shaped object with its identity columns made safe
 * for rendering. Applied at the server read boundaries that hand policies to
 * client components, so a component cannot render a sentinel even if it
 * interpolates the field directly.
 *
 * `policyNumber` becomes `''` rather than `null` — the field is typed
 * non-nullable across most of the UI, and an empty string renders as nothing.
 */
export function scrubPolicyIdentity<
    T extends { insurerName?: string | null; policyNumber?: string | null },
>(policy: T, fallbackInsurer?: string | null): T {
    return {
        ...policy,
        ...(policy.insurerName !== undefined
            ? { insurerName: displayInsurerName(policy.insurerName, fallbackInsurer) }
            : {}),
        ...(policy.policyNumber !== undefined
            ? { policyNumber: displayPolicyNumber(policy.policyNumber) ?? '' }
            : {}),
    }
}

// ── Asset identifiers — «which one is this?» on a list row ──────────────────
//
// P5-wallet-01. Six near-identical wallet rows («Interamerican · Αυτοκίνητο ·
// 06/02/2027 · ΕΝΕΡΓΟ» × 6) were measured genuinely indistinguishable — the
// customer's own name for the thing insured (the plate, the address, the
// pet's name) was extracted and stored but never rendered. This section is
// the ONE place that knows which extracted field identifies a policy of a
// given line, and when that value is safe to show. Surfaces call
// `policyAssetIdentifier` (or `policyAssetIdentity` when they run their own
// unreadable-value copy) — no surface picks an `acordData` field itself.
//
// Per-line availability, verified against lib/schemas/acord-data.ts
// (docs/transformation/P5-wallet-01-identifier-availability.md):
//
//   motor family     vehicle.plateNumber          — what an owner calls the car
//   home family      property.address, SHORT FORM — the street line, not the
//                                                   full postal record
//   pet              pet.name
//   marine family    marineVessel.registryNumber
//   travel           travel.destinationScope      — weak (a scope is a
//                                                   category), but the only
//                                                   field the schema holds
//   health · life · cyber · business · pension — NO identifier exists. Every
//   candidate was examined and rejected: policyholder/insured name is the
//   account holder's own profile on every row; insuredPersons[] is a
//   role/class schedule that drops names by design; beneficiaries[].name
//   names who gets PAID, not who is covered (a δικαιούχος is not an
//   ασφαλισμένος — rendering it as the row's identity would repeat the harm
//   lib/wallet/insured-people.ts exists to prevent). These lines render
//   their current identity unchanged, and their rows may legitimately read
//   alike — an honest collision, never papered over with a wrong name.
//
// A missing, sentinel or unreadable identifier means THE ROW STANDS ALONE:
// it renders without one and is never merged with or matched to another row
// (ASSET-REFRAME-SPEC.md §3 — two policies whose plate was read as the same
// wrong string are not the same car).

export interface PolicyAssetIdentitySource {
    lineOfBusiness?: string | null
    acordData?: unknown
}

export interface PolicyAssetIdentity {
    /**
     * The identifier as stored (trimmed), INCLUDING an extractor mask like
     * «XXXX» — for surfaces with their own honest-unreadable rendering
     * (the policy head's «δεν διαβάστηκε» + source-document link). Never a
     * policy-identity sentinel: those are unrenderable everywhere.
     */
    value: string | null
    /**
     * False when the stored value is the extractor's mask for "could not
     * read this" (lib/wallet/unreadable-value.ts). Rendering the mask as
     * data makes "we hide this" and "we could not read this"
     * indistinguishable — a surface without its own unreadable copy must
     * render nothing (use {@link policyAssetIdentifier}).
     */
    readable: boolean
}

/**
 * The address SHORT FORM: the street line, before the first comma —
 * «Λεωφόρος Κηφισίας 123, Αθήνα 115 23» → «Λεωφόρος Κηφισίας 123». A list
 * row identifies the home; the full postal record belongs on the detail page.
 */
function shortAddress(address: string): string {
    const street = address.split(',')[0]?.trim()
    return street || address.trim()
}

/**
 * A home with no address still has a shape the owner recognises.
 *
 * `property.address` is the designated identifier and it is populated in NONE
 * of the home policies in either database — the schema field carries no
 * `.describe()` hint, so the extractor was never told to look for it (fixed
 * separately in `lib/schemas/acord-data.ts`). That fix cannot reach policies
 * already stored and never re-analysed, so a second, weaker discriminator is
 * used when the address is absent: «Διαμέρισμα 85 τ.μ.».
 *
 * Deliberately NOT used as a subject key — two 85 m² flats are two homes.
 */
function propertyShape(acord: Record<string, any>): string | null {
    const type = normalized(acord.property?.type)
    const sqm = acord.property?.squareMeters
    const size = typeof sqm === 'number' && sqm > 0 ? `${sqm} τ.μ.` : null
    const parts = [type, size].filter(Boolean)
    return parts.length ? parts.join(' ') : null
}

/** The one line→field map. Family = parent branch, so motorbike/truck are motor, renters is home. */
function rawAssetIdentifier(policy: PolicyAssetIdentitySource): string | null {
    const acord = (policy.acordData ?? null) as Record<string, any> | null
    if (!acord || typeof acord !== 'object') return null

    const branch = normalizeBranch(policy.lineOfBusiness)
    const family = (branch.parentId ?? branch.id).toLowerCase()
    // Commercial marine keys off the BRANCH ID, not the family. All three
    // marine_* branches carry `parentId: 'business'`, so the old
    // `family.startsWith('marine')` test could never be true and every
    // commercial marine policy fell through to `null` — dead code, while the
    // marine_hull pack was populating `marineVessel` all along. `money` shares
    // that same family, which is why this cannot simply widen to 'business'.
    const id = String(branch.id ?? '').toLowerCase()

    if (family === 'motor') return acord.vehicle?.plateNumber ?? null
    if (family === 'home') {
        const address = normalized(acord.property?.address)
        return address ? shortAddress(address) : propertyShape(acord)
    }
    if (family === 'pet') return acord.pet?.name ?? null
    if (family === 'boat' || id.startsWith('marine')) {
        return acord.marineVessel?.registryNumber ?? null
    }
    if (family === 'travel') return acord.travel?.destinationScope ?? null
    return null
}

/**
 * The full view: the stored identifier and whether it is readable. Most
 * surfaces want {@link policyAssetIdentifier} instead; this exists for the
 * one place (the policy head) that renders "could not be read" honestly and
 * therefore needs the raw value to hand to its own unreadable pipeline.
 */
export function policyAssetIdentity(policy: PolicyAssetIdentitySource): PolicyAssetIdentity {
    const text = normalized(rawAssetIdentifier(policy))
    if (!text) return { value: null, readable: true }
    // A policy-identity sentinel is unrenderable in ANY register — unlike a
    // mask, it is not "we could not read this", it is "no data ever existed".
    if (containsPlaceholderText(text)) return { value: null, readable: true }
    if (isUnreadableValue(text)) return { value: text, readable: false }
    return { value: text, readable: true }
}

/**
 * The asset identifier to render on a list row, or `null` — in which case
 * the row renders WITHOUT one and stands alone. Never a sentinel, never an
 * extractor mask, never a substitute field.
 */
export function policyAssetIdentifier(policy: PolicyAssetIdentitySource): string | null {
    const identity = policyAssetIdentity(policy)
    return identity.readable ? identity.value : null
}

export type PolicyRowIdentityKind =
    | 'asset'   // plate / address / pet name / vessel registry / destination
    | 'person'  // the insured person named on the document
    | 'number'  // the policy number, when nothing better exists
    | 'none'

export interface PolicyRowIdentity {
    /** What to render beside the line-of-business label, or null. */
    value: string | null
    kind: PolicyRowIdentityKind
}

export interface PolicyRowIdentitySource extends PolicyAssetIdentitySource {
    policyNumber?: string | null
}

/**
 * What tells THIS row apart from the one above it.
 *
 * Every row in the wallet used to read
 * «Interamerican · Αυτοκίνητο · 09/02/2027 · ΕΝΕΡΓΟ», and two policies of the
 * same line at the same insurer were indistinguishable. {@link policyAssetIdentifier}
 * answers this for lines that insure a THING; this answers it for every line.
 *
 * Precedence, and why each step is where it is:
 *
 *  1. **The asset**, when the line insures one. A plate or an address is the
 *     strongest answer because it names the thing the cover is about.
 *  2. **The insured person**, for health and life. Owner decision 2026-08-28,
 *     which overrides a written prohibition — see below.
 *  3. **The policy number**, for everything else. Not new behaviour:
 *     `BranchDetail` and `RenewalsTimelineCard` already fall back to it. This
 *     makes two local improvisations one documented rule.
 *
 * WHY THE PERSON STEP OVERRIDES A PROHIBITION, AND WHAT IT DOES NOT CLAIM.
 * `QUEUE.md`, `P5-wallet-01-identifier-availability.md` and `HALTS.md` all bar
 * person names here. Two of their reasons stand and are honoured: a
 * `beneficiaries[].name` is the δικαιούχος and not the ασφαλισμένος (the exact
 * harm `lib/wallet/insured-people.ts` exists to prevent), and `insuredPersons[]`
 * is a role schedule whose names the schema drops on purpose. Neither is used.
 *
 * The third reason was FALSE and was verified false: the docs say `insured.name`
 * is the account holder's own profile and so has "zero discriminating power by
 * construction". `extraction-enrichment.ts` builds it from the model's
 * `customerName`/`customerSurname` — read off the DOCUMENT — and performs no
 * profile lookup at all.
 *
 * The real limit is narrower and must not be overstated: those fields are
 * described to the model as the *policyholder's* name, the λήπτης, not
 * necessarily the covered person. Where one parent is λήπτης on a household's
 * whole book, every row shows that same name and nothing is disambiguated. So
 * this says WHOSE POLICY THIS IS; it does not promise that two health rows can
 * always be told apart, and the duplicate metric must not be read as if it did.
 *
 * Names go through {@link displayPersonName}, which blanks fixture and sentinel
 * values. That is hygiene, NOT a privacy control — do not cite it as one.
 */
export function policyRowIdentity(policy: PolicyRowIdentitySource): PolicyRowIdentity {
    const asset = policyAssetIdentifier(policy)
    if (asset) return { value: asset, kind: 'asset' }

    const acord = (policy.acordData ?? null) as Record<string, any> | null
    if (acord && typeof acord === 'object') {
        const branch = normalizeBranch(policy.lineOfBusiness)
        const family = (branch.parentId ?? branch.id).toLowerCase()
        if (family === 'health' || family === 'life') {
            // ONE party, in precedence order — never a union. These keys are
            // four places different pipeline versions wrote the same name, and
            // unioning them is what listed one person twice on the detail page
            // (see lib/wallet/insured-people.ts). NOT `beneficiaries`.
            const named =
                displayPersonName(acord.insured?.name) ||
                displayPersonName(acord.policyholder?.name)
            if (named) return { value: named, kind: 'person' }
        }
    }

    const number = displayPolicyNumber(policy.policyNumber)
    if (number) return { value: number, kind: 'number' }

    return { value: null, kind: 'none' }
}

/**
 * The SUBJECT key: does this policy cover the same physical thing as another?
 *
 * This is a different question from {@link policyAssetIdentifier}, which asks
 * "what tells these two ROWS apart on screen", and the two must not be
 * collapsed into one map:
 *
 *  - **Display identity** may be coarse. «Ευρώπη» is a perfectly good label for
 *    telling two travel rows apart in a list.
 *  - **Subject identity** must be exact, because a match here asserts that two
 *    contracts insure ONE thing, and the product acts on that by suggesting the
 *    customer may drop one. Two travel policies to «Ευρώπη» are two different
 *    trips. So travel is a display identifier and deliberately NOT a subject.
 *
 *  - Address uses the FULL postal string here, not the street short form the
 *    row renders. The short form is for recognition; folding «Κηφισίας 12,
 *    Αθήνα» together with «Κηφισίας 12, Λάρισα» would assert one home where
 *    there are two.
 *
 * THE MASK GATE IS THE POINT. `gap-engine/portfolio-rules` carried its own copy
 * of this map and omitted it, so two motor policies whose plates the extractor
 * could not read both keyed on «(XXXX)» and were reported as duplicate cover on
 * the same vehicle — advice to drop one, on compulsory third-party insurance.
 * An unreadable value is the absence of an identifier, never a shared one.
 *
 * `null` means the subject is unknown, and a policy with no subject is never
 * matched to anything.
 */
export function policyAssetSubjectKey(policy: PolicyAssetIdentitySource): string | null {
    const acord = (policy.acordData ?? null) as Record<string, any> | null
    if (!acord || typeof acord !== 'object') return null

    const branch = normalizeBranch(policy.lineOfBusiness)
    const family = (branch.parentId ?? branch.id).toLowerCase()

    let prefix: string
    let raw: string | null | undefined
    if (family === 'motor') {
        prefix = 'plate'
        raw = acord.vehicle?.plateNumber
    } else if (family === 'home') {
        prefix = 'address'
        raw = acord.property?.address
    } else if (family === 'pet') {
        prefix = 'pet'
        raw = acord.pet?.name
    } else if (family === 'boat' || family.startsWith('marine')) {
        prefix = 'vessel'
        raw = acord.marineVessel?.registryNumber
    } else {
        // health, life, cyber, business, pension — no subject the extraction
        // captures. travel — captured, but not a subject. See above.
        return null
    }

    const text = normalized(raw)
    if (!text) return null
    // Neither a sentinel ("no data ever existed") nor a mask ("we could not
    // read this") identifies anything, and two of them are not each other.
    if (containsPlaceholderText(text)) return null
    if (isUnreadableValue(text)) return null

    // Whitespace is transcription noise, not identity: the same address is
    // typed «Ερμού 12, Αθήνα» and «Ερμού 12,  Αθήνα», and the same plate with
    // and without separators. Plates lose whitespace entirely; everything else
    // collapses runs to one space. Case-folding is assetIdentityKey's, and it
    // never folds Greek capitals into Latin — two visually identical plates can
    // be two different vehicles.
    const value =
        prefix === 'plate' ? text.replace(/\s+/g, '') : text.replace(/\s+/g, ' ').trim()
    return `${prefix}:${assetIdentityKey(value)}`
}

/**
 * The comparison key for an asset identifier: TRIM AND CASE-FOLD ONLY.
 * `null` when there is nothing to compare — a row with no key is never
 * merged with and never matched to another row.
 *
 * Deliberately NOT normalised across alphabets: Greek plates use letters the
 * Greek and Latin alphabets share glyphs for, so «ΑΒΕ-1234» (Greek) and
 * «ABE-1234» (Latin) are visually identical and byte-different. Two
 * DIFFERENT vehicles can legitimately produce that pair, so folding one into
 * the other silently claims one asset where there may be two — worse than
 * showing both. Near-misses are LOGGED ({@link warnOnHomoglyphNearMisses}),
 * never resolved.
 */
export function assetIdentityKey(label: string | null | undefined): string | null {
    const text = normalized(label)
    if (!text) return null
    return text.toLowerCase()
}

/**
 * The Greek capitals that share a glyph with a Latin capital — the full set
 * Greek registration plates are drawn from. DETECTION ONLY: this map exists
 * so a near-miss can be noticed and logged; nothing may use it to fold one
 * alphabet into the other (see {@link assetIdentityKey}).
 */
const GREEK_TO_LATIN_HOMOGLYPHS: Readonly<Record<string, string>> = {
    Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K',
    Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X',
}

function homoglyphSkeleton(key: string): string {
    return key
        .toUpperCase()
        .replace(/[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ]/g, (ch) => GREEK_TO_LATIN_HOMOGLYPHS[ch] ?? ch)
}

export interface HomoglyphNearMiss {
    a: string
    b: string
}

/**
 * Pairs of identifiers in `labels` that are visually identical but written
 * in different alphabets (byte-different, same homoglyph skeleton).
 * Byte-equal identifiers (after trim + case-fold) are not near-misses —
 * they are the same string.
 */
export function findHomoglyphNearMisses(
    labels: ReadonlyArray<string | null | undefined>
): HomoglyphNearMiss[] {
    const bySkeleton = new Map<string, Map<string, string>>()
    const out: HomoglyphNearMiss[] = []
    for (const label of labels) {
        const key = assetIdentityKey(label)
        if (!key) continue
        const skeleton = homoglyphSkeleton(key)
        let bucket = bySkeleton.get(skeleton)
        if (!bucket) {
            bucket = new Map()
            bySkeleton.set(skeleton, bucket)
        }
        if (bucket.has(key)) continue
        for (const existing of bucket.values()) {
            out.push({ a: existing, b: normalized(label) })
        }
        bucket.set(key, normalized(label))
    }
    return out
}

/** One warning per pair per process — a 29-row list re-rendering must not spam. */
const warnedNearMisses = new Set<string>()

/**
 * Log every Greek/Latin homoglyph near-miss in a rendered list — and do
 * NOTHING else. The rows stay separate: two different assets can
 * legitimately carry a visually-identical Greek/Latin pair, and silently
 * merging them is a false statement about what the customer owns.
 */
export function warnOnHomoglyphNearMisses(
    labels: ReadonlyArray<string | null | undefined>,
    context: string
): void {
    for (const { a, b } of findHomoglyphNearMisses(labels)) {
        const dedupeKey = `${context}|${a}|${b}`
        if (warnedNearMisses.has(dedupeKey)) continue
        warnedNearMisses.add(dedupeKey)
        console.warn(
            `[policy-identity] ${context}: asset identifiers «${a}» and «${b}» are visually identical ` +
                'but written in different alphabets (Greek/Latin homoglyphs). Rendered as separate rows ' +
                'on purpose — two different assets can legitimately produce this pair, and merging them ' +
                'silently would claim one asset where there may be two.'
        )
    }
}
