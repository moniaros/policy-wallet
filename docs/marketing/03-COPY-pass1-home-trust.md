# Deliverable 3, pass 1 — copy for `/` and `/trust`

**The corrections that are wrong or incomplete today.** Greek is the source; English carries the
identical meaning. Diffs where current copy survives; full text where it does not.

`[verify]` marks any claim resting on an unconfirmed INPUT. Nothing below depends on the health or
ENFIA statistics — those land in pass 2.

---

# Part 1 — Homepage `/` and `/en`

## 1.1 The eyebrow — **decision needed, not drafted**

`lib/marketing/positioning.ts:68` · renders in the hero chip, the footer identity line, the JSON-LD
`slogan` and the OG card.

```
  el: "Δεν αξιολογούμε συμβόλαια. Αξιολογούμε την προστασία σας."   ← keep
  en: "AI Personal Risk Intelligence"                               ← not a translation
```

The Greek is a promise; the English is a category label. **Open Question 5 is unanswered**, so I am
not choosing. Both options, ready to drop in:

| Option | English becomes | Effect |
|---|---|---|
| **A — English mirrors the Greek** *(recommended)* | `"We do not rate policies. We rate your protection."` | Parity restored. The category label still does its SEO work via `CATEGORY_NAME`, which is separate and unchanged. |
| **B — Greek gains the label** | Greek adds a second line carrying "Personal Risk Intelligence" | Keeps the English as-is, but puts a jargon label in front of a Greek consumer, which the module's own rules argue against. |

**A is the smaller, truer change.** Nothing else in this document depends on the answer.

## 1.2 The H1 — new, fixed, replaces the rotating headline

Wire the existing unused `PROMISE` constant (`positioning.ts:178`), rewritten:

```diff
  export const PROMISE = {
-     lead:   { el: "Η ζωή σας άλλαξε.",        en: "Your life changed." },
-     accent: { el: "Η ασφάλειά σας το ξέρει;", en: "Does your insurance know?" },
+     lead:   { el: "Μάθετε τι πραγματικά",   en: "Know what your policies" },
+     accent: { el: "καλύπτουν τα συμβόλαιά σας.", en: "actually cover." },
  }
```

> **EL** Μάθετε τι πραγματικά **καλύπτουν τα συμβόλαιά σας.**
> **EN** Know what your policies **actually cover.**

The split follows the existing lead/accent pattern so the accent span styling carries over unchanged.

## 1.3 The sub-head — today's slide 1, demoted

> **EL** Όλα τα ασφαλιστήρια, από όλες τις εταιρείες, σε ένα σημείο — διαβασμένα και εξηγημένα στα ελληνικά.
> **EN** Every policy, from every company, in one place — read and explained in plain language.

*(«στα ελληνικά» is right for the Greek reader and wrong for the English one, hence "in plain
language" rather than a literal mirror. Same meaning: you get it in words you use.)*

## 1.4 Hero rotation — health replaces "hidden benefits"

`HeroSlides.tsx`. Slide 3 (`hidden-benefits`) is the weakest of the three and its «οδική βοήθεια»
opener leans motor, which the position says never to lead with. **Replace it; keep slides 1 and 2.**

Slides now rotate as the **sub-head**, not the headline — the `<h1>` is fixed (§1.2).

**New slide — `health-clarity`, first in the rotation:**

```
dot:  { el: "Η ασφάλεια υγείας σας", en: "Your health cover" }

headline
  EL  Η ασφάλεια υγείας σας, «χωρίς τα ψιλά γράμματα.»
  EN  Your health cover, «without the small print.»

lead
  EL  Τι καλύπτει, τι εξαιρεί, πόσο περιμένετε πριν ισχύσει — και τι σημαίνει
      η επιστολή αύξησης που λάβατε. Διαβάζουμε το δικό σας συμβόλαιο και σας
      το εξηγούμε στα ελληνικά.
  EN  What it covers, what it excludes, how long you wait before it applies —
      and what the increase letter you received actually means. We read your
      own policy and explain it in plain words.
```

No figure, no index name, no claim about whether to renew. The mechanism carries it.

**Slide 2 (`duplicates`) — AMENDED under D1-as-amended (2026-08-30).** *This surface was not in the
owner's amendment list (1, 2, 4, 5); it states a duplicate-detection plan fact, so it is amended
under the same rule, and named here as required.* Duplicates are on every plan; only the gap half
is Family. The slide must not gate the whole sentence:

```diff
- EL  Εντοπίστε διπλές καλύψεις που πληρώνετε δύο φορές και ασφαλιστικά κενά που
-     δεν ξέρατε ότι έχετε ή δεν είχατε όταν κάνατε το ασφαλιστήριό σας — με το Family.
+ EL  Εντοπίστε διπλές καλύψεις που πληρώνετε δύο φορές — σε κάθε πλάνο. Και, με το
+     Family, τα ασφαλιστικά κενά που δεν ξέρατε ότι έχετε.
- EN  Spot cover you are paying for twice, and gaps you did not know you had — with Family.
+ EN  Spot cover you are paying for twice — on every plan. And, with Family, the
+     coverage gaps you did not know you had.

*(«σε όλο το νοικοκυριό» / "across your household" was in the amended draft and is REMOVED:
code verification showed duplicate detection is same-subject only and never compares across
persons — see deliverable 1. SHIPPED to HeroSlides.tsx 2026-08-30 in this wording.)*
```

## 1.5 The neutrality sentence — replace

`WorldClassLanding.tsx:243-244`.

```diff
- EL  16 είδη ασφάλισης. Δεν συνεργαζόμαστε με καμία ασφαλιστική — γι' αυτό
-     μπορούμε να σας πούμε την αλήθεια.
- EN  16 types of insurance. We do not work with any insurance company — that is
-     why we can tell you the truth.
+ EL  16 είδη ασφάλισης. Καμία ασφαλιστική και καμία τράπεζα δεν μας πληρώνει για
+     να σας προτείνουμε κάτι. Δεν παίρνουμε προμήθεια, και η ανάλυση είναι ίδια
+     για κάθε συμβόλαιο — όποιος κι αν το εξέδωσε.
+ EN  16 types of insurance. No insurer and no bank pays us to recommend anything.
+     We take no commission, and the analysis is the same for every policy —
+     whoever issued it.
```

The consent clause from deliverable 1 §5 is dropped **here** and carried by trust bullet 3 instead
(§1.6), so the trust row stays one readable sentence rather than four clauses.

## 1.6 Trust bullets — bullet 1 untouched, 2 and 3 rewritten

`positioning.ts` `DIFFERENTIATORS`.

```diff
  // bullet 1 — Δεν πουλάμε ασφάλειες — UNCHANGED, true in both scenarios

  // bullet 2 — Δεν παίρνουμε προμήθεια
- EL  Πληρωνόμαστε μόνο από εσάς, με συνδρομή. Δεν κερδίζουμε τίποτα αν αλλάξετε εταιρεία.
- EN  We are paid only by you, with a subscription. We earn nothing if you switch insurer.
+ EL  Δεν παίρνουμε προμήθεια από καμία ασφαλιστική. Δεν κερδίζουμε τίποτα αν
+     αλλάξετε εταιρεία — ούτε αν δεν αλλάξετε.
+ EN  We take no commission from any insurer. We gain nothing if you switch —
+     and nothing if you stay.

  // bullet 3 — Δεν πουλάμε τα δεδομένα σας
- EL  Τα συμβόλαιά σας είναι δικά σας. Κανείς δεν τα βλέπει αν δεν το ζητήσετε εσείς.
- EN  Your policies are yours. Nobody else sees them unless you ask us to share.
+ EL  Τα συμβόλαιά σας είναι δικά σας. Κανείς άλλος δεν τα βλέπει — ούτε
+     ασφαλιστική, ούτε τράπεζα — παρά μόνο αν το επιλέξετε εσείς, ξεχωριστά για
+     κάθε έγγραφο και όποτε θέλετε πίσω.
+ EN  Your policies are yours. Nobody else sees them — no insurer, no bank —
+     unless you choose it, separately for each document and revocably.
```

**Bullet 2 is the only one that was false-under-partnership.** «Πληρωνόμαστε μόνο από εσάς» breaks
the moment an institution pays; the commission claim, which is the one that matters, survives
untouched. The ~20 other files carrying «δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια» need
**no edit** — they never claimed who pays.

## 1.7 Data location — the false claim

`positioning.ts` `TRUST_FACTS[1]`, rendered by `TrustRow.tsx` on the homepage.

```diff
- label   EL "Διακομιστές στην ΕΕ"        EN "Servers in the EU"
- detail  EL "Τα δεδομένα σας μένουν στην Ευρώπη."
-         EN "Your data stays in Europe."
+ label   EL "Αποθήκευση στην ΕΕ"         EN "Stored in the EU"
+ detail  EL "Τα αρχεία σας φυλάσσονται κρυπτογραφημένα σε υποδομή στην ΕΕ (Παρίσι)."
+         EN "Your files are stored encrypted on infrastructure in the EU (Paris)."
```

**Why the wording narrowed rather than lengthened.** «Τα δεδομένα σας μένουν στην Ευρώπη» is false —
AI analysis may run outside the EU under DPF/SCCs. A chip is the wrong place for that nuance, so the
chip now claims **only storage**, which is true and complete for what it says. The transfer
disclosure goes on `/trust` (§2.1), which is where a reader who cares will look.

## 1.8 Gating language — apply Part A of deliverable 2

Every consumer-facing plan claim becomes **Family** for gap and duplicate detection.

| File | Change |
|---|---|
| `positioning.ts:452,459` | `COMPARISON_ROWS` verdict must stop rendering "Plus" for these two rows — either a new `family` verdict or relabel `plus`. **Renaming the key is safer than relabelling it**, so the next reader is not misled by the identifier. |
| `ServicesGrid.tsx:25-26` | already says Family — **fix the comment at :23** that says "Plus-only" |
| `AudienceTabs.tsx:156-157` | already says Family — no copy change |
| `HeroSlides.tsx` | §1.4 above — **fix the comment at :117** |
| `public-pricing-content.ts:109,133` | Free card: gap bullet becomes the truthful «Εντοπισμός διπλών καλύψεων» (D1-amended); Plus card keeps duplicates, loses the gap half |

## 1.9 Partner teaser — new, above the footer

One line. No logos, no named institutions, no implied partnership.

> **EL** Είστε τράπεζα ή ασφαλιστική; Η ίδια ανάλυση μπορεί να λειτουργήσει μέσα στα δικά σας κανάλια — πάντα με τη συγκατάθεση του πελάτη. → **Δείτε πώς**
> **EN** Are you a bank or an insurer? The same analysis can run inside your own channels — always with your customer's consent. → **See how**

Links to `/solutions/partners` (`/solutions/synergates` on the Greek tree).
**Ships only after** the /trust pledge is qualified (D2) — until then the site would offer banks an
integration on one page and promise never to transfer data to them on another.

**Primary CTA for the page: unchanged.**

---

# Part 2 — `/trust` and `/en/trust`

## 2.1 `documents` — **add** a third bullet

The section is not wrong; it is **incomplete**. It states EU storage accurately and never mentions
that analysis may leave. Keep both existing bullets verbatim and add:

> **EL** Η ανάλυση με τεχνητή νοημοσύνη μπορεί να εκτελεστεί από παρόχους εκτός Ευρωπαϊκού Οικονομικού Χώρου· οι διαβιβάσεις αυτές καλύπτονται από απόφαση επάρκειας (EU-U.S. Data Privacy Framework) ή/και από τις Τυποποιημένες Συμβατικές Ρήτρες της Ευρωπαϊκής Επιτροπής. Γίνεται μόνο αφού δώσετε ρητή συγκατάθεση, και κανένας πάροχος δεν επιτρέπεται να εκπαιδεύσει μοντέλα στα έγγραφά σας. Ποιοι είναι, αναλυτικά, στους **υπεργολάβους επεξεργασίας**.
>
> **EN** AI analysis may run with providers outside the EU, under EU-approved transfer safeguards (the EU-U.S. Data Privacy Framework or standard contractual clauses). It happens only after you give explicit consent, and no provider is permitted to train models on your documents. Who they are, in full: **subprocessors**.

Links to `/subprocessors`. **V10 RESOLVED 2026-08-30:** the wording above now matches
`lib/legal/legal-content.ts:309/:794` exactly in the three places my draft had diverged — ΕΟΧ (not
ΕΕ), «απόφαση επάρκειας» for the DPF (not a generic "safeguard"), and «ή/και» (not «ή»). One
safeguard, one description, both pages.

## 2.2 `ai` — **add** a fallibility bullet

Three bullets today, all accurate. They say what the AI does *not* decide and never say it can be
wrong. Add as the **first** bullet, since it governs the three below it:

> **EL** Η ανάλυση παράγεται από τεχνητή νοημοσύνη που διαβάζει τα δικά σας έγγραφα, και μπορεί να κάνει λάθος. Κάθε πεδίο που εξάγεται εμφανίζεται για να το ελέγξετε, και όταν η ανάγνωση δεν είναι αρκετά αξιόπιστη το λέμε — δεν το μαντεύουμε.
>
> **EN** The analysis is generated by AI reading your own documents, and it can be wrong. Every extracted field is shown for you to check, and when a read is not confident enough we say so — we do not guess.

This is the Article 50 posture stated in product copy rather than only in legal text. It is also
already true of the product: the extraction-flag path exists and tells a user «Η αυτόματη ανάγνωση
χρειάζεται έλεγχο».

## 2.3 `pledge` — **flag only, do not edit**

Current text promises never to transfer policyholder data to «ασφαλιστικές εταιρείες, **τράπεζες**
ή τρίτα ασφαλιστικά πρακτορεία», and the file cites **§3 of the Terms** as its backing.

Per D2, legal is asked to qualify it with consent. **The shape I would expect**, for legal to accept,
reject or redraft — *not* copy to ship:

> …σε ασφαλιστικές εταιρείες, τράπεζες ή τρίτα ασφαλιστικά πρακτορεία, **χωρίς τη ρητή, ανακλητή συγκατάθεσή σας**.

**Do not ship this or the partner page until Terms §3 carries the matching qualification.** A
marketing page that is softer than the contract behind it is the worse of the two failure modes.

## 2.4 The shared in-product disclaimer — one edit, 13+ surfaces

Not a `/trust` string, but it belongs with §2.2. `common.aiAdviceDisclaimer`, rendered by
`components/ui/AiDisclaimer.tsx` across the wallet, coverage, dashboard and admin surfaces. It says
"not advice" and never says "can be wrong".

```diff
- EL  Οι αναλύσεις AI παρέχουν υποστηρικτική πληροφόρηση και δεν αποτελούν
-     επαγγελματική, νομική ή ασφαλιστική συμβουλή. Συζητήστε κάθε σημαντική
-     απόφαση με τον ασφαλιστικό σας σύμβουλο.
+ EL  Οι αναλύσεις παράγονται από τεχνητή νοημοσύνη που διαβάζει τα έγγραφά σας
+     και μπορεί να περιέχουν λάθη — ελέγξτε τα πεδία. Παρέχουν υποστηρικτική
+     πληροφόρηση και δεν αποτελούν επαγγελματική, νομική ή ασφαλιστική συμβουλή.
+     Συζητήστε κάθε σημαντική απόφαση με τον ασφαλιστικό σας σύμβουλο.

- EN  AI outputs are informational support and are not professional, legal or
-     insurance advice. Discuss any important decision with your insurance adviser.
+ EN  These analyses are generated by AI reading your documents and can contain
+     errors — check the fields. They are informational support and are not
+     professional, legal or insurance advice. Discuss any important decision with
+     your insurance adviser.
```

**Primary CTA for `/trust`:** «Δείτε ποιοι επεξεργάζονται τα δεδομένα σας» → `/subprocessors`.

---

## What pass 1 does not touch

`/pricing`, `/compare`, `/product`, `/company` — mechanical once the gating truth lands, and they
carry no claim that is wrong *independently* of it. The health wedge, the ENFIA guide and
`/solutions/partners` are pass 2, and the partner page additionally waits on D2 and Open Question 2.
