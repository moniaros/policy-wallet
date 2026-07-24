"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, Eye, Trash2, Shield, UserX, CheckCircle, XCircle, Coins } from "lucide-react"
import { toast } from "sonner"
import { changeUserRole, deleteUser, approveAgent, rejectAgent, grantTokens } from "../actions"
import { formatDate } from "@/lib/i18n/format"
import { AdminDialog } from "@/components/admin/AdminDialog"

interface User {
    id: string
    name: string | null
    email: string
    roles: string
    createdAt: Date
    emailVerified: Date | null
    phoneNumber: string | null
    _count: {
        policiesOwned: number
        customerRelationshipsAsAgent: number
    }
    agentProfile: {
        id: string
        verificationStatus: string
        agencyName: string | null
    } | null
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

interface UsersClientProps {
    initialUsers: User[]
    pagination: Pagination
    initialSearch?: string
    initialRoleFilter?: string
}

export default function UsersClient({
    initialUsers,
    pagination,
    initialSearch,
    initialRoleFilter
}: UsersClientProps) {
    const router = useRouter()
    const [search, setSearch] = useState(initialSearch || "")
    const [roleFilter, setRoleFilter] = useState(initialRoleFilter || "all")
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showRoleModal, setShowRoleModal] = useState(false)
    const [showApproveModal, setShowApproveModal] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [verificationReason, setVerificationReason] = useState("")
    const [roleSelection, setRoleSelection] = useState("policyholder")
    const [showTokenModal, setShowTokenModal] = useState(false)
    const [tokenAmount, setTokenAmount] = useState("")
    const [tokenReason, setTokenReason] = useState("")
    const [tokenBusy, setTokenBusy] = useState(false)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (search) params.set("search", search)
        if (roleFilter !== "all") params.set("role", roleFilter)
        router.push(`/admin/users?${params.toString()}`)
    }

    const handleRoleFilterChange = (role: string) => {
        setRoleFilter(role)
        const params = new URLSearchParams()
        if (search) params.set("search", search)
        if (role !== "all") params.set("role", role)
        router.push(`/admin/users?${params.toString()}`)
    }

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams()
        params.set("page", newPage.toString())
        if (search) params.set("search", search)
        if (roleFilter !== "all") params.set("role", roleFilter)
        router.push(`/admin/users?${params.toString()}`)
    }

    const getRoleBadgeColor = (role: string) => {
        if (role.includes("admin")) return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
        if (role.includes("agent")) return "bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint"
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
    }

    const getVerificationBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <span className="flex items-center gap-1 text-xs text-[#166534] dark:text-mint">
                    <CheckCircle className="w-3 h-3" /> Verified
                </span>
            case "pending":
                return <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <Filter className="w-3 h-3" /> Pending
                </span>
            case "rejected":
                return <span className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400">
                    <XCircle className="w-3 h-3" /> Rejected
                </span>
            default:
                return null
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                    User Management
                </h1>
                <p className="text-stone-600 dark:text-stone-400 mt-2">
                    Manage users, roles, and permissions
                </p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pw-input pw-input-sm pl-10 pr-4"
                            />
                        </div>
                    </form>

                    {/* Role Filter */}
                    <div className="flex gap-2">
                        {["all", "policyholder", "agent", "admin"].map((role) => (
                            <button
                                key={role}
                                onClick={() => handleRoleFilterChange(role)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${roleFilter === role
                                    ? "bg-primary text-white dark:text-[#1A2420]"
                                    : "bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600"
                                    }`}
                            >
                                {role === "all" ? "All Users" : role.charAt(0).toUpperCase() + role.slice(1) + "s"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    Policies
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {initialUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                initialUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-stone-900 dark:text-stone-100">
                                                    {user.name || "No name"}
                                                </div>
                                                <div className="text-sm text-stone-500 dark:text-stone-400">
                                                    {user.email}
                                                </div>
                                                {user.agentProfile && (
                                                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                                        {user.agentProfile.agencyName}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(user.roles)}`}>
                                                {user.roles}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {user.emailVerified ? (
                                                    <span className="flex items-center gap-1 text-xs text-[#166534] dark:text-mint">
                                                        <CheckCircle className="w-3 h-3" /> Email Verified
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                                        <XCircle className="w-3 h-3" /> Email Unverified
                                                    </span>
                                                )}
                                                {user.agentProfile && getVerificationBadge(user.agentProfile.verificationStatus)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-stone-900 dark:text-stone-100">
                                            {user._count.policiesOwned}
                                            {user._count.customerRelationshipsAsAgent > 0 && (
                                                <span className="text-xs text-stone-500 dark:text-stone-400 ml-1">
                                                    ({user._count.customerRelationshipsAsAgent} customers)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-stone-500 dark:text-stone-400">
                                            {formatDate(user.createdAt, 'en')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => router.push(`/admin/users/${user.id}`)}
                                                    className="p-2 text-primary dark:text-mint hover:bg-primary-tint dark:hover:bg-primary/15 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setRoleSelection(
                                                            user.roles.includes("admin")
                                                                ? "admin"
                                                                : user.roles.includes("agent")
                                                                    ? "agent"
                                                                    : "policyholder"
                                                        )
                                                        setShowRoleModal(true)
                                                    }}
                                                    className="p-2 text-primary dark:text-mint hover:bg-primary-tint dark:hover:bg-primary/15 rounded-lg transition-colors"
                                                    title="Change Role"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setTokenAmount("")
                                                        setTokenReason("")
                                                        setShowTokenModal(true)
                                                    }}
                                                    className="p-2 text-primary dark:text-mint hover:bg-primary-tint dark:hover:bg-primary/15 rounded-lg transition-colors"
                                                    title="Grant Tokens"
                                                >
                                                    <Coins className="w-4 h-4" />
                                                </button>
                                                {!user.roles.includes("admin") && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user)
                                                            setShowDeleteModal(true)
                                                        }}
                                                        className="p-2 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {user.agentProfile?.verificationStatus === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user)
                                                                setVerificationReason("")
                                                                setShowApproveModal(true)
                                                            }}
                                                            className="p-2 text-[#22C55E] dark:text-mint hover:bg-primary-tint dark:hover:bg-primary/15 rounded-lg transition-colors"
                                                            title="Approve Agent"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user)
                                                                setVerificationReason("")
                                                                setShowRejectModal(true)
                                                            }}
                                                            className="p-2 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Reject Agent"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-700 flex items-center justify-between">
                        <div className="text-sm text-stone-600 dark:text-stone-400">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Approve Modal */}
            {showApproveModal && selectedUser && selectedUser.agentProfile && (
                <AdminDialog open onClose={() => setShowApproveModal(false)} title="Approve Agent">
                        <p className="text-stone-600 dark:text-stone-400 mb-4">
                            Are you sure you want to approve {selectedUser.name || selectedUser.email}? They will gain full agent access.
                        </p>
                        <textarea
                            className="pw-input mb-4"
                            placeholder="Optional notes..."
                            value={verificationReason}
                            onChange={e => setVerificationReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedUser.agentProfile) return
                                    const res = await approveAgent(selectedUser.agentProfile.id, verificationReason)
                                    if (res?.success) {
                                        toast.success("Agent approved") // i18n-hardcoded-ignore
                                        setShowApproveModal(false)
                                        router.refresh()
                                    } else {
                                        toast.error("Failed to approve") // i18n-hardcoded-ignore
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover"
                            >
                                Approve
                            </button>
                        </div>
                </AdminDialog>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedUser && selectedUser.agentProfile && (
                <AdminDialog open onClose={() => setShowRejectModal(false)} title="Reject Agent">
                        <p className="text-stone-600 dark:text-stone-400 mb-4">
                            Please provide a reason for rejecting {selectedUser.name || selectedUser.email}.
                        </p>
                        <textarea
                            className="pw-input mb-4"
                            placeholder="Rejection reason (required)..."
                            value={verificationReason}
                            onChange={e => setVerificationReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!verificationReason) return toast.error("Reason is required") // i18n-hardcoded-ignore
                                    if (!selectedUser.agentProfile) return
                                    const res = await rejectAgent(selectedUser.agentProfile.id, verificationReason)
                                    if (res?.success) {
                                        toast.success("Agent rejected") // i18n-hardcoded-ignore
                                        setShowRejectModal(false)
                                        router.refresh()
                                    } else {
                                        toast.error("Failed to reject") // i18n-hardcoded-ignore
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Reject
                            </button>
                        </div>
                </AdminDialog>
            )}

            {/* Role Modal */}
            {showRoleModal && selectedUser && (
                <AdminDialog open onClose={() => setShowRoleModal(false)} title="Change Role">
                        <p className="text-stone-600 dark:text-stone-400 mb-4">
                            {selectedUser.name || selectedUser.email} — current role:{" "}
                            <span className="font-medium">{selectedUser.roles}</span>
                        </p>
                        <label htmlFor="usersclient-f1" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">
                            New role
                        </label>
                        <select id="usersclient-f1"
                            className="pw-input mb-2"
                            value={roleSelection}
                            onChange={e => setRoleSelection(e.target.value)}
                        >
                            <option value="policyholder">Policyholder</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                        </select>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                            Also syncs the user&apos;s login session role — it takes effect the next time they sign in.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowRoleModal(false)}
                                className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const res = await changeUserRole(selectedUser.id, roleSelection)
                                    if (res.ok) {
                                        toast.success("Role updated") // i18n-hardcoded-ignore
                                        setShowRoleModal(false)
                                        router.refresh()
                                    } else if (res.error === "ROLE_SAVED_JWT_SYNC_FAILED") {
                                        toast.warning("Role saved, but the login session didn't sync. Ask the user to sign out and back in, or retry.") // i18n-hardcoded-ignore
                                        setShowRoleModal(false)
                                        router.refresh()
                                    } else {
                                        toast.error("Failed to change role") // i18n-hardcoded-ignore
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover"
                            >
                                Save
                            </button>
                        </div>
                </AdminDialog>
            )}

            {/* Grant Tokens Modal */}
            {showTokenModal && selectedUser && (
                <AdminDialog open onClose={() => setShowTokenModal(false)} title="Grant Tokens">
                        <p className="text-stone-600 dark:text-stone-400 mb-4">
                            Add AI tokens to {selectedUser.name || selectedUser.email}.
                        </p>
                        <label htmlFor="usersclient-f2" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">
                            Amount (tokens)
                        </label>
                        <input id="usersclient-f2"
                            type="number"
                            min="1"
                            step="1"
                            className="pw-input mb-3"
                            value={tokenAmount}
                            onChange={e => setTokenAmount(e.target.value)}
                        />
                        <label htmlFor="usersclient-f3" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">
                            Reason
                        </label>
                        <input id="usersclient-f3"
                            className="pw-input mb-6"
                            placeholder="e.g. goodwill / support comp"
                            value={tokenReason}
                            onChange={e => setTokenReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowTokenModal(false)}
                                disabled={tokenBusy}
                                className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 rounded disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={tokenBusy || !tokenAmount.trim() || !tokenReason.trim()}
                                onClick={async () => {
                                    const amount = Number(tokenAmount)
                                    if (!Number.isInteger(amount) || amount <= 0) {
                                        toast.error("Enter a whole number of tokens greater than zero.") // i18n-hardcoded-ignore
                                        return
                                    }
                                    setTokenBusy(true)
                                    const res = await grantTokens({ userId: selectedUser.id, amount, reason: tokenReason.trim() })
                                    setTokenBusy(false)
                                    if (res.ok) {
                                        toast.success(`Granted ${amount.toLocaleString()} tokens — new balance ${res.newAvailable.toLocaleString()}.`) // i18n-hardcoded-ignore
                                        setShowTokenModal(false)
                                        router.refresh()
                                    } else {
                                        toast.error(res.error || "Failed to grant tokens.") // i18n-hardcoded-ignore
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover disabled:opacity-50"
                            >
                                {tokenBusy ? "Working…" : "Grant"}
                            </button>
                        </div>
                </AdminDialog>
            )}
        </div>
    )
}
