# PW-VOICE-01 — LEXICON

One preferred term per concept. A string that is fine in isolation but uses a banned
variant is a **V1 finding (Major)**. Seeded from the series brief; every collision the
corpus surfaced in Step 0 has a row. Rows marked **decision** are collisions whose
resolution is not the writer's to make — they are in `HALTS.md` and stay unedited.

| # | Concept | Preferred | Banned / colliding | Note (why, and where the exceptions are) |
|---|---|---|---|---|
| 1 | the contract document | **ασφαλιστήριο** (-ο/-α/-ου/-ων; enclitic «ασφαλιστήριό σας») | «συμβόλαιο», «πολιτική», Latin `policy` | The word printed on the document and the /lexiko headword. **Exceptions:** «ομαδικό συμβόλαιο» — the term of art in benefits Greek and a documented keyword target (`docs/marketing/04-SEO-LAYER.md`); the glossary entry that *defines* «ασφαλιστήριο (ή ασφαλιστήριο συμβόλαιο)». «σύμβαση» is a different concept (the legal relationship) and is allowed. Public roots aligned 2026-09-12 (#350); **31 in-app/outbound uses remain** — the guard's documented in-app half. |
| 2 | the licensed partner, as a person | **ασφαλιστής** in marketing prose · **Σύμβουλος / ασφαλιστικός σύμβουλος** as an in-app label | «πράκτορας», Latin `agent`, «συνεργάτης» in this sense | Speech vs UI label — each in its own register, never mixed on one surface. «διαμεσολαβητής» is allowed in the regulatory register (the IDD term) and in legal disclaimers. **«ασφαλιστικός πράκτορας»** — the full phrase — is the regulatory category under Law 4583/2018 and the term agents search for: allowed in SEO titles and `keywords:` aimed at agents (`/solutions/agents`), never as the bare noun in prose. Round 1 (2026-09-13) moved the guides and the in-app labels to «ασφαλιστής»/«σύμβουλος»; the plan names wait on H-V04. |
| 3 | the partner's business | **πρακτορείο** | — | A different concept from #2; «ΠΡΑΚΤΟΡΕΙΟ» as a section kicker is correct. |
| 4 | the insurer, as a company | **ασφαλιστική (εταιρεία)** | «ασφαλιστής» used for the company | **Collision the brief did not list.** In-app copy uses «ασφαλιστής» for the *company* («ανανεώθηκε σε νέο ασφαλιστή», «οι περισσότεροι ασφαλιστές προσφέρουν…») while marketing uses it for the *person*. One word, two parties a customer must tell apart. |
| 5 | a third-party perks provider | **συνεργάτης** | — | The `benefits.*` strings. Allowed; distinct from #2 — but see #6. |
| 6 | a person given shared access to a policy | **decision** — proposed «άτομο με πρόσβαση» | «συνεργάτης» (`wallet.collaboration.*`) | Third meaning of one word. A family member with access is not a partner. Direction proposed, not applied. |
| 7 | the finding | **εύρημα** · **κενό κάλυψης** | severity/priority words as a verdict («κρίσιμο», «υψηλή προτεραιότητα») outside `describeSeverity()` | Per `CLAUDE.md`: severity is not a verdict until an underwriter says so. Labels that carry priority as fact are **Blocked** on §9.5 (`HALTS.md` H-V02). |
| 8 | total annual premium | **συνολικό ετήσιο ασφάλιστρο** | «Ασφαλιστικό αποτύπωμα» | Coinages get retired, not explained. Two live uses retired in Round 1: `status.totalPremium` → «Σύνολο ασφαλίστρων», `role-copy yearlyFootprint` → «Ετήσιο σύνολο ασφαλίστρων». («δακτυλικό αποτύπωμα» = fingerprint, a different word — allowed.) |
| 9 | the premium | **ασφάλιστρο** | Latin `premium` for the money; «πριμ» | `premium` as a *plan tier* adjective is a product name (see #12). |
| 10 | the cover | **κάλυψη** | — | Consistent already. |
| 11 | the product itself | **decision** — proposed «πορτοφόλι» for the product noun | Latin `wallet` inside Greek («στο wallet σας»); «φάκελος» vs «πορτοφόλι» both live | The nav says «Ο φάκελός μου»; guides say «ψηφιακό πορτοφόλι ασφαλίσεων»; 15 strings say `wallet`. One noun is a product decision (`HALTS.md` H-V05). |
| 12 | plan and product names | **as branded:** PolicyWallet, Plus, Pro, Family, Starter, Agent Starter, Agent Pro | Greek renderings «Πράκτορας Starter / Πράκτορας Pro / Δωρεάν Πράκτορας» | Names are catalogue rows and Stripe products (CLAUDE.md «catalog coupling»), not copy — **decision** (H-V04). |
| 13 | AI / the analysis | **ανάλυση**; «τεχνητή νοημοσύνη» in prose; `AI` as a token | «AI εμπειρία», `summary` for the Greek σύνοψη | «εμπειρία» as an abstract noun is a V5 calque. |
| 14 | plan gating | **περιλαμβάνεται στο Plus** / **διαθέσιμο με το Plus** | «ξεκλειδώνω / ξεκλειδώστε» | V5 calque of *unlock*; 7 live uses. |
| 15 | the wording of the analysis' honesty | «δεν διαβάστηκε» / «δεν καταγράφηκε» | «δεν καλύπτεται» for a silent field; any all-clear without its denominator | Per `CLAUDE.md`: unknown is not absence; absence of a finding is not reassurance. |

## Latin allowlist (V7)

Brand and product names above; acronyms `AI PDF IDD GDPR EU CRM CSV FAQ OTP QR SMS IBAN VAT VIN HR ID DPO`; platform words with no Greek in common use `email portal cookies push online`; the currency code in code paths. Everything else Latin inside an `el` string is a V7 finding — **measured on plain string literals only** (see `CORPUS.md` → metric definitions), because inline initializers that are objects or HTML templates carry code tokens the metric must not count.

## Round-1 additions (2026-09-13)

| # | Concept | Preferred | Banned / colliding | Note |
|---|---|---|---|---|
| 16 | the sales pipeline (agent CRM) | **ροή** (ροή εσόδων, ροή προμηθειών) · **ευκαιρίες** | Latin `pipeline`; «Σωλήνας» (a literal pipe — shipped in `TeamClient.tsx`) | «Ευκαιρίες πώλησης» for *cross-sell*. |
| 17 | a follow-up (agent CRM) | **επανεπαφή** | Latin `follow-up` | The word Greek CRM tooling uses. |
| 18 | the AI summary | **σύνοψη** | Latin `summary` | Already the wallet's own word. |
| 19 | enabling a paid feature | **περιλαμβάνεται στο …** / **αποκτήστε …** / **δείτε …** | «ξεκλειδώνω» in every form, «Ξεκλείδωμα» | The calque was the whole vocabulary of `lib/monetization/upgrade-copy.el.ts`. |
| 20 | «έξυπνος» as a feature adjective | drop it | «Έξυπνες υπενθυμίσεις», «Έξυπνη μεταφόρτωση», «έξυπνες ενέργειες» | V3: promises nothing a reader can check. |
| 21 | uploading a document | noun **μεταφόρτωση**, verb **ανεβάστε/ανεβάζετε** | «upload», «ανέβασμα» | The app already pairs the two («Η νέα μεταφόρτωση ενσωματώθηκε…», «Ανεβάστε το πρώτο σας ασφαλιστήριο»); one noun, one verb (Round-1 addition, from the adversarial re-read). |
