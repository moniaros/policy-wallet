"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface ProcessingHUDProps {
    isVisible: boolean
    message?: string
}

export function ProcessingHUD({ isVisible, message = "Processing action..." }: ProcessingHUDProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 10 }}
                        className="bg-card border border-border p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-xs w-full text-center"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                            <Loader2 className="w-10 h-10 text-primary dark:text-mint animate-spin relative z-10" />
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">
                                Please Wait
                            </h3>
                            <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <div className="flex gap-1">
                            <motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                                className="w-1 h-1 rounded-full bg-primary"
                            />
                            <motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                className="w-1 h-1 rounded-full bg-primary"
                            />
                            <motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                                className="w-1 h-1 rounded-full bg-primary"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
