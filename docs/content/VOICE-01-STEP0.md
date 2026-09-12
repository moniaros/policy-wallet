# PW-VOICE-01 — Step 0: inventory and calibration

**Status: report for approval. No string has been changed.** Deliverables: `CORPUS.md` + `corpus.json`, `LEXICON.md`, `CLAIMS.md`, `HALTS.md`, `voice-01-findings.json` (the screen, with its regexes), this report. Approval opens Round 1.

## 1. What the corpus is

**9,926 customer-facing Greek strings** (from the frozen inventory the copy-freeze guard keeps complete): in-product 6,759 · public 2,282 · auth/onboarding 554 · outbound 329 · legal 2 (excluded, §8). **298 composed at runtime**, 254 of them in-product (renewals actions, wallet actions, timeline diff, risk-dna, notification bodies) and 33 outbound — every one is audited as assembled output in the Round-1 fixture matrix. **378 bundle keys resolve to no render site** — dead or dynamic; settled before any is touched. Slot types are exact for bundle keys and a length proxy elsewhere (`CORPUS.md` says so).

## 2. What was read (§1.2)

- `CLAUDE.md` invariants — score verdict, severity-as-fact, absence-as-reassurance, unreadable values, internal tokens. Applied as the `INV.*` class.
- `docs/launch/GO_NO_GO_SIGNOFF_PACKET_GR-GA-2026.03.md` — read; legal/DPO sign-off pending, which is why §4.3 (no legal/consent edits) is absolute.
- **`docs/audits/policy-wallet-public-surface-audit.md` does not exist at that path.** The false-claims material is in `marketing-website-audit-2026-08.md` («no fabrications anywhere — re-verified on rendered pages») and `marketing-launch-report-2026-08.md` (the «98% match» line already reworded).
- The transformation run's «§2 invariants / §7.4» — no file carries a §7.4; the score invariants are referenced as §2.1–§2.8 from `docs/transformation/HALTS.md` and `QUEUE.md` and are restated in `CLAUDE.md`. Applied through `INV.*`.

## 3. Calibration — what the numbers actually say

The rubric was run as a regex screen and **every Blocking and V1 hit was read**. The honest result: the screen over-matches heavily, and the copy is in better shape than the brief assumes.

| rubric test | screen hits | verified findings | what the rest was |
|---|---|---|---|
| **V8 claim honesty** | 0 for the brief's named defects | **2 unsourced numbers** (C10 «5-15% έκπτωση» market stat; C11 «λιγότερο από 1 λεπτό») + C9 «14 ημέρες δοκιμή» → HALT | `500+`, `10.000+`, `98%`, testimonials: **already removed** (Aug 2026 audit, guards green) |
| **V9 advice boundary** | 4 | **1** (`protection.life.lead` «τι σας προτείνουμε») + 1 guide imperative to attribute to the law | «Δεν έχουμε προϊόν να σας προτείνουμε» is a negation; «Ασφαλίστε τον χώρο» means *secure the premises* |
| **INV reassurance** | 10 (+2 from the numeric scan) | **4** (`portfolioInsights.allGood`, `wallet.notices.allClear`, `status.allClear30Days`, `dashboard.noPriorities` «Εξαιρετική δουλειά!») — all-clears without their denominator | «Εντάξει» as a button/acknowledgement; the glossary's «δεν υπολογίζει πλέον σκορ» |
| **INV score** | 38 | **0 rewrites; ~15 → H-V03** (live-or-dead question) | 20+ are the glossary/methodology explaining the *retired* score, pinned by tests; the feedback route's `${score}/10` is the user's own rating |
| **INV severity as fact** | 23 | **0 rewrites; 9 → H-V02** (policy, not wording) | «Προτεραιότητα στην ουρά» is a plan feature; task priority is a CRM field |
| **INV internal token** | 1 | **0** | the string that *explains* «XXXX» to the reader — correct by `CLAUDE.md` |
| **V1 συμβόλαιο** | 31 | **31** — all in-app/outbound (renewals, notifications registry, deterministic-savings, clarity checklist, mock-ai, recommendation-generator) | none — this is the guard's documented in-app half |
| **V1 πράκτορας / agent** | 20 | **8 public** (guides: «εφαρμογή πράκτορα») · in-app plan names → **H-V04** | «πρακτορείο» is a different concept; `${agent}` is a variable |
| **V1 συνεργάτης** | 21 | **3** («πλάνο συνεργάτη» ×2, «Πιστοποιημένος συνεργάτης») · collaborator sense → LEXICON #6 decision | perks partners and freelancers are legitimate senses |
| **V1 ασφαλιστής = company** | not in brief | **≥3** (renewals «νέο ασφαλιστή», savings «οι ασφαλιστές προσφέρουν») | new LEXICON row #4 |
| **V1 αποτύπωμα** | 4 | **1** (`status.totalPremium`) | «δακτυλικό αποτύπωμα» = fingerprint |
| **V1 πολιτική / policy** | 29 | **0** | every hit is a `{policy}` template placeholder |
| **V4 register** | 101 | **~45** outside onboarding (`branches.*` «σου/Δες/Ρώτησε», an agent modal «Ανέβασε», `CarriedPlanCard`, help, 3 outbound) · **56 onboarding → H-V01** | — |
| **V7 locale purity** | 668 → 388 with `${}` stripped | **~60–90 estimated** («στο wallet σας» ×15, «pipeline», «summary», «browser»); exact count needs metric 6's plain-literal scope, run in Round 1 | code tokens inside object/HTML initializers; no `1,000`-style separators found |
| **V3 / V5** | 18 / 22 | **~4 / ~10** («Έξυπνη μεταφόρτωση», «προηγμένες αναλύσεις», «Ξεκλειδώστε» ×7, «AI εμπειρία», «με ένα κλικ») | rankings («Κορυφαίοι κλάδοι»), fingerprints, bilingual statements |
| **V2 / V6** | not screenable | sampled: the public prose is finite-verb Greek already (#350 pass); in-product long strings not yet read | Round 1 reads them |

**Round-0 findings, by class:** Blocking **7** (V9 ×2, V8 ×2, INV ×4 — pulled in Round 1 regardless) · Major **~90** (V1 ~46, V4 ~45, V7 pending exact count) · Minor **~14** · **Blocked 7 halts** (H-V01–H-V07). Direction is recorded per row in `CLAIMS.md`, `LEXICON.md` and `HALTS.md`; proposed text is Round-1 work by rule.

## 4. Two halts the brief lists that the corpus does not reproduce

- **§9.1 free-tier 2 vs 3** — the `/product` FAQ says «έως 3»; the «2» hits are the comparison tool and glossary prose; the figure is pinned to `DEFAULT_ENTITLEMENT_LIMITS` by guard. Recorded as H-V08 (no decision).
- **§9.2 contact identity** — Greek copy carries `dpo@` and `info@policywallet.gr` only; no placeholder phone (the signin `+30 69X XXX XXXX` is an input-format hint). Outside the corpus, one `support@policywallet.com` string sits beside `mailto:support@policywallet.gr` — a one-line domain residue, listed in H-V09 for the owner's confirmation of `.gr`.

## 5. A guard hole found on the way

`tests/unit/score-containment.test.ts` bans `/Βαθμολογία προστασίας|σκορ προστασίας|[Pp]rotection [Ss]core/` — case-sensitive on the Greek — and so does not see **«Σκορ Προστασίας»** (`components/landing/AgentWidgets.tsx`, public). Filed in H-V03; a guard fix, not a copy fix, and not part of this series' string edits.

## 6. Baseline (§6) — definitions in `CORPUS.md`

| surface | strings | composed | mean chars | max chars | English-in-el (metric 6, plain literals) | claims w/o row | advice verbs (platform voice) | register drift (excl. onboarding) | truncation @320/390/430 |
|---|---|---|---|---|---|---|---|---|---|
| public | 2,282 | 6 | 82.8 | 725 | pending Round-1 scope | 1 (C8) | 1 | 6 | not yet measured |
| in-product | 6,759 | 254 | 55.6 | 8,750* | pending | 2 (C10, C11) | 1 | 36 | not yet measured |
| auth-onboarding | 554 | 4 | 32.2 | 198 | pending | 0 | 0 | 0 (56 under H-V01) | not yet measured |
| outbound | 329 | 33 | 59.0 | 834 | pending | 0 | 0 | 3 | not yet measured |

\* the 8,750-char entry is an inline object literal the inventory stores whole (`lib/i18n/role-copy.ts`); it is one `corpus.json` row and will be split by key in Round 1 so its character budget is meaningful.

## 7. What Round 1 does first, if approved

1. Pull the **7 Blocking** rewrites (with `CLAIMS.md` and `HALTS.md` updated as each lands).
2. The **31 in-app «συμβόλαιο»** — and extend `policy-term-asfalistirio` to the in-app roots it still documents as open.
3. The **45 register slips** outside onboarding; onboarding waits on H-V01.
4. Metric 6 at its proper scope, then the V7 rewrites.
5. Guards §7, each proven red first: `lexicon-guard`, `advice-verb-guard`, `register-guard`, `length-budget-guard`, `new-string-guard`; `claims-guard` and `locale-purity-guard` extend the existing `no-fabricated-public-count` and the V7 metric rather than duplicating them.
6. The fixture matrix, and the first `PROGRESS.md` round entry.

**The line for `CLAUDE.md`, carried from the brief:** the product reads and explains; the licensed partner advises. Copy that blurs the two is a regulatory defect, not a tone problem.
