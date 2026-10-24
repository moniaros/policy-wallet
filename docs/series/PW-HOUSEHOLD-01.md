# PW-HOUSEHOLD-01 — Family logins and time-limited shares

| | |
|---|---|
| **Wave** | 3 |
| **Step 0** | Fable 5.1 · xhigh · `step0-investigator` |
| **Build** | Opus 5.5 · high |
| **Review** | `adversarial-reviewer` + `security-reviewer` (**mandatory**, both before deploy) |
| **Waits on** | H4 (membership/share tables). H5 (health visibility between members). |
| **Session start** | STATUS.md + this file |

## Customer outcome
- My spouse has her own login on our household.
- Each person's health policies are private to them by default.
- I can share one policy with my accountant, a tenant or my agent for a set time, and the access ends by itself.

## Step 0 — investigate, no code
1. **Existing access model:** owner, agent grant, invite redemption, and the Trust-page promises this must keep (agent access ends with the relationship, including policies the agent uploaded).
2. **Household model:** members, roles (owner, adult member, viewer), and which assets and policies each sees. **Health policies are visible only to the insured person unless H5 decides otherwise.**
3. **Shares:** per-policy or per-asset, an expiry required on every share, revocable, every access logged, viewer sees a read-only view. The share link never works without the recipient signing in, or uses a one-time code if Eli prefers (decide in approval).
4. **Minors in the household:** what a household with children means for consent and for which data can be shown. Propose; don't decide.
5. **Interaction with the agent portal and `redeemInvite`:** no new path for an agent to see a member's policies through the household.

## Build (after approval + H4 + H5)
Membership → per-role RLS → share grants with expiry → access log visible to the owner → UI.

## Acceptance criteria
- RLS test suite run as every role in the matrix (owner, member, viewer, share recipient, agent, revoked agent, anon): zero unexpected rows.
- Share expiry and revocation take effect on the next request (test with a clock skew fixture).
- A member's health policy is invisible to other members (test), unless DECISIONS.md records an H5 decision otherwise.
- SECURITY.md and REVIEW.md: CRITICAL 0.

## Guards (fail first)
RLS role matrix (runs per commit for these tables). Share-expiry enforcement. Health-visibility rule.

## Out of scope
Business workspaces (BUSINESS-01). Billing changes for household seats (H3).

## Halt
H4, H5. Any design that needs an agent to see a household member's data without that member's own grant.

## Carried in from PW-ASSET-01 (owner decisions 2026-10-24)
- **H-010 (open) now belongs here.** It covers two things: an insured-person name, and minimal cyber/business/pension `AcordData` objects. They form one schema decision, to be taken together and with H5's lawful basis. Until it is answered, health, life and travel policies stay «Χωρίς αντικείμενο» in the asset model (PW-A01-H010). Owner-created `person` assets exist (PW-A01-H016) and are never auto-matched.
- **Per-role RLS policies** for `insured_assets`, `policy_insured_assets` and `asset_match_suggestions` are deferred to this series (PW-A01-H014). PW-ASSET-01 ships them with ENABLE RLS and no policies, the same posture as `wallet_memberships`, and proves authorization in code and over HTTP. The RLS role matrix above must include those three tables.

## /goal
```
/goal Household membership and expiring shares from the approved STEP0 are on preview, the RLS role-matrix suite prints zero unexpected rows, all acceptance criteria in docs/series/PW-HOUSEHOLD-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and security-reviewer and adversarial-reviewer both print CRITICAL: 0 — or stop after 70 turns.
```
