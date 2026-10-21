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
