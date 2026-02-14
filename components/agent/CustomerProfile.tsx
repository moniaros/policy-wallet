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
    TrendingUp, Activity, Download, ExternalLink, Sparkles,
    ChevronRight, Upload, UserPlus, Send, Briefcase
} from 'lucide-react'

const PROFILE_ANIMATION_CSS = `
@keyframes profFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes profSlideIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
`

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
            case 'high': return { badge: 'bg-red-500/15 text-red-600 dark:text-red-400', dot: 'bg-red-500', icon: 'text-red-500' }
            case 'medium': return { badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', icon: 'text-amber-500' }
            case 'low': return { badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', icon: 'text-blue-500' }
            default: return { badge: 'bg-slate-500/15 text-slate-500', dot: 'bg-slate-400', icon: 'text-slate-400' }
        }
    }

    const getAvatarGradient = (name: string) => {
        const gradients = [
            'from-blue-500 to-indigo-600',
            'from-emerald-500 to-teal-600',
            'from-violet-500 to-purple-600',
            'from-amber-500 to-orange-600',
            'from-rose-500 to-pink-600',
            'from-cyan-500 to-blue-600',
        ]
        const idx = name.charCodeAt(0) % gradients.length
        return gradients[idx]
    }

    const policyTypeGradient = (lob: string) => {
        switch (lob?.toLowerCase()) {
            case 'motor': return 'from-blue-500 to-indigo-600'
            case 'health': return 'from-rose-500 to-pink-600'
            case 'home': return 'from-amber-500 to-orange-600'
            case 'life': return 'from-emerald-500 to-teal-600'
            case 'travel': return 'from-cyan-500 to-blue-600'
            default: return 'from-slate-400 to-slate-500'
        }
    }

    const policies = customer.policies || []
    const opportunities = customer.opportunities || []
    const interactions = customer.interactions || []

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: PROFILE_ANIMATION_CSS }} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20">
                {/* ═══════════ TOP NAV ═══════════ */}
                <div className="sticky top-0 z-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(customer.name)} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                                {customer.name[0]}{customer.surname[0]}
                            </div>
                            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                                {customer.name} {customer.surname}
                            </h1>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${customer.activationStatus === 'activated'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : customer.activationStatus === 'invited'
                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                        : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${customer.activationStatus === 'activated' ? 'bg-emerald-500' :
                                        customer.activationStatus === 'invited' ? 'bg-amber-500' : 'bg-slate-400'
                                    }`} />
                                {customer.activationStatus}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {customer.phone && (
                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all cursor-pointer">
                                    <Phone className="w-5 h-5" />
                                </button>
                            )}
                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all cursor-pointer">
                                <Mail className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* ═══════════ HERO ═══════════ */}
                    <div
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
                        style={{ animation: 'profFadeUp .5s ease-out both' }}
                    >
                        {/* Customer Info Card */}
                        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
                            {/* Decorative gradient */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/5 dark:to-violet-500/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                                <div className="flex-shrink-0">
                                    <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${getAvatarGradient(customer.name)} flex items-center justify-center text-3xl font-black text-white shadow-xl`}>
                                        {customer.name[0]}{customer.surname[0]}
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                                            {customer.name} {customer.surname}
                                        </h2>
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <Mail className="w-4 h-4" />
                                                {customer.email}
                                            </span>
                                            {customer.phone && (
                                                <span className="flex items-center gap-1.5">
                                                    <Phone className="w-4 h-4" />
                                                    {customer.phone}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                Member since {formatDate(customer.createdAt || new Date().toISOString())}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {customer.activationStatus === 'inactive' ? (
                                            <button
                                                onClick={() => onInviteCustomer?.(customer.id, customer.email)}
                                                className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all cursor-pointer"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                Invite to Wallet
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onSendReminder?.(customer.id)}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                                            >
                                                <Send className="w-4 h-4" />
                                                Send Reminder
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onUploadPolicy?.(customer.id)}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Upload Policy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div
                            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between"
                            style={{ animation: 'profFadeUp .5s ease-out 100ms both' }}
                        >
                            <div>
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    Portfolio Summary
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-xl">
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                                            {policies.length}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-semibold">Active Policies</div>
                                    </div>
                                    <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-xl">
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                                            {opportunities.length}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-semibold">Opportunities</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 pt-4 border-t border-slate-100/80 dark:border-slate-800/60">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Access Level</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {customer.accessScope === 'portfolio' ? 'Full Portfolio Access' : 'Limited Access'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* ──── Left Column ──── */}
                        <div className="xl:col-span-2 space-y-6">

                            {/* Opportunities */}
                            <section style={{ animation: 'profFadeUp .5s ease-out 200ms both' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-amber-500" />
                                        Opportunities
                                    </h3>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                        {opportunities.length} items
                                    </span>
                                </div>

                                {opportunities.length > 0 ? (
                                    <div className="space-y-3">
                                        {opportunities.map((opp, idx) => {
                                            const severity = getSeverityStyles(opp.severity)
                                            return (
                                                <div
                                                    key={opp.opportunityId}
                                                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                                    style={{ animation: `profSlideIn .4s ease-out ${250 + idx * 60}ms both` }}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-0.5 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl shadow-sm`}>
                                                                <AlertTriangle className={`w-5 h-5 ${severity.icon}`} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white">{opp.gapTitle}</h4>
                                                                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${severity.badge}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${severity.dot}`} />
                                                                    {opp.severity} Priority
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <select
                                                            value={opp.status}
                                                            disabled={updatingOpportunityId === opp.opportunityId}
                                                            onChange={(e) => handleStatusChange(opp.opportunityId, e.target.value as OpportunityStatus)}
                                                            className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/40 outline-none cursor-pointer transition-all"
                                                        >
                                                            <option value="open">Open</option>
                                                            <option value="contacted">Contacted</option>
                                                            <option value="won">Won (Sold)</option>
                                                            <option value="lost">Lost</option>
                                                        </select>
                                                    </div>
                                                    <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-400">
                                                        Risk detected based on coverage intelligence. Consider recommending umbrella insurance.
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-10 text-center border border-slate-200/60 dark:border-slate-800/60">
                                        <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                            <Sparkles className="w-7 h-7" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Good coverage!</h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">No open opportunities detected.</p>
                                    </div>
                                )}
                            </section>

                            {/* Policies Grid */}
                            <section style={{ animation: 'profFadeUp .5s ease-out 400ms both' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        Policies
                                    </h3>
                                    <button onClick={() => onUploadPolicy?.(customer.id)} className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer">
                                        + Add Policy
                                    </button>
                                </div>

                                {policies.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {policies.map((policy, idx) => (
                                            <div
                                                key={policy.policyId}
                                                onClick={() => onViewPolicy?.(customer.id, policy.policyId)}
                                                className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative cursor-pointer overflow-hidden"
                                                style={{ animation: `profSlideIn .4s ease-out ${450 + idx * 60}ms both` }}
                                            >
                                                {/* Accent bar */}
                                                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${policyTypeGradient(policy.lineOfBusiness)} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${policyTypeGradient(policy.lineOfBusiness)} text-white shadow-sm`}>
                                                        {policy.lineOfBusiness}
                                                    </span>
                                                    <span className={`w-2 h-2 rounded-full ${policy.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                </div>
                                                <h4 className="font-bold text-slate-900 dark:text-white mb-1 truncate text-[15px]">{policy.insurerName}</h4>
                                                <p className="text-xs text-slate-400 font-mono mb-4">{policy.policyNumber}</p>

                                                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100/80 dark:border-slate-800/60">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Renews: {formatDate(policy.endDate)}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-500" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-10 text-center border border-dashed border-slate-200/60 dark:border-slate-800/60">
                                        <p className="text-slate-500 mb-4">No policies linked yet.</p>
                                        <button onClick={() => onUploadPolicy?.(customer.id)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            Upload First Policy
                                        </button>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* ──── Right Column (Timeline) ──── */}
                        <div
                            className="space-y-6"
                            style={{ animation: 'profFadeUp .5s ease-out 500ms both' }}
                        >
                            <section>
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" />
                                    Activity Log
                                </h3>

                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm">
                                    <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                                        {interactions.map((interaction, idx) => (
                                            <div
                                                key={interaction.id}
                                                className="relative pl-7"
                                                style={{ animation: `profSlideIn .4s ease-out ${550 + idx * 70}ms both` }}
                                            >
                                                <div className={`absolute left-[7px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                                                    }`} />
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                                        {formatDate(interaction.timestamp)}
                                                    </p>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                                                        {interaction.message}
                                                    </p>
                                                    <span className="inline-flex items-center mt-1 text-[10px] px-1.5 py-0.5 bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 rounded-md capitalize font-medium">
                                                        {interaction.type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full mt-5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 text-center transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                        View Full History
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}
