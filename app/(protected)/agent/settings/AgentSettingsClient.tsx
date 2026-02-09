"use client"

import { useState } from "react"
import { Shield, Building, CreditCard, Save, CheckCircle, AlertCircle } from "lucide-react"
import { updateAgentProfile } from "../actions"
import { toast } from "sonner"

interface Props {
    initialAgencyName?: string | null
    initialLicenseNumber?: string | null
    verificationStatus?: string
}

export function AgentSettingsClient({ initialAgencyName, initialLicenseNumber, verificationStatus }: Props) {
    const [agencyName, setAgencyName] = useState(initialAgencyName || "")
    const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber || "")
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)
        const result = await updateAgentProfile({ agencyName, licenseNumber })
        setIsSaving(false)

        if (result.success) {
            toast.success("Profile updated successfully")
        } else {
            toast.error(result.error || "Failed to update profile")
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-stone-900 dark:text-white mb-2 uppercase tracking-tight">Agent Settings</h1>
                <p className="text-stone-500 font-medium">Manage your agency profile and professional credentials.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar Navigation */}
                <div className="space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-stone-900 text-white rounded-2xl text-sm font-bold transition-all">
                        <Building className="w-4 h-4" /> Agency Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl text-sm font-bold transition-all">
                        <Shield className="w-4 h-4" /> Verification
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl text-sm font-bold transition-all">
                        <CreditCard className="w-4 h-4" /> Payouts
                    </button>
                </div>

                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Verification Status Banner */}
                    <div className={`p-4 rounded-3xl border flex items-center gap-4 ${verificationStatus === 'verified'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                            : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                        }`}>
                        {verificationStatus === 'verified' ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        )}
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest">
                                Status: {verificationStatus || 'Pending'}
                            </p>
                            <p className="text-xs opacity-80 font-medium mt-0.5">
                                {verificationStatus === 'verified'
                                    ? 'Your professional credentials have been verified.'
                                    : 'Your profile is currently under review by our compliance team.'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Agency Name</label>
                                <input
                                    type="text"
                                    value={agencyName}
                                    onChange={(e) => setAgencyName(e.target.value)}
                                    placeholder="e.g. Acme Insurance Services"
                                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 dark:text-white placeholder:text-stone-400 focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">License Number</label>
                                <input
                                    type="text"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    placeholder="e.g. LIC-12345678"
                                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 dark:text-white placeholder:text-stone-400 focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full md:w-auto px-8 py-4 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl p-8 border border-rose-100 dark:border-rose-900/30">
                        <h3 className="text-xs font-black text-rose-900 dark:text-rose-400 uppercase tracking-widest mb-2">Danger Zone</h3>
                        <p className="text-xs text-rose-700/70 dark:text-rose-400/70 mb-6 font-medium">Permanently delete your agent account and all customer data. This action cannot be undone.</p>
                        <button className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                            Deactivate Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
