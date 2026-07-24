"use client"

import { MotionConfig } from "framer-motion"
import type { ReactNode } from "react"

/**
 * Makes every framer-motion animation in the app honour the OS
 * "reduce motion" setting.
 *
 * 25 components animate via framer-motion. The global CSS rule in globals.css
 * covers CSS animations and transitions, but framer-motion drives its
 * initial/animate props in JavaScript, so CSS duration overrides do not reach
 * them — without this, a user with a vestibular disorder who has set
 * `prefers-reduced-motion: reduce` still received every entrance animation.
 *
 * `reducedMotion="user"` defers to the OS preference rather than forcing motion
 * on or off, which is the behaviour WCAG 2.3.3 asks for.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
