import { siteConfig, getSiteOrigin } from '@/lib/seo/site'

/**
 * The origin every email links back to.
 *
 * The fallback was `https://policywallet.com` — a domain the company does not
 * own. lib/seo/site.ts already carries the note that a .com address "is not a
 * mailbox we control"; that correction was applied to the public site and never
 * reached the emails, so with NEXT_PUBLIC_APP_URL unset every link in every
 * footer pointed off-property.
 */
function emailOrigin(): string {
    return (process.env.NEXT_PUBLIC_APP_URL || getSiteOrigin()).replace(/\/$/, '')
}

const FOOTER_COPY = {
    el: {
        rights: 'Με επιφύλαξη παντός δικαιώματος.',
        dashboard: 'Πίνακας ελέγχου',
        support: 'Υποστήριξη',
        privacy: 'Απόρρητο',
        preferences: 'Διαχείριση ειδοποιήσεων',
    },
    en: {
        rights: 'All rights reserved.',
        dashboard: 'Dashboard',
        support: 'Support',
        privacy: 'Privacy',
        preferences: 'Manage notifications',
    },
} as const

/**
 * Base email template with PolicyWallet branding.
 *
 * The preferences link is not decoration. The privacy policy states the lawful
 * basis for these emails as "consent, with an unsubscribe option in every
 * message" («με δυνατότητα απεγγραφής σε κάθε μήνυμα») — and no email carried
 * one. The NotificationPreference toggles already exist and every engagement
 * cron already honours them; nothing pointed a reader at them. Note this is a
 * link into the authenticated preferences screen, not a one-click opt-out: that
 * needs a signed unsubscribe token, and the product has no token-signing helper
 * to build it on yet.
 *
 * Footer links: "Visit Dashboard" pointed at the bare origin (the marketing
 * landing page) and "Support" at `/support`, a route that has never existed —
 * both shipped in the footer of every email the product sends.
 *
 * `language` drives both the footer copy and the document's `lang` attribute —
 * every email declared `lang="en"`, so a Greek renewal notice was announced to
 * screen readers, and hinted to translation prompts, as English.
 */
export function getBaseEmailTemplate(content: string, language: 'el' | 'en' = 'el'): string {
    const f = FOOTER_COPY[language]
    const origin = emailOrigin()
    return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PolicyWallet</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background-color: #F9FAFB;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: #29685B;
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 24px;
      color: #1F2937;
      line-height: 1.6;
    }
    .content h2 {
      color: #111827;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      margin: 16px 0;
      font-size: 16px;
    }
    .content ul {
      margin: 16px 0;
      padding-left: 24px;
    }
    .content li {
      margin: 8px 0;
    }
    .button {
      display: inline-block;
      background-color: #29685B;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #1C4E44;
    }
    .footer {
      background-color: #F3F4F6;
      padding: 24px;
      text-align: center;
      color: #6B7280;
      font-size: 14px;
      border-top: 1px solid #E5E7EB;
    }
    .footer a {
      color: #29685B;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #E5E7EB;
      margin: 24px 0;
    }
    .badge {
      display: inline-block;
      background-color: #DBEAFE;
      color: #1E40AF;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
    }
    .success-badge {
      background-color: #D1FAE5;
      color: #065F46;
    }
    .warning-badge {
      background-color: #FEF3C7;
      color: #92400E;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PolicyWallet</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>
        © ${new Date().getFullYear()} PolicyWallet. ${f.rights}
      </p>
      <p>
        <a href="${origin}/dashboard">${f.dashboard}</a> •
        <a href="${origin}/help">${f.support}</a> •
        <a href="${origin}/privacy">${f.privacy}</a>
      </p>
      <p>
        <a href="${origin}/account/notifications">${f.preferences}</a>
      </p>
      <p>
        <a href="mailto:${siteConfig.contactEmail}">${siteConfig.contactEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
