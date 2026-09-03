"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

/**
 * The one authored moment of the flow: a short push-in when the screen
 * changes, in the direction of travel. Under reduced motion it is a
 * crossfade; MotionProvider (reducedMotion="user") and the global CSS rule
 * cover everything else.
 */
export function ScreenFrame({ stepKey, direction, onSettled, children }: { stepKey: string; direction: 1 | -1; onSettled?: () => void; children: ReactNode }) {
    const reduced = useReducedMotion()
    const dx = reduced ? 0 : 24 * direction
    return (
        <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
                key={stepKey}
                initial={{ x: dx, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: reduced ? 0 : -16 * direction, opacity: 0 }}
                transition={{ duration: reduced ? 0.12 : 0.2, ease: "easeOut" }}
                onAnimationComplete={(def) => {
                    if (def === "animate" || (typeof def === "object" && "opacity" in def && def.opacity === 1)) onSettled?.()
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
