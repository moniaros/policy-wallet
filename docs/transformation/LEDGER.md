# LEDGER — PW-MOBILE-TRANSFORM-01

Nothing is lost without a row (§2.12). Every capability removed, merged or relocated names its
destination, or is marked `DEFERRED` with a named follow-up in `docs/STATUS.md`.

**A capability is something a customer can DO or LEARN on a surface** — an action they can take, a
fact they can read, a destination they can reach. Not a component, not a div. Counted per surface,
because the same capability on two surfaces is two rows: relocating one must not silently delete
the other.

## Running counts

Refreshed at each phase boundary (§10.4).

| | Phase 0 baseline | now |
|---|---|---|
| total capabilities | *in progress — 3 of 20 surfaces enumerated* | — |
| total CTAs | — | — |
| AI entry points | — | — |
| monetization surfaces | — | — |

## Surfaces to enumerate

From `SURFACES.md`: 20 distinct B2C landing surfaces + 7 overlays. In §4.5 priority order:

- [x] Ειδοποιήσεις `/notifications`
- [x] Αρχική `/dashboard`
- [x] Πορτοφόλι `/wallet`
- [x] Ασφαλιστήριο `/wallet/[id]`
- [x] Αναλύσεις `/coverage-insights`
- [x] Σύμβουλος `/agent`
- [x] Ρυθμίσεις `/account` + 5 subpages
- [x] app shell
- [x] upload flow `/wallet/add`, `/wallet/[id]/edit`
- [x] the remaining 7: `/help`, `/help/article/[slug]`, `/benefits`, `/consent/ai`, `/activity`, `/insights/risk-profile`, `/upgrade`
- [x] 7 overlays

---

## Ειδοποιήσεις — `/notifications`

Source: `app/(protected)/notifications/page.tsx`, `actions.ts`, `components/notifications/NotificationsClient.tsx`

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| N-01 | Read the list of notification events | fact | **KEEP** | unchanged | — |
| N-02 | See each event's title and body | fact | **KEEP** | unchanged | — |
| N-03 | See each event's timestamp | fact | **KEEP, reframed** | relative time, absolute on disclosure (§7.5) | P1-04 |
| N-04 | See which CHANNEL delivered it (`Email` / `in_app` chip) | fact | **REMOVE** | none — delivery is not customer-facing information (§2.7) | P1-04 |
| N-05 | See the same event once per channel | — | **REMOVE** | collapsed to one row on the base `dedupeKey` (D-002) | P1-04 |
| N-06 | See read/unread state | fact | **KEEP** | unchanged | — |
| N-07 | Navigate from a row to the thing it is about | action | **KEEP — implemented in the Phase 5 rebuild** | «Προβολή ασφαλιστηρίου» link on every row whose related policy the server verified to still exist and belong to the reader (`actions.ts` nulls the id otherwise), so every rendered destination resolves. Rows about no object render no link — a destination cannot be total over events that have none | P5 notifications rebuild |
| N-08 | Filter by related policy | action | **DEFERRED — was silently absent since the P1-04 rework** | The rebuilt page renders ≤24 rows with per-row policy links; a filter over a one-screen-per-state list was not rebuilt. Follow-up: restore a policy filter if/when the list paginates beyond its 50-row read window. Recorded here because the P1-04 pass dropped it without a ledger row | P5 notifications rebuild |
| N-09 | Read a score change as a notification | fact | **REMOVE** | none — §2.2; the event type itself is deleted at `risk-events.ts:176-190` | P1-01 |
| N-10 | Read English internal prose in a Greek feed | — | **REMOVE** | Greek from the registry, derived not hand-mapped | P1-05 |

**Ledger note on N-04/N-05.** These are the only two rows in this surface that remove something a
customer can currently see, and both are removals of *delivery metadata*, not of events. No event
becomes unreachable: N-05 collapses duplicates of the same event, and any row lacking a
`dedupeKey` renders ungrouped rather than being merged away (§12.2 forbids the heuristic).

**Phase 5 rebuild rows (2026-08-27).**

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| N-11 | Mark ONE notification read by tapping anywhere on its card | action | **KEEP, relocated** | the card was one big `role="button"` WRAPPING the show-more button — invalid ARIA, and the §11 action collector excluded all 20 toggles as `nested-in-command`. Replaced by two explicit per-item paths: the unread indicator is itself a 44×44 native button («Σήμανση ως αναγνωσμένο»), and opening the full message marks the item read. Mark-all unchanged | P5 notifications rebuild |
| N-12 | `NotificationBell` dropdown (unmounted since the shell dropped UserMenu's `compact` branch) | — | **DELETED — dead code, not a capability** | zero importers verified by grep + tsc; its orphaned fetch test deleted with it; guard entries in `clamped-text-reachability` (2 debt rows) and `solid-panel-contrast` (exemption) removed — both ratchets shrank | P5 notifications rebuild |
| N-13 | `NotificationCard` (unmounted legacy renderer; carried the raw `event.channel` chip) | — | **DELETED — dead code, not a capability** | zero importers; `components/notifications/index.ts` + `types.ts` (both dead barrel/type files nothing imported) deleted with it | P5 notifications rebuild |

**Ledger note on N-09.** This removes a whole notification type. Under H-001 option B (score
survives behind a disclosure) the customer could still reach the score in-product, so the
capability "learn my score changed" is DEFERRED rather than deleted, with the follow-up being
whatever H-001 decides. Under options A and C it is deleted outright and correctly so. Recorded as
REMOVE with that dependency stated, so the decision cannot be lost.


---

## Αρχική — `/dashboard`

Source: `app/(protected)/dashboard/PolicyholderHome.tsx` + 14 mounted components.

**Baseline note.** This surface was rebuilt in `dd815b3d` (Goals 0–5) and its capabilities are
enumerated from the CURRENT code, not from the brief, which describes the pre-Goal-0 version.
Verified directly: **6 `section[id]` landmarks** — `overview`, `attention`, `plan`, `coverage`,
`portfolio`, `activity` — and **exactly one `href`** in the whole file (`/wallet/add`). The brief's
"12 sections, nine-plus CTAs, none primary" is not this page.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| D-01 | See portfolio state as a factual composition (counts of total / expired / expiring / never-analysed / failed) | fact | **KEEP** | this is the honest replacement for the old verdict; it is the model for H-001 option C | — |
| D-02 | See the protection score behind a disclosure | fact | **REMOVE** | deleted — H-001 answered C. Replaced by D-01's factual composition, which already ships on this surface | P1-01 |
| D-03 | Read why no score can be shown, when it cannot | fact | **KEEP** | `scoreUnsupportedNothingAnalysed` / `scoreUnsupportedNoCover` — the §2.3 pattern done right | — |
| D-04 | Read the score methodology, its limits, and the not-advice statement | fact | **REMOVE** | goes with D-02 — it exists to qualify a number that will no longer render | P1-01 |
| D-05 | See items needing attention (`AttentionList`) | fact | **KEEP** | gap findings render ONCE here; other locations link to it (§7.5) | — |
| D-06 | See a protection plan with a bounded step count | fact | **KEEP** | already split from findings («3 από 5», not «11 από 22») | — |
| D-07 | See a coverage map by branch (`BranchCoverageMap`) | fact | **KEEP** | — | — |
| D-08 | See the monitoring signals (`ProtectionMonitorCard`) | fact | **KEEP, re-verify** | the «Εντάξει»-over-expired defect was fixed here; `all-clear-honesty` guards it | — |
| D-09 | See portfolio summary and total annual premium | fact | **KEEP** | label already plain («Συνολικό ετήσιο ασφάλιστρο»), not the invented metric | — |
| D-10 | See the renewals timeline | fact | **KEEP, promote** | §7.5 wants renewals above findings — a renewal has a deadline, a gap does not | Phase 2 |
| D-11 | See recent changes (`RecentChangesWidget`) | fact | **KEEP** | must not become a feed of internal system events (§2.8) | — |
| D-12 | Declare a life event (`LifeEventPromptCard`) | action | **KEEP, promote** | §7.5: highest-value input a customer can give; currently below three cards of findings | Phase 2 |
| D-13 | Contact the adviser (`AdvisorSupportRow`) | action | **KEEP** | — | — |
| D-14 | Add the first/next policy | action | **KEEP** | the single primary CTA; keep it single | — |
| D-15 | See an upgrade trigger (`UpgradeTriggerCard`, `CarriedPlanCard`) | action | **KEEP** | monetization surface — counts toward the running total | — |
| D-16 | Review a risk (`RiskReviewCard`) | action | **KEEP** | severity must render via `describeSeverity()` with its caveat | — |

**Monetization surfaces on this page: 2** (`UpgradeTriggerCard`, `CarriedPlanCard`).
**AI entry points: to be counted during baseline** — §7.5 caps the policy detail page at two, and
the dashboard's count has not been measured on current code.

**Nothing on this surface is currently slated for removal** except D-02/D-04, which are contingent
on H-001. That is worth stating plainly: the dashboard is the one B2C surface where Phase 5's job
is mostly reordering (Phase 2 spec), not reduction.


---

## Πορτοφόλι — `/wallet`

Source: `app/(protected)/wallet/page.tsx` → `PolicyWalletClient.tsx` → `PolicyWallet.tsx`,
`StatusSummary.tsx`, `ImportantNotices.tsx`, `PolicyTable.tsx`, `PolicyCard.tsx`.

**This surface faces the largest structural change in the run** — §7.3 makes the insured ASSET the
primary object, with policies nested under it. Every row below must survive that reframe, so this
ledger is the contract for it.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| W-01 | See every policy the customer holds | fact | **KEEP — unchanged** | the asset-first rendering is DEFERRED (D-034): measured 0 duplicate-identity rows on a typical 3-policy wallet, and production holds 2 wallets of 3 and 1 | D-034 |
| W-02 | Identify which policy a row is about | fact | **KEEP, STRENGTHENED** | still the right fix, without the reframe: rows carry the asset identifier (plate/address) so `insurer · line · date · status` stops being the whole identity. Field addition, not restructuring (D-034) | open |
| W-03 | See active / expiring / attention counts | fact | **KEEP** | already derived via `getPolicyStatusView` — expiry-aware and canonical | — |
| W-04 | See the completion ring (active / total) | fact | **KEEP** | renders its own denominator; the only gauge on the screen | — |
| W-05 | See total premium, with three exclusions stated | fact | **KEEP** | unreadable end date / other currency / no amount, each said out loud | — |
| W-06 | Search policies by text | action | **KEEP** | must survive grouping — searching a grouped list is a different query | Phase 5 |
| W-07 | Filter by status | action | **KEEP** | — | Phase 5 |
| W-08 | Toggle grid / list view (persisted) | action | **KEEP or DEFER** | if the asset reframe makes one view redundant, DEFER with a follow-up — do not drop silently | Phase 5 |
| W-09 | See important notices, with show-more | fact | **KEEP, REFRAMED** | §7.5 wants «+8 ακόμη» replaced with something actionable; note it is already an expand toggle, not a dead end | Phase 5 |
| W-10 | Open a policy's detail | action | **KEEP** | — | — |
| W-11 | Add a policy (FAB) | action | **KEEP** | one primary action on the surface | — |
| W-12 | Bulk-upload policies (`BatchUploadModal`) | action | **KEEP** | consent-gated — the extract path must check consent BEFORE reading the body | — |
| W-13 | Delete a policy (`DeletePolicyDialog`) | action | **KEEP** | destructive; must not outrank ordinary actions (§7.5's Σύμβουλος lesson) | Phase 5 |
| W-14 | Compare policies (`PolicyComparison`) | action | **KEEP** | — | Phase 5 |
| W-15 | Give AI processing consent (`AiConsentModal`) | action | **KEEP — DO NOT TOUCH** | consent surface, §12.2 halt if it would change | — |
| W-16 | See an upgrade trigger / modal | action | **KEEP** | monetization surface ×2 (`UpgradeTriggerCard`, `UpgradeModal`) | — |
| W-17 | See the greeting «Καλώς ήρθατε πίσω, {name}» | fact | **KEEP, SCRUBBED** | name goes through identity scrubbing — this is where `E2E` leaked | P1-07 |

**Ledger note on W-01/W-02.** The asset reframe is the one change in this run that can *lose*
capability invisibly: if one car with three policies becomes one row, the three policies must still
each be reachable and individually identifiable. Phase 2's spec must show that explicitly, and
Phase 5 must not merge rows until it does. If the reframe needs a schema change it is a §12.2 halt
(§7.3 says so); the presentation-layer grouping key must be documented if it does not.

**Gate satisfied 2026-08-25** — `docs/transformation/ASSET-REFRAME-SPEC.md`. **No schema change is
needed**, so this is not a §12.2 halt: the grouping key is derived at render time from
`acordData.vehicle.plateNumber` (motor) and `acordData.property.address` (property), both of which
already exist. Nothing is persisted, so a wrong grouping is a display bug rather than a migration.

The spec states the invariant as four testable claims — count conservation, individual reachability,
individual identity, and status per policy never per group — and one rule that runs against the
instinct to tidy: **a policy whose key is missing, sentinel or unreadable stands alone.** Those keys
are extracted, and two policies whose plate was read as the same wrong string are not the same car;
merging on a bad key tells the customer two unrelated policies cover one asset, which is worse than a
longer list.

It also records what it does **not** decide: whether the reframe is worth doing. The wallet renders
29 policies as 29 rows and "hard to scan" is not on the measured defect list, so **the reframe wants
a measurement before it is built** — and that measurement does not exist.

**Ledger note on W-03.** Worth recording because it contradicts the brief: these counts come from
`getPolicyStatusView`, which is expiry-aware, so the wallet is NOT the source of the count
contradiction. The outbound services are (D-007).


---

## Ασφαλιστήριο — `/wallet/[id]`

Source: `components/wallet/PolicyDetailsClientView.tsx` + 17 components in
`components/wallet/policy-detail/`.

**CORRECTED 2026-08-23 by T-015.** I wrote here that the brief is accurate about this surface,
citing the Goal 0 baseline (20 sections, 187–189 containers, 13,428px at 320px). Goal 2 shipped
after that baseline and cut the default view to **10 sections / 53 containers / 4,930px**. So the
brief is stale here too — I under-applied D-004.

**But the correction has a correction, and it is the more important number.** `PolicySection`
unmounts closed content and every section defaults closed, so 4,930px measures a folded page.
Expanded, the same surface is **12,399px — 2.5×, and within 8% of the pre-restructure figure**
(D-011). The reduction is largely an accordion, not a deletion.

Consequences for every row below: the published tap-target, truncation and 1.4.11 counts for this
surface are **floors for the always-visible heads**, not measurements of the page, and §10.2's
ceilings are evaluated **expanded**.

Reusable, with two caveats recorded for T-015:
1. **Free-tier paths are unmeasured.** That baseline carries its own correction: the fixture
   account holds an ACTIVE `ph-pro` subscription, so the locked gap report, the €3 unlock CTA, the
   PDF-preview lock and the upgrade banner were never captured. §5.3 requires both tiers.
2. **1.4.11 was not automated in that pass** and is explicitly recorded there as a gap.
   `tests/measure/nontext-contrast.spec.ts` exists now, so T-015 must re-run with it — §5.6 makes
   1.4.11 mandatory, not deferred.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| P-01 | Identify the policy (insurer, number, line) | fact | **KEEP** | through `policy-identity.ts` only | — |
| P-02 | See status, end date and days remaining | fact | **KEEP, STATED ONCE** | §7.5: dates currently render in three places; one survives | Phase 5 |
| P-03 | Read the plain-Greek summary (`SummaryCard`) | fact | **KEEP** | must pass `summary-language.ts`; English-with-no-tag must not render | P1-05 |
| P-04 | See the per-policy health signal + `healthLevels` verdict | fact | **REMOVE the verdict** | «Σε καλή κατάσταση» over a 110-day-expired policy is §2.2 + §2.3 | P1-04 |
| P-05 | See coverages with limits (`coverage`) | fact | **KEEP** | separated from claims contact — two different jobs (§7.5) | Phase 5 |
| P-06 | Read exclusions / ψιλά γράμματα (`ExclusionsCard`) | fact | **KEEP, PROMOTED** | the most differentiating content in the product; currently furthest down | Phase 2 |
| P-07 | Read notable conditions | fact | **KEEP — concern does not hold, verified 2026-08-25** | The schema separates them by TYPE, not free text: `perkType` is a closed enum (free_service, assistance, discount, prevention, loyalty_bonus, digital_tool, gift, legal_aid) with no value able to express "voids cover", while `notableConditions.conditionType` carries `warranty`, `condition_precedent`, `security_requirement` — and `PolicyConditionsCard` renders those in their own register with their own labels | — |
| P-08 | See perks (`PerksCard`) | fact | **DONE 2026-08-25** | the card now points at the source document («Δείτε πού αναγράφονται στο ασφαλιστήριο»), or says there is no stored document rather than linking nowhere. Document-level is the honest granularity: `PolicyPerk` carries no clause reference, so this is the same answer `unreadable-value.ts` gives — point at the document, which is where the truth is | Phase 4 ✓ |
| P-09 | Claims guidance + phone (`ClaimsGuidanceCard`) | action | **KEEP, PROMOTED** | §7.1 question 3; phones become real `tel:` targets | Phase 5 |
| P-10 | Key dates + renewal outlook + reminders | fact | **KEEP, CONSOLIDATED** | three date locations collapse to one | Phase 5 |
| P-11 | See insured people (`InsuredPeopleCard`) | fact | **KEEP** | may carry Art. 9 data — minimise, never widen | — |
| P-12 | See / open documents (`DocumentsCard`) | action | **KEEP** | an unreadable value links here as its source | — |
| P-13 | Ask the AI about the policy (`policy-qa`) | action | **KEEP, CONSOLIDATED** | six AI entry points → at most two (§7.5) | Phase 5 |
| P-14 | See recommendations | fact | **KEEP** | gap findings render once; this links rather than repeats | Phase 5 |
| P-15 | See branch guidance / actions | fact | **KEEP** | — | Phase 5 |
| P-16 | Reach the adviser (`agent`) | action | **KEEP** | — | — |
| P-17 | Section navigation (14-pill strip) | action | **REMOVE two of three** | §4.4: ONE in-page navigation system. The pill strip, the in-card tab pair and the coverage toggle currently coexist | Phase 5 |
| P-18 | Policy header menu (edit, delete, share) | action | **KEEP** | — | Phase 5 |

**Ledger note on P-17.** This is the largest single reduction available on the surface and the one
most likely to be argued about, so the criterion is written down now: the survivor is whichever
system can address all sections after the §7.5 reduction to ≤8, at 320px, without clipping. The
14-pill strip must use `.pw-scroll-strip` if it survives — that primitive exists precisely because
the global `min-width: 0` rule collapsed it into slivers.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| P-13a | The persistent ask-AI dock (P-13's surviving entry point) | action | **MOVED 2026-08-26** | inside `header.pw-card`, after the primary action (`PolicyHead`'s `askAi` prop). Standing alone between the head and the summary it was a ninth top-level grouping on a page budgeted for eight (D-035); it is Q4's other half — one DO action, one ASK action, one boundary. Behaviour, label, tap target and the `#policy-qa` disclosure it opens are unchanged; the primary action remains the header's first button | P5-detail-goal2-01 |

**Doc debt found:** `BASELINE.md` cites `tests/measure/policy-detail.ts`, renamed to `metrics.ts` in
T-011. Harmless but it should be corrected when T-015 republishes.


---

## Αναλύσεις — `/coverage-insights` — **ROUTE REMOVED (V2-P2-03)**; every KEEP row lives on `/protection`

Source (historical): `app/(protected)/coverage-insights/page.tsx` → `CoverageInsightsClient`, `ProtectionScoreCard`,
`RecommendationCards`, `LifeEventsPanel`, `RiskProfileWizard`, `RefreshAnalysisButton`, `UpgradeTriggerCard`.
The route was deleted by V2-P2-03; the shared components mount on «Η προστασία μου» (`/protection`),
its server actions moved to `app/(protected)/protection/actions.ts` auth-intact (a 100% git rename),
and `/coverage` (the legacy redirect, a KEEP row) now points at `/protection`.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| A-01 | See the protection score as a dedicated card | fact | **REMOVE** | H-001 answered C, so the sanctioned count goes from two to **zero** and candidate #17 resolves by deletion | P1-01 |
| A-02 | See the score's colour verdict (`scoreColor`) | fact | **REMOVE** | goes with A-01, so the WCAG 1.4.1 finding resolves by deletion rather than by adding a text equivalent | P1-01 |
| A-03 | Read the freshness stamp ("computed from data as of…") | fact | **REMOVE** | it stamps the score; nothing left to stamp | P1-01 |
| A-04 | Read methodology / limits / not-advice | fact | **REMOVE** | goes with A-01 | P1-01 |
| A-05 | See recommendations (`RecommendationCards`) | fact | **KEEP** | `/protection` (V2-P2-03); titles must not be AI prose from an unauthored slug | — |
| A-06 | Declare life events (`LifeEventsPanel`) | action | **KEEP** | `/protection#life-events`; duplicates the dashboard's `LifeEventPromptCard` — one must link to the other (§7.5 renders once) | Phase 5 |
| A-07 | Complete the risk-profile wizard | action | **KEEP** | `/protection#risk-profile-wizard`; the long form; §7.5 says it is not the first thing on the surface | Phase 2 |
| A-08 | Refresh the analysis | action | **KEEP** | `/protection` (action moved to `protection/actions.ts`, auth-intact); consent-gated path | — |
| A-09 | Upgrade trigger | action | **KEEP** | `/protection` — its ONLY mount since V2-P2-03; §10.1 count stays 5 | — |

### A-10…A-21 — `CoverageInsightsClient` itself. Added 2026-08-25; it had NO rows.

Found by the V2-P2-01 agent while building `/protection`: A-01…A-09 name the score, the
recommendation cards, life events, the wizard, refresh and upgrade — **and nothing at all for the
findings surface those things sit around**. It is D-028's failure one layer in: the route was
enumerated, the section exists, and the largest thing on it was never itemised. V2-P2-03 deletes this
route. Without these rows the rule in §12 would have reported no violation.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| A-10 | The reviewed-findings list: per-gap card with title, severity, line of business | fact | **KEEP** | «Η προστασία μου» | V2-P2-01b ✓ |
| A-11 | Severity tally that sums to `gap.openCount` on live cover | fact | **NEW — corrected 2026-08-25** | «Η προστασία μου» — single mount since V2-P2-03 removed `/coverage-insights` | V2-P2-01b ✓ |
| A-12 | «Εξαιρέθηκαν» — names the EXPIRED policies left out of the tally | fact | **KEEP — honesty feature** | same. This is the surface telling the reader what it did not count; losing it silently would be the §2.1 shape | V2-P2-01b |
| A-13 | «Ελέγχθηκε και είναι εντάξει» — policies checked with no findings | fact | **KEEP** | same. The counterpart to A-12: checked-and-clear stated as such, distinct from never-looked | V2-P2-01b |
| A-14 | Counts: policies with findings, total policies, total coverage | fact | **KEEP** | same, through registered `data-count` keys | V2-P2-01b |
| A-15 | Per-finding actions: review the policy, add a note, dismiss | action | **KEEP** | same — real agency, and dismissal is a write path | V2-P2-01b |
| A-16 | «Επόμενα βήματα» | fact | **KEEP** | same | V2-P2-01b |
| A-17 | Never-analysed state, with a refresh hint and a locked CTA | fact | **KEEP** | same. Absence-is-not-reassurance depends on this state existing separately from A-13 | V2-P2-01b |
| A-18 | Empty-wallet state with an add-first CTA | fact | **KEEP** | same | V2-P2-01b |
| A-19 | All-good state | fact | **KEEP, CHECK** | same — must not read as reassurance when nothing was analysed (that is A-17's job) | V2-P2-01b |
| A-20 | Free-tier lite view: partial list, unlock CTA | action | **KEEP** | same — single mount since V2-P2-03; monetization count must not rise (§10.1) | V2-P2-01b |
| A-21 | Independence note, link to coverage settings | fact | **KEEP** | same | V2-P2-01b ✓ |

**Two of these rows were wrong when I wrote them, and the implementing agent caught both.**

- **A-11 was not a capability.** I wrote "severity tally that sums to `gap.openCount`" after reading
  `CoverageInsightsClient.tsx:294`, which is a **comment** — "severity tally now sums to
  (gapsOnActiveCoverage)" — describing the dashboard widget. In the surface itself `stats` is
  destructured and only `stats.totalPolicies` is ever rendered. Nothing tallied severity here. So the
  carry did not preserve it; it **built** it, and the row now says so. Recording a capability that
  does not exist is not a harmless error: it makes an addition look like preservation, which is
  exactly the confusion §12 exists to prevent.
- **A-10 never rendered the insurer.** I listed it; the per-finding card does not show it. Insurer
  appears on A-13's checked-and-clear rows. Removed from the row rather than built, because the
  point was to record what exists.

The lesson is the ledger's own: **itemise from rendered output, not from source you are reading for
the first time.** A comment is not a capability. This is the same mistake as asserting a file changed
instead of asserting behaviour changed — made in the artifact whose entire job is to be accurate.


**§7.5 calls this "the densest surface in the app" and wants the most aggressive reduction.** That
claim is **unmeasured on current code** — no baseline exists for it. T-015 measures it before Phase
2 sets a ceiling, because the dashboard's numbers turned out stale and this one may too.

---

## Σύμβουλος — `/agent`

Source: `app/(protected)/agent/page.tsx` → `AgentClient.tsx`.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| S-01 | See the adviser's name, firm, phone, email | fact | **KEEP** | identity must not truncate (§2.5 cites «Νίκος Παπαδό…») | Phase 3 |
| S-02 | Four tabs: overview · messages · documents · proposals | action | **KEEP, all four must render at 320px** | §4.3 records the fourth clipped | Phase 5 |
| S-03 | See which policies are shared, and by whom | fact | **KEEP** | full policy identity, no truncation | Phase 5 |
| S-04 | Revoke a share (`revokeShare`) | action | **KEEP** | real agency, §9.1 names this as one of three control surfaces worth surfacing | — |
| S-05 | Invite an adviser by email | action | **KEEP** | — | — |
| S-06 | Disconnect from the adviser | action | **KEEP, DEMOTED** | §7.5: a rare destructive action currently gets a full dashed-red card and outranks the two things customers actually do here | Phase 5 |
| S-07 | See policy status per shared policy | fact | **KEEP, UNIFIED** | uses `mapPolicyCardStatus`, which has no `expired` state — candidate #25 | P1-10 |
| S-08 | 56 inline `{ el, en }` copy pairs | — | **ENUMERATE** | not migrated, but must enter the frozen inventory's universe (candidate #26) | P1-06 |

---

## Ρυθμίσεις — `/account` + 5 subpages

Source: `app/(protected)/account/page.tsx`, `SettingsNav`, and
`components/settings/sections/{Profile,Security,Privacy,Plan,Notifications}Section.tsx`.

**§7.5: "closest to correct in the app — preserve it. Use it as the density reference."** Confirmed
as the design intent; the subpages are audited as first-class surfaces per §4.4.6.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| R-01 | Settings nav rail to 5 subpages | action | **KEEP** | the density reference — do not disturb | — |
| R-02 | Profile: view and edit personal details | action | **KEEP** | — | — |
| R-03 | Security: password, sessions | action | **KEEP** | auth surface — §12.2 halt if behaviour would change | — |
| R-04 | Privacy: export my data | action | **KEEP** | executor confirmed real: `POST /api/v1/me/data-export`, guarded, rate-limited, tokenised download (candidate #23) | — |
| R-05 | Privacy: request account deletion | action | **KEEP** | executor real; UI honestly says it enters a review queue rather than deleting | — |
| R-06 | Plan: see plan and usage | fact | **KEEP** | pricing/entitlements are §12.4 out of scope — display only | — |
| R-07 | Notifications: per-group toggles | action | **KEEP, FIX SCOPE** | writes `channel: "email"` only while `push` is implemented — the control does less than its label (candidate #24) | P1-09 |
| R-08 | Notifications: quiet hours | action | **KEEP** | one of the four §9.5 controls that already exists | — |
| R-09 | user-configurable monthly ceiling | action | **DONE** | `CadenceControls`, `/account/notifications` | P1-09b ✓ |
| R-10 | global off switch honoured in outbound | action | **DONE** | same; read by the send path via `getCadenceGate` | P1-09b ✓ |
| R-11 | activity history | fact | **KEEP, RELOCATED** | `/account/history` — the timeline's new home | V2-P2-02 ✓ |

R-09 and R-10 were recorded as rows **despite not existing**, because §9.5 required them and Phase 4
could not ship a cadence-controlled mechanic without them. Recording an absent capability a later
phase depends on is exactly what this ledger is for — and it worked: they were built in P1-09b and
these rows are the reason anyone went looking. **Corrected 2026-08-25**; they had stayed `MISSING`
for two phases after shipping, which is the ledger's own version of a stale exemption.


---

## App shell — every authenticated B2C screen

Source: `components/shell/AppShell.tsx` + `MainNav`, `UserMenu`, `RoleSwitcher`, `ThemeToggle`,
`LocaleToggle`, `InstallPrompt`. Evidence: `evidence/CHROME-AUDIT.md` (18 CONFIRMED, 4 NEEDS CAPTURE).

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| SH-01 | Bottom tab bar, 5 B2C destinations | action | **KEEP** | all 5 targets already ≥44px; labels already Greek | — |
| SH-02 | Header + notification bell → `/notifications` | action | **KEEP** | — | — |
| SH-03 | Mobile drawer (`role="dialog" aria-modal`) | action | **KEEP, FIX** | scrim must cover the bottom nav — today five tab targets stay undimmed and clickable inside a declared modal | P1-08 |
| SH-04 | Desktop sidebar + user menu | action | **KEEP** | `hidden lg:block`; not a mobile surface at all | — |
| SH-05 | Skip link | action | **KEEP** | — | — |
| SH-06 | Theme toggle | action | **KEEP** | bypasses the translation bundle with an inline literal pair | P1-06 |
| SH-07 | Locale toggle | action | **KEEP, FIX** | "group" variant ≈30×40, missing the `min-h-11` its "plain" sibling has | P1-08 |
| SH-08 | PWA install prompt | action | **KEEP, FIX** | `fixed bottom-24 z-40`, zero safe-area compensation, overlaps the nav ≈18px on a notched device | P1-08 |
| SH-09 | `NotificationBell` in the shell | — | **REMOVE — dead** | its only mount point (`UserMenu`'s `compact` branch) is never invoked | P1-08 |

**Nothing here is a per-page defect.** All nine are fixed once in the shell, which is why §6.1.11
makes this one item rather than seven.

---

## Upload flow — `/wallet/add`, `/wallet/[id]/edit`

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| U-01 | Upload a policy document | action | **KEEP** | — | — |
| U-02 | Give AI-processing consent before upload | action | **KEEP — DO NOT TOUCH** | `AddPolicyClient.tsx:59-62` captures consent **before** the form submits, because analysis starts in the background immediately after `createPolicy`. Consent surface = §12.2 halt | — |
| U-03 | Bulk upload (`BatchUploadModal`) | action | **KEEP** | shares the extract path, which must check consent before reading the body | — |
| U-04 | Pick insurer and policy type | action | **KEEP** | insurer list is the 27-record reference catalogue | — |
| U-05 | See a coverage/plan limit modal | fact | **KEEP** | quota block is KEEP-AND-INFORM — the upload stays and the wallet says why | — |
| U-06 | Edit an extracted policy | action | **KEEP** | this is where a customer corrects an unreadable value | — |

**This is where extraction placeholders originate** (§4.4.7), so U-06 is the counterpart to the
unreadable-value work: a value that could not be read must link here.

---

## Remaining surfaces and overlays

| surface | capabilities | disposition |
|---|---|---|
| `/help`, `/help/article/[slug]` | browse and read help articles | **KEEP** — low risk, all roles |
| `/benefits` | partner offers, paid tier | **KEEP** — permanently empty in prod until offers exist; must render an honest empty state, not a teaser |
| `/consent/ai` | give AI-processing consent | **DO NOT TOUCH** — §12.2 |
| `/activity` | activity feed | **KEEP, FIX** — English internal prose falls through for every event type except `policy_analyzed` (P1-05) |
| `/insights/risk-profile` | view and complete the risk profile | **KEEP** — B2C, reads the caller's own `policyholderProfile` |
| `/upgrade`, `/upgrade/success` | plan purchase | **KEEP** — pricing/entitlements are §12.4 out of scope; display only |
| `/coverage`, `/home` | legacy redirects | **KEEP** — no capability |
| `/money` | the money line — what is paid, what it protects up to, what may be paid twice (Grafí app tier, G3→G9) | **NEW** — renders only figures the wallet already computes honestly; nothing invented |

| overlay | disposition |
|---|---|
| AI Consent Modal | **DO NOT TOUCH** — §12.2 |
| Batch Upload Modal | KEEP |
| Policy Comparison | KEEP |
| Delete Policy Dialog | KEEP — destructive, must not outrank ordinary actions |
| Change Password Modal | KEEP — auth surface, §12.2 |
| Confirm Dialog (generic) | KEEP — the shared destructive-confirm primitive |
| Coverage Limit Modal | KEEP — quota is KEEP-AND-INFORM, never a deletion |

---

## LEDGER STATUS: 20 of 20 surfaces + 7 overlays enumerated — **against a hand-written list of 20**

**Corrected 2026-08-25 (D-028).** That denominator was a list someone maintained, not the filesystem,
so the claim was true of the list and false of the product. `/branches/[branch]` — 392 lines of
per-branch policies, renewals, recommendations and actions — had **no rows at all**, and surfaced
only because Phase 2 went to delete its parent. `/collaboration/threads/[id]` has none either.

This is the failure the guards kept having (D-005), now reaching the artifact meant to catch it, and
it matters more here than anywhere: §12 says nothing is removed, merged or relocated without a ledger
row — a protection worth exactly as much as the ledger's coverage, because a capability with **no**
row can be deleted and the rule reports no violation. Nothing was measuring the coverage.

`tests/unit/ledger-covers-every-surface.test.ts` now derives the universe from `app/(protected)` and
resolves B2C-versus-staff through `resolveRouteOwner` in `proxy.ts`, so the ledger's scope and the
role gate cannot drift apart. Its known-gap list may only shrink.

Counts are provisional until T-015 baselines confirm what actually renders per state — an
enumeration from source cannot see a capability that only appears on a paid tier or a degraded
fixture, which is exactly the gap the policy-detail baseline already documented about itself.

| | count | note |
|---|---|---|
| capabilities enumerated | **89** | across 7 detailed surfaces + shell + upload + summarised remainder |
| removals proposed | **12** | N-04, N-05, N-09, P-04, P-17 (2 of 3 nav systems), SH-09 + the six H-001 rows |
| removals that are pure delivery/dev metadata | **3** | N-04, N-05, SH-09 — no customer capability lost |
| **decided by H-001 (option C) — REMOVE** | **6** | D-02, D-04, A-01, A-02, A-03, A-04 |
| DO NOT TOUCH (§12.2) | **4** | W-15, U-02, R-03, `/consent/ai` + Change Password |
| monetization surfaces | **5** | dashboard ×2, wallet ×2, analyses ×1 |


---

# v2 additions — surfaces v1 never enumerated

## Κλάδοι — `/branches` — **ROUTE REMOVED (V2-P2-03)**; the grid is the ανά κλάδο lens of `/protection`

Source (historical): `app/(protected)/branches/page.tsx` → `components/branches/ProductBranchCard.tsx`
(the card survives, mounted by `ProtectionBranchLens`).
Baseline: `evidence/branches/BASELINE.md` (1,981px @320, 31 containers, depth 2, **9 truncation**).

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| B-01 | See the nine lines of business as cards | fact | **KEEP** | absorbed into «Η προστασία μου», *ανά κλάδο* lens (§4.2) | Phase 2 |
| B-02 | See how many policies you hold per line | fact | **KEEP** | `/protection`, ανά κλάδο lens — the honest half of this surface | — |
| B-03 | Read a one-line tagline per line | fact | **DONE — reachable, not unclamped** | `/protection`, ανά κλάδο lens keeps the `line-clamp-2` (uniform cards on a 19-screen page); the full tagline now renders on `/protection/[branch]`'s header — the page the card links to. Guarded on rendered DOM by `clamped-text-reachability` for every top-level branch | V2-P3-01 ✓ |
| B-04 | Open a line to see what you hold | action | **KEEP** | `/protection/[branch]` (`href` per card) | — |
| B-05 | See «Πιθανό κενό» on a line | fact | **DONE — register changed, information kept** | now «Χωρίς ασφαλιστήριο», neutral. A *lapsed* policy still reads as a finding | V2-P1-02 ✓ |
| B-06 | See `business` among consumer lines | fact | **DECIDED (QUEUE.md Phase 2)** | `/protection`, ανά κλάδο lens: renders only when the customer holds a policy in the line — one predicate in `ProtectionBranchLens`, reversible | V2-P2-01 ✓ |

**Ledger note on B-05.** This is the row that matters. The card's *structure* is fine — the defect
is that an unowned line wears the visual language of a finding. Removal here means changing the
register, not deleting the card: the customer still learns they hold no pet cover.

## Χρονολόγιο — `/timeline` — **ROUTE REMOVED (V2-P2-03)**; the capability lives at `/account/history`

Source (historical): `app/(protected)/timeline/page.tsx` → `components/timeline/LifeTimeline.tsx`
(the component survives, mounted by `HistorySection` inside Ρυθμίσεις).
Baseline: `evidence/timeline/BASELINE.md` (9,539px @320 paid, 68 containers, **1 leak**).

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| T-01 | See a chronological history of what happened | fact | **KEEP, RELOCATED** | §4.2 — activity history **inside Ρυθμίσεις**, at `/account/history` («Ιστορικό δραστηριότητας», V2-P2-02); it does not warrant a menu slot | Phase 2 |
| T-02 | Filter by entry kind | action | **KEEP** | `/account/history` — survived the relocation (guarded on rendered output by `account-history-relocation.test.tsx`) | V2-P2-02 ✓ |
| T-03 | See a cause link between entries | fact | **KEEP** | `/account/history` — survived; it clears the filter first because the cause is often a filtered-out kind | V2-P2-02 ✓ |
| T-04 | Open the policy an entry concerns | action | **KEEP** | `/account/history` (`href` per entry) | — |
| T-05 | Read a policy's name on an entry | fact | **KEEP, FIX** | renders `__PENDING_EXTRACTION__` verbatim — `timeline/build.ts:202` bypasses `policy-identity.ts` (D-021) | V2-P1-06 |
| T-06 | See 18 of 60 rows sharing one title | — | **REMOVED** | grouped during the relocation to `/account/history` | V2-P2-02 ✓ |

**Ledger note on T-01.** §4.2 removes this from the menu. That is a **relocation, not a deletion** —
the capability survives inside settings, and T-02/T-03 must survive with it or the move is a loss.
T-03 especially: the cause link is the only thing here the wallet cannot already tell you.

---

## Running counts — refreshed 2026-08-24 (v2, post-Phase-0-extension)

| | v1 Phase 0 | now | Δ |
|---|---|---|---|
| total capabilities | 89 | **101** | +12 (6 `/branches`, 6 `/timeline`) |
| total CTAs | *not counted* | *pending* | — |
| AI entry points | *pending* | *pending* | — |
| monetization surfaces | 5 | **5** | 0 — neither new surface carries one |

**§10 ceiling holds:** the monetization count did not rise, and §10.1 forbids it rising. Recorded
here so a later phase cannot add one quietly.

## Οι κίνδυνοί σας — `/insights/risk-profile` — **ROUTE REMOVED (V2-P2-03)**; the content is `/protection?lens=risk`

Baseline: `evidence/risk-profile/BASELINE.md`. Unreachable to policyholders until `V2-P1-01`.
The route was deleted by V2-P2-03; `RiskIntelligenceView` + `RiskGraphPanel` mount on the ανά
κίνδυνο lens of «Η προστασία μου», and `submitQuickStart` moved to
`app/(protected)/protection/quick-start-actions.ts` auth-intact (a 100% git rename). This also
resolves the empty-`<h1>` finding (QUEUE.md, 2026-08-25): `/protection` has a real one.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| R-01 | See a risk graph of what your life is exposed to | fact | **KEEP** | «Η προστασία μου», *ανά κίνδυνο* lens (§4.2) | V2-P2-01 ✓ |
| R-02 | See per-risk protection state | fact | **KEEP, FIX** | `unknown` is currently the DEFAULT for motor (V2-P1-07), so the axis is uninformative until the field is read | V2-P1-07 |
| R-03 | See «Απροστάτευτο» on lines you do not hold | fact | **DONE — own register** | counted as «Χωρίς ασφαλιστήριο», never among findings | V2-P1-02 ✓ |
| R-04 | See the coverage-completeness score + verdict | fact | **REMOVED — H-005 answered 2026-08-25: it should not exist** | nothing; index, verdict, tone map and component percentages all deleted. `nextAction` survives as a control, not a ranking | H-005 ✓ |
| R-05 | Read the household summary | fact | **KEEP, REWRITE** | guilt register (§2.13) + a plural-agreement bug, same file | V2-P1-04, V2-P1-09 |
| R-06 | See what is being monitored, and expiry counts | fact | **KEEP, RECONCILE** | 45-day window here vs 30-day on the dashboard | V2-P1-10 |
| R-07 | Filter risks by state | action | **KEEP** | the «Όλα N» tab whose count disagrees with «Παρακολουθούμε N» | V2-P1-10 |
| R-08 | See trends and predictions | fact | **KEEP** | must not assert a claim the engine cannot substantiate (§2.10) | Phase 2 |

**Ledger note on R-02.** Worth stating plainly: this surface's whole premise is per-risk protection
state, and for motor — the line nearly every Greek customer holds — that state is `unknown` by
default because of an unread field. The surface is not mis-designed; it is starved.

---

## Running counts — refreshed 2026-08-24 (v2 Phase 0 extension complete)

| | v1 Phase 0 | now | Δ |
|---|---|---|---|
| total capabilities | 89 | **109** | +20 (6 branches, 6 timeline, 8 risk-profile) |
| monetization surfaces | 5 | **5** | 0 — none of the three new surfaces carries one |

**§10.1 ceiling holds.** Three surfaces added, no upgrade surface among them.

## Removal — V2-P1-12 (H-008): the bonus-credit grant, day-30 churn

| capability | surface | disposition | destination |
|---|---|---|---|
| «500 δωρεάν AI credits» announced as granted | day-30 churn email | **REMOVED** | none — it never existed |
| «Πιστώθηκαν επιπλέον credits» notification | in-app notification list | **REMOVED** | registry entry retained, `status: "planned"` |
| re-engagement contact at day 30 | day-30 churn email | **RETAINED** | same email, credit claim excised |

**This is not a capability the customer loses, because they never had it.** Nothing in the codebase
has ever moved a credit balance on this path — the only writer is the admin `grantTokens` action.
What is removed is the *statement* that it happened, in the past tense, on two channels, daily.

The **contact** is retained: the day-30 email still goes, still re-engages, and no longer bribes.
Total capability count is unchanged at **109** — a false claim was never a capability. Monetization
surfaces **5 → 5**: the gift box was not an upgrade surface, and removing it opens no room for one.

The registry entry survives as `planned` rather than being deleted, so the day a real grant exists
there is a defined event to emit — at the point the grant **commits**, never at the point one is
announced. `tests/unit/claimed-benefit-is-conferred.test.ts` fails if it goes `live` without an
emitter that touches `creditTransaction`.

## Removal — V2-P1-12: `lib/mail-templates.ts` `export const templates`

| capability | surface | disposition | destination |
|---|---|---|---|
| sixteen per-event mail bodies (GAP_DETECTED, …), both languages | none — reachable from nothing | **REMOVED** | `buildNotificationEmail`, which already replaced them |

**Not a capability, on two independent grounds.** Nothing imported the symbol — the file is imported
often, but only ever for `buildNotificationEmail` and `getBaseTemplate`. And the templates were
already **broken**: the comment on `buildNotificationEmail` records that they "rendered `undefined`
because sendNotification only ever passed them `{ id, language }`", so every data parameter arrived
empty. They could not have rendered for a customer even if something had called them.

**Why delete rather than leave.** They contributed **16 Greek ternary entries** to the frozen copy
inventory. That inventory is what this run reviews every customer-facing word through, so sixteen
dead strings were sitting in it looking live. Someone improving the gap-detected wording would have
edited these and shipped nothing. Dead copy is worse than no copy.

Capability count unchanged at **109**. A tombstone comment stands where they were.

---

## Η προστασία μου — `/protection` (V2-P2-01 built · V2-P2-03 removed the absorbed sources)

Source: `app/(protected)/protection/page.tsx` → `components/protection/ProtectionSurface.tsx`
(`ProtectionBranchLens` / `ProtectionRiskLens` + the surviving /coverage-insights components).
Written by the implementing item because `ledger-covers-every-surface` enumerates routes from the
filesystem; the run coordinator owns the final wording.

**No capabilities of its own.** The route absorbs, per §4.2: **B-01…B-06** render on the *ανά
κλάδο* lens, **R-01…R-08** on the *ανά κίνδυνο* lens, **A-05…A-09** as the lens-independent engine
content, and — since V2-P2-01b — **A-10…A-21**, the findings surface itself
(`CoverageInsightsClient`, mounted `embedded` between the recommendations and the lens switcher,
with the A-11 severity tally rendered through `describeSeverity()` under `gap.severityCount`,
summing to `gap.openCount` over the shared `gapsOnActiveCoverage` universe). The lens switcher (`?lens=`) is navigation, not capability. Guard:
`tests/unit/protection-surface-ledger.test.tsx` renders the surface and fails when any KEEP row
stops rendering; expected content is enumerated from the taxonomy, the graph/watch assemblers and
the §6.7 key registry, never from a hand-written list.

Three facts a later phase must not lose:

- **B-06 is decided here** (QUEUE.md Phase 2): the `business` line renders only when the customer
  holds a policy in it — one predicate in `ProtectionBranchLens`, reversible.
- **A-09 renders on ONE mount** — V2-P2-03 deleted /coverage-insights, collapsing the transitional
  double-mount recorded here on 2026-08-25. One monetization surface (one featureKey, one modal),
  one mount; **the §10.1 count is 5, not 6** — confirmed after the collapse.
- **A-10…A-21 render on one mount too** — the findings surface is ONE component,
  `CoverageInsightsClient`, and /protection is now its only mount. That includes **A-20's
  monetization pieces** (the lite banner, its «Αναβάθμιση» button, the «Ξεκλείδωσε πλήρη ανάλυση»
  next-step and the A-17 «Ξεκλείδωμα με Plus» CTA). The transitional two-mount state V2-P2-01b
  recorded existed only while both routes lived; it collapsed with the route, exactly as recorded.

## Κλάδος αναλυτικά — `/branches/[branch]` → `/protection/[branch]` (V2-P2-01; sole mount since V2-P2-03)

Source: `components/branches/BranchDetail.tsx` — extracted verbatim from
`app/(protected)/branches/[branch]/page.tsx`, which had **no ledger rows** (D-028: Phase 0
enumerated the listing page only). V2-P2-03 deleted the legacy mount and the `origin` prop with
it; `/protection/[branch]` is the only mount and the breadcrumb always leads to `/protection`.
Enumerated by the implementing item; rows below are the extraction's inventory, not a redesign.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| BD-01 | Breadcrumb back to the line listing | action | **KEEP** | `/protection` (the `/branches` arm died with the route in V2-P2-03) | — |
| BD-02 | Branch header: icon, name, full tagline (B-03's full render since V2-P3-01), short description | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-03 | Policies held in this line (identity via policy-identity, LIFECYCLE status badge); empty state with CTA when none | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-04 | Branch-filtered recommendations (`branch.recommendationCount`, subject-scoped — never `recommendation.openCount`) | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-05 | «Γιατί έχει σημασία» editorial | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-06 | «Τι αναλύει το PolicyWallet» editorial | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-07 | «Συχνά κενά κάλυψης» editorial, engine-badged «Εντοπίστηκε στο χαρτοφυλάκιό σου» when the rule fired | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-08 | «Πώς να το αξιοποιήσεις καλύτερα» editorial | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-09 | Perks aggregated from analyzed policies, linking to `/wallet/[id]#coverage` | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-10 | Upcoming renewals with `policy.daysRemaining` (subject-scoped, Athens-calendar via lifecycle) | fact | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-11 | Recommended-action chips (askAi deep-links into policy Q&A) | action | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-12 | Suggested AI questions (when a policy exists in the line) | action | **KEEP** | `/protection/[branch]` (sole mount) | — |
| BD-13 | Agent CTA (connected/disconnected hint, link to `/agent`) | action | **KEEP** | `/protection/[branch]` (sole mount) | — |

**Known debt carried, not created:** the status→translation-key bridge (P1-10 exemption in
`policy-status-display-single-source.test.ts`, moved by name to `BranchDetail.tsx`). B-03's
tagline truncation is resolved (V2-P3-01): the header above renders the tagline in full.


---

## Removal — V2-P2-03 (§4.2): four routes, zero capabilities

| removed route | rows | where every KEEP row lives now |
|---|---|---|
| `/coverage-insights` | A-05…A-21 | `/protection` (components unchanged; server actions moved to `protection/actions.ts` as a 100% git rename) |
| `/branches` | B-01…B-06 | `/protection`, ανά κλάδο lens |
| `/branches/[branch]` | BD-01…BD-13 | `/protection/[branch]` (sole mount; `origin` prop deleted) |
| `/insights/risk-profile` | R-01…R-08 | `/protection?lens=risk` (`submitQuickStart` moved to `protection/quick-start-actions.ts`, a 100% git rename) |
| `/timeline` | T-01…T-06 | `/account/history` (relocated by V2-P2-02; T-02/T-03 guarded on rendered output) |

**This is a removal of ROUTES, not of capabilities** — every KEEP row above renders on its new
home, so the total capability count stands at **109**. The nav is five tabs plus the bell
(`/dashboard`, `/wallet`, `/protection`, `/agent`, `/account`, bell → `/notifications`);
`/benefits` is a conditional entry inside Ρυθμίσεις (`SettingsNav`, live-offers-gated).
**Monetization surfaces: 5 → 5** (§10.1) — A-09 and A-20 each collapsed from two transitional
mounts back to one when the old route went; no surface was added or lost.
`tests/unit/no-dead-internal-links.test.ts` (added with this item) enumerates every internal
link/redirect/revalidate target in the tree against the filesystem's routes, so the NEXT removal
that leaves a link behind fails CI instead of shipping a dead tap.

## Running counts — refreshed 2026-08-25 (Phase 2 complete)

| | v2 Phase 0 | now | Δ |
|---|---|---|---|
| total capabilities | 109 | **109** | 0 — four routes removed, nothing lost |
| monetization surfaces | 5 | **5** | 0 — the A-09/A-20 double-mounts collapsed with `/coverage-insights` |
| policyholder menu items | 10 | **5 + a bell** | §4.2 |
| B2C routes with ledger rows | 20 of 20 *(claimed)* | derived from the filesystem | D-028 |

**The capability count holding at 109 across an IA collapse is the point of the ledger**, and it only
means anything because two gaps were found and closed first: `/branches/[branch]`'s 392 lines
(BD-01…BD-13) and `CoverageInsightsClient`'s whole findings surface (A-10…A-21). Both were one item
away from being deleted with no row to notice them.

Coverage is now checked rather than asserted: `tests/unit/ledger-covers-every-surface.test.ts`
derives the route universe from `app/(protected)` and resolves B2C-versus-staff through
`resolveRouteOwner` in `proxy.ts`. Its known-gap list holds one entry,
`/collaboration/threads/[id]`, and may only shrink.
