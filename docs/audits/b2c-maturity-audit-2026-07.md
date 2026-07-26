# B2C insurance-maturity audit — the professional's walk (July 2026)

External-auditor review preparing the B2C surface for presentation to an insurer
/ broker network / executive committee. Each page is read through six lenses —
**senior intermediary, executive, underwriter, claims manager, compliance
officer, experienced policyholder** — against the seven maturity questions:

1. Where did the information come from? 2. When was it last updated? 3. Are
policy facts separated from platform insights? 4. Are limitations handled
professionally? 5. Would an intermediary show this to a client? 6. Would an
executive believe the team understands the lifecycle? 7. Calm confidence, not
excitement or fear?

Scope: B2C only. `/renewals`, `/opportunities`, `/customers`, `/commissions`,
`/insights`, `/team`, `/questionnaires` are **agent (B2B)** surfaces (role-gated)
and out of scope. Verdicts are grounded in the code, not a browser walk.

Legend: ✅ meets the bar · ◑ adequate, upside noted · ➕ improved this program.

---

## /wallet — the policy portfolio

| Q | Verdict |
|---|---|
| 1 Source | ✅ each row is an uploaded policy; fields are extracted, status computed |
| 2 Freshness | ◑ rows carry `updatedAt`; no portfolio-wide "last updated" banner |
| 3 Fact/insight | ✅ the list shows facts (insurer, type, dates, status); no insight blended in |
| 4 Limitations | ✅ status pipeline distinguishes analyzed/processing/failed |
| 5 Intermediary | ✅ clean, un-forked responsive tree; presentable |
| 6 Lifecycle | ✅ status vocabulary (active/expiring/expired/lapsed/cancelled) is correct |
| 7 Tone | ✅ neutral |

**Mature.** Upside (not a defect): a portfolio-level "as of" line.

## /wallet/[id] — the policy detail (flagship)

| Q | Verdict |
|---|---|
| 1 Source | ✅ **best-in-class** — `SourceSnippetBox` renders the verbatim document text + page number behind extracted dates; AI answers footnoted "may not be 100% accurate; the policy is authoritative" |
| 2 Freshness | ➕ the analysis "last check" is now Athens-pinned **date + time** (`formatDateTime`), consistent with every other stamp (was a raw browser-zone date) |
| 3 Fact/insight | ✅ extracted values carry provenance; editorial renewal notes are visibly hedged and separated; the ACORD-verified badge marks extraction, not judgement |
| 4 Limitations | ✅ failed/partial analysis routes through `resolveErrorMessage` → mapped professional bilingual copy (token-limit, timeout, schema, document, auth, service-unavailable), never a raw code or stack trace; generic fallback |
| 5 Intermediary | ✅ coverage cards per branch with 13 contextual `GlossaryHint`s; a broker could screen-share this |
| 6 Lifecycle | ✅ key-dates timeline, renewal status pill, auto-renewal + expiry handling, renewal/lapse explained in place |
| 7 Tone | ✅ calm; the expired notice states consequence + action without alarm |

**The strongest evidence the team understands insurance.** No remaining gap.

## /coverage-insights — score, gaps, recommendations

| Q | Verdict |
|---|---|
| 1 Source | ✅ score is **computed** (methodology `<details>`), gaps carry evidence, recommendations are profile-derived |
| 2 Freshness | ➕ the protection score now carries an "as of" stamp — «Βάσει ανάλυσης της {date}» — fed the latest deep-analysis timestamp, gated so no date is claimed when nothing is analyzed |
| 3 Fact/insight | ✅ three visually distinct blocks: computed score (with methodology+limits+**not-advice**), hedged gaps «πιθανό», labeled recommendations — the AI never outranks the document |
| 4 Limitations | ✅ "Provisional — complete your profile" under 80%; guarded 0-fallback ("unknown score must never read as strong") |
| 5 Intermediary | ✅ the score is defensible and now dated |
| 6 Lifecycle | ✅ gaps framed as coverage-type exposure, priorities qualified as "not a definitive risk assessment" |
| 7 Tone | ✅ neutral; no fear-selling |

**Mature.** The freshness stamp closed the one "is this current?" doubt.

## /help — support + insurance education

| Q | Verdict |
|---|---|
| 1–7 | ✅ rewritten to describe the real product (no fabricated features); now surfaces the 11 insurance guides as searchable cards + the `/lexiko` dictionary — education from within the app |

**Mature (was the weakest surface).**

## /notifications · /tasks · /account (+ billing, referrals) · onboarding · /upgrade · /benefits

- **/notifications** — ✅ typed events, deep links, honest reminder ladder. Mature.
- **/tasks** — ✅ questionnaire delivery carries the health-data privacy note + advisor framing. Mature.
- **/account** — ✅ billing honest by construction (renews-on vs ends-on; app-store cancel routing); referral copy factual. Mature.
- **Onboarding** — ✅ state-aware analysis step ("a few minutes"), no promise/urgency framing. Mature.
- **/upgrade + pricing** — ✅ plan-neutral, fail-closed defaults, no false urgency. Mature.
- **/benefits** — ✅ partner-perks framed as offers, not insurance guarantees. Mature.

---

## What now signals insurance maturity

1. **Provenance over assertion.** Extracted values show the verbatim document
   text + page; the policy document is repeatedly named as authoritative and the
   AI is explicitly subordinate to it. AI conclusions never look more
   authoritative than the policy.
2. **Every authoritative output is dated.** The AI analysis and the protection
   score now carry Athens-pinned "as of" stamps — findings, not timeless
   verdicts.
3. **Facts, interpretations, and recommendations are visually and textually
   separated**, each with the right disclaimer (methodology, hedging, not-advice).
4. **Professional failure handling** — mapped error copy, no raw codes; honest
   empty/incomplete states; "provisional" when data is thin.
5. **Lifecycle fluency** — correct status vocabulary (expiry vs lapse vs
   cancellation), renewal/lapse explained at the point of need.
6. **Consistency** — one date-formatting discipline (Athens-pinned), one
   policy-term standard («ασφαλιστήριο»), one not-advice disclaimer source.

## Trust weaknesses removed (this program, cumulative)

- Score/analysis floating with **no temporal anchor** → dated (this pass).
- A **raw browser-zone timestamp** (off-by-one) on the analysis tab → Athens-pinned.
- **Fabricated help features**, **overpromised email/report language**, and
  **pseudo-certainty** ("85% confidence") on AI estimates → removed in the
  compliance program.
- **Specialist terms unexplained** and **guides hidden as SEO-only** → resolved
  in the literacy program.

## Remaining maturity gaps (honest — enrichment, not prototype tells)

- **Per-field extraction/upload dates** and a **portfolio-level "last updated"**
  on `/wallet` would deepen the freshness story beyond the two flagship outputs.
- **Insurer-side servicing data** (claims phone, servicing office) is thinner
  than an executive might expect — a product-scope decision, not a copy fix.
- **Static-audit boundary**: verdicts are code-grounded, not a rendered-pixel or
  screen-reader walk; a pre-presentation QA pass in a browser is still worth
  doing.

## Verdict

No B2C page reads as a generic document manager or a generic AI wrapper: policy
facts are sourced and dated, insights are labelled and subordinate to the
document, failures are handled professionally, and the lifecycle vocabulary is
correct throughout. The remaining items are enrichment an executive would file
as roadmap, not the prototype tells the audit was hunting for.
