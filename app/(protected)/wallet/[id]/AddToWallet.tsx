"use client"

import { useState } from "react"
import { WalletPassPreview } from "@/components/wallet"
import { Policy } from "@/components/wallet/types"
import { toast } from "sonner"
import { Loader2, Download, X } from "lucide-react"

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
    trigger
}: AddToWalletProps) {
    const [internalOpen, setInternalOpen] = useState(initialOpen)
    const [loadingApple, setLoadingApple] = useState(false)
    const [loadingGoogle, setLoadingGoogle] = useState(false)

    // Derived state
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

    const handleOpenChange = (newOpen: boolean) => {
        if (onOpenChange) onOpenChange(newOpen)
        else setInternalOpen(newOpen)
    }

    const fetchPass = async (type: 'apple' | 'google') => {
        if (type === 'apple') setLoadingApple(true)
        else setLoadingGoogle(true)

        try {
            // Pass the 'type' query parameter to select the service
            const res = await fetch(`/api/v1/policies/${policy.id}/wallet-pass?type=${type}`)

            // Check content type to distinguish between JSON (Link/Error) and Blob (File)
            const contentType = res.headers.get("content-type")

            if (contentType && contentType.includes("application/json")) {
                const json = await res.json()

                if (!res.ok) {
                    throw new Error(json.error?.message || `Failed to generate ${type} pass`)
                }

                // CASE A: JSON Response (Likely Google Wallet Link)
                if (json.data?.pass_url) {
                    toast.success("Redirecting to Google Wallet...")
                    // In production, we redirect the user to the "Save to Google Wallet" deep link
                    window.location.href = json.data.pass_url
                    return
                }

                // If success but no URL? (Shouldn't happen for Google)
                toast.success("Pass generated successfully.")
            } else {
                // CASE B: Blob Response (Apple Wallet .pkpass file)
                // This handles the binary stream if the backend returns the file directly
                if (!res.ok) throw new Error("Failed to download pass file")

                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `wallet-pass-${policy.policyNumber}.pkpass`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)

                toast.success("Apple Wallet pass downloaded!")
            }

        } catch (err: any) {
            toast.error(err.message)
            console.error(err)
        } finally {
            if (type === 'apple') setLoadingApple(false)
            else setLoadingGoogle(false)
        }
    }

    return (
        <>
            {trigger ? (
                <div onClick={() => handleOpenChange(true)}>
                    {trigger}
                </div>
            ) : (
                <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden group cursor-pointer" onClick={() => handleOpenChange(true)}>
                    <div className="absolute top-0 right-0 p-4 opacity-50 text-[10px] font-black uppercase tracking-widest">
                        Digital Card
                    </div>

                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl">
                            💳
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-none">Add to Wallet</h3>
                            <p className="text-stone-400 text-xs mt-1">Get your digital insurance card</p>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                        {/* Apple Wallet Badge Stub */}
                        <div className="h-8 px-3 rounded-lg bg-black border border-white/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold">Apple Wallet</span>
                        </div>
                        {/* Google Wallet Badge Stub */}
                        <div className="h-8 px-3 rounded-lg bg-black border border-white/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold">Google Pay</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => handleOpenChange(false)} />

                    <div className="relative w-full max-w-md bg-stone-50 dark:bg-stone-900 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => handleOpenChange(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-xl font-black text-stone-900 dark:text-white uppercase tracking-tight">Your Digital Pass</h2>
                            <p className="text-sm text-stone-500 mt-2">Add this policy to your mobile wallet for quick access.</p>
                        </div>

                        <div className="mb-8 transform hover:scale-[1.02] transition-transform duration-500">
                            <WalletPassPreview policy={policy} holderName={holderName} plateNumber={plateNumber} />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => fetchPass('apple')}
                                disabled={loadingApple || loadingGoogle}
                                className="w-full h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors font-medium border border-stone-800 relative overflow-hidden disabled:opacity-50"
                            >
                                {loadingApple ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.32 1.84.18 3.05 1.12 3.65 1.99-3.23 2.05-2.6 6.3 1.25 7.82-.66 1.76-1.66 3.49-4.35 3.74zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                                        <span>Add to Apple Wallet</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => fetchPass('google')}
                                disabled={loadingApple || loadingGoogle}
                                className="w-full h-12 bg-white text-stone-900 border border-stone-200 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors font-medium relative overflow-hidden disabled:opacity-50"
                            >
                                {loadingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.441 12.378h-.002v.006h-.005v-.006h.007zm8.397-2.678h-8.39v3.42h5.174c-.506 2.37-2.458 3.93-4.835 3.93-2.924 0-5.29-2.366-5.29-5.29 0-2.923 2.366-5.289 5.29-5.289 1.266 0 2.433.435 3.35 1.16l2.502-2.434c-1.66-1.47-3.692-2.226-5.852-2.226-5.462 0-9.89 4.428-9.89 9.89 0 5.461 4.428 9.89 9.89 9.89 5.158 0 9.176-3.882 9.176-9.175 0-.74-.065-1.378-.15-1.921z" /></svg>
                                        <span>Add to Google Wallet</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
