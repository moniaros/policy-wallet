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
- [ ] Αρχική `/dashboard`
- [ ] Πορτοφόλι `/wallet`
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
