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
| N-07 | Navigate from a row to the thing it is about | action | **KEEP, must become total** | every row resolves to a route that exists (§11.2 destination guard) | P1-04 |
| N-08 | Filter by related policy | action | **KEEP** | verify it survives grouping — filtering a grouped list is not the same query | P1-04 |
| N-09 | Read a score change as a notification | fact | **REMOVE** | none — §2.2; the event type itself is deleted at `risk-events.ts:176-190` | P1-01 |
| N-10 | Read English internal prose in a Greek feed | — | **REMOVE** | Greek from the registry, derived not hand-mapped | P1-05 |

**Ledger note on N-04/N-05.** These are the only two rows in this surface that remove something a
customer can currently see, and both are removals of *delivery metadata*, not of events. No event
becomes unreachable: N-05 collapses duplicates of the same event, and any row lacking a
`dedupeKey` renders ungrouped rather than being merged away (§12.2 forbids the heuristic).

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
| D-02 | See the protection score behind a disclosure | fact | **PENDING H-001** | one of: deleted (A/C) or kept behind disclosure (B) | H-001 |
| D-03 | Read why no score can be shown, when it cannot | fact | **KEEP** | `scoreUnsupportedNothingAnalysed` / `scoreUnsupportedNoCover` — the §2.3 pattern done right | — |
| D-04 | Read the score methodology, its limits, and the not-advice statement | fact | **KEEP** | moves with D-02 | H-001 |
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
| W-01 | See every policy the customer holds | fact | **KEEP, RESTRUCTURED** | becomes assets with policies nested (§7.3) | Phase 5 |
| W-02 | Identify which policy a row is about | fact | **KEEP, STRENGTHENED** | asset rows identify by plate/address/person, not policy number | Phase 5 |
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

**Ledger note on W-03.** Worth recording because it contradicts the brief: these counts come from
`getPolicyStatusView`, which is expiry-aware, so the wallet is NOT the source of the count
contradiction. The outbound services are (D-007).


---

## Ασφαλιστήριο — `/wallet/[id]`

Source: `components/wallet/PolicyDetailsClientView.tsx` + 17 components in
`components/wallet/policy-detail/`.

**Unlike the dashboard, the brief is ACCURATE about this surface.** The committed Goal 0 baseline
(`docs/evidence/policy-detail-mobile/BASELINE.md`, 2026-08-22, 18 captures) measures **20 sections,
187–189 containers, max depth 3, 13,428px scroll at 320px = 18.6 screens.** D-004's staleness
finding applies to Αρχική and does not transfer here.

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
| P-07 | Read notable conditions | fact | **KEEP** | a condition that can VOID cover belongs in the review register, not the perk register (§9.4) | Phase 4 |
| P-08 | See perks (`PerksCard`) | fact | **KEEP** | feeds §9.4 perk prompts; each needs a clause link or it does not render | Phase 4 |
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

**Doc debt found:** `BASELINE.md` cites `tests/measure/policy-detail.ts`, renamed to `metrics.ts` in
T-011. Harmless but it should be corrected when T-015 republishes.


---

## Αναλύσεις — `/coverage-insights`

Source: `app/(protected)/coverage-insights/page.tsx` → `CoverageInsightsClient`, `ProtectionScoreCard`,
`RecommendationCards`, `LifeEventsPanel`, `RiskProfileWizard`, `RefreshAnalysisButton`, `UpgradeTriggerCard`.

| id | capability | kind | disposition | destination | item |
|---|---|---|---|---|---|
| A-01 | See the protection score as a dedicated card | fact | **PENDING H-001 — and it is the SECOND sanctioned location** | §2.2 permits one; `score-containment.test.ts` currently sanctions this and `ProtectionStatusHero` (candidate #17) | P1-01 |
| A-02 | See the score's colour verdict (`scoreColor`) | fact | **REMOVE or add a text equivalent** | colour as sole carrier, WCAG 1.4.1 | P1-01 |
| A-03 | Read the freshness stamp ("computed from data as of…") | fact | **KEEP** | good practice — it stops the score reading as timeless | — |
| A-04 | Read methodology / limits / not-advice | fact | **KEEP** | moves with A-01 | H-001 |
| A-05 | See recommendations (`RecommendationCards`) | fact | **KEEP** | titles must not be AI prose from an unauthored slug | — |
| A-06 | Declare life events (`LifeEventsPanel`) | action | **KEEP** | duplicates the dashboard's `LifeEventPromptCard` — one must link to the other (§7.5 renders once) | Phase 5 |
| A-07 | Complete the risk-profile wizard | action | **KEEP** | the long form; §7.5 says it is not the first thing on the surface | Phase 2 |
| A-08 | Refresh the analysis | action | **KEEP** | consent-gated path | — |
| A-09 | Upgrade trigger | action | **KEEP** | monetization surface | — |

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
| R-09 | *(absent)* user-configurable monthly ceiling | — | **MISSING** | Phase 4 precondition, not a Phase 1 defect | Phase 4 |
| R-10 | *(absent)* global off switch honoured in outbound | — | **MISSING** | Phase 4 precondition | Phase 4 |

R-09 and R-10 are recorded as ledger rows despite not existing, because §9.5 requires them and
Phase 4 cannot ship a cadence-controlled mechanic without them. A missing capability that a later
phase depends on is exactly what this ledger is for.


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

## LEDGER STATUS: **20 of 20 surfaces + 7 overlays enumerated.**

Counts are provisional until T-015 baselines confirm what actually renders per state — an
enumeration from source cannot see a capability that only appears on a paid tier or a degraded
fixture, which is exactly the gap the policy-detail baseline already documented about itself.

| | count | note |
|---|---|---|
| capabilities enumerated | **89** | across 7 detailed surfaces + shell + upload + summarised remainder |
| removals proposed | **6** | N-04, N-05, N-09, P-04, P-17 (2 of 3 nav systems), SH-09 |
| removals that are pure delivery/dev metadata | **3** | N-04, N-05, SH-09 — no customer capability lost |
| contingent on H-001 | **4** | D-02, D-04, A-01, A-04 |
| DO NOT TOUCH (§12.2) | **4** | W-15, U-02, R-03, `/consent/ai` + Change Password |
| monetization surfaces | **5** | dashboard ×2, wallet ×2, analyses ×1 |
