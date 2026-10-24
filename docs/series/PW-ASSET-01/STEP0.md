# PW-ASSET-01 — STEP 0 — The household is made of things, not policies

**Written:** 2026-10-21 · **Role:** `step0-investigator` (Fable 5.1, xhigh) · **Branch:** `pw-customer` at `0b75e4cf`
**Inputs read:** `docs/STATUS.md`, `CLAUDE.md`, `docs/transformation/DECISIONS.md` (D-001…D-035), `docs/transformation/HALTS.md` (H-001…H-011, SEC-01), `docs/transformation/ASSET-REFRAME-SPEC.md`, `docs/transformation/P5-wallet-01-identifier-availability.md`, `docs/transformation/PHASE5-CROSS-SURFACE.md`, `docs/transformation/INSTRUMENTATION-PLAN.md`, `docs/build/policywallet-transformation-multiagent.md` (§2.6, §5.2, §5.3, §7.3), `docs/series/00-RUN-PLAN.md`, `docs/series/PW-ASSET-01.md`, and the code cited below. No product code was changed. The dev database (`lzqvtvjggylcujenlelh`) was read with SELECT only; production was **not** reachable from this session (no credential in `.env`; MCP-only per memory).

**Status: not approved.** Build waits on H4 and on the halts in §7 (H-012 … H-018 in `docs/transformation/HALTS.md`).

---

## 1. What the series assumes that turned out false

Step 0 changed the shape of this series in both directions. Four of these make it *smaller* than written; three make it *more dangerous* than written.

### 1.1 `CoverageEnvelope` and `catalogue_version` are not tables

`grep -rn CoverageEnvelope prisma lib app` returns nothing. `catalogue_version` is a **column** on `gap_instances` (`prisma/schema.prisma:582`), written by the single gap writer. The "envelope" the lifecycle reads is `acordData.policy` JSON (`lib/policy-status.ts:171-185`: `renewalHistory[].endDate` → `policy.expirationDate` → `endDate` column), denormalised into `policies.coverage_end_date` (`schema.prisma:395`, migration `20260716140000`). There is nothing to query in item 1 beyond `policies`, `gap_instances`, and `acord_data`.

### 1.2 The "23 / 13 / 11 / 9 / 36 / 10 problem" was Aug-2026's §2.6 defect, and it has been instrumented, derived once, and swept since

- The numbers come verbatim from the transformation doc §2.6 (`docs/build/policywallet-transformation-multiagent.md:274-278`), observed on the pre-redesign dashboard. The arithmetic complaint (23 − 5 − 5 − 2 ≠ 13) was answered by design: `neverAnalysed`/`analysisFailed` are the *analysis* dimension and overlap the lifecycle subsets, so the difference "is not a count of anything" (`lib/dashboard/portfolio-summary.ts:76-80`).
- Every count now derives from `derivePortfolioCounts` (`lib/dashboard/portfolio-summary.ts:82-104`) over `resolvePolicyLifecycle`; 124 `data-count` sites across 44 files carry registered keys (`lib/instrumentation/count-keys.ts`, 317 lines); the registry guard `tests/unit/count-instrumentation-registry.test.tsx` enumerates `app/ components/ lib/` from the filesystem; and the live cross-surface sweep (`tests/measure/phase5-cross-surface.spec.ts`, five surfaces, two passes) reported **"no cross-surface count contradiction on this portfolio, at this width, in this state, on the instrumented vocabulary"** with four load-bearing qualifiers (`docs/transformation/PHASE5-CROSS-SURFACE.md:120-140`): `/notifications` and `/account` are effectively uninstrumented, and 78 single-surface groups were never corroborated.
- **Consequence for this series.** Count reconciliation (item 8) is not a repair; it is an *extension* of an existing vocabulary with `asset.*` keys (`asset.label` and `asset.policyCount` are already reserved — `INSTRUMENTATION-PLAN.md:44-46`; `asset.identifier` is live on the wallet card, `components/wallet/PolicyCard.tsx:215`). Introducing assets creates a **new** disagreement surface — "N assets" beside "M policies" — that did not exist before. That is the risk the count guard must be extended for, not the old one.

### 1.3 There is no 23-policy heavy fixture

`policiesFor("heavy")` returns **12** rows (`tests/measure/dashboard-fixtures.ts:135-199`). The E2E owner account `e2e-ph@policywallet.test` holds 13 policies today and `e2e-ph-dash` 12 (dev DB, §2.9). The "29-policy wallet" quoted by D-034 was an *accumulated* measurement account (FIXTURE 6 + DEFECT 9 + others), not a fixture definition. The §5.3 matrix says "heavy (23, mixed)" but no fixture of that size exists. **No existing fixture puts the same plate on two policies**, so the series' headline case — one car, three policies — cannot be produced by anything in the repo today. §4 defines the fixture that can.

### 1.4 The asset reframe was deferred by an owner decision whose reopen trigger has not fired

D-034 (2026-08-26, `docs/transformation/DECISIONS.md:1166-1221`) deferred the asset-first wallet pending evidence, retained the render-time grouping key, and set a reopen trigger: `duplicate-identity-row > 0` on a *real-user* capture **on a line that has an identifier**. The dev profile (§2.9) shows **0** duplicate plate groups and **0** duplicate address groups; nothing in the repo records the trigger firing. This series reopens the reframe on the 21 Oct customer assessment (Dislike 4 / ask 2) — a product decision, which is legitimate, but it must **explicitly supersede D-034** rather than silently contradict it → **H-013**.

Also already in place, and to be reused rather than rebuilt: `policyAssetIdentity` / `policyAssetIdentifier` / `policyRowIdentity` / `policyAssetSubjectKey` / `assetIdentityKey` / `findHomoglyphNearMisses` (`lib/wallet/policy-identity.ts:406-760`), guarded by `tests/unit/asset-subject-single-path.test.ts`, consumed by the wallet card (`PolicyCard.tsx:112`), the renewal timeline, the agent customer service (`lib/services/customer.service.ts:317`) and the gap engine's duplicate-cover subject (`lib/services/gap-engine/portfolio-rules.ts:18,221-229`).

### 1.5 "An RLS test suite … run as every role" would test nothing the application does

- Ten tables carry `ENABLE ROW LEVEL SECURITY`; **zero** `CREATE POLICY` statements exist in any migration (`grep -rn 'CREATE POLICY' prisma/migrations supabase` → nothing; dev `pg_policies` for schema `public` = **0**; all RLS tables owned by `postgres`, `relforcerowsecurity = false` — §2.9).
- The application connects as `postgres`, the table **owner**, to which RLS does not apply without `FORCE`. `anon`/`authenticated` have no schema `USAGE` and PostgREST exposes only `graphql_public` (`docs/audits/prod-default-privileges-not-revocable.md:1-40`). No `supabase.from('<table>')` read exists in `app/` or `lib/`.
- So "RLS" here is **deny-by-default for roles that cannot reach the schema anyway**; authorization is enforced in code by one path — `computePolicyAccess` (`lib/policy-access.ts:117-178`: owner, grant level, managing-agent arm, family-membership arm) — and proven by `tests/unit/policy-authorization-single-path.test.ts` (filesystem-derived route list) and `tests/cross-tenant-authorization.spec.ts` (real HTTP, stranger agent and stranger policyholder).
- The acceptance criterion and the "Guards" line must be rewritten to what can actually be red: the same ENABLE-RLS posture on the new tables, the single-path guard extended to the new server actions, and the HTTP cross-tenant spec extended with asset routes → **H-014**.

### 1.6 Most of the identifiers in item 2 are not extracted, and none of the ones that are has a confidence score

| Series says the extractor reads | What `lib/schemas/acord-data.ts` / `lib/services/ai/extraction-schema.ts` actually carry | Dev rows populated (of 45) |
|---|---|---|
| plate number, VIN | `vehicle.plateNumber`, `vehicle.vin` (`acord-data.ts:102-103`) | plate **10**, VIN **1** |
| property address / ΚΑΕΚ | `property.address` (`acord-data.ts:154`, `.describe()` hint added 2026-08-28 because it was "populated in ZERO home policies across both databases"); **no ΚΑΕΚ field** | address **0** |
| insured person name | **none** — `insuredPersons[]` drops names by design (`acord-data.ts:465-470`); `insured.name` = the *policyholder's* name read off the document (D-035, `extraction-enrichment.ts:251-263`) | insured name **2** |
| pet name and microchip | `pet.name`, `pet.microchipNumber` (`acord-data.ts:247,254`) | **0 / 0** |
| business name / ΑΦΜ | **no business block at all** (H-010, still open); `customerTaxId` → `policyholder.taxId` is the **policyholder's** ΑΦΜ (`extraction-schema.ts:57`, `enrichment.ts:256`) | ΑΦΜ **0** |
| — | `marineVessel.registryNumber` (`acord-data.ts:543+`), `insuredItems[].identifier` (`acord-data.ts:448-456`, serial/registry "where stated") | vessel **0** |

Per-field confidence exists **only** for the nine envelope fields (`extraction-schema.ts:61`: insurerName, policyNumber, lineOfBusiness, startDate, endDate, premiumAmount, issueDate, premiumFrequency, renewalDate; dev rows carry exactly those keys). **No asset identifier has a confidence score.** "Extraction confidence for each" therefore cannot be reported; the design below treats every identifier as read-or-not and routes it through `lib/wallet/unreadable-value.ts`.

### 1.7 «410 €/χρόνο» is only true for a twelve-month term

`Policy.premiumAmount` is the **total for the policy term**, never annualised — `lib/wallet/premium-footprint.ts:128-146` and `tests/unit/premium-term-semantics.test.ts` exist because an "annualiser" once shipped a 12× overstatement. A ten-day travel policy or a multi-year life contract summed as "per year" is a false number. The asset row may say «/έτος» only when every counted term is ≈ 12 months; otherwise «για την περίοδο» with the dates (§3.6).

### 1.8 Household scope already partly exists

`wallet_memberships` (migration `20260923170000_family_wallet`), `Policy.privateToOwner` (`schema.prisma:402`), the family arm of `computePolicyAccess` (`policy-access.ts:152-161`) and the wallet's family rows (`app/(protected)/wallet/page.tsx:99-112`) are live. "Ownership/household scope ready for HOUSEHOLD-01 without building it" means: the asset's owner is the policy owner; family members see assets exactly as they see policies — through the membership arm — and nothing new is needed now.

### 1.9 Dev data cannot be told apart from fixtures by inspection, and 17 of 45 rows have no `acordData` at all

`ph1@example.com` (15 rows, `scripts/seed-agent-demo.mjs` shape, no `acordData`) and `moniaros@gmail.com` (2) are "real-looking" dev rows with nothing to derive an asset from. One fixture motor row carries a UK-shaped plate (`LL99 LLL`, source `gemini`) and one fixture **cyber** row carries a Greek plate (`seven-facts` H13 reuses the motor ACORD writer). Both are reproducible from fixtures and both shape the matching rule (§3.4): type comes from the **branch family**, never from "a plate is present".

---

## 2. What exists

### 2.1 Tables (`prisma/schema.prisma`)
- `policies` (`:380-432`): `ownerUserId`, `createdByUserId`, `lineOfBusiness`, `startDate`, `endDate`, `coverageEndDate` (denormalised; NULL = unknown duration, counts as cover), `status` (ingestion state — never recomputed), `premiumAmount` (term total), `premiumCurrency`, `nickname` (owner-typed, "never extracted, never a rule input"), `privateToOwner`, `acordData` JSON, `lastAnalyzedAt`.
- `gap_instances` (`:553-607`): one writer (`lib/gaps/gap-instance-writer.ts`), `analysisRunId`, `lineOfBusiness`, `catalogueVersion`, `supersededAt`; readers filter `supersededAt: null`.
- `wallet_memberships` (`:2640`), `policy_renewals` (`:1627`, `@@unique([policyId, policyEndDate])` — a renewal is a new *term* of the same policy, not a new policy), `policy_merge_requests` (`:1270` — two uploaders' copies of one policy, approve/reject; the only existing "never merge silently" precedent), `policy_documents`, `policy_analysis_runs`.
- RLS-enabled tables (dev `pg_class`): `agent_review_revisions, health_benefit_usages, health_risk_assessments, health_shares, partner_referrals, policy_notes, prevention_benefit_uses, prevention_check_ins, prevention_progress, wallet_memberships` — all `ENABLE` only, owner `postgres`, no policies.

### 2.2 Read paths and the counts they render
| Surface | Query | Counts (key → site) |
|---|---|---|
| `/wallet` | `app/(protected)/wallet/page.tsx:34-50` own rows (`status ≠ deleted`, `_count.gapInstances` live+open), `:99-112` family rows; mapping `:122-200` builds `insuredItem` (title = make/model or address; subtitle = `policyRowIdentity(p).value`) | `portfolio.activeCount/policyCount/expiringCount/attentionCount` + premium exclusion parts → `components/wallet/StatusSummary.tsx:106-146`; `branch.policyCount` (subject = family) → `components/wallet/PolicyWallet.tsx:363`; grouping by branch family `:121-135` |
| wallet card | `components/wallet/PolicyCard.tsx:112,161-251` | facts `policy.insurer`, `policy.rowStatus`, `policy.nickname`, `policy.familyOwner`, `policy.sharedWithAdvisor`, `asset.identifier`, `policy.daysRemaining`, `policy.quickFact` |
| `/dashboard` | `app/(protected)/dashboard/PolicyholderHome.tsx:161` (`db.policy.findMany`), `:436` `derivePortfolioCounts` | `portfolio.*` via `PortfolioSummaryCard`, `ProtectionStatusHero`, `RenewalsTimelineCard`, `AttentionList`; regions `#overview #prevention #attention #renewals #plan #support #activity` (`:1033-1218`) |
| `/dashboard/agent` | `app/(protected)/dashboard/agent/page.tsx:66-169`; `getVisiblePolicyCountsByOwner` (`lib/agent-visibility.ts:183`) | `client.policyCount` (visibility-scoped, D-B3), `client.openGapCount`, `client.underReviewCount`, `client.unassessedPolicyCount` → `components/agent/CustomerList.tsx:405-422`, `ClientCard.tsx:73-95` |
| `/customers/[id]` | `lib/services/customer.service.ts:317` `assetLabel: policyRowIdentity(p).value` | `client.linesHeldCount`, `client.unsharedPolicyCount` (`ClientPoliciesTab.tsx:194`) |
| `/agent` (customer side) | `app/(protected)/agent/AgentClient.tsx:795-797` | `portfolio.sharedWithAdvisorCount` / `portfolio.policyCount` |

### 2.3 Lifecycle, status words, in-force sets
- `resolvePolicyLifecycle` (`lib/policy-status.ts:163-204`): `cancelled` → `unknown_duration` (no readable end) → `expired` (<0 days) → `expiring_soon` (≤30) → `action_needed` (placeholder identity) → `active`. Athens calendar (`calendarDaysUntil`, `:43`).
- `coveredPolicyWhere` (`:270-275`) and `expiryWindowWhere` (`:290-301`) for SQL-side counts.
- `IN_FORCE_KEYS = ['active','expiring_soon','action_needed']`, `ATTENTION_KEYS = ['expiring_soon','expired','action_needed','unknown_duration']` (`lib/wallet/policy-status-view.ts:136-157`).
- Status words: `t.policyStatus` (`lib/i18n/translations/el.ts:2444-2456`), **neuter** because the subject is «το ασφαλιστήριο». An asset («η κατοικία», «ο σκύλος») needs its own agreement → H-015.
- Premium: `calculatePremiumFootprintDetailed` (`premium-footprint.ts:156+`) — in-force only, majority currency, `unknownPremiumCount`, `otherCurrencyCount`, `unknownDurationCount`; `premiumExclusionParts` (`lib/wallet/premium-exclusion-note.ts:49-60`).

### 2.4 Identity primitives (`lib/wallet/policy-identity.ts`)
`rawAssetIdentifier` (`:459-483`, one line→field map keyed on branch **family**: motor→plate, home→address short form or `propertyShape`, pet→name, boat/marine_*→registry, travel→scope); `policyAssetIdentity` (`:493`, sentinel → null, mask → `readable:false`); `policyRowIdentity` (`:570`, asset → person (health/life) → number); `policyAssetSubjectKey` (`:624-668`, full address, plate whitespace stripped, **hyphen not stripped — recorded as a known limit**, no cross-alphabet folding); `assetIdentityKey` (`:682`, trim + case-fold only); `findHomoglyphNearMisses` / `warnOnHomoglyphNearMisses` (`:716-760`, **log only, never merge**).

### 2.5 Ingestion and consent seams the asset model must sit behind
`ingestPolicyDocument` (`lib/ingestion/ingest-policy-document.ts`) is the one storage path; `validateDocumentForIngestion` runs first; consent is checked before the body is read on the deep pipeline and `extract/route.ts` (H-011 records the agent-scan exception). Asset derivation is a **post-persist read of `acordData`** and introduces no model call, no upload path, no document write.

### 2.6 i18n
`el.ts:354-470` wallet block — `vehicle: 'Όχημα'`, `plateNumber: 'Αριθμός κυκλοφορίας'`, `newAsset: 'Νέο περιουσιακό στοιχείο'` (`:467`, an existing, **un-lexiconed** term), `totalPolicies`, `activePolicies`, `expiringPolicies`, `attentionNeeded`. Role-copy defaults `vehicle: "Όχημα"`, `property: "Ακίνητο"` (`lib/i18n/role-copy.ts:233-234`). Family headings via `t.policyTypes`. `docs/content/LEXICON.md` has **no row for "asset"**.

### 2.7 Design-system primitives available (`app/globals.css`)
`.pw-card .pw-card-chip .pw-subcard .pw-pad .pw-pad-tight .pw-pad-roomy .pw-pill .pw-kicker .pw-scroll-strip .pw-stacked-table .pw-segment .pw-inline-action .pw-primary-button .pw-page-shell`; components `StatusPill`, `StatTile`, `EmptyState`, `ConfirmDialog`, `Modal`, `LoadingSkeleton` (`components/ui/`). MASTER.md §Cards/§Badges (`design-system/policywallet/MASTER.md:196-236`).

### 2.8 Guards that already constrain this series
`count-instrumentation-registry.test.tsx` (vocabulary + one-key-one-value), `dashboard-counts-are-doors.test.tsx`, `asset-subject-single-path.test.ts`, `policy-sentinels-unrenderable.test.tsx`, `all-clear-honesty.test.ts`, `erasure-covers-personal-data.test.ts` (**schema-derived**: a new model with a user relation fails until `gdpr-erasure.service.ts` and `compliance.service.ts` handle it), `policy-authorization-single-path.test.ts`, `gap-readers-exclude-superseded.test.ts`, `gap-severity-display-single-source.test.ts` — which carries the **`lib/gap-detection.ts` SHA pin: `1d397fd9b04ced40eb853b9c682185a332bbce3f96883c454e026084d20a31f1`** (`:197-198`, re-pinned 2026-09-24 under D-V2). `shasum -a 256 lib/gap-detection.ts` today = the same value. ✅ Frozen file intact; this design does not touch it (§6).

Feature flags: `lib/flags/registry.ts` `FEATURE_FLAGS` (boolean/canary, rollout modes), `flagEnabled()` (`lib/flags/config.ts:287`). Propose `wallet.assets`.

### 2.9 Dev database profile (read-only, 2026-10-21, project `lzqvtvjggylcujenlelh`)
```
policies by status      active 39 · expiring_soon 6            (stored status; 0 'deleted')
by line                 motor 23 · health 12 · travel 2 · cyber 2 · home 2 · pension 1 · other 1 · life 1 · pet 1
owners                  6 owners / 45 policies  (ph1@example.com 15 · e2e-ph 13 · e2e-ph-dash 12 · e2e-ph-free 2 · moniaros@gmail.com 2 · e2e-onboard 1)
identifiers             has_acord 28 · plate 10 (masked 0) · vin 1 · property_address 0 · pet_name 0 · pet_chip 0
                        holder_afm 0 · insured_name 2 · vessel 0
premium_amount NULL 4 · coverage_end_date NULL 2 · nickname 0 · placeholder_identity 2 · summary_en 0
field-confidence rows   12 (keys: insurerName, premiumAmount, policyNumber, endDate ×12; startDate, premiumFrequency, lineOfBusiness, issueDate, renewalDate ×2)
duplicate plate groups  0 · duplicate address groups 0
plate shapes            LLL-9999 ×9 · "LL99 LLL" ×1 (fixture, gemini-extracted)
plate on non-motor      cyber ×1 (fixture seven-facts H13)
related                 live gaps 38 · merge_requests 0 · wallet_memberships 0 · renewals 0 · documents 15 · runs 39
RLS                     10 tables enabled, owner postgres, FORCE off; pg_policies(public) = 0
```
**Backfill on dev is trivial** (≤ 10 vehicle assets, 0 property, 0 pet, 0 ambiguous). **Production could not be profiled** from this session; D-034 recorded 2 production wallets of 3 and 1 policies in Aug 2026, and CLAUDE.md states every account belongs to the owner. The same SELECTs (scratch script, read-only) must be run on prod before H4 is signed → H-012.

---

## 3. Proposed design

**Principle.** An asset is **derived first, persisted second**. The persisted row is an owner-confirmable grouping over policies; the *subject key* that says "same physical thing" stays where it is (`policyAssetSubjectKey`) and is not widened, because widening it changes `duplicate_coverage_*` output (`portfolio-rules.ts:221-229`) — gap behaviour, out of scope. Anything the key cannot decide becomes a **prompt**, never a merge.

### 3.1 Migration SQL — written, **not applied**
```sql
-- PW-ASSET-01 · insured assets. Posture mirrors wallet_memberships: ENABLE RLS, no
-- policies (deny-by-default for roles that cannot reach the schema); authorization is
-- enforced in code through getPolicyAccess / getAssetAccess (lib/policy-access.ts).
-- Nothing on "policies" or "gap_instances" changes. Fully reversible: DROP the three
-- tables and the product is exactly as before.

CREATE TABLE "insured_assets" (
  "asset_id"          TEXT PRIMARY KEY,
  "owner_user_id"     TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Family of the thing. 'person' and 'business' are OWNER-CREATED only in this series (H-016, H-010).
  "type"              TEXT NOT NULL CHECK ("type" IN ('vehicle','property','pet','vessel','person','business','other')),
  -- What the owner calls it («Το Yaris»). Owner-typed or derived (make/model, street); never a sentinel.
  "label"             TEXT NOT NULL,
  -- The identifier that makes two policies ONE asset, and where it came from.
  "identifier_kind"   TEXT NOT NULL CHECK ("identifier_kind" IN ('plate','vin','address','pet_name','microchip','vessel_registry','none')),
  "identifier_value"  TEXT,            -- as stored on the matching policy (trimmed), for display/audit
  "identifier_key"    TEXT,            -- policyAssetSubjectKey() form; NULL when kind = 'none'
  "origin"            TEXT NOT NULL CHECK ("origin" IN ('extracted','owner','advisor')),
  "confirmed_at"      TIMESTAMP(3),    -- set when the owner has looked at the grouping
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insured_assets_key_requires_kind" CHECK (("identifier_kind" = 'none') = ("identifier_key" IS NULL))
);
-- One key, one asset, per owner. Homoglyph near-misses are byte-different and stay separate on purpose.
CREATE UNIQUE INDEX "insured_assets_owner_key_uq"
  ON "insured_assets"("owner_user_id", "identifier_kind", "identifier_key") WHERE "identifier_key" IS NOT NULL;
CREATE INDEX "insured_assets_owner_type_idx" ON "insured_assets"("owner_user_id", "type");
ALTER TABLE "insured_assets" ENABLE ROW LEVEL SECURITY;

-- Many-to-many. A fleet schedule can name two vehicles; one policy may therefore link twice.
CREATE TABLE "policy_insured_assets" (
  "policy_id"     TEXT NOT NULL REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "asset_id"      TEXT NOT NULL REFERENCES "insured_assets"("asset_id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- PROVENANCE of the link, like rule_inputs on a gap: what was compared and who decided.
  "match_source"  TEXT NOT NULL CHECK ("match_source" IN ('deterministic','owner_confirmed','owner_assigned','advisor_assigned','backfill')),
  "match_inputs"  JSONB,              -- { field, policyValue, assetKey, rule } — the finding must be re-derivable
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("policy_id", "asset_id")
);
CREATE INDEX "policy_insured_assets_asset_idx" ON "policy_insured_assets"("asset_id");
ALTER TABLE "policy_insured_assets" ENABLE ROW LEVEL SECURITY;

-- "When the match is uncertain, ask." Every prompt is a row, so "zero silent merges" is a
-- query, not a claim: a deterministic link whose inputs were not an exact key is a defect.
CREATE TABLE "asset_match_suggestions" (
  "suggestion_id"  TEXT PRIMARY KEY,
  "policy_id"      TEXT NOT NULL REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "asset_id"       TEXT NOT NULL REFERENCES "insured_assets"("asset_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "reason"         TEXT NOT NULL CHECK ("reason" IN ('plate_separator_variant','homoglyph_near_miss','vin_only','address_street_only','pet_name_only')),
  "inputs"         JSONB NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','accepted','rejected')),
  "decided_at"     TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("policy_id", "asset_id")
);
CREATE INDEX "asset_match_suggestions_policy_status_idx" ON "asset_match_suggestions"("policy_id", "status");
ALTER TABLE "asset_match_suggestions" ENABLE ROW LEVEL SECURITY;
```
Prisma models `InsuredAsset`, `PolicyInsuredAsset`, `AssetMatchSuggestion` with `@@map`s as above; relations from `User` and `Policy`. Applied via `prisma migrate deploy` (never `migrate dev`), dev first, prod after verification — the standing rule.

### 3.2 Household readiness (not built)
`owner_user_id` is the asset owner. A member of the owner's family wallet reads/writes the asset through the membership arm exactly as for policies. HOUSEHOLD-01 may later add a nullable `household_id`; nothing here forecloses it. `private_to_owner` on a linked policy hides that policy from members — the asset then shows members only the policies they may see and says «1 ασφαλιστήριο ιδιωτικό» (count, not content).

### 3.3 Access — one path, derived from policies
`getAssetAccess(assetId, viewer)` in `lib/policy-access.ts` (same file, so the single-path guard enumerates it): owner / active family member → read+write; agent → **read-only projection**: the asset is visible iff `computePolicyAccess` grants read on ≥ 1 linked policy, and the agent sees **only** those policies and `asset.visiblePolicyCount` — never the existence of the others (mirrors `client.policyCount`, D-B3). No asset-level grants, so **an agent's access still dies with the relationship** with no new revocation site. Every server action that names a `policyId` calls `getPolicyAccess`; every one that names an `assetId` calls `getAssetAccess`; subjects derive from the session.

### 3.4 Matching (`lib/assets/match.ts`)
Type is the **branch family** of the policy (`normalizeBranch(...).parentId ?? id`): motor/motorbike/truck → vehicle; home/renters → property; pet → pet; boat/marine_* → vessel; everything else → **no asset** (unassigned). A plate on a cyber row (dev has one) is ignored.

| Signal | Decision | Why |
|---|---|---|
| `policyAssetSubjectKey` equal, same owner | **deterministic** link | the one existing definition of "same thing"; mask/sentinel already → null |
| plate equal after also stripping `-`/`·` | **prompt** `plate_separator_variant` | widening the key would change duplicate-cover findings; asked instead |
| `findHomoglyphNearMisses` pair | **prompt** `homoglyph_near_miss` | two vehicles can legitimately produce it |
| plate absent, VIN equal | **prompt** `vin_only` | plates change on re-registration; VIN is rarely extracted (1/45) |
| address: full key equal | deterministic; same street short form, different remainder | **prompt** `address_street_only` |
| pet: microchip equal | deterministic; name only | **prompt** `pet_name_only` |
| vessel registry equal | deterministic | |
| health / life / travel / cyber / pension / business / other | **never matched** | no subject the extraction captures (H-010); travel is a category, not a thing |

A prompt renders at the first place the policy becomes visible after analysis — the existing `PolicyReviewScreen` (`components/wallet/PolicyReviewScreen.tsx`) and the wallet card — as «Ανήκει στο {asset.label};» with **Ναι / Όχι, άλλο / Νέο**. Nothing is applied until answered. Split (unlink) and reassign live on the asset detail. **A policy with no identifier stands alone** (ASSET-REFRAME-SPEC §3), listed under an «Χωρίς αντικείμενο» section with its `policyRowIdentity`.

### 3.5 Status per asset (`lib/assets/asset-status.ts`) — dated facts only
Input: the linked policies' `resolvePolicyLifecycle` results (server-side, passed down; never recomputed on the client). No gap, severity, score or recommendation data is read — enforced by an import-ban guard.

| Linked policies | Asset status | Word (subject to H-015) | Denominator shown |
|---|---|---|---|
| none | `no_policy` | «Χωρίς ασφαλιστήριο» | — |
| ≥1 in force (`IN_FORCE_KEYS`) with a **readable** end date, and none ≤30 days | `in_force` | «Σε ισχύ έως {max end}» | «{n} από {m} ασφαλιστήρια» |
| ≥1 in force with readable end ≤30 days (and none later in force) | `expiring` | «Λήγει σε {d} ημέρες» | same |
| all `expired`/`cancelled` | `expired` | «Έληξε στις {date}» | same |
| only `unknown_duration` (or `analyzing`) | `unknown` | «Άγνωστο — δεν διαβάστηκε η λήξη» | same |
| mixed with ≥1 `unknown_duration` | status from the readable ones **plus** «{k} με άγνωστη λήξη» | | |

"Never green when dates were unreadable": `in_force` requires a **readable** end date on the policy that makes it in force; an unreadable one can never contribute green. This is a *summary with its denominator*, so ASSET-REFRAME-SPEC §2.4 ("a group has no lifecycle") is honoured in substance — each nested policy keeps its own `resolvePolicyLifecycle` status and link — but the sentence contradicts the spec's letter → H-018.

### 3.6 Annual cost per asset
`calculatePremiumFootprintDetailed(linkedPolicies)` **reused as-is** (in-force only, majority currency, exclusion counts). Rendering: `total` with `premiumExclusionParts` beside it; if `unknownPremiumCount === countedPolicies` → «—» and «δεν διαβάστηκε». Unit label: «/έτος» only if every counted policy's term (`startDate` → resolved end) is 335–395 days; otherwise «για την περίοδο {start}–{end}». Never estimated, never annualised.

### 3.7 Backfill (`scripts/backfill-insured-assets.ts`, dev-first, idempotent, ref-guarded like `scripts/backfill-coverage-end-date.ts`)
For each `status ≠ deleted` policy: compute family + `policyAssetSubjectKey`. Key non-null → upsert asset `(owner, kind, key)` with `origin='extracted'`, label from make/model or street short form (through `policyAssetIdentity`, so a mask never becomes a label), link `match_source='backfill'`, `match_inputs={field, value}`. Key null → no row. Prompts are **not** generated by backfill (owner must be present to answer); they are generated lazily on first wallet load under the flag. Deterministic, re-runnable, and reversible by dropping the tables. Expected on dev: ≤ 10 vehicle assets, each with one policy — i.e. **the backfill will not demonstrate the grouping; only the fixture will**.

### 3.8 Count reconciliation — one definition, one source, one place
New keys for `lib/instrumentation/count-keys.ts` (and `INSTRUMENTATION-PLAN.md`):

| Key | Definition | Source | Renders at |
|---|---|---|---|
| `asset.count` | `insured_assets` rows of the owner (members: of each owner they belong to) | `listAssets()` | wallet heading, dashboard strip kicker |
| `asset.policyCount` (subject = asset) | linked policies with `status ≠ deleted` **visible to the viewer** | `getAsset()` | asset row (a door), asset detail header |
| `asset.inForceCount` / `expiringCount` / `expiredCount` / `unknownCount` / `noPolicyCount` | assets by §3.5 status | `assetStatus()` | strip, wallet overview |
| `portfolio.unassignedPolicyCount` | policies with no link | `listAssets()` | «Χωρίς αντικείμενο» heading |
| `asset.pendingPromptCount` | `asset_match_suggestions.status='pending'` for the viewer's policies | `listAssets()` | review banner |

Conservation identity, asserted by the extended guard on every fixture: `|distinct linked policies| + portfolio.unassignedPolicyCount = portfolio.policyCount`. `portfolio.policyCount` **keeps its definition**; the wallet shows both numbers with different labels (the §2.6 rule: different things, different keys, legible labels).

### 3.9 Components → primitives
| Component | Primitive | Facts / counts |
|---|---|---|
| `AssetList` (wallet, under flag) | `section` + `.pw-card` rows | `asset.count`, `portfolio.unassignedPolicyCount` |
| `AssetRow` | `.pw-card .pw-pad-tight`, branch icon (`lib/insurance/branch-icons`), `StatusPill` (tone from §3.5), `Link` → detail | `data-fact asset.label`, `asset.status`, `asset.coverageEnd`, `asset.cost`; `data-count asset.policyCount` **on the Link** (counts-are-doors) |
| `AssetDetail` (`/wallet/assets/[id]`) | page shell + header `.pw-card` + nested **`PolicyCard` reused verbatim** | per-policy facts unchanged — individual reachability and identity preserved by construction |
| `CoveredNowStrip` (dashboard first viewport) | `.pw-scroll-strip` of `.pw-pill` Links | `asset.inForceCount` etc.; hidden on empty portfolio; never an all-clear sentence without «στα {m} ασφαλιστήρια που ελέγξαμε» |
| `AssetMatchPrompt` | `ConfirmDialog` / `Modal` | `asset.pendingPromptCount` |
| `UnassignedPolicies` | existing `PolicyCard` grid | — |
| `EmptyState` | existing | — |
| Agent: `ClientPoliciesTab` "by asset" toggle | `.pw-segment` | same `asset.*` keys, visibility-scoped |

Feature flag `wallet.assets` (boolean). Off → every surface renders as today; tables may be migrated and backfilled while off.

---

## 4. Fixtures (`tests/measure/asset-fixtures.ts`, owner `e2e-ph-assets@policywallet.test`, idempotent by `(owner, policyNumber)`, `PROD_GUARD` as `dashboard-fixtures.ts:447`)

| Fixture | Rows | Produces the defect / edge it targets |
|---|---|---|
| **asset-household** (the 23-policy heavy fixture the series needs and the repo lacks) | 23 | «Το Yaris» plate `ΙΖΤ-1234` ×3 (motor active, motor expired prior term, roadside same plate) → **one row, three reachable policies**; `ΝΞΗ-7890` + `ΝΞΗ 7890` → prompt `plate_separator_variant`; `ΝΞΗ-7890` written with Latin `N`/`H` → prompt `homoglyph_near_miss`, never merged; VIN-only motor → prompt `vin_only`; home full address ×2 → deterministic; same street other city → prompt; pet «Μαξ» ×2 one with microchip → prompt `pet_name_only`; 3 health + 1 life → unassigned; travel «Ευρώπη» ×2 → never grouped; 1 cyber → unassigned; motor with **unreadable end date** + plate → asset `unknown`, never green; motor with masked plate `(XXXX)` → stands alone; Yaris policy with **no premium** → cost exclusion note; 6-month motor term → «για την περίοδο», not «/έτος»; 1 placeholder-identity motor → label never from `insurerName`. Baseline row count 23, target < 23; scroll height before/after. |
| **empty** | 0 | `policiesFor("empty")` (`dashboard-fixtures.ts:63`): no strip, no asset list, `asset.count` 0 rendered as nothing — not as reassurance |
| **all-expired** | 4 + plates | `policiesFor("all-expired")` (`:188-196`) with plates written → asset status `expired`, strip never green, premium total 0 with no "no cost" claim |
| **failed analysis** | 1 | `heavy` H10 / `typical` T3 pattern (`failedRun`) + `processingError` → no identifier read from a failed run's data, no asset, no prompt; the card says the run failed |
| **extractor placeholder** | 2 | `DEFECT_SPECS` `defect-unreadable` (`fixtures.ts:653` writes plate `"XXXX"`) and `placeholderIdentity` → row stands alone; «δεν διαβάστηκε»; `policy-sentinels-unrenderable` stays green |
| **longest Greek insurer name** | 1 | `LONG_INSURER` «ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ «Η ΕΘΝΙΚΗ»» (`dashboard-fixtures.ts:33`) on a Yaris policy → nested `PolicyCard` at 320 px inside the asset detail; truncation metric |
| **English summary left in storage** | 1 | `DEFECT_SPECS` `defect-english-summary` (`fixtures.ts:102-110`, deletes `summaryLanguage`) linked to the Yaris → asset detail must still refuse the summary via `resolveStoredSummary` |
| **varied-household** (existing, `dashboard-fixtures.ts:905+`) | 7 | regression: 2 vehicles, 1 home, 3 health, 1 life → exactly 3 assets, 4 unassigned, 0 prompts |

Each fixture is listed with the metric it moves; a fixture that moves none is removed, not kept.

---

## 5. Measurement plan

Captured **before** (flag off, HEAD) and **after** (flag on), at 320/390/430, on every fixture above, on `/wallet`, `/wallet/assets/[id]`, `/dashboard`, `/dashboard/agent`, `/customers/[id]`; harness `tests/measure/metrics.ts`; definitions copied word for word from `docs/build/policywallet-transformation-multiagent.md` §5.2 so they cannot drift:

- **Scroll height** — "`document.documentElement.scrollHeight` in CSS px after settle, per width. For paginated or virtualized surfaces, measure both initial and fully-loaded."
- **Section count** — "Distinct top-level content groupings a customer perceives as a section. Operationalize with a stated selector — heading-bearing top-level blocks plus bordered top-level blocks without headings. State the selector in the evidence file; nested sections count individually."
- **Duplicate-fact count** — "`data-fact="<namespace>.<key>"` values appearing more than once. Until instrumentation exists, run a parallel value scan counting visible elements whose own text contains each named fact value, and record **both**, because an attribute scan on an uninstrumented page returns a vacuous zero."
- **Count-consistency failures** — "`data-count="<namespace>.<key>"` keys whose rendered instances disagree without a label explaining the difference."
- **Internal-token leakage** — "Occurrences in rendered text **and in rendered outbound templates** of sentinels (`__…__`), `PENDING-<digits>`, `E2E-*`, fixture-shaped ids, bare UUIDs, raw snake_case enums, or placeholder markers («δοκιμαστικό», test, sample, draft)."
- **Truncation failures** — "Elements sourced from the `el` bundle where `scrollWidth > clientWidth`, plus any server-side string slicing on Greek content, plus mid-word breaks on brand names."
- **Sub-44px targets** — "`a, button, [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])` with a rendered box under 44px in either dimension. Excludes links inside running text and off-canvas chrome."
- **Layout-integrity failures** — "Sibling-element box overlaps, and vertical gaps above a stated threshold between consecutive list rows." (reported with `boxA`/`boxB`, page-flow elements only — CLAUDE.md)
- **Contrast** — "WCAG 1.4.3 (text, 4.5:1 body / 3:1 large) **and 1.4.11 (non-text boundaries, 3:1)**."

Plus, from the repo rather than §5.2 (stated so they are not mistaken for §5.2 metrics):
- **`duplicate-identity-row`** — `tests/measure/metrics.ts:313-352` (`duplicateRowCount`, `largestGroupSize`, `unlocatable`).
- **Wallet row count** — `[data-fact="asset.label"]` + unassigned `PolicyCard`s (after) vs `PolicyCard`s (before); the series' "row count reduced vs baseline".
- **Silent-merge count** — SQL: `policy_insured_assets WHERE match_source='deterministic' AND NOT (match_inputs->>'rule' = 'exact_subject_key')` — must be **0**; and **prompt count** = `asset_match_suggestions` rows per fixture, compared to the fixture's declared uncertain cases (asset-household: 5).
- **Cross-surface sweep** — `tests/measure/phase5-cross-surface.spec.ts` extended with `/wallet/assets/[id]` and the agent surfaces; a void (two-pass mismatch) fails the run.

Commands: `npx playwright test tests/measure/wallet-identity-duplicates-baseline.spec.ts tests/measure/phase5-cross-surface.spec.ts --project=measure --no-deps`; `npx vitest --run tests/unit/count-instrumentation-registry.test.tsx`.

---

## 6. Risks to CLAUDE.md invariants

| Invariant | How this series could break it | How the design prevents it |
|---|---|---|
| One authorization path (`getPolicyAccess`) | a new asset read that lists policies without checking each | `getAssetAccess` lives in `lib/policy-access.ts` and is a projection of per-policy access; single-path guard enumerates the new actions; HTTP cross-tenant spec gains asset routes |
| Agent access dies with the relationship | an asset-level grant outliving termination | **no asset-level grants exist**; nothing new to revoke |
| Rules decide a gap; `resultJson.gapResults` is prose | asset status reading gap data | `asset-status.ts` imports only `policy-status`/`policy-status-view`; import-ban guard |
| `lib/gap-detection.ts` frozen (SHA `1d397fd9…`) | widening `policyAssetSubjectKey` to catch hyphen variants | key **unchanged**; variants become prompts; `gap-detection.ts` untouched (it does not import identity code — `lib/gap-detection.ts:1-3`) |
| Consent before any model call; document gate single path | a second upload or "add asset from photo" path | assets are a post-persist read of `acordData`; no model call, no storage write; `ingestPolicyDocument` remains the one path |
| Severity through `describeSeverity()` | an asset pill coloured by severity | status tones map only from §3.5 states |
| Composed summary language | asset detail rendering `coverageSummary` | nested `PolicyCard`/detail reuse `resolveStoredSummary`; fixture `defect-english-summary` proves it |
| Masked value = extraction failure | «(XXXX)» becoming an asset label or key | `policyAssetIdentity` (mask → unreadable, sentinel → null) is the only reader; fixture `defect-unreadable` |
| Lifecycle from ONE call, passed down | a client-side «έως 14/3» countdown | `assetStatus()` server-side over `resolvePolicyLifecycle` outputs; `policy.daysRemaining` facts unchanged |
| `.pw-scroll-strip` for strips | the "covered now" strip collapsing at ≤430 px | strip uses the primitive; `page-overflow-probe` run on it |
| `data-fact` one element, one place | `policy.insurer` on asset row **and** nested card on one page | the asset row carries `asset.*` facts only; policy facts live on the nested card only |
| Placeholder identity never rendered raw | asset label falling back to `insurerName` | labels from make/model, street, pet name, or owner text — never from `insurerName`/`policyNumber`; `policy-sentinels-unrenderable` universe includes `lib/assets/` |
| Admin reads leave a trace | an admin asset view | none added in this series |
| `"use server"` exports are public endpoints | an action taking `userId` | all subjects from the session; each action guarded |
| Absence is not reassurance | «Καλυμμένο» for an asset whose dates could not be read; «Όλα σε ισχύ» over an empty strip | `in_force` requires a readable end date; `no_policy`/`unknown` are explicit states; `all-clear-honesty` extended with asset probes |
| Voice: reads/explains, never advises; one term per concept | «Το Yaris δεν καλύπτεται» (a verdict) or an unlexiconed noun | status wording is dated-fact only; the asset noun is an **H-015** decision; every string passes `greek-copy-reviewer` and Eli |
| Counts are doors; visible denominators | `asset.policyCount` as plain text | on the row `Link`; «{n} από {m}» on every status |
| Env precedence / `migrate dev` ban | backfill against prod by accident | script refuses any ref ≠ `lzqvtvjggylcujenlelh` unless `--prod` with an explicit ref; migration via `migrate deploy` dev→prod |
| New personal-data stores need DSR wiring | the schema-derived erasure guard going red | `gdpr-erasure.service.ts` deletes assets/links/suggestions by `ownerUserId`; `compliance.service.ts` exports them |
| Gap catalogue reference data | n/a — no rule added | — |
| Catalog coupling (plans) | pricing by asset count (H3) | **no entitlement reads asset counts in this series** (H-017) |

---

## 7. Questions only Eli can answer

Appended to `docs/transformation/HALTS.md` as **H-012 … H-018** (the repo's live halt file; there is no root `HALTS.md`):

- **H-012 (H4)** — approve the migration shape in §3.1; run the read-only profile on production first (not reachable from this session).
- **H-013** — explicitly supersede D-034; its reopen trigger has not fired.
- **H-014** — rewrite the RLS acceptance criterion: no per-role policies exist anywhere in the schema; what should the security review assert?
- **H-015** — the Greek noun for "asset" and the gender-agreeing status words; «Ανήκει στο Yaris;» copy; a LEXICON row.
- **H-016 (H5 / H-010)** — person-type assets: owner-created only, no extraction, no auto-match on health/life — confirm.
- **H-017 (H3)** — pricing by assets vs policies: confirm no entitlement metering on assets in this series.
- **H-018** — ASSET-REFRAME-SPEC §2.4 ("a group has no lifecycle") vs item 5 ("status per asset"): approve the summary-with-denominator reconciliation in §3.5.

### Greek-rule facts consulted (web, accessed 2026-10-21) — none is a deadline or fee; they only inform identifier normalisation
- Greek plates: three letters + four digits, letters from the Greek/Latin-shared set — [Wikipedia, "Vehicle registration plates of Greece"](https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Greece); [matriculasdelmundo.com](https://matriculasdelmundo.com/en/greece.html). **No official ministry page was found**; the design does not depend on the format beyond "strip separators = uncertain".
- ΚΑΕΚ is a 12-digit code; an official example `000010101001` appears in [ktimatologio.gov.gr's user guide](https://ktimatologio.gov.gr/CitizenWebApp/images/manualAnart.pdf). **The digit structure was not found on an official page.** ΚΑΕΚ is **not extracted** today, so nothing here depends on it.
- ΑΦΜ: nine digits per the 1998 ministerial decision reproduced at [forin.gr (ΠΟΛ 1120/1998)](https://www.forin.gr/articles/article/1994/pol-1120-1998); the check-digit algorithm was found only in a [non-official package](https://packagist.org/packages/kgalanos/check-afm). The extracted ΑΦΜ is the policyholder's, not a business's; not used as an asset key.
- Pet microchips: ISO 11784/11785 code structure — [Wikipedia](https://en.wikipedia.org/wiki/ISO_11784_and_ISO_11785); the text of Regulation (EU) 576/2013 Annex II and a Greek 15-digit requirement under ν. 4830/2021 **were not retrieved** (only municipal notices of the €300 fine: [mytilene.gr](https://www.mytilene.gr/?p=59310)). Microchip is extracted in **0/45** dev rows.

---

STEP0 COMPLETE — awaiting approval
