# PW-BUSINESS-01 — A space for the business

| | |
|---|---|
| **Wave** | 3 |
| **Step 0** | Fable 5.1 · xhigh · `step0-investigator` with **web research** |
| **Build** | Opus 5.5 · high. UI: `ui-implementer` |
| **Review** | `adversarial-reviewer` + `security-reviewer` |
| **Waits on** | H4 (workspace tables). H8 (legal check of mandatory-cover rules). H3 (business pricing). |
| **Session start** | STATUS.md + this file |

## Customer outcome
My company's policies sit in their own space, separate from the family's, with:
- its own monthly summary,
- an invoice carrying the company ΑΦΜ,
- a list of which insurance is legally required for my type of business,
- a summary of cover I can send to a landlord or client.

## Step 0 — investigate, no code
1. **Workspace model:** a personal household and one or more business workspaces under one login; assets and policies belong to exactly one workspace; switching is explicit.
2. **Invoicing.** Stripe tax ID collection for Greek businesses, invoice with company name and ΑΦΜ, and whether myDATA / e-invoicing obligations apply to PolicyWallet's own invoices. Research current official sources and cite them; flag for the accountant, don't decide.
3. **Mandatory-cover checklist.** Research current Greek rules by business type and size from official sources (including the natural-catastrophe cover requirement for businesses, if and as it currently applies). Every rule cites URL + access date and carries `under_review` until H8. When a rule can't be verified, it isn't shown.
4. **Cover summary for third parties.** It must **not** look like or be called a certificate of insurance. Title it «Σύνοψη ασφαλιστηρίων — δεν αποτελεί βεβαίωση ασφάλισης», with a generation date, and point to the insurer for an official certificate. Show a mock in STEP0.
5. **Agent-tier overlap.** Business owners are not agents. Confirm that nothing here exposes agent-facing severity or ranking to a policyholder.

## Build (after approval + gates)
Workspaces → switcher → business monthly summary → ΑΦΜ invoicing → obligations checklist (`under_review`) → cover summary export.

## Acceptance criteria
- Assets and policies can't appear in two workspaces (constraint + test).
- The cover summary export includes the disclaimer and date on every page; nothing on it resembles an insurer's certificate (reviewer check).
- Every checklist rule has a source and `verified_on`; the `under_review` flag hides it in production until H8 is recorded.
- CRITICAL 0 from both reviewers.

## Guards (fail first)
Workspace isolation (RLS). Rule-source presence. Export disclaimer presence.

## Out of scope
Group-scheme administration for employees. Payroll or HR data.

## /goal
```
/goal Business workspaces, ΑΦΜ invoicing and the disclaimed cover summary from the approved STEP0 are on preview, checklist rules are cited and hidden under under_review, all acceptance criteria in docs/series/PW-BUSINESS-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 70 turns.
```
