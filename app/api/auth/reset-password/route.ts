import { z } from "zod"
import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { sendEmail } from "@/lib/email/email-service"

const OTP_IDENTIFIER_PREFIX = "password_reset_otp:"

const requestOtpSchema = z.object({
    action: z.literal("request_otp"),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
})

const resetWithOtpSchema = z.object({
    action: z.literal("reset_with_otp"),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    otp: z.string().trim().regex(/^\d{6}$/),
    password: z.string().min(8).max(128),
})

const bodySchema = z.union([requestOtpSchema, resetWithOtpSchema])

function getOtpIdentifier(email: string) {
    return `${OTP_IDENTIFIER_PREFIX}${email}`
}

function hashOtp(otp: string): string {
    return createHash("sha256").update(otp).digest("hex")
}

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) return null

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    const normalizedEmail = email.toLowerCase()
    const perPage = 200
    let page = 1

    while (true) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
        if (error || !data?.users) return null

        const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail)
        if (user?.id) return user.id

        if (data.users.length < perPage) break
        page += 1
    }

    return null
}

async function sendResetOtpEmail(email: string, otp: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Επαναφορά κωδικού PolicyWallet</h2>
        <p>Χρησιμοποιήστε τον παρακάτω κωδικό OTP για να ορίσετε νέο κωδικό:</p>
        <div style="margin: 20px 0; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0f172a;">${otp}</div>
        <p>Ο κωδικός ισχύει για 10 λεπτά.</p>
        <p style="color: #64748b; font-size: 12px;">Αν δεν ζητήσατε επαναφορά, αγνοήστε αυτό το email.</p>
      </div>
    `

    const text = `Κωδικός OTP επαναφοράς PolicyWallet: ${otp}. Ισχύει για 10 λεπτά.`

    return sendEmail({
        to: email,
        subject: "Κωδικός επαναφοράς κωδικού - PolicyWallet",
        html,
        text,
    })
}

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"

    let parsedBody: z.infer<typeof bodySchema>
    try {
        const json = await req.json()
        parsedBody = bodySchema.parse(json)
    } catch {
        return NextResponse.json(
            { success: false, code: "invalid_request", message: "Μη έγκυρο αίτημα επαναφοράς κωδικού." },
            { status: 400 }
        )
    }

    if (parsedBody.action === "request_otp") {
        const rate = await rateLimit(`auth:otp-reset-request:${ip}:${parsedBody.email}`, 5, 15 * 60 * 1000)
        if (!rate.success) return rate.error!

        try {
            const existingUser = await db.user.findUnique({
                where: { email: parsedBody.email },
                select: { id: true },
            })

            if (!existingUser) {
                return NextResponse.json({
                    success: true,
                    code: "otp_sent",
                    message: "Αν το email υπάρχει, θα λάβετε κωδικό OTP.",
                })
            }

            const otp = generateOtpCode()
            const identifier = getOtpIdentifier(parsedBody.email)
            const expires = new Date(Date.now() + 10 * 60 * 1000)

            await db.verificationToken.deleteMany({ where: { identifier } })
            await db.verificationToken.create({
                data: {
                    identifier,
                    token: hashOtp(otp),
                    expires,
                },
            })

            const sent = await sendResetOtpEmail(parsedBody.email, otp)
            if (!sent.success) {
                return NextResponse.json(
                    { success: false, code: "otp_send_failed", message: "Αποτυχία αποστολής OTP. Παρακαλώ δοκιμάστε ξανά." },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                code: "otp_sent",
                message: "Στάλθηκε κωδικός OTP στο email σας.",
            })
        } catch (error) {
            console.error("request_otp failed", error)
            return NextResponse.json(
                { success: false, code: "otp_send_failed", message: "Παρουσιάστηκε σφάλμα κατά την αποστολή OTP." },
                { status: 500 }
            )
        }
    }

    const resetRate = await rateLimit(`auth:otp-reset-submit:${ip}:${parsedBody.email}`, 8, 15 * 60 * 1000)
    if (!resetRate.success) return resetRate.error!

    const identifier = getOtpIdentifier(parsedBody.email)
    const record = await db.verificationToken.findFirst({
        where: {
            identifier,
            token: hashOtp(parsedBody.otp),
        },
    })

    if (!record) {
        return NextResponse.json(
            { success: false, code: "otp_invalid", message: "Ο κωδικός OTP δεν είναι έγκυρος." },
            { status: 400 }
        )
    }

    if (new Date() > record.expires) {
        await db.verificationToken.deleteMany({ where: { identifier } }).catch(() => { })
        return NextResponse.json(
            { success: false, code: "otp_expired", message: "Ο κωδικός OTP έληξε. Ζητήστε νέο κωδικό." },
            { status: 400 }
        )
    }

    const supabaseUserId = await findSupabaseUserIdByEmail(parsedBody.email)
    if (!supabaseUserId) {
        return NextResponse.json(
            { success: false, code: "account_not_found", message: "Δεν βρέθηκε λογαριασμός για αυτό το email." },
            { status: 400 }
        )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
        return NextResponse.json(
            { success: false, code: "service_unavailable", message: "Η υπηρεσία επαναφοράς δεν είναι διαθέσιμη." },
            { status: 503 }
        )
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    const { error: updateError } = await adminClient.auth.admin.updateUserById(supabaseUserId, {
        password: parsedBody.password,
    })

    if (updateError) {
        return NextResponse.json(
            { success: false, code: "update_failed", message: "Αποτυχία ενημέρωσης κωδικού. Δοκιμάστε ξανά." },
            { status: 500 }
        )
    }

    await db.verificationToken.deleteMany({ where: { identifier } }).catch(() => { })

    return NextResponse.json({
        success: true,
        code: "password_updated",
        message: "Ο κωδικός σας ενημερώθηκε επιτυχώς.",
    })
}
