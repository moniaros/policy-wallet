import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const { token, email } = await request.json()

        if (!token || !email) {
            return NextResponse.json(
                { success: false, error: 'Invalid verification parameters' },
                { status: 400 }
            )
        }

        // 1. Find the verification token in database
        const verificationRecord = await db.verificationToken.findUnique({
            where: {
                identifier_token: {
                    identifier: email,
                    token: token
                }
            }
        })

        if (!verificationRecord) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired verification link' },
                { status: 400 }
            )
        }

        // 2. Check if token has expired (15 minutes)
        if (new Date() > verificationRecord.expires) {
            // Delete expired token
            await db.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: email,
                        token: token
                    }
                }
            })

            return NextResponse.json(
                { success: false, error: 'Verification link has expired. Please request a new one.' },
                { status: 400 }
            )
        }

        // 3. Mark user as verified in local database
        await db.user.update({
            where: { email },
            data: { emailVerified: new Date() }
        })

        // 4. Also update Supabase Auth to mark email as verified
        const supabase = await createClient()

        // Get the user by email
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

        if (listError) {
            console.error('Error listing users:', listError)
        } else {
            const user = users?.find(u => u.email === email)
            if (user) {
                // Update user to mark email as confirmed
                await supabase.auth.admin.updateUserById(user.id, {
                    email_confirm: true
                })
            }
        }

        // 5. Delete the used token
        await db.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: email,
                    token: token
                }
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully'
        })

    } catch (error) {
        console.error('Verification API error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
