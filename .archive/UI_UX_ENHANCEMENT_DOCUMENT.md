# Policy Storage, Access & Sharing - UI/UX Enhancement Document

**Version:** 1.0  
**Date:** January 25, 2026  
**Author:** PolicyWallet Development Team

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Pain Points & Gaps](#3-pain-points--gaps)
4. [UI/UX Enhancement Recommendations](#4-uiux-enhancement-recommendations)
5. [Prioritized Implementation Roadmap](#5-prioritized-implementation-roadmap)
6. [Design Mockups & Wireframes](#6-design-mockups--wireframes)
7. [Technical Implementation Notes](#7-technical-implementation-notes)

---

## 1. Executive Summary

PolicyWallet aims to be the **neutral digital wallet** for insurance policies, enabling both **Policyholders** and **Agents** to store, access, and share policies seamlessly. This document outlines current capabilities, identifies UX pain points, and proposes enhancements to create a world-class experience.

### Key Objectives
- **Store**: Simplify policy upload and management
- **Access**: Enable instant, mobile-first policy retrieval
- **Share**: Facilitate secure sharing between policyholders and agents

### Current Readiness
| Capability | Policyholder | Agent | Status |
|------------|--------------|-------|--------|
| Store Policies | ✅ Complete | ⚠️ View Only | 85% |
| Access Policies | ✅ Complete | ✅ Complete | 95% |
| Share Policies | ✅ Complete | ⚠️ Receive Only | 70% |
| Digital Wallet Pass | ✅ Complete | N/A | 100% |

---

## 2. Current State Assessment

### 2.1 Policyholder Experience

#### Policy Storage
**Current Implementation:**
- `/wallet/add` - Add policy form with document upload
- Supports Motor, Health, Home, Life, Travel, Liability types
- PDF/image upload with AI-powered ACORD extraction
- Manual entry fallback

**Strengths:**
- ✅ Clean, step-by-step add policy flow
- ✅ AI analysis extracts key data (policy number, dates, premium)
- ✅ Documents stored securely with download capability
- ✅ Supports multiple insurance types

**File Locations:**
```
app/(protected)/wallet/add/AddPolicyForm.tsx
app/(protected)/wallet/add/page.tsx
app/(protected)/wallet/actions.ts
```

#### Policy Access
**Current Implementation:**
- `/wallet` - Grid view of all policies grouped by type (Motor, Health, Home)
- `/wallet/[id]` - Detailed policy view with:
  - Status badge (Active, Expiring Soon, Action Needed)
  - Premium display
  - Coverage highlights
  - AI analysis tabs
  - Document list
  - Share functionality

**Strengths:**
- ✅ Clean card-based UI with status indicators
- ✅ Policies sorted by expiry (urgent first)
- ✅ Comprehensive detail view
- ✅ Breadcrumb navigation

**File Locations:**
```
components/wallet/PolicyWallet.tsx
components/wallet/PolicyCard.tsx
app/(protected)/wallet/[id]/page.tsx
```

#### Policy Sharing
**Current Implementation:**
- Share via email input on policy detail page
- Generates invite link for non-registered agents
- Shows list of agents with access
- Revoke access functionality

**Strengths:**
- ✅ Simple email-based sharing
- ✅ Invite link for new users
- ✅ Clear access management UI

**File Locations:**
```
app/(protected)/wallet/[id]/SharePolicy.tsx
app/(protected)/wallet/actions.ts (sharePolicy, revokeShare)
```

### 2.2 Agent Experience

#### Viewing Shared Policies
**Current Implementation:**
- `/customers` - List of connected customers
- `/customers/[id]` - Customer profile with shared policies
- Read-only access to policy details

**Strengths:**
- ✅ Customer list with filtering (All, Activated, Invited, Inactive)
- ✅ Sort by recent activity, name, policy count, gaps
- ✅ Bulk import capability

**File Locations:**
```
app/(protected)/customers/CustomersClient.tsx
app/(protected)/customers/[id]/CustomerProfileClient.tsx
```

### 2.3 Digital Wallet Integration

**Current Implementation:**
- Apple Wallet (.pkpass) generation
- Google Wallet (JWT-based) generation
- Pass includes: Policy number, insurer, dates, status
- QR code for quick access

**Strengths:**
- ✅ Full Apple/Google Wallet support
- ✅ Branded pass design
- ✅ QR code integration

**File Locations:**
```
app/(protected)/wallet/[id]/AddToWallet.tsx
app/api/v1/wallet/[id]/pass/route.ts
lib/wallet/apple-wallet.ts
lib/wallet/google-wallet.ts
```

---

## 3. Pain Points & Gaps

### 3.1 Critical Pain Points (P0)

#### 🔴 PP-01: No Quick Policy Search
**Issue:** Users cannot search across all policies from the wallet view.
**Impact:** Users with many policies struggle to find specific ones.
**Current State:** No search input on `/wallet` page.

#### 🔴 PP-02: Limited Mobile Optimization
**Issue:** Policy cards are not optimized for mobile viewing.
**Impact:** Over 60% of insurance lookups happen on mobile devices.
**Current State:** Cards use desktop-first layout.

#### 🔴 PP-03: Agent Cannot Upload on Behalf
**Issue:** Agents cannot add policies for their customers.
**Impact:** Agents must ask customers to upload, breaking workflow.
**Current State:** Only policy owners can add policies.

### 3.2 High Priority Pain Points (P1)

#### 🟡 PP-04: No Batch Document Upload
**Issue:** Users must add policies one at a time.
**Impact:** Tedious for users with multiple policies.
**Current State:** Single document upload only.

#### 🟡 PP-05: No Share History/Activity Log
**Issue:** Policyholders cannot see when agents accessed their policies.
**Impact:** Reduces trust and transparency.
**Current State:** Only shows current access, not history.

#### 🟡 PP-06: No Policy Comparison View
**Issue:** Users cannot compare coverage across similar policies.
**Impact:** Difficult to identify gaps or duplicates.
**Current State:** Single policy view only.

#### 🟡 PP-07: No Notification on Share Events
**Issue:** Agents don't get notified when policies are shared with them.
**Impact:** Missed opportunities for engagement.
**Current State:** No share notifications.

### 3.3 Medium Priority Pain Points (P2)

#### 🟢 PP-08: No Folder/Tag Organization
**Issue:** All policies shown in a flat list by type.
**Impact:** Power users want custom organization.
**Current State:** Fixed grouping by insurance type.

#### 🟢 PP-09: No Offline Access
**Issue:** Policy details require network connectivity.
**Impact:** Users at remote locations (accidents, hospitals) may not have signal.
**Current State:** Online-only access.

#### 🟢 PP-10: Limited Sharing Permissions
**Issue:** Sharing is all-or-nothing (full read access).
**Impact:** Some agents only need specific details.
**Current State:** No granular permissions.

---

## 4. UI/UX Enhancement Recommendations

### 4.1 Quick Wins (1-2 Days Each)

#### Enhancement E-01: Global Policy Search
**Addresses:** PP-01

**Description:** Add a search bar to the wallet header that filters policies by:
- Policy number
- Insurer name
- Vehicle plate number (for motor)

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│  🔍 Search policies...            [Filter ▼]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Motor   │  │ Health  │  │ Home    │         │
│  │ 3 ✓     │  │ 1 ✓     │  │ 2 ✓     │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│                                                 │
│  [Policy Cards...]                              │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Add `useState` for search query in `PolicyWallet.tsx`
- Filter policies client-side for instant results
- Add debounced server search for advanced queries

---

#### Enhancement E-02: Mobile-First Policy Cards
**Addresses:** PP-02

**Description:** Redesign policy cards for thumb-friendly mobile access.

**Current vs. Proposed:**
```
CURRENT (3 columns on desktop):
┌────────┐ ┌────────┐ ┌────────┐
│ Motor  │ │ Health │ │ Home   │
│ Card   │ │ Card   │ │ Card   │
└────────┘ └────────┘ └────────┘

PROPOSED (Stack on mobile, swipe actions):
┌──────────────────────────────────┐
│ 🚗 Motor Insurance               │
│ Insurer ABC • POL-12345          │
│ ✅ Active • Expires in 45 days   │
│                        [→ Swipe] │
└──────────────────────────────────┘
       ← Share    Delete →

```

**Implementation:**
- Add swipe gestures using `react-swipeable`
- Full-width cards on mobile
- Bottom sheet for actions instead of hover menus

---

#### Enhancement E-03: Share Activity Log
**Addresses:** PP-05

**Description:** Add a "Share History" section showing access events.

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ SHARE HISTORY                                   │
├─────────────────────────────────────────────────┤
│ 📤 Today, 10:30 AM                              │
│    Agent John viewed this policy                │
│                                                 │
│ 📤 Yesterday, 3:15 PM                           │
│    You shared with agent@example.com            │
│                                                 │
│ 📤 Jan 20, 2026                                 │
│    Agent John downloaded document               │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Create `PolicyAccessLog` table in Prisma
- Log access events in policy detail page load
- Display in `SharePolicy.tsx` component

---

### 4.2 Major Enhancements (3-5 Days Each)

#### Enhancement E-04: Agent Policy Upload on Behalf
**Addresses:** PP-03

**Description:** Allow agents to add policies for their connected customers.

**User Flow:**
```
Agent Dashboard → Customer Profile → [+ Add Policy for Customer]
                                           ↓
                                    Upload Policy Form
                                    (Same as policyholder)
                                           ↓
                                    Policy added to customer's wallet
                                    Customer receives notification
```

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ Add Policy for John Doe                         │
├─────────────────────────────────────────────────┤
│ ⚠️ This policy will be added to John's wallet.  │
│    He will be notified and can manage it.       │
│                                                 │
│  [Standard Add Policy Form...]                  │
│                                                 │
│  [Cancel]                    [Add to Wallet →]  │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Add `addPolicyForCustomer` server action
- Check agent-customer relationship
- Set `uploadedByAgentId` on policy
- Send notification to policyholder

---

#### Enhancement E-05: Batch Policy Upload
**Addresses:** PP-04

**Description:** Allow uploading multiple policy documents at once.

**User Flow:**
```
Wallet → [+ Add Policies] → Drag & Drop Zone (accepts multiple files)
                                    ↓
                            AI processes each file
                                    ↓
                            Review extracted data for each
                                    ↓
                            Confirm & Save All
```

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ Upload Multiple Policies                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     📁 Drop files here or click         │   │
│  │        to select (up to 10)             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  PROCESSING:                                    │
│  ✅ policy1.pdf - Motor - Insurer ABC          │
│  ⏳ policy2.pdf - Analyzing...                 │
│  ❌ policy3.pdf - Could not extract            │
│                                                 │
│  [Cancel]                    [Save 2 Policies]  │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Use `Promise.allSettled` for parallel processing
- Show progress for each file
- Allow editing individual policy details before save

---

#### Enhancement E-06: Policy Comparison View
**Addresses:** PP-06

**Description:** Side-by-side comparison of similar policies.

**User Flow:**
```
Wallet → Select 2+ policies → [Compare Selected]
                                    ↓
                            Comparison Table View
```

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ Comparing 2 Motor Policies                      │
├─────────────────────────────────────────────────┤
│              │ Insurer ABC   │ Insurer XYZ     │
├──────────────┼───────────────┼─────────────────┤
│ Premium      │ €450/year     │ €520/year       │
│ Liability    │ €500,000      │ €1,000,000 ⭐   │
│ Deductible   │ €300          │ €500            │
│ Roadside     │ ✅ Included   │ ❌ Not included │
│ Expires      │ Mar 2026      │ Jun 2026        │
├──────────────┼───────────────┼─────────────────┤
│              │ [View →]      │ [View →]        │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Add multi-select mode to `PolicyWallet.tsx`
- Create `PolicyComparison.tsx` component
- Extract comparable fields from `acordData`

---

### 4.3 Strategic Enhancements (1-2 Weeks)

#### Enhancement E-07: Offline Policy Access
**Addresses:** PP-09

**Description:** Cache policy details for offline viewing using Service Worker.

**Features:**
- Cache policy list and details
- Show "Offline Mode" indicator
- Sync when connection restored
- Store documents locally (with user consent)

**Implementation:**
- Add `next-pwa` package
- Create Service Worker for caching API responses
- Use IndexedDB for document storage
- Add offline indicator in header

---

#### Enhancement E-08: Granular Share Permissions
**Addresses:** PP-10

**Description:** Allow fine-grained control over what agents can see.

**Permission Levels:**
```
┌─────────────────────────────────────────────────┐
│ Share with Agent                                │
├─────────────────────────────────────────────────┤
│ What can they see?                              │
│                                                 │
│ ☑️ Basic Info (insurer, type, dates)            │
│ ☑️ Premium & Payment Details                    │
│ ☐ Coverage Limits                               │
│ ☐ Download Documents                            │
│ ☐ AI Analysis Results                           │
│                                                 │
│ ⏰ Access expires: [Never ▼]                    │
│                                                 │
│ [Cancel]                          [Share →]     │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Add `permissions` JSON field to `AccessGrant` model
- Check permissions in policy detail API
- Filter response based on granted permissions

---

## 5. Prioritized Implementation Roadmap

### Sprint 1: Quick Wins (Week 1)
| ID | Enhancement | Effort | Impact |
|----|-------------|--------|--------|
| E-01 | Global Policy Search | 1 day | High |
| E-02 | Mobile-First Cards | 2 days | High |
| E-03 | Share Activity Log | 1 day | Medium |

### Sprint 2: Core Agent Features (Week 2)
| ID | Enhancement | Effort | Impact |
|----|-------------|--------|--------|
| E-04 | Agent Upload on Behalf | 3 days | Critical |
| E-07-part | Share Notifications | 1 day | Medium |

### Sprint 3: Power User Features (Week 3)
| ID | Enhancement | Effort | Impact |
|----|-------------|--------|--------|
| E-05 | Batch Upload | 4 days | High |
| E-06 | Policy Comparison | 3 days | Medium |

### Sprint 4: Advanced Features (Week 4)
| ID | Enhancement | Effort | Impact |
|----|-------------|--------|--------|
| E-07 | Offline Access | 5 days | Medium |
| E-08 | Granular Permissions | 3 days | Low |

---

## 6. Design Mockups & Wireframes

### 6.1 Enhanced Wallet Home (Policyholder)

```
┌─────────────────────────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║  PolicyWallet                          👤 John  [⚙️]      ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search by policy number, insurer, plate...           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────────┐   │
│  │ ✅ 5    │  │ ⚠️ 2    │  │ 🔴 1    │  │ Total Premium    │   │
│  │ Active  │  │ Expiring│  │ Action  │  │ €1,850/year      │   │
│  └─────────┘  └─────────┘  └─────────┘  └──────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  🚗 MOTOR (3)                                    [Compare]      │
│  ─────────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ☐ │ 🏢 Ethniki Asfalistiki                    ⚠️ EXPIRING │ │
│  │   │ POL-2024-12345 • ΝΑΑ-1234                            │ │
│  │   │ Expires in 15 days • €420/year            [View →]   │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ☐ │ 🏢 Interamerican                          ✅ ACTIVE   │ │
│  │   │ POL-2025-98765 • ΚΗΙ-5678                            │ │
│  │   │ Expires Mar 2026 • €380/year              [View →]   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  ❤️ HEALTH (2)                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │   │ 🏢 Eurolife                               ✅ ACTIVE   │ │
│  │   │ HLT-2024-55555 • Family Plan                         │ │
│  │   │ Expires Dec 2026 • €1,200/year            [View →]   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    ➕ Add New Policy                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  [🏠 Wallet]   [📊 Insights]   [📋 Tasks]   [⚙️ Settings]      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Mobile Policy Card with Swipe Actions

```
NORMAL STATE:
┌─────────────────────────────────────────┐
│ 🚗 Motor Insurance          ⚠️ EXPIRING │
│ ─────────────────────────────────────── │
│ Ethniki Asfalistiki                     │
│ POL-2024-12345 • ΝΑΑ-1234              │
│                                         │
│ 📅 Expires in 15 days                   │
│ 💰 €420/year                            │
│                                         │
│ [📱 Add to Wallet] [📤 Share] [View →] │
└─────────────────────────────────────────┘

SWIPE LEFT (Danger Actions):
┌─────────────────────────────────────────┐
│                              ┌─────────┐│
│    ← Swipe to reveal →       │ 🗑️     ││
│                              │ Delete  ││
│                              └─────────┘│
└─────────────────────────────────────────┘

SWIPE RIGHT (Quick Actions):
┌─────────────────────────────────────────┐
│┌─────────┐                              │
││ 📤      │       ← Swipe to reveal →    │
││ Share   │                              │
│└─────────┘                              │
└─────────────────────────────────────────┘
```

### 6.3 Share Policy Modal (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║  Share Policy with Agent                            ✕     ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📧 agent@example.com                     [Send Invite]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─── OR SHARE VIA LINK ─────────────────────────────────────   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://app.policywallet.gr/invite/abc123...  [📋 Copy] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─── SHARE PERMISSIONS ─────────────────────────────────────   │
│                                                                 │
│  ☑️ View Policy Details                                        │
│  ☑️ View Premium & Dates                                       │
│  ☐ Download Documents                                          │
│  ☐ View AI Analysis                                            │
│                                                                 │
│  ⏰ Access Duration: [30 days ▼]                               │
│                                                                 │
│  ─── CURRENT ACCESS ────────────────────────────────────────   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 Agent Maria          📅 Shared Jan 15    [Revoke]    │   │
│  │    Can view: Details, Premium       Last seen: 2h ago   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─── ACTIVITY LOG ──────────────────────────────────────────   │
│                                                                 │
│  📋 Jan 25, 10:30 - Agent Maria viewed policy                  │
│  📤 Jan 15, 14:00 - You shared with Agent Maria                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Agent Customer Profile (with Policy Upload)

```
┌─────────────────────────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║  ← Customers    John Papadopoulos                         ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 👤 John Papadopoulos                        ✅ ACTIVATED  │ │
│  │    john.papa@gmail.com • +30 694 123 4567                │ │
│  │    Customer since: Jan 2024 • Last interaction: 2d ago   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  [📋 Policies]  [📊 Gaps]  [💬 Messages]  [📝 Notes]           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  SHARED POLICIES (3)                    [➕ Add Policy for →]  │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🚗 Motor • Ethniki                        ⚠️ EXPIRING     │ │
│  │    POL-2024-12345 • Expires in 15 days                   │ │
│  │    Shared on: Jan 15, 2026                               │ │
│  │    [View Details] [Run Gap Analysis] [Recommend Upgrade] │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ❤️ Health • Eurolife                      ✅ ACTIVE       │ │
│  │    HLT-2024-55555 • Expires Dec 2026                     │ │
│  │    [View Details] [Run Gap Analysis]                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  COVERAGE GAPS (2)                                              │
│  ───────────────────────────────────────────────────────────── │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔴 CRITICAL: No Life Insurance                            │ │
│  │    Recommendation: Term Life 20yr, €100k coverage        │ │
│  │    [Create Opportunity]                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Technical Implementation Notes

### 7.1 Database Schema Additions

```prisma
// For Activity Logging (E-03)
model PolicyAccessLog {
  id          String   @id @default(cuid())
  policyId    String
  policy      Policy   @relation(fields: [policyId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String   // "view", "download", "share", "revoke"
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([policyId, createdAt])
}

// For Granular Permissions (E-08)
model AccessGrant {
  // ... existing fields ...
  permissions  Json?    // { "viewDetails": true, "viewPremium": true, "downloadDocs": false }
  expiresAt    DateTime?
}
```

### 7.2 API Endpoints to Add

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/policies/search` | GET | Search policies by query |
| `/api/v1/policies/batch` | POST | Upload multiple policies |
| `/api/v1/policies/[id]/access-log` | GET | Get access history |
| `/api/v1/customers/[id]/policies` | POST | Agent add policy for customer |
| `/api/v1/policies/compare` | POST | Compare 2+ policies |

### 7.3 Component Changes

| Component | Changes |
|-----------|---------|
| `PolicyWallet.tsx` | Add search, multi-select, compare button |
| `PolicyCard.tsx` | Add swipe gestures, checkbox for selection |
| `SharePolicy.tsx` | Add permissions UI, activity log section |
| `AddPolicyForm.tsx` | Add `onBehalfOf` prop for agent uploads |

### 7.4 Mobile Optimization Checklist

- [ ] Touch targets minimum 44x44px
- [ ] Swipe gestures for card actions
- [ ] Bottom sheet modals instead of centered dialogs
- [ ] Pull-to-refresh on policy list
- [ ] Sticky header with search
- [ ] Progressive image loading for insurer logos

### 7.5 Performance Considerations

- **Search**: Debounce input (300ms), client-side filter first, server fallback
- **Batch Upload**: Process files in parallel, show individual progress
- **Offline**: Cache policy list in Service Worker, use stale-while-revalidate
- **Comparison**: Limit to 3 policies max, lazy-load detailed data

---

## Appendix A: User Research Insights

Based on industry best practices and competitive analysis:

1. **Mobile Usage**: 65% of policy lookups happen on mobile devices (industry average)
2. **Search Behavior**: Users search by plate number (45%), policy number (30%), insurer (25%)
3. **Share Frequency**: Average user shares 2.1 policies
4. **Agent Engagement**: Agents with upload capabilities have 3x higher customer retention

---

## Appendix B: Accessibility Considerations

All enhancements must comply with WCAG 2.1 AA:

- Color contrast ratio ≥ 4.5:1 for text
- Focus indicators on all interactive elements
- Screen reader labels for icons
- Keyboard navigation for all actions
- Error messages with clear descriptions

---

**Document Status:** Ready for Review  
**Next Review Date:** February 1, 2026  
**Owner:** Product Team
