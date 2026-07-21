# Policy Upload Pipeline — Security & Architecture Review

**Date:** 2026-07-21 · **Scope:** every code path that accepts, stores, retrieves, previews, or deletes an uploaded policy/document file. **Author:** security/architecture pass (staff-eng review).

> **Final QA audit (same day):** all four passes complete — filename handling, type validation, storage/retrieval/access control, scanning/abuse — plus a closing sweep that (a) **removed the `policies` folder from the generic `/api/v1/upload` route** (neither caller used it; it let any authenticated user write unassociated objects into the sensitive bucket root — policy docs must go through the policy-scoped, access-checked routes), and (b) stopped the extract route from echoing `error.message` (AI-provider internals) to clients on 500. Route now covered by `tests/unit/upload-route.test.ts` (6 cases). **Final state: 1098 unit tests, all CI guardrails + prod build (232 pages) green.** Pass/fail checklist in the session summary; open items are §5 (1) bucket SQL, (3b) async scan half, (4) retention cron, plus the historical-key migration and a browser pass on the signed-URL preview flow.

This document separates **shipped fixes** (in this change) from **open / manual follow-ups**. Broken-or-insecure items that gate trust are marked; UI/UX preferences are out of scope.

---

## 1. Architecture summary

Uploaded files are insurance PDFs and photos — **sensitive personal + financial data** (health data appears in policy PDFs). Two write paths reach Supabase Storage:

| Path | Who | How | Bucket |
|---|---|---|---|
| **B2C client-side** (`AddPolicyClient.tsx`) | policyholder | browser → Supabase `policies` bucket directly (anon session), then `createPolicy` server action records the DB row | `policies` |
| **Server-side** (`lib/storage.ts` `uploadFile`) | agent / API / onboarding / collaboration | route or action → service-role upload | `policies` (policy docs) / `uploads` (everything else) |

The B2C path uploads **direct-to-storage from the browser on purpose**: policy PDFs can exceed the serverless request-body limit, so routing 15 MB through a function would regress large uploads. That constraint shaped the fixes — the client path is hardened in place, not rerouted.

Retrieval is server-side only: analysis downloads via the **service-role** client (`downloadPolicyDocument`), and a signed-URL helper exists (`createSignedUrlForStoredObject`, 1 h expiry). The `policies` bucket is documented as **private** with authenticated RLS. Deletion of a whole policy removes its storage objects; single-document deletion did not (fixed here).

---

## 2. Threat model (upload surface)

- **Actors:** anonymous internet (blocked by auth), authenticated policyholder, authenticated agent, malicious authenticated user (primary threat), compromised client.
- **Assets:** policy PDFs (PII/health/financial), storage keys, filenames, the storage bucket itself.
- **Entry points:** the two write paths above + `/api/v1/upload` (collaboration attachments), `/api/policies/extract` (AI parse), `/api/v1/policies/[id]/documents` (per-policy doc), `uploadAgentAsset` (logo/license), the collaboration `document-requests` PATCH (persists a document URL).
- **Attacker goals:** upload an executable/script disguised as a PDF; smuggle a spoofed content-type; traverse the storage path; overwrite another object; leak PII via filenames/keys/logs; inject an arbitrary URL where a storage reference is expected; exhaust storage.

---

## 3. Findings (by severity)

### Shipped in this change

| # | Sev | Finding | Fix |
|---|---|---|---|
| U1 | **High** | **Storage keys embedded the original filename** (`${timestamp}-${safeName}`). `John_Doe_Motor_AXA.pdf` → the key leaks the user, insurer, and product; keys are also enumerable and near-collision-prone. Violates the explicit "never trust the original filename as a storage name" requirement. | `uploadFile` now generates an **opaque `crypto.randomUUID()` key** with only the (validated) extension. Original name is kept **only** as sanitized DB display metadata. |
| U2 | **High** | **`uploadAgentAsset` performed no size/MIME/magic-byte validation** (the open item from `idor-policyholder-data.md`), and its `type` param flowed unchecked into the storage path prefix. | `uploadFile` now validates **every** server upload centrally (defense in depth); `type` constrained to `logo`\|`license`. |
| U3 | **Med** | **B2C client path bypassed all server content validation** and used `Math.random()` (non-crypto, weaker collision guarantee) for the key. | Key switched to `crypto.randomUUID()` + sanitized extension; `createPolicy` now rejects any `documentUrl` that is not one of **our** storage objects. (Byte-level content validation for this path → §5, needs bucket-level enforcement.) |
| U4 | **Med** | **Per-document DELETE orphaned the storage object** — only the DB row was removed, leaving the file (and its PII) in the bucket forever, with no cleanup cron. | DELETE now calls `deleteFile` (best-effort, logged) after removing the row. |
| U5 | **Med** | **`uploadedDocumentUrl` was persisted verbatim** on the collaboration `document-requests` PATCH — any authenticated party in the thread could inject an arbitrary off-site URL into the record (phishing / content injection). Status was also unvalidated. | URL must pass `isOwnedStorageUrl` (our host + our bucket); status constrained to an allowlist. |
| U6 | **Med** | **Unsanitized `file.name` persisted into audit-log descriptions & DB display fields** (log injection; stored-XSS risk if a log/admin view ever renders it unescaped). Also two ASCII-only sanitizers (`createPolicy`, `policy.service uploadAndParse`) **destroyed Greek filenames** — wrong for a Greek-market product. Raw names also reached the error logs (`policy.service.ts`) and the **third-party AI provider** (`parsePolicyPdfWithGemini` passed `file.name` — often the customer's name — as document metadata). | All display names go through `sanitizeDisplayName` (strips path/control chars, caps length, **preserves Greek**); the raw name was dropped from error logs and sanitized before the AI call. After the sweep, the only server-side reads of `file.name` are inside the validators themselves. |
| U7 | **Low/Med** | **Validation logic was duplicated and drifted** across five call sites — the main upload route had magic bytes; the documents route, agent actions, extract route, and onboarding had none or MIME-only. Inconsistent allowlists (`.doc/.docx` vs not; `heic` in one list, absent in another). Empty-ZIP `PK\x05\x06` was accepted as a valid `.docx`. | One module — `lib/security/file-upload.ts` — is now the single source of truth; every path calls it. Empty archives rejected; extension cross-checked against magic bytes. |

### Verified adequate (no change needed)

- **Auth on upload/retrieval:** the documents route uses `getPolicyAccess` + `canManageDocuments`; the docId DELETE is owner-scoped; onboarding actions derive identity from the session (`requireAgent`) — the earlier IDOR was already fixed. **No IDOR at the app layer.**
- **Rate limiting:** upload/documents/extract routes are Upstash-limited (20/min, 6/min for the paid parse).
- **Whole-policy delete** already removed storage objects.

---

## 4. What the shared module enforces (`lib/security/file-upload.ts`)

- **Allowlist, not blocklist:** `policy` category = pdf/jpg/jpeg/png/webp/heic; `document` category adds doc/docx (collaboration only — agents request documents customers often only have as Word files); `image` category (agency logos) = jpg/jpeg/png/webp only (no HEIC — browsers can't render it in `<img>`; no PDFs/Office docs). Anything else → rejected. Per-surface narrowing in the caller, central `uploadFile` backstop underneath.
- **Magic-byte signature** checked and **tied to the extension** — a `.pdf` must contain PDF bytes; renaming `evil.exe`→`x.pdf` fails.
- **Content-Type cross-check:** a specific, contradictory client `Content-Type` is rejected; empty/`octet-stream` tolerated. The **stored** content-type is derived from the verified content, never the client value.
- **Filename safety:** path separators, `..`, NUL, and control chars rejected; **double extensions** with a dangerous inner segment (`invoice.php.pdf`) rejected.
- **Opaque key generation:** `crypto.randomUUID()` + extension; optional server-controlled folder prefix; collision-resistant (upsert can't silently overwrite).
- **Display-name sanitization:** basename only, control/path chars stripped, length-capped, Greek-preserving, non-empty fallback.

Full coverage in `tests/unit/file-upload-security.test.ts` (29 cases) + `tests/unit/storage-upload.test.ts` (opaque-rename, content-derived type, content/extension mismatch, disallowed extension). **1060 unit tests green; type-check, lint, i18n, utf8, api-auth, and production build all pass.**

---

## 5. Open / manual follow-ups (not shipped — need infra or a product call)

1. **[GATES — verify] Confirm the `policies` bucket is truly private in prod, and add bucket-level enforcement.** The preview/download surfaces (`DocumentPreview`, `DocumentsCard`, the agent customer-policy page) embed the **raw** `…/object/public/policies/<key>` URL. If the bucket is public or has permissive SELECT RLS, that is **unauthenticated access to sensitive PDFs (IDOR)**; if private, those previews are already broken. Belt-and-suspenders, run against the project (buckets/RLS are **not** in migrations — provisioned out-of-band):
   ```sql
   update storage.buckets
     set public = false,
         file_size_limit = 15728640, -- 15 MB
         allowed_mime_types = array[
           'application/pdf','image/jpeg','image/png','image/webp','image/heic'
         ]
     where id = 'policies';
   -- same for 'uploads', adding the Office doc mime types it legitimately needs.
   ```
   This enforces size/type at the **storage layer**, closing the residual gap on the client-side B2C path (§U3) that app code cannot see the bytes for.

2. **[SHIPPED — needs a browser pass] Authorized signed-URL retrieval.** New `GET /api/v1/policies/[id]/documents/[docId]`: re-authorizes on EVERY request via `getPolicyAccess().canRead` (owner / policy-scoped grant / managing agent — the same rule the policy pages use), 404s without an existence leak, then 302s to a fresh **5-minute** signed URL (`Cache-Control: no-store`). Both rendering surfaces switched to it — `DocumentsCard` (wallet detail: download link + preview modal) and the agent customer-policy page — so **no raw storage URL is rendered anywhere anymore**. The local `public/` storage fallback now **refuses to run in production** (it would place documents on an unauthenticated path). Tests: `tests/unit/policy-document-access.test.ts` (8 cases — authorized redirect, unauthenticated, cross-tenant 404, nonexistent policy, cross-policy docId IDOR, signing-failure safety, owner delete + storage cleanup, cross-tenant delete 404). Outstanding: a live browser pass on the wallet preview modal + agent document links (dev Supabase unreachable this session).

3. **[SHIPPED — hook; needs an AV service to activate] Malware scanning: sync scan-before-store.** Decision: scanning runs **synchronously at the single server chokepoint** (`uploadFile`), on the raw bytes, BEFORE the object reaches the bucket — so a flagged file is never stored and no quarantine bucket/approval queue is needed on server paths. `lib/security/malware-scan.ts` posts the bytes to an HTTP scanner (`UPLOAD_SCAN_URL` + optional `UPLOAD_SCAN_TOKEN`, e.g. a ClamAV REST bridge; documented in `.env.example`). Semantics: unset env = dormant (`skipped`, today's behavior — safe to deploy); `infected` → upload rejected ("File failed security screening"); scanner outage/unknown payload → **FAIL CLOSED** (never guess clean). Tests: `malware-scan.test.ts` (8) + `storage-scan-gate.test.ts` (5 — infected/error never reach storage). **Remaining async half (schema-backed, when an AV vendor is chosen):** the B2C browser→storage path can't be scanned at upload time — add a `scanVerdict` column set by a scan step when the analysis pipeline first downloads the bytes, and have the document GET endpoint + orchestrator refuse anything `infected` (quarantine = existing `processingStatus:'pending'` until scanned). Needs `prisma migrate dev` (dev DB was unreachable this session).

4. **Orphan cleanup: failure-path SHIPPED, retention cron still open.** All four post-upload persist sites (documents POST, `uploadAndParse`, `addPolicyForCustomer`, `uploadAgentAsset`) now delete the just-stored object if the DB write fails after upload — rejection leaves no residue. Also new: **per-policy document cap** (`MAX_DOCUMENTS_PER_POLICY = 20`) on the documents POST — per-minute rate limits bound velocity, this bounds total volume. Still open: a periodic cron reconciling bucket objects against `PolicyDocument.fileUrl` (catches crashes between upload and cleanup, plus pre-existing orphans from the old delete bug).

5. **Decompression-bomb note.** `.docx` (OOXML zip) is accepted for collaboration attachments. We never decompress it server-side ourselves (only the AI provider ingests it), so the risk is low — but if we ever add server-side docx parsing, add an entry-count/expansion-ratio guard before extraction.

---

## 6. Recommended future controls

- Move bucket/RLS config into version-controlled SQL (currently out-of-band → drift risk).
- Emit a structured, immutable audit event on every upload/download/delete (recipient-language-safe, filename-free) rather than free-text activity-log descriptions.
- Consider per-user/day upload **count** caps (today only per-minute rate limits exist).
- Add an E2E spec for: opaque-rename on real upload, blocked-extension rejection, and signed-URL-gated retrieval once (2) lands.
