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
    language = 'el',
    className = ''
}: LogoProps) {
    const sizeClasses = {
        sm: { container: 'h-8', icon: 'w-6 h-6', iconBox: 'w-7 h-7', text: 'text-xl' },
        md: { container: 'h-10', icon: 'w-6 h-6', iconBox: 'w-9 h-9', text: 'text-2xl' },
        lg: { container: 'h-14', icon: 'w-8 h-8', iconBox: 'w-12 h-12', text: 'text-3xl' },
        xl: { container: 'h-20', icon: 'w-12 h-12', iconBox: 'w-16 h-16', text: 'text-5xl' }
    }

    const sizes = sizeClasses[size]

    // Keep prop for compatibility with existing call sites and future localization options
    void language

    if (variant === 'icon-only') {
        return (
            <div className={`${sizes.iconBox} bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 ${className}`}>
                <Shield className={`${sizes.icon} text-white`} strokeWidth={2.5} />
            </div>
        )
    }

    const policyTextColor = variant === 'light'
        ? 'text-white'
        : variant === 'dark'
            ? 'text-slate-900 dark:text-slate-200'
            : 'text-slate-900 dark:text-white'

    const walletTextColor = variant === 'light'
        ? 'text-slate-500'
        : 'text-slate-500'

    return (
        <div className={`flex items-center ${sizes.container} ${className}`}>
            <span className={`font-black tracking-tighter leading-none ${sizes.text} ${policyTextColor}`}>
                Policy
                <span className={`ml-0.5 ${walletTextColor}`}>Wallet</span>
            </span>
        </div>
    )
}

// Standalone icon for favicons, app icons, etc.
export function PolicyWalletIcon({ size = 512 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
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

            <rect width="512" height="512" rx="96" fill="url(#bgGradient)" />

            <path
                d="M256 96L144 144C144 144 144 240 144 288C144 368 256 416 256 416C256 416 368 368 368 288C368 240 368 144 368 144L256 96Z"
                fill="url(#shieldGradient)"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

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
