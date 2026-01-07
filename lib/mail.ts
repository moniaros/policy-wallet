import nodemailer from "nodemailer"

const transportOptions = {
    host: process.env.EMAIL_SERVER_HOST || "localhost",
    port: Number(process.env.EMAIL_SERVER_PORT) || 1025,
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    }
}

const transporter = nodemailer.createTransport(transportOptions)

export async function sendMail({ to, subject, html }: { to: string, subject: string, html: string }) {
    // If BREVO_API_KEY is present, use Brevo API (same as auth.ts)
    if (process.env.BREVO_API_KEY) {
        try {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "api-key": process.env.BREVO_API_KEY!,
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({
                    sender: { email: process.env.SENDER_EMAIL || "noreply@policywallet.gr", name: "PolicyWallet" },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: html,
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to send email via Brevo")
            }
            return { success: true }
        } catch (error) {
            console.error("Brevo Email Error:", error)
            throw error
        }
    }

    // Fallback to Nodemailer (Dev/SMTP)
    try {
        await transporter.sendMail({
            from: process.env.SENDER_EMAIL || "noreply@policywallet.gr",
            to,
            subject,
            html,
        })
        return { success: true }
    } catch (error) {
        console.error("Nodemailer Error:", error)
        throw error
    }
}
