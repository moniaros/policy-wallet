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
- Thread status controls have their own wrapping row, with measured label containment and 44 px targets at 320/390/430 px. Desktop/mobile use the same Actions label. The policy preview describes AI reading and pending checking separately. Greek and English copy was reviewed and its inventory updated intentionally.

## Verification record

- API authorization inventory: 116 routes, zero findings. TypeScript, ESLint, changed-string i18n and tracked UTF-8 checks passed during implementation.
- Development migration verification: 88 migrations; database up to date. No schema/catalogue/price changes or production data repair required.
- Unit suite: 697 files / 7,861 tests passed, including current unread counts and nonnumeric amount handling. Final release checks are recorded in STATUS.
- Development browser journeys: home, document-first intake, separate notification history, cross-line discount benefits, consent/progress persistence, keyboard, language and nested anchor navigation passed at 320/390/430/1280 px. The advisor journey passed: it checks an induced failed send, unchanged draft, exact recipient, persisted message, duplicate retry, changed-content rejection, unchanged access grants, snooze, archived reminders and completion.
- Visual source pass: one existing private-note warning (`CollaborationTimeline.tsx`, conditional amber border). Kept deliberately: it distinguishes private content with a lock and explicit label; it is not a decorative card treatment. No broad visual redesign performed.

## Decisions and limits

No model calls, extraction changes, new clinical scoring or named-product advice. No automatic sharing of policy documents. Existing personalization flags and consent remain intact. Dev fixtures use reserved test accounts and are removed after the journey. In-app thread persistence is tested; email arrival at a real mailbox is not claimed.

Employer/group-cover profile modelling and evidence-backed natural-language search were persona-driven extensions in the review, not verified defects. They remain a separate product increment; the existing document intake can already accept supported group branches. Real-PDF accuracy benchmarking is outside this UI/workflow release.

Production promotion and its read-only verification are recorded below; a green unit suite alone is not release evidence.


## Release record

- Implementation PR: [#396](https://github.com/moniaros/policy-wallet/pull/396), final code revision `7e492b08de529be72bfd9fc250878c70943264fe`.
- Exact-revision local checks were repeated after the final mobile correction: API inventory, ESLint, TypeScript, changed-string i18n, UTF-8, 88-migration dev status, 697 unit files / 7,861 tests, production build and the complete advisor journey passed. The mobile journey records control boxes and checks unclipped labels at 320/390/430 px.
- Protected final preview: [policy-wallet-2b83c6yzo](https://policy-wallet-2b83c6yzo-moniaros-projects.vercel.app), deployment `dpl_AE4XgdALG69jrXCtENYJpAkrxEfb`. Created from a clean Git archive; unrelated local files and local env files were excluded.
- Preview configuration decision: the initial dev-backed preview passed the advisor journey but later exhausted the 15-client session pool. Runtime logs confirmed `EMAXCONNSESSION`. Superseded previews were removed; the final preview uses the existing dev transaction pool through deployment-scoped `POOLED_DATABASE_URL`, with two connections per instance. Local and production configuration were not changed.
- Secret-handling decision: the initial environment upload was rejected by automatic approval review. Ownership of the Vercel project and its existing production domain was then verified; the accepted retry excluded the service-role/provider/mail keys and reused auth secrets, generating an isolated preview auth secret. Vercel protection remained enabled. The initial CLI export could not reveal protected environment values; this did not establish that the stored configuration was absent.
- CI limitations: the external Kilo review could not start because its account lacked credits. The CI money-path job reports success but its journey is explicitly skipped without an E2E database secret; it is not counted as executed testing for this release. Payment code and prices are unchanged.
- Final preview result: **12 passed in 1.7 minutes** — one authentication setup and 11 product journeys, with no retries. This covers the advisor question/retry/reminder/snooze/history/completion flow, home and intake, benefit terms/progress, Greek/English, keyboard and 320/390/430/1280 px. PR CI [39580688417](https://github.com/moniaros/policy-wallet/actions/runs/39580688417) passed. PR #396 merged as `ecc83edad20cf0292552bf85be02d2b381d2b8eb`; its Git tree exactly matches the previewed head (`35efabab350aecb7153b6357ded324983572a517`). Production deployment and read-only checks are recorded below.

- Post-journey dev SELECT/count verification: zero temporary cross-line-benefit policies, zero temporary advisor-question threads and zero temporary reminder events remain. The local browser-test auth state was restored and ephemeral preview access-cookie files removed.

- Merged-revision CI [39582021544](https://github.com/moniaros/policy-wallet/actions/runs/39582021544) passed; automatic production workflow [39583527207](https://github.com/moniaros/policy-wallet/actions/runs/39583527207) completed successfully for `ecc83eda` at 10:22 UTC.

- Production alias verification: `www.policywallet.gr` resolves to ready deployment `dpl_39x1pK78zUzJSaNkhDNhMqVEAYMG`, [policy-wallet-g7rhkx5tk](https://policy-wallet-g7rhkx5tk-moniaros-projects.vercel.app). The workflow checked out the CI-green merged revision. No production environment settings were changed.
- Production schema queries (not only command exit): project `cquudefwfwrmvpftuhyl`, 88 applied migrations and no pending migrations; all three prevention tables have RLS enabled, with 34 columns and five cascading foreign keys. No migration was needed/applied in this release.
- Authenticated production smoke: current-first policy cards and the missing-renewal prompt rendered; the home benefit link opened its exact card; both benefit views and historical disclosure worked; the benefit opened an editable advisor question with the intended recipient and disabled send until explicit confirmation. Reminder history retained separate deliveries and its action link opened the exact action. The expanded income explanation rendered the corrected employment/benefits conditions without the removed monetary scenario. No production messages were sent or action states changed. The browser was returned to the dashboard.
- The production deployment error-log query returned zero rows in its ten-minute sample. This is bounded smoke evidence, not a claim of error-free operation or provider delivery.
