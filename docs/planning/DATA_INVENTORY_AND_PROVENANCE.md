# Data inventory depth — richer facts, provable risk, smaller register

**Date:** 2026-09-07 · **Status:** proposal, nothing implemented
**Codebase:** commit `873eba6`
**Companion:** [docs/compliance/DATA_PROTECTION_REVIEW_PACK.md](../compliance/DATA_PROTECTION_REVIEW_PACK.md)
**Builds on:** [PERSONAL_RISK_PROFILE.md](PERSONAL_RISK_PROFILE.md) (Layers 1–4, the evidence ladder), [INSURED_VALUE_ADEQUACY.md](INSURED_VALUE_ADEQUACY.md) (the `value_drift` reference implementation)

---

## The thesis

The four goals — richer information, accurate risk analysis, proposals built on real
data, a smaller GDPR open-items register — look like they trade against each other.
Normally they do: more data means more exposure, a bigger DPIA and a worse minimisation
story.

They do not trade here, because the system is currently at the **worst point on both
axes at once**: it transmits the *most* data it could (every page of every policy) and
retains the *least* structure it could (a flat extraction whose confidence and citations
cover nine identity fields and none of the fields the rules actually read).

Moving off that point improves both axes together. **Richness comes from provenance and
structure over data already held, not from collecting more.** Every wave below either
leaves collection unchanged or reduces it.

One thing this plan does **not** fix, stated up front: it does not answer the transfer
question (register §14.1). No EU endpoint pinning and no zero-retention setting are code
changes this plan makes. What it does is **shrink what is at stake** in that question —
from every page of a health policy to a bounded, structured extract.

---

## Part 1 — Diagnosis

Three structural defects. Each is evidenced, not asserted.

### D1 — The document is read twice, and the cheap local read is thrown away

`lib/ingestion/pdf-probe.ts` (the `unpdf` build of pdf.js) opens every upload locally,
reads the page count and the text of the first 12 pages in ~100 ms, and — in its own
words — *"with no bytes leaving the boundary"*. The document gate uses that text to
classify the upload.

Then the text is discarded. `toValidatedAIDocument(verdict, **bytes**, mime)` rebuilds
the AI document from the raw file, and the whole PDF is base64'd to the provider.

Two consequences, one privacy and one accuracy:

- We transmit every page — including pages we never extract or display — when a bounded
  text extract already exists at that exact moment in the request.
- The extraction has **no local ground truth to check itself against**. Whatever the
  model returns is what we store. Nothing can contradict it.

### D2 — Personal facts have provenance; document facts do not

The asymmetry is stark, and it runs the wrong way round.

| | Personal facts (what the person says) | Document facts (what the policy says) |
|---|---|---|
| Provenance | `factProvenance` — `{source, precision, at}` per column | none |
| Confidence | 6-level ladder (`lib/protection/evidence.ts`) | `extraction.confidence` over **9 fields** |
| Write precedence | `applyFactWrites` — exact beats coarse, never the reverse | last write wins |
| Citation to source | n/a | `EXTRACTION_CITATIONS`, **flag-gated OFF**, same 9 fields |

The nine fields carrying confidence and (potentially) citations are
`insurerName`, `policyNumber`, `lineOfBusiness`, `startDate`, `endDate`,
`premiumAmount`, `issueDate`, `premiumFrequency`, `renewalDate` — identity, dates and
price.

**Not one field the gap rules read is among them.** `property.earthquakeCoverageIncluded`,
`vehicle.insuredValue`, `health.annualLimit`, `property.estimatedRebuildCost` — every
figure a finding quotes and every boolean a rule fires on carries no confidence, no page,
no snippet.

This is what undermines the house rule that **unknown is not absence**. The
`is_false` / `all_false` operators correctly require an explicit `false` rather than
treating silence as evidence. But nothing distinguishes *"the schedule prints «Σεισμός:
Όχι»"* from *"the model returned false because it did not find the word"*. The rule is
right; the data cannot honour it.

It also means `policy_verified` — the second-strongest rung on the evidence ladder,
ranked **above** what the person told us — is asserted from an unaudited model read of a
PDF.

### D3 — The schema is inconsistent about third-party data, and holds names no rule uses

`AcordData.insuredPersons` states the principle explicitly:

> *Roles and counts only — never the names printed in the schedule. Fidelity and crew
> schedules list real people; PolicyWallet has no basis to ingest a third party's name.*

Two sibling fields do the opposite:

- `vehicle.namedDrivers: [{ name, licenseNumber }]` — third-party names **and licence numbers**
- `lifeAndInvestment.beneficiaries: string[]` — beneficiary names

And the rule that consumes beneficiaries, `no_beneficiaries_recorded`, uses `all_missing`
— it asks only whether *anything* was recorded. **It needs a count, not the names.**

So we hold third-party identifiers that no rule reads, contradicting the schema's own
stated principle, while §10.2 of the compliance pack withholds third-party names from
subject-access exports under Art. 15(4). Richness and minimisation point the same way
here: the analytical value is in the count and the role, and that is also the safer thing
to store.

---

## Part 2 — The plan

Five waves. Each states what changes, what it buys against the four goals, and which
register items it moves.

### Wave 0 — Carry the local text forward *(the keystone)*

**Change.** Keep what the probe already read. Thread the per-page text from
`PdfProbeResult` through the gate verdict into `ValidatedAIDocument`, and make the
extraction contract text-first:

- **Text-native PDFs (the majority)** — send the extracted text of the relevant pages,
  not the file. The model reads text either way; it does not need the raster.
- **Scans / image-only** — unchanged: the image is still required. The probe already
  detects these (`imageOnly`, `IMAGE_ONLY_TEXT_THRESHOLD`).

**Two honest adjustments this needs.** The probe reads 12 pages against an 8-second
budget because that is all *classification* needs; extraction needs more, so it wants its
own page cap and budget. And per-page text must be retained rather than the current
single joined string, because Wave 1 needs page numbers.

**Buys.** Transmitted payload falls from every page to a bounded extract — the pages that
are never extracted or displayed (medical annexes, beneficiary schedules, ΑΜΚΑ) stop
leaving the boundary at all. Token cost falls with it. And the extraction gains a **local
copy of the source**, which is the precondition for Wave 1.

**Register.** §7 narrows sharply. §15.7 becomes answerable rather than open. §14.1's
*consequence* shrinks — though not the transfer question itself.

### Wave 1 — Provenance on document facts, verified rather than trusted

**Change.** Turn `EXTRACTION_CITATIONS` on, and extend `CITATION_FIELDS` from the nine
identity fields to **the fields the rules read** — the coverage booleans, the limits, the
sums insured.

Then do the thing the local text makes possible: **verify the citation.** If the model
returns `earthquakeCoverageIncluded: false` with snippet *«Σεισμός: Δεν καλύπτεται»*,
check that the snippet actually occurs in the locally-extracted text. A citation that
does not match is a hallucination detectable **deterministically, at zero model cost**.

This is the same move the codebase already makes elsewhere: `summaryLanguage` is
*detected from the returned text, never assumed from the request*.

**Buys.** Goal 2 directly. Every stored coverage fact gains `{page, snippet, verified}`.
`policy_verified` stops being an assertion and becomes evidence a reviewer can follow to
a page number.

**Note the rollout constraint the code already flags:** citations change the extraction
contract on the money path. Staged, Gemini-first, is right.

### Wave 2 — Evidence-gated rules: make "unknown is not absence" provable

**Change.** Extend the evidence ladder to document facts by splitting today's single
`policy_verified` into three states a rule can see:

| State | Meaning |
|---|---|
| `policy_verified` | cited, and the snippet was found in the local text |
| `policy_asserted` | the model returned a value with no citation, or one that did not verify |
| `policy_silent` | the field was absent from the extraction |

Then let a `GapDefinition` declare the evidence floor it needs. A rule that fires a
**gap** on an explicit `false` requires `policy_verified`; on `policy_asserted` it
degrades to **review** rather than firing, and on `policy_silent` it produces the
`missing`-operator wording (*"not recorded"*, never *"not covered"*).

`lowestEvidence()` already exists for exactly this composition.

**Buys.** The distinction between *"your policy excludes earthquake"* and *"we could not
confirm earthquake cover"* becomes structural instead of editorial. Findings stop being
able to overclaim — which is the same principle as `scoreSupport()` and
`all-clear-honesty`, applied to the document side.

**Guard.** Same pattern as the existing ones: enumerate the catalogue from the
filesystem, fail on a rule that fires a gap without declaring an evidence floor, and ship
a probe fixture proven to turn it red.

### Wave 3 — Needs against cover, with provenance on both sides

`PERSONAL_RISK_PROFILE.md` §I records the hole: *"no rule reads a limit against a need."*
`value_drift` is the reference implementation for comparing two figures — but both of its
operands come from the document.

**Change.** Add a comparison whose operands come from **different layers**: cover from a
cited document fact (Wave 1), need from a Layer 1 profile fact with its own evidence
level. The obvious first pair: `lifeAndInvestment.deathBenefit` against a need derived
from `annualIncome` × `incomeDependency` × dependants.

**The rule that keeps this honest:** a comparison is publishable only when **both** sides
carry evidence, and the finding states the weaker of the two. A death-benefit shortfall
computed against an *inferred* income is a question to ask, not a gap to declare.
`lowestEvidence()` decides which it is. Provenance carries the computed figure, not just
the operands — the existing `rule_inputs` convention.

**Buys.** Goal 3. A proposal can say *"your cover is €50,000; the schedule states it on
page 2; the need we computed is €180,000, from the income you gave us in March"* — every
number traceable to a source and a date.

### Wave 4 — The inventory as a generated artifact, not a written one

**Change.** Annotate the Prisma schema with machine-readable tags per column — purpose,
lawful basis, Art. 9 flag, retention class, export scope, erasure treatment — and
**generate** the Art. 30 record from the schema.

This is the repository's own rule applied to the data inventory: *guards must enumerate,
not assume*. `erasure-covers-personal-data.test.ts` already derives its universe from the
schema and fails on any store lacking an erasure or a documented exemption. The same
mechanism gives an Art. 30 record that cannot drift from the database, and a CI failure
when a new column lands untagged.

**Buys.** Goal 4, structurally. §14.2 moves from *"no Art. 30 record exists"* to *"it is
generated from the schema and guarded"*. The DPIA gains real inputs: a per-column purpose
and basis map is most of what one needs.

**Honest limit:** this produces the ROPA and the DPIA's *inputs*. It does not write the
DPIA, which is a legal assessment.

### Wave 5 — Minimisation pass on D3

**Change.** Apply the `insuredPersons` principle to its siblings:

- `namedDrivers` → count, plus the flags cover actually turns on (named-driver
  restriction, age band). Drop names and licence numbers, or hold them only where a rule
  demonstrably reads them.
- `beneficiaries` → count and relationship class. `no_beneficiaries_recorded` reads
  `all_missing`; a count satisfies it exactly.

**Buys.** Less third-party personal data with no analytical loss, a smaller Art. 15(4)
surface, and a schema consistent with the principle it already states. Needs a migration
plan for rows already carrying names.

---

## Part 3 — What this does to the open-items register

| Item | Today | After | Wave |
|---|---|---|---|
| §7 whole-document transmission | Every page, incl. never-displayed ones | Bounded text extract; image only for scans | 0 |
| §14.1 AI transfer exposure | Complete Art. 9 documents to a global endpoint | **Endpoint question unchanged**; payload much smaller | 0 (partial) |
| §14.2 No Art. 30 record | Does not exist | Generated from schema, CI-guarded | 4 |
| §14.2 No DPIA | No inputs | Inputs generated; assessment still legal work | 4 (partial) |
| §15.7 Redaction question | Open | Answered by implementation | 0 |
| §10.2 Art. 15(4) third-party names | Withheld at export, stored in `AcordData` | Largely not stored | 5 |
| Art. 5(1)(c) minimisation posture | Asserted | Demonstrable per column | 4, 5 |

**Unmoved, and not addressable by any data-model change:** §14.1's core (no EU pinning,
no zero-retention), §14.3 agent-attested consent, §14.4 MFA, §14.5 single-operator DSR,
§14.6 PITR resurrection, §14.7 incident-response runbook. Those are, respectively, an
infrastructure decision, a legal opinion, a feature, a staffing change, an automation, and
a document.

## Part 4 — Sequencing

Wave 0 is the keystone and unblocks 1–3. Wave 4 is independent and can run in parallel;
it is also the cheapest thing here relative to what it closes.

```
W0 carry text ──┬── W1 verified citations ── W2 evidence-gated rules ── W3 needs vs cover
                │
W4 schema tags ─┴── (independent, parallel)        W5 minimisation (independent)
```

Suggested order by value per unit of risk: **W4 → W0 → W1 → W2 → W5 → W3.** W4 first
because it is self-contained, touches no runtime path, and closes a High register item.
W3 last because it depends on everything before it.

## Part 5 — Decisions needed before starting

1. **Scans.** Text-first extraction splits the pipeline in two. Do image-only documents
   keep going as images, or do we OCR locally? (Local OCR keeps bytes in the boundary but
   is a real dependency; sending the image is the status quo.)
2. **Extraction page cap.** 12 pages is a classification sample. What is the right cap and
   time budget for an extraction read — and what happens to a policy whose cover is
   described on page 40?
3. **Citation coverage.** Every rule-read field is the principled answer and costs output
   tokens on every extraction. Start with the fields the *live* catalogue reads?
4. **Existing rows.** Facts extracted before Wave 1 have no citations. Do they become
   `policy_asserted` (honest, and demotes some live findings to review), or are they
   grandfathered?
5. **Wave 5 migration.** Names already stored in `namedDrivers` / `beneficiaries` — drop
   on next analysis, or a one-off backfill?

Question 4 is the one with a visible product consequence: answering it honestly will
move some existing findings from "gap" to "needs review", which is a change users see.
