import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { z } from "zod"

export default {
    providers: [
        CredentialsProvider({
            name: "Sign in",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "hello@example.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // This will be called on the server, but for Middleware we just need the structure
                // Actually, Middleware only needs the session check, but we need to define providers here
                // to avoid "no providers" error if we use this for certain things.
                return null
            },
        }),
    ],
} satisfies NextAuthConfig
