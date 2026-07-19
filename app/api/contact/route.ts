import { z } from "zod"
import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { sendContactConfirmation, sendFormAdminAlert } from "@/lib/email/form-emails"

// PUBLIC_ENDPOINT_AUTH_STRATEGY: rate_limit + zod_payload_validation + honeypot + db_persist + brevo_alert

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
    // Honeypot: real users never see this field, so a filled value means a bot.
    // Named so browser autofill never touches it ("company" is an autofill
    // token and silently got legitimate submissions rejected).
    website_url: z.string().max(200).optional().default(""),
})

type ContactPayload = z.infer<typeof contactSchema>
type ContactErrors = Partial<Record<keyof ContactPayload, string>>

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

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
    const limitCheck = await rateLimit(String(ip), 8, 10 * 60 * 1000, `contact:${ip}`)
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

    const payload: ContactPayload = parsed.data

    // Bot: answer exactly like a success so it learns nothing, but persist and send nothing.
    if (payload.website_url.trim().length > 0) {
        return NextResponse.json({
            success: true,
            message: "Το μήνυμά σας στάλθηκε με επιτυχία.",
        })
    }

    const submission = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        subject: payload.subject,
        message: payload.message,
    }

    // Persist BEFORE any network call: a Brevo outage must never lose the message.
    let submissionId: string
    try {
        const row = await db.formSubmission.create({
            data: {
                formType: "contact",
                email: submission.email,
                name: submission.name,
                phone: submission.phone || null,
                subject: submission.subject,
                message: submission.message,
                locale: "el",
                source: "contact_page",
                ipAddress: String(ip),
                userAgent: req.headers.get("user-agent"),
            },
        })
        submissionId = row.id
    } catch (error) {
        Sentry.captureException(error, { tags: { context: "contact_form_persist" } })
        return NextResponse.json(
            {
                success: false,
                message: "Αποτυχία αποστολής. Παρακαλώ προσπαθήστε ξανά σε λίγο.",
            },
            { status: 500 }
        )
    }

    const alert = await sendFormAdminAlert({ formType: "contact", submission })

    if (alert.success) {
        await db.formSubmission
            .update({ where: { id: submissionId }, data: { emailSent: true } })
            .catch((error) => Sentry.captureException(error, { tags: { context: "contact_form_mark_sent" } }))
    } else {
        // The message is safely in form_submissions and visible in /admin/submissions,
        // so the user is still told it went through — but page the owner about the send.
        Sentry.captureMessage(`Contact form admin alert failed: ${alert.error}`, {
            level: "error",
            tags: { context: "contact_form_alert", submission_id: submissionId },
        })
    }

    // Best-effort courtesy email; never let it fail the submission.
    const confirmation = await sendContactConfirmation({ to: submission.email, name: submission.name, language: "el" })
    if (!confirmation.success) {
        Sentry.captureMessage(`Contact form confirmation failed: ${confirmation.error}`, {
            level: "warning",
            tags: { context: "contact_form_confirmation", submission_id: submissionId },
        })
    }

    return NextResponse.json({
        success: true,
        message: "Το μήνυμά σας στάλθηκε με επιτυχία.",
    })
}
