"use client"

import React, { useState } from 'react'
import {
    Customer,
    CustomerListProps
} from './types'

import { Skeleton } from '../ui/skeleton'

export function CustomerList({
    customers,
    isLoading,
    onSearch,
    onCustomerClick,
    onAddCustomer
}: CustomerListProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchQuery(query)
        onSearch?.(query)
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('el-GR', {
                day: 'numeric',
                month: 'short'
            })
        } catch (e) {
            return dateString
        }
    }

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4 text-stone-400">
                        <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Customer Portfolio</span>
                    </div>
                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        Collaborative <span className="text-stone-400 dark:text-stone-500 italic">Network.</span>
                    </h1>
                </div>

                <button
                    onClick={onAddCustomer}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-3xl text-sm font-black transition-all hover:bg-teal-600 dark:hover:bg-teal-500 hover:text-white shadow-xl shadow-stone-900/10 active:scale-95 group"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Add Customer
                </button>
            </header>

            {/* Smart Search */}
            <div className="relative mb-12 group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-stone-400 group-focus-within:text-teal-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <input
                    type="text"
                    placeholder="Search by name, email, phone, or car plate..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full h-16 pl-16 pr-8 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl shadow-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/30 outline-none transition-all text-stone-900 dark:text-white font-medium placeholder-stone-400 tracking-tight"
                />
            </div>

            {/* Customer List */}
            <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-stone-50 dark:border-stone-800/50">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Customer</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">Policies</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">Open Gaps</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-stone-400 text-right">Last Signal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50 dark:divide-stone-800/50">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={`skeleton-${i}`}>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <Skeleton className="w-10 h-10 rounded-full" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-24" />
                                                    <Skeleton className="h-3 w-32" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Skeleton className="h-6 w-20 rounded-full" />
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <Skeleton className="h-4 w-4 mx-auto" />
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <Skeleton className="h-6 w-16 mx-auto rounded-lg" />
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Skeleton className="h-4 w-16 ml-auto" />
                                            <Skeleton className="h-3 w-12 ml-auto mt-2" />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                customers.map((customer: Customer) => (
                                    <tr
                                        key={customer.id}
                                        onClick={() => onCustomerClick?.(customer.id)}
                                        className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 font-black text-xs uppercase group-hover:bg-teal-500 group-hover:text-white transition-all">
                                                    {customer.name[0]}{customer.surname[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-stone-900 dark:text-white tracking-tight">{customer.name} {customer.surname}</div>
                                                    <div className="text-[10px] font-medium text-stone-400 lowercase">{customer.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${customer.activationStatus === 'activated'
                                                ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                                                : customer.activationStatus === 'invited'
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                                                }`}>
                                                <span className={`w-1 h-1 rounded-full ${customer.activationStatus === 'activated' ? 'bg-teal-600 animate-pulse' : customer.activationStatus === 'invited' ? 'bg-amber-600' : 'bg-stone-400'}`} />
                                                {customer.activationStatus}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-sm font-black text-stone-900 dark:text-white">{customer.policyCount}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {customer.openGapsCount > 0 ? (
                                                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-[10px] font-black">
                                                    {customer.openGapsCount} GAPS
                                                </span>
                                            ) : (
                                                <span className="text-stone-300 dark:text-stone-700 text-xs font-medium">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="text-xs font-black text-stone-900 dark:text-white">{formatDate(customer.lastInteractionDate)}</div>
                                            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mt-0.5">Updated</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {customers.length === 0 && (
                    <div className="py-24 text-center">
                        <div className="p-4 bg-stone-50 dark:bg-stone-800/30 rounded-full w-fit mx-auto mb-6 text-stone-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <h3 className="text-lg font-black text-stone-900 dark:text-white mb-2">No customers found.</h3>
                        <p className="text-stone-500 dark:text-stone-400 text-sm max-w-sm mx-auto mb-8">
                            Your collaborative network is currently empty. Start by inviting your first customer to PolicyWallet.
                        </p>
                        <button
                            onClick={onAddCustomer}
                            className="px-8 py-4 bg-teal-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/20 active:scale-95"
                        >
                            Add Your First Customer
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
