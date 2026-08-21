# Renewal documents (ανανεωτήριο) — STEP 0 findings, and the one fix that shipped

**Status:** STEP 0 complete. One live defect found and fixed. The feature
itself — the «Προσθήκη ανανεωτηρίου» flow and the «Τι άλλαξε στην ανανέωση»
differential — is **not built**.

## The brief's premise was wrong, and the real problem is worse

The brief states: *"the only path is 'new policy', which severs the chain and
loses base terms."* That is not what the code does. `PolicyService` already
detects a duplicate (same owner + insurer + policy number) and, when it comes
from the **same uploader**, merges it silently — a path explicitly documented in
`lib/services/policy-merge.service.ts` as "a re-upload / renewal". A different
uploader raises a `PolicyMergeRequest` the other party must approve.

So the chain was not severed. It was **merged badly**:

```js
const mergedAcordData = {
    ...(existing.acordData || {}),
    ...(incoming.acordData || {}),   // shallow — sections replace wholesale
    renewalHistory: mergedHistory
}
```

A renewal notice states the premium and the period and is silent about
everything else. Its extraction therefore produces sparse sections. The shallow
spread read that silence as deletion: a renewal whose `vehicle` object contained
only `estimatedMarketValue` **replaced the entire base `vehicle`**, taking
`make`, `model`, `greenCardExpiryDate`, `ownVehicleDamage` and `glassBreakage`
with it.

That is not merely lossy. `ownVehicleDamage` and `glassBreakage` are exactly the
fields `no_own_damage_cover` and `no_glass_breakage_cover` evaluate — so after a
renewal upload the product could tell a customer they had lost cover they
plainly still had. And it was inconsistent: a section the renewal never
mentioned at all survived intact, so whether your terms survived depended on
whether the extractor happened to emit the key.

**Fixed** in `lib/services/acord-merge.ts`: an explicit value in the newer
document wins; `null`/`undefined` inherit; plain objects recurse; arrays replace
wholesale (a renewal restating named drivers means that list, not a union). An
explicit `false` or `[]` still overrides — those are statements, consistent with
`isAbsent` in the gap engine. Pinned by
`tests/unit/acord-merge-silence-inherits.test.ts`.

## What already exists (so the feature is smaller than it looks)

| Brief asks for | Already in the codebase |
|---|---|
| document `kind` (ORIGINAL / RENEWAL / RIDER) | `PolicyDocument.documentKind`, classified by the AI into `policy_schedule`, `renewal_notice`, `terms_and_conditions`, `forms`, `certificate`, `invoice`, `other` |
| a chain rather than a new policy | `PolicyDocument.version` + `supersededById`/`supersedes` self-relation; `acordData.renewalHistory` (last 20) already accumulated on merge |
| newest-effective wins | `shouldPromoteIncoming` compares `endDate`; `resolveCoverageEndDate` derives the coverage end |
| many documents per policy | already supported — `policyId` has no unique constraint |

`documentKind` is **classified but almost never read** — only
`app/(protected)/wallet/[id]/page.tsx` selects it. It is a populated column with
no consumer, which is the seam the renewal feature should use.

## What is still missing

1. **An effective period on the document.** `PolicyDocument` has no
   `effectiveFrom`/`effectiveTo`. Ordering renewals currently leans on the
   policy-level `endDate`. This is the one schema migration the feature needs.
2. **The «Προσθήκη ανανεωτηρίου» entry point.** Today a renewal arrives only by
   re-uploading a document that happens to dedupe onto an existing policy.
   There is no deliberate "add a renewal to THIS policy" action, so the user
   cannot express the intent and the system has to infer it.
3. **The differential — «Τι άλλαξε στην ανανέωση».** Nothing computes or renders
   premium/sum/term deltas between two documents. This is the feature's real
   value and none of it exists.
4. **Renewal-first handling.** A renewal uploaded with no original present has
   no incomplete-terms state; it becomes an ordinary policy with sparse terms
   and no indication that the base contract is missing.

## Recommended order

Migration for the effective period → deliberate renewal upload writing
`documentKind='renewal_notice'` and the period → the differential computed from
the two extractions (deterministic assembly, the LLM phrasing only) → the
incomplete-terms state. The merge semantics the whole feature depends on are now
correct, which is the part that was silently wrong.
