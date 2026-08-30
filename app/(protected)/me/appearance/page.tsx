export const runtime = "nodejs"

import { AppearanceSection } from "./AppearanceSection"

/** /me/appearance — theme and language. The dark theme is a real second theme (§4), not an afterthought. */
export default function AppearancePage() {
    return <AppearanceSection />
}
