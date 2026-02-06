"use client"

import { motion } from "framer-motion"
import { Shield, Sparkles, Share2 } from "lucide-react"

interface WelcomeScreenProps {
    userName?: string
    onNext: () => void
}

export function WelcomeScreen({ userName, onNext }: WelcomeScreenProps) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-2xl w-full"
            >
                {/* Glass Card */}
                <div className="relative">
                    {/* Decorative Blobs */}
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                    <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl p-8 md:p-12">
                        {/* Logo */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="flex justify-center mb-8"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl blur-lg opacity-50" />
                                <div className="relative bg-gradient-to-br from-indigo-600 to-violet-600 p-4 rounded-2xl">
                                    <Shield className="w-12 h-12 text-white" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Heading */}
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-3"
                        >
                            Welcome to PolicyWallet{userName ? `, ${userName}` : ''}!
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="text-xl text-center text-slate-600 mb-12"
                        >
                            All Your Insurance, One Secure Place
                        </motion.p>

                        {/* Features */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="space-y-4 mb-12"
                        >
                            <Feature
                                icon={<Sparkles className="w-6 h-6" />}
                                title="AI-powered gap detection"
                                description="Discover missing coverage automatically"
                            />
                            <Feature
                                icon={<Shield className="w-6 h-6" />}
                                title="Digital wallet integration"
                                description="Save policies to Apple & Google Wallet"
                            />
                            <Feature
                                icon={<Share2 className="w-6 h-6" />}
                                title="Share with your agent"
                                description="Collaborate with insurance professionals"
                            />
                        </motion.div>

                        {/* CTA Button */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                        >
                            <button
                                onClick={onNext}
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-lg py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group"
                            >
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                                <span className="relative flex items-center justify-center gap-2">
                                    Get Started
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </button>

                            <p className="text-center text-sm text-slate-500 mt-4">
                                Takes less than 2 minutes
                            </p>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

interface FeatureProps {
    icon: React.ReactNode
    title: string
    description: string
}

function Feature({ icon, title, description }: FeatureProps) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-100/50 hover:border-slate-200 transition-all duration-200">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
            </div>
        </div>
    )
}
