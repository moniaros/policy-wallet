# Collaboration & Sharing Features

## Overview
The collaboration experience has been completely overhauled to support seamless sharing between policyholders and agents. The new system includes a dedicated `CollaborationPanel` for managing access, improved mobile experience with swipeable tabs, and visual indicators throughout the app.

## Key Components

### 1. Collaboration Panel (`components/wallet/CollaborationPanel.tsx`)
- **Centralized Hub**: Manages all sharing aspects.
- **Permission Control**: Assign 'View Only' or 'Can Edit' permissions.
- **Visual Feedback**: Real-time updates, loading states, and success toasts.
- **Activity Timeline**: Shows "granted at" timestamps with relative time formatting.
- **Invitation Flow**: Generate shareable links or invite via email directly.
- **Responsive Design**: Works inline on desktop and within a tab on mobile.

### 2. Mobile Experience (`components/wallet/MobilePolicyDetails.tsx`)
- **New 'Team' Tab**: Dedicated tab for collaboration management.
- **Swipe Navigation**: Smooth transitions between Overview, Coverage, Docs, AI Help, and Team tabs.
- **Native Sharing**: Header share button uses Web Share API for external sharing (WhatsApp, etc.).

### 3. Visual Indicators (`components/wallet/PolicyCard.tsx`)
- **Collaborator Count badge**: Shows number of active collaborators on the policy card.
- **Tooltip**: Hovering reveals a list of avatars and names.
- **"Verified by AI" badge**: Support for future verification status.

## Backend Integration (`app/(protected)/wallet/actions.ts`)
- **Enhanced `sharePolicy`**:
  - Supports `permissions` argument ('view' vs 'edit').
  - Maps to `AccessGrant` permissions.
  - Handles invitations for non-existing users via `requestedPermissions`.
- **Enhanced `getPolicyShares`**: Returns permission levels for UI display.

## Future Recommendations
- **Real-time Updates**: Implement Supabase Realtime for instant collaboration updates.
- **Edit Permission Logic**: Enforce 'edit' permissions on backend update actions (currently UI-only distinction).
- **Verification Workflow**: Implement backend logic for "Verified by AI" status.
