"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useDialog } from "@/hooks/useDialog"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
    showCloseButton?: boolean
    /** Accessible name for the dialog (aria-label) or id of its heading. */
    ariaLabel?: string
    ariaLabelledBy?: string
    /** Accessible label for the close button (localize per caller). */
    closeLabel?: string
}

export function Modal({
    isOpen,
    onClose,
    children,
    className = "",
    showCloseButton = true,
    ariaLabel,
    ariaLabelledBy,
    closeLabel = "Close"
}: ModalProps) {
    const [mounted, setMounted] = useState(false)
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />

                    {/* Content */}
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={ariaLabelledBy ? undefined : ariaLabel}
                        aria-labelledby={ariaLabelledBy}
                        tabIndex={-1}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white dark:bg-stone-900 rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto ${className}`}
                    >
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                aria-label={closeLabel}
                                className="absolute top-4 right-4 p-2 bg-stone-100/50 dark:bg-stone-800/50 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full text-stone-500 dark:text-stone-400 transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
