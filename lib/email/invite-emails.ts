import { sendEmail } from "@/lib/email/email-service"
import { LEGAL_ENTITY } from "@/lib/legal/entity-placeholders"
import { getBaseTemplate } from "@/lib/mail-templates"
import { absoluteUrl } from "@/lib/seo/site"
import { displayPolicyNumber } from "@/lib/wallet/policy-identity"

type Language = "el" | "en"

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

/**
 * GDPR Art. 14 — information to a data subject whose personal data was NOT
 * obtained from them. The person receiving an invite was added by their agent,
 * who typed their name, email, phone and ΑΦΜ and uploads their policies; the
 * law requires that they be told who holds it, what, why and what they can
 * do about it. Owner decision D2: this notice lives ONLY inside the invite
 * email — not on the invite page, not in the notification bell.
 *
 * The controller is the operating company as /privacy names it
 * (lib/legal/entity-placeholders.ts), never the product name alone.
 */
export function article14Notice(language: Language): string {
    const entity = LEGAL_ENTITY[language]
    const privacyUrl = absoluteUrl(language === "el" ? "/privacy" : "/en/privacy")
    const dpo = escapeHtml(entity.dpoEmail)
    const company = escapeHtml(entity.company)

    if (language === "el") {
        return (
            `<p style="margin: 0 0 12px;"><strong>Ενημέρωση για τα προσωπικά σας δεδομένα (άρθρο 14 ΓΚΠΔ).</strong> ` +
            `Υπεύθυνος επεξεργασίας είναι η εταιρεία ${company} (PolicyWallet). ` +
            `Τα στοιχεία σας δεν τα λάβαμε από εσάς αλλά από τον ασφαλιστικό σας σύμβουλο: ονοματεπώνυμο, email, τηλέφωνο, ΑΦΜ εφόσον δόθηκε, και τα ασφαλιστήρια που προσθέτει για λογαριασμό σας. ` +
            `Σκοπός είναι η διαχείριση του ασφαλιστικού σας χαρτοφυλακίου μαζί με τον σύμβουλό σας. ` +
            `Έχετε δικαίωμα πρόσβασης, διόρθωσης, διαγραφής και εναντίωσης στην επεξεργασία — γράψτε μας στο <a href="mailto:${dpo}">${dpo}</a>.</p>` +
            `<p style="margin: 0;">Αναλυτικά: <a href="${privacyUrl}">Πολιτική απορρήτου</a>.</p>`
        )
    }
    return (
        `<p style="margin: 0 0 12px;"><strong>Information about your personal data (GDPR Article 14).</strong> ` +
        `The controller is ${company} (PolicyWallet). ` +
        `We did not receive your details from you but from your insurance advisor: name, email, phone, tax ID (ΑΦΜ) if given, and the policies they add on your behalf. ` +
        `The purpose is managing your insurance portfolio together with your advisor. ` +
        `You have the right to access, rectify and erase your data and to object to its processing — write to <a href="mailto:${dpo}">${dpo}</a>.</p>` +
        `<p style="margin: 0;">Full details: <a href="${privacyUrl}">Privacy policy</a>.</p>`
    )
}

function sanitizeName(name: string | null | undefined, language: Language) {
    const trimmed = name?.trim()
    if (trimmed) return trimmed
    return language === "el" ? "Ο σύμβουλός σας" : "Your advisor"
}

function policyLabel(policyNumber: string | null | undefined, language: Language) {
    // A synthetic number (`PENDING-…`) must not name a policy in an email —
    // displayPolicyNumber returns null for it and the generic label is used.
    const safeNumber = displayPolicyNumber(policyNumber)
    if (safeNumber) {
        return language === "el" ? `το ασφαλιστήριο ${safeNumber}` : `Policy ${safeNumber}`
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
            // The recipient's data came from the inviter, not from them —
            // the Art. 14 notice rides inside this email and nowhere else (D2).
            legalNotice: article14Notice(language),
        }),
    })
}

export async function sendAdvisorInviteEmail(params: {
    to: string
    token: string
    inviterName?: string | null
    language?: Language
}) {
    const language: Language = params.language === "el" ? "el" : "en"
    // The inviter here is the POLICYHOLDER (client), not an advisor — use their
    // real name, falling back to a neutral "A PolicyWallet member".
    const trimmed = params.inviterName?.trim()
    const inviter = trimmed || (language === "el" ? "Ένα μέλος του PolicyWallet" : "A PolicyWallet member")
    const inviteUrl = absoluteUrl(`/invite/${params.token}`)

    const copy = language === "el"
        ? {
            subject: `${inviter} σας προσκαλεί ως σύμβουλό του στο PolicyWallet`,
            title: "Προσκληθήκατε ως σύμβουλος",
            body: `${inviter} θέλει να σας συνδέσει ως ασφαλιστικό σύμβουλό του στο PolicyWallet. Ανοίξτε τον ασφαλή σύνδεσμο για να δημιουργήσετε λογαριασμό συμβούλου ή να συνδεθείτε — θα συνδεθείτε αυτόματα.`,
            action: "Αποδοχή πρόσκλησης",
        }
        : {
            subject: `${inviter} invited you to be their advisor on PolicyWallet`,
            title: "You've been invited as an advisor",
            body: `${inviter} wants to connect you as their insurance advisor on PolicyWallet. Open the secure link to create an advisor account or log in — you'll be connected automatically.`,
            action: "Accept invitation",
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
