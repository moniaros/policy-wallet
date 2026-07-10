/**
 * Base email template with PolicyWallet branding
 */
export function getBaseEmailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
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
        © ${new Date().getFullYear()} PolicyWallet. All rights reserved.
      </p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.com'}">Visit Dashboard</a> •
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.com'}/support">Support</a> •
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://policywallet.com'}/privacy">Privacy</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
