"use client"

import { useState, useEffect } from "react"
import { sharePolicy, revokeShare } from "@/app/(protected)/wallet/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { Users, UserPlus, Mail, Shield, Clock, CheckCircle2, Copy, Trash2, Eye, Edit3, AlertCircle } from "lucide-react"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { Modal } from "@/components/ui/Modal"

export interface Share {
    id: string
    email: string
    name: string | null
    image: string | null
    grantedAt: string
    permissions?: "view" | "edit" | "manage"
}

const MANAGE_BADGE_COPY = {
    el: "Διαχειρίζεται το συμβόλαιο",
    en: "Manages this policy",
} as const

interface CollaborationPanelProps {
    policyId: string
    policyNumber: string
    initialShares: Share[]
    isOwner: boolean
}

const DEFAULT_WALLET_COPY = {
    invitationCreated: "Invitation created. Send the link to your collaborator.",
    invitationEmailFailed: "Email not delivered — copy the link below and share it yourself.",
    policyShared: "Policy shared successfully.",
    linkCopied: "Link copied.",
    revokeAccess: "Revoke access?",
    accessRevoked: "Access revoked.",
    invitationLinkCreated: "Invitation Link Created",
    accessGrantedTo: "Access Granted To",
    revoke: "Revoke",
    collaboration: {
        title: "Collaboration",
        notSharedYet: "Not shared yet",
        emptyDescription: "Invite collaborators to manage this policy together.",
        collaboratorSingular: "collaborator",
        collaboratorPlural: "collaborators",
        invite: "Invite",
        inviteCollaborator: "Invite Collaborator",
        collaboratorEmail: "Collaborator Email",
        collaboratorEmailPlaceholder: "agent@example.com",
        permissions: "Permissions",
        viewOnly: "View Only",
        readOnlyAccess: "Read-only access",
        canEdit: "Can Edit",
        fullManagement: "Full management",
        cancel: "Cancel",
        sending: "Sending...",
        sendInvite: "Send Invite",
        minutesAgo: "{count}m ago",
        hoursAgo: "{count}h ago",
        daysAgo: "{count}d ago",
        agent: "Agent",
        footerInfo: "Collaborators can access this policy based on granted permissions.",
    },
} as const

export function CollaborationPanel({ policyId, policyNumber: _policyNumber, initialShares, isOwner }: CollaborationPanelProps) {
    const { t, language } = useLanguage()
    const walletCopy = t.wallet ?? DEFAULT_WALLET_COPY
    const [revokingId, setRevokingId] = useState<string | null>(null)
    const [isRevoking, setIsRevoking] = useState(false)
    const copy = walletCopy.collaboration ?? DEFAULT_WALLET_COPY.collaboration
    const locale = t.common.locale || "en-GB"
    const [shares, setShares] = useState<Share[]>(initialShares)
    const [email, setEmail] = useState("")
    const [permissions, setPermissions] = useState<"view" | "edit">("view")
    const [loading, setLoading] = useState(false)
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const [showInviteForm, setShowInviteForm] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setShares(initialShares)
    }, [initialShares])

    const handleShare = async () => {
        if (!email) return

        setLoading(true)
        setInviteLink(null)
        const res = await sharePolicy(policyId, email, permissions)
        setLoading(false)

        if (res.error) {
            toast.error(mapWalletErrorToMessage(res.error, t, "sharePolicy"))
            return
        }

        if (res.link) {
            setInviteLink(res.link)
            if (res.emailDelivered === false) {
                toast.warning(walletCopy.invitationEmailFailed)
            } else {
                toast.success(walletCopy.invitationCreated)
            }
            trackJourneyEvent("first_policy_shared", {
                policy_id: policyId,
                share_type: "agent_invite",
            })
        } else {
            toast.success(walletCopy.policyShared)
            trackJourneyEvent("first_policy_shared", {
                policy_id: policyId,
                share_type: "agent_existing",
            })
        }

        setEmail("")
        setShowInviteForm(false)
        router.refresh()
    }

    const copyLink = () => {
        if (!inviteLink) return

        navigator.clipboard
            .writeText(inviteLink)
            .then(() => toast.success(walletCopy.linkCopied))
            .catch(() => toast.error(mapWalletErrorToMessage("COPY_FAILED", t, "copy")))
    }

    // Revoke is destructive — confirm in a branded dialog instead of the old
    // native confirm() (which ignored the design system and gave no pending state).
    const confirmRevoke = async () => {
        if (!revokingId) return
        setIsRevoking(true)
        const res = await revokeShare(revokingId)
        setIsRevoking(false)
        setRevokingId(null)
        if (res.success) {
            toast.success(walletCopy.accessRevoked)
            router.refresh()
        } else if (res.error) {
            toast.error(mapWalletErrorToMessage(res.error, t, "revokeShare"))
        }
    }

    const getPermissionBadge = (permission: "view" | "edit" | "manage" = "view") => {
        if (permission === "manage") {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-soft dark:bg-primary/15 border border-primary/30 dark:border-primary/40 rounded-full">
                    <Shield className="w-3 h-3 text-[#166534] dark:text-mint" />
                    <span className="text-kicker font-bold text-[#166534] dark:text-mint uppercase tracking-wider">{MANAGE_BADGE_COPY[language]}</span>
                </div>
            )
        }

        if (permission === "edit") {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full">
                    <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-kicker font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">{copy.canEdit}</span>
                </div>
            )
        }

        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-soft dark:bg-primary/15 border border-primary/30 dark:border-primary/40 rounded-full">
                <Eye className="w-3 h-3 text-primary dark:text-mint" />
                <span className="text-kicker font-bold text-primary dark:text-mint uppercase tracking-wider">{copy.viewOnly}</span>
            </div>
        )
    }

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return copy.minutesAgo.replace("{count}", String(diffMins))
        if (diffHours < 24) return copy.hoursAgo.replace("{count}", String(diffHours))
        if (diffDays < 7) return copy.daysAgo.replace("{count}", String(diffDays))

        return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
    }

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-primary-tint dark:bg-primary/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                            <Users className="w-5 h-5 text-white dark:text-[#1A2420]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{copy.title}</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {shares.length === 0
                                    ? copy.notSharedYet
                                    : `${shares.length} ${shares.length === 1 ? copy.collaboratorSingular : copy.collaboratorPlural}`}
                            </p>
                        </div>
                    </div>
                    {isOwner && (
                        <button
                            onClick={() => setShowInviteForm(!showInviteForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-xl font-bold text-sm shadow-lg shadow-primary/25 transition-all duration-200 active:scale-95"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">{copy.invite}</span>
                        </button>
                    )}
                </div>
            </div>

            {inviteLink && (
                <div className="mx-6 mt-6 bg-primary-tint dark:bg-primary/15 border border-primary-soft dark:border-primary/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <CheckCircle2 className="w-5 h-5 text-primary dark:text-mint" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#166534] dark:text-mint mb-2">{walletCopy.invitationLinkCreated}</p>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={inviteLink}
                                    className="pw-input pw-input-sm flex-1 font-mono border-primary-soft"
                                />
                                <button
                                    onClick={copyLink}
                                    className="pw-primary-button"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    {t.common.copy}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isOwner && showInviteForm && (
                <div className="mx-6 mt-6 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="collaborator-email" className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                <Mail className="w-3.5 h-3.5" />
                                {copy.collaboratorEmail}
                            </label>
                            <input
                                id="collaborator-email"
                                type="email"
                                placeholder={copy.collaboratorEmailPlaceholder}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="pw-input"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                <Shield className="w-3.5 h-3.5" />
                                {copy.permissions}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPermissions("view")}
                                    className={`group relative px-4 py-3 rounded-xl border-2 transition-all duration-200 ${permissions === "view"
                                        ? "bg-primary-tint dark:bg-primary/15 border-primary dark:border-mint shadow-lg shadow-primary/20"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/40 dark:hover:border-primary/60"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Eye className={`w-4 h-4 ${permissions === "view" ? "text-primary dark:text-mint" : "text-slate-400"}`} />
                                        <span className={`text-sm font-bold ${permissions === "view" ? "text-primary dark:text-mint" : "text-slate-600 dark:text-slate-400"}`}>
                                            {copy.viewOnly}
                                        </span>
                                    </div>
                                    <p className={`text-kicker font-medium ${permissions === "view" ? "text-[#166534] dark:text-mint" : "text-slate-500"}`}>
                                        {copy.readOnlyAccess}
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPermissions("edit")}
                                    className={`group relative px-4 py-3 rounded-xl border-2 transition-all duration-200 ${permissions === "edit"
                                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Edit3 className={`w-4 h-4 ${permissions === "edit" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                                        <span className={`text-sm font-bold ${permissions === "edit" ? "text-amber-900 dark:text-amber-100" : "text-slate-600 dark:text-slate-400"}`}>
                                            {copy.canEdit}
                                        </span>
                                    </div>
                                    <p className={`text-kicker font-medium ${permissions === "edit" ? "text-amber-700 dark:text-amber-300" : "text-slate-500"}`}>
                                        {copy.fullManagement}
                                    </p>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInviteForm(false)
                                    setEmail("")
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                {copy.cancel}
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={loading || !email}
                                className="pw-primary-button flex-1 shadow-primary/25"
                            >
                                {loading ? copy.sending : copy.sendInvite}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6">
                {shares.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Users className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{copy.notSharedYet}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">{copy.emptyDescription}</p>
                        {isOwner && !showInviteForm && (
                            <button
                                onClick={() => setShowInviteForm(true)}
                                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-xl font-bold text-sm shadow-lg shadow-primary/25 transition-all duration-200 active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" />
                                {copy.inviteCollaborator}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <p className="text-kicker font-black text-slate-400 uppercase tracking-widest">{walletCopy.accessGrantedTo}</p>
                        </div>
                        {shares.map((share, index) => (
                            <div
                                key={share.id}
                                className="group relative p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/40 dark:hover:border-primary/60 transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-left-2"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="relative flex-shrink-0">
                                            {share.image ? (
                                                <img
                                                    src={share.image}
                                                    alt={share.name || share.email}
                                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white dark:text-[#1A2420] font-bold text-sm shadow-lg">
                                                    {(share.name?.[0] || share.email[0]).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                                <CheckCircle2 className="w-2.5 h-2.5 text-white dark:text-[#1A2420]" />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{share.name || copy.agent}</p>
                                                {getPermissionBadge(share.permissions)}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">{share.email}</p>
                                            <div className="flex items-center gap-1.5 text-kicker text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                <span>{getTimeAgo(share.grantedAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {isOwner && (
                                        <button
                                            onClick={() => setRevokingId(share.id)}
                                            className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                                            aria-label={walletCopy.revoke}
                                            title={walletCopy.revoke}
                                        >
                                            <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {shares.length > 0 && (
                <div className="px-6 pb-6">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{copy.footerInfo}</p>
                    </div>
                </div>
            )}

            <Modal
                isOpen={revokingId !== null}
                onClose={() => setRevokingId(null)}
                ariaLabel={walletCopy.revokeAccess}
                closeLabel={t.common.cancel}
                className="max-w-md"
            >
                <div className="p-6 sm:p-7">
                    <h2 className="text-lg font-black text-foreground">{walletCopy.revokeAccess}</h2>
                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setRevokingId(null)}
                            className="flex-1 py-3 px-4 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {t.common.cancel}
                        </button>
                        <button
                            type="button"
                            onClick={confirmRevoke}
                            disabled={isRevoking}
                            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                        >
                            {walletCopy.revoke}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
