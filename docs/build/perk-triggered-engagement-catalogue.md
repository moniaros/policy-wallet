# Addendum to Phase 2 — Perk-triggered engagement

**Attaches to:** `policywallet-transformation-multiagent.md` §7 (Engagement architecture)
**Status:** specification for Opus 5 (Product-Truth agent) to critique before any implementation
**Locale:** el · **Market:** Greece

---

## 1. The mechanic, correctly framed

Not a questionnaire. **Unused-benefit recovery.**

Most policyholders never use the benefits already included in what they pay for. Those benefits are dated (they reset on the policy year), attached to a specific asset, and individually worth money. Surfacing an unused one is the app returning value, not extracting data — which is the only version of this mechanic that a customer accepts on repeat.

| Wrong framing | Right framing |
|---|---|
| «Πότε έκανες τελευταία φορά check-up;» | «Έχεις δωρεάν ετήσιο check-up στο συμβόλαιό σου. Δεν έχει χρησιμοποιηθεί φέτος — ο ασφαλιστικός χρόνος λήγει σε 4 μήνες.» |
| «Ποια είναι η ομάδα αίματός σου;» | *(cut — see §3)* |
| «Είσαι εγγεγραμμένος αιμοδότης;» | *(cut as a data field — see §3)* |
| «Έχεις κάνει ΚΤΕΟ;» | «Το ΚΤΕΟ του Yaris λήγει τον Μάρτιο. Να σου το θυμίσουμε;» |

The difference is not tone. It is whether the app is asking for something or giving something back.

---

## 2. Hard preconditions

1. **A prompt renders only from a confirmed perk on a confirmed policy.** Never from inference, never from a category default, never from a perk whose extraction is incomplete. A prompt about a benefit the customer does not have is worse than silence, and extraction currently still emits placeholder sentinels.
2. **Never rendered as a gap, a risk, or a finding.** Perk prompts live in their own register. They must not inherit severity styling, must not enter the review-items list, and must not affect any score.
3. **One at a time.** Never a form, never a batch, never a profile-completion bar.
4. **Every prompt is dismissible and every cadence is user-controlled**, per the transformation run's §7.4 prohibitions.
5. **Answers, where captured, feed the obligation calendar** — they are not stored as an end in themselves.
6. **Perk data must be verified against the policy document**, and the prompt must be able to show the customer where in their document the benefit appears. A perk claim you cannot evidence is the same class of defect as a severity you cannot validate.

---

## 3. Data tiers — determines what may be built

| Tier | What it covers | Requirement | Recommendation |
|---|---|---|---|
| **A — no data stored** | Reminder, booking link, phone number surfaced. The app never learns the answer. | Nothing beyond normal consent. | **Default. Build the whole catalogue here first.** |
| **B — ordinary personal data** | ΚΤΕΟ date, beneficiary review status, contents inventory, second driver, renovation flag. | Ordinary GDPR basis, stated purpose, deletable. | Build where it feeds the calendar. |
| **C — Article 9 special category** | Anything about health, medical history, conditions, treatments, blood type, donor status. | Explicit consent, separate from T&Cs, revocable, purpose that genuinely requires it. Opens a second Article 9 front alongside the pending agent-side decision. | **Do not build in v1.** Nothing in this catalogue requires it. |

**Blood type and donor status, specifically: cut.** Both are Article 9. Hospitals type-and-cross-match on arrival and do not act on self-reported blood type, so the field does nothing for the user in the emergency it exists for — high compliance cost, near-zero user value. Blood donation is defensible only as an opt-in community feature if an insurer partner runs αιμοδοσία drives, and even then it is a link, not a stored attribute.

**The test for any new prompt:** can the app deliver the value without ever learning the answer? If yes, it is Tier A and it ships. If no, justify the storage against the user's benefit, not the product's.

---

## 4. Catalogue by line of business

Perk classes below are **typical of the Greek market and must be verified against actual extracted perk data per policy** — do not treat this list as ground truth, and do not hardcode insurer-specific benefits. Greek wording is a starting draft for the copy layer, not final.

### 4.1 Υγεία (health / individual)

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Ετήσιος προληπτικός έλεγχος / check-up | Policy year >6 months elapsed, no use recorded | Unused annual check-up, expiring with the policy year | A |
| Δεύτερη ιατρική γνώμη | Ambient; surfaced once per year | Most holders don't know this exists. Surface what it is and how to invoke it. | A |
| Συμβεβλημένο δίκτυο διαγνωστικών / ιατρών | User opens the policy, or on renewal | Which in-network centres are near them | A |
| Τηλεϊατρική / 24ωρη ιατρική γραμμή | On first view; again seasonally (flu season) | Save the number now, not when you need it | A |
| Οδοντιατρικές παροχές / εκπτώσεις | Annually | Unused dental benefit | A |
| Ψυχολογική υποστήριξη | Ambient, low frequency, careful tone | Exists and is confidential | A |
| Παιδιατρικός έλεγχος | Where dependants are on the policy | Child check-up benefit unused | A |
| Μαιευτικές παροχές | Life-event declared | What the policy covers, waiting periods | A |

**Deliberately excluded:** anything asking about conditions, results, medications, or history. All Tier C, none necessary.

### 4.2 Αυτοκίνητο (motor)

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Οδική βοήθεια 24/7 | First view; again before summer and winter travel peaks | Save the number to contacts — one tap | A |
| Φροντίδα ατυχήματος | First view | What it is and how it differs from οδική βοήθεια | A |
| Θραύση κρυστάλλων στο συνεργαζόμενο δίκτυο | Ambient | Free repair at network partners, no excess in many contracts | A |
| Αυτοκίνητο αντικατάστασης | Ambient | Most holders don't know they have it | A |
| Νομική προστασία | Ambient | What it covers and when to invoke it | A |
| Προσωπικό ατύχημα οδηγού | Ambient | Sum insured, who it covers | A |
| ΚΤΕΟ | Vehicle age + last known date | Due date reminder | B |
| Τέλη κυκλοφορίας | Calendar (verify current-year rules) | Annual deadline reminder | A |
| Δεύτερος οδηγός | Renewal window | Is the declared driver list still correct? | B |
| Φιλικός διακανονισμός | First view | Keep a form in the glovebox; here it is | A |
| Φωτογραφίες οχήματος | On add, and annually | Photograph current condition — makes a future claim easier | B |

### 4.3 Κατοικία (home / property)

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Άμεση επισκευαστική βοήθεια (υδραυλικός / ηλεκτρολόγος 24ωρη) | First view; again before winter | Save the number | A |
| Κάλυψη σεισμού | Ambient, annually | Whether it is on the policy — a genuine yes/no in the Greek market | A |
| Αστική ευθύνη προς τρίτους | Ambient | What it covers | A |
| Αξία ανακατασκευής | Renovation declared, or annually | Has the rebuild value changed? | B |
| Περιεχόμενο / high-value items | On add, annually | Photos and receipts of high-value contents | B |
| Συστήματα ασφαλείας | Renewal window | Alarm may qualify for a discount | B |
| Έλεγχος λέβητα / εγκαταστάσεων | Seasonal (pre-winter) | Maintenance reminder — also a common policy condition | A |

Note: boiler and installation maintenance is frequently a **policy condition**, not just good practice — where extraction identifies it as a condition, this becomes a `coverage_voiding_condition` item and belongs in the review register, not the perk register.

### 4.4 Ζωή (life)

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Δικαιούχοι | Annually; on any declared life event | Are your beneficiaries still correct? **Highest-value prompt in the catalogue** — outdated beneficiaries are a common and consequential real-world failure. | B |
| Απαλλαγή πληρωμής ασφαλίστρων σε ανικανότητα | Ambient | Exists and what triggers it | A |
| Εξαγορά / δάνειο επί του ασφαλιστηρίου | Ambient, low frequency | Surrender value and loan facility exist | A |

### 4.5 Ταξιδιωτική (travel)

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Ιατρική κάλυψη εξωτερικού | Declared trip, or seasonal | Emergency number, what to do abroad | A |
| Ακύρωση ταξιδιού | On booking season | Conditions and deadlines for cancellation cover | A |
| Απώλεια αποσκευών | Pre-travel | Documentation needed for a claim | A |
| ΕΚΑΑ / EHIC | Pre-travel to EU | Complements the policy; is yours valid? | A |

### 4.6 Κατοικίδιο (pet)

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Ετήσιος κτηνιατρικός έλεγχος | Annually | Unused benefit | A |
| Εμβολιασμοί | Calendar | Due reminder — also often a policy condition | B |
| Microchip / εθνικό μητρώο | On add | Registration status — legally required in Greece; verify current rules | B |
| Αστική ευθύνη κατοικιδίου | Ambient | Exists and what it covers | A |

### 4.7 Ομαδικά (group health / pension)

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Παροχές ομαδικού που ο εργαζόμενος αγνοεί | On add; annually | Group cover is the least-understood product in the market — a plain-language "what your employer's plan actually gives you" is high value | A |
| Συμπληρωματικότητα με ατομικό | When both exist in the wallet | Overlap and sequence of claiming — which pays first | A |
| Ομαδικό συνταξιοδοτικό: εισφορές, δικαιούχοι | Annually | Contribution level and beneficiary review | B |
| Φορητότητα κατά την αποχώρηση | Employment change declared | What happens to the cover if you leave | A |

### 4.8 Cyber

| Perk class | Trigger | Prompt | Tier |
|---|---|---|---|
| Παρακολούθηση διαρροών δεδομένων | Ambient | Whether the policy includes monitoring | A |
| Υποστήριξη σε περιστατικό | First view | Who to call, first 24 hours | A |
| Prevention nudges (2FA, password manager) | Seasonal | Generic security hygiene, not personal data | A |

### 4.9 Επαγγελματική αστική ευθύνη / Σκάφος

Follow the same pattern: surface the benefit, surface the number, surface the deadline. Both lines carry conditions that void cover more often than consumer lines — where extraction identifies one, it belongs in the review register.

---

## 5. Cross-line prompts

Independent of product, triggered by the wallet as a whole:

- **Overlap detection.** Where a group health policy and an individual health policy coexist, the sequence of claiming matters and almost nobody knows it. Genuinely useful, entirely factual.
- **Perk expiry sweep.** Once per policy year, per asset: everything included and unused, with time remaining.
- **Renewal-window benefit review.** At the renewal window, what was used and what wasn't — the one moment a customer is genuinely receptive to reviewing cover.
- **Life-event cascade.** A declared life event (marriage, child, new home, job change) touches multiple lines at once. One event, one prompt, several suggested reviews.

---

## 6. Delivery rules

- **Frequency ceiling:** at most one perk prompt per session, at most a small number per month, user-configurable, with a global off switch that is honoured everywhere including outbound.
- **In-product first.** A perk prompt earns an outbound message only where it has a real deadline (an expiring unused benefit, a dated obligation). Everything else waits until the customer opens the app.
- **Never bundled with an upsell.** A prompt about a benefit the customer already paid for must not carry a purchase CTA. The moment it does, the mechanic reads as marketing and stops working.
- **Evidence on tap.** Every perk prompt links to the clause in the customer's own document. If it cannot, it does not render.
- **Answer capture is optional.** Tier A prompts must function fully when the customer never responds.

---

## 7. What the Product-Truth agent must decide before implementation

1. Which perk classes are reliably extractable today, per line, with what confidence — and which are aspirational until per-insurer template extraction lands.
2. Whether unused-benefit tracking requires the customer to self-report use, and if so how to do it in one tap without building a claims log.
3. Where "your policy includes a second medical opinion" crosses from information into advice, in a regulated Greek context. Needs the DPO track, not an agent's judgement.
4. Whether any Tier B capture requires a consent surface change — and if so, that halts to the human queue rather than shipping.

**Standing prohibition for this addendum:** no prompt in this catalogue may reference the protection score, carry a severity chip, or claim a risk the engine cannot substantiate. Perk prompts are the one register in the app that is unambiguously good news, and mixing them with unvalidated judgement would waste that.
