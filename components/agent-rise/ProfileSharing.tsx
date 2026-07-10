"use client"

import React, { useState } from 'react'
import {
    User,
    Mail,
    ShieldCheck,
    Users,
    Activity,
    Clock,
    Smartphone,
    Link as LinkIcon,
    Globe,
    Lock,
    X,
    Copy,
    Trash2,
    Eye,
    Calendar
} from 'lucide-react'
import { PartyAttributes, ShareLink__EXT } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

// --- Component 3: User Profile Management ---
interface CustomerProfileProps {
    party: PartyAttributes
}

export function CustomerProfile({ party }: CustomerProfileProps) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {/* Identity Ribbon */}
            <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white dark:text-[#1A2420] font-bold text-lg shadow-sm">
                        {party.displayName.substring(0, 1)}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                            {party.displayName}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                                <Mail className="w-3 h-3" /> {party.primaryEmail}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${party.gdprConsentStatus === 'granted'
                                    ? 'bg-primary-soft text-[#166534] border-primary/20 dark:bg-primary/15 dark:text-mint dark:border-primary/30'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                <ShieldCheck className="w-3 h-3" /> GDPR: {party.gdprConsentStatus}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Entity Type</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {party.type === 'Person' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {party.type}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                {/* 1. Relationship Tree */}
                <div className="p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4" /> Relationships
                    </h4>
                    <div className="pl-2 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
                        {party.type === 'Organization' && party.affiliatedPersons?.map(person => (
                            <div key={person.id} className="relative pl-4">
                                <div className="absolute top-2 left-0 w-3 h-0.5 bg-slate-300" />
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{person.name}</p>
                                <p className="text-xs text-slate-500">{person.role}</p>
                            </div>
                        ))}
                        {party.type === 'Person' && party.householdMembers?.map(member => (
                            <div key={member.id} className="relative pl-4">
                                <div className="absolute top-2 left-0 w-3 h-0.5 bg-slate-300" />
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{member.name}</p>
                                <p className="text-xs text-slate-500">{member.relationship}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Communication Hygiene */}
                <div className="p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Smartphone className="w-4 h-4" /> Channels
                    </h4>
                    <div className="space-y-2">
                        {party.communications.map(comm => (
                            <div key={comm.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {comm.type === 'email' ? <Mail className="w-3 h-3 text-slate-400" /> : <Smartphone className="w-3 h-3 text-slate-400" />}
                                    <span className="truncate font-mono text-xs">{comm.value}</span>
                                    {comm.isPrimary && (
                                        <span className="text-[9px] bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint px-1 py-0.5 rounded-full font-bold uppercase">Primary</span>
                                    )}
                                </div>
                                <span className="text-[9px] text-primary dark:text-mint flex items-center gap-0.5" title={`Validated: ${comm.lastValidatedAt}`}>
                                    <ShieldCheck className="w-3 h-3" /> Valid
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Security & Logs */}
                <div className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Audit Log
                    </h4>
                    <div className="space-y-0 relative">
                        {/* Timeline line */}
                        <div className="absolute top-2 bottom-2 left-1.5 w-0.5 bg-slate-200 dark:bg-slate-700" />

                        {party.auditLog.slice(0, 5).map(log => (
                            <div key={log.id} className="relative pl-5 py-1">
                                <div className="absolute top-2 left-0 w-3 h-3 bg-white border-2 border-slate-300 rounded-full z-10" />
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{log.action}</p>
                                    <span className="text-[10px] text-slate-400 text-right">
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500">By: {log.actor}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Component 4: Policy Sharing Capabilities ---
interface ShareCenterProps {
    policyId: string
    activeLinks: ShareLink__EXT[]
    onCreateLink: (config: ShareLink__EXT) => void
    onRevokeLink: (uuid: string) => void
}

export function ShareCenter({ policyId, activeLinks, onRevokeLink }: ShareCenterProps) {
    const [showConfig, setShowConfig] = useState(false)
    // Config State
    const [scope, setScope] = useState({ schedule: true, endorsements: false, fullVault: false })
    const [expiresAt, setExpiresAt] = useState('')
    const [oneTime, setOneTime] = useState(false)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-primary dark:text-mint" /> Share Center
                </h3>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="px-4 py-2 bg-primary text-white dark:text-[#1A2420] text-sm font-bold rounded hover:bg-primary-hover transition-colors duration-200"
                >
                    + Generate Secure Link
                </button>
            </div>

            {/* Secure Config Modal (Inline for Zero-Latency) */}
            {showConfig && (
                <div className="bg-white dark:bg-slate-900 border border-primary/30 dark:border-primary/40 rounded-lg p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between mb-4 border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-sm uppercase text-slate-600">Configure Access Scope</h4>
                        <button onClick={() => setShowConfig(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Scope Toggles */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase block">Data Visibility</label>
                            <label className="flex items-center gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" checked={scope.schedule} onChange={e => setScope({ ...scope, schedule: e.target.checked })} />
                                <span className="text-sm font-medium">Policy Schedule</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" checked={scope.endorsements} onChange={e => setScope({ ...scope, endorsements: e.target.checked })} />
                                <span className="text-sm font-medium">Endorsements History</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 border border-red-100 bg-red-50 rounded cursor-pointer hover:bg-red-100">
                                <input type="checkbox" checked={scope.fullVault} onChange={e => setScope({ ...scope, fullVault: e.target.checked })} />
                                <span className="text-sm font-bold text-red-700">Full Document Vault</span> {/* Dangerous scope */}
                            </label>
                        </div>

                        {/* Security Constraints */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase block">Security Constraints</label>
                            <div>
                                <span className="text-xs text-slate-600 block mb-1">Expiration Date</span>
                                <input
                                    type="date"
                                    value={expiresAt}
                                    onChange={e => setExpiresAt(e.target.value)}
                                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <label className="flex items-center justify-between p-2 bg-slate-100 rounded">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Eye className="w-4 h-4" /> One-Time View Only
                                </span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={oneTime}
                                    onChange={e => setOneTime(e.target.checked)}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                        <button className="px-6 py-2 bg-primary text-white dark:text-[#1A2420] font-bold text-sm rounded hover:bg-primary-hover shadow-sm">
                            Create Link
                        </button>
                    </div>
                </div>
            )}

            {/* Agent Tracking Dashboard */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-xs text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-4 py-3">Link Scope</th>
                            <th className="px-4 py-3">Security</th>
                            <th className="px-4 py-3">Metrics</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeLinks.map(link => (
                            <tr key={link.uuid} className="group hover:bg-white dark:hover:bg-slate-900 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs text-primary dark:text-mint">{link.uuid.substring(0, 8)}...</span>
                                        <span className="text-xs text-slate-500">
                                            {[
                                                link.scope.schedule && 'Schedule',
                                                link.scope.endorsements && 'Endorsements',
                                                link.scope.fullVault && 'Full Vault'
                                            ].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {link.security.oneTimeView && <span className="p-1 bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint rounded-full text-[10px] font-bold uppercase">1-View</span>}
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {new Date(link.security.expiresAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <span className="block text-lg font-bold text-slate-900 dark:text-white leading-none">{link.metrics.accessCount}</span>
                                            <span className="text-[10px] text-slate-400 uppercase">Views</span>
                                        </div>
                                        {link.metrics.lastAccessedByIP && (
                                            <div className="text-xs text-slate-500">
                                                <span className="block"><Globe className="w-3 h-3 inline" /> {link.metrics.lastAccessedByIP}</span>
                                                <span className="text-[10px] opacity-70">Last Access</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100">
                                        <button className="p-2 hover:bg-slate-100 rounded text-slate-500" title="Copy Link"><Copy className="w-4 h-4" /></button>
                                        <button
                                            onClick={() => onRevokeLink(link.uuid)}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold border border-red-200 transition-colors"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {activeLinks.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm italic">
                        No active share links found for this policy.
                    </div>
                )}
            </div>
        </div>
    )
}
