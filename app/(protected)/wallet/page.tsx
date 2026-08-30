export const runtime = "nodejs"

import { redirect } from "next/navigation"

/** /wallet → /policies (Grafí G8). Proxy 301 first; page redirect second. /wallet/add keeps serving until G12. */
export default function WalletPage() {
    redirect("/policies")
}
