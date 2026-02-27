"use client"

import { useState } from "react"
import { WalletPassPreview } from "@/components/wallet"
import { Policy } from "@/components/wallet/types"
import { toast } from "sonner"
import { Loader2, WalletCards, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface AddToWalletProps {
    policy: Policy
    holderName: string
    initialOpen?: boolean
    plateNumber?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function AddToWallet({
    policy,
    holderName,
    initialOpen = false,
    plateNumber,
    open: controlledOpen,
    onOpenChange,
    trigger,
}: AddToWalletProps) {
    const { t, language } = useLanguage()
    const [internalOpen, setInternalOpen] = useState(initialOpen)
    const [loadingApple, setLoadingApple] = useState(false)
    const [loadingGoogle, setLoadingGoogle] = useState(false)

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

    const handleOpenChange = (newOpen: boolean) => {
        if (onOpenChange) onOpenChange(newOpen)
        else setInternalOpen(newOpen)
    }

    const fetchPass = async (type: 'apple' | 'google') => {
        if (type === 'apple') setLoadingApple(true)
        else setLoadingGoogle(true)

        try {
            const res = await fetch(`/api/v1/policies/${policy.id}/wallet-pass?type=${type}`)
            const contentType = res.headers.get("content-type")

            if (contentType && contentType.includes("application/json")) {
                const json = await res.json()
                if (!res.ok) throw new Error(json.error?.message || `Failed to generate ${type} pass`)

                if (json.data?.pass_url) {
                    toast.success(language === 'el' ? 'Μεταφορά στο Google Wallet...' : 'Redirecting to Google Wallet...')
                    window.location.href = json.data.pass_url
                    return
                }

                toast.success(language === 'el' ? 'Το πάσο δημιουργήθηκε.' : 'Pass generated successfully.')
            } else {
                if (!res.ok) throw new Error(language === 'el' ? 'Αποτυχία λήψης πάσου' : 'Failed to download pass file')

                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `wallet-pass-${policy.policyNumber}.pkpass`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)

                toast.success(language === 'el' ? 'Το πάσο Apple Wallet λήφθηκε.' : 'Apple Wallet pass downloaded.')
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            if (type === 'apple') setLoadingApple(false)
            else setLoadingGoogle(false)
        }
    }

    return (
        <>
            {trigger ? (
                <div onClick={() => handleOpenChange(true)}>{trigger}</div>
            ) : (
                <div
                    className="bg-gradient-to-br from-black via-[#111111] to-black rounded-3xl p-6 shadow-lg text-white relative overflow-hidden group cursor-pointer border border-white/10"
                    onClick={() => handleOpenChange(true)}
                >
                    <div className="absolute top-0 right-0 p-3 text-[10px] font-black uppercase tracking-widest text-[#7de8ba]/90">{t.wallet.digitalCard}</div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(31,220,134,0.24),_transparent_45%)] pointer-events-none" />

                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#1FDC86]/20 border border-[#1FDC86]/35 backdrop-blur flex items-center justify-center">
                            <WalletCards className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-none">{t.wallet.addToWallet}</h3>
                            <p className="text-white/75 text-xs mt-1">{t.wallet.digitalCardDesc}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                        <div className="h-8 px-3 rounded-lg bg-black/75 border border-white/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold">Apple Wallet</span>
                        </div>
                        <div className="h-8 px-3 rounded-lg bg-black/75 border border-white/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold">Google Wallet</span>
                        </div>
                    </div>
                </div>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => handleOpenChange(false)} />

                    <div className="relative w-full max-w-md bg-white dark:bg-black rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200 border border-black/10 dark:border-white/15">
                        <button
                            onClick={() => handleOpenChange(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/55 dark:text-white/65 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{t.wallet.yourDigitalPass}</h2>
                            <p className="text-sm text-black/60 dark:text-white/70 mt-2">{t.wallet.addWalletDesc}</p>
                        </div>

                        <div className="mb-8 transform hover:scale-[1.02] transition-transform duration-500">
                            <WalletPassPreview policy={policy} holderName={holderName} plateNumber={plateNumber} />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => fetchPass('apple')}
                                disabled={loadingApple || loadingGoogle}
                                className="arc-btn arc-btn-primary w-full h-12 font-medium"
                            >
                                {loadingApple ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t.wallet.addToApple}</span>}
                            </button>

                            <button
                                onClick={() => fetchPass('google')}
                                disabled={loadingApple || loadingGoogle}
                                className="arc-btn arc-btn-secondary w-full h-12 font-medium"
                            >
                                {loadingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t.wallet.addToGoogle}</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

