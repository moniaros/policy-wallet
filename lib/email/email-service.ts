import nodemailer from 'nodemailer'
import * as Sentry from '@sentry/nextjs'

export interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
}

export interface EmailResult {
    success: boolean
    messageId?: string
    error?: string
}

/**
 * Send an email using Nodemailer with Brevo SMTP
 * Falls back to console logging in development if SMTP not configured
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
    // Check if SMTP is configured
    const smtpConfigured = process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASSWORD

    // In development without SMTP, log to console
    if (process.env.NODE_ENV === 'development' && !smtpConfigured) {
        console.log('📧 Email (Dev Mode - Not Sent):')
        console.log('To:', options.to)
        console.log('Subject:', options.subject)
        console.log('Text:', options.text)
        console.log('---')
        return { success: true, messageId: 'dev-mode' }
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // Use TLS
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    })

    try {
        const info = await transporter.sendMail({
            from: `"PolicyWallet" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || stripHtml(options.html),
        })

        console.log('✅ Email sent:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('❌ Email send failed:', error)
        Sentry.captureException(error, {
            tags: { email_to: options.to, email_subject: options.subject }
        })
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Simple HTML to text converter for fallback
 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Verify SMTP configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') {
        return true // Skip verification in dev
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        })

        await transporter.verify()
        console.log('✅ SMTP configuration verified')
        return true
    } catch (error) {
        console.error('❌ SMTP verification failed:', error)
        Sentry.captureException(error)
        return false
    }
}
