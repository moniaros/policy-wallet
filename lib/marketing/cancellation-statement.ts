/**
 * The ONE statement about cancelling a subscription.
 *
 * Owner decision 2026-10-22 (PW-C02-D15, from H-030): cancelling works in the app and takes
 * effect at the END of the period already paid for (`cancelSubscription` sets
 * `cancel_at_period_end`, app/(protected)/account/actions.ts:92-135; the subscription ends at
 * `customer.subscription.deleted`, lib/services/billing/stripe-lifecycle.ts:200-220). There is no
 * downgrade and no refund. A «cancel any time» claim is therefore only true together with its
 * consequence, so no surface states one without the other: every cancel claim comes from here.
 *
 * Guard: tests/unit/cancel-claims-state-access.test.ts.
 */
type Bilingual = { el: string; en: string }

/** What cancelling does, as a clause. */
export const CANCEL_CONSEQUENCE: Bilingual = {
    el: "η πρόσβαση συνεχίζεται έως το τέλος της περιόδου που έχετε πληρώσει",
    en: "access continues to the end of the period you have paid for",
}

/** «Ακύρωση όποτε θέλετε· η πρόσβαση συνεχίζεται …» — no trailing full stop (callers add their own). */
export const CANCEL_ANYTIME: Bilingual = {
    el: `Ακύρωση όποτε θέλετε· ${CANCEL_CONSEQUENCE.el}`,
    en: `Cancel any time; ${CANCEL_CONSEQUENCE.en}`,
}
