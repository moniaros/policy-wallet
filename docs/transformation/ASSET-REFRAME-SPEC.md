# §7.3 asset reframe — the grouping spec Phase 5 is gated on

`LEDGER.md` states the gate plainly:

> The asset reframe is the one change in this run that can **lose capability invisibly**: if one car
> with three policies becomes one row, the three policies must still each be reachable and
> individually identifiable. […] **Phase 5 must not merge rows until [the spec] does.** If the reframe
> needs a schema change it is a §12.2 halt; the presentation-layer grouping key must be documented if
> it does not.

This is that document. It is written **before** any row is merged, which is the only order in which
it is worth anything.

## 1. No schema change is needed, so this is not a §12.2 halt

There is no `Asset` model and none is required. Every identifier the reframe needs already exists in
the extracted `AcordData`:

| line of business | grouping key | source | present? |
|---|---|---|---|
| motor | registration plate | `acordData.vehicle.plateNumber` | yes (also `vin`) |
| property / home | address | `acordData.property.address` | yes |
| everything else | **none — never grouped** | — | see §3 |

The key is therefore a **presentation-layer derivation**, computed at render time from data the
wallet already loads. Nothing is persisted, so a wrong grouping is a display bug and not a data
migration — which is the property that makes this reversible.

## 2. The invariant, stated so it can be tested

**Grouping may change how policies are ARRANGED. It may not change which policies are reachable, nor
what identifies them.**

Concretely, for any grouping the wallet renders:

1. **Count conservation.** The number of distinct policies reachable from the wallet equals the
   number the customer holds. A group of three renders three, not one.
2. **Individual reachability.** Every policy has its own link to `/wallet/[id]`. A group header is
   not a substitute for the rows inside it.
3. **Individual identity.** Inside a group, each policy is still identified by insurer and policy
   number through `lib/wallet/policy-identity.ts`. "Three policies on this car" is not an identity.
4. **Status is per policy, never per group.** One expired policy on a car with two live ones must not
   render the car as live, and must not render it as expired either. `resolvePolicyLifecycle` answers
   per policy; a group has no lifecycle.

## 3. When the key is unreadable, do not group

This is the rule that matters most, and it runs against the instinct to tidy.

`plateNumber` and `address` are **extracted**, so they can be absent, wrong, or a sentinel —
CLAUDE.md records that `insurerName` and `policyNumber` carry `__PENDING_EXTRACTION__` and
`Unknown Insurer` on healthy rows, and the same failure mode reaches these fields. Two policies whose
plate was read as the same wrong string are not the same car.

**So: a policy whose grouping key is missing, sentinel, or unreadable stands alone.** It renders as
its own row. Merging on a bad key silently tells the customer two unrelated policies cover one asset,
which is a false statement about their cover — worse than an ungrouped list, which is merely longer.

Route every key through `lib/wallet/unreadable-value.ts` before grouping on it. An unreadable key is
not a key.

## 4. What the guard must assert, before the feature ships

Written here so the guard is specified by the invariant rather than by whatever the implementation
happens to do:

- render a fixture of **one asset, three policies** → three `/wallet/[id]` links, three distinct
  identities, and the group's own header is not one of them;
- render **two policies with the same unreadable plate** → **two** groups, not one;
- render a group containing one expired and two active policies → no group-level status claim;
- **count conservation** across every fixture: policies rendered equals policies held.

Each with a committed probe, and demonstrated failing first — a grouping guard that has never been
red has not been tested against the thing it exists to prevent.

## 5. What this spec does NOT decide

Whether the reframe is worth doing. It removes the gate; it does not argue the case. §7.3 wants the
asset to be the organising unit because a customer thinks "my car" before "policy 4471-B", and that
is a real observation — but the wallet currently renders 29 policies as 29 rows and the measured
defect list does not include "the wallet is hard to scan". **The reframe should be justified by a
measurement before it is built**, and that measurement does not exist yet.

Recorded so that Phase 5 opens with the question rather than the answer.
