import { sendEmail } from "@/lib/email/email-service"
import { getBaseTemplate } from "@/lib/mail-templates"
import { absoluteUrl } from "@/lib/seo/site"

type Language = "el" | "en"

function sanitizeName(name: string | null | undefined, language: Language) {
    const trimmed = name?.trim()
    if (trimmed) return trimmed
    return language === "el" ? "Ο σύμβουλός σας" : "Your advisor"
}

function policyLabel(policyNumber: string | null | undefined, language: Language) {
    if (policyNumber) {
        return language === "el" ? `το ασφαλιστήριο ${policyNumber}` : `Policy ${policyNumber}`
    }
    return language === "el" ? "ένα ασφαλιστήριο" : "a policy"
}

function inviteFooter(language: Language) {
    return language === "el"
        ? "Αυτός ο ασφαλής σύνδεσμος λήγει σύντομα για την προστασία σας."
        : "This secure link expires soon for your safety."
}

export async function sendPolicyInviteEmail(params: {
    to: string
    token: string
    inviterName?: string | null
    policyNumber?: string | null
    language?: Language
}) {
    const language: Language = params.language === "el" ? "el" : "en"
    const inviter = sanitizeName(params.inviterName, language)
    const label = policyLabel(params.policyNumber, language)
    const inviteUrl = absoluteUrl(`/invite/${params.token}`)

    const copy = language === "el"
        ? {
            subject: "Πρόσκληση από το PolicyWallet",
            title: "Έχετε προσκληθεί για συνεργασία",
            body: `${inviter} σας προσκάλεσε να αποκτήσετε πρόσβαση σε ${label} στο PolicyWallet. Ανοίξτε τον ασφαλή σύνδεσμο πρόσκλησης για να αποδεχτείτε την πρόσβαση.`,
            action: "Άνοιγμα πρόσκλησης",
        }
        : {
            subject: "Invitation from PolicyWallet",
            title: "You have been invited to collaborate",
            body: `${inviter} invited you to access ${label} in PolicyWallet. Open the secure invitation link to accept access.`,
            action: "Open invitation",
        }

    return sendEmail({
        to: params.to,
        subject: copy.subject,
        html: getBaseTemplate({
            title: copy.title,
            description: copy.body,
            actionUrl: inviteUrl,
            actionLabel: copy.action,
            footerText: inviteFooter(language),
        }),
    })
}

export async function sendPolicySharedAccessEmail(params: {
    to: string
    inviterName?: string | null
    policyNumber?: string | null
    language?: Language
}) {
    const language: Language = params.language === "el" ? "el" : "en"
    const inviter = sanitizeName(params.inviterName, language)
    const label = policyLabel(params.policyNumber, language)
    const accessUrl = absoluteUrl("/wallet")

    const copy = language === "el"
        ? {
            subject: "Κοινοποιήθηκε ένα ασφαλιστήριο μαζί σας",
            title: "Κοινοποιήθηκε ένα ασφαλιστήριο στο πορτοφόλι σας",
            body: `${inviter} κοινοποίησε ${label} στο πορτοφόλι σας. Συνδεθείτε για να δείτε τα στοιχεία του κοινοποιημένου ασφαλιστηρίου.`,
            action: "Άνοιγμα πορτοφολιού",
        }
        : {
            subject: "A policy was shared with you",
            title: "A policy was shared with your wallet",
            body: `${inviter} shared ${label} with your wallet. Sign in to review the shared policy details.`,
            action: "Open wallet",
        }

    return sendEmail({
        to: params.to,
        subject: copy.subject,
        html: getBaseTemplate({
            title: copy.title,
            description: copy.body,
            actionUrl: accessUrl,
            actionLabel: copy.action,
            footerText: inviteFooter(language),
        }),
    })
}

export async function sendAiConsentRequestEmail(params: {
    to: string
    agentName?: string | null
    language?: Language
}) {
    const language: Language = params.language === "el" ? "el" : "en"
    const agent = sanitizeName(params.agentName, language)
    const approvalUrl = absoluteUrl("/consent/ai")

    const copy = language === "el"
        ? {
            subject: "Αίτημα συγκατάθεσης για ανάλυση AI",
            title: "Ο σύμβουλός σας ζητά τη συγκατάθεσή σας",
            body: `${agent} ζητά τη συγκατάθεσή σας για να αναλύσει τα ασφαλιστήριά σας με AI στο PolicyWallet. Η συγκατάθεση καταγράφεται και μπορείτε να την ανακαλέσετε ανά πάσα στιγμή.`,
            action: "Έλεγχος & έγκριση",
        }
        : {
            subject: "AI analysis consent request",
            title: "Your advisor requests your consent",
            body: `${agent} requests your consent to analyze your insurance policies with AI in PolicyWallet. Your consent is recorded and can be withdrawn at any time.`,
            action: "Review & approve",
        }

    return sendEmail({
        to: params.to,
        subject: copy.subject,
        html: getBaseTemplate({
            title: copy.title,
            description: copy.body,
            actionUrl: approvalUrl,
            actionLabel: copy.action,
            footerText: inviteFooter(language),
        }),
    })
}
