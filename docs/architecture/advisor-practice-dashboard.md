# The Advisor Practice Dashboard

**Status:** specification · **Date:** 2026-08-04
**Audience:** product, design, engineering, compliance
**Companion documents:**
[life-event-model.md](life-event-model.md) ·
[risk-dna.md](risk-dna.md) ·
[personal-life-timeline.md](personal-life-timeline.md) ·
[life-event-foresight.md](life-event-foresight.md) ·
[agent-b2b-risk-intelligence-audit-2026-08.md](../audits/agent-b2b-risk-intelligence-audit-2026-08.md)

---

## 1. The thesis

> **The unit of work changes from the customer to the change.**

A dashboard whose rows are people is a CRM. It answers "who are my clients?" —
a question an advisor already knows the answer to. Its natural sort key is the
renewal date, because that is the only thing on a customer record that moves on
its own.

A dashboard whose rows are **changes** answers a different question: *what
happened this week that someone needs to hear about?* The renewal date stops
being the organising principle because it is no longer the only moving part —
life events, risk transitions, score movements and predicted milestones all move,
and most of them matter more.

This is not a re-skin. It inverts the primary object, and everything downstream —
ranking, navigation, notification, the metrics we judge it by — follows from that
inversion.

The August audit put the current state precisely: *"a well-fenced insurance CRM
with per-policy AI attached, not yet a Risk Intelligence Platform."* This
specification is the shape of the second thing.

---

## 2. What exists today

Honest inventory, because roughly half the inputs are unbuilt and a plan that
pretends otherwise cannot be scheduled.

| Input | Status |
|---|---|
| Customer relationships, consent, per-policy grants | ✅ mature — `agent-visibility.ts`, `agent-consent.ts` |
| Opportunity records and scoring | ✅ exists — but see §2.1 |
| Advisor playbooks | ✅ exists — `generatePlaybook` |
| Risk assessments per client | ✅ live, unstored |
| **Life events** | ❌ specified, not built — `lifeEvents` is a `Json?` column nothing reads |
| **Protection score history** | ❌ absent — F-08, blocked. **"Score changes" cannot be shown today** |
| **Predicted milestones** | ❌ specified, not built |
| **Timeline / causality** | ❌ specified, not built |
| Production opportunity volume | ⚠️ **zero** — the pipeline code has never been exercised by real data |

### 2.1 The current opportunity score ranks the wrong things

```
score = severity×0.4 + profileCompleteness×0.2 + engagement×0.2 + recency×0.2
```

Two problems, both structural rather than tuning:

- **`profileCompleteness` at 20%** measures how complete *our data* is. It is a
  data-quality metric occupying a fifth of a prioritisation weight, so a client we
  know little about is deprioritised *because* we know little about them — the
  exact inverse of where advisory attention belongs.
- **Nothing measures how much the client would gain.** Severity says how bad the
  finding is; it does not say how much protection is recoverable, which is the
  only quantity that makes one conversation worth more than another.

§3 replaces it.

---

## 3. Advisory Impact — the ranking function

```
Impact = ProtectionDelta × Confidence × Timeliness × Reachability
```

Multiplicative on purpose: **any factor at zero makes the row worthless.** A
huge gap on a client who has not consented is not a lead, it is an
impossibility, and an additive model would keep floating it to the top.

| Factor | Range | Source | Meaning |
|---|---|---|---|
| **ProtectionDelta** | 0–100 | Risk DNA / assessment | Points of protection recoverable if this is acted on |
| **Confidence** | 0.3–1.0 | Engine confidence (weakest link) | How sure we are the finding is real |
| **Timeliness** | 0.2–1.5 | Life-event window, decayed | Is a window open — and is it *pre*-event? |
| **Reachability** | 0–1.0 | Consent + engagement + contactability | Can this advisor actually act? |

### 3.1 ProtectionDelta, not premium

The July audit found `prioritizeRecommendations` ranking by `estimatedCostEur`
under the comment *"higher estimated cost = higher priority (bigger gap)"*.
Premium is not exposure — often it runs the other way, because liability cover is
cheap precisely because claims are rare and the loss it stands between you and is
the kind that ends a household.

The same discipline applies one layer up. **Ranking advisor work by commission
would reproduce the product-first defect at the practice layer**, where it would
be much harder to see and much more damaging.

`ProtectionDelta` is computed from the assessment: the weighted severity of open
`essential` findings, discounted for `discretionary` ones, expressed as
recoverable protection points.

### 3.2 Commercial value is shown, never sorted

Advisors run businesses, and a specification that pretends otherwise gets
ignored in practice rather than argued with.

So: **estimated annual value is a visible column on every row.** It is never the
default sort. An advisor may explicitly sort by it, and when they do the header
says what they have done — *"sorted by value, not by client need"* — because the
switch should be a decision rather than a drift.

This is the honest position. Hiding the number would be paternalistic; defaulting
to it would make the product a lead-gen tool with a risk engine attached.

### 3.3 Timeliness can exceed 1

The only factor allowed above 1.0, because **pre-event advice is categorically
more valuable than post-event advice**. Before a mortgage completes, the cover can
be arranged properly and priced properly. Two months after, the bank has already
assigned a policy and the conversation is remedial.

| Window state | Multiplier |
|---|---|
| Predicted, pre-event, high confidence | **1.5** |
| Event window open, < 30 days old | 1.2 |
| Event window open, 30–90 days | 1.0 |
| Window closed, finding still open | 0.6 |
| No window — a standing finding | 0.4 |

The decay is the discipline: a finding that has sat open for a year is real, and
it is not *news*, and a dashboard that keeps presenting it as news trains the
advisor to ignore the dashboard.

### 3.4 Reachability is a gate, not a modifier

| Consent state | Reachability |
|---|---|
| Consented, engaged in 90 days | 1.0 |
| Consented, dormant | 0.7 |
| Consented, contact bounced | 0.3 |
| **Phantom / unconsented** | **0.0** — never in the feed as a client row |
| Relationship terminated | 0.0 |

An unconsented client cannot appear as an actionable row. They may only appear in
an aggregate ("3 clients have new findings — invite them to connect"), which is
§8's boundary.

---

## 4. One feed, seven lenses

The brief names seven dashboards. **Seven dashboards on a phone is a menu, and a
menu is what an advisor closes.**

The advisor's real context is thirty seconds between appointments, on a phone,
answering one question: *who do I call today?* So: **one ranked feed**, with the
seven as lenses over it rather than destinations.

| Lens | What it filters to | Available |
|---|---|---|
| **Today** *(default)* | Top Impact across everything | Phase 1 |
| **Life events** | Rows anchored on a declared event | needs event model |
| **Rising risk** | ProtectionDelta increased since last view | needs score history |
| **Score changes** | Movement ≥5 points | needs score history |
| **Milestones** | Scheduled certainties — renewals, maturities, birthdays | Phase 1 |
| **Opportunities** | Impact × value, both shown | Phase 1 |
| **Newly underinsured** | Exposure rose or cover fell | partial |
| **Entering a life stage** | Predicted events, pre-event window | needs foresight |

Lenses are **filters over one ranked list**, never separate queries with
separate rankings. Two screens that rank the same book differently is how an
advisor learns to distrust both.

### 4.1 The row is a change, not a person

```
┌────────────────────────────────────┐
│ ● Μαρία Κ.              πριν 2 ημ. │   ← the CHANGE leads
│   Γεννήθηκε το πρώτο της παιδί     │
│                                    │
│   Νέος κίνδυνος: απώλεια           │
│   εισοδήματος · Κρίσιμη            │
│   Προστασία: 74 → 51  ▼23          │
│                                    │
│   ╭──────────╮ ╭─────────────────╮ │
│   │ Κλήση    │ │ Δείτε το προφίλ │ │
│   ╰──────────╯ ╰─────────────────╯ │
└────────────────────────────────────┘
```

The client's name is present because an advisor needs to know who to call — but
**the headline is what changed**, and the score movement is the second line. On a
CRM row the name is the subject; here it is the address.

---

## 5. Mobile-first UX

Designed for a phone held one-handed in a corridor.

### 5.1 The feed at 320px

```
┌──────────────────────────────────┐
│  Σήμερα                    [≡]   │  sticky, min-h-11
│  8 πελάτες χρειάζονται προσοχή   │
├──────────────────────────────────┤
│ ⟨ Σήμερα · Γεγονότα · Ορόσημα ⟩  │  scrollable lens chips
├──────────────────────────────────┤
│                                  │
│  [ change card ]                 │
│  [ change card ]                 │
│  [ change card ]                 │
│                                  │
│  ── Χαμηλότερη προτεραιότητα ──  │  fold: everything below is optional
│                                  │
└──────────────────────────────────┘
```

Rules that make it usable in thirty seconds:

- **At most 3 high-impact rows above the fold.** A feed of forty is a backlog,
  and a backlog is not a priority list. Everything else sits under an explicit
  divider that says so.
- **Two actions per row, maximum.** Call and open. Everything else lives in the
  client profile.
- **Call is one tap** — `tel:` where consented, no intermediate screen.
- **A row can be dismissed** with a reason (`not now` / `not relevant` /
  `handled elsewhere`). Dismissals feed §10 — an advisor dismissing a lens
  consistently is telling us the ranking is wrong.
- **Lens chips scroll horizontally**, never wrap — the pattern already validated
  in the risk panel, where six chips wrap to four lines at 320px and push content
  below the fold.
- **44px minimum targets** (`min-h-11`), matching the WCAG 2.5.8 floor already
  enforced in `globals.css`.

### 5.2 Responsive

| Width | Layout |
|---|---|
| **320–399** | Single column. 3 rows above fold. Two actions per row. |
| **400–639** | Same structure, score delta moves inline with the headline. |
| **640–1023** | Two-column card grid; lens chips become a row of buttons. |
| **1024+** | Feed left (max 560px) + sticky client preview right. Selecting a row fills the preview instead of navigating — the desktop advantage is *not leaving the queue*. |
| **1280+** | Adds a book-level summary strip above the feed. |

Structure changes only at 1024. Below that it is one column at different scales.

### 5.3 What the desktop gets that the phone does not

Deliberately, so the phone stays fast: bulk actions across selected rows,
book-level analytics, the full timeline, and export. None of these belong in a
corridor.

---

## 6. Book-level summary

Above the feed at `≥1024`, collapsed to a single line on mobile.

```
Το βιβλίο σας          142 πελάτες
Μέση προστασία         68  ▲2 τον μήνα
Χρειάζονται προσοχή    8
Κλειστά αυτόν τον μήνα 12 ευρήματα
```

**"Findings closed" is the headline practice metric, not premium written.** It
is the one number that means the advisor improved someone's position, and it is
what an advisory practice should be measured by. Premium appears in the
commercial view, which is a different screen for a different question.

---

## 7. Sorting, and what replaces the renewal date

Renewal date does not disappear — it becomes a **milestone lens**, which is where
it belongs. A renewal is a scheduled certainty (foresight T1), and those are
genuinely valuable. What changes is that it stops being the *organising
principle* for the whole practice.

Default sort: **Advisory Impact**, descending.

Available sorts, each stating what it does when selected:

| Sort | Header says |
|---|---|
| Impact *(default)* | "Ranked by how much you could improve" |
| Recency | "Most recent changes first" |
| Value | "Sorted by value, not by client need" |
| Renewal date | "Sorted by date, not by need" |

The last two are honest labels, not warnings. An advisor working a renewal batch
has a legitimate reason; the label just means nobody drifts into it.

---

## 8. Privacy — the hard constraints

A feed of clients' life events is the most sensitive screen this product could
build. These are gates, not guidance.

### 8.1 Sensitive events never appear

The Life Event Model classifies bereavement, diagnosis, divorce and job loss as
`sensitive` or `special_category`. **None may ever appear in an advisor feed**,
at any confidence, under any lens.

A bereaved client must not surface as an opportunity. This is not a tuning
question — a product that routes grief into a sales queue has made a category
error no ranking function can correct.

Where a suppressed event exists, the advisor sees nothing. Not a redacted row —
a redacted row leaks the fact that something happened, which is most of the
disclosure.

### 8.2 Consent gates the row, and the identity within it

The existing framework already enforces this and must not be bypassed by
aggregate queries:

- `agentMaySeeCustomerIdentity` — unconsented clients appear only in counts.
- `getGrantedPolicyIds` — per-policy grants bound what the row may quote.
- A phantom customer never generates a feed row.

### 8.3 The client controls advisor visibility of their own life

A client may share a life event with their advisor, or not, **per event** — and
the default for a newly declared event is **not shared**. An advisor's usefulness
depends on knowing; the client's trust depends on choosing. Defaulting to shared
would trade the second for the first, permanently, and invisibly.

### 8.4 Predictions are held to a higher bar than findings

From the foresight architecture: a prediction may reach an advisor only when
confidence is `medium` or better, never on a base rate alone, and only where
`timing = pre_event`. **A base-rate prospecting list — "clients turning 31 this
quarter" — is explicitly out of scope.** That is a marketing segment, and
shipping it here would launder one as advisory intelligence.

---

## 9. Cold start

Production holds **zero opportunities**, and four of the seven lenses depend on
systems that do not exist. The dashboard must be useful on day one and degrade
honestly, not display empty frames.

| Lens | With no data |
|---|---|
| Today | Falls back to open essential findings ranked by Impact — **available now** |
| Milestones | Renewals and policy expiry — **available now** |
| Opportunities | Existing gap-derived opportunities — available, thin |
| Life events / Score changes / Rising risk / Life stage | **Hidden entirely** until their source ships |

**A lens with no source is not shown as an empty state.** An empty tab reads as
"you have nothing to do", which is a false and demotivating claim; a hidden tab
reads as "not yet", which is true.

The first-run state names the gap plainly: *"Life events will appear here once
your clients start sharing them"* — with the action that makes it happen.

---

## 10. How we will know it worked

The feature's thesis is falsifiable, so it should be measured against the CRM it
replaces rather than against itself.

| Metric | Why |
|---|---|
| **Findings closed per advisor per month** | The practice metric. Did clients end up better protected? |
| Median time from change → advisor contact | The whole value of a window |
| Feed rows actioned vs dismissed | Ranking quality |
| **Dismissal reasons by lens** | The clearest signal a lens is wrong — an advisor dismissing "rising risk" repeatedly is telling us something the ranking cannot see |
| Score movement across the book | The outcome, at portfolio level |
| Client-initiated contact after a shared event | Whether transparency helps or unsettles |

Deliberately **not** primary: premium written, conversion rate, contact volume.
They are real business metrics and they belong on a commercial dashboard; making
them the success measure here would re-sort the product back toward the thing this
specification exists to move away from.

---

## 11. Data model and query shape

No new scoring store. Impact is derived on read from what already exists plus the
new sources as they land.

```
advisor_feed_rows            -- materialised per advisor, refreshed on change
  advisor_user_id, subject_user_id,
  change_kind,               -- life_event | risk_change | score_change
                             -- | milestone | prediction | finding
  change_ref,                -- polymorphic
  occurred_at, surfaced_at,
  protection_delta, confidence, timeliness, reachability,
  impact,                    -- the product, stored for sorting
  estimated_value_eur,       -- displayed, never the default sort
  visibility_state,          -- consented | aggregate_only | suppressed
  dismissed_at, dismiss_reason
  INDEX (advisor_user_id, impact DESC), (advisor_user_id, change_kind)
```

Three notes:

- **Materialised, not computed per request.** Impact spans the assessment, event
  windows and consent state across a whole book; computing it per page load is a
  fan-out per client per render.
- **`visibility_state` is resolved at write time**, so a suppressed event can
  never reach the read path by accident. Filtering at render is one refactor away
  from a leak.
- **Rows are per (advisor, change)**, not per client. Two advisors on one
  household get independent rows with independent consent — which the existing
  relationship model already assumes.

---

## 12. Delivery

| Phase | Ships | Depends on |
|---|---|---|
| **1** | Feed shell, Impact ranking over existing findings, Today + Milestones + Opportunities lenses, mobile layout | Nothing new |
| **2** | Replace the 40/20/20/20 opportunity score with Impact; retire `profileCompleteness` as a weight | Phase 1 |
| **3** | Life events lens + per-event client sharing controls | Life Event Model |
| **4** | Score changes + Rising risk lenses | `ProtectionScoreHistory` (F-08) |
| **5** | Life-stage lens | Foresight T1–T2 |
| **6** | Desktop two-pane, bulk actions, book analytics | Phase 1 |

**Phase 1 is shippable against today's data** and already delivers the thesis:
the rows are changes, and they are ranked by how much the advisor could improve
someone's position rather than by when a policy happens to expire.

---

## 13. Non-goals and open questions

**Non-goals.** A CRM. Lead generation. Cold prospecting. Ranking by commission.
Surfacing suppressed events in any form. Predicting for advisors what a client
has not agreed to share. Replacing the client profile — the feed points at it.

**Open, and genuinely undecided:**

1. **Is per-event sharing too granular?** Per-event control is the most
   respectful default and may produce so much friction that clients share nothing,
   which helps nobody. A per-category default with per-event override is the
   likely compromise, and it is untested.
2. **What does an advisor see when a client dismisses a finding?** The advisor may
   still believe it matters. Hiding it wastes expertise; showing it overrides the
   client's stated view.
3. **Does `ProtectionDelta` survive contact with commercial reality?** An advisor
   paid on commission working an impact-ranked queue may simply re-sort to value
   every morning. If that is what happens, the honest response is to learn from it,
   not to remove the sort.
4. **How is a household modelled in the feed?** Two spouses with separate profiles
   and one advisor produce two rows for one conversation.
5. **Should dismissals be visible to the client?** The timeline records what the
   product did; an advisor's triage is arguably their working note, not the
   client's record.
6. **Is "findings closed" gameable?** Any metric an advisor is judged on will be
   optimised. A finding closed by a policy that does not fit is worse than one left
   open, and the metric cannot currently tell the difference.
