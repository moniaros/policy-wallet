"use client"

import React, { useState } from 'react'
import { Mail } from 'lucide-react'
import { updateCustomerContact } from '@/app/(protected)/agent/actions'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'
import { CardHead } from '@/components/dashboard/home/CardHead'
import { describeActionError } from '@/lib/i18n/action-error'

interface Props {
    isOpen: boolean
    /** The customer who has no email (User.contactEmailMissing). */
    customerId: string | null
    customerName?: string
    onClose: () => void
    /** The address was saved — the parent sends the invitation with it. */
    onSaved: (customerId: string, email: string) => void
}

/**
 * The one action a no-email customer needs before anything can reach them:
 * a real address. Replaces the synthetic placeholder and clears
 * `contactEmailMissing` through `updateCustomerContact`, which is guarded by
 * the agent's living relationship and refuses an activated account (its
 * email is the customer's to change).
 */
export function AddCustomerEmailModal({ isOpen, customerId, customerName, onClose, onSaved }: Props) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)
    const cc = t.agentPages.customers
    const ac = t.agentModals.addCustomer
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldError, setFieldError] = useState<string | null>(null)

    if (!isOpen || !customerId) return null

    const reset = () => { setEmail(''); setError(null); setFieldError(null); setLoading(false) }
    const close = () => { reset(); onClose() }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError(null); setFieldError(null)
        // Transport failures reject rather than return — see AddCustomerModal.
        let result: Awaited<ReturnType<typeof updateCustomerContact>>
        try {
            result = await updateCustomerContact({ customerId, email })
        } catch {
            setError(t.apiErrors.generic)
            setLoading(false)
            return
        }
        setLoading(false)
        if (!result.success) {
            const described = describeActionError(t, result.error, 'details' in result ? result.details : undefined)
            setError(described.message)
            setFieldError(described.fieldErrors.email ?? null)
            return
        }
        const saved = email.trim()
        reset()
        onSaved(customerId, saved)
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-customer-email-title" tabIndex={-1} className="pw-card pw-pad relative w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <header>
                        <CardHead icon={Mail} id="add-customer-email-title" title={cc.addEmailTitle} meta={customerName} />
                        <p className="mt-2 text-sm text-muted-foreground">{cc.addEmailDesc}</p>
                    </header>

                    <div className="space-y-1.5">
                        <label htmlFor="add-customer-email-input" className="block text-caption font-semibold text-foreground">{ac.emailAddress}</label>
                        <input
                            id="add-customer-email-input"
                            type="email"
                            required
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pw-input"
                            placeholder={ac.phEmail}
                            aria-invalid={fieldError ? true : undefined}
                            aria-describedby={fieldError ? 'add-customer-email-error' : undefined}
                        />
                        {fieldError && <p id="add-customer-email-error" className="text-caption font-semibold text-status-danger">{fieldError}</p>}
                    </div>

                    {error && <p role="alert" className="text-caption font-semibold text-status-danger">{error}</p>}

                    <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row">
                        <button type="button" onClick={close} className="pw-soft-button flex-1">{ac.cancel}</button>
                        <button type="submit" disabled={loading} className="pw-primary-button flex-1">
                            {loading ? ac.processing : cc.addEmailSave}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
