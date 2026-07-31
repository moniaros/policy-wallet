import { logger } from "@/lib/logger"
import { downloadPolicyDocument } from "@/lib/supabase/storage-download"
import { scanUploadBuffer } from "@/lib/security/malware-scan"
import {
    sniffAndValidate,
    MAX_UPLOAD_SIZE_BYTES,
    type UploadCategory,
    type UploadRejectionReason,
} from "@/lib/security/file-upload"

export type StoredUploadVerdict =
    | { ok: true; sizeBytes: number }
    | { ok: false; reason: UploadRejectionReason | "unreadable" }

/**
 * Validate an object the BROWSER uploaded straight to storage.
 *
 * The B2C upload path posts bytes from the browser to the Supabase `policies`
 * bucket with the anon key, then hands `createPolicy` only a URL. That path
 * therefore bypassed all three controls the server-side path enforces: the
 * magic-byte/extension cross-check in `lib/security/file-upload.ts`, the
 * malware-scan chokepoint in `lib/storage.ts`, and the server-enforced size
 * cap. `isOwnedStorageUrl` proved only that the URL pointed at our own bucket —
 * not what was inside it. Everything downstream, including the bytes sent to
 * an LLM, trusted an unexamined object.
 *
 * This closes that gap at the point where an object becomes a persisted
 * document: the server fetches the bytes with its own credentials and applies
 * the SAME shared policy to them, so a renamed executable or an oversized file
 * cannot become a policy document just because it was uploaded a different way.
 *
 * Fails CLOSED — an unreadable object is rejected, never assumed benign.
 */
export async function verifyStoredUpload(
    fileUrl: string,
    displayName: string,
    opts: { category?: UploadCategory; maxBytes?: number } = {}
): Promise<StoredUploadVerdict> {
    let bytes: Buffer
    try {
        bytes = await downloadPolicyDocument(fileUrl)
    } catch (error) {
        logger("warn", "Stored upload could not be read back for validation", {
            error: error instanceof Error ? error.message : String(error),
        })
        return { ok: false, reason: "unreadable" }
    }

    const verdict = sniffAndValidate(
        {
            name: displayName,
            // The client Content-Type is not available here and must not be
            // trusted anyway; the signature check is what decides the type.
            type: "",
            size: bytes.byteLength,
            header: new Uint8Array(bytes.subarray(0, 16)),
        },
        { category: opts.category ?? "policy", maxBytes: opts.maxBytes ?? MAX_UPLOAD_SIZE_BYTES }
    )
    if (!verdict.ok) return verdict

    // Dormant until UPLOAD_SCAN_URL is configured, and fails closed when the
    // scanner is configured but unreachable — same contract as lib/storage.ts.
    const scan = await scanUploadBuffer(new Uint8Array(bytes))
    if (scan.verdict === "infected" || scan.verdict === "error") {
        return { ok: false, reason: "infected" }
    }

    return { ok: true, sizeBytes: bytes.byteLength }
}
