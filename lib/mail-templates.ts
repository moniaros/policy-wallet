export type EmailTemplateData = {
    title: string;
    description: string;
    actionUrl?: string;
    actionLabel?: string;
    footerText?: string;
};

export function getBaseTemplate({ title, description, actionUrl, actionLabel, footerText }: EmailTemplateData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { margin-bottom: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #0d9488; text-decoration: none; }
        .content { background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb; }
        h1 { font-size: 22px; font-weight: 700; color: #111; margin-top: 0; }
        p { margin-bottom: 24px; color: #4b5563; }
        .button { display: inline-block; background-color: #0d9488; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; }
        .footer { margin-top: 30px; text-align: center; font-size: 14px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="https://policywallet.gr" class="logo">PolicyWallet</a>
        </div>
        <div class="content">
            <h1>${title}</h1>
            <p>${description}</p>
            ${actionUrl && actionLabel ? `
            <div style="text-align: center; margin-top: 32px;">
                <a href="${actionUrl}" class="button">${actionLabel}</a>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <p>${footerText || '© 2024 PolicyWallet. All rights reserved.'}</p>
        </div>
    </div>
</body>
</html>
    `;
}

export const templates = {
    GAP_DETECTED: (data: { policyName: string, gapTitle: string, url: string }) => ({
        subject: `Security Alert: Coverage Gap Detected in ${data.policyName}`,
        html: getBaseTemplate({
            title: 'Coverage Gap Detected',
            description: `Our AI has identified a potential coverage gap in your <strong>${data.policyName}</strong> policy: <strong>${data.gapTitle}</strong>. Review this now to ensure you are fully protected.`,
            actionUrl: data.url,
            actionLabel: 'View Details & Recommendations'
        })
    }),
    PAYMENT_SUCCESS: (data: { amount: string, invoiceUrl: string }) => ({
        subject: `Payment Successful: ${data.amount}`,
        html: getBaseTemplate({
            title: 'Payment Successful',
            description: `We've successfully processed your payment of ${data.amount}. Your insurance wallet remains active and protected.`,
            actionUrl: data.invoiceUrl,
            actionLabel: 'Download Invoice'
        })
    }),
    POLICY_EXPIRING: (data: { policyName: string, daysLeft: number, expiryDate: string, url: string }) => ({
        subject: `Renewal Reminder: ${data.policyName} expires in ${data.daysLeft} days`,
        html: getBaseTemplate({
            title: `Your policy expires in ${data.daysLeft} days`,
            description: `Your <strong>${data.policyName}</strong> policy expires on <strong>${data.expiryDate}</strong>. Review your renewal options now to ensure continuous coverage.`,
            actionUrl: data.url,
            actionLabel: 'Review Policy',
        })
    }),
    RENEWAL_MILESTONE: (data: { customerName: string, policyName: string, daysLeft: number, expiryDate: string, url: string }) => ({
        subject: `Renewal Alert: ${data.customerName} — ${data.policyName} (${data.daysLeft} days)`,
        html: getBaseTemplate({
            title: `Renewal action needed — ${data.daysLeft} days`,
            description: `<strong>${data.customerName}</strong>'s <strong>${data.policyName}</strong> policy expires on <strong>${data.expiryDate}</strong>. Contact the customer to discuss renewal options and secure the commission.`,
            actionUrl: data.url,
            actionLabel: 'Manage Renewal',
        })
    }),
};
