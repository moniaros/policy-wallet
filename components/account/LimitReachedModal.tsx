"use client"

import { Modal } from "@/components/ui/Modal"
import { UpgradePrompt, UpgradePromptProps } from "./UpgradePrompt"

interface LimitReachedModalProps extends UpgradePromptProps {
    isOpen: boolean
}

export function LimitReachedModal({
    isOpen,
    onDismiss,
    reason,
    language,
    returnTo,
    className
}: LimitReachedModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onDismiss || (() => { })}
            showCloseButton={false} // UpgradePrompt has its own dismiss or we can let Modal handle it
        >
            <div className="p-2">
                <UpgradePrompt
                    reason={reason}
                    language={language}
                    onDismiss={onDismiss}
                    returnTo={returnTo}
                    className="border-0 shadow-none !bg-transparent"
                />
            </div>
        </Modal>
    )
}
