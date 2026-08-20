# Severity review packet
**Generated 2026-08-20 from the live catalogue — do not edit by hand.**

Regenerate with `npx tsx scripts/gen-severity-review-packet.ts`. It reads the database, so it always describes the rules that are actually running.

## What is being asked

PolicyWallet decides **whether** a coverage gap exists with a rule that reads named fields of the policy document. That part is a question of fact, and it is traced against fixtures before it ships.

**How serious the gap is** — `low` / `medium` / `high` / `critical` — is not a question of fact. It is an underwriting judgement, and nobody qualified has made it. Until someone does, every screen that names a severity also carries a line saying it is not a definitive risk assessment.

For each rule below, please confirm or change:

1. **Is the severity right?** If not, what should it be?
2. **Is the wording defensible** to a policyholder who disputes it?
3. **Should the rule exist at all?**

A "no" to (3) is a useful answer and costs nothing — a rule can be deactivated in one statement.

---

## Status

| | Count |
|---|---|
| Active definitions | **17** |
| Severity validated | **0** |
| Awaiting review | **17** |

---

## Rules awaiting review

### health

#### `missing_coordination_centre` — proposed severity: **medium**

**What the customer sees**

> **No coordination centre recorded**
>
> No coordination centre (κέντρο συντονισμού) phone number is recorded for this policy. Greek health policies normally give one for pre-authorising hospital admissions — check your policy documents and add it, so it is to hand when you need it.

**What the rule asks**

- Was **health.coordinationCentre.phone** recorded anywhere in the document?  
  _Fires when it was NOT — i.e. on silence. The finding must say "not recorded", never "not covered"._

**Fields read:** `health.coordinationCentre.phone`

> ⚠️ This rule fires when the value was **not recorded**, which is not the same as the cover being absent. Please check the wording above says so.

**Decision**

- Severity: ☐ agree `medium`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `missing_hospital_class` — proposed severity: **low**

**What the customer sees**

> **Hospital room class not recorded**
>
> No room class (θέση νοσηλείας) is recorded for this policy. Greek health policies state it, and it decides which room you are entitled to on admission — check your documents and add it.

**What the rule asks**

- Was **health.hospitalClass** recorded anywhere in the document?  
  _Fires when it was NOT — i.e. on silence. The finding must say "not recorded", never "not covered"._

**Fields read:** `health.hospitalClass`

> ⚠️ This rule fires when the value was **not recorded**, which is not the same as the cover being absent. Please check the wording above says so.

**Decision**

- Severity: ☐ agree `low`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_annual_checkup` — proposed severity: **low**

**What the customer sees**

> **Annual check-up not included**
>
> Ο ετήσιος προληπτικός έλεγχος is not part of this policy.

**What the rule asks**

- Does the document explicitly state that **health.annualCheckupIncluded** is NOT included?

**Fields read:** `health.annualCheckupIncluded`

**Decision**

- Severity: ☐ agree `low`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_direct_billing` — proposed severity: **medium**

**What the customer sees**

> **Direct settlement with the hospital not available**
>
> This policy does not offer απευθείας εξόφληση. You would pay the hospital yourself and claim the money back afterwards, which means having the funds available at the time.

**What the rule asks**

- Does the document explicitly state that **health.directBillingAvailable** is NOT included?

**Fields read:** `health.directBillingAvailable`

**Decision**

- Severity: ☐ agree `medium`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

### home

#### `missing_enfia_components` — proposed severity: **high**

**What the customer sees**

> **Not eligible for the ENFIA discount**
>
> Insuring a home against fire, earthquake AND flood qualifies it for a reduction in ENFIA property tax. One or more of the three is missing from this policy.

**What the rule asks**

- Is at least one of these explicitly NOT included: `property.fireCoverageIncluded`, `property.earthquakeCoverageIncluded`, `property.floodCoverageIncluded`?

**Fields read:** `property.fireCoverageIncluded`, `property.earthquakeCoverageIncluded`, `property.floodCoverageIncluded`

**Decision**

- Severity: ☐ agree `high`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_earthquake_cover` — proposed severity: **high**

**What the customer sees**

> **Earthquake cover not included**
>
> This policy states that earthquake (σεισμός) is not covered. Greece is the most seismically active country in Europe, and earthquake is excluded from a standard fire policy unless it is bought explicitly.

**What the rule asks**

- Does the document explicitly state that **property.earthquakeCoverageIncluded** is NOT included?

**Fields read:** `property.earthquakeCoverageIncluded`

**Decision**

- Severity: ☐ agree `high`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_fire_cover` — proposed severity: **high**

**What the customer sees**

> **Fire cover not included**
>
> This policy states that fire (πυρκαγιά) is not covered. Fire is the base peril of a Greek home policy, and a mortgage lender normally requires it.

**What the rule asks**

- Does the document explicitly state that **property.fireCoverageIncluded** is NOT included?

**Fields read:** `property.fireCoverageIncluded`

**Decision**

- Severity: ☐ agree `high`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_flood_cover` — proposed severity: **high**

**What the customer sees**

> **Flood cover not included**
>
> This policy states that flood (πλημμύρα) is not covered.

**What the rule asks**

- Does the document explicitly state that **property.floodCoverageIncluded** is NOT included?

**Fields read:** `property.floodCoverageIncluded`

**Decision**

- Severity: ☐ agree `high`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

### life

#### `no_beneficiaries_recorded` — proposed severity: **high**

**What the customer sees**

> **No beneficiary recorded**
>
> No beneficiary (δικαιούχος) is recorded on this policy. With nobody named, the benefit is settled through the estate rather than paid directly — which takes longer, and may not follow what you intended.

**What the rule asks**

- Were **all** of these absent: `beneficiaries`, `lifeAndInvestment.beneficiaries`?  
  _Fires on silence across every path._

**Fields read:** `beneficiaries`, `lifeAndInvestment.beneficiaries`

> ⚠️ This rule fires when the value was **not recorded**, which is not the same as the cover being absent. Please check the wording above says so.

**Decision**

- Severity: ☐ agree `high`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

### motor

#### `green_card_expiring` — proposed severity: **medium**

**What the customer sees**

> **Green Card Expiring Soon**
>
> Your international motor insurance certificate (Green Card / Πράσινη Κάρτα) expires within 30 days. Renew before traveling abroad.

**What the rule asks**

- Does **vehicle.greenCardExpiryDate** fall within the next 30 days?

**Fields read:** `vehicle.greenCardExpiryDate`

**Decision**

- Severity: ☐ agree `medium`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `missing_accident_declaration_phone` — proposed severity: **low**

**What the customer sees**

> **Accident declaration number not recorded**
>
> No accident-declaration telephone number (φιλικός διακανονισμός) is recorded for this policy. Greek motor policies normally print one — check your documents and add it, so it is to hand at the roadside rather than looked for afterwards.

**What the rule asks**

- Was **vehicle.accidentDeclarationPhone** recorded anywhere in the document?  
  _Fires when it was NOT — i.e. on silence. The finding must say "not recorded", never "not covered"._

**Fields read:** `vehicle.accidentDeclarationPhone`

> ⚠️ This rule fires when the value was **not recorded**, which is not the same as the cover being absent. Please check the wording above says so.

**Decision**

- Severity: ☐ agree `low`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_glass_breakage_cover` — proposed severity: **medium**

**What the customer sees**

> **Glass breakage not covered**
>
> Θραύση κρυστάλλων is not included in this policy. A windscreen is among the most common motor claims in Greece, and replacing one would be at your own cost.

**What the rule asks**

- Does the document explicitly state that **vehicle.glassBreakage** is NOT included?

**Fields read:** `vehicle.glassBreakage`

**Decision**

- Severity: ☐ agree `medium`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_own_damage_cover` — proposed severity: **high**

**What the customer sees**

> **Own-damage cover not included**
>
> This policy states that damage to your own vehicle (ίδιες ζημιές) is not covered. However the other party is dealt with, repairs to your own car after an at-fault accident would be paid by you.

**What the rule asks**

- Does the document explicitly state that **vehicle.ownVehicleDamage** is NOT included?

**Fields read:** `vehicle.ownVehicleDamage`

**Decision**

- Severity: ☐ agree `high`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_roadside_assistance` — proposed severity: **medium**

**What the customer sees**

> **Roadside assistance not included**
>
> Οδική βοήθεια is not part of this policy. A breakdown or tow would be arranged and paid for by you, unless you hold roadside assistance separately.

**What the rule asks**

- Does the document explicitly state that **vehicle.hasRoadsideAssistance** is NOT included?

**Fields read:** `vehicle.hasRoadsideAssistance`

**Decision**

- Severity: ☐ agree `medium`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

### pet

#### `missing_leishmaniasis` — proposed severity: **high**

**What the customer sees**

> **No Leishmaniasis Protection**
>
> Leishmaniasis (Λεϊσμανίαση) is endemic in Greece. Pet insurance without leishmaniasis coverage leaves a critical gap for dogs.

**What the rule asks**

- Does the document explicitly state that **pet.leishmaniaCovered** is NOT included?

**Fields read:** `pet.leishmaniaCovered`

**Decision**

- Severity: ☐ agree `high`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `missing_microchip_number` — proposed severity: **low**

**What the customer sees**

> **Microchip number not recorded**
>
> No microchip number is recorded for this policy. Microchipping is a legal requirement for dogs in Greece and insurers normally record the number as the animal’s identity — check your documents and add it.

**What the rule asks**

- Was **pet.microchipNumber** recorded anywhere in the document?  
  _Fires when it was NOT — i.e. on silence. The finding must say "not recorded", never "not covered"._

**Fields read:** `pet.microchipNumber`

> ⚠️ This rule fires when the value was **not recorded**, which is not the same as the cover being absent. Please check the wording above says so.

**Decision**

- Severity: ☐ agree `low`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---

#### `no_direct_vet_payment` — proposed severity: **medium**

**What the customer sees**

> **Direct payment to the vet not available**
>
> This policy does not pay the veterinary clinic directly. You would settle the bill yourself and claim it back afterwards.

**What the rule asks**

- Does the document explicitly state that **pet.directVetPayment** is NOT included?

**Fields read:** `pet.directVetPayment`

**Decision**

- Severity: ☐ agree `medium`  ☐ change to `________`  ☐ remove the rule
- Wording: ☐ acceptable  ☐ change to: ________
- Reviewer: ________________________  Date: __________
- Reasoning: ________________________________________

---
