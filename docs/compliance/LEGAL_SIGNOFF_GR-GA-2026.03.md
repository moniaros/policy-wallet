# Legal Sign-Off Packet (GR-GA-2026.03)

## Scope
1. Product: PolicyWallet (policyholder + agent + admin surfaces).
2. Market: Greece (public GA).
3. Languages: Greek (`el`) and English (`en`).
4. Documents under legal approval:
5. Terms of Service (`/terms`)
6. Privacy Policy (`/privacy`)

## Approved Content Version
1. Terms/Privacy version id: `GR-GA-2026.03`
2. Last updated label rendered in UI: `March 2, 2026`
3. Source of truth:
4. `lib/legal/legal-content.ts`
5. `components/legal/LegalDocumentPage.tsx`

## Runtime/API Alignment Evidence
1. Consent APIs in scope:
2. `POST /api/v1/consents`
3. `GET /api/v1/consents/current`
4. GDPR APIs in scope:
5. `POST /api/v1/me/data-export`
6. `GET /api/v1/me/data-export/[id]`
7. `POST /api/v1/me/deletion-request`
8. `GET /api/v1/me/deletion-request/[id]`
9. Version alignment implementation:
10. `lib/compliance/consent.ts` uses `LEGAL_CONTENT_VERSION` for `terms` and `privacy`.

## Validation Checklist
1. Terms and Privacy render in both `el` and `en`.
2. Section parity is enforced between Greek and English documents.
3. Greek content is normalized (no mojibake at runtime).
4. Consent policy versions for `terms` and `privacy` match `GR-GA-2026.03`.
5. Unit tests cover legal parity + version alignment.

## Engineering Evidence
1. Files:
2. `tests/unit/legal-content-parity.test.ts`
3. `lib/legal/legal-content.ts`
4. `lib/compliance/consent.ts`
5. `app/(public)/terms/page.tsx`
6. `app/(public)/privacy/page.tsx`

## Legal Approval Record
1. Status: Pending legal signatures.
2. Required approvers:
3. Legal Counsel (Greece)
4. DPO / Compliance Lead
5. Product Owner

| Role | Name | Decision | Date (YYYY-MM-DD) | Notes |
|---|---|---|---|---|
| Legal Counsel (GR) |  | Pending |  |  |
| DPO / Compliance Lead |  | Pending |  |  |
| Product Owner |  | Pending |  |  |

## Release Gate Statement
1. This artifact must be signed before hard go/no-go.
2. Any post-sign-off content edits to terms/privacy require:
3. New version id.
4. Updated parity/version checks.
5. Re-approval by legal/compliance.
