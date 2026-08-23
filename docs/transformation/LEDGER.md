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
- [ ] Ασφαλιστήριο `/wallet/[id]`
- [ ] Αναλύσεις `/coverage-insights`
- [ ] Σύμβουλος `/agent`
- [ ] Ρυθμίσεις `/account` + 5 subpages
- [ ] app shell *(chrome audit in flight)*
- [ ] upload flow `/wallet/add`, `/wallet/[id]/edit`
- [ ] the remaining 7: `/help`, `/help/article/[slug]`, `/benefits`, `/consent/ai`, `/activity`, `/insights/risk-profile`, `/upgrade`
- [ ] 7 overlays

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
