# Policy Deletion Feature

**Date:** 2026-02-04  
**Feature:** Delete policies for Policyholders and Agents  
**Status:** ✅ Fully Implemented and Enhanced

---

## 🎯 Overview

Both **Policyholders** and **Agents** can delete policies they have uploaded. The system handles two scenarios:
1. **Owner Deletion** - Permanently removes the policy and all associated data
2. **Shared Access Revocation** - Removes access grant without deleting the policy

---

## ✅ Implementation Details

### Backend Logic (`PolicyService.delete`)

Located in: `lib/services/policy.service.ts`

**Owner Deletion Flow:**
```typescript
1. Verify user is the owner (policy.ownerUserId === userId)
2. Delete physical files from storage
3. Delete related opportunities
4. Delete policy (cascades to documents, gaps, etc.)
5. Log activity
```

**Shared Access Revocation Flow:**
```typescript
1. Verify user has shared access
2. Revoke the access grant
3. Log activity
```

### Frontend Components

#### 1. **DeletePolicy Component**
**Location:** `app/(protected)/wallet/[id]/DeletePolicy.tsx`

**Features:**
- ✅ Glassmorphic design matching Indigo/Violet system
- ✅ Modal confirmation dialog (no browser confirm)
- ✅ Clear warning messages
- ✅ Loading states
- ✅ Success/error toasts
- ✅ Auto-redirect to wallet after deletion

**UI Elements:**
```tsx
- Danger Zone card with gradient icon
- "Delete Policy" button with hover effects
- Confirmation modal with:
  - Red gradient header
  - Warning message
  - "This action cannot be undone" alert
  - Cancel and "Delete Forever" buttons
```

#### 2. **Server Action**
**Location:** `app/(protected)/wallet/actions.ts`

```typescript
export async function deletePolicy(policyId: string) {
    // 1. Authenticate user
    // 2. Fetch policy with documents
    // 3. Check ownership
    // 4. Delete files from storage
    // 5. Delete opportunities
    // 6. Delete policy (cascades)
    // 7. Log activity
}
```

---

## 🎨 UI/UX Design

### Danger Zone Card

```
┌─────────────────────────────────────┐
│ ⚠️  DANGER ZONE                     │
│                                     │
│ Permanently delete this policy and  │
│ all associated documents. This      │
│ action cannot be undone.            │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  🗑️  Delete Policy              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Confirmation Modal

```
┌───────────────────────────────────────┐
│ ⚠️  Confirm Deletion                  │
│ This action is permanent          ✕  │
├───────────────────────────────────────┤
│                                       │
│ Are you sure you want to delete this  │
│ policy? All associated documents,     │
│ coverage analysis, and gap insights   │
│ will be permanently removed.          │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ ⚠️ This action cannot be undone   │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─────────┐  ┌────────────────────┐  │
│ │ Cancel  │  │ 🗑️ Delete Forever  │  │
│ └─────────┘  └────────────────────┘  │
└───────────────────────────────────────┘
```

---

## 🔐 Security & Authorization

### Authorization Checks

1. **User Authentication** - Must be logged in
2. **Policy Ownership** - Can only delete owned policies
3. **Shared Access** - Can revoke access to shared policies

### Data Cleanup

**What Gets Deleted:**
- ✅ Policy record
- ✅ Policy documents (database records)
- ✅ Physical files (from storage)
- ✅ Gap instances
- ✅ Opportunities
- ✅ Access grants (cascades)

**What Stays:**
- ✅ Activity logs (for audit trail)
- ✅ User account
- ✅ Other policies

---

## 📍 User Flows

### Policyholder Flow

```
1. Navigate to Policy Details page (/wallet/[id])
2. Scroll to bottom → See "Danger Zone" card
3. Click "Delete Policy" button
4. Confirmation modal appears
5. Click "Delete Forever"
6. Loading state: "Deleting..."
7. Success toast: "Policy deleted successfully"
8. Auto-redirect to /wallet
```

### Agent Flow (Shared Policy)

```
1. Navigate to shared Policy Details page
2. Scroll to bottom → See "Danger Zone" card
3. Click "Delete Policy" (actually revokes access)
4. Confirmation modal appears
5. Click "Delete Forever"
6. Access grant is revoked
7. Success toast: "Access revoked"
8. Auto-redirect to /wallet
```

---

## 🧪 Testing Scenarios

### Test Case 1: Owner Deletes Policy
```
Given: User owns a policy
When: User clicks "Delete Policy" and confirms
Then: 
  - Policy is deleted from database
  - Files are deleted from storage
  - User is redirected to /wallet
  - Success toast is shown
```

### Test Case 2: Shared User Revokes Access
```
Given: User has shared access to a policy
When: User clicks "Delete Policy" and confirms
Then:
  - Access grant is revoked
  - Policy remains in database
  - User is redirected to /wallet
  - Success toast is shown
```

### Test Case 3: Unauthorized Access
```
Given: User tries to delete someone else's policy
When: User attempts deletion
Then:
  - Error: "Forbidden"
  - No data is deleted
```

### Test Case 4: Cancel Deletion
```
Given: User opens delete confirmation modal
When: User clicks "Cancel" or X button
Then:
  - Modal closes
  - No deletion occurs
  - User stays on page
```

---

## 🎯 Key Features

### 1. **Two-Step Confirmation**
- Click "Delete Policy" button
- Confirm in modal dialog
- Prevents accidental deletions

### 2. **Clear Warnings**
- "Danger Zone" header
- Red color scheme
- "This action cannot be undone" message
- Warning icon (⚠️)

### 3. **Loading States**
- Button shows "Deleting..." during process
- Disabled state prevents double-clicks
- Toast shows loading spinner

### 4. **Success Feedback**
- Toast notification
- Auto-redirect to wallet
- Page refresh to update list

### 5. **Error Handling**
- Network errors caught
- User-friendly error messages
- No data loss on failure

---

## 🎨 Design System Compliance

### Colors
- **Danger:** Red 500 → Rose 600 gradient
- **Warning:** Amber 50 background
- **Background:** White/80 with backdrop blur
- **Border:** Red 200/50 with transparency

### Typography
- **Header:** Font-black, uppercase, tracking-widest
- **Body:** Font-bold for buttons
- **Warning:** Font-semibold for alerts

### Spacing
- **Padding:** p-6 for cards
- **Gap:** gap-3 for button groups
- **Margin:** mb-4 for sections

### Effects
- **Backdrop Blur:** backdrop-blur-xl
- **Shadows:** shadow-lg, shadow-2xl
- **Transitions:** duration-300
- **Hover:** scale-110 for icons

---

## 📊 Analytics Events

**Tracked Events:**
1. `POLICY_DELETED` - Owner deletes policy
2. `POLICY_ACCESS_REVOKED` - Shared user revokes access

**Logged Data:**
- User ID
- Policy ID
- Policy Number
- Insurer Name
- Timestamp

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Soft Delete** - Mark as deleted instead of hard delete
2. **Restore Option** - Allow restoration within 30 days
3. **Bulk Delete** - Delete multiple policies at once
4. **Export Before Delete** - Download policy data before deletion
5. **Delete Confirmation Email** - Send confirmation to user's email
6. **Reason for Deletion** - Ask why user is deleting (analytics)

---

## 📝 Code Locations

| Component | File Path |
|-----------|-----------|
| **Delete UI** | `app/(protected)/wallet/[id]/DeletePolicy.tsx` |
| **Server Action** | `app/(protected)/wallet/actions.ts` |
| **Service Logic** | `lib/services/policy.service.ts` |
| **Policy Details** | `app/(protected)/wallet/[id]/PolicyDetailsClient.tsx` |
| **Storage Utils** | `lib/storage.ts` |

---

## ✅ Checklist

- [x] Backend delete logic implemented
- [x] Frontend delete component created
- [x] Modal confirmation dialog
- [x] Loading states
- [x] Success/error handling
- [x] File deletion from storage
- [x] Activity logging
- [x] Authorization checks
- [x] Design system compliance
- [x] Mobile responsive
- [x] Dark mode support
- [x] Accessibility (keyboard navigation)
- [x] Auto-redirect after deletion

---

**Status:** ✅ **Fully Implemented and Production Ready**

The delete functionality is complete and available to both Policyholders and Agents. Users can safely delete policies with clear warnings and confirmation steps to prevent accidental data loss.
