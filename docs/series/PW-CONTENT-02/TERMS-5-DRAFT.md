# Terms §5 — APPROVED by the owner and APPLIED in round 6 (2026-10-22); versions bumped to GR-GA-2026.10.22

_(historic draft text below: the sentences that say "not edited", "nothing below is live" and "now GR-GA-2026.10.21" described the state BEFORE approval; the edit was applied and the versions are GR-GA-2026.10.22)_

Decision (owner, round 5): agents are promised in-app cancel they do not have. Amend Terms §5 so that
**agent subscriptions are cancelled by email to info@policywallet.gr, effective at the end of the paid period**.
`lib/legal/legal-content.ts` is **not edited** until the owner has seen this text. Nothing below is live.

Where: `lib/legal/legal-content.ts`, section id `subscriptions`, third paragraph — Greek `:127`, English `:612`.

## Greek — old
> Μπορείτε να ακυρώσετε οποτεδήποτε από τις ρυθμίσεις του λογαριασμού σας. Η ακύρωση ισχύει από το τέλος της τρέχουσας περιόδου χρέωσης — μέχρι τότε διατηρείτε πλήρη πρόσβαση στο πλάνο σας. Δεν χρεώνεστε για επόμενες περιόδους μετά την ακύρωση.

## Greek — new (two paragraphs replace the one)
> Οι συνδρομές ασφαλισμένων μπορούν να ακυρωθούν οποτεδήποτε από τις ρυθμίσεις του λογαριασμού σας. Η ακύρωση ισχύει από το τέλος της τρέχουσας περιόδου χρέωσης — μέχρι τότε διατηρείτε πλήρη πρόσβαση στο πλάνο σας. Δεν χρεώνεστε για επόμενες περιόδους μετά την ακύρωση.
>
> Οι συνδρομές ασφαλιστών ακυρώνονται με email στο info@policywallet.gr. Η ακύρωση ισχύει από το τέλος της τρέχουσας περιόδου χρέωσης — μέχρι τότε διατηρείτε πλήρη πρόσβαση στο πλάνο σας και δεν χρεώνεστε για επόμενες περιόδους μετά την ακύρωση.

## English — old
> You can cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period — until then you keep full access to your plan. You will not be charged for subsequent periods after cancelling.

## English — new
> Policyholder subscriptions can be cancelled at any time from your account settings. Cancellation takes effect at the end of the current billing period — until then you keep full access to your plan. You will not be charged for subsequent periods after cancelling.
>
> Agent subscriptions are cancelled by email to info@policywallet.gr. Cancellation takes effect at the end of the current billing period — until then you keep full access to your plan, and you will not be charged for subsequent periods after cancelling.

Notes for the owner
- «Ασφαλισμένων» / «ασφαλιστών» follow the role names the Terms already use in §4 (ασφαλισμένος, ασφαλιστής).
- The address is the single support address of the series (`info@policywallet.gr`, DECISIONS PW-C02-D2).
- A cancel-by-email path is a manual operation: someone has to act on the email, and the cancel is `cancel_at_period_end` on the agent's Stripe subscription (admin action `cancelSubscriptionAsAdmin`, `app/(protected)/admin/billing-actions.ts:101`, exists). The in-app agent cancel control is queued (QUEUE: AGENT-CANCEL-PATH).
- Separate, pre-existing, not changed: the English §12 says «in accordance with section 4» (`legal-content.ts:672`) where subscriptions are §5, and the Greek §12 (`:187`) says account deletion CANCELS active subscriptions while the English says they stay in force to period end (QUEUE: LEGAL-SUBSCRIPTION-CANCEL-CONSISTENCY).
- Also visible in §5 paragraph 1 (not changed): «Κάθε ανάλυση χρησιμοποιεί μέρος του μηνιαίου ορίου επεξεργασίας του πλάνου» — the Terms mention a monthly processing allowance, which is true of the enforced token budget (Family, agents) but is not published as a number anywhere (H-020).

## What a version bump triggers
- The Terms version is `LEGAL_CONTENT_VERSION` (`lib/legal/legal-content.ts:47`, now `GR-GA-2026.10.21`). `LEGAL_POLICY_VERSIONS.terms` and `.privacy` both equal it (`lib/compliance/consent.ts:11-12`), **A bump therefore changes the Terms AND Privacy version a new consent records, together.** The version a legal page DISPLAYS is a different thing: `LEGAL_DOC_META[kind].version`, four separate literals (`lib/legal/legal-content.ts:58-61`, read at `components/legal/LegalDocumentPage.tsx:37-41`), together with `LEGAL_LAST_UPDATED` (`:48`) and each `lastUpdatedIso`. Bump `LEGAL_CONTENT_VERSION` alone and consents record the new version while `/legal/terms` still shows the old one (no test pins them equal): bump all of them together.
- Where it is stored: `users.terms_version_accepted` / `privacy_version_accepted` and the consent rows, written at sign-up (`app/auth/actions.ts:285-298`), social sign-up (`app/auth/callback/route.ts:119-138`) and `POST /api/v1/consents` (`app/api/v1/consents/route.ts:65,102`).
- **For existing accounts: nothing happens.** No code compares an account's accepted version with the current one and no screen asks them to re-accept (`/api/v1/consents/current` returns both values but has no consumer in `app/` or `components/`). Existing users keep their old `termsVersionAccepted`; it shows as older than current in a data-subject export (`lib/services/compliance.service.ts:61`). New sign-ups record the new version.
- `tests/unit/legal-content-parity.test.ts:80-97` pins that the two versions equal `LEGAL_CONTENT_VERSION` and that it contains no "DRAFT".
- If a material change must bind existing agents, that needs a re-consent flow that does not exist today (QUEUE).
