# P5-wallet-01 — what the extraction actually gives us to tell two rows apart

Read-only analysis of `lib/schemas/acord-data.ts` and
`lib/services/ai/extraction-enrichment.ts`. Answers the acceptance amendment's
"per-line identifier availability" and "prohibited substitutes" questions, and
independently confirms **H-010**.

## Per line

| Line | Structured identifier in `acordData` | Usable to distinguish two rows? |
|---|---|---|
| vehicle / motor | `vehicle.plateNumber`, `vehicle.vin`, `make`+`model`+`year` | **Yes, strong.** The plate is what an owner calls the car. |
| property / home | `property.address` | **Yes, strong.** |
| pet | `pet.name`, `microchipNumber`, `breed` | **Yes, strong.** The pet's name is the natural label. |
| marineVessel | `marineVessel.name`, `registryNumber`, `flag` | **Yes, strong.** |
| travel | `travel.destinationScope`, `tripDurationDays` | **Weak.** A scope is a category, not an identity — two trip policies to "Europe" collide. |
| health | *none* | **No.** Every field in the block is a coverage term: `annualLimit`, `roomAndBoardLimit`, `hospitalClass`, `outOfPocketMax`… |
| life / lifeAndInvestment | *none* | **No.** `deathBenefit`, `maturityDate`, `surrenderValue` — all amounts and dates. |
| cyber / business / pension | **no schema block at all** | **No** (H-010). |

This predicts the measured result exactly: `varied-household` produced 2
duplicate rows out of 7, **both health** — the one line with no identifier
field of any kind.

## The three names in the data, and why none of them is an identifier

1. **`policyholder.name` / `insured.name` — not document data.**
   `extraction-enrichment.ts:239-251` writes both from `customerFullName`, the
   PolicyWallet account holder's own profile. Same value on every policy in the
   wallet, and never read off the schedule. Zero discriminating power *by
   construction*. Neither key exists in the extraction schema; `deriveInsuredNames`
   also probes `acord.insureds` and `acord.policy.insuredName`, neither of which
   is in the schema either.

2. **`insuredPersons[]` — names deliberately dropped.** Schema line 375, roles
   and counts only: *"PolicyWallet has no basis to ingest a third party's name"*.
   It is a marine-crew / fidelity class schedule, not a family list.
   `dashboard-fixtures.ts:765` already records this for health.

3. **`beneficiaries[].name` — a real person's name, and PROHIBITED here.**
   This is the only genuine third-party name in the payload. Labelling a row
   with it would repeat, on the wallet, the precise harm
   `lib/wallet/insured-people.ts` was written to fix: a δικαιούχος is not an
   ασφαλισμένος. On a life policy the beneficiary is by construction *not* the
   insured. A row reading "Life — Μαρία" tells the customer Μαρία is covered
   when Μαρία is merely who gets paid.

## Consequences for P5-wallet-01

- Motor, property, pet and marine can be made distinguishable **from extracted
  data alone**. No schema change, no new extraction.
- Health, life, travel, cyber, business and pension **cannot**. For these the
  only remaining discriminator is `policy.policyNumber` — which is real, but
  can hold a sentinel (`PENDING-…`) and must therefore go through
  `lib/wallet/policy-identity.ts`, never be rendered raw.
- A row whose identifier is unavailable **stands alone rather than being
  guessed at** — the rule already written into `ASSET-REFRAME-SPEC.md`.

## Prohibited substitutes

Not to be used as a row identifier, each for a stated reason:

- `beneficiaries[].name` — see above; it names someone who is not covered.
- `policyholder.name` / `insured.name` — constant across the wallet.
- premium amount, sum insured, or any money figure — two policies can share
  one, and a number in the identity slot reads as a fact about cover.
- the AI `coverageSummary` — composed prose, language-pinned, and already
  barred from direct rendering.
