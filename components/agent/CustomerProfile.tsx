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

export function CustomerProfile({
    customer,
    onUpdateOpportunityStatus,
    onUploadPolicy,
    onSendQuestionnaire,
    onSendReminder,
    onInviteCustomer,
    onBack
}: CustomerProfileProps) {
    const [updatingOpportunityId, setUpdatingOpportunityId] = useState<string | null>(null)

    const handleStatusChange = (opportunityId: string, status: OpportunityStatus) => {
        setUpdatingOpportunityId(opportunityId)
        onUpdateOpportunityStatus?.(opportunityId, status)
        // Reset after simulated latency
        setTimeout(() => setUpdatingOpportunityId(null), 1000)
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('el-GR', {
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
            case 'high': return 'bg-red-100 text-red-600 dark:bg-red-900/30'
            case 'medium': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
            case 'low': return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30'
            default: return 'bg-stone-100 text-stone-600 dark:bg-stone-800'
        }
    }

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            {/* Back Nav */}
            <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors mb-8 group"
            >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Portfolio</span>
            </button>

            {/* Header / Profile Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16 px-4">
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-20 h-20 rounded-[32px] bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center text-2xl font-black">
                            {customer.name[0]}{customer.surname[0]}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter mb-2">
                                {customer.name} {customer.surname}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="text-sm text-stone-400 font-medium">{customer.email}</span>
                                <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                                <span className="text-sm text-stone-400 font-medium">{customer.phone}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {customer.activationStatus === 'inactive' ? (
                            <button
                                onClick={() => onInviteCustomer?.(customer.id, customer.email)}
                                className="px-8 py-3 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/20"
                            >
                                Invite to Wallet
                            </button>
                        ) : (
                            <button
                                onClick={() => onSendReminder?.(customer.id)}
                                className="px-6 py-3 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-teal-500/30 transition-all shadow-sm"
                            >
                                Send Reminder
                            </button>
                        )}
                        <button
                            onClick={() => onUploadPolicy?.(customer.id)}
                            className="px-6 py-3 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-teal-500/30 transition-all shadow-sm"
                        >
                            Upload Policy
                        </button>
                        <button
                            onClick={() => onSendQuestionnaire?.(customer.id)}
                            className="px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 dark:hover:bg-teal-500 transition-all shadow-lg shadow-stone-900/10"
                        >
                            Send Questionnaire
                        </button>
                    </div>
                </div>

                <div className="bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8">
                    <div className="mb-6 pb-6 border-b border-stone-100 dark:border-stone-800">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Activation Context</span>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-stone-900 dark:text-white capitalize">{customer.activationStatus}</span>
                            <span className={`w-2 h-2 rounded-full ${customer.activationStatus === 'activated' ? 'bg-teal-500 animate-pulse' : 'bg-amber-500'}`} />
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Data Sovereignty</span>
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="text-xs font-black text-stone-900 dark:text-white uppercase tracking-tight">{customer.accessScope.replace('_', ' ')} Access</span>
                        </div>
                        <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                            The collaborative scope is restricted to {customer.accessScope === 'portfolio' ? 'full portfolio visibility' : 'document uploads and basic signals'}.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-12">
                    {/* Opportunities Section */}
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Open Opportunities</h2>
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 dark:bg-stone-800 px-3 py-1 rounded-lg">
                                {(customer.opportunities || []).length} Active
                            </span>
                        </div>

                        <div className="space-y-4">
                            {customer.opportunities?.map((opp: Opportunity) => (
                                <div key={opp.opportunityId} className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8 shadow-sm">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getSeverityStyles(opp.severity)}`}>
                                                {opp.severity} Risk
                                            </div>
                                            <h3 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">{opp.gapTitle}</h3>
                                        </div>
                                        <div className="relative group/select">
                                            <select
                                                value={opp.status}
                                                disabled={updatingOpportunityId === opp.opportunityId}
                                                onChange={(e) => handleStatusChange(opp.opportunityId, e.target.value as OpportunityStatus)}
                                                className={`appearance-none pl-4 pr-10 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-stone-100 dark:border-stone-800 focus:outline-none focus:ring-4 focus:ring-teal-500/10 cursor-pointer disabled:opacity-50 transition-all ${opp.status === 'won' ? 'bg-teal-50 text-teal-700 border-teal-200' : opp.status === 'lost' ? 'bg-stone-50 text-stone-500' : 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white'}`}
                                            >
                                                <option value="open">Open</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="won">Won</option>
                                                <option value="lost">Lost</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-stone-50 dark:border-stone-800/50">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 mb-1 block">Detection Logic</span>
                                            <p className="text-xs text-stone-500 font-medium">Auto-generated from coverage intelligence scan.</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 mb-1 block">Created On</span>
                                            <p className="text-xs text-stone-900 dark:text-white font-black">{formatDate(opp.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Linked Policies Section */}
                    <section>
                        <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight mb-8">Shared Policies</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {customer.policies?.map((policy: Policy) => (
                                <div key={policy.policyId} className="p-8 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] group">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                            {policy.lineOfBusiness}
                                        </div>
                                        <span className={`w-2 h-2 rounded-full ${policy.status === 'active' ? 'bg-teal-500 animate-pulse' : 'bg-amber-500'}`} />
                                    </div>
                                    <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight mb-1">{policy.insurerName}</h3>
                                    <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-6">{policy.policyNumber}</p>

                                    <div className="flex items-center justify-between pt-6 border-t border-stone-50 dark:border-stone-800/50">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 block">Renewal</span>
                                            <span className="text-xs font-black text-stone-900 dark:text-white">{formatDate(policy.endDate)}</span>
                                        </div>
                                        <button className="p-3 bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-2xl hover:bg-teal-500 group-hover:text-white transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Signal Log */}
                <div className="space-y-12">
                    <section>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-8">Interaction History</h3>
                        <div className="relative pl-8 space-y-10 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-100 dark:before:bg-stone-800">
                            {customer.interactions?.map((interaction: Interaction, idx: number) => (
                                <div key={interaction.id} className="relative">
                                    <div className={`absolute -left-[27px] top-1 w-[12px] h-[12px] rounded-full ring-4 ring-white dark:ring-stone-950 ${idx === 0 ? 'bg-teal-500 animate-pulse' : 'bg-stone-300 dark:bg-stone-700'}`} />
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1 block">
                                            {formatDate(interaction.timestamp)}
                                        </span>
                                        <p className="text-sm font-black text-stone-900 dark:text-white leading-tight mb-2">
                                            {interaction.message}
                                        </p>
                                        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-widest px-2 py-0.5 bg-stone-50 dark:bg-stone-800/50 rounded-md">
                                            {interaction.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
