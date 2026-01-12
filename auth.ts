import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import authConfig from "./auth.config"
import { cookies, headers } from "next/headers"
import { createBrevoContact } from "@/lib/brevo"
import { env } from "@/lib/env"

// Extend built-in session types
declare module "next-auth" {
    interface Session {
        user: {
            id: string
            roles: string
            preferredLanguage: string
            sessionId?: string
        } & DefaultSession["user"]
    }
}

export const {
    handlers: { GET, POST },
    auth,
    signIn,
    signOut,
} = NextAuth({
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    pages: {
        signIn: "/auth/signin",
    },
    ...authConfig,
    providers: [
        CredentialsProvider({
            name: "Sign in",
            id: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials: any) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials)

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data
                    const user = await db.user.findUnique({ where: { email } })
                    if (!user || !(user as any).password) return null

                    const passwordsMatch = await bcrypt.compare(password, (user as any).password)
                    if (passwordsMatch) return user as any
                }

                return null
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        EmailProvider({
            server: {
                host: process.env.EMAIL_SERVER_HOST || "localhost",
                port: Number(process.env.EMAIL_SERVER_PORT) || 1025,
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                }
            },
            from: process.env.SENDER_EMAIL || "noreply@policywallet.gr",
            sendVerificationRequest: async ({ identifier: email, url, provider }) => {
                // Wrap the original URL in our handover bridge
                const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
                const token = new URL(url).searchParams.get("token")
                const handoverUrl = `${baseUrl}/auth/handover?token=${token}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(url)}`

                // If BREVO_API_KEY is present, use Brevo API
                if (process.env.BREVO_API_KEY) {
                    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                        method: "POST",
                        headers: {
                            "api-key": process.env.BREVO_API_KEY!,
                            "Content-Type": "application/json",
                            "accept": "application/json",
                        },
                        body: JSON.stringify({
                            sender: { email: process.env.SENDER_EMAIL || "noreply@policywallet.gr", name: "PolicyWallet" },
                            to: [{ email }],
                            subject: "Sign in to PolicyWallet",
                            htmlContent: `
                                <html>
                                  <body>
                                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                      <h2 style="color: #0d9488;">Welcome to PolicyWallet</h2>
                                      <p>Click the button below to sign in to your account.</p>
                                      <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Note: We've added a bridge page to help you open this in our mobile app if you're on your phone.</p>
                                      <a href="${handoverUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In Securely</a>
                                      <p style="margin-top: 24px; font-size: 14px; color: #666;">If you didn't request this email, you can safely ignore it.</p>
                                    </div>
                                  </body>
                                </html>
                            `,
                        }),
                    })

                    if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.message || "Failed to send verification email")
                    }
                } else {
                    console.log("Dev Mode: Magic Link URL:", url)
                }
            },
        }),
    ],
    events: {
        async signIn({ user, account, profile }) {
            try {
                const headersList = await headers()
                const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "127.0.0.1"
                const ua = headersList.get("user-agent") || "unknown"

                await db.securityEvent.create({
                    data: {
                        userId: user.id!,
                        eventType: "login_success",
                        ipAddress: ip,
                        userAgent: ua,
                    }
                })

                await (db.activityLog as any).create({
                    data: {
                        adminUserId: user.id!,
                        adminEmail: user.email!,
                        actionType: "USER_LOGIN",
                        description: `User logged in from ${ip}`,
                    }
                })
            } catch (error) {
                console.error("Error in signIn event:", error)
            }
        },
        async createUser({ user }) {
            try {
                const cookieStore = await cookies()
                const referrerId = cookieStore.get("pw_referrer")?.value

                if (referrerId && user.id) {
                    const referrer = await db.user.findUnique({
                        where: { id: referrerId }
                    })

                    if (referrer) {
                        await db.referral.create({
                            data: {
                                referrerUserId: referrerId,
                                referredUserId: user.id,
                                referredEmail: user.email || "",
                                status: "pending",
                                creditsEarned: 0
                            }
                        })
                    }
                }

                // Sync with Brevo CRM
                if (user.email) {
                    const listId = (user as any).roles === "agent"
                        ? Number(env.BREVO_LIST_ID_AGENTS)
                        : Number(env.BREVO_LIST_ID_USERS)

                    await createBrevoContact({
                        email: user.email,
                        listIds: !isNaN(listId) && listId > 0 ? [listId] : [],
                        attributes: {
                            ROLE: (user as any).roles || "USER",
                            SIGNUP_DATE: new Date().toISOString()
                        }
                    })
                }

            } catch (error) {
                console.error("Error in createUser event:", error)
            }
        }
    },
    callbacks: {
        async session({ token, session }) {
            if (token.sub && session.user) {
                session.user.id = token.sub

                // Fetch user details from database to ensure name and email are populated
                const dbUser = await db.user.findUnique({
                    where: { id: token.sub },
                    select: { name: true, email: true, image: true },
                })

                if (dbUser) {
                    session.user.name = dbUser.name
                    session.user.email = dbUser.email
                    session.user.image = dbUser.image
                }
            }
            if (token.roles && session.user) {
                session.user.roles = token.roles as string
            }
            if (token.sessionId && session.user) {
                session.user.sessionId = token.sessionId as string
            }
            return session
        },
        async jwt({ token, user, trigger }) {
            if (trigger === "signIn" && user?.id) {
                const headersList = await headers()
                const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "127.0.0.1"
                const ua = headersList.get("user-agent") || "unknown"

                const session = await db.activeSession.create({
                    data: {
                        userId: user.id,
                        deviceType: ua.includes("Mobi") ? "mobile" : "desktop",
                        deviceName: ua.slice(0, 255),
                        ipAddress: ip,
                        lastActiveAt: new Date(),
                    }
                })
                token.sessionId = session.id
            }

            if (!token.sub) return token

            // Verify session is still valid (Whitelisting check)
            if (token.sessionId) {
                const activeSession = await db.activeSession.findUnique({
                    where: { id: token.sessionId as string }
                })
                if (!activeSession) {
                    return null as any // Invalidate token
                }
            }

            const dbUser = await db.user.findUnique({
                where: { id: token.sub },
                select: { roles: true, preferredLanguage: true },
            })

            if (dbUser) {
                token.roles = dbUser.roles
                token.preferredLanguage = dbUser.preferredLanguage
            }

            return token
        },
    },
})

