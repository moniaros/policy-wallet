import { sendEmail, type EmailResult } from "@/lib/email/email-service"
import { resolveAdminNotificationEmail } from "@/lib/email/admin-emails"
import { getBaseTemplate, type Language } from "@/lib/mail-templates"

export type FormType = "contact" | "newsletter"

export interface ContactSubmission {
    name: string
    email: string
    phone?: string
    subject: string
    message: string
}

export interface NewsletterSubmission {
    email: string
    source?: string
}

/** Every value below is attacker-controlled and lands in an HTML email. */
export function escapeHtml(input: string): string {
    return input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
}

function detailRows(rows: Array<[string, string | undefined]>): string {
    return rows
        .filter(([, value]) => Boolean(value))
        .map(
            ([label, value]) =>
                `<tr>
                    <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
                    <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(value as string).replaceAll("\n", "<br/>")}</td>
                </tr>`
        )
        .join("")
}

/**
 * Owner alert. `replyTo` is the submitter, so hitting Reply in the admin inbox
 * answers the person who filled in the form.
 */
export async function sendFormAdminAlert(
    payload:
        | { formType: "contact"; submission: ContactSubmission }
        | { formType: "newsletter"; submission: NewsletterSubmission }
): Promise<EmailResult> {
    // Same admin inbox the signup alerts already go to (ADMIN_NOTIFICATION_EMAIL,
    // with a code-level default), so form alerts land wherever ops already looks.
    const to = resolveAdminNotificationEmail()
    const isContact = payload.formType === "contact"
    const submitterEmail = payload.submission.email

    const rows = isContact
        ? detailRows([
              ["Ονοματεπώνυμο", (payload.submission as ContactSubmission).name],
              ["Email", submitterEmail],
              ["Τηλέφωνο", (payload.submission as ContactSubmission).phone || "-"],
              ["Θέμα", (payload.submission as ContactSubmission).subject],
              ["Μήνυμα", (payload.submission as ContactSubmission).message],
          ])
        : detailRows([
              ["Email", submitterEmail],
              ["Πηγή", (payload.submission as NewsletterSubmission).source || "-"],
          ])

    const title = isContact ? "Νέο μήνυμα από τη φόρμα επικοινωνίας" : "Νέα εγγραφή στο newsletter"
    const subject = isContact
        ? `[PolicyWallet] Νέα επικοινωνία: ${(payload.submission as ContactSubmission).subject}`
        : `[PolicyWallet] Νέα εγγραφή newsletter: ${submitterEmail}`

    const html = getBaseTemplate({
        title,
        description: `
            <table style="border-collapse:collapse;width:100%;margin-top:8px;">${rows}</table>
        `,
        footerText: "Αυτόματη ειδοποίηση από τις δημόσιες φόρμες του PolicyWallet.",
    })

    return await sendEmail({ to, subject, html, replyTo: submitterEmail })
}

const contactConfirmationCopy: Record<Language, { subject: string; title: string; description: string }> = {
    el: {
        subject: "Λάβαμε το μήνυμά σας — PolicyWallet",
        title: "Ευχαριστούμε για το μήνυμά σας",
        description:
            "Λάβαμε το αίτημά σας και η ομάδα μας θα επικοινωνήσει μαζί σας το συντομότερο δυνατό, συνήθως εντός δύο εργάσιμων ημερών. Δεν χρειάζεται να κάνετε κάτι άλλο.",
    },
    en: {
        subject: "We received your message — PolicyWallet",
        title: "Thanks for getting in touch",
        description:
            "We have received your message and our team will get back to you as soon as possible, usually within two business days. No further action is needed from you.",
    },
}

export async function sendContactConfirmation(params: {
    to: string
    name: string
    language?: Language
}): Promise<EmailResult> {
    const copy = contactConfirmationCopy[params.language || "el"]
    const greeting = escapeHtml(params.name)

    return await sendEmail({
        to: params.to,
        subject: copy.subject,
        html: getBaseTemplate({
            title: copy.title,
            description: `${greeting ? `<strong>${greeting}</strong>, ` : ""}${copy.description}`,
        }),
    })
}

const newsletterWelcomeCopy: Record<Language, { subject: string; title: string; description: string }> = {
    el: {
        subject: "Εγγραφήκατε στο newsletter του PolicyWallet",
        title: "Καλώς ήρθατε",
        description:
            "Η εγγραφή σας ολοκληρώθηκε. Θα λαμβάνετε πρακτικές συμβουλές για τα ασφαλιστήριά σας και ενημερώσεις για το PolicyWallet. Μπορείτε να διαγραφείτε όποτε θέλετε από κάθε email.",
    },
    en: {
        subject: "You are subscribed to the PolicyWallet newsletter",
        title: "Welcome aboard",
        description:
            "Your subscription is confirmed. You will receive practical tips about your insurance policies and PolicyWallet updates. You can unsubscribe at any time from any email.",
    },
}

export async function sendNewsletterWelcome(params: {
    to: string
    language?: Language
}): Promise<EmailResult> {
    const copy = newsletterWelcomeCopy[params.language || "el"]

    return await sendEmail({
        to: params.to,
        subject: copy.subject,
        html: getBaseTemplate({ title: copy.title, description: copy.description }),
    })
}
