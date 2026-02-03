"use client"

import React from 'react'
import { Shield } from 'lucide-react'

interface LogoProps {
    variant?: 'default' | 'light' | 'dark' | 'icon-only'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    language?: 'el' | 'en'
    className?: string
}

export function PolicyWalletLogo({
    variant = 'default',
    size = 'md',
    language = 'en',
    className = ''
}: LogoProps) {

    const sizeClasses = {
        sm: { container: 'h-8', icon: 'w-6 h-6', iconBox: 'w-7 h-7', text: 'text-base', tagline: 'text-[9px]' },
        md: { container: 'h-10', icon: 'w-6 h-6', iconBox: 'w-9 h-9', text: 'text-xl', tagline: 'text-[10px]' },
        lg: { container: 'h-14', icon: 'w-8 h-8', iconBox: 'w-12 h-12', text: 'text-2xl', tagline: 'text-xs' },
        xl: { container: 'h-20', icon: 'w-12 h-12', iconBox: 'w-16 h-16', text: 'text-4xl', tagline: 'text-sm' }
    }

    const sizes = sizeClasses[size]

    const brandName = {
        en: 'PolicyWallet',
        el: 'PolicyWallet' // Keep English brand name but with Greek tagline option
    }

    const tagline = {
        en: 'Insurance Intelligence',
        el: 'Ασφαλιστική Νοημοσύνη'
    }

    // Icon only variant
    if (variant === 'icon-only') {
        return (
            <div className={`${sizes.iconBox} bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ${className}`}>
                <Shield className={`${sizes.icon} text-white`} strokeWidth={2.5} />
            </div>
        )
    }

    // Color variants
    const textColor = variant === 'light'
        ? 'text-white'
        : variant === 'dark'
            ? 'text-slate-900'
            : 'text-slate-900 dark:text-white'

    const taglineColor = variant === 'light'
        ? 'text-blue-100'
        : variant === 'dark'
            ? 'text-slate-600'
            : 'text-slate-600 dark:text-slate-400'

    return (
        <div className={`flex items-center gap-3 ${sizes.container} ${className}`}>
            {/* Icon */}
            <div className={`${sizes.iconBox} bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 relative overflow-hidden group`}>
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/0 via-white/20 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Shield className={`${sizes.icon} text-white relative z-10`} strokeWidth={2.5} />
            </div>

            {/* Text */}
            <div className="flex flex-col justify-center leading-none">
                <span className={`font-black tracking-tight ${sizes.text} ${textColor}`}>
                    {brandName[language]}
                </span>
                <span className={`font-semibold ${sizes.tagline} ${taglineColor} tracking-wide uppercase mt-0.5`}>
                    {tagline[language]}
                </span>
            </div>
        </div>
    )
}

// Standalone icon for favicons, app icons, etc.
export function PolicyWalletIcon({ size = 512 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Gradient background */}
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.9" />
                </linearGradient>
            </defs>

            {/* Rounded square background */}
            <rect width="512" height="512" rx="96" fill="url(#bgGradient)" />

            {/* Shield icon */}
            <path
                d="M256 96L144 144C144 144 144 240 144 288C144 368 256 416 256 416C256 416 368 368 368 288C368 240 368 144 368 144L256 96Z"
                fill="url(#shieldGradient)"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Checkmark inside shield */}
            <path
                d="M208 256L240 288L304 224"
                stroke="#2563eb"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
