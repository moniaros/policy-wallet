# UI/UX Overhaul Implementation Plan

## Goal
Elevate the detailed Policyholder and Agent pages to match the new "World Class" SaaS aesthetic established in the Wallet and Add Policy pages. This involves applying the **Emerald/Teal Premium Design System** to improve visual hierarchy, usability, and "wow" factor.

## Design System
We will strictly adhere to the generated Design System in `../design-system/policywallet/MASTER.md`.
- **Primary:** Emerald (`#059669`) & Teal secondary.
- **Surface:** Glassmorphism (`backdrop-blur-xl`, `bg-white/80`).
- **Typography:** Bold headers, legible data points.
- **Micro-interactions:** Smooth hover lifts, loading states, and toast feedback.

## Proposed Application

### Phase 1: Policyholder Experience (High Priority)

#### 1. Policy Details (`/wallet/[id]`)
Transform the current basic list into a **Smart Policy Dashboard**.
- **Header:** Hero section with Policy Status, Premium Amount, and Renewal Date.
- **Key Metrics:** Grid of cards showing Deductibles, Limits, and Coverage items.
- **Documents:** Visual file browser (not just links) with "Preview" capability.
- **Quick Actions:** Floating or Sticky sidebar for "Share", "File Claim", "Edit".
- **AI Insights:** "Smart Analysis" tab showing what the AI found.

#### 2. Coverage Insights (`/coverage-insights`)
Create a **Coverage Health Hub**.
- **Health Score:** An animated radial score (0-100) based on coverage gaps.
- **Visual Breakdown:** Simple bar/pie visualisation of coverage distribution (e.g., 60% Health, 10% Motor).
- **Gap Cards:** Actionable cards for "Missing Life Insurance" with "Get a Quote" buttons.
- **Severity Badges:** Critical/High/Medium indicators.

### Phase 2: Agent Workspace (Follow-up)

#### 3. Agent Dashboard (`/dashboard`)
Build a **Productivity Command Center**.
- **KPI Row:** Active Clients, Total Premium, Renewal Rate (with trend indicators).
- **Task Board:** Specific section for "Urgent" vs "Upcoming" tasks.
- **Activity Feed:** A rich timeline of client interactions.

#### 4. Customer List (`/customers`)
Enhance the directory.
- **Data Table:** Modern table with sorting, filtering, and bulk actions.
- **Avatars:** Visual initials/images for quick scanning.
- **Status Pills:** Live status of their portfolio health.

## Verification Plan
1. **Visual Inspection:** Verify gradients, padding, and mobile responsiveness.
2. **Interaction Testing:** Test tab switching, file reviews, and button states.
3. **Accessibility:** Ensure contrast ratios on transparent backgrounds.

## Automated Tests
- `npm run lint` to ensure no regression in types.
- Manual walk-through of the "Happy Path" (View Policy -> Check Insights -> Return).
