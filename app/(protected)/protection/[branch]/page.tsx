export const runtime = 'nodejs'

import { BranchDetail } from "@/components/branches/BranchDetail"

/**
 * A line of business inside «Η προστασία μου» (§4.2) — the destination of
 * B-04 ("open a line to see what you hold") on the ανά κλάδο lens. Same
 * content as the removed legacy /branches/[branch] mount, via BranchDetail.
 */
export default async function ProtectionBranchPage({ params }: { params: Promise<{ branch: string }> }) {
    const { branch } = await params
    return <BranchDetail branchParam={branch} />
}
