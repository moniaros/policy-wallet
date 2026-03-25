import { getBaseEmailTemplate } from './base-template'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.gr'

interface WeeklyDigestData {
    renewingSoon: { insurerName: string; lineOfBusiness: string; daysUntilExpiry: number }[]
    newGaps: number
    unreadMessages: number
    healthScoreChange: number // positive = improved, negative = declined
    healthScore: number
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
    const greeting = name
        ? (isGreek ? `Γεια σου ${name},` : `Hi ${name},`)
        : (isGreek ? 'Γεια σου,' : 'Hi there,')

    const subject = isGreek
        ? '📋 Εβδομαδιαία σύνοψη PolicyWallet'
        : '📋 Your Weekly PolicyWallet Digest'

    // Renewals section
    const renewalsHtml = data.renewingSoon.length > 0
        ? `
            <h3 style="margin-bottom: 8px; font-size: 16px; color: #111827;">
                ${isGreek ? '⏰ Ανανεώσεις σε 30 ημέρες' : '⏰ Renewals within 30 days'}
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                ${data.renewingSoon.map(r => `
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                        <td style="padding: 8px 0; font-size: 14px; color: #374151;">${r.insurerName}</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">${r.lineOfBusiness}</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: ${r.daysUntilExpiry <= 7 ? '#DC2626' : r.daysUntilExpiry <= 14 ? '#D97706' : '#059669'}; text-align: right;">
                            ${r.daysUntilExpiry} ${isGreek ? 'ημ.' : 'days'}
                        </td>
                    </tr>
                `).join('')}
            </table>
        `
        : ''

    // Health score section
    const healthTrend = data.healthScoreChange > 0
        ? `<span style="color: #059669;">↑ +${data.healthScoreChange}%</span>`
        : data.healthScoreChange < 0
            ? `<span style="color: #DC2626;">↓ ${data.healthScoreChange}%</span>`
            : `<span style="color: #6B7280;">— ${isGreek ? 'Σταθερό' : 'Stable'}</span>`

    // Alerts section
    const alertItems: string[] = []
    if (data.newGaps > 0) {
        alertItems.push(isGreek
            ? `🔍 ${data.newGaps} νέα κενά κάλυψης εντοπίστηκαν`
            : `🔍 ${data.newGaps} new coverage gaps detected`)
    }
    if (data.unreadMessages > 0) {
        alertItems.push(isGreek
            ? `💬 ${data.unreadMessages} αδιάβαστα μηνύματα`
            : `💬 ${data.unreadMessages} unread messages`)
    }

    const alertsHtml = alertItems.length > 0
        ? `
            <div style="background: #FEF3C7; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
                ${alertItems.map(a => `<p style="margin: 4px 0; font-size: 14px; color: #92400E;">${a}</p>`).join('')}
            </div>
        `
        : ''

    const content = `
        <h2>${isGreek ? 'Εβδομαδιαία Σύνοψη' : 'Weekly Digest'}</h2>
        <p>${greeting}</p>
        <p>${isGreek
            ? 'Ακολουθεί η σύνοψη της εβδομάδας σας.'
            : 'Here\'s your weekly overview.'
        }</p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr>
                <td style="text-align: center; padding: 16px; background: #F0FDF4; border-radius: 8px;">
                    <p style="font-size: 32px; font-weight: bold; margin: 0; color: #111827;">${data.healthScore}%</p>
                    <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0;">${isGreek ? 'Υγεία Κάλυψης' : 'Coverage Health'}</p>
                    <p style="font-size: 12px; margin: 4px 0 0;">${healthTrend}</p>
                </td>
            </tr>
        </table>

        ${alertsHtml}
        ${renewalsHtml}

        <a href="${APP_URL}/home" class="button">${isGreek ? 'Δείτε το Dashboard' : 'View Dashboard'}</a>

        <div class="divider"></div>
        <p style="color: #9CA3AF; font-size: 12px;">
            ${isGreek
                ? 'Λαμβάνετε αυτό το email κάθε Δευτέρα. Διαχείριση προτιμήσεων στις Ρυθμίσεις.'
                : 'You receive this email every Monday. Manage preferences in Settings.'
            }
        </p>
    `

    return {
        subject,
        html: getBaseEmailTemplate(content),
    }
}
