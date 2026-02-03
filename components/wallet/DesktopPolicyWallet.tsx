"use client"

import React, { useState } from 'react'
import {
    Search,
    Filter,
    Grid3x3,
    List,
    Calendar,
    TrendingUp,
    Shield,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Download,
    Share2,
    MoreVertical
} from 'lucide-react'
import type { Policy } from './types'

interface DesktopPolicyWalletProps {
    policies: Policy[]
    onViewPolicy: (id: string) => void
    onAddPolicy: () => void
    onSharePolicy: (id: string) => void
    onDownloadPolicy: (id: string) => void
}

export function DesktopPolicyWallet({
    policies,
    onViewPolicy,
    onAddPolicy,
    onSharePolicy,
    onDownloadPolicy
}: DesktopPolicyWalletProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'action_needed'>('all')
    const [filterType, setFilterType] = useState<'all' | string>('all')

    // Filter policies
    const filteredPolicies = policies.filter(p => {
        const matchesSearch = !searchQuery ||
            p.policyNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.insurerName?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = filterStatus === 'all' || p.status === filterStatus
        const matchesType = filterType === 'all' || p.lineOfBusiness === filterType

        return matchesSearch && matchesStatus && matchesType
    })

    // Calculate stats
    const stats = {
        total: policies.length,
        active: policies.filter(p => p.status === 'active').length,
        expiring: policies.filter(p => p.status === 'expiring_soon').length,
        actionNeeded: policies.filter(p => p.status === 'action_needed').length
    }

    const policyTypes = Array.from(new Set(policies.map(p => p.lineOfBusiness)))

    const getStatusIcon = (status: Policy['status']) => {
        switch (status) {
            case 'active':
                return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            case 'expiring_soon':
                return <AlertTriangle className="w-4 h-4 text-amber-600" />
            case 'action_needed':
                return <AlertTriangle className="w-4 h-4 text-red-600" />
            default:
                return <Shield className="w-4 h-4 text-slate-400" />
        }
    }

    const getStatusColor = (status: Policy['status']) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            case 'expiring_soon':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
            case 'action_needed':
                return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        }
    }

    const getPolicyIcon = (type: string) => {
        const icons: Record<string, string> = {
            motor: '🚗',
            health: '❤️',
            home: '🏠',
            life: '🛡️',
            travel: '✈️',
            liability: '⚖️'
        }
        return icons[type] || '📋'
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-[1400px] mx-auto px-8 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1" style={{ fontFamily: 'Fira Code, monospace' }}>
                                Policy Wallet
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400" style={{ fontFamily: 'Fira Sans, sans-serif' }}>
                                Manage all your insurance policies in one place
                            </p>
                        </div>
                        <button
                            onClick={onAddPolicy}
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                            style={{ fontFamily: 'Fira Sans, sans-serif' }}
                        >
                            <FileText className="w-5 h-5" />
                            Add Policy
                        </button>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Policies</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stats.total}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stats.active}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-950 rounded-lg">
                                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Expiring Soon</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stats.expiring}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Action Needed</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stats.actionNeeded}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-8 py-8">
                {/* Filters and Search */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="search"
                                placeholder="Search policies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ fontFamily: 'Fira Sans, sans-serif' }}
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ fontFamily: 'Fira Sans, sans-serif' }}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="expiring_soon">Expiring Soon</option>
                            <option value="action_needed">Action Needed</option>
                        </select>

                        {/* Type Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ fontFamily: 'Fira Sans, sans-serif' }}
                        >
                            <option value="all">All Types</option>
                            {policyTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        {/* View Mode */}
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                            >
                                <Grid3x3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                            >
                                <List className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Policies Grid/List */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-3 gap-6">
                        {filteredPolicies.map(policy => (
                            <div
                                key={policy.id}
                                onClick={() => onViewPolicy(policy.id)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{getPolicyIcon(policy.lineOfBusiness as string)}</span>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                                {policy.insurerName}
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {policy.policyNumber}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreVertical className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                {/* Status */}
                                <div className="mb-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(policy.status)}`}>
                                        {getStatusIcon(policy.status)}
                                        {policy.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Dates */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Start Date</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {policy.startDate ? new Date(policy.startDate).toLocaleDateString() : '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">End Date</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {policy.endDate ? new Date(policy.endDate).toLocaleDateString() : '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onSharePolicy(policy.id)
                                        }}
                                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Share
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDownloadPolicy(policy.id)
                                        }}
                                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Policy</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Start Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">End Date</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredPolicies.map(policy => (
                                    <tr
                                        key={policy.id}
                                        onClick={() => onViewPolicy(policy.id)}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{getPolicyIcon(policy.lineOfBusiness as string)}</span>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{policy.insurerName}</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">{policy.policyNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 capitalize">
                                            {policy.lineOfBusiness}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(policy.status)}`}>
                                                {getStatusIcon(policy.status)}
                                                {policy.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                            {policy.startDate ? new Date(policy.startDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                            {policy.endDate ? new Date(policy.endDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onSharePolicy(policy.id)
                                                    }}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDownloadPolicy(policy.id)
                                                    }}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Empty State */}
                {filteredPolicies.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                        <Shield className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            No policies found
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            {searchQuery ? 'Try adjusting your search or filters' : 'Add your first policy to get started'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={onAddPolicy}
                                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                            >
                                Add Your First Policy
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
