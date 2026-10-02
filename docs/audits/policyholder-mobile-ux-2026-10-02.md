# Policyholder mobile UI/UX and content assessment — 2026-10-02

Method: dual-agent (A: design_assessment · B: evidence_assessment), with parent mobile inspection. Read-only production review using the authenticated embedded browser. No application, account, notification or policy changes. The original wallet tab and viewport were restored.

## Verdict

PolicyWallet has useful product depth and a coherent visual identity, but its mobile experience behaves like a long report rather than a focused personal insurance tool. Preserve the forest green, navy, calm backgrounds and practical policy details. The priority is trustworthy status and a shorter route to useful action, not a new palette or decorative effects. Revolut is a quality reference for clarity and speed, not an audited comparator or a proposed visual clone.

### Strengths

- Policy detail puts insurer, vehicle, expiry and a relevant renewal action together in the first viewport.
- Wallet cards provide practical information, including tappable roadside assistance. Search, filtering and comparison already exist.
- Source dates, document links, expandable sections and honest unknown/historical benefit wording provide a strong basis for trustworthy explanations.

## Broken / content correctness — separate from design preferences

1. **P1: Unsupported reassuring health status.** `/protection` says health appears covered beside “0 of 2” checks completed, with both unable to be checked. Dashboard reduces this to “Καλυμμένο”. Source tracing in `lib/protection/coverage-status.ts` shows the final reassurance guard handles all-indeterminate `no_extraction` outcomes specifically, leaving other indeterminate reasons able to reach `appears_covered`. `CategoryList` labels the covered numerator as checked. Establish a decidable evidence base before a positive verdict; distinguish checked, supported and unknown. This is a correctness issue, not a request to add another disclaimer.
2. **P1: Wrong policy context.** An Εθνική motor policy displays a recommendation naming Example Insurance Company Ltd under actions for this policy. A and parent independently observed it. Investigate recommendation selection and scope; either attach the correct policy or explicitly separate portfolio recommendations. This is not evidence of cross-user access.
3. **P1: Duplicate and unactionable notifications.** Two identical renewal events at the same timestamp and repeated pairs of summaries/overdue items appear in this account. Some include English legacy/test text and no destination to resolve the work. The exact duplicate-writing cause was not established. Server grouping uses stored dedupe keys, while unkeyed records remain separate. Header count is 147, but the client displays at most 24 grouped items, with no older-history navigation. Deduplicate logical events, separate actionable work from history, and link to the exact task.

Additional content assurance: a missing accident-report phone finding is labelled a legal requirement, while the displayed citation explanation concerns reporting an accident. Validate that the evidence supports this particular label; this review did not research or determine the legal requirement. Dashboard says no advisor connection while wellness shows an existing health-data share; verify relationship semantics before calling this an authorization defect.

## UI/UX improvement backlog

4. **P1: Prioritize the current task.** At 390×844 the dashboard measured 7,624 CSS pixels tall; the renewals section began around Y=3,774 despite an expiry in four days. Generic onboarding/exploration leads instead. Put that concrete renewal first, then owned policies and useful benefits. Collapse completed setup and secondary analytics. Attention links should preserve the selected finding, and status-count links should open a filtered wallet rather than making users rediscover the item.
5. **P1: Start intake with the document.** `/wallet/add` presents over 30 branch tiles before the file area, whose heading begins around Y=2,029 at 390px width. Let the person select or photograph the document first, then confirm the proposed type if needed. Retain validation, consent and the existing document gate; do not turn this UI recommendation into a bypass.
6. **P2: Make navigation recognizable.** Five bottom-nav icons have accessible names and measured 44×44px targets, but no visible labels. Add concise labels; give wallet cards a visibly named primary action. “Έλεγχος” currently means both expansion and navigation in recommendations; use distinct verbs and expose expansion state.
7. **P2: Reduce nested cards and competing explanations.** A summary, coverage map, personal picture, attention, renewals, progress, quick actions, wellness, advisor, monitoring and recent documents all compete on home. Use one answer and one limitation per section, with evidence expanded on demand. Fix the policy findings heading that wraps a Greek word mid-word; reduce padding layers that squeeze text into narrow columns. Keep strong color for an important state or action.

Minor observations: expired wallet cards still foreground benefits that need nearby historical context; generic daily wellness copy leads more useful insurance-linked benefits; deletion of health assessments appears to call the delete action directly without client confirmation/undo (source-only, never exercised). Secondary text readability deserves contrast/zoom testing, but no contrast violation was measured.

## Content and engagement direction

Greek coverage and provenance explanations are often good, especially the wellness distinction between “not recorded” and “not covered”. Consistency is the problem: reassuring verdicts, unknown checks, historical policies and internal analysis terminology coexist. Use a shared visible vocabulary for current cover, expired cover, unread documents, uncertain findings and human-confirmed facts. Keep exact source quotations distinguishable from platform explanations. Remove legacy English from generated/history surfaces as well as UI labels.

Recommended home order: one urgent event and its action → compact owned-policy list → a benefit the person can use → recent meaningful changes. Notifications should return the person to a specific unresolved action and stop repeating after resolution. Measure time to find a document, time to locate the renewal action, completed uploads, completed useful actions and duplicate notification rate. Do not invent numerical targets before a baseline. Insurance is episodic: timely, useful return visits matter more than daily habit loops.

## Heuristic assessment

Scores are expert inspection judgments, not measured usability, accuracy or release-readiness percentages. Parent synthesis lowers system status from A's provisional 3 to 2 after corroborating the zero-check reassurance.

| Heuristic | Score / 4 | Basis |
|---|---:|---|
| System status | 2 | Dates visible, but unsupported positive status |
| Real-world match | 2 | Concrete policy facts mixed with internal terminology |
| Control and freedom | 3 | Back navigation and disclosure work in reviewed paths |
| Consistency | 2 | Coherent visuals, inconsistent context and verdicts |
| Error prevention | N/A | No submissions exercised |
| Recognition | 2 | Icon-only visible navigation |
| Efficiency | 2 | Useful filters; long route to urgent work |
| Minimalism | 1 | Repeated modules and nested explanations |
| Error recovery | N/A | Failure/retry paths not exercised |
| Help and documentation | 2 | Help exists, often dense rather than contextual |
| **Total** | **16/32** | Limited read-only assessment |

Persona risks: a first-time user must learn icons and insurance terminology; a distracted mobile user must scroll past exploration to find urgency; a reader with low vision or cognitive accessibility needs faces small secondary copy and narrow text columns. These are inspection concerns, not a WCAG certification.

## Scope, detector and recommended sequence

Inspected dashboard, wallet, protection, recommendations, wellness, notifications, motor policy detail and upload. Main mobile viewport 390×844, with desktop dashboard at 1440×900. Agent B used a separate default desktop viewport. No upload, OCR, model accuracy, delivery, destructive operation, complete keyboard journey, offline behavior or performance benchmark was tested. No overlap or contrast violation is asserted without measurement.

The static Impeccable detector was actually run over the reviewed route/component directories: exit 0, JSON `[]`, zero findings. This pattern scan does not invalidate observed product defects. No detector overlay or live-page injection was used. A completed its visual assessment before B's results were incorporated.

Correct the three P1 trust/context issues first. Then use `$impeccable distill` for home hierarchy, `$impeccable onboard` for document-first intake, `$impeccable clarify` for status/action wording, `$impeccable layout` for navigation and narrow-screen composition, and `$impeccable polish` last. Reassess the same routes after changes. Questions skipped: this is an assessment with a clear priority order, and standing instructions request autonomous decisions rather than mid-run questions.

First run for this target: no trend yet. No application code or production data changed; only this report, the critique snapshot and session status were written.

## Local implementation — 2026-10-02

Verified against this workspace running on `http://localhost:3000`, using the already signed-in owner session. The local portfolio differs from production (one policy rather than six): the hierarchy/intake problems reproduced live; inconclusive health and wrong-policy recommendation conditions were confirmed in source and covered with regression fixtures rather than claiming they reproduced in this smaller portfolio.

Implemented:

- Zero supported coverage checks now give an inconclusive status, including non-empty extractions with absent/wrong-type inputs. Exact source policy IDs scope policy recommendations; same-branch and portfolio fallback removed. The detailed analysis no longer adds a duplicate “no gaps” statement beneath composition/provenance. Historical wallet benefit facts carry an explicit previous-period qualification.
- Renewal first on home, then owned policies and their AI reading/details, then prevention findings and policy benefits. Portfolio map, setup and activity remain in labelled disclosures; generic daily habits stay on wellness. Counts link to matching wallet filters. Home and advisor page use the same live-relationship scope.
- File-first intake defaults to the existing gate's automatic classification. Branch selection and manual details remain optional; validation, consent, quota and storage gates remain. No extra model call was added.
- Visible mobile navigation labels, direct prevention access, sentence-case analysis heading, clearer recommendation actions/expansion state. Finding links open the requested recommendation even beyond the initial three.
- Practical prevention/preparation steps now render before insurance discussion in expanded recommendations. A final browser pass caught tenancy being presented as proof of insurance/absence of cover: corrected both locales, removed unsupported loss amounts and flat branch premium estimates from the customer card, and removed guaranteed prevention/premium-savings claims. Live assessment prose replaces stored risk explanations (including home); policy-derived findings retain their source explanations. Unmatched policies are described as unmatched, not as proof of no coverage.
- Inbox shows delivered in-app records, matching the bell/watch/read paths. Other channel records remain in explicit delivery history, with pagination. A shared generated event key joins new unkeyed emissions across channels without treating separate emissions as duplicates. Older unkeyed rows remain separate in delivery history; no speculative merge or database cleanup. Pagination preserves the in-app read-state owner. Health-assessment deletion now asks for confirmation.

Validation: 7,751 unit tests passed across 680 files; 11 Playwright cases passed (including auth setup, three new mobile journeys and seven console checks), with the three changed mobile journeys repeated successfully after follow-up fixes. The final recommendation content/prevention change also has a rendered regression test and was checked in the owner's live local account. API inventory, lint, changed-i18n, UTF-8, type check, local production build and migration verification passed. Database reports 86 migrations, up to date; no migration or application-data repair was needed. Browser inspection at 320/390/1440 found no horizontal page overflow; renewal starts near Y=259 at 390px. This is not a like-for-like height comparison to the production six-policy portfolio.

Build verification note: a restricted Turbopack attempt cached a worker-port failure. The Webpack fallback compiled but exposed existing route-context type incompatibilities in its generated types. Moved only generated production cache/types to `/private/tmp/pw-build-cache-hh0uw0of`, then reran the standard Turbopack production build successfully. No application config or API guard was weakened, and the development server remained running.

Scope and decisions: local implementation for owner review; no merge or deployment in this turn. No real OCR run or outbound delivery was initiated. Legal-citation relevance remains a content-assurance question, not an adjudicated legal finding. Authored English demo messages were not automatically translated or deleted. No claim of OCR accuracy, full accessibility conformance or improved customer completion rate is made from these checks.
