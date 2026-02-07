"use client"

import React, { useState } from 'react'
import {
    Customer,
    Opportunity,
    OpportunityStatus,
    Policy,
    Interaction,
    CustomerProfileProps
} from './types'
import {
    Mail, Phone, Calendar, Clock, Shield, AlertTriangle,
    FileText, CheckCircle, XCircle, ArrowLeft, MoreHorizontal,
    TrendingUp, Activity, Download, ExternalLink
} from 'lucide-react'

export function CustomerProfile({
    customer,
    onUpdateOpportunityStatus,
    onUploadPolicy,
    onSendQuestionnaire,
    onSendReminder,
    onInviteCustomer,
    onViewPolicy,
    onBack
}: CustomerProfileProps) {
    const [updatingOpportunityId, setUpdatingOpportunityId] = useState<string | null>(null)

    const handleStatusChange = (opportunityId: string, status: OpportunityStatus) => {
        setUpdatingOpportunityId(opportunityId)
        onUpdateOpportunityStatus?.(opportunityId, status)
        setTimeout(() => setUpdatingOpportunityId(null), 1000)
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch (e) {
            return dateString
        }
    }

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800'
            case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
            case 'invited': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
            default: return 'bg-slate-400'
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Top Navigation */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {customer.name} {customer.surname}
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(customer.activationStatus)}`}></span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
                            <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
                            <Mail className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Hero Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Customer Info Card */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                            <div className="flex-shrink-0">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-3xl font-black text-slate-400 dark:text-slate-500 shadow-inner">
                                    {customer.name[0]}{customer.surname[0]}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {customer.name} {customer.surname}
                                        </h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${customer.activationStatus === 'activated'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                                            }`}>
                                            {customer.activationStatus}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="w-4 h-4" />
                                            {customer.email}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="w-4 h-4" />
                                            {customer.phone || 'No phone'}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            Member since {formatDate(new Date().toISOString()) /* Mock date */}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 pt-2">
                                    {customer.activationStatus === 'inactive' ? (
                                        <button
                                            onClick={() => onInviteCustomer?.(customer.id, customer.email)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/30"
                                        >
                                            Invite to Wallet
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onSendReminder?.(customer.id)}
                                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Send Reminder
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onUploadPolicy?.(customer.id)}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Upload Policy
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats / Context */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Portfolio Summary</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {(customer.policies || []).length}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">Active Policies</div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {(customer.opportunities || []).length}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">Opportunities</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold uppercase text-slate-500">Access Level</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {customer.accessScope === 'portfolio' ? 'Full Portfolio Access' : 'Limited Access'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column (Main Content) */}
                    <div className="xl:col-span-2 space-y-8">

                        {/* Opportunities Section */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-amber-500" />
                                    Opportunities
                                </h3>
                            </div>

                            {(customer.opportunities || []).length > 0 ? (
                                <div className="space-y-3">
                                    {customer.opportunities?.map((opp) => (
                                        <div key={opp.opportunityId} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1">
                                                        <AlertTriangle className={`w-5 h-5 ${opp.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white">{opp.gapTitle}</h4>
                                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getSeverityStyles(opp.severity)}`}>
                                                            {opp.severity} Priority
                                                        </span>
                                                    </div>
                                                </div>

                                                <select
                                                    value={opp.status}
                                                    disabled={updatingOpportunityId === opp.opportunityId}
                                                    onChange={(e) => handleStatusChange(opp.opportunityId, e.target.value as OpportunityStatus)}
                                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                                >
                                                    <option value="open">Open</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="won">Won (Sold)</option>
                                                    <option value="lost">Lost</option>
                                                </select>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400">
                                                Risk detected based on coverage intelligence. Consider recommending umbrella insurance.
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-700">
                                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-slate-500">No open opportunities. Good coverage!</p>
                                </div>
                            )}
                        </section>

                        {/* Policies Grid */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    Policies
                                </h3>
                                <button onClick={() => onUploadPolicy?.(customer.id)} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                    + Add Policy
                                </button>
                            </div>

                            {(customer.policies || []).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {customer.policies?.map((policy) => (
                                        <div key={policy.policyId} className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors relative cursor-pointer" onClick={() => onViewPolicy?.(customer.id, policy.policyId)}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold uppercase text-slate-500">
                                                    {policy.lineOfBusiness}
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${policy.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            </div>
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-1 truncate">{policy.insurerName}</h4>
                                            <p className="text-xs text-slate-500 font-mono mb-4">{policy.policyNumber}</p>

                                            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <span>Renews: {formatDate(policy.endDate)}</span>
                                                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 mb-4">No policies linked yet.</p>
                                    <button onClick={() => onUploadPolicy?.(customer.id)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium shadow-sm">
                                        Upload First Policy
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column (Timeline) */}
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-slate-500" />
                                Activity Log
                            </h3>

                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[15px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                    {customer.interactions?.map((interaction, idx) => (
                                        <div key={interaction.id} className="relative pl-8">
                                            <div className={`absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                                                }`} />
                                            <div>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                                                    {formatDate(interaction.timestamp)}
                                                </p>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {interaction.message}
                                                </p>
                                                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded capitalize">
                                                    {interaction.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium pb-1 border-b border-transparent hover:border-blue-600/20 transition-all">
                                    View Full History
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    )
}
