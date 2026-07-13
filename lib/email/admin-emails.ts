import { sendEmail } from "@/lib/email/email-service"

/**
 * Internal ops alerts sent to the PolicyWallet admin inbox. Greek-only on
 * purpose — these are not user-facing and the ops language is Greek.
 */

const DEFAULT_ADMIN_NOTIFICATION_EMAIL = "agentriseinsurance@gmail.com"

export function resolveAdminNotificationEmail(): string {
    return process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_NOTIFICATION_EMAIL
}

function getBaseUrl() {
    return process.env.NEXTAUTH_URL || "http://localhost:3000"
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

const ROLE_LABELS: Record<string, string> = {
    policyholder: "Ασφαλισμένος",
    agent: "Ασφαλιστικός σύμβουλος",
}

export interface AdminSignupNotificationParams {
    name: string
    email: string
    phoneNumber?: string | null
    role: string
    language?: string | null
    /** True when a phantom (agent-invited) account was activated instead of a brand-new row. */
    isInvitedActivation: boolean
    registeredAt?: Date
}

/**
 * One email to the admin inbox for every completed self-registration —
 * both brand-new accounts and invited-customer activations. Callers must
 * treat it as fire-and-forget: sendEmail never throws, and signup must
 * never block on this.
 */
export async function sendAdminSignupNotificationEmail(params: AdminSignupNotificationParams) {
    const registeredAt = params.registeredAt ?? new Date()
    const roleLabel = ROLE_LABELS[params.role] || params.role
    const kind = params.isInvitedActivation
        ? "Ενεργοποίηση προσκεκλημένου λογαριασμού"
        : "Νέος λογαριασμός"
    const when = registeredAt.toLocaleString("el-GR", {
        timeZone: "Europe/Athens",
        dateStyle: "short",
        timeStyle: "short",
    })

    const rows: Array<[string, string]> = [
        ["Όνομα", params.name],
        ["Email", params.email],
        ...(params.phoneNumber ? ([["Τηλέφωνο", params.phoneNumber]] as Array<[string, string]>) : []),
        ["Ρόλος", roleLabel],
        ["Τύπος", kind],
        ...(params.language ? ([["Γλώσσα", params.language]] as Array<[string, string]>) : []),
        ["Ώρα (Ελλάδας)", when],
    ]

    const tableRows = rows
        .map(
            ([label, value]) => `
                <tr>
                    <td style="padding: 6px 14px 6px 0; color: #64748b; font-size: 14px; white-space: nowrap;">${escapeHtml(label)}</td>
                    <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${escapeHtml(value)}</td>
                </tr>`
        )
        .join("")

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
            <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;">
                <h2 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">Νέα εγγραφή στο PolicyWallet</h2>
                <table style="border-collapse: collapse;">${tableRows}</table>
                <a href="${getBaseUrl()}/admin/users" style="display: inline-block; margin-top: 18px; background: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 18px; font-weight: 600;">Άνοιγμα διαχείρισης χρηστών</a>
            </div>
            <p style="margin: 14px 0 0 0; color: #64748b; font-size: 13px;">Αυτόματη εσωτερική ειδοποίηση — δεν απαιτείται ενέργεια.</p>
        </div>
    `

    return sendEmail({
        to: resolveAdminNotificationEmail(),
        subject: `Νέα εγγραφή στο PolicyWallet — ${params.name}`,
        html,
    })
}
