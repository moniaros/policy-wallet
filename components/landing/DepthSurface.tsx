"use client"

import { useEffect, useRef, type ReactNode } from "react"
import "./product-stage.css"

/** Pointer enhancement only. Content and controls never depend on motion. */
export function DepthSurface({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const node = ref.current
        if (!node || typeof window.matchMedia !== "function" || typeof IntersectionObserver === "undefined") return
        const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)")
        let visible = false
        let frame = 0
        const reset = () => {
            cancelAnimationFrame(frame)
            node.style.setProperty("--rx", "0deg")
            node.style.setProperty("--ry", "0deg")
        }
        const move = (event: PointerEvent) => {
            if (!media.matches || !visible || document.hidden || event.pointerType !== "mouse") return
            const box = node.getBoundingClientRect()
            const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1))
            const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1))
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
                node.style.setProperty("--rx", `${-y * 5}deg`)
                node.style.setProperty("--ry", `${x * 5}deg`)
            })
        }
        const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) reset() })
        observer.observe(node)
        node.addEventListener("pointermove", move)
        node.addEventListener("pointerleave", reset)
        media.addEventListener("change", reset)
        document.addEventListener("visibilitychange", reset)
        return () => {
            reset(); observer.disconnect()
            node.removeEventListener("pointermove", move)
            node.removeEventListener("pointerleave", reset)
            media.removeEventListener("change", reset)
            document.removeEventListener("visibilitychange", reset)
        }
    }, [])
    return <div ref={ref} className="pw-depth-surface"><div className="pw-depth-object">{children}</div></div>
}
