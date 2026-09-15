# PW-VOICE-01 — LEXICON

One preferred term per concept. A string that is fine in isolation but uses a banned
variant is a **V1 finding (Major)**. Seeded from the series brief; every collision the
corpus surfaced in Step 0 has a row. Rows marked **decision** are collisions whose
resolution is not the writer's to make — they are in `HALTS.md` and stay unedited.

| # | Concept | Preferred | Banned / colliding | Note (why, and where the exceptions are) |
|---|---|---|---|---|
| 1 | the contract document | **ασφαλιστήριο** (-ο/-α/-ου/-ων; enclitic «ασφαλιστήριό σας») | «συμβόλαιο», «πολιτική», Latin `policy` | The word printed on the document and the /lexiko headword. **Exceptions:** «ομαδικό συμβόλαιο» — the term of art in benefits Greek and a documented keyword target (`docs/marketing/04-SEO-LAYER.md`); the glossary entry that *defines* «ασφαλιστήριο (ή ασφαλιστήριο συμβόλαιο)». «σύμβαση» is a different concept (the legal relationship) and is allowed. Public roots aligned 2026-09-12 (#350); **31 in-app/outbound uses remain** — the guard's documented in-app half. |
| 2 | the licensed partner, as a person | **ασφαλιστής** in marketing prose · **Σύμβουλος / ασφαλιστικός σύμβουλος** as an in-app label | «πράκτορας», Latin `agent`, «συνεργάτης» in this sense | Speech vs UI label — each in its own register, never mixed on one surface. «διαμεσολαβητής» is allowed in the regulatory register (the IDD term) and in legal disclaimers. **«ασφαλιστικός πράκτορας»** — the full phrase — is the regulatory category under Law 4583/2018 and the term agents search for: allowed in SEO titles and `keywords:` aimed at agents (`/solutions/agents`), never as the bare noun in prose. Round 1 (2026-09-13) moved the guides and the in-app labels to «ασφαλιστής»/«σύμβουλος»; the plan names wait on H-V04. | «συνεργάτης» in its own senses — perk partner, policy collaborator, freelancer, contractor, institutional partner — is not this concept and stays (D-V06).
| 3 | the partner's business | **πρακτορείο** | — | A different concept from #2; «ΠΡΑΚΤΟΡΕΙΟ» as a section kicker is correct. |
| 4 | the insurer, as a company | **ασφαλιστική (εταιρεία)** | «ασφαλιστής» used for the company | **Collision the brief did not list.** In-app copy uses «ασφαλιστής» for the *company* («ανανεώθηκε σε νέο ασφαλιστή», «οι περισσότεροι ασφαλιστές προσφέρουν…») while marketing uses it for the *person*. One word, two parties a customer must tell apart. |
| 5 | a third-party perks provider | **συνεργάτης** | — | The `benefits.*` strings. Allowed; distinct from #2 — but see #6. |
| 6 | a person given shared access to a policy | **συνεργάτης** — resolved, stays | — | Third meaning of one word; the proposed «άτομο με πρόσβαση» was **not** adopted. D-V06 (2026-09-13) settled that «συνεργάτης» is banned only where it means the insurance partner, and a policy collaborator is a different concept. Row closed 2026-09-15. |
| 7 | the finding | **εύρημα** · **κενό κάλυψης** | severity/priority words as a verdict («κρίσιμο», «υψηλή προτεραιότητα») outside `describeSeverity()` | Per `CLAUDE.md`: severity is not a verdict until an underwriter says so. Labels that carry priority as fact are **Blocked** on §9.5 (`HALTS.md` H-V02). |
| 8 | total annual premium | **συνολικό ετήσιο ασφάλιστρο** | «Ασφαλιστικό αποτύπωμα» | Coinages get retired, not explained. Two live uses retired in Round 1: `status.totalPremium` → «Σύνολο ασφαλίστρων», `role-copy yearlyFootprint` → «Ετήσιο σύνολο ασφαλίστρων». («δακτυλικό αποτύπωμα» = fingerprint, a different word — allowed.) |
| 9 | the premium | **ασφάλιστρο** | Latin `premium` for the money; «πριμ» | `premium` as a *plan tier* adjective is a product name (see #12). |
| 10 | the cover | **κάλυψη** | — | Consistent already. |
| 11 | the product itself | **πορτοφόλι** | Latin `wallet` inside Greek; «φάκελος» for the product | **Settled 2026-09-15 (D-V11).** Decisive: the positioning names «ο φάκελος στο συρτάρι» as the alternative PolicyWallet replaces, so the product cannot be called after it; the guides already define the category as «ψηφιακό πορτοφόλι ασφαλίσεων». «Ο φάκελός μου» was never a nav label — it was a landing screenshot tab, now «Το πορτοφόλι μου». Apple Wallet / Google Wallet are trademarks and stay. The two cookie-banner strings that still say `wallet` are consent copy and are **blocked by §4.3**, not missed. |
| 11b | «φάκελος», its real senses | **kept, all of them** | using it for the product | Four senses that are not the product and must not be swept: the **claim file** («φάκελος ζημιάς», 18 `lib/insurance/content/*` files + guides), **one policy's document folder** («στον φάκελο του ασφαλιστηρίου»), **the customer's folder** on the agent side, **our DB record** («Η κατάσταση περιγράφει τον φάκελο, όχι την ασφάλισή σας»), and the **email spam folder**. A guard on this term must distinguish them, which is why none is written. |
| 12 | plan and product names | **as branded:** PolicyWallet, Plus, Pro, Family, Starter, Agent Starter, Agent Pro, Agency | Greek renderings «Πράκτορας Starter / Πράκτορας Pro / Δωρεάν Πράκτορας» | **Settled 2026-09-15 (D-V12).** The Greek renderings were unread constants and are deleted. What a customer sees is the plan row's `display_name` (also on the Stripe receipt) and the public card's code template — both Latin. A *description* of the audience is copy, not a name: «Πλάνα συμβούλων», never «Πλάνα Πρακτόρων». |
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

**Glosses (D-V09).** A Greek term may carry its English name once, in parentheses or «quotes», where the reader will meet the English on the document itself — «βεβαίωση ασφάλισης» (certificate of insurance), «αναλογικός κανόνας» (pro-rata), «All Risks». The gloss follows the Greek, never replaces it, and `locale-purity-guard` does not count it. Loanwords with a Greek spelling are written in Greek: «σέρβις», «μικροτσίπ», «στιγμιότυπα οθόνης»; established technical loanwords with none stay Latin and are allowlisted (cloud, phishing, cyberbullying, email, PDF, AI).

**Accent-blind matching (2026-09-15).** Greek moves the stress when a word inflects — πράκτορ**ας** → πρακτόρ**ων** — so a guard pattern written with one accentuation is blind to the others. `voice-guards`'s partner-term net matches `πρ[άα]κτ[οό]ρ` with an accent-blind lookahead `(?!ε[ίι])`, which keeps «Πρακτορείο» and the uppercase kicker «ΠΡΑΚΤΟΡΕΙΟ» exempt. The same care is owed to any future stem net.

**The clitic «σε» (2026-09-15).** After D-V10 the singular object clitic is a register
finding — «Θα σε ρωτήσουμε» should be «Θα σας ρωτήσουμε» — but it is only partly
guardable, because «σε» is also the preposition. `register-guard` matches it before an
unambiguous 1st/2nd-person-plural verb ending (-ουμε/-ετε/-ουν); no Greek noun ends that
way, so the net has zero false positives across the corpus. A wider net keyed on the
past-tense augment («σε έ…») was **tried and rejected**: it flagged 62 false positives,
because «ένα/έναν» is the indefinite article. So the 3rd-person past form — «Τι σε έφερε
εδώ;» — is not guardable this way. That one was found by walking the onboarding flow in a
browser at 320px, which is the argument for keeping a render pass in the verification even
when every guard is green.
