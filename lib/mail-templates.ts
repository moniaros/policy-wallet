import { absoluteUrl } from "./seo/site"
// Deep links live in lib/notifications/links.ts — one switch shared by the email
// CTA, the in-app bell and the push payload, so a new object type reaches all
// three at once instead of only the two that happened to be updated.
import { notificationActionPath } from "./notifications/links"
import { assertRenderableText } from "./wallet/policy-identity"

export type Language = "el" | "en"

export type EmailTemplateData = {
    title: string;
    description: string;
    actionUrl?: string;
    actionLabel?: string;
    footerText?: string;
};

export function getBaseTemplate({ title, description, actionUrl, actionLabel, footerText }: EmailTemplateData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { margin-bottom: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #29685B; text-decoration: none; }
        .content { background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb; }
        h1 { font-size: 22px; font-weight: 700; color: #111; margin-top: 0; }
        p { margin-bottom: 24px; color: #4b5563; }
        .button { display: inline-block; background-color: #29685B; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; }
        .footer { margin-top: 30px; text-align: center; font-size: 14px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="https://policywallet.gr" class="logo">PolicyWallet</a>
        </div>
        <div class="content">
            <h1>${title}</h1>
            <p>${description}</p>
            ${actionUrl && actionLabel ? `
            <div style="text-align: center; margin-top: 32px;">
                <a href="${actionUrl}" class="button">${actionLabel}</a>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <p>${footerText || `© ${new Date().getFullYear()} PolicyWallet. All rights reserved.`}</p>
        </div>
    </div>
</body>
</html>
    `;
}

// ── Shared transactional-notification email ──────────────────────────────────

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

const NOTIF_EMAIL_COPY: Record<Language, { view: string; footer: string }> = {
    el: {
        view: "Προβολή λεπτομερειών",
        footer: "Λαμβάνετε αυτό το μήνυμα επειδή έχετε λογαριασμό στο PolicyWallet.",
    },
    en: {
        view: "View details",
        footer: "You're receiving this because you have a PolicyWallet account.",
    },
}


/**
 * Branded HTML for a transactional notification email. EVERY notification email
 * (collaboration hand-offs, proposals, questionnaires, renewals, …) is rendered
 * through the shared PolicyWallet shell with the recipient-language title/message
 * and a deep-link CTA. Replaces both the old plain-text fallback (a bare sentence
 * as the whole body) and the per-event `templates` below, which rendered
 * `undefined` because sendNotification only ever passed them { id, language }.
 * Title/message are HTML-escaped — they interpolate user content (customer names,
 * proposal counter-offer notes).
 */
export function buildNotificationEmail(params: {
    title: string
    message: string
    relatedObjectType?: string
    relatedObjectId?: string
    language: string
}): { subject: string; html: string } {
    // §6.1.3 — the shared shell is the last stop before a customer's inbox, so
    // it refuses an unresolved identity rather than inheriting one from every
    // caller. The live dispatch path (lib/notifications/dispatch.ts) already
    // redacts, but THIS wrapper is what every notification email renders
    // through, and it once shipped «PENDING-1786738708923
    // (__PENDING_EXTRACTION__)» verbatim. Dev and test throw; production
    // scrubs and logs, never failing a send for a customer.
    const title = assertRenderableText(params.title, "buildNotificationEmail title")
    const message = assertRenderableText(params.message, "buildNotificationEmail message")

    const lang: Language = params.language === "el" ? "el" : "en"
    const copy = NOTIF_EMAIL_COPY[lang]
    const path = notificationActionPath(params.relatedObjectType, params.relatedObjectId)
    const html = getBaseTemplate({
        title: escapeHtml(title),
        description: escapeHtml(message),
        actionUrl: path ? absoluteUrl(path) : undefined,
        actionLabel: path ? copy.view : undefined,
        footerText: `${copy.footer}<br/>© ${new Date().getFullYear()} PolicyWallet`,
    })
    return { subject: title, html }
}

/**
 * `export const templates` stood here: sixteen per-event mail bodies, in both
 * languages, referenced by nothing.
 *
 * They were not merely unused — they were BROKEN, and the comment on
 * buildNotificationEmail above said so: they "rendered `undefined` because
 * sendNotification only ever passed them { id, language }". Every one of their
 * data parameters arrived empty. buildNotificationEmail replaced them.
 *
 * Deleted rather than left, because dead copy is worse than no copy: seventeen
 * Greek strings sat in the frozen inventory looking live, and the freeze is what
 * this run uses to review every customer-facing word. Someone improving the
 * gap-detected wording would have edited these and shipped nothing.
 */
;
