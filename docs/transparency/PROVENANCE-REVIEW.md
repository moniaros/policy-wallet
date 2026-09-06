# PW-TRANSPARENCY-02 / PW-CONTENT-01 — provenance review (Goal 2, citation-backed)

> **Status: PRE-GA GATED. Blocks GA (HANDOFF H10).** This is an agent's citation-backed classification,
> not a legal opinion. Every classified row renders its citation beside its class in the product so a
> reader can check it; the legal and underwriting tracks sign this document before GA. Nothing is
> classified on inference: a row is `legislative` only with a named law and article, `contractual` only
> with a named class of contract, `market` only with a named public source, and everything else stays
> `under_review` — with **what was searched and not found**, which tells the underwriter track where to look.

Source of truth in code: `lib/gaps/provenance.ts` (`GAP_PROVENANCE`). Guard: `tests/unit/provenance-citations-render.test.tsx`
(a classified slug without a bilingual citation fails CI; every render site of a class renders the citation; both slug
forms resolve). Reviewed by: agent, citation-backed · Reviewed: 2026-09-06 (F5 pass) and 2026-09-06 (PW-CONTENT-01 Goal 2 pass) · Legal sign-off: **pending**.

## Summary

| class | count | slugs |
|---|---|---|
| legislative | **6** | `insured_value_above_declared`, `insured_value_below_rebuild_cost`, `missing_microchip_number`, `missing_enfia_components`, `missing_accident_declaration_phone`, `moto_missing_accident_declaration_phone` |
| contractual | 0 | — (no named contract class could be tied to a rule that fires regardless of whether that contract exists; see #10–12) |
| market | **2** | `missing_hospital_class`, `no_direct_billing` |
| under_review | **32** | everything else — each with its search record below (21 from the original 29, plus the 11 renters / home-contents rules authored in PW-CONTENT-01 Goal 5, which enter under review by construction) |

Before Goal 2: 3 / 0 / 0 / 26. After Goal 2: 6 / 0 / 2 / 21. After Goal 5 (11 new rules, all under review): 6 / 0 / 2 / 32 of 40.

## Citations used

| id | instrument | article | what it says (paraphrase) | source |
|---|---|---|---|---|
| C1 | Ν. 2496/1997 «Ασφαλιστική σύμβαση…» (ΦΕΚ Α΄ 87/16.5.1997) | άρθρο 17 «Υπασφάλιση – Υπερασφάλιση» | §1 proportional indemnity when the insured sum is below the insurable value; §2 the insurer is not liable beyond the actual value when the insured sum exceeds it. | https://www.lawspot.gr/nomothesia/n-2496-1997/arthro-17-nomos-2496-1997-ypasfalisi-yperasfalisi/ |
| C2 | Ν. 4830/2021 (ΦΕΚ Α΄ 169/18.9.2021) | άρθρο 9 παρ. 1 περ. β΄ (and άρθρο 4 παρ. 12) | The owner must microchip and register a dog or cat in the national registry (ΕΜΖΣ). | https://www.e-nomothesia.gr/kat-zoa-suntrophias-prostasia-zoon/nomos-4830-2021-phek-169a-18-9-2021.html |
| C3 | Ν. 4223/2013 (ΕΝΦΙΑ), άρθρο 3 παρ. 7Ζ, όπως ισχύει με το άρθρο 10 παρ. 1 του ν. 5162/2024 | άρθρο 3 παρ. 7Ζ | ENFIA is reduced (10% to 2024, **20% from 2025**) for a natural person's residence of taxable value ≤ €500,000 insured **cumulatively for earthquake, fire and flood** for at least three months in the year. | https://www.e-nomothesia.gr/law-news/diplasiazetai-ekptose-enphia-sto-gia-katoikies-poy-asfalizontai.html · AADE FAQ https://www.aade.gr/sites/default/files/2026-01/FAQs_asfalismenwn_katoik2026.pdf (403 to automated fetch; title confirmed via search) |
| C4 | Π.Δ. 237/1986 (κωδικοποίηση ν. 489/1976, υποχρεωτική ασφάλιση αυτοκινήτων) | άρθρο 9 παρ. 1 | The policyholder / insured must declare every accident of the insured motor vehicle to the insurer without culpable delay and at the latest within eight (8) working days. | https://www.karagiannislawfirm.gr/nomika/emporiko-dikaio/1389-asfalia-autokinitou-65704 · text of ν. 489/1976 at https://www.bankofgreece.gr/RelatedDocuments/law489gr.pdf |
| M1 | Εθνική Ασφαλιστική, published product page «Ασφάλεια Υγείας» | — | Hospital programmes are defined by «Επιλογή Θέσης Νοσηλείας (Lux, A ή Β)» and offer «Απευθείας Κάλυψη Εξόδων» in contracted hospitals as standard features. | https://www.ethnikiasfalistiki.gr/health (read 2026-09-06) |

## The 40 rows (29 original + 11 authored in Goal 5)

Confidence: **high** = article text read and it matches the rule's subject; **medium** = named public source, not general terms or statute; **candidate** = an instrument exists but does not impose the requirement, or the article was not pinned; **none** = nothing citable found. For every `under_review` row the *searched* column is the record for the underwriter track.

| # | slug | branch | class | citation | conf. | note / what was searched |
|---|---|---|---|---|---|---|
| 1 | no_own_damage_cover | motor | under_review | — | none | Optional cover; only third-party liability is compulsory (Π.Δ. 237/1986 άρθρο 2). Searched: ΕΑΕΕ motor guidance, insurers' general terms — they describe ίδιες ζημιές as προαιρετική κάλυψη, which is not a requirement. |
| 2 | no_glass_breakage_cover | motor | under_review | — | none | Optional cover. Same search as #1. |
| 3 | no_roadside_assistance | motor | under_review | — | none | Optional cover. Same search as #1. |
| 4 | missing_accident_declaration_phone | motor | **legislative** | C4 | high | The declaration duty is statutory; the recorded number is the means to meet it within eight working days. |
| 5 | green_card_expiring | motor | under_review | — | candidate | Searched: Π.Δ. 237/1986 άρθρα 25–27 (they constitute the Γραφείο Διεθνούς Ασφάλισης, no duty on the policyholder); Directive 2009/103/EC art. 4 (no border checks inside the EU — the card is not required there); Γραφείο Διεθνούς Ασφάλισης material (the card is required by the destination state outside the multilateral agreement: Albania, Turkey…). No Greek article obliges a Greek driver to carry it. |
| 6 | insured_value_above_declared | motor | **legislative** | C1 (§2) | high | Overinsurance: the insurer pays no more than the actual value. |
| 7 | moto_no_own_damage_cover | motorbike | under_review | — | none | As #1. |
| 8 | moto_no_roadside_assistance | motorbike | under_review | — | none | As #3. |
| 9 | moto_missing_accident_declaration_phone | motorbike | **legislative** | C4 | high | Π.Δ. 237/1986 covers every motor vehicle under compulsory insurance, motorcycles included (ν. 489/1976 άρθρο 1). |
| 10 | moto_green_card_expiring | motorbike | under_review | — | candidate | As #5. |
| 11 | no_earthquake_cover | home | under_review | — | candidate | Searched: no statute requires a private dwelling to be insured; mortgage loan agreements require fire/earthquake cover *contractually*, but the rule fires whether or not a mortgage exists, so a «συμβατική απαίτηση» label would be false on an unmortgaged home. ENFIA incentive is #13. State-aid rules after natural disasters (ν. 4797/2021) condition aid, not cover. |
| 12 | no_flood_cover | home | under_review | — | candidate | As #11. |
| 13 | no_fire_cover | home | under_review | — | candidate | As #11. |
| 14 | missing_enfia_components | home | **legislative** | C3 | high | The ENFIA reduction requires all three of fire, earthquake and flood; the rule fires when at least one is explicitly absent. |
| 15 | insured_value_below_rebuild_cost | home | **legislative** | C1 (§1) | high | Underinsurance: proportional indemnity. |
| 16 | no_direct_billing | health | **market** | M1 | medium | «Απευθείας Κάλυψη Εξόδων» in contracted hospitals is presented as a standard hospital-programme feature by a named insurer; a policy that explicitly excludes it deviates from that practice. Source is a product page, not general terms — legal/underwriting to confirm or replace. |
| 17 | no_annual_checkup | health | under_review | — | none | Searched: the same insurer page lists a check-up on ONE programme only («Full Health Value»); ΕΑΕΕ has no guidance naming it as standard. |
| 18 | missing_hospital_class | health | **market** | M1 | medium | «Επιλογή Θέσης Νοσηλείας (Lux, A ή Β)» is the defining choice of the programmes; a hospital policy that records no class cannot be read. Same source caveat as #16. |
| 19 | missing_coordination_centre | health | under_review | — | candidate | Searched: insurer customer-information documents (Εθνική «Χρήσιμες πληροφορίες για θέματα ζωής και υγείας», not fetchable), provider pages (New Health System «Ιατρικό Συντονιστικό Κέντρο»); the 24h coordination centre is common and its use is required for non-emergency admissions under many programmes, but no insurer's general terms or ΕΑΕΕ text could be read to cite. |
| 20 | group_missing_coordination_centre | group_health | under_review | — | candidate | As #19; group programmes need their own source. |
| 21 | group_missing_hospital_class | group_health | under_review | — | candidate | M1 is an individual-programme page; not inferred onto group schemes. |
| 22 | group_no_direct_billing | group_health | under_review | — | candidate | As #21. |
| 23 | no_direct_vet_payment | pet | under_review | — | none | Searched: insurers' pet terms — direct vet payment is a feature of some programmes, not a practice. |
| 24 | missing_microchip_number | pet | **legislative** | C2 | high | Statutory duty to microchip and register. |
| 25 | missing_leishmaniasis | pet | under_review | — | none | Searched: no instrument; Leishmania cover is a product feature. |
| 26 | no_repatriation_cover | travel | under_review | — | candidate | Regulation (EC) 810/2009 (Visa Code) art. 15 requires travel medical insurance covering repatriation (≥ €30,000) — **for visa applicants only**. A Greek resident's leisure policy is outside its scope, so it is recorded here and not applied. |
| 27 | no_trip_cancellation_cover | travel | under_review | — | none | Optional cover; no instrument. |
| 28 | missing_emergency_assistance_phone | travel | under_review | — | none | Recording check; no instrument. |
| 29 | no_beneficiaries_recorded | life | under_review | — | candidate | Ν. 2496/1997 άρθρο 28 παρ. 3–4: designation is by written, revocable declaration; **if none is named the policyholder is the beneficiary and the sum falls into the estate.** The law defines the consequence, it does not require a designation — recorded as the legal basis of the check's *why it matters*, not as a requirement. |

| 30 | renters_scope_not_recorded | renters | under_review | — | none | New in Goal 5 (recording). Nothing requires a policy to state building vs contents; it is what makes the document readable. |
| 31 | renters_contents_sum_not_recorded | renters | under_review | — | candidate | New in Goal 5. Ν. 2496/1997 άρθρο 17 governs the CONSEQUENCE of a sum insured (under/over-insurance), not its recording; candidate for the legal track. |
| 32 | renters_no_fire_cover | renters | under_review | — | candidate | New in Goal 5. As home #11–13: no statute requires a tenant to insure contents; a lease may (contract class not nameable in general). |
| 33 | renters_no_earthquake_cover | renters | under_review | — | candidate | As #32. |
| 34 | renters_no_flood_cover | renters | under_review | — | candidate | As #32. |
| 35 | renters_theft_limit_not_recorded | renters | under_review | — | none | New in Goal 5 (recording). |
| 36 | renters_valuables_not_itemised | renters | under_review | — | none | New in Goal 5 (recording). Insurers' terms apply single-article limits, but no named public source was searched for in this pass. |
| 37 | renters_no_technical_assistance_phone | renters | under_review | — | none | New in Goal 5 (recording). |
| 38 | home_scope_not_recorded | home | under_review | — | none | New in Goal 5 (recording). As #30. |
| 39 | home_insured_value_not_recorded | home | under_review | — | candidate | New in Goal 5 (recording). As #31. |
| 40 | home_valuables_not_itemised | home | under_review | — | none | New in Goal 5 (recording). As #36. |

## What the legal and underwriting tracks must do before GA

1. Confirm C1 for both value-drift rules as worded in the product.
2. Confirm C2 supports a pet-policy recording check (the duty is the owner's).
3. Confirm C3's paragraph reference (7Ζ as amended) against the consolidated text, and whether the rule should also state the €500,000 and three-month conditions.
4. Confirm C4 applies to the *recording* of a declaration number, and to motorcycles.
5. Decide whether M1 (a product page) is an acceptable «named public source» for `market`, or point to general terms / ΕΑΕΕ text; if neither, #16 and #18 return to under review.
6. Decide the candidate rows (#5, #10, #11–13, #19–22, #26, #29).

Every change lands in `GAP_PROVENANCE` with reviewer and date; the guard refuses a class without a citation.
