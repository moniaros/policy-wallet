"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"
import { presentationCopy } from "@/lib/i18n/presentation"
import type { MarketingLocale } from "@/lib/marketing/positioning"

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string }

export function HeroVideo({ locale }: { locale: MarketingLocale }) {
    const copy = presentationCopy[locale]
    const videoRef = useRef<HTMLVideoElement>(null)
    const userPaused = useRef(false)
    const [enabled, setEnabled] = useState(false)
    const [failed, setFailed] = useState(false)
    const [playing, setPlaying] = useState(false)

    // Keep the server-rendered poster and avoid downloading motion for these preferences.
    useEffect(() => {
        if (typeof window.matchMedia !== "function" || typeof IntersectionObserver === "undefined") return
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
        const connection = (navigator as Navigator & { connection?: Connection }).connection
        const update = () => setEnabled(!motion.matches && !connection?.saveData
            && !["slow-2g", "2g"].includes(connection?.effectiveType ?? ""))
        update()
        motion.addEventListener("change", update)
        connection?.addEventListener("change", update)
        return () => {
            motion.removeEventListener("change", update)
            connection?.removeEventListener("change", update)
        }
    }, [])

    // Autoplay is best-effort. Hidden/offscreen media stops, but an explicit pause persists.
    useEffect(() => {
        const video = videoRef.current
        if (!enabled || failed || !video) return
        let visible = false
        const sync = () => {
            if (visible && document.visibilityState === "visible" && !userPaused.current) {
                video.play().catch(() => setPlaying(false))
            } else {
                video.pause()
            }
        }
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            sync()
        }, { threshold: 0.1 })
        observer.observe(video)
        document.addEventListener("visibilitychange", sync)
        return () => {
            observer.disconnect()
            document.removeEventListener("visibilitychange", sync)
            video.pause()
        }
    }, [enabled, failed])

    const togglePlayback = () => {
        const video = videoRef.current
        if (!video) return
        if (video.paused) {
            userPaused.current = false
            video.play().catch(() => setPlaying(false))
        } else {
            userPaused.current = true
            video.pause()
        }
    }

    return (
        <div className="pw-hero-film">
            <Image
                src="/images/presentation/hero-lifestyle-poster.jpg"
                alt={copy.videoPosterAlt}
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
            />
            {enabled && !failed && (
                <>
                    <video
                        ref={videoRef}
                        className="pw-hero-film-video"
                        src="/videos/hero-lifestyle.mp4"
                        poster="/images/presentation/hero-lifestyle-poster.jpg"
                        width={1280}
                        height={720}
                        muted
                        loop
                        playsInline
                        preload="none"
                        aria-hidden="true"
                        tabIndex={-1}
                        onPlaying={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onError={() => setFailed(true)}
                    />
                    <button
                        type="button"
                        className="pw-hero-film-control"
                        onClick={togglePlayback}
                        aria-label={playing ? copy.pauseVideo : copy.playVideo}
                    >
                        {playing ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5" />}
                    </button>
                </>
            )}
        </div>
    )
}
