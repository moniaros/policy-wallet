/**
 * Playwright global setup — provisions the E2E test users directly in the
 * local-dev Supabase project (auth.users + auth.identities via SQL, plus the
 * Prisma User row the app requires — getAuthenticatedUser looks users up by
 * email and bounces to /auth/signin when the row is missing).
 *
 * SQL provisioning (pgcrypto bcrypt) is used because .env.local has no
 * SUPABASE_SERVICE_ROLE_KEY; DATABASE_URL can write the auth schema, the
 * same access scripts/seed-agent-demo.mjs already relies on. Idempotent:
 * re-runs reset the password and confirmation state.
 */

import { readFileSync } from 'fs'
import path from 'path'
import { E2E_POLICYHOLDER, E2E_AGENT, E2E_ADMIN } from './e2e-users'

function loadEnvFromDotenvFiles() {
    for (const file of ['.env.local', '.env']) {
        try {
            const content = readFileSync(path.join(process.cwd(), file), 'utf8')
            for (const line of content.split('\n')) {
                const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/)
                if (match && !process.env[match[1]]) {
                    process.env[match[1]] = match[2]
                }
            }
        } catch {
            // file absent — fine
        }
    }
}

async function provisionUser(
    db: any,
    user: { email: string; password: string; name: string; role: 'policyholder' | 'agent' | 'admin' }
) {
    // ── Supabase auth side (GoTrue schema verified 2026-07-11:
    //    confirmed_at is GENERATED — never insert it; token varchars must be
    //    '' not NULL for some GoTrue scans; identities.provider_id = user id).
    const rows: Array<{ id: string }> = await db.$queryRawUnsafe(
        `select id::text as id from auth.users where email = $1`,
        user.email
    )

    let authUserId: string
    if (rows.length > 0) {
        authUserId = rows[0].id
        await db.$executeRawUnsafe(
            `update auth.users
               set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
                   email_confirmed_at = coalesce(email_confirmed_at, now()),
                   banned_until = null,
                   raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                       || jsonb_build_object('role', $2::text, 'full_name', $3::text),
                   updated_at = now()
             where id = $4::uuid`,
            user.password, user.role, user.name, authUserId
        )
    } else {
        const created: Array<{ id: string }> = await db.$queryRawUnsafe(
            `insert into auth.users (
                instance_id, id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                confirmation_token, recovery_token, email_change_token_new,
                email_change, email_change_token_current, phone_change,
                phone_change_token, reauthentication_token,
                is_sso_user, is_anonymous, created_at, updated_at
             ) values (
                '00000000-0000-0000-0000-000000000000'::uuid,
                gen_random_uuid(), 'authenticated', 'authenticated',
                $1, extensions.crypt($2, extensions.gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('role', $3::text, 'full_name', $4::text),
                '', '', '', '', '', '', '', '',
                false, false, now(), now()
             ) returning id::text as id`,
            user.email, user.password, user.role, user.name
        )
        authUserId = created[0].id

        await db.$executeRawUnsafe(
            `insert into auth.identities (
                id, provider_id, user_id, identity_data, provider,
                last_sign_in_at, created_at, updated_at
             ) values (
                gen_random_uuid(), $1, $1::uuid,
                jsonb_build_object('sub', $1::text, 'email', $2::text,
                                   'email_verified', true, 'phone_verified', false),
                'email', now(), now(), now()
             )
             on conflict (provider_id, provider) do nothing`,
            authUserId, user.email
        )
    }

    // ── Prisma side (mirrors registerUser's writes) ──────────────────
    const dbUser = await db.user.upsert({
        where: { email: user.email },
        update: {
            name: user.name,
            roles: user.role,
            emailVerified: new Date(),
            preferredLanguage: 'el',
        },
        create: {
            name: user.name,
            email: user.email,
            roles: user.role,
            emailVerified: new Date(),
            preferredLanguage: 'el',
        },
    })

    if (user.role === 'agent') {
        await db.agentProfile.upsert({
            where: { userId: dbUser.id },
            update: { verificationStatus: 'verified' },
            create: { userId: dbUser.id, verificationStatus: 'verified' },
        })
    }

    console.log(`✅ E2E user provisioned: ${user.email} (${user.role})`)
    return dbUser
}

/**
 * The wallet's add-menu FAB (and with it the batch-upload entry) only
 * renders when the account holds at least one policy — keep a stable
 * fixture policy on the E2E policyholder.
 */
/** The stored label is GENERATED, never a file name — same rule as production.
 *  See lib/wallet/document-label.ts. */
const E2E_DOCUMENT_LABEL = 'Ασφαλιστήριο Αυτοκίνητο · E2E-MOT-001'

async function provisionFixturePolicy(db: any, ownerUserId: string) {
    let policy = await db.policy.findFirst({
        where: { ownerUserId, policyNumber: 'E2E-MOT-001' },
        select: { id: true },
    })

    if (!policy) {
        const now = new Date()
        policy = await db.policy.create({
            data: {
                ownerUserId,
                createdByUserId: ownerUserId,
                policyNumber: 'E2E-MOT-001',
                insurerName: 'E2E Insurance Co.',
                lineOfBusiness: 'motor',
                status: 'active',
                startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                endDate: new Date(now.getFullYear() + 1, now.getMonth() - 1, 1),
                premiumAmount: 420,
                premiumCurrency: 'EUR',
            },
            select: { id: true },
        })
        console.log('✅ E2E fixture policy provisioned (E2E-MOT-001)')
    }

    // A PDF document row so the free-tier PDF-preview lock (and its upgrade
    // click-through) is exercisable. The file itself never has to exist —
    // the locked state renders before any fetch.
    const doc = await db.policyDocument.findFirst({
        where: { policyId: policy.id, fileName: E2E_DOCUMENT_LABEL },
        select: { id: true },
    })
    if (!doc) {
        await db.policyDocument.create({
            data: {
                policyId: policy.id,
                fileUrl: '/e2e-fixtures/e2e-document.pdf',
                fileName: E2E_DOCUMENT_LABEL,
                fileSize: 24576,
                source: 'policyholder',
                processingStatus: 'completed',
                uploadedByUserId: ownerUserId,
            },
        })
        console.log('✅ E2E fixture document provisioned')
    }
}

export default async function globalSetup() {
    loadEnvFromDotenvFiles()

    if (!process.env.DATABASE_URL) {
        throw new Error('global-setup: DATABASE_URL not found in environment or .env.local')
    }
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL)) {
        throw new Error('global-setup: DATABASE_URL points at the PRODUCTION Supabase project — refusing to provision E2E users there.')
    }

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()

    try {
        const policyholder = await provisionUser(db, E2E_POLICYHOLDER)
        await provisionUser(db, E2E_AGENT)
        await provisionUser(db, E2E_ADMIN)
        await provisionFixturePolicy(db, policyholder.id)

        // Deterministic usage-state reset: the free-tier gates are LIFETIME
        // counters (free questions from activityLog POLICY_QUESTION_ASKED, the
        // complimentary trial from trialAnalysisUsedAt). Accumulated rows from
        // prior runs silently flip the free fixture into the exhausted state —
        // money-path 143 failed exactly this way after months of dev-DB drift.
        await db.activityLog.deleteMany({
            where: { adminUserId: policyholder.id, actionType: 'POLICY_QUESTION_ASKED' },
        })
        await db.user.update({
            where: { id: policyholder.id },
            data: { trialAnalysisUsedAt: null },
        })
        console.log('✅ E2E fixture usage counters reset (free questions + trial)')
    } catch (error) {
        console.error(
            '❌ E2E user provisioning failed. If this is a GoTrue schema/permission issue, ' +
            'add SUPABASE_SERVICE_ROLE_KEY to .env.local and switch global-setup to the ' +
            'auth.admin.createUser API (lib/supabase/admin.ts pattern).'
        )
        throw error
    } finally {
        await db.$disconnect()
    }
}
