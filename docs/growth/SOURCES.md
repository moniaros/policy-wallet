# SOURCES — verified claims behind the GROWTH-HOOKS-01 market hooks

**Written 2026-08-26 (Track B / GB-02). Every row below was fetched and read during this run.**
Nothing here is asserted from model knowledge. A claim that could not be fetched and quoted is
**not** in this file — it is in [§ Cut claims](#cut-claims), with the reason.

---

## How to read this file

### Format deviation, stated up front

The brief asked for one markdown table with seven columns. The excerpts are multi-sentence
verbatim Greek legal text; inside a table cell they become unreadable and unmaintainable, and the
whole point of the excerpt is that a reviewer can check it against the source without leaving the
page. So each claim is a **record block** carrying exactly the seven fields the brief specified,
preceded by a compact index table. This is strictly more information than a single table, and it
is what the freshness guard parses. No field was dropped.

### The rules these rows were held to

1. **Primary sources only.** ΦΕΚ / ministry-hosted ΦΕΚ PDFs, ΕΛΓΑ, ΑΑΔΕ, gov.gr, ΤτΕ, or — where
   the anchor is a contract term rather than a statute — a **real published policy wording**.
2. **A wording is evidence of a clause class, never of the reader's own policy.** Every
   wording-derived claim below is phrased "policies of this class commonly…" and names the
   specific document it came from. None of them may be rendered as "your policy contains…".
3. **Uncertain is cut, not softened.** Where a rule has been amended repeatedly and I could not
   obtain a consolidated primary text, the claim is cut.

### `reverify_after` intervals

Three intervals are used, and each row states which and why:

| interval | applies to | reasoning |
|---|---|---|
| **6 months** | euro-denominated administrative penalties | Penalty amounts are the most frequently amended figures in Greek fiscal law — they ride along on any tax bill, with no notice and no transitional period. A stale fine figure is a factual error on a public page. |
| **12 months** | statutory procedure, ΚΥΑ content, policy wordings | Procedure and ministerial-decision content change on a legislative or administrative cycle. Wordings get the same interval for a different reason: an insurer republishes an edition at will, at the **same URL**, so the cited PDF can change under us silently. |
| **24 months** | — | Not used. Nothing in this set is stable enough to earn it; even the Civil Code principle in SRC-013 is cited through a host law amended five times since 2021. |

---

## Index

| id | hooks | claim, in one line | interval | reverify_after |
|---|---|---|---|---|
| SRC-001 | H1 | Home wordings value a building at the cost of rebuilding it, not its tax value | 12m | 2027-08-26 |
| SRC-002 | H1 | Sum insured below that value cuts the payout in the same proportion | 12m | 2027-08-26 |
| SRC-003 | H1 | Motor wordings state the same average rule as an explicit formula | 12m | 2027-08-26 |
| SRC-004 | H1 | Wordings name άρθρο 17 ν. 2496/1997 as the source, and first-loss cover disapplies it | 12m | 2027-08-26 |
| SRC-005 | H3 | Duty at inception to disclose everything objectively material to the risk | 12m | 2027-08-26 |
| SRC-006 | H3 | Negligent non-disclosure cuts the payout; fraudulent non-disclosure releases the insurer | 12m | 2027-08-26 |
| SRC-007 | H3 | 14 days to notify anything that materially aggravates the risk mid-term | 12m | 2027-08-26 |
| SRC-008 | H3 | Theft cover commonly falls away after 30 consecutive days unoccupied | 12m | 2027-08-26 |
| SRC-009 | H4 | The uninsured-vehicle cross-check runs at least once per calendar half-year | 12m | 2027-08-26 |
| SRC-010 | H4 | Fines are €1,000 / €500 / €250 by vehicle class | 6m | 2027-02-26 |
| SRC-011 | H4 | A second check follows within 3 months; then licence and plates are removed | 12m | 2027-08-26 |
| SRC-012 | H4 | Objection is electronic, within 10 working days, decided within 30 | 12m | 2027-08-26 |
| SRC-013 | H5 | A companion-animal owner is liable for any harm the animal causes (ΑΚ 924) | 12m | 2027-08-26 |
| SRC-014 | H6 | ΕΛΓΑ covers a closed list of perils, and not the plant capital itself | 12m | 2027-08-26 |
| SRC-015 | H6 | Loss up to 20% pays nothing; above it ΕΛΓΑ pays 88% of the part above 15% | 12m | 2027-08-26 |
| SRC-016 | H6 | The insured value is an administratively set figure, not a market or replacement price | 12m | 2027-08-26 |

Sixteen verified claims across **five** hooks. Five hooks (**H2, H7, H8, H9, H10**) carry no
verified claim at all and cannot ship — see [§ Cut claims](#cut-claims).

---

## Records

### SRC-001
- **claim:** Greek home insurance policies of this class measure a building's insurable value as the cost of rebuilding it with the same materials and construction method, less depreciation — not its tax ("objective") value.
- **source:** https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf
- **excerpt:** «Ειδικότερα βάση υπολογισμού και καθορισμού του ασφαλίσματος αποτελεί: 4.1 Για κτίρια και γενικώς για κτίσματα η αναγκαία δαπάνη ανοικοδόμησής τους με τα ίδια υλικά και τρόπο κατασκευής μετά την αφαίρεση της μείωσης της κατασκευαστικής αξίας.» (Γενικοί Όροι, άρθρο 3.3 «Υπολογισμός και καταβολή του ασφαλίσματος», παρ. 4.1)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H1
- **interval_note:** 12 months — a published wording edition is replaced at the insurer's discretion at the same URL, with no version marker in the path. Annual re-fetch is the only way to notice.
- **caveat:** Clause class only. This is one insurer's published wording, cited as an example of how policies of this class define insurable value. It is not evidence about any particular reader's policy.

### SRC-002
- **claim:** Where the sum insured is lower than that value, policies of this class reduce the payout in the same proportion as the shortfall — the average clause (αναλογικός όρος).
- **source:** https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf
- **excerpt:** «Σε περίπτωση κατά την οποία το ασφαλιστικό ποσό είναι μικρότερο (κατώτερο) της αξίας που εξευρίσκεται με βάση τα ανωτέρω οριζόμενα στο παρόν άρθρο (υπασφάλιση), τότε το ασφάλισμα καθορίζεται (και περιορίζεται) με βάση το λόγο (αναλογία) μεταξύ ασφαλιστικού ποσού και της ασφαλιστικής αξίας που καθορίζεται με βάση τις παραγράφους 3.3 (1), 3.3 (2), 3.3 (3) & 3.3 (4).» (Γενικοί Όροι, άρθρο 3.3, παρ. 5)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H1
- **interval_note:** 12 months — same wording document as SRC-001; they must be re-fetched together.
- **caveat:** Clause class only.

### SRC-003
- **claim:** Motor policies of this class state the same proportional rule as an arithmetic formula: the payout is the loss multiplied by the ratio of sum insured to current market value.
- **source:** https://eu-healthcare.eopyy.gov.gr/wp-content/uploads/2024/11/AUTO_Oroi_Asfalisis.pdf
- **excerpt:** «Υπασφάλιση - Αναλογικός Όρος. Είναι η ασφάλιση του αυτοκινήτου σε αξία μικρότερη της Τρέχουσας Εμπορικής Αξίας του. Σε περίπτωση επέλευσης του Ασφαλισμένου Κινδύνου, καταβάλλεται αποζημίωση βάσει του παρακάτω μαθηματικού τύπου: ΑΠΟΖΗΜΙΩΣΗ = ΑΣΦΑΛΙΖΟΜΕΝΟ ΚΕΦΑΛΑΙΟ / ΤΡΕΧΟΥΣΑ ΕΜΠΟΡΙΚΗ ΑΞΙΑ Χ ΖΗΜΙΑ» (Ορισμοί)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H1
- **interval_note:** 12 months — wording edition risk as above. This document is hosted on a gov.gr subdomain (ΕΟΠΥΥ), which makes the URL more stable than an insurer's own CDN but does not freeze the edition.
- **caveat:** Clause class only. Included as a **second, independent** wording showing the same rule, so H1's average-clause claim does not rest on one document.

### SRC-004
- **claim:** Published wordings identify άρθρο 17 του ν. 2496/1997 as the legal source of the average rule, and record that cover written on a first-loss basis (Α΄ ΚΙΝΔΥΝΟ) disapplies it.
- **source:** https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf
- **excerpt:** «1.23 ΚΑΛΥΨΗ ΣΕ Α' ΖΗΜΙΑ Ή ΣΕ Α' ΚΙΝΔΥΝΟ — Δηλώνεται και συμφωνείται ότι σε περίπτωση επέλευσης κινδύνου καλυπτόμενου με όριο αποζημίωσης σε Α' ΖΗΜΙΑ ή σε Α' ΚΙΝΔΥΝΟ δε θα εφαρμόζεται για αυτόν τον κίνδυνο ο αναλογικός όρος, όπως αυτός ορίζεται στις διατάξεις του άρθρου 17 του Νόμου 2496/97 περί Ασφαλιστικής Σύμβασης σχετικά με την υπασφάλιση…» — and, in the motor wording (SRC-003's document): «…με την επιφύλαξη του άρθρου 17 Ν. 2496/97, περί υπασφάλισης και υπερασφάλισης.»
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H1
- **interval_note:** 12 months — wording edition risk.
- **caveat:** **This row cites the wordings' own reference to the statute. It is NOT a reading of άρθρο 17 itself** — I could not retrieve ΦΕΚ Α΄ 87/1997 (see [§ Sources I could not reach](#sources-i-could-not-reach)). Copy may say that policies of this class cite άρθρο 17 ν. 2496/1997; it may **not** state what άρθρο 17 says.

### SRC-005
- **claim:** At inception, policies of this class oblige the applicant to declare every fact objectively material to the assessment of the risk, and to answer the insurer's questions.
- **source:** https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf
- **excerpt:** «4. Κατά τη σύναψη της ασφαλιστικής σύμβασης, ο Λήπτης της Ασφάλισης υποχρεούται να δηλώσει στην Εταιρία κάθε στοιχείο ή περιστατικό που γνωρίζει, το οποίο είναι αντικειμενικά ουσιώδες για την εκτίμηση του κινδύνου, καθώς επίσης να απαντήσει σε κάθε σχετική ερώτηση της Εταιρίας.» (Γενικοί Όροι, άρθρο 3.2, παρ. 4)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H3
- **interval_note:** 12 months — wording edition risk.
- **caveat:** Clause class only.

### SRC-006
- **claim:** Policies of this class reduce the payout in proportion to the premium that would have been charged where a material fact was withheld negligently; where it was withheld fraudulently and the loss occurs within the insurer's one-month cancellation window, the insurer is released from paying at all.
- **source:** https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf
- **excerpt:** «7. Σε περίπτωση παράβασης της διάταξης της παρ. 3.2 (4) από αμέλεια του ασφαλισμένου ή Λήπτη της Ασφάλισης, η Εταιρία έχει τα δικαιώματα της διάταξης της παρ. 3.2 (5) και επιπλέον, αν ο ασφαλιστικός κίνδυνος επέλθει πριν τροποποιηθεί η Σύμβαση … το ασφάλισμα μειώνεται κατά το λόγο του ασφαλίστρου που έχει καθορισθεί, αν δεν υπήρχε η παράβαση. 8. Σε περίπτωση παράβασης της διάταξης της παρ. 3.2 (4) από δόλο του ασφαλισμένου η Εταιρία έχει δικαίωμα να καταγγείλει τη Σύμβαση μέσα σε προθεσμία ενός (1) μηνός … Αν ο ασφαλιστικός κίνδυνος επέλθει εντός της παραπάνω προθεσμίας, η Εταιρία απαλλάσσεται της υποχρέωσης του προς καταβολή ασφαλίσματος.» (Γενικοί Όροι, άρθρο 3.2, παρ. 7–8)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H3
- **interval_note:** 12 months — wording edition risk.
- **caveat:** Clause class only. Note the asymmetry the excerpt actually supports: negligence **reduces**, fraud **releases**, and the release is bounded by a one-month window. Copy must not flatten this into "you lose your cover".

### SRC-007
- **claim:** Mid-term, policies of this class give the policyholder 14 days from becoming aware of anything that materially aggravates the risk to declare it, after which the insurer may cancel or demand a variation.
- **source:** https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf
- **excerpt:** «1. Κατά τη διάρκεια ασφάλισης ο Λήπτης της Ασφάλισης ή Ασφαλισμένος υποχρεούται να δηλώσει στην Εταιρία μέσα σε δεκατέσσερεις (14) ημέρες από τότε που περιήλθε σε γνώση του, κάθε στοιχείο ή περιστατικό, το οποίο μπορεί να επιφέρει σημαντική επίταση του κινδύνου, σε βαθμό που, αν η Εταιρία το γνώριζε, δε θα είχε συνάψει την ασφάλιση ή δε θα την είχε συνάψει με τους ίδιους όρους. 2. Η Εταιρία, μόλις λάβει γνώση της επίτασης του κινδύνου, δικαιούται να καταγγείλει τη σύμβαση ή να ζητήσει την τροποποίησή της.» (Γενικοί Όροι, άρθρο 3.5 «Επίταση κινδύνου», παρ. 1–2)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H3
- **interval_note:** 12 months — wording edition risk.
- **caveat:** Clause class only. **This row does not establish that short-term letting IS an aggravation of the risk** — no primary source states that, and the characterisation is cut (see [§ Cut claims](#cut-claims)). What is verified is only that a materially risk-aggravating change carries a 14-day duty.

### SRC-008
- **claim:** Theft cover in policies of this class commonly falls away where the premises stay unoccupied for more than 30 consecutive days, unless a longer period was expressly agreed in writing.
- **source:** https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf
- **excerpt:** «3. Ζημία εφόσον ο χώρος εντός του οποίου βρίσκεται η ασφαλισμένη περιουσία παραμένει, κατά τη διάρκεια της περιόδου ασφαλίσεως, ακατοίκητος για συνεχόμενο χρονικό διάστημα μεγαλύτερο των τριάντα (30) ημερών, εκτός εάν στο ασφαλιστήριο συμφωνήθηκε ρητά και γραπτά μεγαλύτερο χρονικό διάστημα.» (Ειδικοί Όροι, εξαιρέσεις κλοπής)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H3
- **interval_note:** 12 months — wording edition risk.
- **caveat:** Clause class only, and specific to the **theft** section of this wording. Do not generalise it to fire or water damage.

### SRC-009
- **claim:** Greece runs an electronic cross-check to find uninsured vehicles at least once every calendar half-year. It is carried out by the General Secretariat of Information Systems and Digital Governance of the Ministry of Digital Governance.
- **source:** https://minfin.gov.gr/wp-content/uploads/2024/07/FEK-2024-Tefxos-A-00096-N.-5113-2024-ΑΝΑΣΦΑΛΙΣΤΑ-ΟΧΗΜΑΤΑ.pdf
- **excerpt:** «Άρθρο 22 — Ηλεκτρονικοί διασταυρωτικοί έλεγχοι οχημάτων … διενεργούνται από τη Γενική Γραμματεία Πληροφοριακών Συστημάτων και Ψηφιακής Διακυβέρνησης (Γ.Γ.Π.Σ.Ψ.Δ.) του Υπουργείου Ψηφιακής Διακυβέρνησης έλεγχοι με ηλεκτρονική διασταύρωση δεδομένων … Ο ηλεκτρονικός διασταυρωτικός έλεγχος διενεργείται τουλάχιστον μία (1) φορά ανά ημερολογιακό εξάμηνο.» (ν. 5113/2024, ΦΕΚ Α΄ 96/21.06.2024, άρθρο 22)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H4
- **interval_note:** 12 months — statutory procedure in a law enacted 2024; the cadence is unlikely to move without a visible legislative act.
- **caveat:** **The hook's framing is wrong and must be corrected before it ships.** This is not an "ΑΑΔΕ flag". The cross-check is run by Γ.Γ.Π.Σ.Ψ.Δ.; the uninsured-vehicle fine is imposed by Γ.Δ. Σ.Δ.Ο.Ε. (see SRC-010). ΑΑΔΕ's role in this regime is road tax (τέλη κυκλοφορίας), not the insurance check.

### SRC-010
- **claim:** Where the cross-check finds a vehicle uninsured, the fine is €1,000 for public-use buses and lorries, €500 for passenger cars and all other vehicles, and €250 for two-wheelers. It is imposed by the Financial Crime Directorate (Γ.Δ. Σ.Δ.Ο.Ε.).
- **source:** https://minfin.gov.gr/wp-content/uploads/2024/07/FEK-2024-Tefxos-A-00096-N.-5113-2024-ΑΝΑΣΦΑΛΙΣΤΑ-ΟΧΗΜΑΤΑ.pdf
- **excerpt:** «α) Αν το όχημα εντοπίζεται ανασφάλιστο, επιβάλλεται από τη Γενική Διεύθυνση Σώματος Δίωξης Οικονομικού Εγκλήματος (Γ.Δ. Σ.Δ.Ο.Ε.) του Υπουργείου Εθνικής Οικονομίας και Οικονομικών πρόστιμο χιλίων (1.000) ευρώ για τα λεωφορεία και φορτηγά δημόσιας χρήσης, πεντακοσίων (500) ευρώ για τα επιβατηγά και άλλα οχήματα κάθε φύσης και διακοσίων πενήντα (250) ευρώ για τα δίκυκλα.» (ν. 5113/2024, άρθρο 23 παρ. 1α)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-02-26
- **hooks:** H4
- **interval_note:** **6 months** — euro-denominated penalties are the most amendable figures in this set; they are routinely revised inside unrelated fiscal bills. A wrong fine on a public page is a factual error, not a nuance.
- **caveat:** These are the figures in the enacted law. An earlier Ministry of Finance **press release about the draft bill** carried the same numbers, but a press release about a bill in consultation is not a source; this row is read from ΦΕΚ Α΄ 96/21.06.2024.

### SRC-011
- **claim:** After a penalty notice, a second electronic cross-check is mandatory within three months. If the owner still has not complied, the vehicle's registration document and plates are removed.
- **source:** https://minfin.gov.gr/wp-content/uploads/2024/07/FEK-2024-Tefxos-A-00096-N.-5113-2024-ΑΝΑΣΦΑΛΙΣΤΑ-ΟΧΗΜΑΤΑ.pdf
- **excerpt:** «2. Όταν από τον ηλεκτρονικό διασταυρωτικό έλεγχο διαπιστώνεται παράβαση, διενεργείται υποχρεωτικά δεύτερος ηλεκτρονικός διασταυρωτικός έλεγχος, εντός τριών (3) μηνών από την κοινοποίηση της πράξης επιβολής προστίμου. Αν, κατά τον έλεγχο αυτόν, διαπιστωθεί μη συμμόρφωση … η άδεια κυκλοφορίας και οι κρατικές πινακίδες του οχήματος αφαιρούνται.» (ν. 5113/2024, άρθρο 23 παρ. 2)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H4
- **interval_note:** 12 months — statutory procedure.

### SRC-012
- **claim:** The owner may object to the penalty electronically through the national digital portal within 10 working days of notification. The authority that imposed the fine decides within 30 working days, and if the objection succeeds the fine or road tax is written off.
- **source:** https://minfin.gov.gr/wp-content/uploads/2024/07/FEK-2024-Tefxos-A-00096-N.-5113-2024-ΑΝΑΣΦΑΛΙΣΤΑ-ΟΧΗΜΑΤΑ.pdf
- **excerpt:** «Άρθρο 24 — Ένσταση κατά της πράξης επιβολής προστίμου. Ο ιδιοκτήτης ή ο κάτοχος του οχήματος έχει δικαίωμα ένστασης, η οποία υποβάλλεται ηλεκτρονικά σε ειδική ηλεκτρονική εφαρμογή της Ενιαίας Ψηφιακής Πύλης της Δημόσιας Διοίκησης εντός προθεσμίας δέκα (10) εργάσιμων ημερών από την κοινοποίηση της πράξης επιβολής προστίμου. Η ένσταση εξετάζεται από την αρχή που επιβάλλει το αντίστοιχο πρόστιμο … η οποία αποφαίνεται εντός προθεσμίας τριάντα (30) εργάσιμων ημερών … Σε περίπτωση αποδοχής της ένστασης, το οικείο πρόστιμο ή τα τέλη κυκλοφορίας διαγράφονται.» (ν. 5113/2024, άρθρο 24)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H4
- **interval_note:** 12 months — statutory procedure. The 10-working-day window is the operative fact for the hook ("proving cover was in force on the check date") and is short enough that a stale value would cause real harm; it is still procedure, not a penalty amount.
- **caveat:** The statute sets out the objection right and the deadlines. It does **not** enumerate what evidence proves cover was in force on the check date — that is not stated in the law and must not be invented.

### SRC-013
- **claim:** The owner or foster carer of a companion animal is liable for any injury or damage the animal causes, under άρθρο 924 of the Civil Code.
- **source:** https://pet.gov.gr/helpfiles/emzs-policy-new/img/files/4830-2021-nomos-zoa-syntrofias.pdf
- **excerpt:** «2. Ο ιδιοκτήτης ή ο ανάδοχος ζώου συντροφιάς ευθύνεται για οποιαδήποτε βλάβη ή ζημιά προκαλείται από το ζώο, σύμφωνα με το άρθρο 924 του Αστικού Κώδικα (π.δ. 456/1984, Α' 164).» (ν. 4830/2021, ΦΕΚ Α΄ 169/18.09.2021, άρθρο 9 «Υποχρεώσεις ιδιοκτήτη ζώου συντροφιάς», παρ. 2)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H5
- **interval_note:** 12 months — the underlying Civil Code principle is very stable, but the host law has been amended by ν. 4954/2022, ν. 5056/2023, ν. 5066/2023 and ν. 5143/2024 (per the official registry's legislation index), so the paragraph must be re-read rather than assumed.
- **caveat:** **This is the whole of what H5's statutory half can claim.** The same law's only mention of insurance concerns **stray** animals, and there is no mandatory dog-owner liability insurance in it — see the H5 entries in [§ Cut claims](#cut-claims).

### SRC-014
- **claim:** ΕΛΓΑ's compulsory crop insurance covers a closed list of causes — hail, frost, windstorm, flood, heatwave and solar radiation, excessive or untimely rainfall, snow and sea spray, plus damage by bear, wild boar and wild rabbits in defined areas — and does not cover damage to the plant capital itself, only that season's production.
- **source:** https://elga.gr/wp-content/uploads/2024/01/kanonismos-asfalisis-fitikis-2011.pdf
- **excerpt:** «Άρθρο 2 — Ασφαλιζόμενοι κίνδυνοι. Στην υποχρεωτική ασφάλιση του ΕΛ.Γ.Α. υπάγονται οι παρακάτω κίνδυνοι (ζημιογόνα αίτια) που προκαλούν ζημιές στην παραγωγή των συστηματικών καλλιεργειών: α. Φυσικοί κίνδυνοι: χαλάζι, παγετός, ανεμοθύελλα, πλημμύρα, καύσωνας και ηλιακή ακτινοβολία, υπερβολικές ή άκαιρες βροχοπτώσεις, χιόνι και θάλασσα. β. Άγρια ζώα: αρκούδα, αγριογούρουνα … και άγρια κουνέλια …» and «Άρθρο 4 … 2. Οι ζημιές που προκαλούνται στο φυτικό κεφάλαιο ή που επιδρούν μειωτικά στην παραγωγή της επόμενης καλλιεργητικής περιόδου, δεν καλύπτονται ασφαλιστικά, εκτός της καλλιέργειας των σπαραγγιών.» (ΚΥΑ 157502/27.07.2011, ΦΕΚ Β΄ 1668/27.07.2011, άρθρα 2 και 4)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H6
- **interval_note:** 12 months — a ΚΥΑ is amended by two ministers' signatures without parliamentary passage. This one has been amended four times (Β΄ 2691/2011, Β΄ 699/2012, Β΄ 1939/2016, Β΄ 3130/2025).
- **caveat:** **Cite the 2011 regulation, never the 1998 one.** ΕΛΓΑ still publishes the superseded 1998 ΚΥΑ 15711/30.09.98 at `elga.gr/nomoi/kanonismos-asfalisis-fytikis-paragogis/`, and its peril list **differs** — «ηλιακή ακτινοβολία» is absent from it. See [§ A trap worth recording](#a-trap-worth-recording).

### SRC-015
- **claim:** ΕΛΓΑ pays nothing where the loss is 20% or less of the parcel's total production. Above 20%, it pays 88% of the portion of the loss exceeding 15%.
- **source:** https://elga.gr/wp-content/uploads/2024/01/kanonismos-asfalisis-fitikis-2011.pdf
- **excerpt:** «Άρθρο 7 — Ελάχιστο όριο απαλλαγής – Ποσοστό ζημιάς που δεν καλύπτεται ασφαλιστικά – Ποσοστό κάλυψης ζημιών. … σε περίπτωση που γίνονται ζημιές στη φυτική παραγωγή … σε ποσοστό μέχρι και του είκοσι στα εκατό (20%) της συνολικής παραγωγής του αγροτεμαχίου που ζημιώθηκε, κατ' είδος και ποικιλία καλλιέργειας, δεν καλύπτεται ασφαλιστικά (δεν αποζημιώνεται). Αν η ζημιά είναι μεγαλύτερη από 20%, καταβάλλεται αποζημίωση … Στην περίπτωση αυτή ο ΕΛ.Γ.Α. καταβάλλει αποζημίωση ίση προς το ποσοστό 88%, του πάνω από 15% ποσοστού ζημιάς.» (ΚΥΑ 157502/2011, άρθρο 7)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H6
- **interval_note:** 12 months — ΚΥΑ amendability as above. The same article also lets ΕΛΓΑ's board vary the deductible for particular crops or insureds, so the headline figures are the default rather than an invariant.
- **caveat:** The article's closing paragraphs permit the deductible to be **increased or decreased** by board decision approved by the Minister. Copy must say "as a rule" / "by default", not "always".

### SRC-016
- **claim:** The insured value of the crop is an administratively determined figure — area, the average regional yield per stremma, and a per-kilo product value fixed by ministerial decision — rather than the grower's market price or cost of replacement.
- **source:** https://elga.gr/wp-content/uploads/2024/01/kanonismos-asfalisis-fitikis-2011.pdf
- **excerpt:** «6. Η ασφαλιζόμενη αξία της φυτικής παραγωγής ορίζεται με βάση: α) τον αριθμό των στρεμμάτων … όπως δηλώνονται στην Ενιαία Δήλωση Καλλιέργειας/Εκτροφής, β) τη μέση παραγωγή κατά στρέμμα και είδος ανά γεωγραφική περιοχή των δηλούμενων καλλιεργειών και γ) την αξία του παραγόμενου προϊόντος ανά κιλό ή τεμάχιο ανάλογα με την καλλιέργεια, όπως αυτές καθορίζονται στην εκάστοτε ισχύουσα κοινή υπουργική απόφαση …» and «7. Αποζημίωση είναι το χρηματικό ποσό που καταβάλλεται στους ασφαλισμένους προς αντιστάθμιση της άμεσης ζημιάς …» (ΚΥΑ 157502/2011, άρθρο 3 παρ. 6–7)
- **verified_at:** 2026-08-26
- **reverify_after:** 2027-08-26
- **hooks:** H6
- **interval_note:** 12 months — the per-kilo values are themselves set by a separate ΚΥΑ "εκάστοτε ισχύουσα", i.e. reissued periodically. This row claims only the **mechanism**, not any figure, which is why it survives a year.
- **caveat:** Do not quote any specific per-kilo value from this row; none was verified.

---

## Cut claims

Each of these was in scope and is **not** shipping. A hook with a caveat is a hook that should not
ship, so where every claim behind a hook is cut, the hook is cut.

| hook | claim as briefed | why it is cut |
|---|---|---|
| **H1** | Sums insured are commonly set at αντικειμενική αξία (tax value) rather than rebuild cost | This is a **market-practice** claim about what Greek consumers and insurers actually do. No primary source measures it. SRC-001 establishes what the wording requires; it says nothing about how often people get it wrong. Asserting a prevalence we have not measured is the same defect class as the removed `500+` / `98%` trust metrics. |
| **H1** | What άρθρο 17 ν. 2496/1997 provides | Could not retrieve ΦΕΚ Α΄ 87/1997. et.gr's download API 404s and its search front-end is a JavaScript application that serves no document to a fetcher. SRC-004 records only that published wordings **cite** the article. |
| **H2** | A bank-mandated fire policy on a mortgage insures the lender's interest, not the borrower's | Not verified. No primary source obtained for the assignment-of-benefit structure. |
| **H2** | The borrower has a right to substitute their own insurer | Not verified. The relevant framework would be the mortgage-credit tying rules and ΤτΕ conduct supervision; I obtained neither text. **H2 ships nothing.** |
| **H3** | Short-term letting constitutes an undeclared change of risk / επίταση κινδύνου | This is a **legal characterisation**, not a quoted rule. SRC-007 verifies that a materially risk-aggravating change carries a 14-day duty; no primary source states that short-term letting is such a change. Making that leap in public copy would be advice, and wrong in an unknown share of cases. |
| **H3** | ΑΜΑ (Αριθμός Μητρώου Ακινήτου) registration is required for short-term letting | Not verified. ΑΑΔΕ's deep pages return **HTTP 403** to every fetcher I tried (see below), and I would not cite the rule from a secondary summary. |
| **H4** | ΑΑΔΕ flags the uninsured vehicle | **Factually wrong as framed** and corrected rather than cut: the cross-check is run by Γ.Γ.Π.Σ.Ψ.Δ. and the fine by Γ.Δ. Σ.Δ.Ο.Ε. (SRC-009, SRC-010). The hook's title must change. |
| **H4** | δήλωση ακινησίας as the way to avoid the flag | Not verified to the standard needed. ν. 5113/2024 refers to ακινησία repeatedly and amends ν. 2367/1953 άρθρο 22, but I did not obtain the consolidated text of the declaration procedure itself. |
| **H5** | **Mandatory dog-owner liability insurance** | **The obligation does not exist.** I read the full text of ν. 4830/2021 and searched every occurrence of «ασφαλ» in it. The only substantive insurance reference is in άρθρο 9 παρ. 2 and concerns **stray** animals — it relieves the registered keeper of liability if compensation «καταβληθεί … από άλλον φορέα, όπως ασφαλιστική εταιρεία». There is no duty on a dog owner to hold liability cover. This is the single most important cut in this file: the hook as briefed asserts a legal obligation that Greek law does not impose. |
| **H5** | A statutory minimum sum insured for dog-owner liability | No such provision found anywhere in ν. 4830/2021. Cut with the obligation it depended on. |
| **H6** | ΕΛΓΑ compensation vs "actual replacement cost" | **Reshaped, not cut.** SRC-014–016 support the contrast, but the honest framing is the 20% deductible, the 88%-above-15% formula and the administratively fixed unit value — not the phrase "replacement cost", which the regulation never uses. |
| **H7** | Group employer health terminates on leaving employment | Not verified. I obtained no published ομαδικό wording or IPID. |
| **H7** | Individual health policies carry a renewability guarantee (ανανεωσιμότητα) | Not verified. This would need the ΤτΕ executive-committee act on health insurance contract terms, which I did not retrieve. **H7 ships nothing.** |
| **H8** | Per-profession statutory minimum professional-indemnity limits | Not verified for any profession. The intermediary figures under the IDD are indexed and were revised by delegated regulation, which is exactly the "changed recently, verify or cut" case; and I obtained no ΤΕΕ or other licensing-body requirement. **H8 ships nothing.** |
| **H9** | IDD obligations that a consumer-initiated second-opinion review would engage | Not verified. ν. 4583/2018 not retrieved. **H9 ships nothing.** |
| **H10** | IDD continuing-professional-development hours and registry-renewal cadence for intermediaries | Not verified. ν. 4583/2018 not retrieved; the 15-hour figure is widely repeated but I will not assert an hours figure from secondary material. **H10 ships nothing.** |

### What this means for Tracks A and C

Track B was declared blocking for A and C. The result is that **five of the ten hooks (H2, H7, H8,
H9, H10) currently have no verified claim and must not be written up**, and two more (H4, H5) need
their premise rewritten before copy is drafted. Only H1, H3 and H6 can be authored close to the
brief, and each carries clause-class caveats that the copy has to honour. This is a §10 halt
condition and is recorded as such rather than papered over.

---

## Sources I could not reach

Recorded because a silent gap reads as coverage.

| source | attempted | result |
|---|---|---|
| **et.gr / search.et.gr** (Εθνικό Τυπογραφείο) | `api/DownloadFek`, `api/DownloadFeksApi`, `idocs-nph/…`, `search.et.gr/el/fek/?fekId=…`, several API guesses | Download endpoints 301 to a 404. The search front-end returns a JavaScript shell with no document in the HTML. **No ΦΕΚ could be fetched from the official gazette directly.** Every ΦΕΚ cited above was obtained as an official signed PDF **re-hosted by the responsible public body** (minfin.gov.gr, elga.gr, pet.gov.gr) — which is why those three hooks have sources and the others do not. |
| **www.aade.gr** deep pages | `/anasfalista-ohimata` via WebFetch and via curl with browser headers | **HTTP 403** consistently. The homepage returns 200; article pages do not. This is what cut the ΑΜΑ claim in H3. |
| **www.elga.gr** (with `www`) | WebFetch | TLS chain error ("unable to verify the first certificate"). The apex `elga.gr` works and was used. |
| **www.gov.gr** ΑΑΔΕ uninsured-vehicle page | direct fetch | HTTP 404 — the URL surfaced by search no longer resolves. |
| **eaee.gr** legislation index | `/asfalistiki-nomothesia/` | 404. ΕΕΑ's site was reachable but I did not locate a legislation index holding ν. 2496/1997 or ν. 4583/2018. |

**Consequence:** the four unverified statutory hooks (H2, H8, H9, H10) all depend on laws
(ν. 2496/1997, ν. 4583/2018, ν. 4438/2016) that are not re-hosted by a public body I could find.
Clearing them needs a working ΦΕΚ retrieval path — that is a concrete, tractable next step, not an
open-ended research task.

---

## A trap worth recording

ΕΛΓΑ publishes the **superseded** 1998 regulation (ΚΥΑ 15711/30.09.98) on its live site at
`elga.gr/nomoi/kanonismos-asfalisis-fytikis-paragogis/`, under a heading that reads as current. I
read it in full first. It was only ΕΛΓΑ's own `thesmiko-plaisio` index — which lists «Κανονισμός
Ασφάλισης Φυτικής Παραγωγής ΕΛ.Γ.Α. **2011**» plus four amendments through **20-06-2025** — that
revealed it was not the operative text.

The two versions are not equivalent: the 1998 peril list omits **ηλιακή ακτινοβολία**, which the
2011 list includes. A hook built on the page that ranks well would have understated the cover.

**The rule this produces:** a document being published on the responsible body's own site is not
evidence that it is in force. Find the body's index of current instruments and confirm the
amendment chain before quoting. Both ΕΛΓΑ rows above were re-read against the 2011 ΦΕΚ, and the
2025 amendment (ΦΕΚ Β΄ 3130/20.06.2025) was checked line by line — it amends only άρθρο 6 παρ. 9
(ενεργητική προστασία) and leaves άρθρα 2, 3, 4 and 7 untouched.

---

## Citation architecture — the decision, and the debt

### The problem

The twelve existing `/guides` articles already render a «Πηγές» block and already carry citations,
through `GuideSource` in `lib/guides/content.ts`:

```ts
export type GuideSource = {
    label: LocalizedString
    url: string
}
```

There is no excerpt, no `verified_at` and no `reverify_after`. Worse, **all 30 authored citations
across the 12 articles are bare origins** — `https://www.aade.gr`, `https://www.eaee.gr`,
`https://www.bankofgreece.gr`, `https://www.gov.gr`, `https://www.dias.com.gr`,
`https://www.epikef.gr`. Not one is a deep link. A homepage cannot support a specific statutory
claim, cannot be checked by a reader, and cannot go stale in any detectable way.

These blocks are public and indexed — the guide routes emit Article and FAQPage JSON-LD. Presenting
unverifiable material under a heading that says «Πηγές» is the same defect class as the fabricated
trust metrics that were removed from this site.

### The decision

**SOURCES.md is the source of truth. `GuideSource` becomes a reference to a SOURCES id.** I am
recommending this rather than extending `GuideSource` with the missing fields, for three reasons:

1. A claim is cited by more than one article. Extending `GuideSource` duplicates the excerpt and
   the dates per citation, and duplicated evidence drifts — the same failure this repo has already
   had with severity maps and ownership checks.
2. The freshness guard needs **one** place to enumerate. Sixteen records in one file is checkable;
   thirty inline objects across a 2,490-line content file is not.
3. Verification is editorial work with its own cadence. It belongs in a reviewable document, not
   interleaved with copy.

Target shape — **not implemented in this run**, because it is outside this task's file boundary and
would rewrite content the goal explicitly says is not mine to rewrite:

```ts
export type GuideSource =
    | { id: SourceId }                                  // resolved from SOURCES.md
    | { id: SourceId; label: LocalizedString }          // optional display override
```

### Migration cost, sized

| step | size | notes |
|---|---|---|
| Generate `lib/sources/registry.ts` from SOURCES.md | small | 16 records; a build step or a checked-in generated file with a guard asserting they match. |
| Change the `GuideSource` type and the two render sites | small | One type, plus the guide page's sources block and its JSON-LD emitter. |
| **Re-verify and re-cite the 12 existing articles** | **large — the real cost** | 30 bare-origin citations across 12 articles, each needing a primary source found, fetched, quoted and dated. On this run's observed rate that is the dominant effort, and the ΑΑΔΕ 403 and et.gr blockers apply to it too. Several of those articles make ΕΝΦΙΑ, fine-amount and tax-threshold claims that are exactly the volatile kind. |
| Retire `GuideSource.url` | trivial | After the above. |

### Recorded as a queue item, not silently absorbed

> **GB-04 — `GuideSource` citation debt.** 12 existing `/guides` articles carry 30 citations, all
> bare origins, with no excerpt and no expiry, rendered publicly under «Πηγές» and emitted into
> Article/FAQPage JSON-LD. Migrate `GuideSource` to a SOURCES id reference and re-verify all 30.
> **Not in GROWTH-HOOKS-01's scope** — recorded here so it is not lost. Until it is done, the
> `sources-freshness` guard carries them as an explicit, enumerated debt list that can only shrink.

---

## Guard

`tests/unit/sources-freshness.test.ts` enforces this file. It:

- parses every `SRC-###` record here and fails on a malformed or missing field;
- fails when any record's `reverify_after` has passed;
- fails when a `SRC-###` referenced anywhere in rendered content does not resolve to a record here;
- enumerates **every** citation in the whole `/guides` corpus from the filesystem — not the ten
  hooks, not a hand-written list — and fails when a citation is a bare origin, except for the
  enumerated legacy set, which is asserted **exactly** so it can only shrink.

Its probe fixture is `tests/unit/fixtures/sources-freshness-probe.md`.
