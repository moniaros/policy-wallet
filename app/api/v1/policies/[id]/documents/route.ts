import { storedDocumentLabel, downloadFileName } from "@/lib/wallet/document-label"
import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { withApiGuard } from "@/lib/api-guard"
import { z } from "zod"
import { msFromNow, DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS } from "@/lib/constants/time"
import { getPolicyAccess } from "@/lib/policy-access"
import { ingestPolicyDocument } from "@/lib/ingestion/ingest-policy-document"
import { hasPlaceholderIdentity } from "@/lib/wallet/policy-identity"
import { createSignedUrlForStoredObject } from "@/lib/supabase/storage-download"
import {
    validateUploadFile,
    REJECTION_MESSAGES,
    MAX_DOCUMENTS_PER_POLICY,
    MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/security/file-upload"
import { DOCUMENT_KINDS } from "@/lib/services/ai/document-kind"

const policyDocumentParamsSchema = z.object({
    id: z.string().min(1),
})

// ONE size limit for "attach a document to my policy", whichever door it
// enters through. This route carried its own 10 MB literal while the renewal
// server action (PolicyService.attachRenewalDocument) validated with the
// product-wide 15 MB default — the same user action got a different limit
// depending on which button they pressed, and the UI copy could only state
// one number. The validator's default (MAX_UPLOAD_SIZE_BYTES) is the single
// source; the old 10 MB had no stated rationale and rejected scanned policy
// booklets that every other upload surface accepts.

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { params: policyDocumentParamsSchema },
        rateLimit: {
            limit: 20,
            windowMs: 60 * 1000,
            key: ({ auth, params }) => `policy:document:upload:${auth?.dbUser.id || "anonymous"}:${params.id}`,
        },
    },
    async ({ req, auth, params }) => {
        const authResult = auth!
        const { id } = params

        try {
            const formData = await req.formData()
            const file = formData.get("file")

            if (!(file instanceof File)) {
                return createApiError("BAD_REQUEST", "No file provided", 400)
            }

            // Full validation: size (the product-wide 15 MB), extension allowlist,
            // content-type cross-check, and magic-byte signature — content, not
            // just the header.
            const validation = await validateUploadFile(file, {
                category: "policy",
                maxBytes: MAX_UPLOAD_SIZE_BYTES,
            })
            if (!validation.ok) {
                // `details.reason` is the machine-readable UploadRejectionReason:
                // the message is English-only by design (API responses and logs),
                // so a client localises off the code via uploadRejectionMessage.
                return createApiError("BAD_REQUEST", REJECTION_MESSAGES[validation.reason], 400, {
                    reason: validation.reason,
                })
            }

            // Optional, and validated against the closed vocabulary rather than
            // trusted: the bulk-upload flow already knows what the classifier
            // decided this document was, and passing it through is the only way
            // the record gets a real document type instead of a guess from the
            // file extension.
            const declaredKind = formData.get("documentKind")
            const documentKind =
                typeof declaredKind === "string" && (DOCUMENT_KINDS as readonly string[]).includes(declaredKind)
                    ? declaredKind
                    : null

            const access = await getPolicyAccess(id, {
                id: authResult.dbUser.id,
                roles: authResult.dbUser.roles,
            })
            if (!access.exists) {
                return createApiError("NOT_FOUND", "Policy not found", 404)
            }
            if (!access.canManageDocuments) {
                return createApiError("FORBIDDEN", "You do not have permission to add documents to this policy", 403)
            }

            const policy = await db.policy.findUnique({ where: { id } })
            if (!policy) {
                return createApiError("NOT_FOUND", "Policy not found", 404)
            }

            // Abuse cap: per-minute rate limits don't bound TOTAL volume — a
            // patient caller could attach unbounded files to one policy.
            const documentCount = await db.policyDocument.count({ where: { policyId: id } })
            if (documentCount >= MAX_DOCUMENTS_PER_POLICY) {
                return createApiError("BAD_REQUEST", "Document limit reached for this policy", 400, {
                    reason: "document_limit",
                })
            }

            // Derive source from the uploader's actual role in this policy —
            // never trust the form value for provenance.
            const source = access.isOwner ? "policyholder" : "agent"

            // ONE door for policy documents (lib/ingestion/ingest-policy-document.ts):
            // bytes, then the document gate — in ATTACHMENT mode, which admits
            // the terms booklet, the premium receipt or a claim form and
            // refuses a menu — then storage, then the row carrying the gate's
            // stamp. The client's `documentKind` is a hint the gate's own
            // reading overrides; the policy's branch is the declared one when
            // the policy has been read (a placeholder identity declares nothing).
            // This route used to attach anything with the right magic bytes as
            // `pending`, and `selectSourceDocument` then preferred a client-
            // declared `policy_schedule` for the next analysis run.
            const ingest = await ingestPolicyDocument({
                actorUserId: authResult.dbUser.id,
                ownerUserId: policy.ownerUserId,
                file,
                surface: "attachment",
                mode: "attachment",
                existingPolicyId: id,
                declaredBranch: hasPlaceholderIdentity(policy) ? null : policy.lineOfBusiness,
                declaredBranchSource: "policy",
                documentKind: documentKind as any,
                processingStatus: "pending",
                source: source as "policyholder" | "agent",
            })
            if (!ingest.ok) {
                if (ingest.kind === "upload_invalid") {
                    return createApiError("BAD_REQUEST", REJECTION_MESSAGES[ingest.reason], 400, {
                        reason: ingest.reason,
                    })
                }
                const status =
                    ingest.code === "DUPLICATE_DOCUMENT" ? 409
                    : ingest.code === "UPLOAD_REJECTIONS_THROTTLED" ? 429
                    : ingest.code === "AI_UNAVAILABLE" ? 503
                    : 422
                return createApiError("DOCUMENT_REJECTED", "The document did not pass validation", status, {
                    code: ingest.code,
                    status: ingest.status,
                    documentType: ingest.documentType,
                    documentKind: ingest.documentKind,
                    detectedBranch: ingest.detectedBranch,
                    resolvable: ingest.resolvable,
                    ...(ingest.existingPolicyId ? { existingPolicyId: ingest.existingPolicyId } : {}),
                })
            }
            const document = await db.policyDocument.findUniqueOrThrow({ where: { id: ingest.documentId } })

            await (db.activityLog as any).create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "DOCUMENT_UPLOADED",
                    // GENERATED, like the document row 30 lines above. An
                    // activity log is a persistent sink in the same database:
                    // fixing the PolicyDocument row and leaving this line wrote
                    // "Uploaded document CASH IN SAFE.pdf" into prod, which
                    // names the covered contents to anyone reading the log.
                    description: `Uploaded document ${storedDocumentLabel({})} for policy ${policy.policyNumber}`,
                    metadata: { policyId: id, documentId: document.id, documentType: ingest.verdict.documentType },
                    timestamp: new Date()
                }
            })

            // Same short life as the download path (5 min), not the hour this
            // used to mint. /trust tells the reader a document link "expires
            // within minutes"; an hour-long link returned here made that false
            // even though no client reads this field today.
            const signedUrl = await createSignedUrlForStoredObject(
                document.fileUrl,
                DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS,
                // Saves as policywallet-<lob>-<number>.pdf rather than the
                // storage UUID — and never as the name the user uploaded.
                downloadFileName({
                    lineOfBusiness: policy?.lineOfBusiness,
                    policyNumber: policy?.policyNumber,
                    mimeType: document.mimeType,
                })
            )

            return createApiResponse({
                id: document.id,
                policy_id: document.policyId,
                file_name: document.fileName,
                file_size: document.fileSize,
                file_url: document.fileUrl,
                signed_url: signedUrl,
                signed_url_expires_at: signedUrl
                    ? msFromNow(DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS * 1000)
                    : null,
                processing_status: document.processingStatus,
                uploaded_at: document.uploadedAt
            })
        } catch (error) {
            console.error(error)
            return createApiError("INTERNAL_ERROR", "Upload failed", 500)
        }
    }
)
