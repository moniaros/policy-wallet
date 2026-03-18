import { createClient } from "@/lib/supabase/server"
import { createApiResponse, createApiError } from "@/lib/api-utils"

import { logger } from "@/lib/logger"
import { withApiGuard } from "@/lib/api-guard"

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
    },
    async () => {
        try {
            const supabase = await createClient()
            await supabase.auth.signOut()

            return createApiResponse({ message: "Logged out successfully" })
        } catch (error) {
            logger('error', 'Logout failed', { error })
            return createApiError("INTERNAL_ERROR", "Logout failed", 500)
        }
    }
)
