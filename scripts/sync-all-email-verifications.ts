/**
 * Bulk Email Verification Sync Script
 * 
 * This script syncs email verification status from Supabase Auth to local database
 * for all users. Use this to fix any existing users with mismatched verification status.
 * 
 * Usage:
 * npx ts-node scripts/sync-all-email-verifications.ts
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function syncAllEmailVerifications() {
    console.log('🔄 Starting bulk email verification sync...\n')

    try {
        // 1. Setup Supabase Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('❌ Missing required environment variables:')
            console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`)
            console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✓' : '✗'}`)
            return
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 2. Get all users from Supabase
        console.log('📥 Fetching users from Supabase...')
        const { data: { users: supabaseUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        if (listError) {
            console.error('❌ Failed to fetch Supabase users:', listError)
            return
        }

        console.log(`✅ Found ${supabaseUsers?.length || 0} users in Supabase\n`)

        // 3. Sync each user
        let syncedCount = 0
        let alreadySyncedCount = 0
        let errorCount = 0

        for (const supabaseUser of supabaseUsers || []) {
            try {
                // Find user in local database
                const dbUser = await prisma.user.findUnique({
                    where: { id: supabaseUser.id }
                })

                if (!dbUser) {
                    console.log(`⚠️  User ${supabaseUser.email} not found in local database - skipping`)
                    continue
                }

                // Check if sync is needed
                const isVerifiedInSupabase = !!supabaseUser.email_confirmed_at
                const isVerifiedInDB = !!dbUser.emailVerified

                if (isVerifiedInSupabase && !isVerifiedInDB) {
                    // Sync needed
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { emailVerified: new Date(supabaseUser.email_confirmed_at!) }
                    })

                    // Clean up verification tokens
                    if (supabaseUser.email) {
                        await prisma.verificationToken.deleteMany({
                            where: { identifier: supabaseUser.email }
                        }).catch(() => { })
                    }

                    console.log(`✅ Synced: ${supabaseUser.email}`)
                    syncedCount++
                } else if (isVerifiedInSupabase && isVerifiedInDB) {
                    console.log(`ℹ️  Already synced: ${supabaseUser.email}`)
                    alreadySyncedCount++
                } else if (!isVerifiedInSupabase) {
                    console.log(`⏳ Not verified in Supabase: ${supabaseUser.email}`)
                }

            } catch (userError) {
                console.error(`❌ Error syncing ${supabaseUser.email}:`, userError)
                errorCount++
            }
        }

        // 4. Summary
        console.log('\n' + '='.repeat(50))
        console.log('📊 SYNC SUMMARY')
        console.log('='.repeat(50))
        console.log(`Total users in Supabase: ${supabaseUsers?.length || 0}`)
        console.log(`✅ Newly synced: ${syncedCount}`)
        console.log(`ℹ️  Already synced: ${alreadySyncedCount}`)
        console.log(`❌ Errors: ${errorCount}`)
        console.log('='.repeat(50))

        if (syncedCount > 0) {
            console.log(`\n✅ SUCCESS! ${syncedCount} user(s) have been synced.`)
        } else {
            console.log('\n✅ All users are already in sync!')
        }

    } catch (error) {
        console.error('❌ Fatal error during sync:', error)
    } finally {
        await prisma.$disconnect()
    }
}

syncAllEmailVerifications()
