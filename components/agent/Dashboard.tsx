"use client"

import React, { useState } from 'react'
import {
    DashboardSummary,
    Priority,
    DashboardProps
} from './types'

export function Dashboard({
    summary,
    priorities,
    onPriorityClick,
    onInviteCustomer
}: DashboardProps) {
    return (
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4 text-stone-400">
                        <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Signal & Action</span>
                    </div>
                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        Today's <span className="text-stone-400 dark:text-stone-500 italic">Command.</span>
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-lg max-w-xl">
                        Focus on activated customers and open gap opportunities that need your attention.
                    </p>
                </div>

                <button
                    onClick={onInviteCustomer}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-3xl text-sm font-black transition-all shadow-xl shadow-teal-600/20 active:scale-95 group"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Invite Customer
                </button>
            </header>

            {/* Activation Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
                <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Activated</span>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-stone-900 dark:text-white leading-none">{summary.activated}</span>
                        <div className="w-2 h-2 rounded-full bg-teal-500 mb-2 animate-pulse" />
                    </div>
                </div>
                <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Pending Invite</span>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-stone-900 dark:text-white leading-none">{summary.invited}</span>
                        <div className="w-2 h-2 rounded-full bg-amber-500 mb-2" />
                    </div>
                </div>
                <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Inactive</span>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-stone-900 dark:text-white leading-none">{summary.inactive}</span>
                        <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700 mb-2" />
                    </div>
                </div>
            </div>

            {/* Priorities */}
            <div>
                <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight mb-8">Priority Queue</h2>
                {priorities.length > 0 ? (
                    <div className="space-y-4">
                        {priorities.map((priority: Priority) => (
                            <button
                                key={priority.id}
                                onClick={() => onPriorityClick?.(priority.customerId)}
                                className="w-full flex items-center justify-between p-6 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[28px] text-left hover:border-teal-500/30 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${priority.type === 'open_opportunity'
                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                        : priority.type === 'pending_invite'
                                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                                            : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                                        }`}>
                                        {priority.type === 'open_opportunity' ? (
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        ) : priority.type === 'pending_invite' ? (
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        ) : (
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">{priority.customerName}</span>
                                            <span className="text-stone-300 dark:text-stone-700 font-light">•</span>
                                            <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">
                                                {priority.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed max-w-md">
                                            {priority.message}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 rounded-full bg-stone-50 dark:bg-stone-800 text-stone-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="bg-stone-50 dark:bg-stone-800/30 border border-dashed border-stone-200 dark:border-stone-800 rounded-[32px] py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-white dark:bg-stone-900 flex items-center justify-center mx-auto mb-6 text-stone-300 shadow-sm">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <h3 className="text-lg font-black text-stone-900 dark:text-white mb-2 tracking-tight">Zero Decision Fatigue.</h3>
                        <p className="text-stone-500 dark:text-stone-400 text-sm">All priorities are currently handled. Great work!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
