"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, Eye, Trash2, Shield, UserX, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { changeUserRole, deleteUser, approveAgent, rejectAgent } from "../actions"

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
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showRoleModal, setShowRoleModal] = useState(false)
    const [showApproveModal, setShowApproveModal] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [verificationReason, setVerificationReason] = useState("")

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
                return <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <Filter className="w-3 h-3" /> Pending
                </span>
            case "rejected":
                return <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
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
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
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
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setShowDetailModal(true)
                                                    }}
                                                    className="p-2 text-primary dark:text-mint hover:bg-primary-tint dark:hover:bg-primary/15 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setShowRoleModal(true)
                                                    }}
                                                    className="p-2 text-primary dark:text-mint hover:bg-primary-tint dark:hover:bg-primary/15 rounded-lg transition-colors"
                                                    title="Change Role"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                                {!user.roles.includes("admin") && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user)
                                                            setShowDeleteModal(true)
                                                        }}
                                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

            {/* Modals would go here - simplified for now */}
            {showDetailModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-stone-200 dark:border-stone-700">
                            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                                User Details
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">Name</label>
                                <p className="text-stone-900 dark:text-stone-100">{selectedUser.name || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">Email</label>
                                <p className="text-stone-900 dark:text-stone-100">{selectedUser.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">Role</label>
                                <p className="text-stone-900 dark:text-stone-100">{selectedUser.roles}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">Phone</label>
                                <p className="text-stone-900 dark:text-stone-100">{selectedUser.phoneNumber || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">Policies Owned</label>
                                <p className="text-stone-900 dark:text-stone-100">{selectedUser._count.policiesOwned}</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-stone-200 dark:border-stone-700 flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedUser && selectedUser.agentProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Approve Agent</h2>
                        <p className="text-stone-600 dark:text-stone-400 mb-4">
                            Are you sure you want to approve {selectedUser.name || selectedUser.email}? They will gain full agent access.
                        </p>
                        <textarea
                            className="w-full p-2 border rounded mb-4 dark:bg-stone-700 dark:border-stone-600 dark:text-white"
                            placeholder="Optional notes..."
                            value={verificationReason}
                            onChange={e => setVerificationReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedUser.agentProfile) return
                                    const res = await approveAgent(selectedUser.agentProfile.id, verificationReason)
                                    if (res?.success) {
                                        toast.success("Agent approved")
                                        setShowApproveModal(false)
                                        router.refresh()
                                    } else {
                                        toast.error("Failed to approve")
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover"
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedUser && selectedUser.agentProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Reject Agent</h2>
                        <p className="text-stone-600 dark:text-stone-400 mb-4">
                            Please provide a reason for rejecting {selectedUser.name || selectedUser.email}.
                        </p>
                        <textarea
                            className="w-full p-2 border rounded mb-4 dark:bg-stone-700 dark:border-stone-600 dark:text-white"
                            placeholder="Rejection reason (required)..."
                            value={verificationReason}
                            onChange={e => setVerificationReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!verificationReason) return toast.error("Reason is required")
                                    if (!selectedUser.agentProfile) return
                                    const res = await rejectAgent(selectedUser.agentProfile.id, verificationReason)
                                    if (res?.success) {
                                        toast.success("Agent rejected")
                                        setShowRejectModal(false)
                                        router.refresh()
                                    } else {
                                        toast.error("Failed to reject")
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
