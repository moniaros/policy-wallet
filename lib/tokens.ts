import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

const PASSWORD_RESET_IDENTIFIER_PREFIX = "password_reset:"

function getPasswordResetIdentifier(email: string) {
    return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${email.trim().toLowerCase()}`
}

export async function generateVerificationToken(email: string) {
    const token = uuidv4()
    const expires = new Date(new Date().getTime() + 3600 * 1000) // 1 hour

    const existingToken = await db.verificationToken.findFirst({
        where: { identifier: email }
    })

    if (existingToken) {
        await db.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: email,
                    token: existingToken.token
                }
            }
        })
    }

    const verificationToken = await db.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires
        }
    })

    return verificationToken
}

export async function generatePasswordResetToken(email: string) {
    const token = uuidv4()
    const expires = new Date(new Date().getTime() + 30 * 60 * 1000) // 30 minutes
    const identifier = getPasswordResetIdentifier(email)

    await db.verificationToken.deleteMany({ where: { identifier } })

    return db.verificationToken.create({
        data: {
            identifier,
            token,
            expires,
        },
    })
}

export async function validatePasswordResetToken(email: string, token: string) {
    const identifier = getPasswordResetIdentifier(email)
    const record = await db.verificationToken.findFirst({
        where: {
            identifier,
            token,
        },
    })

    if (!record) {
        return { success: false as const, error: "Invalid reset link." }
    }

    if (new Date() > record.expires) {
        await db.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier,
                    token,
                },
            },
        }).catch(() => { })
        return { success: false as const, error: "Reset link has expired." }
    }

    return { success: true as const }
}

export async function consumePasswordResetToken(email: string, token: string) {
    const identifier = getPasswordResetIdentifier(email)

    await db.verificationToken.delete({
        where: {
            identifier_token: {
                identifier,
                token,
            },
        },
    }).catch(() => { })

    return { success: true as const }
}
