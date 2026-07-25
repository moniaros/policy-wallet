"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, MessageSquare } from "lucide-react"

interface NPSSurveyProps {
    language: "el" | "en"
    onSubmit: (score: number, comment: string) => void
    onDismiss: () => void
}

export function NPSSurvey({ language, onSubmit, onDismiss }: NPSSurveyProps) {
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [score, setScore] = useState<number | null>(null)
    const [comment, setComment] = useState("")
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = () => {
        if (score === null) return
        onSubmit(score, comment)
        setSubmitted(true)
        setTimeout(onDismiss, 2000)
    }

    const getScoreLabel = (s: number) => {
        if (s <= 6) return t("Δυσαρεστημένος", "Unhappy")
        if (s <= 8) return t("Ουδέτερος", "Neutral")
        return t("Ενθουσιασμένος", "Delighted")
    }

    const getScoreColor = (s: number) => {
        if (s <= 6) return "bg-rose-500 text-white"
        if (s <= 8) return "bg-amber-500 text-white"
        return "bg-primary text-white dark:text-[#1A2420]"
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111]"
            >
                <button
                    type="button"
                    onClick={onDismiss}
                    className="absolute right-4 top-4 rounded-lg p-1 text-black/55 transition hover:bg-black/5 hover:text-black/70 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/70"
                    aria-label={t("Κλείσιμο", "Close")}
                >
                    <X className="h-4 w-4" />
                </button>

                {submitted ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3 py-4 text-center"
                    >
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft dark:bg-primary/15">
                            <MessageSquare className="h-6 w-6 text-primary dark:text-mint" />
                        </div>
                        <p className="text-sm font-semibold text-black dark:text-white">
                            {t("Ευχαριστούμε πολύ!", "Thank you!")}
                        </p>
                        <p className="text-xs text-black/55 dark:text-white/60">
                            {t("Η γνώμη σας μας βοηθά να βελτιωνόμαστε.", "Your feedback helps us improve.")}
                        </p>
                    </motion.div>
                ) : (
                    <>
                        <div className="mb-4">
                            <p className="text-sm font-bold text-black dark:text-white">
                                {t("Πόσο πιθανό είναι να μας προτείνετε;", "How likely are you to recommend us?")}
                            </p>
                            <p className="mt-1 text-micro text-black/60 dark:text-white/55">
                                {t("0 = Καθόλου πιθανό · 10 = Σίγουρα", "0 = Not likely · 10 = Very likely")}
                            </p>
                        </div>

                        {/* Score buttons */}
                        <div className="mb-4 grid grid-cols-11 gap-1">
                            {Array.from({ length: 11 }, (_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setScore(i)}
                                    className={`grid h-8 place-items-center rounded-lg text-xs font-bold transition ${
                                        score === i
                                            ? getScoreColor(i)
                                            : "bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                                    }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>

                        {score !== null && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                            >
                                <p className="mb-1 text-micro font-semibold text-black/60 dark:text-white/60">
                                    {getScoreLabel(score)} — {t("Πείτε μας τον λόγο:", "Tell us why:")}
                                </p>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={t("Γράψτε εδώ (προαιρετικό)...", "Write here (optional)...")}
                                    className="pw-input pw-input-sm resize-none border-black/10 bg-black/[0.02] text-black dark:focus:border-mint"
                                    rows={2}
                                />
                            </motion.div>
                        )}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={score === null}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black/80 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-white/90"
                        >
                            <Send className="h-3.5 w-3.5" />
                            {t("Αποστολή", "Submit")}
                        </button>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    )
}
