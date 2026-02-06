"use client"

import { motion } from "framer-motion"
import { CheckCircle, Sparkles } from "lucide-react"

interface SuccessScreenProps {
    userName?: string
    onComplete: () => void
}

export function SuccessScreen({ userName, onComplete }: SuccessScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
            {/* Success Icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="mb-8"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full blur-2xl opacity-50" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                </div>
            </motion.div>

            {/* Success Message */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                    Καλώς ήρθατε{userName ? `, ${userName.split(' ')[0]}` : ''}!
                </h2>
                <p className="text-xl text-slate-600 mb-8 max-w-md mx-auto">
                    Το προφίλ σας είναι έτοιμο. Ας ξεκινήσουμε να προσθέτουμε τα ασφαλιστήριά σας!
                </p>
            </motion.div>

            {/* Features Preview */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl"
            >
                {[
                    { icon: "🤖", text: "AI Analysis" },
                    { icon: "💰", text: "Money Savings" },
                    { icon: "🔒", text: "100% Secure" }
                ].map((feature, index) => (
                    <div key={index} className="bg-slate-50 rounded-xl p-4">
                        <div className="text-3xl mb-2">{feature.icon}</div>
                        <p className="text-sm font-medium text-slate-700">{feature.text}</p>
                    </div>
                ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={onComplete}
                className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
                <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Προσθήκη Πρώτου Ασφαλιστηρίου
                    <Sparkles className="w-5 h-5" />
                </span>
            </motion.button>
        </div>
    )
}
