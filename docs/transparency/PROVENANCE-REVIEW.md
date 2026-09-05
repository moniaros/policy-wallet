# PW-TRANSPARENCY-02 — provenance review (F5, close-out)

> **Status: PRE-GA GATED.** This is an agent's citation-backed classification, not a legal opinion.
> Every row marked *legislative* below must be confirmed by the legal track before GA; until then the
> product renders the citation beside the class so a reader can check it, and `HANDOFF.md` lists this
> file as **blocking GA**. Nothing is classified *market* in this pass; nothing is classified without a
> law and an article that can be named. Anything short of that stays *under review* — the conservative
> side, by rule (B3).

Source of truth in code: `lib/gaps/provenance.ts` (`GAP_PROVENANCE`). Guard: `tests/unit/provenance-citations-render.test.tsx`
(a classified slug without a bilingual citation fails CI; every render site of a class renders the citation).

Reviewed by: agent, citation-backed · Reviewed at: 2026-09-06 · Legal sign-off: **pending**.

## Summary

| class | count | slugs |
|---|---|---|
| legislative | **3** | `insured_value_above_declared`, `insured_value_below_rebuild_cost`, `missing_microchip_number` |
| contractual | 0 | — |
| market | 0 | — (not classified in this pass, by instruction) |
| under_review | **26** | everything else |

## Citations used

| id | instrument | article | what it says (paraphrase) | source |
|---|---|---|---|---|
| C1 | Ν. 2496/1997 «Ασφαλιστική σύμβαση…» (ΦΕΚ Α΄ 87/16.5.1997) | άρθρο 17 «Υπασφάλιση – Υπερασφάλιση» | §1: when the insured sum is below the insurable value the insurer pays proportionally (underinsurance). §2: when the insured sum exceeds the insurable value the insurer is not liable beyond the actual value (overinsurance). | https://www.lawspot.gr/nomothesia/n-2496-1997/arthro-17-nomos-2496-1997-ypasfalisi-yperasfalisi/ |
| C2 | Ν. 4830/2021 «Νέο πλαίσιο για την ευζωία των ζώων συντροφιάς» (ΦΕΚ Α΄ 169/18.9.2021) | άρθρο 9 παρ. 1 περ. β΄ (and άρθρο 4 παρ. 12 for the registry) | The owner must microchip and register a dog or cat in the national companion-animal registry (ΕΜΖΣ). | https://www.e-nomothesia.gr/kat-zoa-suntrophias-prostasia-zoon/nomos-4830-2021-phek-169a-18-9-2021.html |

## The 29 rows

Confidence: **high** = the article's text was read and matches the rule's subject; **candidate** = a
plausible instrument exists but the specific article was not pinned, so the slug stays under review;
**none** = no legal or contractual instrument is known to require the item — likely *market* or a
product feature, which this pass does not classify.

| # | slug | branch | class | citation | confidence | note |
|---|---|---|---|---|---|---|
| 1 | no_own_damage_cover | motor | under_review | — | none | Own-damage cover is optional; only third-party liability is compulsory (Π.Δ. 237/1986). A *market* candidate. |
| 2 | no_glass_breakage_cover | motor | under_review | — | none | Optional cover. |
| 3 | no_roadside_assistance | motor | under_review | — | none | Optional cover. |
| 4 | missing_accident_declaration_phone | motor | under_review | — | candidate | The accident-declaration duty exists (Π.Δ. 237/1986, άρθρο 9 «Υποχρεώσεις ασφαλισμένου» is the likely seat) but the article text was not read in this pass. |
| 5 | green_card_expiring | motor | under_review | — | candidate | The international certificate (green card) regime is Π.Δ. 237/1986 / Ν. 489/1976 (Γραφείο Διεθνούς Ασφάλισης, άρθρο 27); the article requiring the certificate for travel was not pinned. |
| 6 | insured_value_above_declared | motor | **legislative** | C1 (άρθρο 17 §2) | high | Overinsurance: the insurer is not liable beyond the actual value, so an insured sum well above the document's own value buys nothing. |
| 7 | moto_no_own_damage_cover | motorbike | under_review | — | none | As #1. |
| 8 | moto_no_roadside_assistance | motorbike | under_review | — | none | As #3. |
| 9 | moto_missing_accident_declaration_phone | motorbike | under_review | — | candidate | As #4. |
| 10 | moto_green_card_expiring | motorbike | under_review | — | candidate | As #5. |
| 11 | no_earthquake_cover | home | under_review | — | none | Not compulsory by law for private dwellings; mortgage lenders require it *contractually*, but no standard clause can be named for an arbitrary policy. |
| 12 | no_flood_cover | home | under_review | — | none | As #11. |
| 13 | no_fire_cover | home | under_review | — | none | As #11. |
| 14 | missing_enfia_components | home | under_review | — | none | A recording check; no instrument requires a policy to state ENFIA components. |
| 15 | insured_value_below_rebuild_cost | home | **legislative** | C1 (άρθρο 17 §1) | high | Underinsurance: proportional indemnity when the insured sum is below the insurable (rebuild) value. |
| 16 | no_direct_billing | health | under_review | — | none | Product feature. |
| 17 | no_annual_checkup | health | under_review | — | none | Product feature. |
| 18 | missing_hospital_class | health | under_review | — | none | Recording check. |
| 19 | missing_coordination_centre | health | under_review | — | none | Recording check. |
| 20 | group_missing_coordination_centre | group health | under_review | — | none | As #19. |
| 21 | group_missing_hospital_class | group health | under_review | — | none | As #18. |
| 22 | group_no_direct_billing | group health | under_review | — | none | As #16. |
| 23 | no_direct_vet_payment | pet | under_review | — | none | Product feature. |
| 24 | missing_microchip_number | pet | **legislative** | C2 | high | Microchipping and registry entry are a statutory duty of the owner; a pet policy that records no microchip number cannot be tied to the registered animal. |
| 25 | missing_leishmaniasis | pet | under_review | — | none | Cover/recording check; no instrument. |
| 26 | no_repatriation_cover | travel | under_review | — | none | Optional cover. |
| 27 | no_trip_cancellation_cover | travel | under_review | — | none | Optional cover. |
| 28 | missing_emergency_assistance_phone | travel | under_review | — | none | Recording check. |
| 29 | no_beneficiaries_recorded | life | under_review | — | candidate | Ν. 2496/1997 άρθρα 27–29 govern beneficiary designation in life insurance, but they do not *require* a named beneficiary (the estate inherits by default); classification needs a legal read. |

## What the legal track must do before GA

1. Confirm C1 applies to both value-drift rules as worded in the product (the rule compares figures the
   policy itself states; the article speaks of *ασφαλιστική αξία*).
2. Confirm C2 supports a pet-policy recording check (the duty is the owner's, not the insurer's).
3. Decide the four *candidate* rows (#4, #5, #9, #10, #29) — pin the article or leave them under review.
4. Decide whether any *none* row is *market* practice worth stating as such, or stays under review for good.

Every change lands in `GAP_PROVENANCE` with the reviewer's name and date; the guard will refuse a class
without a citation.
