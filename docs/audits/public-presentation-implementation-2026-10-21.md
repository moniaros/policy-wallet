# Public presentation implementation — 21 October 2026

Scope: correctness findings from the approved presentation review, followed by the first
public presentation slice (home, pricing introduction, professional landing). Implemented
on isolated `codex/public-presentation`, based on `7116f67c`; the root checkout contained
concurrent policyholder/B2B work and was left untouched. No production rollout is claimed.

## Correctness — separate from visual preference

- Professional header signup preserves `role=agent`, source and locale on desktop/mobile;
  the professional footer no longer presents consumer Family copy.
- Team metadata states viewer role, own/team financial scope and whether a member’s revenue
  is visible. Hidden values render as restricted, not €0; existing server masking remains.
  Only authorized invitation/removal/role controls render. Rejected actions show an error;
  create/invite inputs survive rejection. The agency plan prerequisite precedes its form.
- Privacy export copy no longer promises a complete export. Public/agent explanation copy
  no longer promises certainty or tells the agent what advice to give.
- The reading-example anchor now resolves. Sample output no longer invents an end date or
  statutory limits absent from its own illustrative source. Unknown remains for review.
- Permission descriptions now use readable text and stack at narrow widths.
- Production build exposed existing synchronous-or-promise type declarations incompatible
  with Next 16.3.6. The shared API context and four legal pages now declare promised params;
  runtime authorization/validation behavior was not weakened.

## Presentation — does not independently gate launch

Preserved forest/mint and Inter. Added the Higgsfield editorial photograph (~94 KB WebP),
visible illustrative/AI caption, early semantic source/explanation demo, shorter audience
paths and expandable comparison. Removed the early glossary/editorial interruption and
repeated phone mockups; their destinations remain available elsewhere. Pricing now shows
plan names/prices in the first 1440px desktop viewport. The professional hero shows its
client example immediately and three lower examples have consistent composition and
visible fictional-data captions. Decorative heading kickers were removed from the changed
home/professional sections. No background video or private policy upload to Higgsfield.

Asset: Higgsfield `e73df4b2-a8bb-49e1-a0c4-d39a3e8f3f35`; exact prompt/provenance accompany
`public/images/presentation/policy-review.webp`. The generated 1168×880 source was inspected
and kept at its native resolution. No invented testimonial, customer count or security badge.

## Verification

- Node 24. API inventory 116/116; lint, changed-string i18n, UTF-8 and type-check passed.
- Full suite: 696 files / 7,845 tests passed. Reviewer fix batch: 42 targeted tests passed;
  the Greek inventory was explicitly updated and reviewed additions recorded in the voice ledger.
- Production build passed. An earlier local build exhausted the shared dev session pool;
  the final build used a temporary one-connection-per-worker environment and completed
  without those errors. Committed environment files and product configuration were not changed.
- `verify:migrations`: dev schema valid; 88 migrations; database up to date. No schema/data
  change, so identical dev→prod mutation and production data verification are not applicable.
- Twelve production-build browser cases cover Greek/English, saved light/dark themes,
  widths 320/390/430/768/1440, keyboard demo selection, real example-anchor navigation,
  billing/audience controls, professional signup roles and visible example captions.
  Exact outcomes and screenshots: `docs/evidence/public-presentation-2026-10-21/`.
- Automated accessibility checks are limited to `main` on representative home/pricing/agent
  cases; they are not a complete accessibility or security certification. The detected
  closing-kicker contrast issue was removed with the reviewer fix batch.
- Repeat with Node 24: `BASE_URL=http://localhost:3002 node scripts/verify-public-presentation.cjs`.
  This creates a fresh anonymous browser and selects necessary-only cookie consent locally.

## Decisions taken

The user approved the direction and delegated reversible implementation choices. Used the
approved audit and working responsive renders rather than reopening mockup approval.
Chose one static Higgsfield photograph; a video would add weight without clarifying the task.
Kept the authenticated policyholder identity; broader app redesign is the next tranche.
Reconciled the specific stale passkey/plan and public-eyebrow documentation found by review;
other historical product/design debt was not treated as verified truth.

## Remaining environment issue / release boundary

Local Upstash credentials reject `evalsha`/`zincrby`. The existing code logs rate-limit/
analytics fallback errors; no rate-limit guard was bypassed or weakened to make UI checks
pass. These local credentials need correction for a clean infrastructure smoke. This does
not establish production’s Redis state. Production was not changed or tested by this slice.
Integrate the isolated branch with concurrent root work, then perform the normal deployment
preview journeys before a production merge.

## Independent design review

Initial disposition: **fix**. Findings: visible professional sample labels, the orphaned
portfolio card, decorative heading kickers and stale product/public-design guidance.
All four received a single implementation batch and a final recapture for reviewer verdict.
Final disposition: **ship**. No outstanding material findings within the review scope.

| Finding | Final status |
|---|---|
| Professional sample disclosures and caption contrast | Resolved |
| Orphaned portfolio card | Resolved |
| Decorative heading kickers | Resolved |
| Persistent product/public-design documentation | Resolved |

Final capture: all twelve browser cases passed with no overflow or page JavaScript errors.
All four scoped automated accessibility scans reported zero violations. This does not expand
the review into a full-site accessibility or backend security certification.

## Second presentation round and integration

The owner requested a broader Bitpanda-inspired refinement, removal of the visible AI-generation caption, integration with the current work, and production deployment. This supersedes the first-round photo-caption direction. Policyholder release #396 (`ecc83eda`) is merged into candidate `99313285`.

Presentation changes: full-width forest public navigation, an edge-to-edge photograph beside the forest homepage copy, neutral document-reading proof, a consistent public H1 scale and 12px public actions. Decorative category eyebrows were removed from 25 compositions. The route-group stylesheet reaches both locale trees, including branch, trust, guide and legal pages, while preserving the authenticated app. Shared auth now has a clear form column and desktop photographic companion; utility screens no longer reserve an empty second column. No additional imagery or video was needed; the existing Higgsfield asset supplies the human context. The visible generation caption is gone, and asset provenance remains in its sidecar.

Correctness findings remain separate: the browser journey found the homepage email was discarded on signup. The signup default now accepts that editable value, bounded to 254 characters; it confers no authentication or verification status. Sign-in inputs explicitly identify their username/current-password autocomplete purpose. Independent review caught a 288px image child overflowing its smaller mobile container; the minimum was removed, with equal photo/container boxes verified at 320 and 390px.

Verification on the integrated local production build:
- 700 unit files / 7,873 tests passed. Three unchanged headings triggered fuzzy copy-budget matches after nearby category labels were removed; narrow documented exemptions identify those exact strings rather than weakening the guard.
- All 77 public route, heading, link-graph, overflow and closed-menu checks passed across both language trees. Local-only Vercel analytics endpoints are stubbed by the test harness; deployed runs retain the real endpoints.
- 12 public presentation scenarios passed at 320/390/430/768/1440px, including keyboard demo controls, pricing audience/billing and professional signup routing. Four whole-page axe scans returned zero violations.
- 11 auth scenarios passed: Greek/English, light/dark, desktop/mobile, empty submission, phone/email switching, password recovery, role routing, homepage email prefill, password reveal, required terms and utility states. All 11 axe scans returned zero violations. No successful paid checkout or hardware passkey assertion is claimed.
- API inventory 116/116, ESLint, TypeScript, i18n, UTF-8, dev migration verification (88 migrations), and the final production build passed. No schema, pricing, payment or production-data write is part of this release.
- Independent finish review disposition: **ship**. Mobile containment and persisted design grammar both resolved. The optional Kilo review could not run because its account lacks credits; this is not counted as a completed review.

Deployment evidence is appended after the protected preview journeys and production verification. PR: https://github.com/moniaros/policy-wallet/pull/397.


Protected preview `policy-wallet-o1lw32r3s-moniaros-projects.vercel.app` (`dpl_5ksaN8tyJU4hMjdmPcx2sehkVCn3`) used the development database through a deployment-scoped transaction pool, two connections per instance; production config was not copied from this preview. All 77 public assertions, 12 presentation scenarios, 11 auth scenarios and 12 integrated policyholder tests passed. The application CSP correctly refused Vercel's injected feedback toolbar; the documented automation header did not remove that injected script here, so a temporary test copy excluded only that exact warning on this preview hostname. Application errors remained asserted. [Vercel toolbar automation reference](https://vercel.com/docs/vercel-toolbar/managing-toolbar). Two public runners needed interruption during Chromium shutdown after every assertion and result file completed; auth and policyholder suites exited normally. Deployed interaction checks awaited hydration and React state updates.

The first merge attempt encountered the concurrent documentation-only release #398. Merge `e34bfae6` reconciled its status record; an empty non-doc diff proves it retains the preview's application code. PR #397 merged as `c4df0efe051723db9a6ffc4a24379004a4964f0b`, also with an empty non-doc diff. The redundant closed-PR CI run was cancelled; production run `39586111020` remains the deployment gate. No CI success or application test outcome was inferred from the cancelled run.

## Production release — verified 21 October 2026

Required CI [39586111020](https://github.com/moniaros/policy-wallet/actions/runs/39586111020) succeeded for `c4df0efe051723db9a6ffc4a24379004a4964f0b`. Automatic production deployment [39587498258](https://github.com/moniaros/policy-wallet/actions/runs/39587498258) succeeded at 10:54 UTC. Vercel deployment `dpl_2htTLzAoCpM4BnRzPQqizeKg8swf` is READY, target production, at `policy-wallet-hlv93cwnw-moniaros-projects.vercel.app`, aliased to https://www.policywallet.gr. The production build independently verified 88 applied migrations, none pending, three prevention tables with RLS, 34 columns and five cascade foreign keys. No migration or data mutation was needed.

Live checks confirmed the new full-width 80px desktop public header, photographic hero, loaded/contained mobile image and absence of the AI-generation caption. Eleven public routes (Greek/English home, pricing and agents, plus motor, trust, guides, privacy and terms) passed at 320/390/1440px with one H1 and no horizontal overflow. Four auth routes passed at those widths with the new auth shell. Sign-in empty validation and recovery dialog/Escape worked in both languages. Mobile menu open/Escape/focus restoration, reading-example keyboard selection, annual pricing/audience controls, homepage email query handoff and anonymous wallet redirect passed; the interaction run recorded zero page JavaScript errors.

Production deliberately pauses registrations. Both policyholder and agent signup display the correct localized pause screen; the existing gate was preserved. The initial live probe expected a form, then a temporary English assertion expected “temporarily” instead of the actual “paused”; both probe assumptions were corrected, and the final route verification passed. Actual signup form/prefill/reveal/terms behavior was verified on preview. No new account, paid checkout or hardware passkey challenge was attempted in production.

An optional production screenshot attempt timed out inside browser capture after fonts loaded; no production screenshot is claimed. Local/preview visual captures and independent review remain the visual evidence, supplemented by successful production DOM and interaction checks. The Money Path CI job is reported by GitHub as successful but skips its checkout journey without the E2E database secret; it is not evidence of a completed paid journey.

### Correctness / operational backlog (separate from presentation)
The production build warns that `POOLED_DATABASE_URL` is absent and it falls back to session pooling. This existing capacity risk is recorded, not silently fixed by changing credentials during a presentation release. Production schema verification and the live request checks succeeded; load capacity was not tested. The earlier local Redis credential warning remains local evidence only.

### Presentation backlog
This release covers the shared public and auth layer and integrates the existing policyholder work. It does not claim a complete redesign of all protected policyholder, agent or agency pages. The remaining protected surfaces are the next tranche.

Decision under standing authority: keep the existing static Higgsfield photo, retain production registration controls, reconcile the documentation-only concurrent merge, and deploy the CI-green application automatically. Release results are recorded in `docs/evidence/presentation-round2-2026-10-21/checks.json`; a docs-only follow-up stores this evidence without rebuilding application code.
