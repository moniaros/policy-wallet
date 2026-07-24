/**
 * Data-subject-request lifecycle emails (GDPR Art. 12(4)) — the data subject
 * must be informed of the outcome of their request, including the reasons
 * when it is refused. Sent fire-and-forget from the admin DSR actions; the
 * completion email goes to the ORIGINAL address captured before erasure.
 */

import { getBaseEmailTemplate } from "./base-template"
import { escapeHtml } from "@/lib/email/form-emails"

export type DsrEmailLanguage = "el" | "en"

type DsrEmail = { subject: string; html: string; text: string }

const FOOTER = {
    el: "Για οποιαδήποτε ερώτηση σχετικά με τα δεδομένα σας: dpo@policywallet.gr",
    en: "For any question about your data: dpo@policywallet.gr",
}

function wrap(language: DsrEmailLanguage, heading: string, paragraphs: string[]): DsrEmail["html"] {
    const body = paragraphs.map((p) => `<p>${p}</p>`).join("\n")
    return getBaseEmailTemplate(`
        <h2>${heading}</h2>
        ${body}
        <p style="color:#6B7280;font-size:14px;">${FOOTER[language]}</p>
    `, language)
}

export function getDeletionApprovedEmail(language: DsrEmailLanguage): DsrEmail {
    if (language === "el") {
        const subject = "Το αίτημα διαγραφής σας εγκρίθηκε — PolicyWallet"
        const paragraphs = [
            "Το αίτημα διαγραφής του λογαριασμού σας εγκρίθηκε και θα εκτελεστεί σύντομα.",
            "Με την ολοκλήρωση θα διαγραφούν τα συμβόλαια, τα έγγραφα και τα προσωπικά σας δεδομένα. Ό,τι οφείλουμε νομίμως να διατηρήσουμε (π.χ. φορολογικά παραστατικά για 5 έτη) διατηρείται ανωνυμοποιημένο.",
            "Θα λάβετε επιβεβαίωση όταν η διαγραφή ολοκληρωθεί.",
        ]
        return {
            subject,
            html: wrap("el", "Το αίτημά σας εγκρίθηκε", paragraphs),
            text: `${paragraphs.join("\n\n")}\n\n${FOOTER.el}`,
        }
    }
    const subject = "Your deletion request was approved — PolicyWallet"
    const paragraphs = [
        "Your account deletion request has been approved and will be executed shortly.",
        "On completion, your policies, documents and personal data are deleted. Anything we are legally required to keep (e.g. tax invoices for 5 years) is retained in anonymized form.",
        "You will receive a confirmation once the deletion has completed.",
    ]
    return {
        subject,
        html: wrap("en", "Your request was approved", paragraphs),
        text: `${paragraphs.join("\n\n")}\n\n${FOOTER.en}`,
    }
}

export function getDeletionRejectedEmail(language: DsrEmailLanguage, reason: string): DsrEmail {
    const safeReason = escapeHtml(reason)
    if (language === "el") {
        const subject = "Το αίτημα διαγραφής σας δεν έγινε δεκτό — PolicyWallet"
        const paragraphs = [
            "Το αίτημα διαγραφής του λογαριασμού σας εξετάστηκε και δεν έγινε δεκτό.",
            `Αιτιολογία: ${safeReason}`,
            "Έχετε το δικαίωμα να υποβάλετε καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr) και να προσφύγετε δικαστικά. Μπορείτε επίσης να απαντήσετε σε αυτό το μήνυμα ή να επικοινωνήσετε με τον DPO μας για διευκρινίσεις.",
        ]
        return {
            subject,
            html: wrap("el", "Το αίτημά σας δεν έγινε δεκτό", paragraphs),
            text: `${paragraphs.map((p) => p.replace(safeReason, reason)).join("\n\n")}\n\n${FOOTER.el}`,
        }
    }
    const subject = "Your deletion request was not accepted — PolicyWallet"
    const paragraphs = [
        "Your account deletion request has been reviewed and was not accepted.",
        `Reason: ${safeReason}`,
        "You have the right to lodge a complaint with the Hellenic Data Protection Authority (www.dpa.gr) and to seek a judicial remedy. You can also reply to this message or contact our DPO for clarification.",
    ]
    return {
        subject,
        html: wrap("en", "Your request was not accepted", paragraphs),
        text: `${paragraphs.map((p) => p.replace(safeReason, reason)).join("\n\n")}\n\n${FOOTER.en}`,
    }
}

export function getDeletionCompletedEmail(language: DsrEmailLanguage): DsrEmail {
    if (language === "el") {
        const subject = "Η διαγραφή του λογαριασμού σας ολοκληρώθηκε — PolicyWallet"
        const paragraphs = [
            "Η διαγραφή του λογαριασμού σας στο PolicyWallet ολοκληρώθηκε.",
            "Διαγράφηκαν: τα συμβόλαια και τα έγγραφά σας, το προφίλ και οι προτιμήσεις σας, τα στοιχεία σύνδεσης και οι ενεργές συνεδρίες, καθώς και οι μέθοδοι πληρωμής. Τυχόν ενεργή συνδρομή ακυρώθηκε.",
            "Διατηρούνται μόνο όσα επιβάλλει ο νόμος: φορολογικά παραστατικά (5 έτη) και το ιστορικό συγκαταθέσεων και αιτημάτων GDPR (5 έτη), αποσυνδεδεμένα από τα στοιχεία ταυτότητάς σας.",
            "Αυτό είναι το τελευταίο μήνυμα που θα λάβετε από εμάς.",
        ]
        return {
            subject,
            html: wrap("el", "Η διαγραφή ολοκληρώθηκε", paragraphs),
            text: `${paragraphs.join("\n\n")}\n\n${FOOTER.el}`,
        }
    }
    const subject = "Your account deletion is complete — PolicyWallet"
    const paragraphs = [
        "The deletion of your PolicyWallet account is complete.",
        "Deleted: your policies and documents, your profile and preferences, your login credentials and active sessions, and your payment methods. Any active subscription was cancelled.",
        "We retain only what the law requires: tax invoices (5 years) and the history of consents and GDPR requests (5 years), disconnected from your identity details.",
        "This is the last message you will receive from us.",
    ]
    return {
        subject,
        html: wrap("en", "Deletion complete", paragraphs),
        text: `${paragraphs.join("\n\n")}\n\n${FOOTER.en}`,
    }
}

export function getDataExportReadyEmail(language: DsrEmailLanguage, downloadUrl: string): DsrEmail {
    const safeUrl = escapeHtml(downloadUrl)
    if (language === "el") {
        const subject = "Το αντίγραφο των δεδομένων σας είναι έτοιμο — PolicyWallet"
        const html = wrap("el", "Το αντίγραφο των δεδομένων σας είναι έτοιμο", [
            "Το αίτημά σας για αντίγραφο των δεδομένων σας (GDPR, άρθρο 15/20) ολοκληρώθηκε.",
            `Μπορείτε να το κατεβάσετε από τον λογαριασμό σας. Ο σύνδεσμος ισχύει για 7 ημέρες: <a href="${safeUrl}">Λήψη δεδομένων</a>`,
        ])
        return {
            subject,
            html,
            text: `Το αίτημά σας για αντίγραφο των δεδομένων σας ολοκληρώθηκε. Ο σύνδεσμος ισχύει για 7 ημέρες: ${downloadUrl}\n\n${FOOTER.el}`,
        }
    }
    const subject = "Your data export is ready — PolicyWallet"
    const html = wrap("en", "Your data export is ready", [
        "Your request for a copy of your data (GDPR Art. 15/20) has been completed.",
        `You can download it from your account. The link is valid for 7 days: <a href="${safeUrl}">Download your data</a>`,
    ])
    return {
        subject,
        html,
        text: `Your data export request has been completed. The link is valid for 7 days: ${downloadUrl}\n\n${FOOTER.en}`,
    }
}
