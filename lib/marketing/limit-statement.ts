/**
 * The ONE statement of what the free plan limits, and the ONE line about
 * deleting data, for every public route.
 *
 * H-020 (PW-CONTENT-02, 2026-10-21): the site publishes NO analysis limit.
 * There is no monthly analysis count to publish — `aiAnalysisPerMonth` is null
 * on every B2C tier, Free and Plus are bounded by the policy cap, and the
 * monthly token budget is an internal abuse guard that must never be named
 * (plan-defaults.ts). «Απεριόριστες αναλύσεις» and «μηνιαίο όριο επεξεργασίας»
 * therefore both leave B2C copy; what remains is the enforced policy cap, read
 * from the entitlement source rather than typed.
 *
 * Callers: lib/marketing/positioning.ts (CTA_REASSURANCE),
 * app/(public)/product/ProductSections.tsx, components/landing/LoBPageShell.tsx,
 * lib/product/lob-faqs.ts, app/auth/signup/SignupForm.tsx.
 * Guard: tests/unit/cta-reassurance-single-source.test.ts (no hand-typed copy).
 */
import { DEFAULT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"

type Bilingual = { el: string; en: string }

const FREE_POLICIES = DEFAULT_ENTITLEMENT_LIMITS.free.policies

/** «Δωρεάν για 3 ασφαλιστήρια» — the enforced policy cap of the free plan, as a sentence. */
export const FREE_PLAN_LIMIT: Bilingual = {
    el: `Δωρεάν για ${FREE_POLICIES} ασφαλιστήρια`,
    en: `Free for ${FREE_POLICIES} policies`,
}

/** «έως 3 ασφαλιστήρια» — the same cap mid-sentence, for FAQ answers and meta descriptions. */
export const FREE_UP_TO: Bilingual = {
    el: `έως ${FREE_POLICIES} ασφαλιστήρια`,
    en: `up to ${FREE_POLICIES} policies`,
}

/**
 * Deletion, worded as /trust words it: on request, with legally retained
 * records excepted. Replaces «Διαγράφετε τα πάντα όποτε θέλετε» /
 * "Delete everything whenever you want", which promised an unconditional
 * self-service erase that the retained-records policy does not give.
 * Wording approved by the owner 2026-10-22: it mirrors /trust
 * (app/(public)/trust/TrustSections.tsx, the deletion paragraph) word for word.
 */
export const DELETION_ON_REQUEST: Bilingual = {
    el: "Μπορείτε να ζητήσετε διαγραφή των στοιχείων σας. Όσα πρέπει να κρατήσουμε, όπως τα φορολογικά παραστατικά, δεν διαγράφονται πριν λήξει η σχετική υποχρέωση.",
    en: "You can ask us to delete your data. Records we must keep, such as tax documents, are not erased before that obligation ends.",
}
