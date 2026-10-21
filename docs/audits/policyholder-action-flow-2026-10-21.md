# Policyholder action flow — 21 October 2026

Scope: the owner's requested implementation order: correctness and task completion, then home, benefits and navigation. Existing green/mint visual identity and authorization rules are retained. This is separate from the parallel public/professional presentation review.

## Correctness / workflow repairs

- An empty recommendation list says there are no open actions; it makes no coverage verdict. The profile action navigates to the real profile disclosure and opens it.
- Claims notification deadlines exclude withdrawal, objection and cancellation rights. Full contractual conditions remain accessible. A missing recorded accident-report phone is under review, not classified as legislation on the strength of a citation about reporting duties.
- Income copy no longer prescribes a reserve, predicts a loss or presents an unverified premium range. It asks about actual employment benefits, expenses and existing cover. Yes/no extraction strings do not render as amounts.
- Advisor handoff resolves only the authenticated holder's recommendation/benefit. The editable draft states its recipient, requires deliberate send, and grants no policy access. Initial message and thread are one database write. A sender-scoped request key prevents repeat submission and rejects changed content; URL-safe hashed identifiers avoid putting a sender id into the URL. Thread detail is preloaded from the authorized server read, so a sent message is visible without a second fetch. Server entitlements remain authoritative and the form explains a plan restriction before sending.
- Current reminder cards and badge counts group exact unresolved subjects, independently of delivery deduplication. The delivery archive keeps all rows. The page projection carries the destination, grouping and cursor fields through to the client; the real journey caught and repaired this missing seam. Completed, cancelled, postponed and inaccessible actions leave the current queue. Reminder links resolve to an authorized thread and action; new email/bell links use the same authenticated destination.
- Overdue reminders send once per due date, replies exclude private notes, and digests require new activity. The product no longer calls an unanswered message unread without read-receipt evidence. Read actions acknowledge older in-app repetitions only, never email delivery records or newer events.
- Private notes are omitted from inbox previews as well as policyholder thread detail. Ending a relationship prevents new reminder activity; shared thread/policy authorization still controls destination access.

## UI/UX refinement

- Home prioritizes an imminent renewal or a missing renewal document before generic setup. A passed recorded date is not represented as proof of no insurance. Current policies precede historical ones; branch/person/asset identity aids recognition. A current benefit links directly to its card when recorded.
- Benefits from current documents appear first. Historical benefits are a separate disclosure. Beneficiary, frequency and process are visible as recorded or explicitly unknown; contacts support a call/link when present. Terms and original evidence remain available.
- Common optional actions have one group heading and distinct policy cards/progress. Life changes and optional habits are disclosures; direct links open the required nested disclosure. Historical benefits stay findable in both views.
- Desktop/mobile use the same Actions label. The policy preview describes AI reading and pending checking separately. Greek and English copy was reviewed and its inventory updated intentionally.

## Verification record

- API authorization inventory: 116 routes, zero findings. TypeScript, ESLint, changed-string i18n and tracked UTF-8 checks passed during implementation.
- Development migration verification: 88 migrations; database up to date. No schema/catalogue/price changes or production data repair required.
- Unit suite: 697 files / 7,861 tests passed, including current unread counts and nonnumeric amount handling. Final release checks are recorded in STATUS.
- Development browser journeys: home, document-first intake, separate notification history, cross-line discount benefits, consent/progress persistence, keyboard, language and nested anchor navigation passed at 320/390/430/1280 px. The advisor journey passed: it checks an induced failed send, unchanged draft, exact recipient, persisted message, duplicate retry, changed-content rejection, unchanged access grants, snooze, archived reminders and completion.
- Visual source pass: one existing private-note warning (`CollaborationTimeline.tsx`, conditional amber border). Kept deliberately: it distinguishes private content with a lock and explicit label; it is not a decorative card treatment. No broad visual redesign performed.

## Decisions and limits

No model calls, extraction changes, new clinical scoring or named-product advice. No automatic sharing of policy documents. Existing personalization flags and consent remain intact. Dev fixtures use reserved test accounts and are removed after the journey. In-app thread persistence is tested; email arrival at a real mailbox is not claimed.

Employer/group-cover profile modelling and evidence-backed natural-language search were persona-driven extensions in the review, not verified defects. They remain a separate product increment; the existing document intake can already accept supported group branches. Real-PDF accuracy benchmarking is outside this UI/workflow release.

Production promotion and its read-only verification are recorded after the preview journey in STATUS; a green unit suite alone is not release evidence.
