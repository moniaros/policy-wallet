import { getBaseEmailTemplate } from './base-template'
import { counted, greeting } from './phrases'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.gr'

interface ChurnPreventionEmailData {
    name?: string
    language: 'el' | 'en'
    expiringPolicies?: number
    openGaps?: number
}

/**
 * Day 7 inactive — "Your policies need attention"
 */
export function getChurnDay7Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language, expiringPolicies = 0, openGaps = 0 } = data
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    // The trigger for this email is INACTIVITY — seven days without a login —
    // not any change in the reader's cover. Titled "your policies need
    // attention" it read as a risk alert, and a reader whose portfolio is in
    // perfect order (no expiries, no gaps) got it anyway, with an empty body
    // under the warning. The alert framing is only used when the counts below
    // actually earn it.
    const hasFindings = expiringPolicies > 0 || openGaps > 0
    const subject = hasFindings
        ? (isGreek ? 'Το χαρτοφυλάκιό σας χρειάζεται προσοχή' : 'Your portfolio needs attention')
        : (isGreek ? 'Η ασφαλιστική σας κάλυψη σας περιμένει' : 'Your insurance cover is waiting for you')

    const content = `
        <h2>${hasFindings
            ? (isGreek ? 'Το χαρτοφυλάκιό σας χρειάζεται προσοχή' : 'Your portfolio needs attention')
            : (isGreek ? 'Η ασφαλιστική σας κάλυψη σας περιμένει' : 'Your insurance cover is waiting for you')
        }</h2>
        <p>${hello}</p>
        <p>${isGreek
            ? 'Δεν σας έχουμε δει εδώ και λίγο καιρό, αλλά η ασφαλιστική σας κάλυψη δεν σταματά.'
            : "We haven't seen you in a while, but your insurance cover doesn't stop."
        }</p>
        ${!hasFindings ? `<p>${isGreek
            ? 'Δεν εντοπίσαμε κάτι που να απαιτεί ενέργεια αυτή τη στιγμή — αξίζει όμως μια ματιά στο χαρτοφυλάκιό σας.'
            : 'We found nothing that needs action right now — but your portfolio is worth a look.'
        }</p>` : ''}

        ${expiringPolicies > 0 ? `
            <div style="background: #FEF2F2; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #991B1B; font-weight: bold;">
                    ${isGreek
                        ? counted(expiringPolicies, 'ασφαλιστήριο λήγει σύντομα', 'ασφαλιστήρια λήγουν σύντομα')
                        : counted(expiringPolicies, 'policy expiring soon', 'policies expiring soon')}
                </p>
            </div>
        ` : ''}

        ${openGaps > 0 ? `
            <div style="background: #FFFBEB; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: bold;">
                    ${isGreek
                        ? counted(openGaps, 'κενό κάλυψης χρειάζεται αντιμετώπιση', 'κενά κάλυψης χρειάζονται αντιμετώπιση')
                        : counted(openGaps, 'coverage gap needs attention', 'coverage gaps need attention')}
                </p>
            </div>
        ` : ''}

        <a href="${APP_URL}/dashboard" class="button">${isGreek ? 'Άνοιγμα πίνακα ελέγχου' : 'Open your dashboard'}</a>
    `

    return { subject, html: getBaseEmailTemplate(content, language) }
}

/**
 * Day 14 inactive — "New features you're missing"
 */
export function getChurnDay14Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language } = data
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    const subject = isGreek
        ? '✨ Νέες λειτουργίες που χάνετε'
        : '✨ New features you\'re missing'

    // The fourth bullet advertised a real-time coverage score. The protection
    // score was removed from the product in Aug 2026 (PW-MOBILE-TRANSFORM-01,
    // halt H-001), so listing it here would be a false claim in a win-back
    // email — the worst place to make one.
    const features = isGreek
        ? [
            '🤖 Βελτιωμένη AI ανάλυση κάλυψης',
            '📊 Εβδομαδιαία σύνοψη email',
            '💬 Ενσωματωμένα μηνύματα με τον σύμβουλό σας',
        ]
        : [
            '🤖 Improved AI coverage analysis',
            '📊 Weekly email digest',
            '💬 Inline messaging with your advisor',
        ]

    const content = `
        <h2>${isGreek ? 'Δείτε τι νέο υπάρχει!' : 'See what\'s new!'}</h2>
        <p>${hello}</p>
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

        <a href="${APP_URL}/dashboard" class="button">${isGreek ? 'Εξερευνήστε τα νέα' : 'Explore what\'s new'}</a>
    `

    return { subject, html: getBaseEmailTemplate(content, language) }
}

/**
 * Day 30 inactive — "We miss you"
 *
 * This email used to open with a gift box and the line "500 AI credits added
 * to your account", in the PAST TENSE, above a 48px green number. Nothing in
 * the codebase ever added them: the only code that moves a credit balance is
 * the admin `grantTokens` action, and the churn path does not call it. The
 * service carried the admission in a comment — "integrate with actual
 * billing/token system" — while a daily cron told customers the integration
 * had already run.
 *
 * Whether PolicyWallet SHOULD give returning customers credits is a commercial
 * decision and is still open (H-008). Claiming it did is not a decision; it is
 * a false statement, so the claim is gone and the re-engagement email stands on
 * what is true: the wallet is still there, and so are their policies.
 */
export function getChurnDay30Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language } = data
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    const subject = isGreek
        ? 'Ο ασφαλιστικός σας φάκελος σας περιμένει'
        : 'Your insurance wallet is waiting for you'

    const content = `
        <h2>${isGreek ? 'Μας λείπετε!' : 'We miss you!'}</h2>
        <p>${hello}</p>
        <p>${isGreek
            ? 'Έχει περάσει καιρός από την τελευταία σας επίσκεψη. Τα ασφαλιστήριά σας είναι αποθηκευμένα με ασφάλεια και σας περιμένουν.'
            : "It has been a while since your last visit. Your policies are stored securely and they are waiting for you."
        }</p>
        <p>${isGreek
            ? 'Μπείτε ξανά όποτε θέλετε — όλα είναι εκεί που τα αφήσατε.'
            : 'Sign back in whenever you like — everything is where you left it.'
        }</p>

        <a href="${APP_URL}/dashboard" class="button">${isGreek ? 'Άνοιγμα του φακέλου μου' : 'Open my wallet'}</a>
    `

    return { subject, html: getBaseEmailTemplate(content, language) }
}

/**
 * Day 60 inactive — final reminder.
 *
 * The subject and heading asserted a coverage risk behind a padlock. This
 * tier is selected on `daysSinceActive` alone (churn-prevention.service.ts:
 * 58-62 days) — nothing on the path looks at an expiry date, a gap, or a
 * policy at all. Day 7 does take `expiringPolicies` and `openGaps`; this one
 * had no basis for what it said.
 *
 * That is the absence-is-not-evidence rule pointed the other way. The usual
 * failure is a check that could not run reporting the GOOD outcome; this one
 * reported the bad one, which is worse — fear manufactured from missing data
 * is not a warning, it is a lever. The body was already honest and hedged;
 * only the headline claimed to know something.
 *
 * It now states the one thing this path established: they have not looked.
 */
export function getChurnDay60Email(data: ChurnPreventionEmailData): { subject: string; html: string } {
    const { name, language } = data
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    const subject = isGreek
        ? 'Δεν έχετε ελέγξει τα ασφαλιστήριά σας εδώ και 2 μήνες'
        : "You haven't checked your policies in 2 months"

    const content = `
        <h2>${isGreek ? 'Δεν έχετε ελέγξει τα ασφαλιστήριά σας εδώ και 2 μήνες' : "You haven't checked your policies in 2 months"}</h2>
        <p>${hello}</p>
        <p>${isGreek
            ? 'Δεν έχετε ελέγξει τα ασφαλιστήρια σας εδώ και 2 μήνες. Ανανεώσεις, κενά κάλυψης, και μηνύματα από τον σύμβουλό σας μπορεί να περιμένουν.'
            : "You haven't checked your policies in 2 months. Renewals, coverage gaps, and advisor messages may be waiting."
        }</p>

        <a href="${APP_URL}/dashboard" class="button">${isGreek ? 'Ελέγξτε τώρα' : 'Check now'}</a>

        <div class="divider"></div>
        <p style="color: #9CA3AF; font-size: 12px;">
            ${isGreek
                ? 'Αν δεν θέλετε να λαμβάνετε αυτά τα email, μπορείτε να τα απενεργοποιήσετε στις Ρυθμίσεις.'
                : 'If you don\'t want to receive these emails, you can disable them in Settings.'}
        </p>
    `

    return { subject, html: getBaseEmailTemplate(content, language) }
}
