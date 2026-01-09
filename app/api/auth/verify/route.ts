import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const { token_hash, type } = await request.json()

        if (!token_hash || type !== 'email') {
            return NextResponse.json(
                { success: false, error: 'Invalid verification parameters' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Verify the email using Supabase
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email'
        })

        if (error) {
            console.error('Verification error:', error)
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            )
        }

        if (!data.user) {
            return NextResponse.json(
                { success: false, error: 'Verification failed' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        })

    } catch (error) {
        console.error('Verification API error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
