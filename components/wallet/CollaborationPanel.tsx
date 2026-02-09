"use client"

import { useState, useEffect } from "react"
import { sharePolicy, revokeShare } from "@/app/(protected)/wallet/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { Users, UserPlus, Mail, Shield, Clock, CheckCircle2, XCircle, Copy, Trash2, Eye, Edit3, AlertCircle } from "lucide-react"

export interface Share {
    id: string
    email: string
    name: string | null
    image: string | null
    grantedAt: string
    permissions?: 'view' | 'edit'
}

interface CollaborationPanelProps {
    policyId: string
    policyNumber: string
    initialShares: Share[]
    isOwner: boolean
}

export function CollaborationPanel({ policyId, policyNumber, initialShares, isOwner }: CollaborationPanelProps) {
    const { t, language } = useLanguage()
    const lang = language || (t.common.locale === 'el-GR' ? 'el' : 'en')
    const [shares, setShares] = useState<Share[]>(initialShares)
    const [email, setEmail] = useState("")
    const [permissions, setPermissions] = useState<'view' | 'edit'>('view')
    const [loading, setLoading] = useState(false)
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const [showInviteForm, setShowInviteForm] = useState(false)
    const router = useRouter()

    // Sync state with props when server revalidates
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
            toast.error(res.error)
        } else {
            if (res.link) {
                setInviteLink(res.link)
                toast.success(t.wallet.invitationCreated || 'Invitation created')
                trackJourneyEvent("first_policy_shared", {
                    policy_id: policyId,
                    share_type: "agent_invite",
                })
            } else {
                toast.success(t.wallet.policyShared || 'Policy shared successfully')
                trackJourneyEvent("first_policy_shared", {
                    policy_id: policyId,
                    share_type: "agent_existing",
                })
            }
            setEmail("")
            setShowInviteForm(false)
            router.refresh()
        }
    }

    const copyLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink)
            toast.success(t.wallet.linkCopied || 'Link copied to clipboard')
        }
    }

    const handleRevoke = async (grantId: string) => {
        if (!confirm(t.wallet.revokeAccess || 'Revoke access?')) return
        const res = await revokeShare(grantId)
        if (res.success) {
            toast.success(t.wallet.accessRevoked || 'Access revoked')
            router.refresh()
        }
    }

    const getPermissionBadge = (permission: 'view' | 'edit' = 'view') => {
        if (permission === 'edit') {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        {lang === 'el' ? 'Επεξεργασία' : 'Can Edit'}
                    </span>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    {lang === 'el' ? 'Προβολή' : 'View Only'}
                </span>
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

        if (diffMins < 60) return lang === 'el' ? `Πριν ${diffMins} λεπτά` : `${diffMins}m ago`
        if (diffHours < 24) return lang === 'el' ? `Πριν ${diffHours} ώρες` : `${diffHours}h ago`
        if (diffDays < 7) return lang === 'el' ? `Πριν ${diffDays} ημέρες` : `${diffDays}d ago`
        return date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-teal-50/50 to-blue-50/50 dark:from-teal-950/20 dark:to-blue-950/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {lang === 'el' ? 'Συνεργασία' : 'Collaboration'}
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {initialShares.length === 0
                                    ? (lang === 'el' ? 'Δεν έχει μοιραστεί ακόμα' : 'Not shared yet')
                                    : `${initialShares.length} ${lang === 'el' ? 'συνεργάτες' : initialShares.length === 1 ? 'collaborator' : 'collaborators'}`
                                }
                            </p>
                        </div>
                    </div>
                    {isOwner && (
                        <button
                            onClick={() => setShowInviteForm(!showInviteForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-500/20 transition-all duration-200 active:scale-95"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">{lang === 'el' ? 'Πρόσκληση' : 'Invite'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Invite Link Banner */}
            {inviteLink && (
                <div className="mx-6 mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                                {lang === 'el' ? 'Σύνδεσμος πρόσκλησης δημιουργήθηκε!' : 'Invitation link created!'}
                            </p>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={inviteLink}
                                    className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono rounded-lg border border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    onClick={copyLink}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    {lang === 'el' ? 'Αντιγραφή' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Form */}
            {isOwner && showInviteForm && (
                <div className="mx-6 mt-6 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                        {/* Email Input */}
                        <div className="space-y-2">
                            <label htmlFor="collaborator-email" className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                <Mail className="w-3.5 h-3.5" />
                                {lang === 'el' ? 'Email Συνεργάτη' : 'Collaborator Email'}
                            </label>
                            <input
                                id="collaborator-email"
                                type="email"
                                placeholder={lang === 'el' ? 'agent@example.com' : 'agent@example.com'}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Permission Selection */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                <Shield className="w-3.5 h-3.5" />
                                {lang === 'el' ? 'Δικαιώματα' : 'Permissions'}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPermissions('view')}
                                    className={`group relative px-4 py-3 rounded-xl border-2 transition-all duration-200 ${permissions === 'view'
                                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Eye className={`w-4 h-4 ${permissions === 'view' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                                        <span className={`text-sm font-bold ${permissions === 'view' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {lang === 'el' ? 'Προβολή' : 'View Only'}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] font-medium ${permissions === 'view' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                                        {lang === 'el' ? 'Μόνο ανάγνωση' : 'Read-only access'}
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPermissions('edit')}
                                    className={`group relative px-4 py-3 rounded-xl border-2 transition-all duration-200 ${permissions === 'edit'
                                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Edit3 className={`w-4 h-4 ${permissions === 'edit' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                        <span className={`text-sm font-bold ${permissions === 'edit' ? 'text-amber-900 dark:text-amber-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {lang === 'el' ? 'Επεξεργασία' : 'Can Edit'}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] font-medium ${permissions === 'edit' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>
                                        {lang === 'el' ? 'Πλήρης διαχείριση' : 'Full management'}
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInviteForm(false)
                                    setEmail("")
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                {lang === 'el' ? 'Ακύρωση' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={loading || !email}
                                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20 transition-all duration-200 active:scale-95"
                            >
                                {loading ? (lang === 'el' ? 'Αποστολή...' : 'Sending...') : (lang === 'el' ? 'Αποστολή Πρόσκλησης' : 'Send Invite')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Collaborators List */}
            <div className="p-6">
                {initialShares.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                            <Users className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                            {lang === 'el' ? 'Δεν έχει μοιραστεί ακόμα' : 'Not shared yet'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                            {lang === 'el'
                                ? 'Προσκαλέστε συνεργάτες για να διαχειριστούν μαζί σας αυτό το συμβόλαιο'
                                : 'Invite collaborators to manage this policy together with you'}
                        </p>
                        {isOwner && !showInviteForm && (
                            <button
                                onClick={() => setShowInviteForm(true)}
                                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-500/20 transition-all duration-200 active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" />
                                {lang === 'el' ? 'Πρόσκληση Συνεργάτη' : 'Invite Collaborator'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {lang === 'el' ? 'Πρόσβαση Χορηγήθηκε Σε' : 'Access Granted To'}
                            </p>
                        </div>
                        {initialShares.map((share, index) => (
                            <div
                                key={share.id}
                                className="group relative p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-left-2"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            {share.image ? (
                                                <img
                                                    src={share.image}
                                                    alt={share.name || share.email}
                                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {(share.name?.[0] || share.email[0]).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                    {share.name || (lang === 'el' ? 'Σύμβουλος' : 'Agent')}
                                                </p>
                                                {getPermissionBadge(share.permissions)}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">
                                                {share.email}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                <span>{getTimeAgo(share.grantedAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {isOwner && (
                                        <button
                                            onClick={() => handleRevoke(share.id)}
                                            className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors group/btn"
                                            title={lang === 'el' ? 'Ανάκληση πρόσβασης' : 'Revoke access'}
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

            {/* Info Footer */}
            {initialShares.length > 0 && (
                <div className="px-6 pb-6">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            {lang === 'el'
                                ? 'Οι συνεργάτες μπορούν να βλέπουν και να διαχειρίζονται αυτό το συμβόλαιο βάσει των δικαιωμάτων τους. Μπορείτε να ανακαλέσετε την πρόσβαση ανά πάσα στιγμή.'
                                : 'Collaborators can view and manage this policy based on their permissions. You can revoke access at any time.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
