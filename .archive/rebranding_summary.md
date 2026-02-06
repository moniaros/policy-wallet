# Auth Pages Rebranding & Standardization

All authentication and related pages have been rebranded to the "Premium Emerald" design system. This ensures a consistent, high-quality dark mode aesthetic across the entire user journey, from initial landing to password recovery.

## Updated Pages

### 1. Sign In (`app/auth/signin/page.tsx`)
*   **Theme**: Dark Slate with Emerald/Teal accents.
*   **Key Changes**:
    *   Replaced Amber/Violet gradients with Emerald/Teal.
    *   Updated input focus rings to Emerald.
    *   Styled submit button with Emerald gradient.

### 2. Sign Up (`app/auth/signup/page.tsx`)
*   **Theme**: Dark Slate with Emerald/Teal accents.
*   **Key Changes**:
    *   Consistent background & blob animations.
    *   Role selection buttons (Policyholder/Agent) updated to Emerald/Teal.
    *   Agency details section aligned with Teal accent.

### 3. Forgot Password (`app/auth/forgot-password/page.tsx`)
*   **Theme**: Dark Slate with Emerald/Teal accents.
*   **Key Changes**:
    *   Updated background and blobbies.
    *   Lock icon and success states updated to Emerald/Green.
    *   Input fields and buttons match Sign In style.

### 4. Verify Email (`app/auth/verify-email/page.tsx`)
*   **Theme**: Converted from Light Mode to Dark Slate (consistent with other auth pages).
*   **Key Changes**:
    *   Complete structural update to match generic Auth Layout.
    *   Added Emerald/Teal background blobs.
    *   Updated success/error states to use Emerald/Red on Dark background.

### 5. Auth Error (`app/auth/auth-code-error/page.tsx`)
*   **Theme**: Dark Slate with Red/Emerald accents.
*   **Key Changes**:
    *   Beautified the basic error page.
    *   Added animated background blobs (Red/Emerald).
    *   Styled "Return to Sign In" button.

### 6. Handover / Deep Link (`app/auth/handover/page.tsx`)
*   **Theme**: Dark Slate.
*   **Key Changes**:
    *   Updated from Light Mode to Dark Mode.
    *   Buttons and Icons updated to Emerald/Teal.
    *   Improved mobile vs desktop visual hierarchy.

### 7. Reset Password (`app/auth/reset-password/page.tsx`)
*   **Status**: **Newly Created**.
*   **Theme**: Dark Slate with Emerald/Teal accents.
*   **Functionality**:
    *   Allows users to set a new password after clicking the reset link.
    *   Integrated with Supabase `updateUser`.
    *   Consistent validation and feedback UI.

## Additional Updates

### Policy Details (`app/(protected)/wallet/[id]/PolicyDetailsClient.tsx`)
*   **Theme**: Updated "Indigo/Violet" styling to "Emerald/Teal" to ensure consistency with the dashboard and auth pages.
*   **Key Changes**:
    *   Hero section gradients updated.
    *   Icon colors and hover states aligned with the Emerald theme.
    *   Ensured "Premium" feel is maintained.

### Global Styles (`app/globals.css`)
*   Confirmed `primary` color is `#10b981` (Emerald-500).
*   Confirmed `secondary` color is `#f59e0b` (Amber-500).
*   Dark mode colors aligned with `slate-950` background.
