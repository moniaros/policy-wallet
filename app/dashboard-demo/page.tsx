"use client"

import { UserDashboard } from '@/components/dashboard/UserDashboard'
import {
    Shield,
    FileText,
    Users,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Download,
    Plus,
    BarChart3,
    Target,
    Zap,
    DollarSign,
    Calendar
} from 'lucide-react'

export default function DashboardDemoPage() {
    // Mock data for policyholder
    const policyholderData = {
        user: {
            name: 'Maria Kowalski',
            role: 'policyholder' as const,
            avatarUrl: ''
        },
        stats: {
            primary: {
                label: 'Total Coverage',
                value: '€450K',
                trend: 12,
                icon: <Shield className="w-6 h-6" />
            },
            secondary: [
                { label: 'Active Policies', value: '8', icon: <FileText className="w-4 h-4" /> },
                { label: 'Expiring Soon', value: '2', icon: <Clock className="w-4 h-4" /> },
                { label: 'Claims Filed', value: '1', icon: <CheckCircle2 className="w-4 h-4" /> },
                { label: 'Annual Premium', value: '€12.5K', icon: <DollarSign className="w-4 h-4" /> }
            ]
        },
        quickActions: [
            {
                id: '1',
                label: 'Add Policy',
                href: '/wallet/add',
                icon: <Plus className="w-6 h-6" />,
                variant: 'primary' as const
            },
            {
                id: '2',
                label: 'File Claim',
                href: '/claims/new',
                icon: <AlertTriangle className="w-6 h-6" />,
                variant: 'warning' as const
            },
            {
                id: '3',
                label: 'View Coverage',
                href: '/coverage-insights',
                icon: <BarChart3 className="w-6 h-6" />,
                variant: 'secondary' as const
            },
            {
                id: '4',
                label: 'Download All',
                href: '/wallet?action=download',
                icon: <Download className="w-6 h-6" />,
                variant: 'secondary' as const
            }
        ],
        recentActivity: [
            {
                id: '1',
                type: 'policy_added',
                title: 'New Policy Added',
                description: 'Home Insurance - AXA (POL-2024-789)',
                timestamp: '2 hours ago',
                icon: <FileText className="w-5 h-5" />,
                status: 'success' as const
            },
            {
                id: '2',
                type: 'renewal_reminder',
                title: 'Renewal Reminder',
                description: 'Motor Insurance expires in 14 days',
                timestamp: '1 day ago',
                icon: <Clock className="w-5 h-5" />,
                status: 'warning' as const
            },
            {
                id: '3',
                type: 'document_downloaded',
                title: 'Document Downloaded',
                description: 'Policy Schedule - Health Insurance',
                timestamp: '3 days ago',
                icon: <Download className="w-5 h-5" />,
                status: 'info' as const
            },
            {
                id: '4',
                type: 'claim_approved',
                title: 'Claim Approved',
                description: 'Motor claim #CLM-2024-001 - €850',
                timestamp: '5 days ago',
                icon: <CheckCircle2 className="w-5 h-5" />,
                status: 'success' as const
            }
        ],
        alerts: [
            {
                id: '1',
                severity: 'warning' as const,
                title: 'Policy Renewal Due',
                message: 'Your Motor Insurance policy expires on Feb 14, 2024. Renew now to avoid coverage gaps.',
                actionLabel: 'Renew Now',
                actionHref: '/wallet/pol_2?action=renew'
            }
        ],
        insights: [
            {
                id: '1',
                title: 'Coverage Gap Detected',
                description: 'Your home insurance may not fully cover recent property value increases. Consider reviewing your coverage limits.',
                metric: '+40% value',
                icon: <Target className="w-5 h-5" />
            },
            {
                id: '2',
                title: 'Premium Savings Opportunity',
                description: 'Bundling your motor and home insurance could save you up to €450 annually.',
                metric: '€450/year',
                icon: <TrendingUp className="w-5 h-5" />
            },
            {
                id: '3',
                title: 'Document Expiring',
                description: 'Your driver\'s license expires in 3 months. Update it to avoid policy issues.',
                icon: <Calendar className="w-5 h-5" />
            }
        ]
    }

    // Mock data for agent
    const agentData = {
        user: {
            name: 'John Smith',
            role: 'agent' as const,
            avatarUrl: ''
        },
        stats: {
            primary: {
                label: 'Monthly Revenue',
                value: '€45.2K',
                trend: 18,
                icon: <DollarSign className="w-6 h-6" />
            },
            secondary: [
                { label: 'Active Customers', value: '248', icon: <Users className="w-4 h-4" /> },
                { label: 'Policies Sold', value: '1,234', icon: <FileText className="w-4 h-4" /> },
                { label: 'Pending Quotes', value: '12', icon: <Clock className="w-4 h-4" /> },
                { label: 'Conversion Rate', value: '68%', icon: <Target className="w-4 h-4" /> }
            ]
        },
        quickActions: [
            {
                id: '1',
                label: 'New Customer',
                href: '/customers/new',
                icon: <Plus className="w-6 h-6" />,
                variant: 'primary' as const
            },
            {
                id: '2',
                label: 'Create Quote',
                href: '/quotes/new',
                icon: <FileText className="w-6 h-6" />,
                variant: 'success' as const
            },
            {
                id: '3',
                label: 'View Pipeline',
                href: '/opportunities',
                icon: <TrendingUp className="w-6 h-6" />,
                variant: 'secondary' as const
            },
            {
                id: '4',
                label: 'Analytics',
                href: '/analytics',
                icon: <BarChart3 className="w-6 h-6" />,
                variant: 'secondary' as const
            }
        ],
        recentActivity: [
            {
                id: '1',
                type: 'policy_sold',
                title: 'Policy Sold',
                description: 'Maria Kowalski - Home Insurance €3,400',
                timestamp: '1 hour ago',
                icon: <CheckCircle2 className="w-5 h-5" />,
                status: 'success' as const
            },
            {
                id: '2',
                type: 'quote_sent',
                title: 'Quote Sent',
                description: 'Anna Johnson - Motor Insurance €1,250',
                timestamp: '3 hours ago',
                icon: <FileText className="w-5 h-5" />,
                status: 'info' as const
            },
            {
                id: '3',
                type: 'follow_up',
                title: 'Follow-up Required',
                description: 'David Lee - Cyber Insurance quote expires tomorrow',
                timestamp: '5 hours ago',
                icon: <Clock className="w-5 h-5" />,
                status: 'warning' as const
            },
            {
                id: '4',
                type: 'customer_added',
                title: 'New Customer',
                description: 'Sarah Miller added to your portfolio',
                timestamp: '1 day ago',
                icon: <Users className="w-5 h-5" />,
                status: 'success' as const
            }
        ],
        alerts: [
            {
                id: '1',
                severity: 'critical' as const,
                title: 'Urgent: Policy Renewal',
                message: '3 customer policies expire this week. Contact them immediately to avoid lapses.',
                actionLabel: 'View List',
                actionHref: '/renewals'
            },
            {
                id: '2',
                severity: 'info' as const,
                title: 'Training Available',
                message: 'New product training for Cyber Insurance starts Feb 10. Register now.',
                actionLabel: 'Register',
                actionHref: '/training'
            }
        ],
        insights: [
            {
                id: '1',
                title: 'Top Performer',
                description: 'You\'re in the top 10% of agents this month. Keep up the great work!',
                metric: 'Top 10%',
                icon: <TrendingUp className="w-5 h-5" />
            },
            {
                id: '2',
                title: 'Cross-Sell Opportunity',
                description: '15 customers have only motor insurance. They may need home coverage too.',
                metric: '15 leads',
                icon: <Target className="w-5 h-5" />
            },
            {
                id: '3',
                title: 'Quote Conversion',
                description: 'Your quote-to-policy conversion rate is 12% above average.',
                metric: '+12%',
                icon: <Zap className="w-5 h-5" />
            }
        ]
    }

    // Toggle between roles (for demo purposes)
    const [role, setRole] = React.useState<'policyholder' | 'agent'>('policyholder')
    const data = role === 'policyholder' ? policyholderData : agentData

    return (
        <div>
            {/* Role Toggle (Demo Only) */}
            <div className="fixed top-4 right-4 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-2 flex gap-2">
                <button
                    onClick={() => setRole('policyholder')}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${role === 'policyholder'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                >
                    Policyholder
                </button>
                <button
                    onClick={() => setRole('agent')}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${role === 'agent'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                >
                    Agent
                </button>
            </div>

            <UserDashboard {...data} />
        </div>
    )
}
