import nodemailer from "nodemailer"
import { z } from "zod"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const SUBJECT_OPTIONS = [
    "Γενική Ερώτηση",
    "Συνεργασία",
    "Τεχνική Υποστήριξη",
    "Τιμολόγηση",
] as const

const contactSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z
        .string()
        .trim()
        .max(32)
        .optional()
        .default("")
        .refine((value) => value.length === 0 || /^\+?[0-9()\-\s]{7,20}$/.test(value), {
            message: "invalid_phone",
        }),
    subject: z.enum(SUBJECT_OPTIONS),
    message: z.string().trim().min(20).max(4000),
})

type ContactPayload = z.infer<typeof contactSchema>
type ContactErrors = Partial<Record<keyof ContactPayload, string>>

function escapeHtml(input: string): string {
    return input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
}

function mapValidationErrors(payload: unknown): ContactErrors {
    const parsed = contactSchema.safeParse(payload)
    if (parsed.success) return {}

    const errors: ContactErrors = {}
    for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] || "")

        if (field === "name") {
            errors.name = "Το ονοματεπώνυμο είναι υποχρεωτικό και πρέπει να έχει τουλάχιστον 2 χαρακτήρες."
        } else if (field === "email") {
            errors.email = "Συμπληρώστε έγκυρο email."
        } else if (field === "phone") {
            errors.phone = "Το τηλέφωνο δεν είναι έγκυρο."
        } else if (field === "subject") {
            errors.subject = "Επιλέξτε έγκυρο θέμα επικοινωνίας."
        } else if (field === "message") {
            errors.message = "Το μήνυμα πρέπει να έχει τουλάχιστον 20 χαρακτήρες."
        }
    }

    return errors
}

function createTransporter() {
    const host = process.env.SMTP_HOST
    const portValue = process.env.SMTP_PORT
    const port = portValue ? Number(portValue) : 587
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS

    if (!host || !user || !pass || Number.isNaN(port)) {
        return null
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    })
}

function resolveRecipients() {
    return {
        from: process.env.SMTP_FROM || process.env.SENDER_EMAIL || "noreply@policywallet.com",
        to: process.env.CONTACT_FORM_TO || "hello@policywallet.com",
        replyToFallback: process.env.SMTP_FROM || process.env.SENDER_EMAIL || "noreply@policywallet.com",
    }
}

function buildHtml(payload: ContactPayload) {
    const safeName = escapeHtml(payload.name)
    const safeEmail = escapeHtml(payload.email)
    const safePhone = payload.phone ? escapeHtml(payload.phone) : "-"
    const safeSubject = escapeHtml(payload.subject)
    const safeMessage = escapeHtml(payload.message).replaceAll("\n", "<br/>")

    return `
      <div style="font-family: Arial, sans-serif; max-width: 680px; line-height: 1.6;">
        <h2 style="margin: 0 0 12px; color: #0f172a;">Νέα επικοινωνία από φόρμα PolicyWallet</h2>
        <p style="margin: 0 0 20px; color: #334155;">Λήφθηκε νέο αίτημα επικοινωνίας από τη δημόσια σελίδα.</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Ονοματεπώνυμο</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Email</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeEmail}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Τηλέφωνο</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safePhone}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Θέμα</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeSubject}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600; vertical-align: top;">Μήνυμα</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeMessage}</td></tr>
        </table>
      </div>
    `
}

function buildText(payload: ContactPayload) {
    return [
        "Νέα επικοινωνία από φόρμα PolicyWallet",
        "",
        `Ονοματεπώνυμο: ${payload.name}`,
        `Email: ${payload.email}`,
        `Τηλέφωνο: ${payload.phone || "-"}`,
        `Θέμα: ${payload.subject}`,
        "",
        "Μήνυμα:",
        payload.message,
    ].join("\n")
}

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
    const limitCheck = await rateLimit(String(ip), 8, 10 * 60 * 1000)
    if (!limitCheck.success) return limitCheck.error!

    let requestBody: unknown
    try {
        requestBody = await req.json()
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: "Μη έγκυρο αίτημα. Ελέγξτε τα πεδία και προσπαθήστε ξανά.",
            },
            { status: 400 }
        )
    }

    const parsed = contactSchema.safeParse(requestBody)
    if (!parsed.success) {
        return NextResponse.json(
            {
                success: false,
                message: "Η φόρμα περιέχει λάθη.",
                errors: mapValidationErrors(requestBody),
            },
            { status: 400 }
        )
    }

    const payload = parsed.data
    const transporter = createTransporter()
    const recipients = resolveRecipients()

    if (!transporter) {
        if (process.env.NODE_ENV !== "production") {
            console.log("[contact:dev] SMTP config missing, logging payload instead of sending email")
            console.log(buildText(payload))
            return NextResponse.json({
                success: true,
                message: "Το μήνυμά σας καταχωρήθηκε επιτυχώς.",
                provider: "dev_log",
            })
        }

        return NextResponse.json(
            {
                success: false,
                message: "Η υπηρεσία επικοινωνίας δεν είναι διαθέσιμη αυτή τη στιγμή.",
            },
            { status: 503 }
        )
    }

    try {
        await transporter.sendMail({
            from: recipients.from,
            to: recipients.to,
            replyTo: payload.email || recipients.replyToFallback,
            subject: `PolicyWallet Contact: ${payload.subject}`,
            html: buildHtml(payload),
            text: buildText(payload),
        })

        return NextResponse.json({
            success: true,
            message: "Το μήνυμά σας στάλθηκε με επιτυχία.",
        })
    } catch (error) {
        console.error("Contact form delivery failed:", error)
        return NextResponse.json(
            {
                success: false,
                message: "Αποτυχία αποστολής. Παρακαλώ προσπαθήστε ξανά σε λίγο.",
            },
            { status: 500 }
        )
    }
}
