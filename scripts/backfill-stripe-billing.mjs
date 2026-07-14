#!/usr/bin/env node
/**
 * Backfill Stripe billing state for existing subscribers.
 *
 * The pre-integrity-fix checkout flow never persisted user.stripeCustomerId
 * (billing portal 404'd for every v1 subscriber) and hardcoded a +30-day
 * currentPeriodEnd (wrong for annual plans and Pro trials). This script
 * repairs existing rows from Stripe, the source of truth:
 *
 *   for every subscription with a stripeSubscriptionId:
 *     - persist user.stripeCustomerId
 *     - sync currentPeriodStart/End, autoRenew (= !cancel_at_period_end)
 *     - sync status (active/trialing→active, past_due→past_due, else expired)
 *
 * DRY-RUN by default — prints the diff and writes nothing.
 * Run with --apply to write.
 *
 * Usage (env must provide DATABASE_URL/DIRECT_URL and STRIPE_SECRET_KEY —
 * e.g. `set -a; source .env.local; set +a` first):
 *   node scripts/backfill-stripe-billing.mjs
 *   node scripts/backfill-stripe-billing.mjs --apply
 */

import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"

const APPLY = process.argv.includes("--apply")

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set — aborting.")
    process.exit(1)
}

const db = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })

function mapStripeStatus(stripeStatus) {
    if (stripeStatus === "active" || stripeStatus === "trialing") return "active"
    if (stripeStatus === "past_due") return "past_due"
    return "expired"
}

const subs = await db.subscription.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: {
        id: true,
        userId: true,
        status: true,
        autoRenew: true,
        currentPeriodEnd: true,
        stripeSubscriptionId: true,
        user: { select: { email: true, stripeCustomerId: true } },
    },
})

console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — ${subs.length} subscription(s) with a Stripe id\n`)

let changed = 0
let missing = 0

for (const sub of subs) {
    let stripeSub
    try {
        stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
    } catch (error) {
        if (error?.code === "resource_missing") {
            missing++
            console.log(`✗ ${sub.stripeSubscriptionId} (${sub.user.email}): gone on Stripe — leaving local row untouched (review manually)`)
            continue
        }
        throw error
    }

    const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer?.id
    const next = {
        status: mapStripeStatus(stripeSub.status),
        autoRenew: !stripeSub.cancel_at_period_end,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    }

    const diffs = []
    if (sub.status !== next.status) diffs.push(`status ${sub.status} → ${next.status}`)
    if (sub.autoRenew !== next.autoRenew) diffs.push(`autoRenew ${sub.autoRenew} → ${next.autoRenew}`)
    if (Math.abs(sub.currentPeriodEnd.getTime() - next.currentPeriodEnd.getTime()) > 60_000)
        diffs.push(`periodEnd ${sub.currentPeriodEnd.toISOString().slice(0, 10)} → ${next.currentPeriodEnd.toISOString().slice(0, 10)}`)
    if (customerId && sub.user.stripeCustomerId !== customerId)
        diffs.push(`customerId ${sub.user.stripeCustomerId ?? "null"} → ${customerId}`)

    if (diffs.length === 0) {
        console.log(`= ${sub.stripeSubscriptionId} (${sub.user.email}): already in sync`)
        continue
    }

    changed++
    console.log(`~ ${sub.stripeSubscriptionId} (${sub.user.email}): ${diffs.join(", ")}`)

    if (APPLY) {
        await db.subscription.update({ where: { id: sub.id }, data: next })
        if (customerId && sub.user.stripeCustomerId !== customerId) {
            await db.user.updateMany({
                where: { id: sub.userId, NOT: { stripeCustomerId: customerId } },
                data: { stripeCustomerId: customerId },
            })
        }
    }
}

console.log(`\n${changed} row(s) ${APPLY ? "updated" : "would change"}, ${missing} missing on Stripe.`)
await db.$disconnect()
