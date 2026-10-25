# PW-INGEST-01 — Getting policies in without hunting for PDFs

| | |
|---|---|
| **Wave** | 1 |
| **Step 0** | Fable 5.1 · xhigh · `step0-investigator` |
| **Build** | Opus 5.5 · high. UI: `ui-implementer` |
| **Review** | `adversarial-reviewer` · Security review: **yes** (inbound email, uploads) |
| **Waits on** | H6 (inbound-email provider and domain) for forwarding. H5 for the health-data redaction choice. |
| **Session start** | STATUS.md + this file |

## Customer outcome
- I forward my insurer's email to a personal address and the policy appears.
- I photograph a multi-page paper policy and it's read as one document.
- A renewal I upload is recognised as the next version of a policy already on file.
- I can choose that health documents are processed only inside the EU, or with medical details hidden.

## Step 0 — investigate, no code
1. **Current upload path:** file types, size limits, storage, the AI-consent check point, the extraction call, and where `__PENDING_EXTRACTION__` and `PENDING-<epoch>` originate.
2. **Forwarding design.** A per-user unguessable address; provider options (shortlist; Eli picks under H6); SPF/DKIM checks on the sender; attachment allow-list; size caps; quarantine for unknown senders. **No AI processing before the consent check passes.**
3. **Multi-page capture.** Client-side page ordering, deskew, merge to one PDF before upload. Reuse the existing pipeline.
4. **Renewal matching.** A deterministic match on policy number + insurer + insured asset (ASSET-01). Uncertain matches ask the user. A matched renewal becomes a new version linked to the old one, which feeds RENEWAL-01.
5. **AI processing options** (customer dislike 7):
   - Can extraction for health branches route to an EU-region provider endpoint?
   - What would pre-upload redaction of medical details cost in accuracy?

   Present the options with trade-offs; Eli decides under H5.
6. **Subprocessor impact.** Any new provider must be added to `/subprocessors` and the Privacy Policy. Draft the change; don't publish it.

## Build (after approval)
Forwarding inbox → quarantine → consent-gated ingestion → multi-page capture → renewal version linking → the chosen health-processing option.

## Acceptance criteria
- Forwarded email with a PDF from a verified sender → policy appears on the matching asset. Unverified sender → quarantine, no processing.
- A 6-page photo capture → one document, pages in order.
- Renewal fixture → linked as v2. Ambiguous fixture → confirmation prompt, no auto-link.
- No placeholder or token reaches any customer surface during or after ingestion (token-leakage guard green).
- CRITICAL 0 from both reviewers.

## Guards (fail first)
Consent-before-processing on every ingestion path. Token leakage (per commit). Attachment type and size enforcement.

## Out of scope
Insurer portal scraping or connectors. Any change to the extraction schema beyond the asset identifiers and renewal linking.

## Halt
H6, H5. Any new subprocessor going live before the DPO approves the Privacy and subprocessor page changes.

## /goal
```
/goal Ingestion paths in the approved STEP0 work on preview with consent enforced before any AI call, all acceptance criteria in docs/series/PW-INGEST-01.md are shown met in RESULT.md, guards' failing-first output is printed here, and both reviewers print CRITICAL: 0 — or stop after 60 turns.
```
