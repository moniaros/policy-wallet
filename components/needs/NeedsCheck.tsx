"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import {
    NEEDS_STEPS,
    isComplete,
    isStepComplete,
    type NeedsAnswers,
    type NeedsQuestion,
} from "@/lib/needs/questions"
import { needsOutcome } from "@/lib/needs/outcome"
import { readNeeds, saveNeeds } from "@/lib/needs/storage"

/**
 * The public needs check, as a stepped wizard.
 *
 * Six steps, each one area of a life. The step boundaries do real work beyond
 * pacing: a visitor who has been asked about boats and businesses can tell that
 * a result which says nothing about them means "does not apply", not "was never
 * asked". Sixteen questions on one screen cannot make that distinction.
 *
 * Nothing is submitted at the end, because there is nothing to submit. The
 * result is derived in the browser from the visitor's own answers — which is
 * also why it can be honest: no server saw this, so no claim is being made
 * about anyone's cover.
 */
/** Default wording for the renderer-drawn "none" pill; `noneLabel` overrides it. */
const NONE_OF_THESE = { el: "Κανένα από αυτά", en: "None of these" } as const

export function NeedsCheck({ locale }: { locale: "el" | "en" }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const [answers, setAnswers] = useState<NeedsAnswers>({})
    const [stepIndex, setStepIndex] = useState(0)
    const [restored, setRestored] = useState(false)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const movedOnce = useRef(false)

    useEffect(() => {
        const stored = readNeeds()
        if (stored) {
            setAnswers(stored)
            setRestored(true)
            if (isComplete(stored)) setStepIndex(NEEDS_STEPS.length)
        }
    }, [])

    const done = isComplete(answers)
    const showingResult = stepIndex >= NEEDS_STEPS.length
    const step = NEEDS_STEPS[Math.min(stepIndex, NEEDS_STEPS.length - 1)]
    const stepDone = isStepComplete(step, answers)
    const items = useMemo(() => (done ? needsOutcome(answers) : []), [answers, done])

    useEffect(() => {
        if (done) saveNeeds(answers)
    }, [answers, done])

    // Focus the new step's heading on every move so a keyboard or screen-reader
    // user is taken to the new content instead of being left on a Next button
    // that has just relabelled itself. Skipped on first paint — moving focus
    // before anyone has interacted is disorienting, not helpful.
    useEffect(() => {
        if (!movedOnce.current) {
            movedOnce.current = true
            return
        }
        headingRef.current?.focus()
    }, [stepIndex])

    const setValue = (id: keyof NeedsAnswers, value: unknown) =>
        setAnswers((prev) => ({ ...prev, [id]: value }))

    /**
     * "None of these", as a real answer rather than an absence.
     *
     * `isStepComplete` treats a multi question as answered when its array
     * EXISTS — an empty array is the affirmative answer "none of these", which
     * is also what `toRiskProfilePayload` documents. Nothing created that array
     * until the visitor ticked something, so the only way to say "none" was to
     * tick an option and untick it, and anyone who genuinely owned no boat and
     * no business simply could not leave the step. The step's own intro told
     * them to: «αν δεν ισχύει κανένα, προχωρήστε».
     *
     * Deliberately NOT fixed by making multi questions complete by default.
     * This form's whole claim to honesty is that a visitor can tell "we asked
     * and you said no" from "we never asked" — that is the stated reason it is
     * six steps instead of one screen. Auto-completing would make someone who
     * scrolled past look like they had answered, and the result would then say
     * nothing about boats with confidence it had not earned.
     */
    const clearList = (id: keyof NeedsAnswers) =>
        setAnswers((prev) => ({ ...prev, [id]: [] }))

    const toggleInList = (id: keyof NeedsAnswers, value: string) =>
        setAnswers((prev) => {
            const current = new Set((prev[id] as string[] | undefined) ?? [])
            if (current.has(value)) current.delete(value)
            else current.add(value)
            return { ...prev, [id]: [...current] }
        })

    /** The multi question has been answered, and the answer is "none of these". */
    const noneChosen = (q: NeedsQuestion) => {
        const v = answers[q.id]
        return Array.isArray(v) && v.length === 0
    }

    const isSelected = (q: NeedsQuestion, value: string | number | boolean) =>
        q.kind === "multi"
            ? (((answers[q.id] as string[] | undefined) ?? []).includes(String(value)))
            : answers[q.id] === value

    return (
        <div className="mx-auto max-w-[760px]">
            {restored && !showingResult && (
                <p className="mb-8 rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] px-4 py-3 text-body-sm text-[#166534] dark:border-[#29685B]/40 dark:bg-[#29685B]/15 dark:text-[#A7F3D0]">
                    {t(
                        "Κρατήσαμε τις απαντήσεις σας από την προηγούμενη φορά.",
                        "We kept your answers from last time.",
                    )}
                </p>
            )}

            {!showingResult ? (
                <>
                    {/* Progress. A real <ol> so the position is announced, not
                        just drawn.

                        THE TAP TARGET IS THE BUTTON; THE BAR IS A CHILD. These
                        segments are real controls — clicking one jumps to that
                        step — so they need a 24px pointer target (WCAG 2.5.8),
                        and app/globals.css enforces a 44px floor on every
                        <button> under 768px. Sizing the BUTTON itself to the
                        6px bar meant that floor had nothing to work with but the
                        button's own box: on a phone the six segments inflated
                        into 44px slabs of flat grey with no label in them, since
                        the only text they carry is `sr-only`. It read exactly
                        like six broken buttons, and on desktop — where the floor
                        does not apply — it looked correct, which is why it
                        survived.

                        So the button owns the 44px target and the bar is a 6px
                        child centred in it. Same shape as the hero carousel's
                        dots (components/landing/HeroSlides.tsx), for the same
                        reason. `-my-3.5` gives the row back the vertical space
                        the taller target would otherwise add, so the strip sits
                        where it always did. */}
                    <ol
                        className="-my-3.5 mb-4 flex items-center gap-2"
                        aria-label={t("Βήματα", "Steps")}
                    >
                        {NEEDS_STEPS.map((s, i) => {
                            const state = i === stepIndex ? "current" : isStepComplete(s, answers) ? "done" : "todo"
                            return (
                                <li key={s.id} className="flex-1 basis-8">
                                    <button
                                        type="button"
                                        onClick={() => setStepIndex(i)}
                                        aria-current={state === "current" ? "step" : undefined}
                                        className="flex h-11 w-full items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                                    >
                                        <span className="sr-only">
                                            {`${i + 1}. ${s.title[locale]}`}
                                        </span>
                                        <span
                                            aria-hidden
                                            className={`h-1.5 w-full rounded-full transition-colors ${
                                                state === "todo"
                                                    ? "bg-[#E2E8F0] dark:bg-slate-700"
                                                    : "bg-brand-accent"
                                            }`}
                                        />
                                    </button>
                                </li>
                            )
                        })}
                    </ol>

                    <p className="mb-2 text-body-sm font-semibold text-[#29685B] dark:text-[#A7F3D0]">
                        {t(
                            `Βήμα ${stepIndex + 1} από ${NEEDS_STEPS.length}`,
                            `Step ${stepIndex + 1} of ${NEEDS_STEPS.length}`,
                        )}
                    </p>
                    <h2
                        ref={headingRef}
                        tabIndex={-1}
                        className="mb-2 text-h3 font-semibold leading-[1.15] tracking-[-0.03em] text-[#0F172A] focus:outline-none dark:text-white"
                    >
                        {step.title[locale]}
                    </h2>
                    <p className="mb-10 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                        {step.intro[locale]}
                    </p>

                    <div className="space-y-10">
                        {step.questions.map((q) => (
                            <fieldset key={q.id}>
                                <legend className="mb-1 text-title font-semibold tracking-tight text-[#0F172A] dark:text-white">
                                    {q.prompt[locale]}
                                </legend>
                                {q.hint && (
                                    <p className="mb-4 text-body-sm leading-relaxed text-[#5B6A7A] dark:text-slate-400">
                                        {q.hint[locale]}
                                    </p>
                                )}
                                <div className={`flex flex-wrap gap-2.5 ${q.hint ? "" : "mt-4"}`}>
                                    {q.choices.map((choice) => {
                                        const selected = isSelected(q, choice.value)
                                        return (
                                            <label
                                                key={String(choice.value)}
                                                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-body-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#29685B] dark:has-[:focus-visible]:outline-[#A7F3D0] ${
                                                    selected
                                                        ? "border-[#29685B] bg-[#29685B] text-white dark:border-[#A7F3D0]"
                                                        : "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#29685B]/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                }`}
                                            >
                                                <input
                                                    type={q.kind === "multi" ? "checkbox" : "radio"}
                                                    name={String(q.id)}
                                                    className="sr-only"
                                                    checked={selected}
                                                    onChange={() =>
                                                        q.kind === "multi"
                                                            ? toggleInList(q.id, String(choice.value))
                                                            : setValue(q.id, choice.value)
                                                    }
                                                />
                                                {selected && <Check aria-hidden className="h-3.5 w-3.5 flex-shrink-0" />}
                                                {choice.label[locale]}
                                            </label>
                                        )
                                    })}

                                    {/* "None of these" — drawn by the RENDERER for
                                        every multi question, not authored per
                                        question, so a new one cannot ship without
                                        it. An empty array is the affirmative
                                        answer; the absence of the array is what
                                        blocks the step, and before this there was
                                        no way to produce the first without passing
                                        through the second. Mutual exclusion comes
                                        free: picking any real option makes the
                                        array non-empty, which deselects this. */}
                                    {q.kind === "multi" && (
                                        <label
                                            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-body-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-accent ${
                                                noneChosen(q)
                                                    ? "border-brand-accent bg-[#29685B] text-white"
                                                    : "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#29685B]/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                name={String(q.id)}
                                                className="sr-only"
                                                checked={noneChosen(q)}
                                                onChange={() => clearList(q.id)}
                                            />
                                            {noneChosen(q) && (
                                                <Check aria-hidden className="h-3.5 w-3.5 flex-shrink-0" />
                                            )}
                                            {(q.noneLabel ?? NONE_OF_THESE)[locale]}
                                        </label>
                                    )}
                                </div>
                            </fieldset>
                        ))}
                    </div>

                    <div className="mt-12 flex items-center justify-between gap-4 border-t border-[#E2E8F0] pt-6 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                            disabled={stepIndex === 0}
                            className="inline-flex min-h-11 items-center gap-1.5 text-body font-semibold text-[#0F172A] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] disabled:invisible dark:text-white dark:focus-visible:outline-[#A7F3D0]"
                        >
                            <ArrowLeft aria-hidden className="h-4 w-4" />
                            {t("Πίσω", "Back")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStepIndex((i) => i + 1)}
                            disabled={!stepDone}
                            className="pw-primary-button pw-btn-lg"
                        >
                            {stepIndex === NEEDS_STEPS.length - 1
                                ? t("Δείτε το αποτέλεσμα", "See the result")
                                : t("Συνέχεια", "Continue")}
                            <ArrowRight aria-hidden className="h-4 w-4" />
                        </button>
                    </div>
                    {!stepDone && (
                        <p className="mt-3 text-right text-body-sm text-[#5B6A7A] dark:text-slate-400">
                            {t("Απαντήστε σε όλες για να συνεχίσετε.", "Answer them all to continue.")}
                        </p>
                    )}
                </>
            ) : (
                <div aria-live="polite">
                    <h2 className="mb-3 text-h3 font-semibold leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
                        {t("Τι αξίζει να ελέγξετε", "What is worth checking")}
                    </h2>
                    {/* The load-bearing sentence on this page. Sixteen answers
                        cannot tell anyone whether they are covered, and saying
                        so plainly is what separates this from a quiz that hands
                        out a score. */}
                    <p className="mb-8 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">
                        {t(
                            "Δεν έχουμε δει τα ασφαλιστήριά σας, οπότε δεν ξέρουμε τι καλύπτεστε. Αυτά είναι τα σημεία που έχουν σημασία για κάποιον στη δική σας κατάσταση — και τι ακριβώς να κοιτάξετε σε καθένα.",
                            "We have not seen your policies, so we do not know what you are covered for. These are the points that matter for someone in your situation — and exactly what to look for in each.",
                        )}
                    </p>

                    <ul className="space-y-3">
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <h3 className="text-body-lg font-semibold text-[#0F172A] dark:text-white">
                                        {item.title[locale]}
                                    </h3>
                                    <p className="text-body-sm text-[#5B6A7A] dark:text-slate-400">
                                        {item.because[locale]}
                                    </p>
                                </div>
                                <p className="text-body leading-relaxed text-[#334155] dark:text-slate-300">
                                    {item.check[locale]}
                                </p>
                                <Link
                                    href={localizeHref(`/product/${item.product}`, locale)}
                                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-[#29685B] underline-offset-4 hover:underline dark:text-[#A7F3D0]"
                                >
                                    {t("Τι σημαίνει αυτή η κάλυψη", "What this cover means")}
                                    <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-10 rounded-2xl border border-[#DCEBDA] bg-[#F0FDF4] p-6 dark:border-[#29685B]/40 dark:bg-[#29685B]/15">
                        <h3 className="mb-2 text-title font-semibold tracking-tight text-[#0F172A] dark:text-white">
                            {t("Θέλετε την απάντηση, όχι τη λίστα;", "Want the answer, not the list?")}
                        </h3>
                        <p className="mb-5 text-body leading-relaxed text-[#334155] dark:text-slate-300">
                            {t(
                                "Φτιάξτε λογαριασμό και ανεβάστε τα ασφαλιστήριά σας. Κρατάμε αυτές τις απαντήσεις — δεν θα τις ξαναδώσετε — και σας λέμε ποια από τα παραπάνω τα έχετε ήδη και ποια όχι.",
                                "Create an account and upload your policies. We keep these answers — you will not give them again — and tell you which of the above you already have and which you do not.",
                            )}
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <Link href={authHref("/auth/signup", locale)} className="pw-primary-button pw-btn-lg">
                                {t("Δημιουργήστε λογαριασμό", "Create your account")}
                                <ArrowRight aria-hidden className="h-4 w-4" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setStepIndex(0)}
                                className="inline-flex min-h-11 items-center text-body font-semibold text-[#0F172A] underline-offset-4 hover:underline dark:text-white"
                            >
                                {t("Αλλαγή απαντήσεων", "Change my answers")}
                            </button>
                        </div>
                        <p className="mt-4 text-body-sm text-[#5B6A7A] dark:text-slate-400">
                            {t(
                                "Οι απαντήσεις σας μένουν στον περιηγητή σας μέχρι να φτιάξετε λογαριασμό. Δεν στέλνονται πουθενά μέχρι τότε.",
                                "Your answers stay in your browser until you create an account. Nothing is sent anywhere before that.",
                            )}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
