import { getBaseEmailTemplate } from './base-template'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.gr'

interface ChurnPreventionEmailData {
    name?: string
    language: 'el' | 'en'
    expiringPolicies?: number
    openGaps?: number
    bonusTokens?: number
}

/**
 * Day 7 inactive — "Your policies need attention"
 */
export function getChurnDay7Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language, expiringPolicies = 0, openGaps = 0 } = data
    const isGreek = language === 'el'
    const greeting = name
        ? (isGreek ? `Γεια σου ${name},` : `Hi ${name},`)
        : (isGreek ? 'Γεια σου,' : 'Hi there,')

    const subject = isGreek
        ? '⚠️ Τα ασφαλιστήρια σας χρειάζονται προσοχή'
        : '⚠️ Your policies need attention'

    const content = `
        <h2>${isGreek ? 'Τα ασφαλιστήρια σας χρειάζονται προσοχή' : 'Your policies need attention'}</h2>
        <p>${greeting}</p>
        <p>${isGreek
            ? 'Δεν σας έχουμε δει εδώ και λίγο καιρό, αλλά η ασφαλιστική σας κάλυψη δεν σταματά.'
            : "We haven't seen you in a while, but your insurance coverage doesn't stop."
        }</p>

        ${expiringPolicies > 0 ? `
            <div style="background: #FEF2F2; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #991B1B; font-weight: bold;">
                    🔔 ${expiringPolicies} ${isGreek ? 'ασφαλιστήρια λήγουν σύντομα' : 'policies expiring soon'}
                </p>
            </div>
        ` : ''}

        ${openGaps > 0 ? `
            <div style="background: #FFFBEB; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: bold;">
                    🔍 ${openGaps} ${isGreek ? 'κενά κάλυψης χρειάζονται αντιμετώπιση' : 'coverage gaps need attention'}
                </p>
            </div>
        ` : ''}

        <a href="${APP_URL}/home" class="button">${isGreek ? 'Δείτε το Dashboard σας' : 'View your Dashboard'}</a>
    `

    return { subject, html: getBaseEmailTemplate(content) }
}

/**
 * Day 14 inactive — "New features you're missing"
 */
export function getChurnDay14Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language } = data
    const isGreek = language === 'el'
    const greeting = name
        ? (isGreek ? `Γεια σου ${name},` : `Hi ${name},`)
        : (isGreek ? 'Γεια σου,' : 'Hi there,')

    const subject = isGreek
        ? '✨ Νέες λειτουργίες που χάνετε'
        : '✨ New features you\'re missing'

    const features = isGreek
        ? [
            '🤖 Βελτιωμένη AI ανάλυση κάλυψης',
            '📊 Εβδομαδιαία σύνοψη email',
            '💬 Ενσωματωμένα μηνύματα με τον σύμβουλό σας',
            '🎯 Σκορ υγείας κάλυψης σε πραγματικό χρόνο',
        ]
        : [
            '🤖 Improved AI coverage analysis',
            '📊 Weekly email digest',
            '💬 Inline messaging with your advisor',
            '🎯 Real-time coverage health score',
        ]

    const content = `
        <h2>${isGreek ? 'Δείτε τι νέο υπάρχει!' : 'See what\'s new!'}</h2>
        <p>${greeting}</p>
        <p>${isGreek
            ? 'Έχουμε προσθέσει νέες δυνατότητες στο PolicyWallet:'
            : 'We\'ve added new capabilities to PolicyWallet:'
        }</p>

        <div style="margin: 24px 0;">
            ${features.map(f => `
                <div style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                    <p style="margin: 0; font-size: 14px; color: #374151;">${f}</p>
                </div>
            `).join('')}
        </div>

        <a href="${APP_URL}/home" class="button">${isGreek ? 'Εξερευνήστε τα νέα' : 'Explore what\'s new'}</a>
    `

    return { subject, html: getBaseEmailTemplate(content) }
}

/**
 * Day 30 inactive — "We miss you" + bonus tokens
 */
export function getChurnDay30Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language, bonusTokens = 500 } = data
    const isGreek = language === 'el'
    const greeting = name
        ? (isGreek ? `Γεια σου ${name},` : `Hi ${name},`)
        : (isGreek ? 'Γεια σου,' : 'Hi there,')

    const subject = isGreek
        ? `🎁 Μας λείπετε — πάρτε ${bonusTokens} δωρεάν credits`
        : `🎁 We miss you — get ${bonusTokens} free credits`

    const content = `
        <h2>${isGreek ? 'Μας λείπετε!' : 'We miss you!'}</h2>
        <p>${greeting}</p>
        <p>${isGreek
            ? `Ως ένδειξη εκτίμησης, σας δωρίζουμε <strong>${bonusTokens} δωρεάν AI credits</strong> για να εξερευνήσετε τη νέα μας ανάλυση κάλυψης.`
            : `As a token of appreciation, we're gifting you <strong>${bonusTokens} free AI credits</strong> to explore our new coverage analysis.`
        }</p>

        <div style="text-align: center; margin: 24px 0; padding: 24px; background: linear-gradient(135deg, #F0FDF4, #ECFDF5); border-radius: 16px;">
            <p style="font-size: 48px; font-weight: 900; color: #059669; margin: 0;">${bonusTokens}</p>
            <p style="font-size: 14px; color: #065F46; margin: 4px 0 0; font-weight: 600;">
                ${isGreek ? 'AI Credits προστέθηκαν στον λογαριασμό σας' : 'AI Credits added to your account'}
            </p>
        </div>

        <a href="${APP_URL}/home" class="button">${isGreek ? 'Χρησιμοποιήστε τα τώρα' : 'Use them now'}</a>

        <div class="divider"></div>
        <p style="color: #9CA3AF; font-size: 12px;">
            ${isGreek ? 'Τα credits λήγουν σε 30 ημέρες.' : 'Credits expire in 30 days.'}
        </p>
    `

    return { subject, html: getBaseEmailTemplate(content) }
}

/**
 * Day 60 inactive — Final reminder
 */
export function getChurnDay60Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language } = data
    const isGreek = language === 'el'
    const greeting = name
        ? (isGreek ? `Γεια σου ${name},` : `Hi ${name},`)
        : (isGreek ? 'Γεια σου,' : 'Hi there,')

    const subject = isGreek
        ? '🔒 Η κάλυψή σας μπορεί να κινδυνεύει'
        : '🔒 Your coverage may be at risk'

    const content = `
        <h2>${isGreek ? 'Η κάλυψή σας μπορεί να κινδυνεύει' : 'Your coverage may be at risk'}</h2>
        <p>${greeting}</p>
        <p>${isGreek
            ? 'Δεν έχετε ελέγξει τα ασφαλιστήρια σας εδώ και 2 μήνες. Ανανεώσεις, κενά κάλυψης, και μηνύματα από τον σύμβουλό σας μπορεί να περιμένουν.'
            : "You haven't checked your policies in 2 months. Renewals, coverage gaps, and advisor messages may be waiting."
        }</p>

        <a href="${APP_URL}/home" class="button">${isGreek ? 'Ελέγξτε τώρα' : 'Check now'}</a>

        <div class="divider"></div>
        <p style="color: #9CA3AF; font-size: 12px;">
            ${isGreek
                ? 'Αν δεν θέλετε να λαμβάνετε αυτά τα email, μπορείτε να τα απενεργοποιήσετε στις Ρυθμίσεις.'
                : 'If you don\'t want to receive these emails, you can disable them in Settings.'}
        </p>
    `

    return { subject, html: getBaseEmailTemplate(content) }
}
