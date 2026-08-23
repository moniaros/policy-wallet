import { getBaseEmailTemplate } from './base-template'
import { counted, greeting } from './phrases'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.gr'

/**
 * Welcome email sent immediately after signup (Day 0).
 */
export function getWelcomeEmail(language: 'el' | 'en', name?: string): { subject: string; html: string } {
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    const subject = isGreek
        ? '🎉 Καλώς ήρθες στο PolicyWallet!'
        : '🎉 Welcome to PolicyWallet!'

    const content = `
        <h2>${isGreek ? 'Καλώς ήρθες στο PolicyWallet!' : 'Welcome to PolicyWallet!'}</h2>
        <p>${hello}</p>
        <p>${isGreek
            ? 'Δημιουργήσατε με επιτυχία τον λογαριασμό σας. Τώρα μπορείτε να οργανώσετε όλα τα ασφαλιστήρια συμβόλαιά σας σε ένα ασφαλές μέρος.'
            : 'You\'ve successfully created your account. You can now organize all your insurance policies in one secure place.'
        }</p>
        <p><strong>${isGreek ? 'Τα πρώτα βήματα:' : 'Your first steps:'}</strong></p>
        <ul>
            <li>${isGreek ? '📎 Ανεβάστε το πρώτο ασφαλιστήριο (PDF ή φωτογραφία)' : '📎 Upload your first policy (PDF or photo)'}</li>
            <li>${isGreek ? '🤖 Η AI θα αναλύσει αυτόματα την κάλυψή σας' : '🤖 AI will automatically analyze your coverage'}</li>
            <li>${isGreek ? '🔍 Ανακαλύψτε κενά κάλυψης και ευκαιρίες εξοικονόμησης' : '🔍 Discover coverage gaps and savings opportunities'}</li>
        </ul>
        <a href="${APP_URL}/wallet/add" class="button">${isGreek ? 'Ανεβάστε το πρώτο σας συμβόλαιο' : 'Upload Your First Policy'}</a>
        <p style="color: #6B7280; font-size: 14px;">${isGreek
            ? 'Αν χρειάζεστε βοήθεια, επισκεφθείτε το Help Center μας.'
            : 'If you need help, visit our Help Center.'
        }</p>
    `

    return {
        subject,
        html: getBaseEmailTemplate(content, language),
    }
}

/**
 * Day 3 follow-up email for users who haven't uploaded a policy yet.
 */
export function getDay3Email(language: 'el' | 'en', name?: string): { subject: string; html: string } {
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    const subject = isGreek
        ? '📎 Ανεβάσατε το πρώτο σας συμβόλαιο;'
        : '📎 Have you uploaded your first policy?'

    const content = `
        <h2>${isGreek ? 'Ένα βήμα σας χωρίζει!' : 'You\'re one step away!'}</h2>
        <p>${hello}</p>
        <p>${isGreek
            ? 'Παρατηρήσαμε ότι δεν έχετε ανεβάσει ακόμα κάποιο ασφαλιστήριο. Η AI ανάλυσή μας μπορεί να εντοπίσει κενά κάλυψης και ευκαιρίες εξοικονόμησης σε δευτερόλεπτα.'
            : 'We noticed you haven\'t uploaded a policy yet. Our AI analysis can identify coverage gaps and savings opportunities in seconds.'
        }</p>
        <p><strong>${isGreek ? 'Πώς λειτουργεί:' : 'How it works:'}</strong></p>
        <ul>
            <li>${isGreek ? '1. Ανεβάστε ένα PDF ή βγάλτε φωτογραφία' : '1. Upload a PDF or take a photo'}</li>
            <li>${isGreek ? '2. Η AI διαβάζει και αναλύει το συμβόλαιο' : '2. AI reads and analyzes the policy'}</li>
            <li>${isGreek ? '3. Λαμβάνετε ρεπορτ κάλυψης σε λεπτά' : '3. Get a coverage report in minutes'}</li>
        </ul>
        <a href="${APP_URL}/wallet/add" class="button">${isGreek ? 'Ανεβάστε τώρα' : 'Upload Now'}</a>
        <div class="divider"></div>
        <p style="color: #6B7280; font-size: 14px;">${isGreek
            ? '💡 Tip: Μπορείτε να ανεβάσετε συμβόλαια από αυτοκίνητο, σπίτι, υγεία, ζωή — όλα σε ένα μέρος.'
            : '💡 Tip: Upload motor, home, health, life policies — everything in one place.'
        }</p>
    `

    return {
        subject,
        html: getBaseEmailTemplate(content, language),
    }
}

/**
 * Day 7 coverage snapshot email.
 */
export function getDay7Email(
    language: 'el' | 'en',
    name?: string,
    // No score in here. The tile this used to carry rendered the provisional
    // estimate — 100% for a portfolio nothing had analysed — and the protection
    // score was removed from the product in Aug 2026 (PW-MOBILE-TRANSFORM-01,
    // halt H-001). Policies and gaps are counts of recorded things.
    stats?: { policyCount: number; gapCount: number }
): { subject: string; html: string } {
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    const subject = isGreek
        ? '📊 Η εβδομαδιαία σύνοψη κάλυψης'
        : '📊 Your weekly coverage snapshot'

    const hasStats = stats && stats.policyCount > 0

    const statsHtml = hasStats
        ? `
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr>
                    <td style="text-align: center; padding: 16px; background: #F0FDF4; border-radius: 8px;">
                        <p style="font-size: 28px; font-weight: bold; margin: 0; color: #111827;">${stats!.policyCount}</p>
                        <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0;">${isGreek ? 'Ασφαλιστήρια' : 'Policies'}</p>
                    </td>
                    <td style="width: 8px;"></td>
                    <td style="text-align: center; padding: 16px; background: ${stats!.gapCount > 0 ? '#FEF3C7' : '#F0FDF4'}; border-radius: 8px;">
                        <p style="font-size: 28px; font-weight: bold; margin: 0; color: #111827;">${stats!.gapCount}</p>
                        <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0;">${isGreek ? 'Κενά κάλυψης' : 'Coverage gaps'}</p>
                    </td>
                </tr>
            </table>
        `
        : `
            <p>${isGreek
                ? 'Ανεβάστε τα ασφαλιστήρια σας για να δείτε τη σύνοψη κάλυψής σας.'
                : 'Upload your policies to see your coverage snapshot.'
            }</p>
        `

    const content = `
        <h2>${isGreek ? 'Η πρώτη σας εβδομάδα!' : 'Your first week!'}</h2>
        <p>${hello}</p>
        <p>${isGreek
            ? 'Έχει περάσει μία εβδομάδα από την εγγραφή σας. Ας δούμε πού βρίσκεστε:'
            : 'It\'s been one week since you signed up. Here\'s where you stand:'
        }</p>
        ${statsHtml}
        <a href="${APP_URL}/dashboard" class="button">${isGreek ? 'Άνοιγμα πίνακα ελέγχου' : 'Open your dashboard'}</a>
        ${stats && stats.gapCount > 0 ? `
            <p style="margin-top: 16px;">
                <span class="warning-badge">${isGreek
                    ? counted(stats.gapCount, 'κενό κάλυψης χρειάζεται προσοχή', 'κενά κάλυψης χρειάζονται προσοχή')
                    : counted(stats.gapCount, 'coverage gap needs attention', 'coverage gaps need attention')}</span>
            </p>
        ` : ''}
    `

    return {
        subject,
        html: getBaseEmailTemplate(content, language),
    }
}
