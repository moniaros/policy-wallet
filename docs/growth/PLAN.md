# PLAN — PW-GROWTH-02

Phase A output, 2026-08-29. The item queue with acceptance criteria, file boundaries, dependency
order, and per-item model and mode assignment.

**Read first:** `CAPABILITIES.md` (what exists), `HOOK_RECONCILIATION.md` (which hooks are live and
where each lands), `PREAPPROVALS.md` (what is still blocked on a human). This file records the
*order of work*; those three record what is *true*.

**Phase B does not start until every `OPEN` item in `PREAPPROVALS.md` carries a decision.**

---

## 0. The finding that reorders everything

The brief reads as a fresh run. **`GROWTH-HOOKS-01` ran on 2026-08-26** and left nine state files,
three adjudicated Track-D proposals, a 42KB `SOURCES.md` (SRC-001…016), a working
`sources-freshness` guard, a built `HookTicker`, and a guide corpus of **15** articles — not 12.

Four hooks the brief lists as CREATE **already have published guides**. Three more were **cut** for
want of a verifiable ΦΕΚ. One (H5) was cut because **its premise is false**. Two capabilities the
brief mandates were **recommended against** by a prior Product-Truth pass — though on grounds that
do not transfer to the new engine-free architecture (see `CAPABILITIES.md`).

Two consequences for sequencing:

1. **Track C (in-app) is unblocked for the first time.** `QUEUE-GROWTH.md` blocked it on the Phase 4
   design system; Phase 4 completed 2026-08-29. §4.3's third deliverable is now buildable.
2. **There is a live correctness defect on a published page**, in the exact article H4 is meant to
   extend. It goes first.

---

## 1. Dependency order

```
Z-01 ─────────────────────────────────► H4
 (fix wrong fine amounts)

G-07 ──► (order of all guide work)
G-03 ──► every new/touched source entry
S-04 ──► H2, H7-guide, C5
D-G03 ─► (independent)

P-00 ─┬─► P-01 (C1) ──► H7 in-app
      ├─► P-03 (C3) ──► H3 in-app
      ├─► P-04 (C4) ──► H12
      ├─► P-02a (C2a) ► H1 in-app
      │   P-02b (C2b) ◄── OPEN-1 (€/τ.μ. source)
      └─► P-05 (C5)  ◄── S-04, and X-01 for H17

M-01 (ticker extension) ─► H10 slot
M-02… per hook, each gated on requires_capability = LIVE
```

---

## 2. The queue

Mode per §0.3. Model per §0.4. **Never escalate mode mid-loop.**

### Item zero

| id | item | mode | model | file boundary |
|---|---|---|---|---|
| **Z-01** | Correct HALT-G04's fine amounts | accept-edits | Fable 5 (copy against a resolved source) | `lib/guides/content.ts` — slug `prostimo-anasfalistou-oximatos` **only**; `tests/unit/`; the Greek copy freeze |

**Do:** €1,000 public-use bus/lorry · €500 passenger and all other · €250 two-wheeler. Basis is
**vehicle class**, not κυβισμός. Reconcile the article's own «Ποια πρόστιμα» section in the same
pass so the page does not contradict itself. Cite SRC-010.

**Do not:** touch any ΑΑΔΕ sentence (D3 leaves HALT-G02 open). Do not restate the cross-check,
δήλωση ακινησίας, or the objection window — all already in the article.

**Acceptance (must fail before):** a guard asserting that slug contains no κυβισμός-based fine
basis and no €150 figure. Demonstrate red on pre-change content, then green.

**Then:** regenerate `tests/fixtures/greek-string-inventory.txt` and review the diff — expect
additions and the corrected figures only, zero deletions from other files.

### Track S — sources

| id | item | mode | model | notes |
|---|---|---|---|---|
| **G-07** | Legacy citation audit (GB-04) | plan | Sonnet 5 | Size the **30 bare-origin citations** across the 12 pre-existing articles. Report the UNRESOLVABLE count **before any new guide ships**. If high, the order of guide work changes — that is the point of running it first. |
| **G-03** | Extend `GuideSource`, do not create | accept-edits (`lib/`, `tests/`) | Fable 5 | `{label,url}` → `+{excerpt, verified_at, reverify_after}`. `SOURCES.md` and `tests/unit/sources-freshness.test.ts` **already exist** — this extends both. Guard stays green on legacy with a reported count, red on new or touched. |
| **D-G03** | The real free-tier 2-vs-3 | accept-edits | Fable 5 | **Not** the policy count — that was fixed. It is `freeUnlockedLimit = 2` (coverage insights) vs `FREE_GAP_PREVIEW_COUNT = 3` (gap report): one promise, two screens. Resolve against the pricing source of truth. **The parity guard must enumerate from the filesystem** — `monetization-config.test.ts:187-222` greps two hardcoded paths, the seventh instance of that shape in this programme. |
| **S-04** | D4's bounded ΦΕΚ retry | plan | Sonnet 5 | ν.2496/1997 and ν.4438/2016 via a responsible-body re-host. **One item, timeboxed.** Record the outcome either way — a failed retrieval is a finding, not a non-event. |

### Track P — capabilities

All avoid `lib/gap-detection.ts` (§2.8). Ordered so a source failure cannot strand the run.

| id | item | mode | model | acceptance (must fail before) |
|---|---|---|---|---|
| **P-00** | `lib/insurance/capability-result.ts` | accept-edits | Opus 5 (architecture) | Types only. `CapabilityResult<T>`, `UndeterminableReason`, `InputProvenance`, D2's `DocumentAnchor`. Written once, imported everywhere, never copied. |
| **P-01** | C1 overlap | accept-edits (`lib/wallet/`, `lib/insurance/`, `components/wallet/`) | Fable 5 | Two health fixtures sharing ≥1 benefit **and** ≥1 unmappable term, where pre-change code produces no overlap report at all. Plus: a coverage present in both but `optional_not_taken` in one is **not** reported as overlap. |
| **P-03** | C3 condition query | accept-edits | Fable 5 | Three fixtures, one per stance, plus one whose section is unreadable — pre-change answers none. **Extends `lib/insurance/policy-conditions.ts`; must not become a second reader of `acordData.conditions`.** |
| **P-04** | C4 valuation basis | accept-edits | Fable 5 | Four fixtures, one per basis, plus one with the clause absent — pre-change surfaces no basis. **Check extractability against real wordings first**; if the extractor never yields a basis, C4 is universally `cannot_determine` and the item halts. |
| **P-02a** | C2a `detectAverageClause` | accept-edits | Fable 5 | A property fixture whose text contains an average clause, where pre-change detects nothing. Fact only — no computation. |
| **P-02b** | C2b `estimateShortfall` | accept-edits | Fable 5 | **BLOCKED on PREAPPROVALS OPEN-1.** Insured capital below the rebuild low bound. Always a range; band and source render beside the number. |
| **P-05** | C5 conformance | plan → accept-edits | Opus 5 | **HALTED** pending S-04. One requirement met, one not, one field unextracted, one source deliberately stale — pre-change evaluates none. |

### Track M — hooks

`HookTicker` **already exists** (`components/growth/HookTicker.tsx`), already shares `useRotation`
with `HeroSlides`. **M-01 is an extension, not a build.** Do not create a second rotator.

Per §4.3 each live hook ships exactly three things: one canonical guide (CREATE or EXTEND per the
register — never a second URL), one landing section or ticker slot, one in-app entry point, with
**one shared component** behind the landing and in-app instances.

| hook | work | gate |
|---|---|---|
| H1, H3 | in-app surface only — guides exist | C2a / C3 LIVE |
| H4 | guide extension | **after Z-01** |
| H5 | new guide, rewritten premise | — |
| H6 | none — guide exists, **no in-app surface can exist** (§4.5 result) | — |
| H7 | in-app only; guide stays cut | C1 LIVE |
| H10 | ticker slot on `/solutions/agents` | — |
| H11 | guide extension | C5 LIVE |
| H12 | new guide + in-app | C4 LIVE |
| H16 | new guide, `en` primary | — |
| H18 | new guide + in-app (`roadside` is a real branch) | — |
| H2, H8, H17 | none — cut or blocked | S-04 / X-01 |

**New public routes must be added to `proxy.ts`.** `/guides` and `/solutions` are already public
*prefixes*, so guides under them need no change — but verify per route rather than assuming.

### Track X

| id | item | notes |
|---|---|---|
| **X-01** | human | H-010: insured-person name **and** cyber/business/pension `AcordData`, one decision. Blocks H17. |
| **X-12** | flag, do not rewrite | `omadiko-symvolaio-ergasias` §«Ποιες καλύψεις **αξίζει να συμπληρώσετε** ατομικά» → advice-compliance audit. Already flagged by G-02; still live. **No H7 work may inherit the framing.** |

---

## 3. Acceptance that applies to every item

- **Falsifiable or labelled.** Every criterion demonstrated red on pre-change code, or labelled
  REGRESSION-GUARD and reported separately (§0.2).
- **Enumerate the universe.** A guard scoped to known locations guards those locations. Seven
  instances of that failure are already recorded in this programme; D-G03's is the seventh.
- **Absence checks must not match their own tombstone.** Verify in the render source and, for
  public surfaces, on the fetched page.
- **Measure with imported definitions**, same both passes, never copied.
- **Adversarial review by a different role instance** than the one that implemented.

**Track M acceptance**, on built output at 320/390/430 in both locales: zero clipped strings · zero
sub-44px targets · 1.4.3 and 1.4.11 clean · `ticker-a11y` green with reduced motion on and off ·
valid JSON-LD · zero unresolved sources · `guides-promise` green · no two register rows on one
canonical URL · Lighthouse a11y and SEO before and after.

---

## 4. Deploy — preview only

An item is done when: CI green · committed to `feat/growth-hooks` · preview deployed · **the preview
URL fetched and asserted on content** · no new Sentry group · every rendered claim matching its
`SOURCES.md` entry · `guides-promise` green on the preview build.

**The preview is SSO-gated.** A `200` after following redirects is Vercel's login page, not the
app — verified 2026-08-29. Content assertion must run through an authenticated browser context or
a protection-bypass token; a status code proves nothing.

**Never merges to `NEW-UI` or `main`. Never deploys to production.** The run exits at a verified
preview URL with the change set and the evidence; the human merges.
