# Legal review queue

*Per the standing rule: `/privacy`, `/terms`, `/cookies`, `/subprocessors` are
never edited by the design/marketing workstream. Anything that needs their
text to change is DRAFTED here and waits for counsel. Items carry the date
they entered the queue and what they block.*

## 1. Terms §3 — consent qualification for the /trust pledge (2026-08-30, carries D2 of the marketing run)

**Blocks:** releasing `/solutions/partners` + `/solutions/synergates` from
noindex (A-04); any embedded-deployment conversation that references the pledge.

**Problem:** the /trust pledge is absolute — «Δεν πουλάμε, δεν μοιραζόμαστε
και δεν διαβιβάζουμε δεδομένα … σε ασφαλιστικές εταιρείες, τράπεζες ή τρίτα
ασφαλιστικά πρακτορεία» — and cites Terms §3 as its backing. A consented
embedded deployment inside a bank's app cannot coexist with an unqualified
never-transfer pledge, even when every actual transfer is consented.

**Draft for counsel (accepted direction, D2):** qualify pledge and Terms §3
with «χωρίς τη ρητή, ανακλητή σας συγκατάθεση» / "without your explicit,
revocable consent". The qualification keeps the promise absolute in the sense
a consumer cares about (nothing moves unless *you* say so) and makes the
consented case describable.

**Status:** with the owner/legal since the marketing run ("in flight").

## 2. IDD / ν.4583/2018 opinion (2026-08-30, carries OQ2)

**Blocks:** the partners pages' release from noindex; any copy that positions
the product inside an intermediary's demands-and-needs process with more
specificity than "structured inputs to *your* process".

**Question for counsel:** confirm that (a) PolicyWallet requires no
intermediary registration for its current activity, and (b) the partners-page
framing — analysis and questions, advice stays the intermediary's — keeps it
that way. The pages as built claim nothing beyond that framing.

## 3. GDPR Article 9 consent wording (2026-08-30, carries OQ4)

**Blocks:** nothing today (the in-product consent flow ships its own reviewed
wording); blocks copying that wording onto marketing surfaces.

**Ask:** if an externally reviewed Art. 9 wording exists, marketing copy
should quote it verbatim rather than paraphrase. Until then marketing states
only: separate, revocable, per-person/per-document consent; no training.

## 4. Standing invariant (no action, recorded so it survives)

The data-location sentence used on marketing surfaces is:
«Αποθήκευση κρυπτογραφημένη στην ΕΕ. Η ανάλυση AI μπορεί να εμπλέκει παρόχους
εκτός ΕΕ με εγκεκριμένες δικλείδες. Κανένας πάροχος δεν εκπαιδεύει μοντέλα στα
έγγραφά σας.» Any legal-page edit that changes this trilogy must ripple to
`TRUST_FACTS` (lib/marketing/positioning.ts), the partners pages, and the FAQ
— they all state it.

## 5. DPO-reviewed wording for the per-document Article 9 gate (2026-08-30, Grafí G12, decision 3)

**Blocks:** nothing today — the in-product gate renders `common.aiConsentBody`
VERBATIM (the product's reviewed account-level wording) on `/add`, records one
revocable `DocumentAiConsent` row per document, and offers per-document
withdrawal on `/me/privacy`.

**Ask:** confirm (or supply) DPO-approved wording specifically for the
PER-DOCUMENT grant and withdrawal framing. Until then the account-level
sentence is reused verbatim and marked `[verify]`; no paraphrase exists
anywhere in the flow.

