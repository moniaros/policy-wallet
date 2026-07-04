import { sendEmail } from "@/lib/email/email-service"

type Language = "el" | "en"

function getBaseUrl() {
    return process.env.NEXTAUTH_URL || "http://localhost:3000"
}

function sanitizeName(name?: string | null) {
    const trimmed = name?.trim()
    if (!trimmed) return "PolicyWallet user"
    return trimmed
}

function buildInviteCopy(language: Language) {
    if (language === "el") {
        return {
            inviteSubject: "Πρόσκληση από το PolicyWallet",
            inviteTitle: "Έχετε προσκληθεί για συνεργασία",
            inviteBody: "Ανοίξτε τον ασφαλή σύνδεσμο πρόσκλησης παρακάτω για να αποδεχτείτε την πρόσβαση.",
            accessSubject: "Κοινοποιήθηκε ένα ασφαλιστήριο μαζί σας",
            accessTitle: "Κοινοποιήθηκε ένα ασφαλιστήριο στο πορτοφόλι σας",
            accessBody: "Συνδεθείτε για να δείτε τα στοιχεία του κοινοποιημένου ασφαλιστηρίου.",
            actionInvite: "Άνοιγμα πρόσκλησης",
            actionAccess: "Άνοιγμα πορτοφολιού",
            footer: "Αυτός ο ασφαλής σύνδεσμος λήγει σύντομα για την προστασία σας.",
        }
    }

    return {
        inviteSubject: "Invitation from PolicyWallet",
        inviteTitle: "You have been invited to collaborate",
        inviteBody: "Open the secure invitation link below to accept access.",
        accessSubject: "A policy was shared with you",
        accessTitle: "A policy was shared with your wallet",
        accessBody: "Sign in to review the shared policy details.",
        actionInvite: "Open invitation",
        actionAccess: "Open wallet",
        footer: "This secure link expires soon for your safety.",
    }
}

function cardTemplate({
    title,
    body,
    actionLabel,
    actionUrl,
    footer,
}: {
    title: string
    body: string
    actionLabel: string
    actionUrl: string
    footer: string
}) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
            <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;">
                <h2 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">${title}</h2>
                <p style="margin: 0 0 18px 0; color: #334155; line-height: 1.6;">${body}</p>
                <a href="${actionUrl}" style="display: inline-block; background: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 18px; font-weight: 600;">${actionLabel}</a>
            </div>
            <p style="margin: 14px 0 0 0; color: #64748b; font-size: 13px;">${footer}</p>
        </div>
    `
}

export async function sendPolicyInviteEmail(params: {
    to: string
    token: string
    inviterName?: string | null
    policyNumber?: string | null
    language?: Language
}) {
    const language = params.language || "en"
    const copy = buildInviteCopy(language)
    const inviterName = sanitizeName(params.inviterName)
    const policyLabel = params.policyNumber ? `Policy ${params.policyNumber}` : "a policy"
    const inviteUrl = `${getBaseUrl()}/invite/${params.token}`
    const body = `${inviterName} invited you to access ${policyLabel} in PolicyWallet. ${copy.inviteBody}`

    return sendEmail({
        to: params.to,
        subject: copy.inviteSubject,
        html: cardTemplate({
            title: copy.inviteTitle,
            body,
            actionLabel: copy.actionInvite,
            actionUrl: inviteUrl,
            footer: copy.footer,
        }),
    })
}

export async function sendPolicySharedAccessEmail(params: {
    to: string
    inviterName?: string | null
    policyNumber?: string | null
    language?: Language
}) {
    const language = params.language || "en"
    const copy = buildInviteCopy(language)
    const inviterName = sanitizeName(params.inviterName)
    const policyLabel = params.policyNumber ? `Policy ${params.policyNumber}` : "a policy"
    const accessUrl = `${getBaseUrl()}/wallet`
    const body = `${inviterName} shared ${policyLabel} with your wallet. ${copy.accessBody}`

    return sendEmail({
        to: params.to,
        subject: copy.accessSubject,
        html: cardTemplate({
            title: copy.accessTitle,
            body,
            actionLabel: copy.actionAccess,
            actionUrl: accessUrl,
            footer: copy.footer,
        }),
    })
}

export async function sendAiConsentRequestEmail(params: {
    to: string
    agentName?: string | null
    language?: Language
}) {
    const language = params.language || "el"
    const copy = buildInviteCopy(language)
    const agentName = sanitizeName(params.agentName)
    const approvalUrl = `${getBaseUrl()}/consent/ai`

    const text = language === "el"
        ? {
            subject: "Αίτημα συγκατάθεσης για ανάλυση AI",
            title: "Ο σύμβουλός σας ζητά τη συγκατάθεσή σας",
            body: `${agentName} ζητά τη συγκατάθεσή σας για να αναλύσει τα ασφαλιστήριά σας με AI στο PolicyWallet. Η συγκατάθεση καταγράφεται και μπορείτε να την ανακαλέσετε ανά πάσα στιγμή.`,
            action: "Έλεγχος & έγκριση",
        }
        : {
            subject: "AI analysis consent request",
            title: "Your advisor requests your consent",
            body: `${agentName} requests your consent to analyze your insurance policies with AI in PolicyWallet. Your consent is recorded and can be withdrawn at any time.`,
            action: "Review & approve",
        }

    return sendEmail({
        to: params.to,
        subject: text.subject,
        html: cardTemplate({
            title: text.title,
            body: text.body,
            actionLabel: text.action,
            actionUrl: approvalUrl,
            footer: copy.footer,
        }),
    })
}

