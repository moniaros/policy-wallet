# HOOKS — canonical register (GROWTH-HOOKS-01)

**Single source of truth. Every render site references a row id; copy is never written inline at a
render site.** Ten hooks were briefed; four survive Track B verification. The six cut rows are kept
below with their reasons — a cut hook is recorded, never silently dropped.

Character budget: **≤72 Greek characters**, measured on the rendered string, not estimated.

## Live hooks

| id | audience | EL line | chars | EN line | chars | guide | sources | G-02 decision |
|---|---|---|---|---|---|---|---|---|
| **H1** | b2c | Σε ποια αξία ασφαλίστηκε το σπίτι σας: αντικειμενική ή ανακατασκευής; | 69 | Is your home insured for its tax value or its rebuild cost? | 59 | `/guides/analogikos-kanonas-ypasfalisi-katoikias` | SRC-001, SRC-002, SRC-003, SRC-004 | CREATE |
| **H3** | b2c | Ξέρει η ασφάλισή σας ότι το ακίνητο μισθώνεται βραχυχρόνια; | 59 | Does your insurer know the property is let short-term? | 54 | `/guides/vraxychronia-misthosi-asfalisi-katoikias` | SRC-005, SRC-006, SRC-007, SRC-008 | CREATE |
| **H4** | b2c | Ήταν το όχημά σας ασφαλισμένο την ημέρα της διασταύρωσης; | 57 | Was your vehicle insured on the day of the cross-check? | 55 | `/guides/prostimo-anasfalistou-oximatos` | SRC-009, SRC-010, SRC-011, SRC-012 | EXTEND |
| **H6** | b2c | Πόσο από τη ζημιά καλύπτει ο ΕΛΓΑ και πόσο μένει σε εσάς; | 57 | How much of the loss does ELGA actually cover? | 46 | `/guides/elga-apozimiosi-kai-pragmatiko-kostos` | SRC-014, SRC-015, SRC-016 | CREATE |

### Why each line is phrased as it is

All four are **questions about the reader's own situation**, never statements about their policy —
§2.2's line. «Σε ποια αξία ασφαλίστηκε…» asks; «Το σπίτι σας είναι υπασφαλισμένο» would assert
something we cannot know and do not know.

**H4 deliberately does not name the authority.** It says «την ημέρα της διασταύρωσης», not «της
ΑΑΔΕ». The verified source (ν. 5113/2024, ΦΕΚ Α΄ 96) assigns the cross-check to Γ.Γ.Π.Σ.Ψ.Δ. and the
fine to Σ.Δ.Ο.Ε., while our own published guide still says ΑΑΔΕ — see **HALT-G02**. The hook is true
under either attribution, and naming no body is not evasion here: *which* body runs it is not the
thing the reader can check. What they can check is whether their cover was in force that day.

**The character budget bit before the guard existed.** H4's natural phrasing —
«Μπορείτε να αποδείξετε ότι το όχημα ήταν ασφαλισμένο την ημέρα του ελέγχου;» — measures **75**, over
budget, and was rewritten rather than allowed to clip at 320px.

## B2B set: EMPTY

H9 and H10 were the only B2B hooks and both are cut. **There is therefore no B2B ticker on
`/solutions/agents` or `/pricing?audience=agent` in this goal** — an empty rotator is worse than
none. §3.1's audience split stands for whenever a verified B2B hook exists.

## Render sites

| surface | mode | set | why |
|---|---|---|---|
| Homepage | **static** | B2C | `HeroSlides` already rotates here; a second rotator is forbidden (D-G05). See `TICKER_DECISION.md`. |
| `/guides` index | **rotating** | B2C | No rotator present. |
| `/solutions/agents`, `/pricing?audience=agent` | — | — | B2B set is empty. |

## Cut hooks — recorded, not dropped

| id | reason | could it return? |
|---|---|---|
| **H2** bank-mandated fire policy | Statutory basis unverifiable — rests on ν.2496/1997 / ν.4438/2016, which no public body re-hosts and et.gr will not serve to a fetcher | Yes, with a working ΦΕΚ retrieval path |
| **H5** dog-owner liability | **Premise false.** No mandatory dog-owner liability insurance exists in Greek law (HALT-G03) | Only as a **different hook**: SRC-013 verifies that the owner is *liable* under ΑΚ 924, which is a legitimate and honest hook. Needs a home-wording source for the "your αστική ευθύνη section may already respond" half. |
| **H7** group vs individual health | Statutory basis unverifiable | Yes, same condition as H2. Nothing lost from the live corpus — it was an EXTEND. |
| **H8** PI limits vs licensing minima | Statutory basis unverifiable, and needs one source per profession | Yes, but it is the most expensive of the three |
| **H9** second-opinion share | Not a checkable statutory fact about the reader's own policy (G-02) | As a product surface item, not a hook |
| **H10** intermediary compliance | Same, B2B audience (G-02) | As a `/solutions/agents` ticker item once a verified B2B hook exists |

## Track C journeys — spec only

Per the goal's own gate: Phase 1 is green but the design system is not started. Journeys inherit
`lib/wallet/policy-identity.ts` for policy identity and must not construct it locally. The outbound
dispatch stub must be **confirmed inert** before any journey test runs — Step 0 could not establish
it.

| hook | journey | status |
|---|---|---|
| H1 | Rebuild-value review — display extracted sum insured beside a user-entered estimate. **No verdict, no colour-coding, not called a gap.** | spec only |
| H3 | — | engine change is Track D (`H3-coverage-voiding-condition.md`); no journey in this goal |
| H4 | In-force date range in a copyable summary for an objection. **Highest conviction, lowest complexity — build first.** | spec only |
| H6 | Peril-by-peril display against existing extraction | spec only |
