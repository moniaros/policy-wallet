import { siteConfig, getSiteOrigin } from '@/lib/seo/site'

/**
 * `support@policywallet.com` and `https://policywallet.com` are not addresses
 * this company controls — the product is policywallet.gr, and lib/seo/site.ts
 * already records that a .com contact "is not a mailbox we control". That
 * correction reached the public site and stopped there. Here it meant a
 * REJECTED agent applicant — the reader most likely to need a reply — was given
 * a dead mailbox as their only route back.
 */
function agentEmailOrigin(): string {
    return (process.env.NEXT_PUBLIC_APP_URL || getSiteOrigin()).replace(/\/$/, '')
}

import { getBaseEmailTemplate } from './base-template'

export interface AgentApprovalEmailData {
    agentName: string
    agentEmail: string
    agencyName?: string
}

export interface AgentRejectionEmailData {
    agentName: string
    reason: string
}

/**
 * Generate agent approval email
 */
export function getAgentApprovalEmail(data: AgentApprovalEmailData) {
    const { agentName, agencyName } = data

    const content = `
    <h2>🎉 Welcome to PolicyWallet!</h2>
    
    <p>Dear ${agentName},</p>
    
    <p>
      Great news! Your agent application has been <span class="badge success-badge">Approved</span>.
    </p>
    
    ${agencyName ? `<p>Your agency <strong>${agencyName}</strong> is now registered in our system.</p>` : ''}
    
    <p>As a verified PolicyWallet agent, you can now:</p>
    
    <ul>
      <li><strong>Add and manage customers</strong> - Build your client portfolio</li>
      <li><strong>View customer policies</strong> - Access comprehensive policy information</li>
      <li><strong>Analyze coverage gaps</strong> - AI-powered gap detection for your clients</li>
      <li><strong>Send questionnaires</strong> - Collect customer information efficiently</li>
      <li><strong>Track customer relationships</strong> - Manage your book of business</li>
    </ul>
    
    <div class="divider"></div>
    
    <h3>Getting Started</h3>
    
    <p>Here are your next steps:</p>
    
    <ol>
      <li>Log in to your agent dashboard</li>
      <li>Complete your profile information</li>
      <li>Add your first customer</li>
      <li>Explore the gap analysis tools</li>
    </ol>
    
    <a href="${agentEmailOrigin()}/agent/dashboard" class="button">
      Go to Agent Dashboard →
    </a>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: #6B7280;">
      If you have any questions or need assistance, our support team is here to help at 
      <a href="mailto:${siteConfig.contactEmail}">${siteConfig.contactEmail}</a>
    </p>
  `

    return {
        subject: '🎉 Your PolicyWallet Agent Application Has Been Approved!',
        // These three are English-only — admin-triggered, no language on the
        // recipient at this call site. Declared explicitly so the base template's
        // Greek default does not mislabel them.
        html: getBaseEmailTemplate(content, 'en'),
        text: `Welcome to PolicyWallet, ${agentName}! Your agent application has been approved. You can now access your agent dashboard at ${agentEmailOrigin()}/agent/dashboard`
    }
}

/**
 * Generate agent rejection email
 */
export function getAgentRejectionEmail(data: AgentRejectionEmailData) {
    const { agentName, reason } = data

    const content = `
    <h2>Update on Your Agent Application</h2>
    
    <p>Dear ${agentName},</p>
    
    <p>
      Thank you for your interest in becoming a PolicyWallet agent.
    </p>
    
    <p>
      After careful review, we are unable to approve your application at this time.
    </p>
    
    <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 600; color: #92400E;">Reason for Rejection:</p>
      <p style="margin: 8px 0 0 0; color: #78350F;">${reason}</p>
    </div>
    
    <p>
      If you believe this decision was made in error or if you have additional information to provide, 
      please don't hesitate to contact our support team.
    </p>
    
    <div class="divider"></div>
    
    <h3>What's Next?</h3>
    
    <p>You have the following options:</p>
    
    <ul>
      <li><strong>Contact Support</strong> - Reach out to discuss your application</li>
      <li><strong>Reapply</strong> - Submit a new application after addressing the concerns</li>
      <li><strong>Use as Policyholder</strong> - Continue using PolicyWallet for personal insurance management</li>
    </ul>
    
    <a href="mailto:${siteConfig.contactEmail}?subject=Agent Application - ${agentName}" class="button">
      Contact Support
    </a>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: #6B7280;">
      We appreciate your interest in PolicyWallet and hope to work with you in the future.
    </p>
  `

    return {
        subject: 'Update on Your PolicyWallet Agent Application',
        // These three are English-only — admin-triggered, no language on the
        // recipient at this call site. Declared explicitly so the base template's
        // Greek default does not mislabel them.
        html: getBaseEmailTemplate(content, 'en'),
        text: `Dear ${agentName}, thank you for your interest in becoming a PolicyWallet agent. Unfortunately, we are unable to approve your application at this time. Reason: ${reason}. Please contact ${siteConfig.contactEmail} if you have questions.`
    }
}

/**
 * Generate welcome email for new agents (can be used separately or with approval)
 */
export function getAgentWelcomeEmail(agentName: string) {
    const content = `
    <h2>Welcome to the PolicyWallet Agent Network!</h2>
    
    <p>Hi ${agentName},</p>
    
    <p>
      We're excited to have you join our growing network of insurance professionals.
    </p>
    
    <h3>Quick Start Guide</h3>
    
    <div style="background-color: #F0FDFA; border: 1px solid #29685B; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0;"><strong>1. Complete Your Profile</strong></p>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #6B7280;">
        Add your professional details, certifications, and areas of expertise
      </p>
      
      <p style="margin: 0 0 12px 0;"><strong>2. Add Your First Customer</strong></p>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #6B7280;">
        Import existing clients or invite new ones to join PolicyWallet
      </p>
      
      <p style="margin: 0 0 12px 0;"><strong>3. Explore Gap Analysis</strong></p>
      <p style="margin: 0 0 0 0; font-size: 14px; color: #6B7280;">
        Use our AI-powered tools to identify coverage gaps for your clients
      </p>
    </div>
    
    <a href="${agentEmailOrigin()}/agent/onboarding" class="button">
      Start Onboarding →
    </a>
    
    <p style="margin-top: 32px;">
      Looking forward to seeing you succeed!
    </p>
  `

    return {
        subject: 'Welcome to PolicyWallet - Let\'s Get Started!',
        // These three are English-only — admin-triggered, no language on the
        // recipient at this call site. Declared explicitly so the base template's
        // Greek default does not mislabel them.
        html: getBaseEmailTemplate(content, 'en'),
        text: `Welcome to PolicyWallet, ${agentName}! We're excited to have you join our network. Get started at ${agentEmailOrigin()}/agent/onboarding`
    }
}
