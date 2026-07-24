
import { redeemInvite } from "@/app/auth/actions"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function InviteRedeemPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const authResult = await getAuthenticatedUserOrNull()

    // 1. Validate Token
    const invite = await db.invite.findUnique({ where: { token } })

    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="bg-card border border-border p-8 rounded-2xl shadow-xl text-center max-w-md">
                    <h1 className="text-xl font-bold text-red-700 mb-2">Invalid or Expired Link</h1>
                    <p className="text-muted-foreground">This invitation link is invalid or has already been used.</p>
                </div>
            </div>
        )
    }

    // Policyholder→advisor "connect" invite (inverse direction): the recipient
    // becomes an agent connected to the inviting policyholder.
    const isClientAgent = invite.inviteType === "signup" && invite.relationshipType === "client_agent"

    // 2. If logged in, redeem and redirect to the right home.
    if (authResult) {
        await redeemInvite(token, authResult.dbUser.id)
        redirect(isClientAgent ? "/dashboard/agent" : "/wallet")
    }

    // 3. Anonymous. Agent→client invites keep the direct signup redirect.
    if (!isClientAgent) {
        redirect(`/auth/signup?token=${token}&email=${encodeURIComponent(invite.inviteeEmail)}`)
    }

    // Policyholder→advisor: the advisor may or may not already have an account,
    // so offer BOTH register and log in. Copy follows the inviter's language
    // (matches the invitation email that was sent).
    const inviter = await db.user.findUnique({
        where: { id: invite.inviterUserId },
        select: { name: true, preferredLanguage: true },
    })
    const lang: "el" | "en" = inviter?.preferredLanguage === "el" ? "el" : "en"
    const inviterName = inviter?.name?.trim() || (lang === "el" ? "Ένα μέλος" : "A member")

    // role=agent makes "Create account" land on the agent signup form; the token
    // auto-connects them after signup. "Log in" returns here authed via callbackUrl.
    const signupHref = `/auth/signup?token=${token}&email=${encodeURIComponent(invite.inviteeEmail)}&role=agent`
    const loginHref = `/auth/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`

    const copy = lang === "el"
        ? {
            title: "Προσκληθήκατε ως σύμβουλος",
            body: `${inviterName} θέλει να σας συνδέσει ως ασφαλιστικό σύμβουλό του στο PolicyWallet. Δημιουργήστε λογαριασμό συμβούλου ή συνδεθείτε — θα συνδεθείτε αυτόματα.`,
            create: "Δημιουργία λογαριασμού συμβούλου",
            login: "Έχω ήδη λογαριασμό — Σύνδεση",
        }
        : {
            title: "You've been invited as an advisor",
            body: `${inviterName} wants to connect you as their insurance advisor on PolicyWallet. Create an advisor account or log in — you'll be connected automatically.`,
            create: "Create advisor account",
            login: "I already have an account — Log in",
        }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="bg-card border border-border p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                <h1 className="text-xl font-black text-foreground mb-2 tracking-tight">{copy.title}</h1>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{copy.body}</p>
                <div className="flex flex-col gap-3">
                    <Link
                        href={signupHref}
                        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                        {copy.create}
                    </Link>
                    <Link
                        href={loginHref}
                        className="inline-flex w-full items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {copy.login}
                    </Link>
                </div>
            </div>
        </div>
    )
}
