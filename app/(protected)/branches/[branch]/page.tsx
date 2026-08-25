export const runtime = 'nodejs'

import { BranchDetail } from "@/components/branches/BranchDetail"

/**
 * The pre-§4.2 mount of the branch detail. Content lives in BranchDetail
 * (extracted in V2-P2-01 so /protection/[branch] shares it); this route is
 * removed by V2-P2-03 together with /branches.
 */
export default async function BranchPage({ params }: { params: Promise<{ branch: string }> }) {
    const { branch } = await params
    return <BranchDetail branchParam={branch} origin="branches" />
}
