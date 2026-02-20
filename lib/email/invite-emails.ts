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

