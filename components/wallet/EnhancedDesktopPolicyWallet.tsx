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
    MoreVertical,
    PieChart,
    BarChart3,
    Clock,
    DollarSign,
    Eye,
    Star,
    Bell
} from 'lucide-react'
import type { Policy } from './types'

interface EnhancedDesktopPolicyWalletProps {
    policies: Policy[]
    onViewPolicy: (id: string) => void
    onAddPolicy: () => void
    onSharePolicy: (id: string) => void
    onDownloadPolicy: (id: string) => void
}

export function EnhancedDesktopPolicyWallet({
    policies,
    onViewPolicy,
    onAddPolicy,
    onSharePolicy,
    onDownloadPolicy
}: EnhancedDesktopPolicyWalletProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'action_needed'>('all')
    const [filterType, setFilterType] = useState<'all' | string>('all')
    const [showInsights, setShowInsights] = useState(true)

    // Filter policies
    const filteredPolicies = policies.filter(p => {
        const matchesSearch = !searchQuery ||
            p.policyNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.insurerName?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = filterStatus === 'all' || p.status === filterStatus
        const matchesType = filterType === 'all' || p.lineOfBusiness === filterType

        return matchesSearch && matchesStatus && matchesType
    })

    // Calculate comprehensive stats
    const stats = {
        total: policies.length,
        active: policies.filter(p => p.status === 'active').length,
        expiring: policies.filter(p => p.status === 'expiring_soon').length,
        actionNeeded: policies.filter(p => p.status === 'action_needed').length,
        totalPremium: policies.reduce((sum, p) => {
            const acordData = p.acordData as any
            const premium = parseFloat(acordData?.policy?.premium?.amount?.toString() || '0')
            return sum + premium
        }, 0),
        avgPremium: policies.length > 0 ? policies.reduce((sum, p) => {
            const acordData = p.acordData as any
            const premium = parseFloat(acordData?.policy?.premium?.amount?.toString() || '0')
            return sum + premium
        }, 0) / policies.length : 0
    }

    // Coverage breakdown
    const coverageByType = policies.reduce((acc, p) => {
        const type = p.lineOfBusiness as string
        acc[type] = (acc[type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const policyTypes = Array.from(new Set(policies.map(p => p.lineOfBusiness)))

    const getStatusIcon = (status: Policy['status']) => {
        switch (status) {
            case 'active':
                return <CheckCircle2 className="w-4 h-4" />
            case 'expiring_soon':
                return <Clock className="w-4 h-4" />
            case 'action_needed':
                return <AlertTriangle className="w-4 h-4" />
            default:
                return <Shield className="w-4 h-4" />
        }
    }

    const getStatusColor = (status: Policy['status']) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-500 text-white'
            case 'expiring_soon':
                return 'bg-amber-500 text-white'
            case 'action_needed':
                return 'bg-red-500 text-white'
            default:
                return 'bg-slate-400 text-white'
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

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            motor: 'from-blue-500 to-blue-600',
            health: 'from-red-500 to-pink-600',
            home: 'from-green-500 to-emerald-600',
            life: 'from-purple-500 to-purple-600',
            travel: 'from-cyan-500 to-blue-600',
            liability: 'from-amber-500 to-orange-600'
        }
        return colors[type] || 'from-slate-500 to-slate-600'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-900 dark:to-cyan-900 text-white">
                <div className="max-w-[1200px] mx-auto px-8 py-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Fira Code, monospace' }}>
                                My Insurance Portfolio
                            </h1>
                            <p className="text-blue-100 text-lg" style={{ fontFamily: 'Fira Sans, sans-serif' }}>
                                All your coverage in one place
                            </p>
                        </div>
                        <button
                            onClick={onAddPolicy}
                            className="px-8 py-4 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 group"
                            style={{ fontFamily: 'Fira Sans, sans-serif' }}
                        >
                            <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            Add New Policy
                        </button>
                    </div>

                    {/* Quick Stats Cards */}
                    <div className="grid grid-cols-4 gap-6">
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-white/20 rounded-xl">
                                    <Shield className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm">Total Policies</p>
                                    <p className="text-4xl font-bold" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stats.total}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-emerald-500/30 rounded-xl">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-200" />
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm">Active Coverage</p>
                                    <p className="text-4xl font-bold" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stats.active}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-amber-500/30 rounded-xl">
                                    <Clock className="w-8 h-8 text-amber-200" />
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm">Expiring Soon</p>
                                    <p className="text-4xl font-bold" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {stats.expiring}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-purple-500/30 rounded-xl">
                                    <DollarSign className="w-8 h-8 text-purple-200" />
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm">Total Premium</p>
                                    <p className="text-3xl font-bold" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        €{(stats.totalPremium / 1000).toFixed(1)}K
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-8 py-8">
                {/* Insights Panel */}
                {showInsights && stats.expiring > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-l-4 border-amber-500 rounded-xl p-6 mb-8 shadow-lg">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-500 rounded-xl">
                                    <Bell className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                                        Action Required: {stats.expiring} {stats.expiring === 1 ? 'Policy' : 'Policies'} Expiring Soon
                                    </h3>
                                    <p className="text-amber-800 dark:text-amber-200 mb-3">
                                        Don't let your coverage lapse. Review and renew your policies before they expire.
                                    </p>
                                    <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors">
                                        Review Expiring Policies
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowInsights(false)}
                                className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Coverage Breakdown */}
                <div className="grid grid-cols-12 gap-6 mb-8">
                    {/* Coverage by Type */}
                    <div className="col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <PieChart className="w-6 h-6 text-blue-600" />
                                Coverage Breakdown
                            </h2>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {Object.entries(coverageByType).map(([type, count]) => (
                                <div
                                    key={type}
                                    className="group relative overflow-hidden rounded-xl p-4 bg-gradient-to-br hover:shadow-lg transition-all cursor-pointer"
                                    style={{ background: `linear-gradient(135deg, ${getTypeColor(type).replace('from-', '').replace(' to-', ', ')})` }}
                                >
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-4xl">{getPolicyIcon(type)}</span>
                                            <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Fira Code, monospace' }}>
                                                {count}
                                            </span>
                                        </div>
                                        <p className="text-white font-semibold capitalize text-lg">
                                            {type}
                                        </p>
                                        <p className="text-white/80 text-sm">
                                            {count === 1 ? 'Policy' : 'Policies'}
                                        </p>
                                    </div>
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-800">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
                        <div className="space-y-3">
                            <button className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-3">
                                <FileText className="w-5 h-5" />
                                Add New Policy
                            </button>
                            <button className="w-full p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold transition-all flex items-center gap-3">
                                <Download className="w-5 h-5" />
                                Download All
                            </button>
                            <button className="w-full p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold transition-all flex items-center gap-3">
                                <BarChart3 className="w-5 h-5" />
                                View Analytics
                            </button>
                            <button className="w-full p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold transition-all flex items-center gap-3">
                                <Share2 className="w-5 h-5" />
                                Share with Agent
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 mb-6 shadow-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="search"
                                placeholder="Search by policy number, insurer, or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                style={{ fontFamily: 'Fira Sans, sans-serif' }}
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                            className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            style={{ fontFamily: 'Fira Sans, sans-serif' }}
                        >
                            <option value="all">All Types</option>
                            {policyTypes.map(type => (
                                <option key={type} value={type} className="capitalize">{type}</option>
                            ))}
                        </select>

                        {/* View Mode */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-md' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                <Grid3x3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-md' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                <List className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Policies Grid */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-3 gap-6">
                        {filteredPolicies.map(policy => (
                            <div
                                key={policy.id}
                                onClick={() => onViewPolicy(policy.id)}
                                className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer"
                            >
                                {/* Card Header with Gradient */}
                                <div className={`h-32 bg-gradient-to-br ${getTypeColor(policy.lineOfBusiness as string)} p-6 relative overflow-hidden`}>
                                    <div className="absolute top-4 right-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(policy.status)} shadow-lg`}>
                                            {getStatusIcon(policy.status)}
                                            {policy.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="relative z-10">
                                        <span className="text-6xl mb-2 block">{getPolicyIcon(policy.lineOfBusiness as string)}</span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/10" />
                                </div>

                                {/* Card Body */}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1" style={{ fontFamily: 'Fira Code, monospace' }}>
                                        {policy.insurerName}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-mono">
                                        {policy.policyNumber}
                                    </p>

                                    {/* Dates */}
                                    <div className="space-y-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Valid Until
                                            </span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {policy.endDate ? new Date(policy.endDate).toLocaleDateString() : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onViewPolicy(policy.id)
                                            }}
                                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDownloadPolicy(policy.id)
                                            }}
                                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onSharePolicy(policy.id)
                                            }}
                                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* List View - Same as before */
                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900 dark:text-white">Policy</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900 dark:text-white">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900 dark:text-white">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900 dark:text-white">Expires</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">Actions</th>
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
                                                <span className="text-3xl">{getPolicyIcon(policy.lineOfBusiness as string)}</span>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{policy.insurerName}</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{policy.policyNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 capitalize font-medium">
                                            {policy.lineOfBusiness}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(policy.status)}`}>
                                                {getStatusIcon(policy.status)}
                                                {policy.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">
                                            {policy.endDate ? new Date(policy.endDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onViewPolicy(policy.id)
                                                    }}
                                                    className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onSharePolicy(policy.id)
                                                    }}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 text-center shadow-lg border border-slate-200 dark:border-slate-800">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <Shield className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                            {searchQuery ? 'No policies found' : 'Start building your insurance portfolio'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            {searchQuery
                                ? 'Try adjusting your search or filters to find what you\'re looking for'
                                : 'Add your first policy to start managing your insurance coverage in one place'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={onAddPolicy}
                                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all inline-flex items-center gap-3"
                            >
                                <FileText className="w-6 h-6" />
                                Add Your First Policy
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
