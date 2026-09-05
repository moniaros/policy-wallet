import { getBaseEmailTemplate } from './base-template'
import { counted, daysToExpiryPhrase, greeting } from './phrases'
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { displayInsurerName } from '@/lib/wallet/policy-identity'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.gr'

interface TopRecommendation {
    title: string
    urgency: string
    estimatedCostEur: number | null
    /** F5: the law/article behind a classified requirement; null when under review or not gap-derived. */
    citation?: string | null
}

interface WeeklyDigestData {
    renewingSoon: { insurerName: string; lineOfBusiness: string; daysUntilExpiry: number }[]
    newGaps: number
    unreadMessages: number
    /** Top 3 active recommendations for behavioral nudge */
    topRecommendations?: TopRecommendation[]
    /** Profile completeness 0-100 */
    profileCompleteness?: number
}

/**
 * Weekly Monday digest email with policy overview.
 */
export function getWeeklyDigestEmail(
    language: 'el' | 'en',
    name: string | undefined,
    data: WeeklyDigestData
): { subject: string; html: string } {
    const isGreek = language === 'el'
    const hello = greeting(name, isGreek)

    const subject = isGreek
        ? 'Η εβδομαδιαία σας σύνοψη PolicyWallet'
        : 'Your weekly PolicyWallet summary'

    // Renewals section
    const renewalsHtml = data.renewingSoon.length > 0
        ? `
            <h3 style="margin-bottom: 8px; font-size: 16px; color: #111827;">
                ${isGreek ? 'Ανανεώσεις εντός 30 ημερών' : 'Renewals within 30 days'}
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                ${data.renewingSoon.map(r => `
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                        <td style="padding: 8px 0; font-size: 14px; color: #374151;">${displayInsurerName(r.insurerName, normalizeBranch(r.lineOfBusiness).label[language])}</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">${normalizeBranch(r.lineOfBusiness).label[language]}</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: ${r.daysUntilExpiry <= 7 ? '#DC2626' : r.daysUntilExpiry <= 14 ? '#D97706' : '#059669'}; text-align: right;">
                            ${daysToExpiryPhrase(r.daysUntilExpiry, isGreek)}
                        </td>
                    </tr>
                `).join('')}
            </table>
        `
        : ''

    // There is no protection score here — and no trend line. The score tile
    // ("Βαθμολογία προστασίας: N%") emailed a perfect 100 to portfolios nobody
    // had ever analysed, because the provisional fallback deducted from 100
    // per DETECTED gap and an unread portfolio has none. The score was removed
    // from the product in Aug 2026 (PW-MOBILE-TRANSFORM-01, halt H-001); this
    // digest states counts of things that happened, which cannot be a verdict.

    // Alerts section
    const alertItems: string[] = []
    if (data.newGaps > 0) {
        alertItems.push(isGreek
            ? counted(data.newGaps, 'νέο κενό κάλυψης εντοπίστηκε', 'νέα κενά κάλυψης εντοπίστηκαν')
            : counted(data.newGaps, 'new coverage gap detected', 'new coverage gaps detected'))
    }
    if (data.unreadMessages > 0) {
        alertItems.push(isGreek
            ? counted(data.unreadMessages, 'αδιάβαστο μήνυμα', 'αδιάβαστα μηνύματα')
            : counted(data.unreadMessages, 'unread message', 'unread messages'))
    }

    const alertsHtml = alertItems.length > 0
        ? `
            <div style="background: #FEF3C7; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
                ${alertItems.map(a => `<p style="margin: 4px 0; font-size: 14px; color: #92400E;">${a}</p>`).join('')}
            </div>
        `
        : ''

    const content = `
        <h2>${isGreek ? 'Εβδομαδιαία σύνοψη' : 'Weekly summary'}</h2>
        <p>${hello}</p>
        <p>${isGreek
            ? 'Ακολουθεί η σύνοψη της εβδομάδας σας.'
            : 'Here\'s your weekly overview.'
        }</p>

        ${alertsHtml}
        ${renewalsHtml}
        ${buildRecommendationsSection(data.topRecommendations, isGreek)}
        ${buildProfileNudge(data.profileCompleteness, isGreek)}

        <a href="${APP_URL}/dashboard" class="button">${isGreek ? 'Άνοιγμα πίνακα ελέγχου' : 'Open your dashboard'}</a>

        <div class="divider"></div>
        <p style="color: #9CA3AF; font-size: 12px;">
            ${isGreek
                ? 'Λαμβάνετε αυτό το email κάθε Δευτέρα.'
                : 'You receive this email every Monday.'
            }
        </p>
    `

    return {
        subject,
        html: getBaseEmailTemplate(content, language),
    }
}

function buildRecommendationsSection(recs: TopRecommendation[] | undefined, isGreek: boolean): string {
    if (!recs || recs.length === 0) return ''

    // No urgency dot: severity carries no colour, order or emphasis anywhere
    // (PW-TRANSPARENCY-02 B1). The rows are the recommendations, in the order given.
    const rows = recs.map(r => {
        const costLabel = r.estimatedCostEur
            ? `~€${r.estimatedCostEur}/${isGreek ? 'έτος' : 'yr'}`
            : ''
        return `
            <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 8px 0;">
                    <span style="font-size: 14px; color: #374151;">${r.title}</span>
                    ${r.citation ? `<br><span data-fact="gap.citation" style="font-size: 12px; color: #6B7280;">${r.citation}</span>` : ''}
                </td>
                <td style="padding: 8px 0; font-size: 13px; color: #059669; text-align: right; font-weight: 600;">${costLabel}</td>
            </tr>
        `
    }).join('')

    return `
        <h3 style="margin-bottom: 8px; font-size: 16px; color: #111827;">
            ${isGreek ? '💡 Προτάσεις Κάλυψης' : '💡 Coverage Recommendations'}
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            ${rows}
        </table>
        <a href="${APP_URL}/protection" style="font-size: 13px; color: #059669; text-decoration: underline;">
            ${isGreek ? 'Δείτε όλες τις προτάσεις →' : 'View all recommendations →'}
        </a>
        <div style="height: 24px;"></div>
    `
}

function buildProfileNudge(completeness: number | undefined, isGreek: boolean): string {
    if (completeness === undefined || completeness >= 80) return ''

    return `
        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 14px; color: #92400E; font-weight: 600;">
                ${isGreek ? '📝 Ολοκληρώστε το Προφίλ σας' : '📝 Complete Your Profile'}
            </p>
            <p style="margin: 0; font-size: 13px; color: #92400E;">
                ${isGreek
                    ? `Το προφίλ κινδύνου σας είναι ${completeness}% ολοκληρωμένο. Συμπληρώστε τα πεδία που λείπουν για ακριβέστερες προτάσεις κάλυψης.`
                    : `Your risk profile is ${completeness}% complete. Fill in missing fields for more accurate coverage recommendations.`
                }
            </p>
            <a href="${APP_URL}/account" style="display: inline-block; margin-top: 8px; font-size: 13px; color: #059669; text-decoration: underline;">
                ${isGreek ? 'Ενημέρωση προφίλ →' : 'Update profile →'}
            </a>
        </div>
    `
}
