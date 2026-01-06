import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import authConfig from "./auth.config"

// Extend built-in session types
declare module "next-auth" {
    interface Session {
        user: {
            id: string
            roles: string
            preferredLanguage: string
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
        ...authConfig.providers,
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
                                      <a href="${url}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In</a>
                                      <p style="margin-top: 24px; font-size: 14px; color: #666;">If you didn't request this email, you can safely ignore it.</p>
                                    </div>
                                  </body>
                                </html>
                            `,
                        }),
                    })

                    if (!response.ok) {
                        const error = await response.text()
                        console.error("BREVO_API_ERROR", error)
                        console.log("Fallback: Magic Link URL:", url)
                        // In production we should throw, but in dev we can just log the link
                        if (process.env.NODE_ENV === "production") {
                            throw new Error("Failed to send verification email via Brevo")
                        }
                    }
                } else {
                    console.log("Dev Mode: Magic Link URL:", url)
                }
            },
        }),
    ],
    callbacks: {
        async session({ token, session }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.roles && session.user) {
                session.user.roles = token.roles as string
            }
            return session
        },
        async jwt({ token }) {
            if (!token.sub) return token

            const user = await db.user.findUnique({
                where: { id: token.sub },
                select: { roles: true, preferredLanguage: true },
            })

            if (user) {
                token.roles = user.roles
                token.preferredLanguage = user.preferredLanguage
            }

            return token
        },
    },
})

