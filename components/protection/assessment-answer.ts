/**
 * How one assessment answer becomes profile FACT writes — the pure half of
 * app/(protected)/protection/assessment-actions.ts, kept out of the
 * `"use server"` file because that file may export only async functions.
 *
 * The value schema is the question's own: its input type and its options
 * (lib/protection/factor-questions.ts). The writes carry `source: assessment`
 * and `precision: exact`, with two deliberate departures explained inline.
 */

import { z } from "zod"

import type { FactorQuestion } from "@/lib/protection/factor-questions"
import type { FactWrite } from "@/lib/services/protection-profile/fact-writes"

const MAX_COUNT = 50
const MAX_AMOUNT = 1_000_000_000
const OLDEST_BIRTH_YEAR = 1900

/** The value schema for one question — its own input type and its own options. */
export function valueSchemaFor(question: FactorQuestion, now: Date): z.ZodTypeAny {
    switch (question.input) {
        case "single": {
            const values = (question.options ?? []).map((o) => o.value)
            return values.length > 0 ? z.enum(values as [string, ...string[]]) : z.never()
        }
        case "multi": {
            const values = (question.options ?? []).map((o) => o.value)
            return z.array(z.enum(values as [string, ...string[]])).max(values.length)
        }
        case "boolean":
            return z.boolean()
        case "number":
            return question.factor === "age"
                ? z.number().int().min(OLDEST_BIRTH_YEAR).max(now.getUTCFullYear())
                : z.number().int().min(0).max(MAX_COUNT)
        case "currency":
            return z.number().min(0).max(MAX_AMOUNT)
    }
}

/** The column writes one validated answer produces. */
export function factWritesForAnswer(question: FactorQuestion, value: unknown): FactWrite[] {
    const base = { source: "assessment" as const, precision: "exact" as const }
    switch (question.factor) {
        case "age": {
            // Mid-year anchor: a year is a bucket, so the error is at most six
            // months either way and the precision says so.
            const year = value as number
            return [{ column: "dateOfBirth", value: new Date(Date.UTC(year, 6, 1)), source: "assessment", precision: "coarse" }]
        }
        case "loans": {
            const amount = Math.round(value as number)
            return [
                { column: "loanAmount", value: amount, ...base },
                { column: "hasLoans", value: amount > 0, ...base },
            ]
        }
        default: {
            const column = question.columns[0]
            if (question.input === "multi") {
                const list = (value as string[]).filter((v) => v !== "none")
                return [{ column, value: list, ...base }]
            }
            if (question.input === "currency") return [{ column, value: Math.round(value as number), ...base }]
            return [{ column, value, ...base }]
        }
    }
}

