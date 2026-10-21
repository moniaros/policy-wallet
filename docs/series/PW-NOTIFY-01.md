# PW-NOTIFY-01 — Channels, built dark

| | |
|---|---|
| **Wave** | 1 — foundation |
| **Step 0** | Fable 5.1 · xhigh · `step0-investigator` |
| **Build** | Opus 5.5 · high |
| **Review** | `adversarial-reviewer` · Security review: **yes** (calendar feed URLs, push tokens) |
| **Waits on** | **H1 for any send.** The plumbing ships with every outbound channel disabled. |
| **Session start** | STATUS.md + this file |

## Customer outcome
Push only for real, dated events; one monthly email that's allowed to say «Τίποτα δεν άλλαξε»; a calendar I can subscribe to. Every message links to the article and page in my own document, carries one action, and never states a score or severity.

## Step 0 — investigate, no code
1. **Outbound inventory.** Every email and push template, its trigger, its channels. For each: does it render a score, a severity, an internal token, or English? (This repeats the transformation doc's outbound-copy inventory; reuse it if it already exists.)
2. **The send stub.** Prove that no real email or push can leave from dev, preview or test. Show the code path and a test that fails if the stub is bypassed.
3. **Proposed event model.** One `customer_event` row per real-world dated event (renewal window opens, obligation due, claim date reached, policy read). Delivery records live separately. The notification list renders events, never deliveries.
4. **Channels.**
   - Web push / PWA.
   - A per-user `.ics` feed: unguessable token, revocable, carries no policy content beyond title, date and a deep link.
   - Monthly digest email.
   - Per-type, per-channel preferences, and quiet hours.
5. **Message contract.** Every message has a dated real-world trigger, one action, a source link (policy + page/article where one applies), and an `el` string key. There is no field that could carry a score.

## Build (after approval)
Event model, preference model, the `.ics` feed (this can be live: it's pull, not send), push subscription storage, digest renderer. Email and push dispatch stay behind a kill switch that defaults **off** until H1 is recorded in DECISIONS.md.

## Acceptance criteria
- The notification list deduplicates: one event, one row (fixture with multi-channel deliveries).
- The `.ics` feed validates; revoking the token returns 404 on the next request.
- Every template renders in `el` with zero English and zero internal tokens. The score-containment guard passes on every outbound template.
- The kill switch is off by default. A test proves dispatch is a no-op while it's off.
- CRITICAL 0 from both reviewers.

## Guards (fail first)
- Notification provenance: every message type maps to a dated real-world event.
- Score containment, extended to all outbound templates (runs per commit).
- Locale purity on outbound templates (runs per commit).

## Out of scope
Deciding cadence or which events send (H1). Seasonal or prevention content (LIFE-SEASON-01).

## Halt
H1 before enabling any send. Any template that can't be made score-free without a product decision.

## /goal
```
/goal Event model, preferences, .ics feed and digest renderer from the approved STEP0 are on preview with dispatch kill switch OFF and proven no-op, all acceptance criteria in docs/series/PW-NOTIFY-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 60 turns.
```
