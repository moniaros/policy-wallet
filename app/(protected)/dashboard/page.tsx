export const runtime = 'nodejs'

import { getDashboardData } from "../agent/actions"
import { getActivityFeed } from "../activity/actions"
import { DashboardClient } from "./DashboardClient"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db as prisma } from "@/lib/db"

export default async function DashboardPage() {
    const { dbUser } = await getAuthenticatedUser()

    const data = await getDashboardData()
    if (!data) {
        return <div>Access Denied. Agent credentials required.</div>
    }

    const agentId = dbUser.id

    // 1. totalPolicies & totalPremium
    const policies = await prisma.policy.findMany({
        where: { createdByUserId: agentId },
        select: { premiumAmount: true }
    })
    const totalPolicies = policies.length
    const totalPremium = policies.reduce((sum: number, p: any) => sum + Number(p.premiumAmount || 0), 0)

    // 2. monthlyGrowth
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const customersNow = await prisma.customerRelationship.count({
        where: { agentUserId: agentId }
    })
    const customersBefore = await prisma.customerRelationship.count({
        where: { agentUserId: agentId, createdAt: { lt: thirtyDaysAgo } }
    })
    const newCustomers = customersNow - customersBefore
    const monthlyGrowth = customersBefore === 0 
        ? (newCustomers > 0 ? 100 : 0) 
        : Math.round((newCustomers / customersBefore) * 100)

    // 3. conversionRate
    const opportunities = await prisma.opportunity.findMany({
        where: { ownerAgentUserId: agentId },
        select: { status: true }
    })
    const totalOps = opportunities.length
    const wonOps = opportunities.filter((o: any) => o.status === 'won').length
    const conversionRate = totalOps === 0 ? 0 : Math.round((wonOps / totalOps) * 100)

    // 4. real activity feed
    const feed = await getActivityFeed(10)
    const recentActivity = feed.map(f => {
        let type = "policy_added"
        if (f.type.includes("join") || f.type.includes("invite") || f.type.includes("questionnaire")) type = "customer_invited"
        if (f.type.includes("renewal") || f.type.includes("updated")) type = "renewal_completed"
        if (f.type.includes("claim") || f.type.includes("won") || f.type.includes("lost")) type = "claim_filed"

        return {
            id: f.id,
            type: type as any,
            customerName: f.customerName || 'System',
            timestamp: f.timestamp.toISOString(),
            details: (f.title as any).en || (typeof f.title === 'string' ? f.title : 'Action recorded')
        }
    })

    const stats = {
        totalCustomers: customersNow,
        activeCustomers: data.summary.activated || 0,
        invitedCustomers: data.summary.invited || 0,
        inactiveCustomers: data.summary.inactive || 0,
        totalPolicies,
        totalPremium,
        monthlyGrowth,
        conversionRate
    }

    const priorities = (data.priorities || []).map(p => ({
        id: p.id || Math.random().toString(),
        type: p.type === 'follow_up' ? 'follow_up' : 
              p.type === 'open_opportunity' ? 'opportunity' : 'renewal',
        customerName: p.customerName || 'Customer',
        description: p.message || 'Action required',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        priority: p.priority > 3 ? 'high' : p.priority > 1 ? 'medium' : 'low'
    }))

    return (
        <DashboardClient
            stats={stats}
            priorities={priorities as any}
            recentActivity={recentActivity}
            isEmailVerified={!!dbUser.emailVerified}
            userEmail={dbUser.email}
        />
    )
}
